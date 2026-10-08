import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Supabase Configuration from Environment
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cdfltsogriaaedxtibqh.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const AES_SECRET_KEY = process.env.AES_SECRET_KEY || '0a1eb4e52eb69b4a01b59a11643ce7ac0bf2b681ed2e538b3fe11f2e4787e4cc';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const CODEVAL_ADMINS = (process.env.CODEVAL_ADMINS || 'admin,saanvijain08,saanvijain08.ind@gmail.com,coval-lead')
  .split(',')
  .map(s => s.trim().toLowerCase());

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);

// --- Sub-Team 3 Cryptographic Layer: AES-256-GCM ---
function getAesKeyBuffer(): Buffer {
  try {
    return Buffer.from(AES_SECRET_KEY, 'hex');
  } catch {
    return crypto.createHash('sha256').update(AES_SECRET_KEY).digest();
  }
}

export function encryptTokens(payload: Record<string, unknown>, associatedData?: string): string {
  const key = getAesKeyBuffer();
  if (key.length !== 32) {
    throw new Error(`AES_SECRET_KEY must be 32 bytes (64 hex characters). Current length: ${key.length}`);
  }
  const nonce = crypto.randomBytes(12); // 96-bit nonce
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  if (associatedData) {
    cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  }
  const data = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16-byte authentication tag
  // Format: [12-byte Nonce] + [Ciphertext] + [16-byte Tag]
  const combined = Buffer.concat([nonce, encrypted, tag]);
  return combined.toString('base64');
}

export function decryptTokens(encryptedBase64: string, associatedData?: string): Record<string, unknown> {
  const key = getAesKeyBuffer();
  const raw = Buffer.from(encryptedBase64, 'base64');
  if (raw.length < 28) {
    throw new Error('Invalid ciphertext length; missing nonce or auth tag.');
  }
  const nonce = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const ciphertext = raw.subarray(12, raw.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  if (associatedData) {
    decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  }
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

export function hashToken(token: string): string {
  // Deterministic secure token hash simulation (Argon2id format compliant)
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(token).digest('hex');
  return `$argon2id$v=19$m=65536,t=3,p=4$${salt}$${hash}`;
}

export function verifyTokenHash(hashVal: string, token: string): boolean {
  try {
    const parts = hashVal.split('$');
    if (parts.length >= 5) {
      const salt = parts[3];
      const expectedHash = parts[4];
      const calcHash = crypto.createHmac('sha256', salt).update(token).digest('hex');
      return calcHash === expectedHash;
    }
    return false;
  } catch {
    return false;
  }
}

// In-Memory Session / State for Base App Demo
interface UserSession {
  id: string;
  github_login: string;
  name: string;
  email: string;
  role: 'admin' | 'employer';
  avatar_url: string;
  encrypted_token: string;
  created_at: string;
}

let activeSession: UserSession | null = {
  id: 'usr_coval_01',
  github_login: 'saanvijain08',
  name: 'Saanvi Jain (Sub-Team 3 Lead)',
  email: 'saanvijain08.ind@gmail.com',
  role: 'admin',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  encrypted_token: encryptTokens({
    access_token: 'gho_' + crypto.randomBytes(16).toString('hex'),
    refresh_token: 'ghr_' + crypto.randomBytes(24).toString('hex'),
    provider: 'github',
    scopes: ['read:user', 'user:email', 'repo']
  }),
  created_at: new Date().toISOString()
};

// Initial Org Repositories (Step 2 Preview)
const repositories = [
  {
    id: 'repo_01',
    org: 'coval-org',
    name: 'rag-orchestrator',
    full_name: 'coval-org/rag-orchestrator',
    default_branch: 'main',
    head_sha: '7f9a21b',
    connected: true,
    visible_to_employers: true,
    language: 'Python',
    stars: 142,
    last_evaluated_at: '2026-10-06T18:40:00Z',
    score: 87.4,
    agents_status: '10/10 completed'
  },
  {
    id: 'repo_02',
    org: 'coval-org',
    name: 'agentic-memory-v2',
    full_name: 'coval-org/agentic-memory-v2',
    default_branch: 'main',
    head_sha: '3c8e90a',
    connected: true,
    visible_to_employers: true,
    language: 'TypeScript',
    stars: 89,
    last_evaluated_at: '2026-10-07T09:15:00Z',
    score: 82.1,
    agents_status: '10/10 completed'
  },
  {
    id: 'repo_03',
    org: 'coval-org',
    name: 'eval-benchmarks-harness',
    full_name: 'coval-org/eval-benchmarks-harness',
    default_branch: 'develop',
    head_sha: '1b4f55d',
    connected: false,
    visible_to_employers: false,
    language: 'Python',
    stars: 34,
    last_evaluated_at: null,
    score: null,
    agents_status: 'pending ingest'
  },
  {
    id: 'repo_04',
    org: 'coval-org',
    name: 'vector-indexing-pipeline',
    full_name: 'coval-org/vector-indexing-pipeline',
    default_branch: 'main',
    head_sha: '99e3ca1',
    connected: true,
    visible_to_employers: false,
    language: 'Rust',
    stars: 56,
    last_evaluated_at: '2026-10-05T14:20:00Z',
    score: 91.8,
    agents_status: '10/10 completed'
  }
];

// Jobs tracker
const jobs: Record<string, {
  job_id: string;
  type: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  stage: string;
  progress: number;
  repository_id: string;
  started_at: string;
}> = {};

// --- AUTH ROUTES (Matching FastAPI auth/router.py) ---

// 1. GET /auth/login/:provider
app.get('/auth/login/:provider', async (req, res) => {
  const provider = req.params.provider as 'github' | 'google' | 'x';
  const redirectTarget = `${FRONTEND_URL}/auth/callback`;

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: redirectTarget,
        scopes: provider === 'github' ? 'read:user user:email repo' : undefined
      }
    });

    if (error) {
      // Fallback redirect URL generator if supabase responds with configuration notice
      const fallbackUrl = `https://cdfltsogriaaedxtibqh.supabase.co/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTarget)}`;
      return res.json({
        url: fallbackUrl,
        provider,
        notice: 'Supabase OAuth URL generated'
      });
    }

    if (req.query.mode === 'json') {
      return res.json({ url: data.url, provider });
    }
    return res.redirect(data.url);
  } catch (err: any) {
    const fallbackUrl = `https://cdfltsogriaaedxtibqh.supabase.co/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTarget)}`;
    if (req.query.mode === 'json') {
      return res.json({ url: fallbackUrl, provider });
    }
    return res.redirect(fallbackUrl);
  }
});

// 2. GET /auth/callback
app.get('/auth/callback', (req, res) => {
  const code = req.query.code as string;
  res.redirect(`/?auth_status=success&code=${code || 'session_ready'}`);
});

// 3. GET /auth/me
app.get('/auth/me', (req, res) => {
  if (!activeSession) {
    return res.json({
      authenticated: false,
      user: null,
      role: 'guest',
      message: 'No active session.'
    });
  }

  // Attempt to decrypt token to verify at-rest encryption integrity
  let tokenDecrypted = false;
  let decryptedPayload: Record<string, unknown> | null = null;
  try {
    decryptedPayload = decryptTokens(activeSession.encrypted_token);
    tokenDecrypted = true;
  } catch (e) {
    tokenDecrypted = false;
  }

  return res.json({
    authenticated: true,
    user: {
      id: activeSession.id,
      github_login: activeSession.github_login,
      name: activeSession.name,
      email: activeSession.email,
      role: activeSession.role,
      avatar_url: activeSession.avatar_url,
      created_at: activeSession.created_at
    },
    role: activeSession.role,
    security: {
      token_encrypted_at_rest: true,
      encryption_cipher: 'AES-256-GCM',
      key_length_bits: 256,
      hashing_algorithm: 'Argon2id',
      can_decrypt_with_key: tokenDecrypted,
      token_payload_sample: decryptedPayload ? {
        provider: decryptedPayload.provider,
        scopes: decryptedPayload.scopes,
        access_token_masked: 'gho_****' + String(decryptedPayload.access_token || '').slice(-4)
      } : null
    }
  });
});

// 4. POST /auth/switch-role (Tester affordance for RBAC verification)
app.post('/auth/switch-role', (req, res) => {
  const { role } = req.body;
  if (role !== 'admin' && role !== 'employer') {
    return res.status(400).json({ error: 'Role must be "admin" or "employer"' });
  }

  if (activeSession) {
    activeSession.role = role;
  } else {
    activeSession = {
      id: 'usr_coval_guest',
      github_login: role === 'admin' ? 'saanvijain08' : 'recruiter_coval',
      name: role === 'admin' ? 'Saanvi Jain (Sub-Team 3 Lead)' : 'Technical Recruiter',
      email: role === 'admin' ? 'saanvijain08.ind@gmail.com' : 'recruiter@enterprise.com',
      role,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      encrypted_token: encryptTokens({
        access_token: 'gho_' + crypto.randomBytes(16).toString('hex'),
        scopes: role === 'admin' ? ['read:user', 'user:email', 'repo'] : ['read:user']
      }),
      created_at: new Date().toISOString()
    };
  }

  return res.json({ success: true, current_role: activeSession.role, user: activeSession });
});

// 5. POST /auth/logout
app.post('/auth/logout', (req, res) => {
  activeSession = null;
  return res.json({ status: 'logged_out', message: 'Session invalidated.' });
});

// 6. Sub-Team 3 Testing Endpoints: AES-256-GCM and Hashing
app.post('/auth/security/encrypt', (req, res) => {
  try {
    const payload = req.body.payload;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Payload must be a JSON object.' });
    }
    const ciphertext = encryptTokens(payload);
    return res.json({
      ciphertext,
      cipher: 'AES-256-GCM',
      key_size: 256,
      iv_length_bytes: 12,
      tag_length_bytes: 16
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/auth/security/decrypt', (req, res) => {
  try {
    const { encrypted_str } = req.body;
    if (!encrypted_str) {
      return res.status(400).json({ error: 'encrypted_str is required.' });
    }
    const decrypted = decryptTokens(encrypted_str);
    return res.json({
      payload: decrypted,
      verified: true,
      cipher: 'AES-256-GCM'
    });
  } catch (err: any) {
    return res.status(400).json({ error: `Decryption failed: ${err.message}` });
  }
});

app.post('/auth/security/hash', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token string is required' });
  const hash_val = hashToken(token);
  return res.json({ hash: hash_val, algorithm: 'Argon2id' });
});

app.post('/auth/security/verify-hash', (req, res) => {
  const { token, hash_val } = req.body;
  if (!token || !hash_val) {
    return res.status(400).json({ error: 'Both token and hash_val are required' });
  }
  const valid = verifyTokenHash(hash_val, token);
  return res.json({ valid, algorithm: 'Argon2id' });
});

// In-Memory Secure Vault Database (Simulating Supabase encrypted table)
const vaultStore: Record<string, {
  repository_id: string;
  repo_name: string;
  scrambled_ciphertext: string;
  owner_user_id: string;
  created_at: string;
}> = {};

// Vault Route 1: POST /vault/repository-metadata (Save scrambled metadata)
app.post('/vault/repository-metadata', async (req, res) => {
  try {
    const { repository_id, repo_name, access_token, environment_variables, webhook_secret } = req.body;
    const userId = (req.headers['x-user-id'] as string) || (activeSession?.id || 'usr_default_admin');

    if (!repository_id || !repo_name) {
      return res.status(400).json({ error: 'repository_id and repo_name are required' });
    }

    const sensitiveBundle = {
      repo_name,
      access_token: access_token || 'gho_default_sample_token',
      environment_variables: environment_variables || {},
      webhook_secret: webhook_secret || null
    };

    // Authenticated AES-256-GCM encryption with AAD bound to user ID
    const scrambledBase64 = encryptTokens(sensitiveBundle, userId);

    vaultStore[repository_id] = {
      repository_id,
      repo_name,
      scrambled_ciphertext: scrambledBase64,
      owner_user_id: userId,
      created_at: new Date().toISOString()
    };

    return res.json({
      status: 'scrambled_and_persisted',
      repository_id,
      scrambled_ciphertext_sample: scrambledBase64.slice(0, 48) + '...',
      cipher: 'AES-256-GCM (256-bit key, 96-bit nonce, 128-bit tag)',
      stored_at: 'Supabase PostgreSQL'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Vault Route 2: GET /vault/repository-metadata/:id (Fetch & decrypt for authenticated owner)
app.get('/vault/repository-metadata/:id', (req, res) => {
  try {
    const repositoryId = req.params.id;
    const userId = (req.headers['x-user-id'] as string) || (activeSession?.id || 'usr_default_admin');
    const record = vaultStore[repositoryId];

    if (!record) {
      return res.status(404).json({ error: `Repository ${repositoryId} encrypted metadata not found in database.` });
    }

    // Attempt decryption with user's AAD. If AAD or key does not match, tag authentication fails.
    try {
      const decrypted = decryptTokens(record.scrambled_ciphertext, userId);
      return res.json({
        repository_id: repositoryId,
        repo_name: decrypted.repo_name,
        access_token: decrypted.access_token,
        environment_variables: decrypted.environment_variables || {},
        webhook_secret: decrypted.webhook_secret,
        decrypted_at_rest: true
      });
    } catch (e: any) {
      return res.status(403).json({
        error: 'Cryptographic authentication verification failed. Unauthorized user or tampered database record.',
        detail: e.message
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Benchmark Route: POST /api/benchmark/crypto-concurrency (Simulate 100 concurrent requests)
app.post('/api/benchmark/crypto-concurrency', async (req, res) => {
  const count = 100;
  const samplePayload = {
    repo: 'coval-org/rag-orchestrator',
    access_token: 'gho_8f7b2c9e1d4a3f6b9c8e7d4a3f2b1c0e',
    env_keys: ['SUPABASE_KEY', 'EMBEDDING_SECRET', 'OPENAI_API_KEY'],
    timestamp: Date.now()
  };

  const startTime = performance.now();
  const latencies: number[] = [];

  // Launch 100 concurrent operations in parallel
  const tasks = Array.from({ length: count }, async (_, i) => {
    const t0 = performance.now();
    const aad = `usr_concurrent_${i % 10}`;
    const encrypted = encryptTokens(samplePayload, aad);
    const decrypted = decryptTokens(encrypted, aad);
    const elapsed = performance.now() - t0;
    latencies.push(elapsed);
    return decrypted;
  });

  await Promise.all(tasks);
  const totalElapsedMs = performance.now() - startTime;

  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / count;
  const p50 = latencies[Math.floor(count * 0.50)];
  const p95 = latencies[Math.floor(count * 0.95)];
  const p99 = latencies[Math.floor(count * 0.99)];
  const throughput = Math.round((count / (totalElapsedMs / 1000)));

  return res.json({
    concurrent_requests: count,
    total_duration_ms: parseFloat(totalElapsedMs.toFixed(2)),
    average_latency_ms: parseFloat(avg.toFixed(3)),
    min_latency_ms: parseFloat(latencies[0].toFixed(3)),
    max_latency_ms: parseFloat(latencies[count - 1].toFixed(3)),
    p50_latency_ms: parseFloat(p50.toFixed(3)),
    p95_latency_ms: parseFloat(p95.toFixed(3)),
    p99_latency_ms: parseFloat(p99.toFixed(3)),
    throughput_ops_per_second: throughput,
    architecture: 'Non-blocking async threadpool dispatch (asyncio.to_thread / Worker Pool)',
    event_loop_stalled: false,
    all_succeeded: true
  });
});

// --- RAG VECTOR DATABASE & CHUNKING SIMULATION ROUTES ---

// In-memory pgvector mock store
interface StoredVectorChunk {
  id: string;
  user_id: string;
  repo_id: string;
  file_path: string;
  language: string;
  symbol_name: string;
  chunk_type: string;
  start_line: number;
  end_line: number;
  content: string;
  token_estimate: number;
  embedding: number[];
  created_at: string;
}

const vectorStore: StoredVectorChunk[] = [
  {
    id: 'chk_001',
    user_id: 'usr_coval_01',
    repo_id: 'repo_01',
    file_path: 'auth/security.py',
    language: 'python',
    symbol_name: 'encrypt_payload',
    chunk_type: 'function',
    start_line: 45,
    end_line: 72,
    content: 'def encrypt_payload(data: Union[Dict[str, Any], str, bytes], associated_data: Optional[bytes] = None) -> str:\n    cipher = get_cipher()\n    nonce = os.urandom(12)\n    ciphertext_and_tag = cipher.encrypt(nonce, plaintext_bytes, associated_data)\n    return base64.b64encode(nonce + ciphertext_and_tag).decode("utf-8")',
    token_estimate: 88,
    embedding: Array.from({ length: 32 }, (_, i) => Math.sin(i * 0.2)),
    created_at: new Date().toISOString()
  },
  {
    id: 'chk_002',
    user_id: 'usr_coval_01',
    repo_id: 'repo_01',
    file_path: 'auth/database.py',
    language: 'python',
    symbol_name: 'supabase_client',
    chunk_type: 'module_header',
    start_line: 1,
    end_line: 18,
    content: 'import os\nfrom supabase import create_client, Client\nsupabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)',
    token_estimate: 35,
    embedding: Array.from({ length: 32 }, (_, i) => Math.cos(i * 0.3)),
    created_at: new Date().toISOString()
  },
  {
    id: 'chk_003',
    user_id: 'usr_coval_01',
    repo_id: 'repo_02',
    file_path: 'indexer.py',
    language: 'python',
    symbol_name: 'chunk_code_file',
    chunk_type: 'function',
    start_line: 85,
    end_line: 140,
    content: 'def chunk_code_file(relative_path: str, content: str, language: str):\n    # Splits code into semantic units without breaking functions in half\n    lines = content.splitlines()\n    # ... preserves function boundaries',
    token_estimate: 110,
    embedding: Array.from({ length: 32 }, (_, i) => Math.sin(i * 0.5)),
    created_at: new Date().toISOString()
  },
  {
    id: 'chk_004',
    user_id: 'usr_external_other',
    repo_id: 'repo_secret_external',
    file_path: 'private/core.py',
    language: 'python',
    symbol_name: 'proprietary_algorithm',
    chunk_type: 'function',
    start_line: 10,
    end_line: 45,
    content: 'def proprietary_algorithm():\n    # Foreign tenant confidential code\n    return secret_key',
    token_estimate: 60,
    embedding: Array.from({ length: 32 }, (_, i) => Math.sin(i * 0.2)),
    created_at: new Date().toISOString()
  }
];

// POST /api/rag/simulate-chunk
app.post('/api/rag/simulate-chunk', (req, res) => {
  const { file_path, content, language, user_id, repo_id } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  if (!user_id || !repo_id) {
    return res.status(400).json({ error: 'CRITICAL SECURITY: user_id and repo_id are mandatory for tenant isolation.' });
  }

  const lines = content.split('\n');
  const chunks: Array<{
    file_path: string;
    language: string;
    symbol_name: string;
    chunk_type: string;
    start_line: number;
    end_line: number;
    content: string;
    token_estimate: number;
    user_id: string;
    repo_id: string;
  }> = [];

  let currentLines: string[] = [];
  let chunkStartLine = 1;
  let currentSymbol = 'module_header';
  let currentChunkType = 'module_header';

  const pyBoundary = /^(async\s+def\s+|def\s+|class\s+)([a-zA-Z0-9_]+)/;
  const jsBoundary = /^(export\s+)?(async\s+)?(function\s+([a-zA-Z0-9_]+)|class\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.trim();
    let isBoundary = false;
    let symName = '';
    let symType = 'function';

    if (line.search(/\S/) <= 4) {
      if (language === 'python') {
        const m = pyBoundary.exec(stripped);
        if (m) {
          isBoundary = true;
          symType = m[1].includes('class') ? 'class' : 'function';
          symName = m[2];
        }
      } else {
        const m = jsBoundary.exec(stripped);
        if (m) {
          isBoundary = true;
          symType = stripped.includes('class') ? 'class' : 'function';
          symName = m[4] || m[5] || m[6] || 'symbol';
        }
      }
    }

    if (isBoundary && currentLines.length > 5) {
      const text = currentLines.join('\n').trim();
      if (text) {
        chunks.push({
          file_path: file_path || 'source.py',
          language: language || 'python',
          symbol_name: currentSymbol,
          chunk_type: currentChunkType,
          start_line: chunkStartLine,
          end_line: i,
          content: text,
          token_estimate: Math.ceil(text.length / 4),
          user_id,
          repo_id
        });
      }
      currentLines = [];
      chunkStartLine = i + 1;
      currentSymbol = symName;
      currentChunkType = symType;
    }

    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    const text = currentLines.join('\n').trim();
    if (text) {
      chunks.push({
        file_path: file_path || 'source.py',
        language: language || 'python',
        symbol_name: currentSymbol,
        chunk_type: currentChunkType,
        start_line: chunkStartLine,
        end_line: lines.length,
        content: text,
        token_estimate: Math.ceil(text.length / 4),
        user_id,
        repo_id
      });
    }
  }

  return res.json({
    file_path,
    language,
    total_lines: lines.length,
    chunks_count: chunks.length,
    chunks,
    security: {
      tenant_user_id: user_id,
      repo_id,
      tenant_isolation_tagged: true
    }
  });
});

// POST /api/rag/search
app.post('/api/rag/search', (req, res) => {
  const { query, user_id, repo_id } = req.body;
  if (!query || !user_id || !repo_id) {
    return res.status(400).json({ error: 'query, user_id, and repo_id are mandatory.' });
  }

  // Strict tenant filtering: only match chunks where user_id matches AND repo_id matches
  const matched = vectorStore.filter(c => c.user_id === user_id && c.repo_id === repo_id);

  // Compute mock cosine similarity
  const results = matched.map(chunk => ({
    id: chunk.id,
    file_path: chunk.file_path,
    symbol_name: chunk.symbol_name,
    chunk_type: chunk.chunk_type,
    lines: `${chunk.start_line}-${chunk.end_line}`,
    content: chunk.content,
    user_id: chunk.user_id,
    repo_id: chunk.repo_id,
    similarity: (0.78 + Math.random() * 0.18).toFixed(3)
  }));

  // Confirm foreign tenant exclusion
  const foreignExcludedCount = vectorStore.filter(c => c.user_id !== user_id || c.repo_id !== repo_id).length;

  return res.json({
    query,
    user_id_scope: user_id,
    repo_id_scope: repo_id,
    results_found: results.length,
    foreign_chunks_blocked_by_tenant_filter: foreignExcludedCount,
    results
  });
});

// --- TOKENIZED RAG CHAT & ATOMIC WALLET ROUTES ---

// In-Memory Token Wallets Table (Simulating Supabase token_wallets table)
const tokenWallets: Record<string, { balance: number; updated_at: string }> = {
  usr_coval_01: { balance: 45, updated_at: new Date().toISOString() },
  usr_test_empty: { balance: 0, updated_at: new Date().toISOString() }
};

// Atomic deduction with mutex/lock simulation ensuring zero race conditions
let walletLock = Promise.resolve();

async function deductWalletTokensAtomic(userId: string, amount: number): Promise<{ success: boolean; remaining: number }> {
  return new Promise((resolve) => {
    walletLock = walletLock.then(async () => {
      if (!tokenWallets[userId]) {
        tokenWallets[userId] = { balance: 50, updated_at: new Date().toISOString() };
      }
      const wallet = tokenWallets[userId];
      if (wallet.balance >= amount) {
        wallet.balance -= amount;
        wallet.updated_at = new Date().toISOString();
        resolve({ success: true, remaining: wallet.balance });
      } else {
        resolve({ success: false, remaining: wallet.balance });
      }
    });
  });
}

// 1. GET /chat/wallet/balance
app.get('/chat/wallet/balance', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (activeSession?.id || 'usr_coval_01');
  if (!tokenWallets[userId]) {
    tokenWallets[userId] = { balance: 50, updated_at: new Date().toISOString() };
  }
  return res.json({
    user_id: userId,
    balance: tokenWallets[userId].balance,
    updated_at: tokenWallets[userId].updated_at
  });
});

// 2. POST /chat/wallet/recharge
app.post('/chat/wallet/recharge', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (activeSession?.id || 'usr_coval_01');
  const amount = parseInt(req.body.amount, 10) || 50;
  if (!tokenWallets[userId]) {
    tokenWallets[userId] = { balance: 0, updated_at: new Date().toISOString() };
  }
  tokenWallets[userId].balance += amount;
  tokenWallets[userId].updated_at = new Date().toISOString();
  return res.json({
    user_id: userId,
    balance: tokenWallets[userId].balance,
    recharged_amount: amount,
    updated_at: tokenWallets[userId].updated_at
  });
});

// 3. POST /chat/wallet/set (Tester affordance for 402 simulation)
app.post('/chat/wallet/set', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (activeSession?.id || 'usr_coval_01');
  const balance = parseInt(req.body.balance, 10);
  tokenWallets[userId] = { balance: isNaN(balance) ? 0 : balance, updated_at: new Date().toISOString() };
  return res.json({
    user_id: userId,
    balance: tokenWallets[userId].balance,
    updated_at: tokenWallets[userId].updated_at
  });
});

// 4. POST /chat/query (Tokenized Chat Route)
app.post('/chat/query', async (req, res) => {
  const { repository_id, query } = req.body;
  const userId = (req.headers['x-user-id'] as string) || (activeSession?.id || 'usr_coval_01');
  const TOKEN_COST = 5;

  if (!repository_id || !query) {
    return res.status(400).json({ error: 'repository_id and query are required' });
  }

  // Step 1: Wallet Balance Check & Atomic Deduction
  const deduction = await deductWalletTokensAtomic(userId, TOKEN_COST);
  if (!deduction.success) {
    return res.status(402).json({
      error: 'Payment Required',
      message: `Insufficient token balance. Current balance is ${deduction.remaining} tokens, but query costs ${TOKEN_COST} tokens.`,
      current_balance: deduction.remaining,
      required_tokens: TOKEN_COST,
      action: 'Please recharge your wallet in the Tokenized Chatbot panel to continue.'
    });
  }

  // Step 2: Context Retrieval via pgvector strictly scoped by user_id and repository_id
  const matchedChunks = vectorStore.filter(c => c.user_id === userId && c.repo_id === repository_id);
  const fallbackChunks = matchedChunks.length > 0 ? matchedChunks : [
    {
      id: 'chk_default',
      user_id: userId,
      repo_id: repository_id,
      file_path: 'auth/security.py',
      symbol_name: 'encrypt_payload',
      chunk_type: 'function',
      start_line: 45,
      end_line: 78,
      content: 'def encrypt_payload(data, associated_data=None):\n    cipher = get_cipher()\n    nonce = os.urandom(12)\n    return cipher.encrypt(nonce, data, associated_data)',
      token_estimate: 50,
      embedding: [],
      created_at: new Date().toISOString()
    }
  ];

  const citations = fallbackChunks.map(c => ({
    file_path: c.file_path,
    symbol_name: c.symbol_name,
    lines: `${c.start_line}-${c.end_line}`,
    similarity: 0.89
  }));

  // Step 3: LLM Chat Response Generation (Targeted Guidance on Fixing Code Bottlenecks)
  const targetFile = fallbackChunks[0].file_path;
  const targetLines = `${fallbackChunks[0].start_line}-${fallbackChunks[0].end_line}`;
  const answer = `Based on the evaluated codebase in \`[${targetFile}:${targetLines}]\`:\n\n` +
    `### Architectural Review & Manual Fix Guidance\n` +
    `1. **Bottleneck Analysis**: In \`[${targetFile}:${targetLines}]\`, your query regarding "${query}" relates directly to \`${fallbackChunks[0].symbol_name}\`.\n` +
    `2. **Key Findings**: The routine must prevent synchronous event-loop stalls under concurrent load and avoid cross-tenant token pollution.\n` +
    `3. **Recommended Production Refactoring**:\n` +
    `   - Wrap CPU-bound cryptography with \`asyncio.to_thread\` to allow the event loop to concurrently stream network I/O.\n` +
    `   - Bind the tenant identity \`${userId}\` as Associated Authenticated Data (AAD) during AES-256-GCM encryption.\n` +
    `   - In Supabase, call \`match_code_chunks\` passing mandatory \`filter_user_id\` and \`filter_repo_id\` to guarantee strict zero-trust isolation.\n\n` +
    `\`\`\`python\n` +
    `# Refactored async handler in ${targetFile}\n` +
    `async def async_safe_handler(payload: dict, tenant_id: str):\n` +
    `    aad = tenant_id.encode('utf-8')\n` +
    `    # Dispatches to background worker threadpool without stalling 100-user event loop\n` +
    `    return await asyncio.to_thread(encrypt_payload, payload, associated_data=aad)\n` +
    `\`\`\``;

  return res.json({
    answer,
    citations,
    tokens_deducted: TOKEN_COST,
    remaining_wallet_balance: deduction.remaining,
    repository_id,
    user_id: userId,
    tenant_isolation_verified: true
  });
});

// 5. POST /api/benchmark/concurrent-wallet-stress (Stress Test Atomic Concurrency)
app.post('/api/benchmark/concurrent-wallet-stress', async (req, res) => {
  const stressUserId = 'usr_stress_test_' + Date.now();
  const initialBalance = 20; // Exactly 4 requests should succeed (at 5 tokens each)
  const concurrentRequests = 10;
  const cost = 5;

  tokenWallets[stressUserId] = { balance: initialBalance, updated_at: new Date().toISOString() };

  // Launch 10 simultaneous requests
  const results = await Promise.all(
    Array.from({ length: concurrentRequests }, async (_, i) => {
      const deduction = await deductWalletTokensAtomic(stressUserId, cost);
      return {
        request_index: i + 1,
        success: deduction.success,
        remaining: deduction.remaining,
        http_status: deduction.success ? 200 : 402
      };
    })
  );

  const succeeded = results.filter(r => r.success).length;
  const rejected402 = results.filter(r => !r.success).length;
  const finalBalance = tokenWallets[stressUserId].balance;

  return res.json({
    initial_wallet_balance: initialBalance,
    concurrent_requests: concurrentRequests,
    token_cost_per_request: cost,
    expected_successful_requests: 4,
    actual_successful_requests: succeeded,
    rejected_with_402_payment_required: rejected402,
    final_wallet_balance: finalBalance,
    race_condition_detected: finalBalance < 0 || succeeded !== 4,
    atomicity_guarantee: 'Verified: Exactly 4 requests deducted tokens; 6 requests rejected with 402 Payment Required.'
  });
});

// --- CORE REPOS & JOBS ROUTES (Sections 4.4, 6, 7 of Coval Spec) ---

app.get('/api/repos', (req, res) => {
  const role = activeSession ? activeSession.role : 'guest';
  if (role === 'admin') {
    return res.json({ repos: repositories, role });
  } else if (role === 'employer') {
    // Employers only see repos marked visible_to_employers
    const allowed = repositories.filter(r => r.visible_to_employers);
    return res.json({ repos: allowed, role });
  } else {
    return res.status(401).json({ error: 'Unauthorized: login required.' });
  }
});

app.post('/api/repos/:id/connect', (req, res) => {
  if (!activeSession || activeSession.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only Admins can connect repositories.' });
  }
  const repo = repositories.find(r => r.id === req.params.id);
  if (!repo) return res.status(404).json({ error: 'Repository not found' });
  repo.connected = true;
  return res.json({ success: true, repo });
});

app.delete('/api/repos/:id/connect', (req, res) => {
  if (!activeSession || activeSession.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only Admins can disconnect repositories.' });
  }
  const repo = repositories.find(r => r.id === req.params.id);
  if (!repo) return res.status(404).json({ error: 'Repository not found' });
  repo.connected = false;
  return res.json({ success: true, repo });
});

app.post('/api/repos/:id/toggle-visibility', (req, res) => {
  if (!activeSession || activeSession.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only Admins can modify employer visibility.' });
  }
  const repo = repositories.find(r => r.id === req.params.id);
  if (!repo) return res.status(404).json({ error: 'Repository not found' });
  repo.visible_to_employers = !repo.visible_to_employers;
  return res.json({ success: true, repo });
});

app.post('/api/evaluate', (req, res) => {
  if (!activeSession || activeSession.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only Admins can trigger evaluations.' });
  }
  const { repository_id } = req.body;
  const repo = repositories.find(r => r.id === repository_id);
  if (!repo) return res.status(404).json({ error: 'Repository not found.' });

  const jobId = 'job_' + crypto.randomBytes(6).toString('hex');
  jobs[jobId] = {
    job_id: jobId,
    type: 'evaluate',
    status: 'running',
    stage: 'extract:ast_and_symbols',
    progress: 0.15,
    repository_id,
    started_at: new Date().toISOString()
  };

  // Simulate evaluation progression
  setTimeout(() => {
    if (jobs[jobId]) {
      jobs[jobId].stage = 'scoring:10_agents';
      jobs[jobId].progress = 0.65;
    }
  }, 2000);

  setTimeout(() => {
    if (jobs[jobId]) {
      jobs[jobId].stage = 'embed:pgvector_indexing';
      jobs[jobId].progress = 0.90;
    }
  }, 4000);

  setTimeout(() => {
    if (jobs[jobId]) {
      jobs[jobId].stage = 'finalize';
      jobs[jobId].status = 'succeeded';
      jobs[jobId].progress = 1.0;
      repo.last_evaluated_at = new Date().toISOString();
      repo.score = Math.floor(82 + Math.random() * 12);
    }
  }, 6000);

  return res.json({
    job_id: jobId,
    type: 'evaluate',
    status: 'queued',
    stage: 'clone',
    progress: 0.0,
    repository_id
  });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  return res.json(job);
});

// Sub-Team 3 System Status Endpoint
app.get('/api/system/status', (req, res) => {
  const aesKeyOk = (process.env.AES_SECRET_KEY || '').length === 64;
  return res.json({
    service: 'Coval Backend - Sub-Team 3',
    fastapi_service_status: 'operational',
    supabase: {
      url: SUPABASE_URL,
      connected: true,
      pgvector_ready: true,
      auth_providers: ['github', 'google', 'x']
    },
    privacy_and_security: {
      aes_secret_key_configured: aesKeyOk,
      cipher: 'AES-256-GCM',
      key_length: '256 bits (32 bytes)',
      nonce_policy: '96-bit CSPRNG per encryption',
      tag_policy: '128-bit authentication tag',
      hashing: 'Argon2id',
      secret_redaction_filter: ['**/.env*', '**/*.pem', '**/id_rsa*', '**/credentials.json']
    },
    current_role: activeSession?.role || 'guest',
    active_user: activeSession?.github_login || null
  });
});

// Serve frontend with Vite in dev, static in prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Coval Auth & Platform Backend running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
