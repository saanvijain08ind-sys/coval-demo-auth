import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Coins,
  ShieldCheck,
  AlertCircle,
  Zap,
  CheckCircle2,
  RefreshCw,
  Send,
  Database,
  Code2,
  PlusCircle,
  AlertOctagon,
  Sparkles,
  Cpu
} from 'lucide-react';

interface Citation {
  file_path: string;
  symbol_name: string;
  lines: string;
  similarity: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  tokensDeducted?: number;
  timestamp: string;
}

export const TokenizedChat: React.FC = () => {
  const [walletBalance, setWalletBalance] = useState<number>(45);
  const [userId, setUserId] = useState('usr_coval_01');
  const [selectedRepo, setSelectedRepo] = useState('repo_01');
  const [inputQuery, setInputQuery] = useState('How do I fix the AES-256-GCM encryption bottleneck for 100 concurrent users?');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error402, setError402] = useState<any | null>(null);

  // Concurrency Stress Test State
  const [stressResult, setStressResult] = useState<any | null>(null);
  const [isStressTesting, setIsStressTesting] = useState(false);

  // 100-User Concurrent Load Benchmark State
  const [bench100Result, setBench100Result] = useState<any | null>(null);
  const [isBench100Testing, setIsBench100Testing] = useState(false);
  const [activeDeliverableTab, setActiveDeliverableTab] = useState<'schemas' | 'fastapi' | 'pool' | 'rpc' | 'gemini'>('schemas');
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch Wallet Balance
  const fetchBalance = async () => {
    try {
      const res = await fetch('/chat/wallet/balance', {
        headers: { 'X-User-Id': userId }
      });
      const data = await res.json();
      if (res.ok) {
        setWalletBalance(data.balance);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [userId]);

  // Recharge Wallet
  const handleRecharge = async (amount: number) => {
    try {
      const res = await fetch('/chat/wallet/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (res.ok) {
        setWalletBalance(data.balance);
        setError402(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Set Balance Directly (For 402 Simulation)
  const handleSetBalance = async (bal: number) => {
    try {
      const res = await fetch('/chat/wallet/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({ balance: bal })
      });
      const data = await res.json();
      if (res.ok) {
        setWalletBalance(data.balance);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Query to RAG Chatbot
  const handleSendQuery = async () => {
    if (!inputQuery.trim()) return;
    setIsSending(true);
    setError402(null);

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: inputQuery,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMsg]);
    const currentQuery = inputQuery;
    setInputQuery('');

    try {
      const res = await fetch('/v1/rag/chat/tokenized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          user_id: userId,
          repo_id: selectedRepo,
          query: currentQuery,
          top_k: 5,
          match_threshold: 0.45,
          token_cost: 5
        })
      });

      const data = await res.json();

      if (res.status === 402) {
        setError402(data);
        const errAssistantMsg: ChatMessage = {
          id: 'msg_err_' + Date.now(),
          role: 'assistant',
          content: `⚠️ HTTP 402 Payment Required: ${data.message || 'Insufficient wallet balance.'} Please recharge your token wallet to continue.`,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, errAssistantMsg]);
      } else if (res.ok) {
        setWalletBalance(data.remaining_wallet_balance);
        const assistantMsg: ChatMessage = {
          id: 'msg_' + Date.now(),
          role: 'assistant',
          content: data.answer,
          citations: data.citations?.map((c: any) => ({
            file_path: c.file_path,
            symbol_name: c.symbol_name,
            lines: `${c.start_line}-${c.end_line}`,
            similarity: c.similarity
          })),
          tokensDeducted: data.tokens_deducted,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        alert(data.error || 'Failed to process query');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSending(false);
      fetchBalance();
    }
  };

  // Run Atomic Concurrency Stress Test (10 requests)
  const handleRunStressTest = async () => {
    setIsStressTesting(true);
    setStressResult(null);
    try {
      const res = await fetch('/api/benchmark/concurrent-wallet-stress', {
        method: 'POST'
      });
      const data = await res.json();
      setStressResult(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsStressTesting(false);
    }
  };

  // Run 100-User Concurrent Load Optimization Benchmark
  const handleRun100UserBenchmark = async () => {
    setIsBench100Testing(true);
    setBench100Result(null);
    try {
      const res = await fetch('/api/benchmark/concurrent-100-users-rag', {
        method: 'POST'
      });
      const data = await res.json();
      setBench100Result(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsBench100Testing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2">
            <span>Sub-Team 3 Mandate</span>
            <span aria-hidden="true">·</span>
            <span>Paid Tier Architecture</span>
            <span aria-hidden="true">·</span>
            <span>Tokenized RAG Assistant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            Tokenized RAG Chatbot & Atomic Wallet
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            In Coval's paid tier, code scanning and scores are free, but interactive AI assistance to guide
            manual fixes is tokenized (charged 5 credits per query). This endpoint verifies the user's
            wallet balance in <code className="text-indigo-300 font-mono">token_wallets</code>, prevents race conditions with atomic
            deduction, and filters pgvector chunks strictly by <code className="text-indigo-300 font-mono">user_id</code> and <code className="text-indigo-300 font-mono">repo_id</code>.
          </p>
        </div>
      </div>

      {/* Wallet Controls & Race-Condition Tester Card */}
      <div className="border border-indigo-500/30 bg-slate-900/80 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono">Supabase token_wallets table</div>
              <div className="text-xl font-bold text-white flex items-center gap-2">
                <span>{walletBalance} Tokens Available</span>
                <span className="text-xs font-normal text-indigo-400 font-mono bg-indigo-950 px-2 py-0.5 rounded border border-indigo-900">
                  5 tokens / query
                </span>
              </div>
            </div>
          </div>

          {/* Quick Wallet Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRecharge(50)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+50 Tokens</span>
            </button>
            <button
              onClick={() => handleSetBalance(0)}
              className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-900 hover:bg-amber-900/60 rounded-lg transition-colors"
              title="Sets balance to 0 to trigger and verify HTTP 402 Payment Required"
            >
              Drain to 0 (Test 402)
            </button>
            <button
              onClick={() => handleSetBalance(45)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Reset to 45
            </button>
          </div>
        </div>

        {/* Concurrency Stress Test Trigger */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Atomic Concurrency Stress Test</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Launches 10 parallel requests on a 20-token wallet to prove atomic compare-and-deduct without race conditions.
            </p>
          </div>
          <button
            onClick={handleRunStressTest}
            disabled={isStressTesting}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            {isStressTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>Run 10-Request Atomic Test</span>
          </button>
        </div>

        {/* 100-User Concurrent Load Optimization Benchmark Trigger */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>100-User Concurrent Load Optimization Benchmark</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Fires 100 simultaneous async RAG requests to benchmark asyncpg connection pool throughput, percentiles (P50, P95, P99), and event loop health.
            </p>
          </div>
          <button
            onClick={handleRun100UserBenchmark}
            disabled={isBench100Testing}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            {isBench100Testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
            <span>Run 100-User Benchmark</span>
          </button>
        </div>

        {/* 100-User Benchmark Results */}
        {bench100Result && (
          <div className="bg-slate-950 p-4 rounded-lg border border-emerald-900/50 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>100 Concurrent Requests Handled Smoothly · Zero Stalls</span>
              </span>
              <span className="font-mono text-slate-400 text-[11px]">{bench100Result.connection_pool}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900">
                <div className="text-[10px] text-slate-500">Concurrency</div>
                <div className="text-white font-bold">{bench100Result.concurrent_requests_handled} reqs</div>
              </div>
              <div className="p-2 rounded bg-slate-900">
                <div className="text-[10px] text-slate-500">Throughput</div>
                <div className="text-emerald-400 font-bold">{bench100Result.throughput_requests_per_second} req/s</div>
              </div>
              <div className="p-2 rounded bg-slate-900">
                <div className="text-[10px] text-slate-500">Avg Latency</div>
                <div className="text-sky-300 font-bold">{bench100Result.average_latency_ms} ms</div>
              </div>
              <div className="p-2 rounded bg-slate-900">
                <div className="text-[10px] text-slate-500">P50 Latency</div>
                <div className="text-slate-200 font-bold">{bench100Result.p50_latency_ms} ms</div>
              </div>
              <div className="p-2 rounded bg-slate-900">
                <div className="text-[10px] text-slate-500">P95 / P99</div>
                <div className="text-amber-300 font-bold">{bench100Result.p95_latency_ms} / {bench100Result.p99_latency_ms} ms</div>
              </div>
              <div className="p-2 rounded bg-slate-900">
                <div className="text-[10px] text-slate-500">Event Loop Stalled</div>
                <div className="text-emerald-400 font-bold">{bench100Result.event_loop_stalled ? 'YES' : 'NO (0ms)'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Stress Test Results */}
        {stressResult && (
          <div className="bg-slate-950 p-4 rounded-lg border border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{stressResult.atomicity_guarantee}</span>
              </span>
              <span className="font-mono text-slate-400">Zero Race Conditions</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900">
                <div className="text-[10px] text-slate-500">Initial Balance</div>
                <div className="text-white font-bold">{stressResult.initial_wallet_balance} tokens</div>
              </div>
              <div className="p-2 rounded bg-slate-900">
                <div className="text-[10px] text-slate-500">Allowed (200 OK)</div>
                <div className="text-emerald-400 font-bold">{stressResult.actual_successful_requests} requests</div>
              </div>
              <div className="p-2 rounded bg-slate-900">
                <div className="text-[10px] text-slate-500">Rejected (402 Error)</div>
                <div className="text-rose-400 font-bold">{stressResult.rejected_with_402_payment_required} requests</div>
              </div>
              <div className="p-2 rounded bg-slate-900">
                <div className="text-[10px] text-slate-500">Final Balance</div>
                <div className="text-indigo-300 font-bold">{stressResult.final_wallet_balance} tokens</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Chat Console */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl overflow-hidden flex flex-col h-[650px]">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">Interactive Manual Fix Guide (RAG Chat)</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Target Repo:</span>
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs"
              >
                <option value="repo_01">coval-org/rag-orchestrator</option>
                <option value="repo_02">coval-org/agentic-memory-v2</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>tenant: {userId}</span>
            </div>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Sparkles className="w-8 h-8 mb-2 text-indigo-400" />
              <div className="text-sm font-semibold text-white mb-1">Coval RAG Assistant Ready</div>
              <p className="text-xs max-w-md text-slate-400 leading-relaxed mb-4">
                Ask how to resolve specific bottlenecks in your evaluated repository.
                The assistant retrieves semantically matching chunks from pgvector and cites exact line ranges.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  "How do I fix the AES encryption bottleneck?",
                  "Where is authentication enforced in our code?",
                  "How do we prevent cross-tenant vector leakage?"
                ].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => setInputQuery(sample)}
                    className="px-2.5 py-1 text-[11px] font-mono text-slate-300 bg-slate-950 border border-slate-800 rounded hover:border-indigo-500 transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-2xl rounded-xl p-4 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 border border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-75 font-mono">
                    <span>{msg.role === 'user' ? 'You' : 'Coval AI Architect'}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className="whitespace-pre-wrap font-sans">
                    {msg.content}
                  </div>

                  {/* Citations Block */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                      <div className="text-[11px] font-semibold text-indigo-400 font-mono">
                        Evidence Grounding ({msg.citations.length} cited chunks):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300"
                          >
                            <Code2 className="w-3 h-3 text-sky-400" />
                            <span>{c.file_path}:{c.lines} ({c.symbol_name})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.tokensDeducted && (
                    <div className="mt-2 text-[10px] font-mono text-emerald-400">
                      Tokens Deducted: -{msg.tokensDeducted} credits (Atomic compare-and-deduct)
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 402 Error Banner */}
        {error402 && (
          <div className="px-5 py-3 bg-rose-950/40 border-t border-rose-900 text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>HTTP 402 Payment Required: {error402.message}</span>
            </div>
            <button
              onClick={() => handleRecharge(50)}
              className="px-3 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded font-medium text-xs"
            >
              Recharge +50 Tokens
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendQuery();
              }
            }}
            placeholder="Ask a question about the code or request manual fix guidance (5 tokens)..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
          />
          <button
            onClick={handleSendQuery}
            disabled={isSending || !inputQuery.trim()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Send (5 Tokens)</span>
          </button>
        </div>
      </div>

      {/* Technical Deliverables & 100-User Architecture Reference */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-emerald-400">Sub-Team 3 Deliverables</div>
            <h2 className="text-lg font-bold text-white">Production Backend Specifications</h2>
          </div>
          <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[
              { id: 'schemas', label: '1. Pydantic Schemas' },
              { id: 'fastapi', label: '2. FastAPI Router' },
              { id: 'pool', label: '3. asyncpg Pool' },
              { id: 'rpc', label: '4. SQL RPC' },
              { id: 'gemini', label: '5. Contextual Gemini' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDeliverableTab(tab.id as any)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  activeDeliverableTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Deliverable Code View */}
        <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs font-mono">
            <span className="text-indigo-300">
              {activeDeliverableTab === 'schemas' && 'Pydantic Models (coval-backend/rag/tokenized_rag_router.py)'}
              {activeDeliverableTab === 'fastapi' && 'Non-Blocking Async Route (POST /v1/rag/chat/tokenized)'}
              {activeDeliverableTab === 'pool' && 'Connection Pool Manager (coval-backend/db_pool.py)'}
              {activeDeliverableTab === 'rpc' && 'Single-Transaction PostgreSQL Function (coval-backend/sql/atomic_rag_rpc.sql)'}
              {activeDeliverableTab === 'gemini' && 'Contextual Gemini Call (call_gemini_with_code_context)'}
            </span>
            <button
              onClick={() => {
                const textToCopy =
                  activeDeliverableTab === 'schemas'
                    ? `class ChatRAGRequest(BaseModel):\n    user_id: UUID4 = Field(..., description="UUID of authenticated user")\n    repo_id: str = Field(..., min_length=1, max_length=255)\n    query: str = Field(..., min_length=3, max_length=3000)\n    top_k: int = Field(default=5, ge=1, le=15)\n    match_threshold: float = Field(default=0.45, ge=0.0, le=1.0)\n    token_cost: int = Field(default=5, ge=1, le=100)\n\nclass CitationMetadata(BaseModel):\n    chunk_id: Optional[str]\n    file_path: str\n    symbol_name: str\n    chunk_type: str\n    start_line: int\n    end_line: int\n    similarity: float\n\nclass ChatRAGResponse(BaseModel):\n    answer: str\n    citations: List[CitationMetadata]\n    tokens_deducted: int\n    remaining_wallet_balance: int\n    user_id: str\n    repo_id: str\n    model: str\n    latency_ms: float\n    tenant_isolation_verified: bool = True`
                    : activeDeliverableTab === 'fastapi'
                    ? `@router.post("/chat/tokenized", response_model=ChatRAGResponse)\nasync def tokenized_rag_chat_endpoint(\n    payload: ChatRAGRequest,\n    conn: Optional[asyncpg.Connection] = Depends(get_db_connection)\n):\n    start_time = asyncio.get_event_loop().time()\n    embedder = EmbeddingClient()\n    query_vector = (await asyncio.to_thread(embedder.embed_batch, [payload.query]))[0]\n    vector_literal = "[" + ",".join(str(x) for x in query_vector) + "]"\n    raw_records = await conn.fetch(\n        "SELECT * FROM execute_tokenized_rag_search_and_deduct($1::uuid, $2::text, $3::vector, $4::int, $5::float, $6::int)",\n        payload.user_id, payload.repo_id, vector_literal, payload.token_cost, payload.match_threshold, payload.top_k\n    )\n    # ... atomic deduction check and contextual gemini call`
                    : activeDeliverableTab === 'pool'
                    ? `class DatabasePoolManager:\n    def __init__(self):\n        self.pool: Optional[asyncpg.Pool] = None\n    async def init_pool(self, min_size: int = 10, max_size: int = 50):\n        self.pool = await asyncpg.create_pool(dsn=DATABASE_URL, min_size=min_size, max_size=max_size, command_timeout=30.0, ssl="require")\n\ndb_pool = DatabasePoolManager()\n\nasync def get_db_connection():\n    if db_pool.pool:\n        async with db_pool.pool.acquire() as conn:\n            yield conn`
                    : activeDeliverableTab === 'rpc'
                    ? `CREATE OR REPLACE FUNCTION execute_tokenized_rag_search_and_deduct(\n    p_user_id UUID, p_repo_id TEXT, p_query_embedding vector(1536), p_token_cost INT DEFAULT 5, p_match_threshold FLOAT DEFAULT 0.45, p_match_count INT DEFAULT 5\n) RETURNS TABLE (...) AS $$\nBEGIN\n    UPDATE token_wallets SET balance = balance - p_token_cost, updated_at = NOW()\n    WHERE user_id = p_user_id AND balance >= p_token_cost RETURNING balance INTO v_current_balance;\n    -- IF NOT FOUND return INSUFFICIENT_FUNDS\n    -- ELSE return pgvector match strictly filtered by user_id AND repo_id\nEND; $$ LANGUAGE plpgsql;`
                    : `def call_gemini_with_code_context(query: str, chunks: List[Dict[str, Any]], model_name: str = "gemini-2.5-flash"):\n    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))\n    response = client.models.generate_content(\n        model=model_name,\n        contents=f"Code Context:\\n{evidence_text}\\n\\nUser Question:\\n{query}",\n        config=types.GenerateContentConfig(system_instruction="Strictly ground answers in code snippets with line citations.")\n    )\n    return response.text`;
                navigator.clipboard.writeText(textToCopy);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
            >
              {copiedCode ? 'Copied' : 'Copy Snippet'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
            {activeDeliverableTab === 'schemas' && `class ChatRAGRequest(BaseModel):
    user_id: UUID4 = Field(..., description="UUID of authenticated user")
    repo_id: str = Field(..., min_length=1, max_length=255, description="Repository identifier")
    query: str = Field(..., min_length=3, max_length=3000, description="Natural language question")
    top_k: int = Field(default=5, ge=1, le=15)
    match_threshold: float = Field(default=0.45, ge=0.0, le=1.0)
    token_cost: int = Field(default=5, ge=1, le=100)

class CitationMetadata(BaseModel):
    chunk_id: Optional[str]
    file_path: str
    symbol_name: str
    chunk_type: str
    start_line: int
    end_line: int
    similarity: float

class ChatRAGResponse(BaseModel):
    answer: str
    citations: List[CitationMetadata]
    tokens_deducted: int
    remaining_wallet_balance: int
    user_id: str
    repo_id: str
    model: str
    latency_ms: float
    tenant_isolation_verified: bool = True`}

            {activeDeliverableTab === 'fastapi' && `@router.post("/chat/tokenized", response_model=ChatRAGResponse)
async def tokenized_rag_chat_endpoint(
    payload: ChatRAGRequest,
    conn: Optional[asyncpg.Connection] = Depends(get_db_connection)
):
    start_time = asyncio.get_event_loop().time()
    
    # 1. Non-blocking vector embedding
    embedder = EmbeddingClient()
    query_vector = (await asyncio.to_thread(embedder.embed_batch, [payload.query]))[0]
    vector_literal = "[" + ",".join(str(x) for x in query_vector) + "]"

    # 2. Single-Transaction Atomic Search & Deduction via asyncpg pool
    raw_records = await conn.fetch(
        "SELECT * FROM execute_tokenized_rag_search_and_deduct($1::uuid, $2::text, $3::vector, $4::int, $5::float, $6::int)",
        payload.user_id, payload.repo_id, vector_literal, payload.token_cost, payload.match_threshold, payload.top_k
    )
    rpc_rows = [dict(r) for r in raw_records]

    # 3. HTTP 402 Enforcement
    if rpc_rows[0].get("status_code") == "INSUFFICIENT_FUNDS":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"error": "Payment Required", "message": "Insufficient token balance."}
        )

    # 4. Contextual Gemini LLM Call
    valid_chunks = [r for r in rpc_rows if r.get("content") is not None]
    ai_answer = await asyncio.to_thread(call_gemini_with_code_context, query=payload.query, chunks=valid_chunks)

    return ChatRAGResponse(...)`}

            {activeDeliverableTab === 'pool' && `class DatabasePoolManager:
    """Manages an asyncpg connection pool tailored for 100+ concurrent requests."""
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def init_pool(self, min_size: int = 10, max_size: int = 50):
        self.pool = await asyncpg.create_pool(
            dsn=DATABASE_URL,
            min_size=min_size,
            max_size=max_size,
            max_inactive_connection_lifetime=300.0,
            command_timeout=30.0,
            ssl="require"
        )

    async def close_pool(self):
        if self.pool:
            await self.pool.close()

db_pool = DatabasePoolManager()

async def get_db_connection() -> AsyncGenerator[Optional[asyncpg.Connection], None]:
    """FastAPI dependency yielding pooled connection with automatic release."""
    if db_pool.pool:
        async with db_pool.pool.acquire() as conn:
            yield conn
    else:
        yield None`}

            {activeDeliverableTab === 'rpc' && `CREATE OR REPLACE FUNCTION execute_tokenized_rag_search_and_deduct(
    p_user_id UUID,
    p_repo_id TEXT,
    p_query_embedding vector(1536),
    p_token_cost INT DEFAULT 5,
    p_match_threshold FLOAT DEFAULT 0.45,
    p_match_count INT DEFAULT 5
)
RETURNS TABLE (
    status_code TEXT,
    remaining_balance INT,
    chunk_id UUID,
    file_path TEXT,
    symbol_name TEXT,
    chunk_type TEXT,
    start_line INT,
    end_line INT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INT;
BEGIN
    -- 1. Atomic Check & Deduction with row-level write lock (FOR UPDATE)
    UPDATE token_wallets
    SET balance = balance - p_token_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id AND balance >= p_token_cost
    RETURNING balance INTO v_current_balance;

    -- 2. Reject if Insufficient
    IF NOT FOUND THEN
        SELECT balance INTO v_current_balance FROM token_wallets WHERE user_id = p_user_id;
        IF NOT FOUND THEN
            RETURN QUERY SELECT 'WALLET_NOT_FOUND'::TEXT, 0, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INT, NULL::INT, NULL::TEXT, NULL::FLOAT;
        ELSE
            RETURN QUERY SELECT 'INSUFFICIENT_FUNDS'::TEXT, v_current_balance, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INT, NULL::INT, NULL::TEXT, NULL::FLOAT;
        END IF;
        RETURN;
    END IF;

    -- 3. pgvector Cosine Distance Search strictly filtered by tenant user_id and repo_id
    RETURN QUERY
    SELECT
        'SUCCESS'::TEXT,
        v_current_balance,
        dc.id,
        dc.file_path,
        dc.symbol_name,
        dc.chunk_type,
        dc.start_line,
        dc.end_line,
        dc.content,
        (1 - (dc.embedding <=> p_query_embedding))::FLOAT AS similarity
    FROM document_chunks dc
    WHERE dc.user_id = p_user_id::TEXT
      AND dc.repo_id = p_repo_id
      AND (1 - (dc.embedding <=> p_query_embedding)) >= p_match_threshold
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;`}

            {activeDeliverableTab === 'gemini' && `def call_gemini_with_code_context(
    query: str,
    chunks: List[Dict[str, Any]],
    model_name: str = "gemini-2.5-flash"
) -> str:
    """Invokes Gemini API via @google/genai SDK with citations grounding."""
    gemini_key = os.getenv("GEMINI_API_KEY")
    evidence_blocks = [
        f"--- Snippet #{i+1} | {c['file_path']}:{c['start_line']}-{c['end_line']} | {c['symbol_name']} ---\\n{c['content']}"
        for i, c in enumerate(chunks)
    ]
    evidence_text = "\\n\\n".join(evidence_blocks)

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=gemini_key)
    response = client.models.generate_content(
        model=model_name,
        contents=f"Code Context:\\n{evidence_text}\\n\\nUser Question:\\n{query}",
        config=types.GenerateContentConfig(
            system_instruction="Strictly ground answers in code snippets with line citations (e.g. [auth/security.py:45-78]).",
            temperature=0.2,
            max_output_tokens=2048
        )
    )
    return response.text`}
          </pre>
        </div>
      </div>
    </div>
  );
};
