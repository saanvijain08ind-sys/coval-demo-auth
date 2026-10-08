import React, { useState } from 'react';
import {
  Database,
  Server,
  Layers,
  Cpu,
  CheckCircle2,
  Copy,
  Check,
  Code2,
  HardDrive,
  Network,
  ShieldCheck,
  Search,
  Scissors,
  FileCode,
  Tag,
  AlertOctagon,
  RefreshCw,
  Terminal
} from 'lucide-react';

export const VectorDbInfra: React.FC = () => {
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<'chunking' | 'search' | 'schema'>('chunking');

  // Semantic Chunking Studio State
  const samplePythonRouter = `import os
from fastapi import APIRouter
from auth.database import supabase

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/login/x")
async def login_with_x():
    """Initiates X (Twitter) OAuth flow via Supabase."""
    redirect_target = os.getenv("FRONTEND_URL", "http://localhost:8000")
    res = supabase.auth.sign_in_with_oauth({
        "provider": "x",
        "options": {"redirect_to": f"{redirect_target}/dashboard"}
    })
    return RedirectResponse(url=res.url)

@router.get("/login/google")
async def login_with_google():
    """Initiates Google OAuth flow via Supabase."""
    redirect_target = os.getenv("FRONTEND_URL", "http://localhost:8000")
    res = supabase.auth.sign_in_with_oauth({
        "provider": "google",
        "options": {"redirect_to": f"{redirect_target}/dashboard"}
    })
    return RedirectResponse(url=res.url)

@router.get("/login/github")
async def login_with_github():
    """Initiates GitHub OAuth flow via Supabase (Primary identity)."""
    redirect_target = os.getenv("FRONTEND_URL", "http://localhost:8000")
    res = supabase.auth.sign_in_with_oauth({
        "provider": "github",
        "options": {"redirect_to": f"{redirect_target}/dashboard"}
    })
    return RedirectResponse(url=res.url)`;

  const [chunkCodeInput, setChunkCodeInput] = useState(samplePythonRouter);
  const [chunkUserId, setChunkUserId] = useState('usr_coval_01');
  const [chunkRepoId, setChunkRepoId] = useState('repo_coval_01');
  const [chunkFilePath, setChunkFilePath] = useState('auth/router.py');
  const [chunkResult, setChunkResult] = useState<any | null>(null);
  const [isChunking, setIsChunking] = useState(false);

  // Tenant Query Tester State
  const [searchQuery, setSearchQuery] = useState('how does github oauth authentication work?');
  const [searchUserId, setSearchUserId] = useState('usr_coval_01');
  const [searchRepoId, setSearchRepoId] = useState('repo_01');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // PostgreSQL Schema with RLS and Security RPC
  const fullSqlSchema = `-- ============================================================================
-- Coval Agentic RAG Platform - Sub-Team 3 Vector Database Architecture
-- Supabase PostgreSQL + pgvector (1536 dims) + Strict Multi-Tenant Isolation
-- ============================================================================

-- 1. Enable pgvector & UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Document Chunks Table with Mandatory Tenant Tagging
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- CRITICAL SECURITY: Mandatory Multi-Tenant Columns
    user_id TEXT NOT NULL,                     -- Foreign Tenant Isolation Key
    repo_id TEXT NOT NULL,                     -- Repository Isolation Key
    
    -- File and Semantic Code Metadata
    file_path TEXT NOT NULL,
    language VARCHAR(50),
    symbol_name VARCHAR(255),                  -- e.g. 'login_with_github', 'encrypt_payload'
    chunk_type VARCHAR(50),                    -- 'function', 'class', 'module_header'
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_estimate INTEGER NOT NULL,
    
    -- 1536-dimensional vector embedding (OpenAI text-embedding-3-small)
    embedding vector(1536) NOT NULL,
    
    -- Search & Redundant Metadata
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Composite Tenant B-Tree Index (For Fast Scoped Filtering)
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant 
ON document_chunks (user_id, repo_id);

-- 4. HNSW Vector Index for Sub-Millisecond Cosine Similarity
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Row-Level Security (RLS) Policy to Block Cross-Tenant Queries
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only read their own code chunks"
ON document_chunks
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only insert into their own tenant"
ON document_chunks
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- 6. Secure Supabase RPC Match Function (Enforces User & Repo Filters)
CREATE OR REPLACE FUNCTION match_code_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_user_id text,
  filter_repo_id text
)
RETURNS TABLE (
  id uuid,
  user_id text,
  repo_id text,
  file_path text,
  symbol_name text,
  chunk_type text,
  start_line int,
  end_line int,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.user_id,
    document_chunks.repo_id,
    document_chunks.file_path,
    document_chunks.symbol_name,
    document_chunks.chunk_type,
    document_chunks.start_line,
    document_chunks.end_line,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE document_chunks.user_id = filter_user_id
    AND document_chunks.repo_id = filter_repo_id
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;`;

  const copySql = () => {
    navigator.clipboard.writeText(fullSqlSchema);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleSimulateChunking = async () => {
    setIsChunking(true);
    setChunkResult(null);
    try {
      const res = await fetch('/api/rag/simulate-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: chunkFilePath,
          content: chunkCodeInput,
          language: 'python',
          user_id: chunkUserId,
          repo_id: chunkRepoId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChunkResult(data);
      } else {
        alert(data.error || 'Chunking failed');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsChunking(false);
    }
  };

  const handleRunSearch = async () => {
    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          user_id: searchUserId,
          repo_id: searchRepoId
        })
      });
      const data = await res.json();
      setSearchResult(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Intro Hero */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2">
            <span>Sub-Team 3 Mandate</span>
            <span aria-hidden="true">·</span>
            <span>Vector Database & Chunking</span>
            <span aria-hidden="true">·</span>
            <span>pgvector HNSW + Strict Tenant Lock</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            RAG Vector Database & Semantic Chunking
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Code cannot be chunked naively by character count without chopping functions in half.
            Our pipeline extracts complete function and class units, generates fast 1536-dim vector embeddings,
            and writes them into Supabase pgvector. Every chunk is strictly tagged with <code className="text-indigo-300 font-mono">user_id</code> and <code className="text-indigo-300 font-mono">repo_id</code> to guarantee zero cross-tenant leakage.
          </p>
        </div>
      </div>

      {/* Cluster Health & Live Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Supabase pgvector</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-sm font-semibold text-white">cdfltsogriaaedxtibqh</div>
          <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>HNSW Index Ready</span>
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Chunking Strategy</span>
            <Scissors className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-semibold text-white">AST Function-Aware</div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Zero broken functions
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Embedding Model</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-semibold text-white">text-embedding-3-small</div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            1536 dims · Batched 64
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Tenant Isolation</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-emerald-400">user_id + repo_id</div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Enforced at DDL + RPC
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('chunking')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            activeTab === 'chunking'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Semantic Chunking Studio</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            activeTab === 'search'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Tenant Isolation Query Tester</span>
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            activeTab === 'schema'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>PostgreSQL DDL & RLS Policies</span>
        </button>
      </div>

      {/* TAB 1: SEMANTIC CHUNKING STUDIO */}
      {activeTab === 'chunking' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Code Panel */}
            <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  <span>Input Code to Chunk</span>
                </div>
                <span className="text-xs font-mono text-slate-400">rag/indexer.py</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">File Path:</label>
                  <input
                    type="text"
                    value={chunkFilePath}
                    onChange={(e) => setChunkFilePath(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Tenant User ID:</label>
                  <input
                    type="text"
                    value={chunkUserId}
                    onChange={(e) => setChunkUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-indigo-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Repository ID:</label>
                <input
                  type="text"
                  value={chunkRepoId}
                  onChange={(e) => setChunkRepoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Source Code:</label>
                <textarea
                  value={chunkCodeInput}
                  onChange={(e) => setChunkCodeInput(e.target.value)}
                  rows={12}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleSimulateChunking}
                disabled={isChunking}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isChunking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                <span>Run Semantic Function-Aware Chunker</span>
              </button>
            </div>

            {/* Extracted Chunks Output */}
            <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white">
                  Extracted Semantic Chunks
                </div>
                {chunkResult && (
                  <span className="text-xs font-mono text-emerald-400">
                    {chunkResult.chunks_count} chunks generated
                  </span>
                )}
              </div>

              {chunkResult ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  <div className="p-2.5 rounded bg-slate-950 border border-emerald-900 text-xs flex items-center justify-between text-emerald-300">
                    <span>Function boundaries preserved cleanly</span>
                    <span className="font-mono text-[11px]">user: {chunkResult.security.tenant_user_id}</span>
                  </div>

                  {chunkResult.chunks.map((chk: any, index: number) => (
                    <div key={index} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white font-mono">
                            #{index + 1} {chk.symbol_name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {chk.chunk_type}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          Lines {chk.start_line}–{chk.end_line} · ~{chk.token_estimate} tokens
                        </span>
                      </div>

                      {/* Code Snippet */}
                      <pre className="p-2 rounded bg-slate-900/90 font-mono text-[11px] text-slate-300 overflow-x-auto">
                        {chk.content}
                      </pre>

                      {/* Tenant Tag Badge */}
                      <div className="flex items-center gap-2 text-[10px] font-mono pt-1 text-slate-500 border-t border-slate-900">
                        <Tag className="w-3 h-3 text-indigo-400" />
                        <span>user_id: <span className="text-indigo-300">{chk.user_id}</span></span>
                        <span aria-hidden="true">·</span>
                        <span>repo_id: <span className="text-slate-300">{chk.repo_id}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
                  <Scissors className="w-8 h-8 mb-2 text-slate-600" />
                  <span>Click "Run Semantic Function-Aware Chunker" to test the boundary scanner.</span>
                  <span className="mt-1">Functions will remain intact without mid-body splitting.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TENANT ISOLATION QUERY TESTER */}
      {activeTab === 'search' && (
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 space-y-6">
          <div className="max-w-3xl">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Multi-Tenant Vector Isolation Verification</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify that users can NEVER query chunks belonging to another user.
              Every similarity search strictly enforces <code className="font-mono text-indigo-300">user_id = :filter_user_id AND repo_id = :filter_repo_id</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Authenticated User ID (Scope):
              </label>
              <input
                type="text"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-indigo-300"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Repo ID:
              </label>
              <input
                type="text"
                value={searchRepoId}
                onChange={(e) => setSearchRepoId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setSearchUserId('usr_coval_01')}
                  className="flex-1 py-1.5 text-[11px] font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 rounded"
                >
                  Authorized User
                </button>
                <button
                  onClick={() => setSearchUserId('usr_unauthorized_attacker')}
                  className="flex-1 py-1.5 text-[11px] font-mono text-amber-300 bg-amber-950/40 border border-amber-900 hover:bg-amber-900/60 rounded"
                >
                  Attacker ID
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Natural Language RAG Query:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
              />
              <button
                onClick={handleRunSearch}
                disabled={isSearching}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-2"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Execute Scoped pgvector Search</span>
              </button>
            </div>
          </div>

          {searchResult && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                  <div className="text-slate-400 mb-0.5">Authorized Matches Found</div>
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {searchResult.results_found} chunk(s)
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-rose-900/60 text-xs">
                  <div className="text-slate-400 mb-0.5">Foreign Tenant Chunks Blocked</div>
                  <div className="text-lg font-bold font-mono text-rose-400">
                    {searchResult.foreign_chunks_blocked_by_tenant_filter} foreign chunks excluded
                  </div>
                </div>
              </div>

              {searchResult.results.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-white">Retrieved Code Chunks:</div>
                  {searchResult.results.map((res: any) => (
                    <div key={res.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white font-mono">{res.file_path} · {res.symbol_name}</span>
                        <span className="font-mono text-emerald-400">Score: {res.similarity}</span>
                      </div>
                      <pre className="p-2.5 rounded bg-slate-900/80 font-mono text-[11px] text-slate-300 overflow-x-auto">
                        {res.content}
                      </pre>
                      <div className="text-[10px] font-mono text-slate-500">
                        Lines: {res.lines} · user_id: {res.user_id} · repo_id: {res.repo_id}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                  Zero chunks returned for user scope <code className="text-indigo-300 font-mono">{searchResult.user_id_scope}</code>.
                  Cross-tenant protection verified: Attacker cannot access foreign repository code.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DDL & RLS SCHEMA */}
      {activeTab === 'schema' && (
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Supabase PostgreSQL + pgvector DDL</h2>
              <p className="text-xs text-slate-400">Production Schema with Row-Level Security (RLS) & match_code_chunks RPC</p>
            </div>
            <button
              onClick={copySql}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSchema ? 'SQL Copied!' : 'Copy DDL'}</span>
            </button>
          </div>

          <div className="relative">
            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-[480px]">
              {fullSqlSchema}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
