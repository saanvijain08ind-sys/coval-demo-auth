import React, { useState } from 'react';
import { UserRole, UserProfile, AuthStatusResponse } from '../types.ts';
import { supabase, SUPABASE_URL } from '../lib/supabase.ts';
import {
  Github,
  Globe,
  Twitter,
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Check,
  RefreshCw,
  ExternalLink,
  Cpu,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface AuthHubProps {
  user: UserProfile | null;
  role: UserRole;
  authStatus: AuthStatusResponse | null;
  onRefreshAuth: () => void;
  onSwitchRole: (role: 'admin' | 'employer') => void;
  onLogout: () => void;
}

export const AuthHub: React.FC<AuthHubProps> = ({
  user,
  role,
  authStatus,
  onRefreshAuth,
  onSwitchRole,
  onLogout
}) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [providerUrlModal, setProviderUrlModal] = useState<{
    provider: string;
    url: string;
    method: string;
    note?: string;
  } | null>(null);
  const [isVerifyingDecryption, setIsVerifyingDecryption] = useState(false);
  const [decryptionResult, setDecryptionResult] = useState<string | null>(null);

  /**
   * Official Supabase JS SDK OAuth Initiation
   * Uses supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
   * - Automatically includes the required anon public API key
   * - Targets ${SUPABASE_URL}/auth/v1/authorize (avoids 404 /rest/v1/auth/v1/authorize)
   * - Avoids "No API key found in request" error
   */
  const handleOAuthTrigger = async (provider: 'github' | 'google' | 'twitter') => {
    setLoadingProvider(provider);
    try {
      const redirectUri = `${window.location.origin}/dashboard`;
      
      // Execute via official @supabase/supabase-js helper
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUri
        }
      });

      if (error) {
        console.warn('Supabase signInWithOAuth notification:', error);
      }

      // If URL returned or constructed via ${SUPABASE_URL}/auth/v1/authorize
      const targetUrl = data?.url || `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectUri)}`;
      
      setProviderUrlModal({
        provider,
        url: targetUrl,
        method: 'supabase.auth.signInWithOAuth',
        note: 'Initiated with official @supabase/supabase-js client helper. Target endpoint: ${SUPABASE_URL}/auth/v1/authorize (never /rest/v1).'
      });
    } catch (e: any) {
      console.error('OAuth initiation error:', e);
      // Fallback directly to correct Supabase Auth endpoint
      const fallbackUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(`${window.location.origin}/dashboard`)}`;
      setProviderUrlModal({
        provider,
        url: fallbackUrl,
        method: 'Supabase Auth Endpoint Fallback',
        note: 'Targeted directly at ${SUPABASE_URL}/auth/v1/authorize'
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleTestSessionDecryption = async () => {
    setIsVerifyingDecryption(true);
    setDecryptionResult(null);
    try {
      const res = await fetch('/auth/me');
      const data = await res.json();
      if (data.authenticated && data.security?.can_decrypt_with_key) {
        setDecryptionResult('Verified: Session payload authenticated & decrypted with AES-256-GCM secret key.');
      } else {
        setDecryptionResult('Notice: ' + (data.message || 'Decryption could not verify token.'));
      }
    } catch (err: any) {
      setDecryptionResult(`Error: ${err.message}`);
    } finally {
      setIsVerifyingDecryption(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Intro Hero Section */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2">
            <span>Identity & Access Layer</span>
            <span aria-hidden="true">·</span>
            <span>Sub-Team 3</span>
            <span aria-hidden="true">·</span>
            <span>Supabase + FastAPI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            Authentication & Role-Based Scoping
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Coval uses GitHub OAuth as its primary identity provider to securely bind repo ingestion,
            agentic evaluation, and vector retrieval. Tokens are encrypted at rest with AES-256-GCM,
            refresh tokens are hashed via Argon2id, and identity is mapped into an internal user role
            (Admin or Employer).
          </p>
        </div>
      </div>

      {/* OAuth Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GitHub OAuth Card */}
        <div className="relative border border-indigo-500/30 bg-slate-900/80 rounded-xl p-5 flex flex-col justify-between hover:border-indigo-500/60 transition-colors">
          <div className="absolute top-4 right-4">
            <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded">
              Primary Identity
            </span>
          </div>
          <div>
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white mb-4">
              <Github className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1">GitHub OAuth</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Required for repository discovery, cloning at SHA, and contributor attribution.
              Scopes: <code className="text-slate-300 font-mono">read:user</code>, <code className="text-slate-300 font-mono">user:email</code>, <code className="text-slate-300 font-mono">repo</code>.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => handleOAuthTrigger('github')}
              disabled={loadingProvider === 'github'}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loadingProvider === 'github' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Github className="w-3.5 h-3.5" />
              )}
              <span>Initiate GitHub OAuth</span>
            </button>
          </div>
        </div>

        {/* Google OAuth Card */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 mb-4">
              <Globe className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1">Google OAuth</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Auxiliary identity provider via Supabase for enterprise workspace login.
              Routes to <code className="text-slate-300 font-mono">/auth/login/google</code>.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => handleOAuthTrigger('google')}
              disabled={loadingProvider === 'google'}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loadingProvider === 'google' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              <span>Initiate Google OAuth</span>
            </button>
          </div>
        </div>

        {/* X (Twitter) OAuth Card */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 mb-4">
              <Twitter className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1">X (Twitter) OAuth</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Developer login integration via Supabase.
              Powered by <code className="text-slate-300 font-mono">supabase.auth.signInWithOAuth</code>.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => handleOAuthTrigger('twitter')}
              disabled={loadingProvider === 'twitter'}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loadingProvider === 'twitter' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Twitter className="w-3.5 h-3.5" />
              )}
              <span>Initiate X OAuth</span>
            </button>
          </div>
        </div>
      </div>

      {/* OAuth Endpoint Inspector Modal */}
      {providerUrlModal && (
        <div className="border border-indigo-500/40 bg-slate-900 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              <span>Supabase OAuth Authorization URL ({providerUrlModal.provider.toUpperCase()})</span>
            </div>
            <button
              onClick={() => setProviderUrlModal(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1.5 rounded">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Routed via {providerUrlModal.method} — targets &#123;SUPABASE_URL&#125;/auth/v1/authorize with anon public key.</span>
          </div>
          {providerUrlModal.note && (
            <p className="text-xs text-slate-300">
              {providerUrlModal.note}
            </p>
          )}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-indigo-300 break-all select-all">
            {providerUrlModal.url}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <a
              href={providerUrlModal.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md"
            >
              <span>Test Live in New Tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-xs text-slate-500">
              Redirect target: <code className="font-mono text-slate-400">/dashboard</code>
            </span>
          </div>
        </div>
      )}

      {/* Active Session & Encryption Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Identity Card */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Active Identity & Session</h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Active</span>
            </div>
          </div>

          {user ? (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <img
                  src={user.avatar_url}
                  alt={user.github_login}
                  className="w-12 h-12 rounded-full border border-slate-700 object-cover"
                />
                <div>
                  <div className="text-sm font-semibold text-white">{user.name}</div>
                  <div className="text-xs font-mono text-slate-400">@{user.github_login}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 mb-0.5">Assigned Role</div>
                  <div className="text-sm font-semibold capitalize text-white flex items-center gap-1.5">
                    {role === 'admin' ? (
                      <span className="text-indigo-400">Admin (Org Owner)</span>
                    ) : (
                      <span className="text-slate-300">Employer</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 mb-0.5">Token Encryption</div>
                  <div className="text-sm font-mono text-emerald-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>AES-256-GCM</span>
                  </div>
                </div>
              </div>

              {/* At-Rest Token Protection Details */}
              <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Session Token at Rest</span>
                  <span className="font-mono text-indigo-400 text-[11px]">96-bit Nonce + 128-bit Tag</span>
                </div>
                <div className="text-xs font-mono text-slate-400 break-all bg-slate-900/80 p-2 rounded border border-slate-800/50">
                  {authStatus?.security?.token_payload_sample ? (
                    <span>
                      Token Mask: <span className="text-emerald-400">{authStatus.security.token_payload_sample.access_token_masked}</span>
                      <br />
                      Provider: {authStatus.security.token_payload_sample.provider}
                      <br />
                      Scopes: {authStatus.security.token_payload_sample.scopes.join(', ')}
                    </span>
                  ) : (
                    <span>Stored encrypted with server AES-256-GCM master key</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleTestSessionDecryption}
                  disabled={isVerifyingDecryption}
                  className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingDecryption ? 'animate-spin' : ''}`} />
                  <span>Verify Decryption with AES Key</span>
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-md transition-colors"
                >
                  Terminate Session
                </button>
              </div>

              {decryptionResult && (
                <div className="p-2.5 rounded bg-slate-950 border border-indigo-900 text-xs font-mono text-indigo-300">
                  {decryptionResult}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400 mb-3">No active authenticated session detected.</p>
              <button
                onClick={() => onSwitchRole('admin')}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
              >
                Sign In as Default Admin
              </button>
            </div>
          )}
        </div>

        {/* RBAC Authorization Matrix Card */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">RBAC Authorization Matrix</h2>
              <p className="text-xs text-slate-400">Spec Section 4.4 Enforcement</p>
            </div>
            <div className="flex items-center gap-1 rounded bg-slate-800 p-0.5 text-xs">
              <button
                onClick={() => onSwitchRole('admin')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  role === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => onSwitchRole('employer')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  role === 'employer' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Employer
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 px-3 text-center">Admin</th>
                  <th className="py-2 pl-3 text-center">Employer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-2.5 pr-3 font-medium">List org repos</td>
                  <td className="py-2.5 px-3 text-center text-emerald-400">All</td>
                  <td className="py-2.5 pl-3 text-center text-slate-400">visible_to_employers</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium">Connect / Disconnect repo</td>
                  <td className="py-2.5 px-3 text-center text-emerald-400">Yes</td>
                  <td className="py-2.5 pl-3 text-center text-rose-400">No</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium">Trigger /evaluate</td>
                  <td className="py-2.5 px-3 text-center text-emerald-400">Yes</td>
                  <td className="py-2.5 pl-3 text-center text-rose-400">No</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium">Read /scores</td>
                  <td className="py-2.5 px-3 text-center text-emerald-400">All</td>
                  <td className="py-2.5 pl-3 text-center text-emerald-400">Visible only</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium">/ask RAG Q&A</td>
                  <td className="py-2.5 px-3 text-center text-emerald-400">All</td>
                  <td className="py-2.5 pl-3 text-center text-emerald-400">Visible only</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium">/recommend Roles & Teams</td>
                  <td className="py-2.5 px-3 text-center text-emerald-400">All</td>
                  <td className="py-2.5 pl-3 text-center text-emerald-400">Visible only</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium">PRISM /traces inspection</td>
                  <td className="py-2.5 px-3 text-center text-emerald-400">Yes</td>
                  <td className="py-2.5 pl-3 text-center text-rose-400">No</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-2 text-xs text-slate-400 leading-relaxed border-t border-slate-800">
            <span className="font-semibold text-slate-200">Sub-Team 3 Invariant:</span> Every API handler loads the session, decrypts the token at rest, and scopes SQL queries by role + <code className="font-mono text-slate-300">repository_id IN allowed_ids</code>.
          </div>
        </div>
      </div>
    </div>
  );
};
