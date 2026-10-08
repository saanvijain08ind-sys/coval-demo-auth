import os
import json
import base64
from typing import Dict, Any, Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from argon2 import PasswordHasher
from dotenv import load_dotenv

load_dotenv()

ph = PasswordHasher()

HEX_KEY = os.getenv("AES_SECRET_KEY", "")
try:
    aesgcm = AESGCM(bytes.fromhex(HEX_KEY)) if HEX_KEY else None
except Exception as e:
    aesgcm = None

ADMIN_ALLOWLIST = [
    item.strip().lower()
    for item in os.getenv("CODEVAL_ADMINS", "admin,saanvijain08,saanvijain08.ind@gmail.com,coval-lead").split(",")
    if item.strip()
]

def hash_token(token: str) -> str:
    """Hashes a refresh token using Argon2id for irreversible verification."""
    return ph.hash(token)

def verify_token_hash(hash_val: str, token: str) -> bool:
    """Verifies a refresh token against its Argon2id hash."""
    try:
        return ph.verify(hash_val, token)
    except Exception:
        return False

def encrypt_tokens(payload: Dict[str, Any]) -> str:
    """
    Encrypts token payload dictionary using authenticated AES-256-GCM.
    Returns standard Base64 representation of [12-byte Nonce + Ciphertext + Tag].
    """
    if not aesgcm:
        raise ValueError("AES_SECRET_KEY is not configured or invalid 64-char hex string.")
    nonce = os.urandom(12)
    data = json.dumps(payload).encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")

def decrypt_tokens(encrypted_str: str) -> Dict[str, Any]:
    """
    Decrypts AES-256-GCM encrypted token payload.
    Extracts 12-byte nonce, authenticates tag, and restores payload dict.
    """
    if not aesgcm:
        raise ValueError("AES_SECRET_KEY is not configured or invalid.")
    raw = base64.b64decode(encrypted_str.encode("utf-8"))
    nonce, ciphertext = raw[:12], raw[12:]
    decrypted_data = aesgcm.decrypt(nonce, ciphertext, None)
    return json.loads(decrypted_data.decode("utf-8"))

def resolve_user_role(github_login: Optional[str], email: Optional[str] = None) -> str:
    """
    Identity resolution rule per Coval architecture spec:
    If github_login or email in ADMIN_ALLOWLIST -> 'admin', else 'employer'.
    """
    if github_login and github_login.lower() in ADMIN_ALLOWLIST:
        return "admin"
    if email and email.lower() in ADMIN_ALLOWLIST:
        return "admin"
    return "employer"

def is_secret_file(filename: str) -> bool:
    """
    Security invariant: Prompts and vector embeddings must redact secret-looking files.
    """
    lowered = filename.lower()
    sensitive_patterns = [".env", ".pem", "id_rsa", "id_ed25519", "credentials.json", ".key"]
    return any(pattern in lowered for pattern in sensitive_patterns)
