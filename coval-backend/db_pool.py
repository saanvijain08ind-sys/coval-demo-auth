import os
import logging
from typing import Optional, AsyncGenerator
import asyncpg
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("coval.db_pool")

# Connection string (Supabase Direct URL or Transaction Pooler URL)
# Example: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL", "")

class DatabasePoolManager:
    """
    Manages an asyncpg connection pool tailored for 100+ concurrent requests.
    - Min pool size: 10 connections (pre-warmed)
    - Max pool size: 50–100 connections (dynamic scaling)
    - Timeout: 30s connection acquisition timeout
    """
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def init_pool(self, min_size: int = 10, max_size: int = 50):
        if not DATABASE_URL:
            logger.warning(
                "DATABASE_URL is not set. asyncpg direct connection pool will operate in mock/fallback mode. "
                "In production, configure Supabase Transaction Pooler URL (port 6543)."
            )
            return

        try:
            self.pool = await asyncpg.create_pool(
                dsn=DATABASE_URL,
                min_size=min_size,
                max_size=max_size,
                max_inactive_connection_lifetime=300.0,
                command_timeout=30.0,
                ssl="require"
            )
            logger.info(f"Database connection pool initialized: min_size={min_size}, max_size={max_size}")
        except Exception as e:
            logger.error(f"Failed to connect asyncpg pool: {e}")
            self.pool = None

    async def close_pool(self):
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed successfully.")

    async def acquire(self):
        if not self.pool:
            raise RuntimeError("Database connection pool is not initialized or DATABASE_URL is missing.")
        return self.pool.acquire()

# Singleton pool instance
db_pool = DatabasePoolManager()

async def get_db_connection() -> AsyncGenerator[Optional[asyncpg.Connection], None]:
    """
    FastAPI dependency yielding a connection from the pool.
    Automatically returns the connection to the pool upon request completion.
    """
    if db_pool.pool:
        async with db_pool.pool.acquire() as conn:
            yield conn
    else:
        yield None
