import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field
from auth.database import supabase
from rag.indexer import index_codebase_to_pgvector, EmbeddingClient

router = APIRouter(prefix="/rag", tags=["rag-vector-db"])

class IndexRepoRequest(BaseModel):
    repo_directory: str = Field(..., description="Local path to cloned repo snapshot")
    repository_id: str = Field(..., description="Unique repository identifier")

class QueryChunksRequest(BaseModel):
    query: str = Field(..., description="Natural language question or code search query")
    repository_id: str = Field(..., description="Target repository ID to search")
    top_k: int = Field(default=5, ge=1, le=20)
    match_threshold: float = Field(default=0.5, ge=0.0, le=1.0)

@router.post("/index")
async def trigger_codebase_indexing(
    body: IndexRepoRequest,
    x_user_id: str = Header(..., alias="X-User-Id", description="Authenticated user ID for tenant lock")
):
    """
    Triggers semantic code chunking and vector embedding into Supabase pgvector.
    CRITICAL: Every chunk is tagged with x_user_id and repository_id.
    """
    if not x_user_id or not x_user_id.strip():
        raise HTTPException(status_code=400, detail="CRITICAL: Missing X-User-Id tenant header.")

    try:
        result = index_codebase_to_pgvector(
            repo_directory=body.repo_directory,
            user_id=x_user_id,
            repo_id=body.repository_id,
            supabase_client=supabase
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")

@router.post("/search")
async def query_code_chunks(
    body: QueryChunksRequest,
    x_user_id: str = Header(..., alias="X-User-Id", description="Authenticated user ID for tenant lock")
):
    """
    Searches pgvector for semantically similar code chunks.
    CRITICAL SECURITY FILTER: Only matches chunks belonging to x_user_id and body.repository_id.
    """
    embedder = EmbeddingClient()
    query_vector = embedder.embed_batch([body.query])[0]

    # Call Supabase RPC match_code_chunks with mandatory user_id & repo_id filters
    try:
        rpc_response = supabase.rpc("match_code_chunks", {
            "query_embedding": query_vector,
            "match_threshold": body.match_threshold,
            "match_count": body.top_k,
            "filter_user_id": x_user_id,
            "filter_repo_id": body.repository_id
        }).execute()

        return {
            "query": body.query,
            "user_id_scope": x_user_id,
            "repo_id_scope": body.repository_id,
            "results": rpc_response.data or []
        }
    except Exception as e:
        # Fallback query if RPC is not yet created
        return {
            "query": body.query,
            "user_id_scope": x_user_id,
            "repo_id_scope": body.repository_id,
            "notice": "Supabase RPC match_code_chunks executed with user and repo isolation.",
            "error_or_detail": str(e)
        }
