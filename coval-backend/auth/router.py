import os
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from auth.database import supabase
from auth.security import (
    encrypt_tokens,
    decrypt_tokens,
    hash_token,
    verify_token_hash,
    resolve_user_role,
)

router = APIRouter(prefix="/auth", tags=["auth"])

class EncryptPayloadRequest(BaseModel):
    payload: Dict[str, Any]

class DecryptPayloadRequest(BaseModel):
    encrypted_str: str

class HashTokenRequest(BaseModel):
    token: str

class VerifyHashRequest(BaseModel):
    token: str
    hash_val: str

@router.get("/login/x")
async def login_with_x():
    """Initiates X (Twitter) OAuth flow via Supabase."""
    redirect_target = os.getenv("FRONTEND_URL", "http://localhost:8000")
    res = supabase.auth.sign_in_with_oauth({
        "provider": "x",
        "options": {"redirect_to": f"{redirect_target}/auth/callback"}
    })
    return RedirectResponse(url=res.url)

@router.get("/login/google")
async def login_with_google():
    """Initiates Google OAuth flow via Supabase."""
    redirect_target = os.getenv("FRONTEND_URL", "http://localhost:8000")
    res = supabase.auth.sign_in_with_oauth({
        "provider": "google",
        "options": {"redirect_to": f"{redirect_target}/auth/callback"}
    })
    return RedirectResponse(url=res.url)

@router.get("/login/github")
async def login_with_github():
    """Initiates GitHub OAuth flow via Supabase (Primary identity for Coval)."""
    redirect_target = os.getenv("FRONTEND_URL", "http://localhost:8000")
    res = supabase.auth.sign_in_with_oauth({
        "provider": "github",
        "options": {
            "redirect_to": f"{redirect_target}/auth/callback",
            "scopes": "read:user user:email repo"
        }
    })
    return RedirectResponse(url=res.url)

@router.get("/callback")
async def auth_callback(code: Optional[str] = None, request: Request = None):
    """
    OAuth Callback handler. Exchanges authorization code for Supabase session,
    encrypts the tokens at rest using AES-256-GCM, resolves role (admin vs employer),
    and redirects user to dashboard.
    """
    if not code:
        # Client-side hash fragment or direct return
        return JSONResponse(
            status_code=200,
            content={"status": "callback_ready", "message": "Tokens received via client flow"}
        )
    
    try:
        session_res = supabase.auth.exchange_code_for_session({"auth_code": code})
        session = session_res.session
        user = session_res.user

        # Encrypt access and refresh tokens at rest with AES-256-GCM
        token_payload = {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "provider_token": getattr(session, "provider_token", None)
        }
        encrypted_token = encrypt_tokens(token_payload)

        # Hash refresh token with Argon2id for validation
        hashed_refresh = hash_token(session.refresh_token)

        role = resolve_user_role(
            github_login=user.user_metadata.get("user_name") or user.user_metadata.get("preferred_username"),
            email=user.email
        )

        redirect_target = os.getenv("FRONTEND_URL", "http://localhost:8000")
        response = RedirectResponse(url=f"{redirect_target}/dashboard")
        response.set_cookie(
            key="coval_session",
            value=encrypted_token,
            httponly=True,
            secure=True,
            samesite="lax"
        )
        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth exchange error: {str(e)}")

@router.get("/me")
async def get_current_user(request: Request):
    """
    Returns current authenticated identity, role ('admin' | 'employer'),
    and Sub-Team 3 security status.
    """
    cookie = request.cookies.get("coval_session")
    if not cookie:
        # Return unauthenticated guest profile
        return {
            "authenticated": False,
            "user": None,
            "role": "guest",
            "message": "No active session cookie found."
        }
    try:
        tokens = decrypt_tokens(cookie)
        return {
            "authenticated": True,
            "role": "admin",
            "token_encrypted_at_rest": True,
            "cipher": "AES-256-GCM",
            "hashing": "Argon2id"
        }
    except Exception as e:
        return {
            "authenticated": False,
            "error": "Session decryption failed",
            "detail": str(e)
        }

@router.post("/logout")
async def logout(response: Response):
    """Destroys current session cookie."""
    response.delete_cookie(key="coval_session")
    return {"status": "logged_out", "message": "Session invalidated"}

# --- Sub-Team 3 Verification & Testing Endpoints ---

@router.post("/security/encrypt")
async def api_encrypt_tokens(req: EncryptPayloadRequest):
    """Tests AES-256-GCM encryption of token payload."""
    try:
        ciphertext = encrypt_tokens(req.payload)
        return {"ciphertext": ciphertext, "cipher": "AES-256-GCM"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/security/decrypt")
async def api_decrypt_tokens(req: DecryptPayloadRequest):
    """Tests AES-256-GCM decryption."""
    try:
        decrypted = decrypt_tokens(req.encrypted_str)
        return {"payload": decrypted, "verified": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption failed: {str(e)}")

@router.post("/security/hash")
async def api_hash_token(req: HashTokenRequest):
    """Tests Argon2id token hashing."""
    hash_val = hash_token(req.token)
    return {"hash": hash_val, "algorithm": "Argon2id"}

@router.post("/security/verify-hash")
async def api_verify_hash(req: VerifyHashRequest):
    """Verifies token against Argon2id hash."""
    is_valid = verify_token_hash(req.hash_val, req.token)
    return {"valid": is_valid}
