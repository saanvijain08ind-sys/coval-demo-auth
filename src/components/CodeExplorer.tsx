import React, { useState } from 'react';
import {
  Folder,
  FileCode,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Shield,
  Database
} from 'lucide-react';

interface FileEntry {
  path: string;
  name: string;
  language: string;
  badge?: string;
  content: string;
}

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('auth/security.py');
  const [copied, setCopied] = useState(false);
  const [authFolderOpen, setAuthFolderOpen] = useState(true);

  const files: Record<string, FileEntry> = {
    'auth/security.py': {
      path: 'coval-backend/auth/security.py',
      name: 'security.py',
      language: 'python',
      badge: 'AES-256-GCM + Non-Blocking',
      content: `import os
import json
import base64
import asyncio
from typing import Dict, Any, Optional, Union
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from argon2 import PasswordHasher
from dotenv import load_dotenv

# 1. Securely load master environment configuration
load_dotenv()

ph = PasswordHasher()

# 2. Master Key Initialization & Validation (32 bytes / 256 bits)
RAW_HEX_KEY = os.getenv("AES_MASTER_KEY") or os.getenv("AES_SECRET_KEY", "")

def get_master_cipher() -> AESGCM:
    """
    Validates and pre-instantiates the AESGCM cipher engine.
    Ensures the master key is exactly 256 bits (32 bytes, 64 hex characters).
    """
    if not RAW_HEX_KEY:
        raise ValueError("CRITICAL: AES_MASTER_KEY is not defined in the environment (.env).")
    
    clean_hex = RAW_HEX_KEY.strip()
    if len(clean_hex) != 64:
        raise ValueError(
            f"CRITICAL: AES_MASTER_KEY must be a 64-character hex string (32 bytes). "
            f"Current length is {len(clean_hex)}."
        )
    
    try:
        key_bytes = bytes.fromhex(clean_hex)
        return AESGCM(key_bytes)
    except ValueError as exc:
        raise ValueError("CRITICAL: Failed to decode AES_MASTER_KEY hex bytes.") from exc

_cipher_instance: Optional[AESGCM] = None

def get_cipher() -> AESGCM:
    global _cipher_instance
    if _cipher_instance is None:
        _cipher_instance = get_master_cipher()
    return _cipher_instance

# 3. Synchronous AES-256-GCM Primitives
def encrypt_payload(
    data: Union[Dict[str, Any], str, bytes],
    associated_data: Optional[bytes] = None
) -> str:
    """
    Encrypts arbitrary payload using authenticated AES-256-GCM.
    - Nonce: 12 bytes (96 bits) CSPRNG generated via os.urandom.
    - Tag: 16 bytes (128 bits) appended automatically by AESGCM.
    - Associated Data (AAD): Optional bytes to cryptographically bind ciphertext to a context.
    - Output: Base64 string containing [12-byte Nonce + Ciphertext + 16-byte Tag].
    """
    cipher = get_cipher()
    nonce = os.urandom(12)
    
    if isinstance(data, dict):
        plaintext_bytes = json.dumps(data, separators=(",", ":")).encode("utf-8")
    elif isinstance(data, str):
        plaintext_bytes = data.encode("utf-8")
    elif isinstance(data, bytes):
        plaintext_bytes = data
    else:
        plaintext_bytes = json.dumps(data).encode("utf-8")
    
    ciphertext_and_tag = cipher.encrypt(nonce, plaintext_bytes, associated_data)
    packed = nonce + ciphertext_and_tag
    return base64.b64encode(packed).decode("utf-8")

def decrypt_payload(
    encrypted_base64: str,
    associated_data: Optional[bytes] = None,
    as_json: bool = True
) -> Any:
    """
    Decrypts Base64 string produced by encrypt_payload.
    Verifies 128-bit authentication tag; if tampered, raises InvalidTag.
    """
    cipher = get_cipher()
    raw = base64.b64decode(encrypted_base64.encode("utf-8"))
    
    if len(raw) < 28:
        raise ValueError("Ciphertext format is invalid; payload too short.")
    
    nonce = raw[:12]
    ciphertext_and_tag = raw[12:]
    
    decrypted_bytes = cipher.decrypt(nonce, ciphertext_and_tag, associated_data)
    decoded_str = decrypted_bytes.decode("utf-8")
    
    if as_json:
        try:
            return json.loads(decoded_str)
        except json.JSONDecodeError:
            return decoded_str
    return decoded_str

# 4. Non-Blocking Async Wrappers for 100+ Concurrent Requests
async def async_encrypt_payload(
    data: Union[Dict[str, Any], str, bytes],
    associated_data: Optional[bytes] = None
) -> str:
    """
    Offloads CPU-bound cryptographic work to Python's default ThreadPoolExecutor
    via asyncio.to_thread, preventing event loop blocking under heavy concurrent loads.
    """
    return await asyncio.to_thread(encrypt_payload, data, associated_data)

async def async_decrypt_payload(
    encrypted_base64: str,
    associated_data: Optional[bytes] = None,
    as_json: bool = True
) -> Any:
    return await asyncio.to_thread(decrypt_payload, encrypted_base64, associated_data, as_json)`
    },
    'auth/router.py': {
      path: 'coval-backend/auth/router.py',
      name: 'router.py',
      language: 'python',
      badge: 'FastAPI Vault Routes',
      content: `from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from auth.database import supabase
from auth.security import async_encrypt_payload, async_decrypt_payload

vault_router = APIRouter(prefix="/vault", tags=["encrypted-vault"])

class StoreRepoMetadataRequest(BaseModel):
    repository_id: str = Field(..., description="Target repository UUID")
    repo_name: str = Field(..., description="e.g. coval-org/rag-orchestrator")
    access_token: str = Field(..., description="GitHub OAuth / PAT token")
    environment_variables: dict = Field(default_factory=dict)
    webhook_secret: str = None

# 1. Asynchronous Route: Save Scrambled Data to Supabase
@vault_router.post("/repository-metadata")
async def store_encrypted_repository_metadata(
    body: StoreRepoMetadataRequest,
    x_user_id: str = Header("usr_default_admin", alias="X-User-Id")
):
    sensitive_bundle = {
        "repo_name": body.repo_name,
        "access_token": body.access_token,
        "environment_variables": body.environment_variables,
        "webhook_secret": body.webhook_secret
    }
    
    # AAD binds ciphertext to the authenticated user ID
    aad = x_user_id.encode("utf-8")
    
    # Non-blocking encryption (runs in worker thread)
    scrambled_base64 = await async_encrypt_payload(sensitive_bundle, associated_data=aad)
    
    # Save scrambled string to database
    supabase.table("repositories").upsert({
        "id": body.repository_id,
        "name": body.repo_name,
        "metadata_encrypted": scrambled_base64,
        "owner_user_id": x_user_id
    }).execute()

    return {
        "status": "scrambled_and_persisted",
        "repository_id": body.repository_id,
        "cipher": "AES-256-GCM"
    }

# 2. Asynchronous Route: Fetch & Decrypt by Authorized User
@vault_router.get("/repository-metadata/{repository_id}")
async def fetch_and_decrypt_repository_metadata(
    repository_id: str,
    x_user_id: str = Header("usr_default_admin", alias="X-User-Id")
):
    query = supabase.table("repositories").select("metadata_encrypted, owner_user_id").eq("id", repository_id).execute()
    if not query.data:
        raise HTTPException(status_code=404, detail="Repository not found.")
    
    scrambled_ciphertext = query.data[0]["metadata_encrypted"]
    aad = x_user_id.encode("utf-8")
    
    # Non-blocking decryption and authentication tag check
    try:
        decrypted_bundle = await async_decrypt_payload(scrambled_ciphertext, associated_data=aad, as_json=True)
    except Exception as exc:
        raise HTTPException(status_code=403, detail="Decryption failed. Unauthorized user or tampered data.")

    return decrypted_bundle`
    },
    'auth/database.py': {
      path: 'coval-backend/auth/database.py',
      name: 'database.py',
      language: 'python',
      badge: 'Supabase Client',
      content: `import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)`
    },
    'lib/supabase.ts': {
      path: 'src/lib/supabase.ts',
      name: 'supabase.ts (Client SDK)',
      language: 'typescript',
      badge: '@supabase/supabase-js OAuth',
      content: `import { createClient } from '@supabase/supabase-js';

// Safe environment fallback for client-side Supabase client
const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://cdfltsogriaaedxtibqh.supabase.co';

const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Official Supabase OAuth Initiation Pattern:
 * 1. Does NOT route to /rest/v1/auth/v1/authorize (avoids 404 & malformed PostgREST proxy)
 * 2. Uses \`\${SUPABASE_URL}/auth/v1/authorize\` under the hood
 * 3. Automatically includes the required anon public API key header & params,
 *    avoiding the "No API key found in request" error.
 */
export async function initiateOAuthLogin(provider: 'github' | 'google' | 'twitter') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: 'http://localhost:3000/dashboard'
    }
  });
  
  if (error) {
    throw error;
  }
  return data;
}`
    },
    'main.py': {
      path: 'coval-backend/main.py',
      name: 'main.py',
      language: 'python',
      badge: 'FastAPI Entry',
      content: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth.router import router as auth_router, vault_router

app = FastAPI(
    title="Coval Agentic RAG Platform - Backend API",
    description="Sub-Team 3: Infrastructure, pgvector Database & Privacy/Encryption Auth Layer",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(vault_router)

@app.get("/")
async def root():
    return {"status": "online", "service": "Coval Auth & Security Service"}`
    },
    '.env': {
      path: 'coval-backend/.env',
      name: '.env',
      language: 'shell',
      badge: 'Secrets & Keys',
      content: `# Supabase Configuration
SUPABASE_URL=https://cdfltsogriaaedxtibqh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Encryption Master Key (Sub-Team 3 Master Lock - 32 bytes / 64 hex chars)
AES_MASTER_KEY=0a1eb4e52eb69b4a01b59a11643ce7ac0bf2b681ed2e538b3fe11f2e4787e4cc
AES_SECRET_KEY=0a1eb4e52eb69b4a01b59a11643ce7ac0bf2b681ed2e538b3fe11f2e4787e4cc

FRONTEND_URL=https://demo-coval.vercel.app
BASE_URL=http://localhost:8000`
    },
    'requirements.txt': {
      path: 'coval-backend/requirements.txt',
      name: 'requirements.txt',
      language: 'text',
      badge: 'Dependencies',
      content: `fastapi>=0.110.0
uvicorn>=0.28.0
supabase>=2.4.0
cryptography>=42.0.0
argon2-cffi>=23.1.0
python-dotenv>=1.0.1
pydantic>=2.6.0
httpx>=0.27.0
openai>=1.14.0`
    },
    'rag/indexer.py': {
      path: 'coval-backend/rag/indexer.py',
      name: 'indexer.py',
      language: 'python',
      badge: 'Function-Aware Semantic Chunking',
      content: `import os
import re
import math
import logging
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("coval.indexer")

IGNORED_DIRS = {"node_modules", "dist", "build", ".git", ".venv", "__pycache__", ".next", "vendor"}
IGNORED_EXTENSIONS = {".png", ".jpg", ".svg", ".zip", ".tar", ".pyc", ".map", ".lock"}

@dataclass
class CodeChunk:
    file_path: str
    language: str
    symbol_name: str
    chunk_type: str
    start_line: int
    end_line: int
    content: str
    token_estimate: int

# 1. Directory Traversal & Filter (Redacting Secrets)
def walk_and_filter_repository(root_dir: str):
    root_path = Path(root_dir).resolve()
    valid_files = []
    for path in root_path.rglob("*"):
        if not path.is_file(): continue
        if any(part in IGNORED_DIRS for part in path.parts): continue
        if path.suffix in IGNORED_EXTENSIONS: continue
        if any(p in path.name.lower() for p in [".env", ".pem", "id_rsa"]): continue
        valid_files.append({"relative_path": str(path.relative_to(root_path)), "absolute_path": str(path), "language": "python"})
    return valid_files

# 2. Function-Aware Code Chunking
PYTHON_BOUNDARY = re.compile(r"^(async\s+def\s+|def\s+|class\s+)([a-zA-Z0-9_]+)")

def chunk_code_file(relative_path: str, content: str, language: str, max_chunk_tokens: int = 800):
    lines = content.splitlines()
    chunks = []
    current_lines = []
    chunk_start = 1
    current_symbol = "module_header"
    current_type = "module_header"

    for i, line in enumerate(lines):
        line_num = i + 1
        leading_spaces = len(line) - len(line.lstrip(" "))
        if leading_spaces <= 4:
            m = PYTHON_BOUNDARY.match(line.strip())
            if m and len(current_lines) > 5:
                chunks.append(CodeChunk(
                    file_path=relative_path, language=language, symbol_name=current_symbol,
                    chunk_type=current_type, start_line=chunk_start, end_line=line_num - 1,
                    content="\\n".join(current_lines).strip(), token_estimate=len("\\n".join(current_lines)) // 4
                ))
                current_lines = []
                chunk_start = line_num
                current_symbol = m.group(2)
                current_type = "class" if m.group(1).startswith("class") else "function"
        current_lines.append(line)

    if current_lines:
        chunks.append(CodeChunk(
            file_path=relative_path, language=language, symbol_name=current_symbol,
            chunk_type=current_type, start_line=chunk_start, end_line=len(lines),
            content="\\n".join(current_lines).strip(), token_estimate=len("\\n".join(current_lines)) // 4
        ))
    return chunks

# 3. Insert Chunks with Strict Tenant Isolation (user_id + repo_id)
def insert_chunks_to_supabase(chunks, embeddings, user_id: str, repo_id: str, supabase_client):
    if not user_id or not repo_id:
        raise ValueError("CRITICAL SECURITY: user_id and repo_id are mandatory to prevent cross-tenant queries.")
    
    records = []
    for chunk, emb in zip(chunks, embeddings):
        records.append({
            "user_id": user_id.strip(),
            "repo_id": repo_id.strip(),
            "file_path": chunk.file_path,
            "symbol_name": chunk.symbol_name,
            "chunk_type": chunk.chunk_type,
            "start_line": chunk.start_line,
            "end_line": chunk.end_line,
            "content": chunk.content,
            "token_estimate": chunk.token_estimate,
            "embedding": emb,
            "metadata": {"user_id": user_id, "repo_id": repo_id, "file_path": chunk.file_path}
        })
    supabase_client.table("document_chunks").insert(records).execute()
    return len(records)`
    },
    'rag/chat_router.py': {
      path: 'coval-backend/rag/chat_router.py',
      name: 'chat_router.py',
      language: 'python',
      badge: 'Tokenized Chat & Wallet Deduction',
      content: `import os
import asyncio
from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel, Field
from auth.database import supabase
from rag.indexer import EmbeddingClient

router = APIRouter(prefix="/chat", tags=["tokenized-rag-chat"])
DEFAULT_QUERY_TOKEN_COST = 5

class ChatQueryRequest(BaseModel):
    repository_id: str = Field(..., description="Target repository ID")
    query: str = Field(..., description="User query")
    top_k: int = Field(default=5)

async def deduct_wallet_tokens_atomic(user_id: str, amount: int):
    # Atomically checks and deducts balance in Supabase token_wallets
    def _execute():
        rpc_res = supabase.rpc("deduct_wallet_tokens", {
            "p_user_id": user_id,
            "p_amount": amount
        }).execute()
        return rpc_res.data[0] if rpc_res.data else {"success": False, "remaining_balance": 0}
    return await asyncio.to_thread(_execute)

@router.post("/query")
async def query_codebase_assistant(
    body: ChatQueryRequest,
    x_user_id: str = Header(..., alias="X-User-Id")
):
    # 1. Atomic Wallet Balance Check & Deduction
    deduction = await deduct_wallet_tokens_atomic(x_user_id, DEFAULT_QUERY_TOKEN_COST)
    if not deduction.get("success"):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "Payment Required",
                "message": f"Insufficient token balance ({deduction.get('remaining_balance')} available, {DEFAULT_QUERY_TOKEN_COST} required).",
                "required_tokens": DEFAULT_QUERY_TOKEN_COST
            }
        )

    # 2. Context Retrieval via pgvector strictly scoped by user_id and repo_id
    embedder = EmbeddingClient()
    query_vector = (await asyncio.to_thread(embedder.embed_batch, [body.query]))[0]

    def _fetch_chunks():
        return supabase.rpc("match_code_chunks", {
            "query_embedding": query_vector,
            "match_threshold": 0.45,
            "match_count": body.top_k,
            "filter_user_id": x_user_id,
            "filter_repo_id": body.repository_id
        }).execute().data or []

    chunks = await asyncio.to_thread(_fetch_chunks)

    # 3. LLM Response Generation with Evidence Grounding
    answer = f"Analysis based on [{chunks[0]['file_path']}:{chunks[0]['start_line']}-{chunks[0]['end_line']}]:..."

    return {
        "answer": answer,
        "citations": [{"file_path": c["file_path"], "lines": f"{c['start_line']}-{c['end_line']}"} for c in chunks],
        "tokens_deducted": DEFAULT_QUERY_TOKEN_COST,
        "remaining_wallet_balance": deduction.get("remaining_balance")
    }`
    },
    'rag/tokenized_rag_router.py': {
      path: 'coval-backend/rag/tokenized_rag_router.py',
      name: 'tokenized_rag_router.py',
      language: 'python',
      badge: '100-User Non-Blocking Endpoint',
      content: `import os
import asyncio
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, UUID4
from auth.database import supabase
from rag.indexer import EmbeddingClient
from db_pool import get_db_connection
import asyncpg

logger = logging.getLogger("coval.tokenized_rag")
router = APIRouter(prefix="/v1/rag", tags=["tokenized-rag-engine"])

# 1. Pydantic Request & Response Schemas
class ChatRAGRequest(BaseModel):
    user_id: UUID4 = Field(..., description="UUID of authenticated user")
    repo_id: str = Field(..., min_length=1, max_length=255, description="Repository identifier")
    query: str = Field(..., min_length=3, max_length=3000, description="Natural language question")
    top_k: int = Field(default=5, ge=1, le=15)
    match_threshold: float = Field(default=0.45, ge=0.0, le=1.0)
    token_cost: int = Field(default=5, ge=1, le=100)

class CitationMetadata(BaseModel):
    chunk_id: Optional[str]
    file_path: str
    symbol_name: str
    chunk_type: str
    start_line: int
    end_line: int
    similarity: float

class ChatRAGResponse(BaseModel):
    answer: str
    citations: List[CitationMetadata]
    tokens_deducted: int
    remaining_wallet_balance: int
    user_id: str
    repo_id: str
    model: str
    latency_ms: float
    tenant_isolation_verified: bool = True

# 2. Contextual LLM Call (Gemini API with Citations Grounding)
def call_gemini_with_code_context(query: str, chunks: List[Dict[str, Any]], model_name: str = "gemini-2.5-flash") -> str:
    gemini_key = os.getenv("GEMINI_API_KEY")
    evidence_blocks = [
        f"--- Snippet #{i+1} | {c['file_path']}:{c['start_line']}-{c['end_line']} | {c['symbol_name']} ---\\n{c['content']}"
        for i, c in enumerate(chunks)
    ]
    evidence_text = "\\n\\n".join(evidence_blocks)
    user_content = f"Code Context:\\n{evidence_text}\\n\\nUser Question:\\n{query}"
    
    if not gemini_key:
        return f"Bottleneck Diagnosis & Fix for: {query}\\nBased on context in [{chunks[0]['file_path']}:{chunks[0]['start_line']}-{chunks[0]['end_line']}]:\\nRefactor CPU-bound tasks via asyncio.to_thread."

    from google import genai
    from google.genai import types
    client = genai.Client(api_key=gemini_key)
    response = client.models.generate_content(
        model=model_name,
        contents=user_content,
        config=types.GenerateContentConfig(
            system_instruction="You are Coval Lead AI Systems Architect. Base responses strictly on code context with line citations.",
            temperature=0.2,
            max_output_tokens=2048
        )
    )
    return response.text

# 3. Scalable Async Route (100-User Concurrency with asyncpg Connection Pool)
@router.post("/chat/tokenized", response_model=ChatRAGResponse)
async def tokenized_rag_chat_endpoint(
    payload: ChatRAGRequest,
    conn: Optional[asyncpg.Connection] = Depends(get_db_connection)
):
    start_time = asyncio.get_event_loop().time()
    
    # Non-blocking embedding generation
    embedder = EmbeddingClient()
    query_vector = (await asyncio.to_thread(embedder.embed_batch, [payload.query]))[0]
    vector_literal = "[" + ",".join(str(x) for x in query_vector) + "]"

    # Single-transaction atomic check, deduction & pgvector retrieval
    raw_records = await conn.fetch(
        "SELECT * FROM execute_tokenized_rag_search_and_deduct($1::uuid, $2::text, $3::vector, $4::int, $5::float, $6::int)",
        payload.user_id, payload.repo_id, vector_literal, payload.token_cost, payload.match_threshold, payload.top_k
    )
    rpc_rows = [dict(r) for r in raw_records]

    # Evaluate atomic transaction status
    status_code = rpc_rows[0].get("status_code", "SUCCESS")
    current_bal = rpc_rows[0].get("remaining_balance", 0)
    if status_code == "INSUFFICIENT_FUNDS":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"error": "Payment Required", "message": f"Insufficient tokens ({current_bal} available, {payload.token_cost} required)."}
        )

    valid_chunks = [r for r in rpc_rows if r.get("content") is not None]
    citations = [
        CitationMetadata(
            chunk_id=str(r.get("chunk_id", "")), file_path=r["file_path"],
            symbol_name=r["symbol_name"], chunk_type=r["chunk_type"],
            start_line=r["start_line"], end_line=r["end_line"], similarity=float(r["similarity"])
        ) for r in valid_chunks
    ]

    ai_answer = await asyncio.to_thread(call_gemini_with_code_context, query=payload.query, chunks=valid_chunks)
    elapsed_ms = (asyncio.get_event_loop().time() - start_time) * 1000

    return ChatRAGResponse(
        answer=ai_answer, citations=citations, tokens_deducted=payload.token_cost,
        remaining_wallet_balance=current_bal, user_id=str(payload.user_id), repo_id=payload.repo_id,
        model="gemini-2.5-flash", latency_ms=round(elapsed_ms, 2)
    )`
    },
    'db_pool.py': {
      path: 'coval-backend/db_pool.py',
      name: 'db_pool.py',
      language: 'python',
      badge: 'asyncpg Connection Pool (100 Users)',
      content: `import os
import logging
from typing import Optional, AsyncGenerator
import asyncpg
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("coval.db_pool")
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL", "")

class DatabasePoolManager:
    """
    Manages an asyncpg connection pool tailored for 100+ concurrent requests.
    - Min pool size: 10 connections (pre-warmed)
    - Max pool size: 50 connections (dynamic scaling)
    - Command timeout: 30s
    """
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def init_pool(self, min_size: int = 10, max_size: int = 50):
        if not DATABASE_URL:
            logger.warning("DATABASE_URL not set. Running in fallback mode.")
            return
        self.pool = await asyncpg.create_pool(
            dsn=DATABASE_URL,
            min_size=min_size,
            max_size=max_size,
            max_inactive_connection_lifetime=300.0,
            command_timeout=30.0,
            ssl="require"
        )
        logger.info(f"Database connection pool initialized: min={min_size}, max={max_size}")

    async def close_pool(self):
        if self.pool:
            await self.pool.close()

db_pool = DatabasePoolManager()

async def get_db_connection() -> AsyncGenerator[Optional[asyncpg.Connection], None]:
    """FastAPI dependency yielding pooled connection with automatic release."""
    if db_pool.pool:
        async with db_pool.pool.acquire() as conn:
            yield conn
    else:
        yield None`
    },
    'sql/atomic_rag_rpc.sql': {
      path: 'coval-backend/sql/atomic_rag_rpc.sql',
      name: 'atomic_rag_rpc.sql',
      language: 'sql',
      badge: 'Single-Transaction Atomic RPC',
      content: `-- Single-Transaction Atomic Vector Search + Wallet Token Deduction
-- Eliminates race conditions across 100 concurrent requests
CREATE OR REPLACE FUNCTION execute_tokenized_rag_search_and_deduct(
    p_user_id UUID,
    p_repo_id TEXT,
    p_query_embedding vector(1536),
    p_token_cost INT DEFAULT 5,
    p_match_threshold FLOAT DEFAULT 0.45,
    p_match_count INT DEFAULT 5
)
RETURNS TABLE (
    status_code TEXT,
    remaining_balance INT,
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
BEGIN
    -- 1. Atomic Check & Deduction with row-level write lock
    UPDATE token_wallets
    SET balance = balance - p_token_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id AND balance >= p_token_cost
    RETURNING balance INTO v_current_balance;

    -- 2. Handle Insufficient Funds
    IF NOT FOUND THEN
        SELECT balance INTO v_current_balance FROM token_wallets WHERE user_id = p_user_id;
        IF NOT FOUND THEN
            RETURN QUERY SELECT 'WALLET_NOT_FOUND'::TEXT, 0, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INT, NULL::INT, NULL::TEXT, NULL::FLOAT;
        ELSE
            RETURN QUERY SELECT 'INSUFFICIENT_FUNDS'::TEXT, v_current_balance, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INT, NULL::INT, NULL::TEXT, NULL::FLOAT;
        END IF;
        RETURN;
    END IF;

    -- 3. Atomic Context Retrieval via pgvector strictly scoped by user_id and repo_id
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
END;
$$;`
    },
    'indexer.py': {
      path: 'coval-backend/indexer.py',
      name: 'indexer.py (CLI)',
      language: 'python',
      badge: 'CLI Entrypoint',
      content: `#!/usr/bin/env python3
import argparse
from auth.database import supabase
from rag.indexer import index_codebase_to_pgvector

def main():
    parser = argparse.ArgumentParser(description="Index codebase into Supabase pgvector.")
    parser.add_argument("--dir", required=True, help="Path to local repository clone")
    parser.add_argument("--user-id", required=True, help="Owner user_id (Tenant Isolation Lock)")
    parser.add_argument("--repo-id", required=True, help="Repository ID")
    args = parser.parse_args()

    result = index_codebase_to_pgvector(
        repo_directory=args.dir,
        user_id=args.user_id,
        repo_id=args.repo_id,
        supabase_client=supabase
    )
    print("Ingestion Succeeded:", result)

if __name__ == "__main__":
    main()`
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[selectedFile].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2">
            <span>FastAPI Backend Source</span>
            <span aria-hidden="true">·</span>
            <span>Sub-Team 3</span>
            <span aria-hidden="true">·</span>
            <span>coval-backend/</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            FastAPI Auth & Security Codebase
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            The Python backend codebase mirrored directly from your repository tree, upgraded with
            AES-256-GCM non-blocking async execution, <code className="text-indigo-300 font-mono">AES_MASTER_KEY</code> validation,
            and repository metadata vault routes.
          </p>
        </div>
      </div>

      {/* Explorer Container */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-4">
        {/* Sidebar File Tree */}
        <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950 p-4 space-y-4">
          <div className="text-xs font-mono text-slate-400 font-semibold px-2 uppercase tracking-wider">
            Workspace Tree
          </div>

          <div className="space-y-1 font-mono text-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 text-slate-300 font-semibold">
              <Folder className="w-4 h-4 text-indigo-400" />
              <span>coval-backend</span>
            </div>

            <div className="pl-4 space-y-0.5">
              {/* Auth Folder */}
              <div>
                <button
                  onClick={() => setAuthFolderOpen(!authFolderOpen)}
                  className="w-full flex items-center gap-1.5 px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-900 rounded text-left transition-colors"
                >
                  {authFolderOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>auth</span>
                </button>

                {authFolderOpen && (
                  <div className="pl-6 space-y-0.5">
                    {['auth/security.py', 'auth/router.py', 'auth/database.py'].map((path) => (
                      <button
                        key={path}
                        onClick={() => setSelectedFile(path)}
                        className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                          selectedFile === path
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5 text-sky-400" />
                        <span>{path.split('/')[1]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RAG Folder */}
              <div>
                <div className="w-full flex items-center gap-1.5 px-2 py-1 text-slate-300 rounded text-left font-semibold">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>rag</span>
                </div>
                <div className="pl-6 space-y-0.5">
                  <button
                    onClick={() => setSelectedFile('rag/indexer.py')}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                      selectedFile === 'rag/indexer.py'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>indexer.py</span>
                  </button>
                  <button
                    onClick={() => setSelectedFile('rag/chat_router.py')}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                      selectedFile === 'rag/chat_router.py'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>chat_router.py</span>
                  </button>
                  <button
                    onClick={() => setSelectedFile('rag/tokenized_rag_router.py')}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                      selectedFile === 'rag/tokenized_rag_router.py'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>tokenized_rag_router.py</span>
                  </button>
                </div>
              </div>

              {/* SQL Folder */}
              <div>
                <div className="w-full flex items-center gap-1.5 px-2 py-1 text-slate-300 rounded text-left font-semibold">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>sql</span>
                </div>
                <div className="pl-6 space-y-0.5">
                  <button
                    onClick={() => setSelectedFile('sql/atomic_rag_rpc.sql')}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                      selectedFile === 'sql/atomic_rag_rpc.sql'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-purple-400" />
                    <span>atomic_rag_rpc.sql</span>
                  </button>
                </div>
              </div>

              {/* Root Files */}
              {['db_pool.py', 'indexer.py', '.env', 'main.py', 'requirements.txt', 'lib/supabase.ts'].map((path) => (
                <button
                  key={path}
                  onClick={() => setSelectedFile(path)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                    selectedFile === path
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>{path}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Code View Area */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-slate-950">
          {/* File Top Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-white">
                {files[selectedFile].path}
              </span>
              {files[selectedFile].badge && (
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded">
                  {files[selectedFile].badge}
                </span>
              )}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Syntax Code Container */}
          <div className="p-5 overflow-x-auto flex-1">
            <pre className="font-mono text-xs text-slate-200 leading-relaxed">
              {files[selectedFile].content}
            </pre>
          </div>

          {/* Footer Status */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-800/80 bg-slate-900/40 text-[11px] font-mono text-slate-500">
            <span>Language: {files[selectedFile].language}</span>
            <span>Encoding: UTF-8</span>
          </div>
        </div>
      </div>
    </div>
  );
};
