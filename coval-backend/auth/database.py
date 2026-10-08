import os
import re
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_raw_url: str = os.getenv("SUPABASE_URL", "https://cdfltsogriaaedxtibqh.supabase.co")
# Ensure clean base URL without /rest/v1 suffix
SUPABASE_URL: str = re.sub(r"/rest/v1/?$", "", _raw_url).rstrip("/")

SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_KEY:
    # Fallback to anon key if service role is missing during local dev
    SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
