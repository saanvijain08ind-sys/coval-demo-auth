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
  const [selectedFile, setSelectedFile] = useState<string>('auth/router.py');
  const [copied, setCopied] = useState(false);
  const [authFolderOpen, setAuthFolderOpen] = useState(true);

  const files: Record<string, FileEntry> = {
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
    raise ValueError("Missing Supabase credentials in .env file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)`
    },
    'auth/router.py': {
      path: 'coval-backend/auth/router.py',
      name: 'router.py',
      language: 'python',
      badge: 'OAuth Routes',
      content: `import os
from fastapi import APIRouter
from fastapi.responses import RedirectResponse
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
    """Initiates GitHub OAuth flow via Supabase."""
    redirect_target = os.getenv("FRONTEND_URL", "http://localhost:8000")
    res = supabase.auth.sign_in_with_oauth({
        "provider": "github",
        "options": {"redirect_to": f"{redirect_target}/dashboard"}
    })
    return RedirectResponse(url=res.url)`
    },
    'auth/security.py': {
      path: 'coval-backend/auth/security.py',
      name: 'security.py',
      language: 'python',
      badge: 'AES-256-GCM + Argon2id',
      content: `import os
import json
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from argon2 import PasswordHasher
from dotenv import load_dotenv

load_dotenv()

ph = PasswordHasher()

HEX_KEY = os.getenv("AES_SECRET_KEY", "")
aesgcm = AESGCM(bytes.fromhex(HEX_KEY)) if HEX_KEY else None

def hash_token(token: str) -> str:
    """Hashes a refresh token using Argon2id."""
    return ph.hash(token)

def verify_token_hash(hash_val: str, token: str) -> bool:
    """Verifies a refresh token against its Argon2 hash."""
    try:
        return ph.verify(hash_val, token)
    except Exception:
        return False

def encrypt_tokens(payload: dict) -> str:
    """Encrypts token payload dictionary using AES-256-GCM."""
    if not aesgcm:
        raise ValueError("AES_SECRET_KEY is not configured.")
    nonce = os.urandom(12)
    data = json.dumps(payload).encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")

def decrypt_tokens(encrypted_str: str) -> dict:
    """Decrypts AES-256-GCM encrypted token payload."""
    if not aesgcm:
        raise ValueError("AES_SECRET_KEY is not configured.")
    raw = base64.b64decode(encrypted_str.encode("utf-8"))
    nonce, ciphertext = raw[:12], raw[12:]
    decrypted_data = aesgcm.decrypt(nonce, ciphertext, None)
    return json.loads(decrypted_data.decode("utf-8"))`
    },
    'main.py': {
      path: 'coval-backend/main.py',
      name: 'main.py',
      language: 'python',
      badge: 'FastAPI Entry',
      content: `from fastapi import FastAPI
from auth.router import router as auth_router

app = FastAPI(title="Coval Auth Service")

app.include_router(auth_router)

@app.get("/")
async def root():
    return {"status": "online", "service": "Coval Auth"}`
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

# Encryption & App Settings
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
httpx>=0.27.0`
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
            The Python backend codebase mirrored directly from your repository tree.
            Ready for local execution with Uvicorn, testing with pytest, and seamless expansion
            with future sub-team tasks.
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
                    {['auth/database.py', 'auth/router.py', 'auth/security.py'].map((path) => (
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

              {/* Root Files */}
              {['.env', 'main.py', 'requirements.txt'].map((path) => (
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
