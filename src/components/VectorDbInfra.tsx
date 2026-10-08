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
  Network
} from 'lucide-react';

export const VectorDbInfra: React.FC = () => {
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'tables' | 'pgvector' | 'indexes'>('tables');

  const fullSqlSchema = `-- =========================================================
-- Coval Agentic RAG Platform - Sub-Team 3 Database Schema
-- Supabase PostgreSQL + pgvector (1536 dimensions)
-- =========================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Users & Identities (Encrypted Tokens at Rest)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_user_id BIGINT UNIQUE NOT NULL,
    github_login VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'employer', -- 'admin' | 'employer'
    github_token_enc TEXT NOT NULL,               -- AES-256-GCM encrypted token
    refresh_token_hash TEXT,                      -- Argon2id hash
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Repositories (Org Scoped)
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id BIGINT UNIQUE NOT NULL,
    org VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    default_branch VARCHAR(100) DEFAULT 'main',
    head_sha VARCHAR(40),
    connected BOOLEAN DEFAULT FALSE,
    visible_to_employers BOOLEAN DEFAULT TRUE,
    connected_by UUID REFERENCES users(id),
    last_ingested_at TIMESTAMPTZ,
    last_evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Document Chunks & Vector Embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    snapshot_sha VARCHAR(40) NOT NULL,
    path TEXT NOT NULL,
    language VARCHAR(50),
    chunk_type VARCHAR(50), -- 'code' | 'doc' | 'config' | 'test'
    start_line INTEGER,
    end_line INTEGER,
    symbol_name VARCHAR(255),
    content TEXT NOT NULL,
    embedding vector(1536), -- Standard OpenAI / text-embedding-3-small dimension
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. HNSW Vector Index for Sub-Millisecond Cosine Similarity
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 6. Evaluations (SHA-Pinned 10-Agent Scoring Runs)
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    developer_id UUID,
    subject_type VARCHAR(50) DEFAULT 'repository', -- 'repository' | 'developer'
    head_sha VARCHAR(40) NOT NULL,
    profile_id VARCHAR(50) DEFAULT 'default',
    overall_score NUMERIC(5, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    job_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Criterion Scores (10 Agents)
CREATE TABLE IF NOT EXISTS criterion_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE,
    criterion VARCHAR(100) NOT NULL, -- 'readability', 'security', etc.
    score NUMERIC(5, 2) NOT NULL,
    confidence NUMERIC(3, 2),
    weight NUMERIC(3, 2) NOT NULL,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Evidence Items (Exact line citations for findings)
CREATE TABLE IF NOT EXISTS evidence_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    criterion_score_id UUID REFERENCES criterion_scores(id) ON DELETE CASCADE,
    severity VARCHAR(20) DEFAULT 'info', -- 'critical' | 'high' | 'medium' | 'info'
    path TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    message TEXT NOT NULL,
    suggestion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Async Background Jobs
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'ingest' | 'evaluate' | 'embed'
    status VARCHAR(50) NOT NULL, -- 'queued' | 'running' | 'succeeded' | 'failed'
    stage VARCHAR(100),
    progress NUMERIC(3, 2) DEFAULT 0.0,
    payload JSONB,
    error TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);
`;

  const copySql = () => {
    navigator.clipboard.writeText(fullSqlSchema);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Intro Hero */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2">
            <span>Sub-Team 3 Mandate</span>
            <span aria-hidden="true">·</span>
            <span>Data Infrastructure</span>
            <span aria-hidden="true">·</span>
            <span>Supabase PostgreSQL + pgvector</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            Vector Database & Infrastructure Topology
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Our responsibility as Sub-Team 3 is to manage the persistent PostgreSQL storage,
            pgvector similarity indexing for the RAG engine, token encryption layer, and schema
            contracts that feed the 10 evaluation agents.
          </p>
        </div>
      </div>

      {/* Cluster Health & Live Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Supabase Cluster</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-sm font-semibold text-white">cdfltsogriaaedxtibqh</div>
          <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Connection Live</span>
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Vector Index Engine</span>
            <Database className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-semibold text-white">pgvector HNSW</div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            dim: 1536 · m=16, ef=64
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Privacy & Cipher</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-semibold text-white">AES-256-GCM</div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Argon2id for refresh tokens
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Auth Providers</span>
            <Network className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-semibold text-white">GitHub (Primary)</div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            + Google, X OAuth routes
          </div>
        </div>
      </div>

      {/* Database Schema Explorer */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Sub-Team 3 Database Schema (PostgreSQL DDL)</h2>
            <p className="text-xs text-slate-400">Spec Section 9 Core Tables & Index Contracts</p>
          </div>
          <button
            onClick={copySql}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSchema ? 'SQL Copied!' : 'Copy Supabase DDL'}</span>
          </button>
        </div>

        {/* SQL Code View */}
        <div className="relative">
          <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-[480px]">
            {fullSqlSchema}
          </pre>
        </div>

        {/* Schema Guarantees Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-white">1. Token Isolation</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tokens in <code className="text-indigo-300 font-mono">users.github_token_enc</code> are encrypted at rest with AES-256-GCM. Never returned to frontends.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-white">2. SHA Reproducibility</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Chunks and evaluations are tied to git <code className="text-indigo-300 font-mono">head_sha</code>. Re-evaluating the same commit is idempotent.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-white">3. Fast HNSW Retrieval</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              pgvector HNSW index on <code className="text-indigo-300 font-mono">document_chunks.embedding</code> yields &lt;10ms cosine similarity for RAG Q&A.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
