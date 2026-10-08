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
  EyeOff
} from 'lucide-react';

export const EncryptionWorkbench: React.FC = () => {
  // AES-256-GCM State
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
          key_size: data.key_size,
          iv_length_bytes: data.iv_length_bytes,
          tag_length_bytes: data.tag_length_bytes
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
    // Alter characters in the middle of ciphertext
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

  // Secret file check logic
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
            <span>Privacy & Cryptography Layer</span>
            <span aria-hidden="true">·</span>
            <span>AES-256-GCM + Argon2id</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            At-Rest Encryption & Privacy Workbench
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Per the Coval Architecture Specification (Section 4.3 & 11), OAuth access tokens and credentials
            must never be stored in plaintext. They are encrypted using authenticated AES-256-GCM with a 96-bit
            CSPRNG nonce and 128-bit authentication tag. Refresh tokens are hashed via Argon2id.
          </p>
        </div>
      </div>

      {/* AES-256-GCM Interactive Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Encrypt Card */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">AES-256-GCM Token Encryption</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">auth/security.py</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Input Token Payload (JSON Dictionary):
            </label>
            <textarea
              value={encryptInput}
              onChange={(e) => setEncryptInput(e.target.value)}
              rows={7}
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
                Key: {encryptMeta.key_size} bits · IV: {encryptMeta.iv_length_bytes}B · Tag: {encryptMeta.tag_length_bytes}B
              </span>
            )}
          </div>

          {encryptedOutput && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Authenticated Ciphertext (Base64 [Nonce + Ciphertext + Tag]):</span>
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

        {/* Decrypt Card */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">AES-256-GCM Token Decryption</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">auth/security.py</span>
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
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Authenticated & Decrypted Payload:</span>
                </span>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                {decryptedOutput}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Argon2id Token Hashing & Secret Redaction Section */}
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

          <p className="text-xs text-slate-400 leading-relaxed">
            Refresh tokens are stored as irreversible cryptographic hashes in PostgreSQL.
            When a client attempts token rotation, the hash is validated with memory-hard parameters.
          </p>

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
                          <span>Valid: Refresh token matches stored Argon2id hash.</span>
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

          <p className="text-xs text-slate-400 leading-relaxed">
            Security Invariant: LLM prompt inputs and vector embeddings must NEVER contain secrets.
            The ingestion module scans repo paths and redacts private keys, env files, and credentials
            prior to chunking and vector storage.
          </p>

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

            {/* Quick Test Presets */}
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

            {/* Scan Verdict */}
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
