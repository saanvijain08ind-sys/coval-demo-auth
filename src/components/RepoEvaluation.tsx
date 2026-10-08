import React, { useState, useEffect } from 'react';
import { UserRole, Repository, EvaluationJob, CriterionScore } from '../types.ts';
import {
  GitBranch,
  Star,
  Play,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Link,
  Unlink,
  RefreshCw,
  Shield,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface RepoEvaluationProps {
  role: UserRole;
}

export const RepoEvaluation: React.FC<RepoEvaluationProps> = ({ role }) => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [activeJob, setActiveJob] = useState<EvaluationJob | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 10-Agent Standard Breakdown Sample (Section 7.B)
  const criteriaBreakdown: CriterionScore[] = [
    {
      criterion: 'Security',
      score: 94,
      weight: 0.15,
      confidence: 0.88,
      summary: 'No exposed credentials found; AES-256-GCM tokens strictly isolated. SQL queries properly parameterized.',
      status: 'passed'
    },
    {
      criterion: 'Modularity',
      score: 88,
      weight: 0.12,
      confidence: 0.82,
      summary: 'Clean layer decoupling between API routers, cryptographic services, and database clients.',
      status: 'passed'
    },
    {
      criterion: 'Test Coverage',
      score: 82,
      weight: 0.12,
      confidence: 0.79,
      summary: 'Auth routes and encryption roundtrip tested with Argon2id and AES tag verification fixtures.',
      status: 'passed'
    },
    {
      criterion: 'Error Handling',
      score: 86,
      weight: 0.10,
      confidence: 0.84,
      summary: 'HttpExceptions mapped cleanly on OAuth failures; tampered tokens caught safely.',
      status: 'passed'
    },
    {
      criterion: 'Readability',
      score: 90,
      weight: 0.10,
      confidence: 0.89,
      summary: 'Clean Pythonic conventions, typed signatures, and descriptive docstrings.',
      status: 'passed'
    },
    {
      criterion: 'Maintainability',
      score: 85,
      weight: 0.10,
      confidence: 0.81,
      summary: 'Low cyclomatic complexity, zero dead imports in auth module.',
      status: 'passed'
    },
    {
      criterion: 'Documentation',
      score: 84,
      weight: 0.08,
      confidence: 0.85,
      summary: 'Swagger /docs enabled with Pydantic payload models and schema descriptions.',
      status: 'passed'
    },
    {
      criterion: 'Standards Compliance',
      score: 88,
      weight: 0.08,
      confidence: 0.86,
      summary: 'Strict adherence to PEP 8, FastAPI recommendations, and CSPRNG nonce requirements.',
      status: 'passed'
    },
    {
      criterion: 'Performance',
      score: 87,
      weight: 0.08,
      confidence: 0.80,
      summary: 'Asynchronous OAuth redirects and pgvector HNSW indexing under 15ms latency.',
      status: 'passed'
    },
    {
      criterion: 'Innovation',
      score: 80,
      weight: 0.07,
      confidence: 0.75,
      summary: 'Novel dual-identity mapping with authenticated AES-GCM at-rest protection.',
      status: 'passed'
    }
  ];

  const fetchRepos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/repos');
      const data = await res.json();
      if (res.ok) {
        setRepos(data.repos || []);
        if (data.repos?.length && !selectedRepo) {
          setSelectedRepo(data.repos[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, [role]);

  // Handle Connect / Disconnect (Admin Only)
  const handleToggleConnect = async (repo: Repository) => {
    if (role !== 'admin') return;
    const method = repo.connected ? 'DELETE' : 'POST';
    try {
      const res = await fetch(`/api/repos/${repo.id}/connect`, { method });
      if (res.ok) {
        fetchRepos();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Visibility for Employers (Admin Only)
  const handleToggleVisibility = async (repo: Repository) => {
    if (role !== 'admin') return;
    try {
      const res = await fetch(`/api/repos/${repo.id}/toggle-visibility`, { method: 'POST' });
      if (res.ok) {
        fetchRepos();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger 10-Agent Evaluation (Admin Only)
  const handleTriggerEval = async (repo: Repository) => {
    if (role !== 'admin') return;
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository_id: repo.id })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveJob(data);
        pollJob(data.job_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pollJob = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data: EvaluationJob = await res.json();
        setActiveJob(data);
        if (data.status === 'succeeded' || data.status === 'failed') {
          clearInterval(interval);
          fetchRepos();
        }
      } catch {
        clearInterval(interval);
      }
    }, 1000);
  };

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2">
            <span>Org Scoping & Ingestion</span>
            <span aria-hidden="true">·</span>
            <span>Step 2 & 3 Architecture</span>
            <span aria-hidden="true">·</span>
            <span>coval-org Repos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            Repositories & 10-Agent Evaluation
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Per the Coval Invariants: The dashboard only shows org repos that the policy allows.
            Admin connects repositories and triggers evaluations. Employers browse visible repos,
            inspect radar scores, and query the vector store.
          </p>
        </div>
      </div>

      {/* Active Evaluation Job Banner */}
      {activeJob && (
        <div className="border border-indigo-500/50 bg-indigo-950/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-300 text-sm font-semibold">
              <RefreshCw className={`w-4 h-4 ${activeJob.status === 'running' ? 'animate-spin' : ''}`} />
              <span>
                {activeJob.status === 'succeeded'
                  ? 'Evaluation Completed Succeeded'
                  : `Running Evaluation Job: ${activeJob.job_id}`}
              </span>
            </div>
            <span className="font-mono text-xs text-indigo-400">
              Stage: {activeJob.stage} ({Math.round(activeJob.progress * 100)}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-indigo-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(activeJob.progress * 100, 5)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Target Repo ID: {activeJob.repository_id}</span>
            <span>Workers: 10 Parallel LangChain Agents</span>
          </div>
        </div>
      )}

      {/* Repositories Grid & Evaluation Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Repo List Column */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-white">Configured Org Repositories</h2>
            <span className="text-xs font-mono text-slate-400">
              {repos.length} {repos.length === 1 ? 'repo' : 'repos'}
            </span>
          </div>

          <div className="space-y-2">
            {repos.map((repo) => {
              const isSelected = selectedRepo?.id === repo.id;
              return (
                <div
                  key={repo.id}
                  onClick={() => setSelectedRepo(repo)}
                  className={`cursor-pointer border rounded-xl p-4 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-slate-900/90 shadow-sm'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono text-slate-400 mb-0.5">{repo.org}</div>
                      <div className="text-sm font-semibold text-white">{repo.name}</div>
                    </div>
                    {repo.score !== null ? (
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400 font-mono tabular-nums">
                          {repo.score}/100
                        </div>
                        <div className="text-[10px] text-slate-400">Overall</div>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">Unscored</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800/60 font-mono">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-slate-500" />
                      {repo.default_branch}
                    </span>
                    <span>{repo.language}</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      {repo.stars}
                    </span>
                  </div>

                  {/* Admin Controls */}
                  {role === 'admin' && (
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/60 text-xs">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleConnect(repo);
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          repo.connected
                            ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/40'
                            : 'text-slate-400 hover:text-white bg-slate-800'
                        }`}
                      >
                        {repo.connected ? <CheckCircle2 className="w-3 h-3" /> : <Link className="w-3 h-3" />}
                        <span>{repo.connected ? 'Connected' : 'Connect'}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(repo);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-200"
                        title={repo.visible_to_employers ? 'Visible to Employers' : 'Hidden from Employers'}
                      >
                        {repo.visible_to_employers ? (
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Repo Evaluation View */}
        <div className="lg:col-span-2">
          {selectedRepo ? (
            <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
                    <span>{selectedRepo.full_name}</span>
                    <span aria-hidden="true">·</span>
                    <span>SHA: {selectedRepo.head_sha}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>{selectedRepo.name}</span>
                    {selectedRepo.connected && (
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded">
                        Connected
                      </span>
                    )}
                  </h2>
                </div>

                {role === 'admin' ? (
                  <button
                    onClick={() => handleTriggerEval(selectedRepo)}
                    disabled={activeJob?.status === 'running'}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run 10-Agent Evaluation</span>
                  </button>
                ) : (
                  <div className="text-xs text-slate-400 font-mono self-start sm:self-auto">
                    Employer View (Read-Only)
                  </div>
                )}
              </div>

              {/* Scorecard Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Overall Score</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                    {selectedRepo.score ?? '--'}/100
                  </div>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Agents Evaluated</div>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">10/10</div>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Vectors Indexed</div>
                  <div className="text-2xl font-bold font-mono text-indigo-400 tabular-nums">1,482</div>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Confidence</div>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">84%</div>
                </div>
              </div>

              {/* 10-Agent Criterion Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    10-Agent Evaluation Breakdown
                  </h3>
                  <span className="text-xs font-mono text-slate-400">Weights sum to 1.00</span>
                </div>

                <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
                  {criteriaBreakdown.map((crit) => (
                    <div key={crit.criterion} className="p-3.5 hover:bg-slate-900/50 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">{crit.criterion}</span>
                          <span className="text-[11px] font-mono text-slate-400">
                            (weight: {crit.weight.toFixed(2)})
                          </span>
                        </div>
                        <div className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                          {crit.score}/100
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{crit.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-12 text-center text-slate-400 text-sm">
              Select a repository to inspect scores and evaluation telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
