from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth.router import router as auth_router, vault_router
from rag.router import router as rag_router
from rag.chat_router import router as chat_router

app = FastAPI(
    title="Coval Agentic RAG Platform - Backend API",
    description="Sub-Team 3: Infrastructure, pgvector Database & Privacy/Encryption Auth Layer",
    version="1.0.0"
)

# Enable CORS for frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(vault_router)
app.include_router(rag_router)
app.include_router(chat_router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Coval Auth & Security Service",
        "team": "Sub-Team 3 (Infrastructure, Vector DB & Privacy)",
        "security": {
            "token_encryption": "AES-256-GCM",
            "token_hashing": "Argon2id",
            "identity_provider": "GitHub / Supabase OAuth"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "Supabase PostgreSQL + pgvector",
        "auth_routes": [
            "/auth/login/github",
            "/auth/login/google",
            "/auth/login/x",
            "/auth/callback",
            "/auth/me",
            "/auth/logout",
            "/auth/security/encrypt",
            "/auth/security/decrypt",
            "/auth/security/hash",
            "/auth/security/verify-hash"
        ]
    }
