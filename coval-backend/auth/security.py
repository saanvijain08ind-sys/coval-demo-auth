import os
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

# 2. Master Key Initialization & Validation (32 bytes / 256 bits for AES-256-GCM)
# We support AES_MASTER_KEY as primary, with fallback to AES_SECRET_KEY
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
            f"CRITICAL: AES_MASTER_KEY must be a 64-character hex string (32 bytes for AES-256). "
            f"Current length is {len(clean_hex)} characters."
        )
    
    try:
        key_bytes = bytes.fromhex(clean_hex)
        return AESGCM(key_bytes)
    except ValueError as exc:
        raise ValueError("CRITICAL: Failed to decode AES_MASTER_KEY hex bytes.") from exc

# Singleton instance of the AESGCM cipher engine to eliminate repeated key parsing
_cipher_instance: Optional[AESGCM] = None

def get_cipher() -> AESGCM:
    global _cipher_instance
    if _cipher_instance is None:
        _cipher_instance = get_master_cipher()
    return _cipher_instance

# -----------------------------------------------------------------------------
# Core AES-256-GCM Cryptographic Utility Functions
# -----------------------------------------------------------------------------

def encrypt_payload(
    data: Union[Dict[str, Any], str, bytes],
    associated_data: Optional[bytes] = None
) -> str:
    """
    Synchronously encrypts arbitrary payload using authenticated AES-256-GCM.
    
    - Nonce: 12 bytes (96 bits) CSPRNG generated via os.urandom.
    - Tag: 16 bytes (128 bits) appended automatically to the ciphertext by AESGCM.
    - Associated Data (AAD): Optional bytes to cryptographically bind ciphertext to a context (e.g. user_id).
    - Output: Base64-encoded string containing [12-byte Nonce + Ciphertext + 16-byte Tag].
    """
    cipher = get_cipher()
    nonce = os.urandom(12)  # 96-bit standard GCM nonce
    
    # Serialize input to bytes
    if isinstance(data, dict):
        plaintext_bytes = json.dumps(data, separators=(",", ":")).encode("utf-8")
    elif isinstance(data, str):
        plaintext_bytes = data.encode("utf-8")
    elif isinstance(data, bytes):
        plaintext_bytes = data
    else:
        plaintext_bytes = json.dumps(data).encode("utf-8")
    
    # AES-GCM performs authenticated encryption with optional AAD
    ciphertext_and_tag = cipher.encrypt(nonce, plaintext_bytes, associated_data)
    
    # Pack: [12-byte Nonce] + [Ciphertext + 16-byte Tag]
    packed = nonce + ciphertext_and_tag
    return base64.b64encode(packed).decode("utf-8")

def decrypt_payload(
    encrypted_base64: str,
    associated_data: Optional[bytes] = None,
    as_json: bool = True
) -> Any:
    """
    Synchronously decrypts Base64 string produced by encrypt_payload.
    
    - Extracts 12-byte nonce.
    - Verifies 128-bit authentication tag; if tampered, raises cryptography.exceptions.InvalidTag.
    - Restores JSON dict or string.
    """
    cipher = get_cipher()
    raw = base64.b64decode(encrypted_base64.encode("utf-8"))
    
    if len(raw) < 28:  # 12-byte nonce + minimum 16-byte tag
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

# -----------------------------------------------------------------------------
# High-Efficiency Non-Blocking Async Wrappers (for 100+ Concurrent Requests)
# -----------------------------------------------------------------------------

async def async_encrypt_payload(
    data: Union[Dict[str, Any], str, bytes],
    associated_data: Optional[bytes] = None
) -> str:
    """
    Non-blocking asynchronous wrapper for encrypt_payload.
    Offloads CPU-bound cryptographic work to Python's default ThreadPoolExecutor
    via asyncio.to_thread, preventing event loop blocking under heavy concurrent loads.
    """
    return await asyncio.to_thread(encrypt_payload, data, associated_data)

async def async_decrypt_payload(
    encrypted_base64: str,
    associated_data: Optional[bytes] = None,
    as_json: bool = True
) -> Any:
    """
    Non-blocking asynchronous wrapper for decrypt_payload.
    Runs decryption in threadpool worker so the FastAPI event loop stays receptive.
    """
    return await asyncio.to_thread(decrypt_payload, encrypted_base64, associated_data, as_json)

# Compatibility aliases for existing auth routes
def encrypt_tokens(payload: Dict[str, Any]) -> str:
    return encrypt_payload(payload)

def decrypt_tokens(encrypted_str: str) -> Dict[str, Any]:
    return decrypt_payload(encrypted_str, as_json=True)

# -----------------------------------------------------------------------------
# Refresh Token Hashing (Argon2id) & Security Helpers
# -----------------------------------------------------------------------------

def hash_token(token: str) -> str:
    """Hashes a refresh token using Argon2id for irreversible verification."""
    return ph.hash(token)

def verify_token_hash(hash_val: str, token: str) -> bool:
    """Verifies a refresh token against its Argon2id hash."""
    try:
        return ph.verify(hash_val, token)
    except Exception:
        return False

ADMIN_ALLOWLIST = [
    item.strip().lower()
    for item in os.getenv("CODEVAL_ADMINS", "admin,saanvijain08,saanvijain08.ind@gmail.com,coval-lead").split(",")
    if item.strip()
]

def resolve_user_role(github_login: Optional[str], email: Optional[str] = None) -> str:
    if github_login and github_login.lower() in ADMIN_ALLOWLIST:
        return "admin"
    if email and email.lower() in ADMIN_ALLOWLIST:
        return "admin"
    return "employer"

def is_secret_file(filename: str) -> bool:
    lowered = filename.lower()
    sensitive_patterns = [".env", ".pem", "id_rsa", "id_ed25519", "credentials.json", ".key"]
    return any(pattern in lowered for pattern in sensitive_patterns)
