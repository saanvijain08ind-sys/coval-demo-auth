import React, { useState, useEffect } from 'react';
import { UserRole, UserProfile, AuthStatusResponse } from './types.ts';
import { Header } from './components/Header.tsx';
import { AuthHub } from './components/AuthHub.tsx';
import { EncryptionWorkbench } from './components/EncryptionWorkbench.tsx';
import { VectorDbInfra } from './components/VectorDbInfra.tsx';
import { RepoEvaluation } from './components/RepoEvaluation.tsx';
import { CodeExplorer } from './components/CodeExplorer.tsx';
import { TokenizedChat } from './components/TokenizedChat.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('auth');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('admin');
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const fetchAuth = async () => {
    setIsLoadingAuth(true);
    try {
      const res = await fetch('/auth/me');
      const data: AuthStatusResponse = await res.json();
      setAuthStatus(data);
      if (data.authenticated && data.user) {
        setUser(data.user);
        setRole(data.role);
      } else {
        setUser(null);
        setRole('guest');
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    fetchAuth();
  }, []);

  const handleSwitchRole = async (newRole: 'admin' | 'employer') => {
    try {
      const res = await fetch('/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        setRole(newRole);
        if (data.user) {
          setUser(data.user);
        }
        fetchAuth();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
      setUser(null);
      setRole('guest');
      fetchAuth();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div>
        {/* Navigation Top Bar */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          role={role}
          onSwitchRole={handleSwitchRole}
          onLogout={handleLogout}
        />

        {/* Main Content Viewport */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'auth' && (
            <AuthHub
              user={user}
              role={role}
              authStatus={authStatus}
              onRefreshAuth={fetchAuth}
              onSwitchRole={handleSwitchRole}
              onLogout={handleLogout}
            />
          )}

          {activeTab === 'security' && <EncryptionWorkbench />}

          {activeTab === 'vectordb' && <VectorDbInfra />}

          {activeTab === 'chat' && <TokenizedChat />}

          {activeTab === 'repos' && <RepoEvaluation role={role} />}

          {activeTab === 'code' && <CodeExplorer />}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Coval Agentic RAG Platform</span>
            <span aria-hidden="true">·</span>
            <span>Sub-Team 3 Infrastructure & Privacy</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Supabase PostgreSQL</span>
            <span aria-hidden="true">·</span>
            <span>pgvector HNSW</span>
            <span aria-hidden="true">·</span>
            <span>AES-256-GCM Authenticated</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
