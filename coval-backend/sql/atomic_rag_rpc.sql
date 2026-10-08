-- ============================================================================
-- Coval Agentic RAG Platform - Sub-Team 3 Database Architecture
-- Single-Transaction Atomic Vector Search + Wallet Token Deduction
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_tokenized_rag_search_and_deduct(
    p_user_id UUID,
    p_repo_id TEXT,
    p_query_embedding vector(1536),
    p_token_cost INT DEFAULT 5,
    p_match_threshold FLOAT DEFAULT 0.45,
    p_match_count INT DEFAULT 5
)
RETURNS TABLE (
    status_code TEXT,           -- 'SUCCESS' | 'INSUFFICIENT_FUNDS' | 'WALLET_NOT_FOUND'
    remaining_balance INT,      -- Wallet balance after atomic deduction
    chunk_id UUID,
    file_path TEXT,
    symbol_name TEXT,
    chunk_type TEXT,
    start_line INT,
    end_line INT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INT;
    v_match_found BOOLEAN := FALSE;
BEGIN
    -- -------------------------------------------------------------------------
    -- Step 1: Atomic Check & Deduction in a Single Statement
    -- Uses an implicit row-level write lock (FOR UPDATE) to prevent race conditions.
    -- -------------------------------------------------------------------------
    UPDATE token_wallets
    SET balance = balance - p_token_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id AND balance >= p_token_cost
    RETURNING balance INTO v_current_balance;

    -- -------------------------------------------------------------------------
    -- Step 2: Handle Insufficient Funds / Missing Wallet
    -- -------------------------------------------------------------------------
    IF NOT FOUND THEN
        SELECT balance INTO v_current_balance FROM token_wallets WHERE user_id = p_user_id;
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                'WALLET_NOT_FOUND'::TEXT, 0, NULL::UUID, NULL::TEXT, NULL::TEXT, 
                NULL::TEXT, NULL::INT, NULL::INT, NULL::TEXT, NULL::FLOAT;
        ELSE
            RETURN QUERY SELECT 
                'INSUFFICIENT_FUNDS'::TEXT, v_current_balance, NULL::UUID, NULL::TEXT, NULL::TEXT, 
                NULL::TEXT, NULL::INT, NULL::INT, NULL::TEXT, NULL::FLOAT;
        END IF;
        RETURN;
    END IF;

    -- -------------------------------------------------------------------------
    -- Step 3: Atomic Context Retrieval via pgvector
    -- Filtered strictly by user_id and repo_id for multi-tenant isolation.
    -- -------------------------------------------------------------------------
    RETURN QUERY
    SELECT
        'SUCCESS'::TEXT,
        v_current_balance,
        dc.id,
        dc.file_path,
        dc.symbol_name,
        dc.chunk_type,
        dc.start_line,
        dc.end_line,
        dc.content,
        (1 - (dc.embedding <=> p_query_embedding))::FLOAT AS similarity
    FROM document_chunks dc
    WHERE dc.user_id = p_user_id::TEXT
      AND dc.repo_id = p_repo_id
      AND (1 - (dc.embedding <=> p_query_embedding)) >= p_match_threshold
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT p_match_count;

    -- -------------------------------------------------------------------------
    -- Step 4: Fallback if no matching code chunks met the threshold
    -- Still return remaining balance and SUCCESS status
    -- -------------------------------------------------------------------------
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            'SUCCESS'::TEXT,
            v_current_balance,
            NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 
            NULL::INT, NULL::INT, NULL::TEXT, NULL::FLOAT;
    END IF;
END;
$$;
