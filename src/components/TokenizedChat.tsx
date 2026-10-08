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
  Sparkles
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
      const res = await fetch('/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          repository_id: selectedRepo,
          query: currentQuery
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
          citations: data.citations,
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

  // Run Atomic Concurrency Stress Test
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
    </div>
  );
};
