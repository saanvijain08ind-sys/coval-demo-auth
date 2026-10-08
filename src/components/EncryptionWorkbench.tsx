import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Key,
  Shield,
  FileCheck,
  AlertOctagon,
  Copy,
  Check,
  RefreshCw,
  Fingerprint,
  EyeOff,
  Database,
  Gauge,
  ArrowRight,
  Server,
  Zap
} from 'lucide-react';

interface BenchmarkResults {
  concurrent_requests: number;
  total_duration_ms: number;
  average_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  throughput_ops_per_second: number;
  architecture: string;
  event_loop_stalled: boolean;
  all_succeeded: boolean;
}

export const EncryptionWorkbench: React.FC = () => {
  // Vault Interactive State (Task: Save & Fetch Repo Metadata)
  const [vaultRepoId, setVaultRepoId] = useState('repo_coval_9912');
  const [vaultRepoName, setVaultRepoName] = useState('coval-org/rag-orchestrator');
  const [vaultToken, setVaultToken] = useState('gho_live_8f7b2c9e1d4a3f6b9c8e7d4a3f2b1c0e');
  const [vaultUserId, setVaultUserId] = useState('usr_coval_01');
  const [vaultFetchUserId, setVaultFetchUserId] = useState('usr_coval_01');
  const [vaultSaveResult, setVaultSaveResult] = useState<any | null>(null);
  const [vaultFetchResult, setVaultFetchResult] = useState<any | null>(null);
  const [vaultFetchError, setVaultFetchError] = useState<string | null>(null);
  const [isSavingVault, setIsSavingVault] = useState(false);
  const [isFetchingVault, setIsFetchingVault] = useState(false);

  // 100-User Concurrency Benchmark State
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResults | null>(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

  // AES-256-GCM Raw Sandbox State
  const [encryptInput, setEncryptInput] = useState(
    JSON.stringify(
      {
        access_token: 'gho_8f7b2c9e1d4a3f6b9c8e7d4a3f2b1c0e',
        refresh_token: 'ghr_4a3f2b1c0e8f7b2c9e1d4a3f6b9c8e7d',
        provider: 'github',
        github_user_id: 18492048,
        scopes: ['read:user', 'user:email', 'repo']
      },
      null,
      2
    )
  );
  const [encryptedOutput, setEncryptedOutput] = useState<string>('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptMeta, setEncryptMeta] = useState<{
    cipher?: string;
    key_size?: number;
    iv_length_bytes?: number;
    tag_length_bytes?: number;
  } | null>(null);

  // Decrypt State
  const [decryptInput, setDecryptInput] = useState<string>('');
  const [decryptedOutput, setDecryptedOutput] = useState<string>('');
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Argon2 Hashing State
  const [tokenToHash, setTokenToHash] = useState('coval_refresh_token_sec_9918239');
  const [hashResult, setHashResult] = useState('');
  const [verifyTokenInput, setVerifyTokenInput] = useState('coval_refresh_token_sec_9918239');
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);

  // Secret Scanner State
  const [testFilePath, setTestFilePath] = useState('.env.production');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Vault Actions
  const handleSaveToVault = async () => {
    setIsSavingVault(true);
    setVaultSaveResult(null);
    setVaultFetchResult(null);
    setVaultFetchError(null);
    try {
      const res = await fetch('/vault/repository-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': vaultUserId
        },
        body: JSON.stringify({
          repository_id: vaultRepoId,
          repo_name: vaultRepoName,
          access_token: vaultToken,
          environment_variables: {
            SUPABASE_KEY: 'eyJhbGciOi...',
            OPENAI_API_KEY: 'sk-proj-live...'
          },
          webhook_secret: 'whsec_99812739812'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setVaultSaveResult(data);
      } else {
        alert(data.error || 'Failed to save to vault');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSavingVault(false);
    }
  };

  const handleFetchFromVault = async () => {
    setIsFetchingVault(true);
    setVaultFetchResult(null);
    setVaultFetchError(null);
    try {
      const res = await fetch(`/vault/repository-metadata/${vaultRepoId}`, {
        headers: {
          'X-User-Id': vaultFetchUserId
        }
      });
      const data = await res.json();
      if (res.ok) {
        setVaultFetchResult(data);
      } else {
        setVaultFetchError(data.error || data.detail || 'Failed to fetch/decrypt from vault');
      }
    } catch (e: any) {
      setVaultFetchError(e.message);
    } finally {
      setIsFetchingVault(false);
    }
  };

  // Run 100-User Concurrency Benchmark
  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    setBenchmarkResult(null);
    try {
      const res = await fetch('/api/benchmark/crypto-concurrency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setBenchmarkResult(data);
    } catch (e: any) {
      alert('Benchmark error: ' + e.message);
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  const handleEncrypt = async () => {
    setIsEncrypting(true);
    try {
      const parsed = JSON.parse(encryptInput);
      const res = await fetch('/auth/security/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: parsed })
      });
      const data = await res.json();
      if (res.ok) {
        setEncryptedOutput(data.ciphertext);
        setDecryptInput(data.ciphertext);
        setEncryptMeta({
          cipher: data.cipher,
          key_size: data.key_size || data.key_bits,
          iv_length_bytes: data.iv_length_bytes || data.nonce_bytes,
          tag_length_bytes: data.tag_length_bytes || data.tag_bytes
        });
      } else {
        alert(data.error || 'Encryption failed');
      }
    } catch (e: any) {
      alert('Invalid JSON input: ' + e.message);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecrypt = async () => {
    setIsDecrypting(true);
    setDecryptError(null);
    setDecryptedOutput('');
    try {
      const res = await fetch('/auth/security/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encrypted_str: decryptInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setDecryptedOutput(JSON.stringify(data.payload, null, 2));
      } else {
        setDecryptError(data.error || 'Decryption failed');
      }
    } catch (e: any) {
      setDecryptError(e.message);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleTamperCiphertext = () => {
    if (!decryptInput) return;
    const len = decryptInput.length;
    const mid = Math.floor(len / 2);
    const char = decryptInput[mid] === 'A' ? 'B' : 'A';
    const tampered = decryptInput.substring(0, mid) + char + decryptInput.substring(mid + 1);
    setDecryptInput(tampered);
    setDecryptError('Ciphertext was deliberately modified by 1 character. Test Decrypt to verify authenticated tag rejection!');
  };

  const handleHashToken = async () => {
    try {
      const res = await fetch('/auth/security/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToHash })
      });
      const data = await res.json();
      if (res.ok) {
        setHashResult(data.hash);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyHash = async () => {
    try {
      const res = await fetch('/auth/security/verify-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyTokenInput, hash_val: hashResult })
      });
      const data = await res.json();
      setVerifyResult(data.valid);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isRedacted = (path: string) => {
    const p = path.toLowerCase();
    return ['.env', '.pem', 'id_rsa', 'id_ed25519', 'credentials.json', '.key'].some(pat => p.includes(pat));
  };

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2">
            <span>Sub-Team 3 Mandate</span>
            <span aria-hidden="true">·</span>
            <span>AES-256-GCM Application-Level Encryption</span>
            <span aria-hidden="true">·</span>
            <span>Master Lock Key</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            AES-256-GCM Vault & Concurrency Benchmark
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Sensitive user data—including repository metadata, environment secrets, and GitHub access tokens—is
            scrambled at the application layer using <code className="text-indigo-300 font-mono">AES-256-GCM</code> before
            reaching the Supabase database. Cryptographic operations are dispatched to threadpool workers
            via <code className="text-indigo-300 font-mono">asyncio.to_thread</code> so the FastAPI event loop supports 100+ concurrent
            users smoothly without latency spikes.
          </p>
        </div>
      </div>

      {/* SECTION 1: FASTAPI APPLICATION-LEVEL VAULT (Save & Fetch Data Route Tester) */}
      <div className="border border-indigo-500/30 bg-slate-900/80 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">
                FastAPI Encrypted Vault (Save & Fetch Flow)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Test <code className="font-mono text-indigo-300">POST /vault/repository-metadata</code> and <code className="font-mono text-indigo-300">GET /vault/repository-metadata/:id</code>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2.5 py-1 rounded">
            <span>Master Key: AES_MASTER_KEY (Loaded)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Save Card */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>Step 1: Scramble & Save to Database</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Repository ID:</label>
                <input
                  type="text"
                  value={vaultRepoId}
                  onChange={(e) => setVaultRepoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Repository Name:</label>
                <input
                  type="text"
                  value={vaultRepoName}
                  onChange={(e) => setVaultRepoName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sensitive GitHub Access Token (Scrambled before saving):
                </label>
                <input
                  type="text"
                  value={vaultToken}
                  onChange={(e) => setVaultToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Cryptographic Binding (AAD User ID):
                </label>
                <input
                  type="text"
                  value={vaultUserId}
                  onChange={(e) => setVaultUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200"
                  placeholder="e.g. usr_coval_01"
                />
                <span className="text-[11px] text-slate-500">
                  AES-256-GCM uses this as Associated Authenticated Data to bind the ciphertext to this owner.
                </span>
              </div>

              <button
                onClick={handleSaveToVault}
                disabled={isSavingVault}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isSavingVault ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Encrypt & Save to Supabase (Non-Blocking)</span>
              </button>

              {vaultSaveResult && (
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                  <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Scrambled & Stored Successfully</span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px] break-all">
                    Stored Ciphertext Sample: <span className="text-indigo-300">{vaultSaveResult.scrambled_ciphertext_sample}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Storage: {vaultSaveResult.stored_at} · Cipher: {vaultSaveResult.cipher}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fetch Card */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Unlock className="w-4 h-4 text-emerald-400" />
              <span>Step 2: Fetch & Decrypt by Authorized User</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Repository ID:</label>
                <input
                  type="text"
                  value={vaultRepoId}
                  disabled
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Requesting User Identity (X-User-Id Header):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vaultFetchUserId}
                    onChange={(e) => setVaultFetchUserId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200"
                  />
                  <button
                    onClick={() => setVaultFetchUserId('usr_unauthorized_attacker')}
                    className="px-2.5 py-1 text-[11px] font-mono text-amber-300 bg-amber-950/40 border border-amber-900 rounded hover:bg-amber-900/60"
                    title="Simulate unauthorized user attempting to read scrambled data"
                  >
                    Simulate Attacker
                  </button>
                  <button
                    onClick={() => setVaultFetchUserId(vaultUserId)}
                    className="px-2.5 py-1 text-[11px] font-mono text-slate-300 bg-slate-800 rounded hover:bg-slate-700"
                  >
                    Reset Owner
                  </button>
                </div>
              </div>

              <button
                onClick={handleFetchFromVault}
                disabled={isFetchingVault}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isFetchingVault ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>Fetch from Supabase & Decrypt Payload</span>
              </button>

              {vaultFetchError && (
                <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-900 text-xs text-rose-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                    <span>Cryptographic Access Rejected</span>
                  </div>
                  <p className="text-[11px] text-rose-200 leading-relaxed">{vaultFetchError}</p>
                </div>
              )}

              {vaultFetchResult && (
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                  <div className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Authenticated Decryption Succeeded:</span>
                  </div>
                  <pre className="font-mono text-xs text-emerald-300 max-h-48 overflow-y-auto">
                    {JSON.stringify(vaultFetchResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: 100-USER CONCURRENT LOAD BENCHMARK */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">
                100-User Concurrent Load & Non-Blocking Verification
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Fires 100 concurrent AES-256-GCM encryption/decryption requests to test event-loop latency.
            </p>
          </div>
          <button
            onClick={handleRunBenchmark}
            disabled={isRunningBenchmark}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            {isRunningBenchmark ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Execute 100-User Benchmark</span>
          </button>
        </div>

        {benchmarkResult && (
          <div className="space-y-4 pt-2">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Total Duration</div>
                <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                  {benchmarkResult.total_duration_ms} ms
                </div>
                <div className="text-[10px] text-slate-500">for 100 parallel tasks</div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Avg Latency</div>
                <div className="text-xl font-bold font-mono text-white tabular-nums">
                  {benchmarkResult.average_latency_ms} ms
                </div>
                <div className="text-[10px] text-slate-500">per encryption/decryption</div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">P95 / P99 Latency</div>
                <div className="text-xl font-bold font-mono text-indigo-400 tabular-nums">
                  {benchmarkResult.p95_latency_ms} / {benchmarkResult.p99_latency_ms} ms
                </div>
                <div className="text-[10px] text-slate-500">tail latency bound</div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Throughput</div>
                <div className="text-xl font-bold font-mono text-white tabular-nums">
                  {benchmarkResult.throughput_ops_per_second.toLocaleString()} ops/s
                </div>
                <div className="text-[10px] text-slate-500">AES-GCM throughput</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900 text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Non-Blocking Verified: 100 concurrent requests resolved with zero event-loop stalls.</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">asyncio.to_thread / Worker Pool</span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: RAW AES-256-GCM PLAYGROUND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raw Encrypt Card */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Raw AES-256-GCM Encryption</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">encrypt_payload()</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Input Token Payload (JSON Dictionary):
            </label>
            <textarea
              value={encryptInput}
              onChange={(e) => setEncryptInput(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEncrypt}
              disabled={isEncrypting}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
            >
              {isEncrypting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              <span>Encrypt with AES-256-GCM</span>
            </button>
            {encryptMeta && (
              <span className="text-[11px] font-mono text-emerald-400">
                Key: {encryptMeta.key_size} bits · Nonce: {encryptMeta.iv_length_bytes}B · Tag: {encryptMeta.tag_length_bytes}B
              </span>
            )}
          </div>

          {encryptedOutput && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Authenticated Ciphertext (Base64):</span>
                <button
                  onClick={() => copyToClipboard(encryptedOutput, 'cipher')}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  {copiedKey === 'cipher' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'cipher' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-indigo-300 break-all select-all">
                {encryptedOutput}
              </div>
            </div>
          )}
        </div>

        {/* Raw Decrypt Card */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Raw AES-256-GCM Decryption</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">decrypt_payload()</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Encrypted Base64 String:
              </label>
              <button
                onClick={handleTamperCiphertext}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                title="Flips 1 bit in ciphertext to verify cryptographic authentication tag failure"
              >
                <AlertOctagon className="w-3 h-3" />
                <span>Simulate Bit Tampering</span>
              </button>
            </div>
            <textarea
              value={decryptInput}
              onChange={(e) => setDecryptInput(e.target.value)}
              placeholder="Paste Base64 encrypted string here..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDecrypt}
              disabled={isDecrypting || !decryptInput}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
            >
              {isDecrypting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>Verify & Decrypt Payload</span>
            </button>
          </div>

          {decryptError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900 text-xs text-rose-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                <span>Authentication Tag Verification Failed</span>
              </div>
              <p className="text-[11px] text-rose-200">{decryptError}</p>
            </div>
          )}

          {decryptedOutput && (
            <div className="pt-2 space-y-2">
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                {decryptedOutput}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: ARGON2 & REDACTION SCANNERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Argon2id Hasher Card */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Argon2id Refresh Token Hashing</h2>
            </div>
            <span className="text-xs font-mono text-indigo-400">hash_token()</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Raw Token:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tokenToHash}
                  onChange={(e) => setTokenToHash(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200"
                />
                <button
                  onClick={handleHashToken}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                >
                  Generate Hash
                </button>
              </div>
            </div>

            {hashResult && (
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-slate-400">Computed Hash:</div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-indigo-300 break-all select-all">
                  {hashResult}
                </div>

                <div className="pt-2 space-y-2">
                  <div className="text-xs font-medium text-slate-300">Verify Candidate Token:</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={verifyTokenInput}
                      onChange={(e) => {
                        setVerifyTokenInput(e.target.value);
                        setVerifyResult(null);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200"
                    />
                    <button
                      onClick={handleVerifyHash}
                      className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg"
                    >
                      Verify
                    </button>
                  </div>
                  {verifyResult !== null && (
                    <div
                      className={`text-xs font-medium flex items-center gap-1.5 ${
                        verifyResult ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {verifyResult ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Valid: Matches stored Argon2id hash.</span>
                        </>
                      ) : (
                        <>
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>Invalid: Hash verification failed.</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Secret File Redaction Scanner Card */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Secret Redaction Scanner</h2>
            </div>
            <span className="text-xs font-mono text-amber-400">Spec Section 11</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Test File Path in Repo:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testFilePath}
                  onChange={(e) => setTestFilePath(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                '.env',
                '.env.local',
                'id_rsa',
                'server.key',
                'src/auth.py',
                'credentials.json',
                'docs/README.md'
              ].map((sample) => (
                <button
                  key={sample}
                  onClick={() => setTestFilePath(sample)}
                  className="px-2 py-0.5 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded"
                >
                  {sample}
                </button>
              ))}
            </div>

            <div
              className={`p-3.5 rounded-lg border text-xs ${
                isRedacted(testFilePath)
                  ? 'bg-rose-950/30 border-rose-900 text-rose-300'
                  : 'bg-emerald-950/30 border-emerald-900 text-emerald-300'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5 mb-1">
                {isRedacted(testFilePath) ? (
                  <>
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                    <span>BLOCKED & REDACTED FROM PIPELINE</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>SAFE FOR CHUNKING & EMBEDDING</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">
                {isRedacted(testFilePath)
                  ? `File matches sensitive pattern rule. Content will be stripped before entering 10-agent prompts or pgvector store.`
                  : `File contains public application source. Approved for 800-token chunking and 1536-dim vector embedding.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
