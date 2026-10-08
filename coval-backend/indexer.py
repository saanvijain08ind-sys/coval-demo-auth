#!/usr/bin/env python3
"""
Coval Agentic RAG Platform - Standalone Indexer CLI
Usage:
    python indexer.py --dir ./coval-backend --user-id usr_coval_01 --repo-id repo_01
"""

import sys
import argparse
from auth.database import supabase
from rag.indexer import index_codebase_to_pgvector

def main():
    parser = argparse.ArgumentParser(description="Index cloned codebase into Supabase pgvector with tenant isolation.")
    parser.add_argument("--dir", required=True, help="Path to local repository clone directory")
    parser.add_argument("--user-id", required=True, help="Owner user_id (CRITICAL: prevents cross-tenant access)")
    parser.add_argument("--repo-id", required=True, help="Repository ID for scoping queries")

    args = parser.parse_args()

    print(f"[*] Starting Coval RAG Ingestion Pipeline...")
    print(f"[*] Target Directory: {args.dir}")
    print(f"[*] User ID (Tenant Lock): {args.user_id}")
    print(f"[*] Repo ID: {args.repo_id}")

    try:
        result = index_codebase_to_pgvector(
            repo_directory=args.dir,
            user_id=args.user_id,
            repo_id=args.repo_id,
            supabase_client=supabase
        )
        print("\n[+] Indexing Complete:")
        for k, v in result.items():
            print(f"    - {k}: {v}")
    except Exception as e:
        print(f"\n[!] Ingestion Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
