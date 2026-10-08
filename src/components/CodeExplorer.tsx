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
                </div>
              </div>

              {/* Root Files */}
              {['indexer.py', '.env', 'main.py', 'requirements.txt'].map((path) => (
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
