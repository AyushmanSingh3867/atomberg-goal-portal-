"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Search, ChevronDown, ChevronUp, User, Clock, FileText, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTION_COLORS: Record<string, string> = {
  GOAL_UNLOCKED:        "text-red-400    bg-red-400/10 border-red-500/20",
  GOAL_UPDATED:         "text-amber-400  bg-amber-400/10 border-amber-500/20",
  GOAL_RELOCKED:        "text-purple-400 bg-purple-400/10 border-purple-500/20",
  SHEET_APPROVED:       "text-emerald-400 bg-emerald-400/10 border-emerald-500/20",
  SHEET_RETURNED:       "text-amber-400  bg-amber-400/10 border-amber-500/20",
  CYCLE_CREATED:        "text-blue-400   bg-blue-400/10 border-blue-500/20",
  SHARED_GOAL_PUSHED:   "text-indigo-400 bg-indigo-400/10 border-indigo-500/20",
  ORG_HIERARCHY_UPDATED:"text-slate-400   bg-slate-400/10 border-slate-500/20",
};

export default function AuditPage() {
  const [logs, setLogs]         = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter]     = useState("");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await api.admin.getAuditLogs(page, 20);
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLogs();
  }, [page]);

  const filtered = logs.filter((l) =>
    !filter ||
    l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.user?.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen pb-20">
      <div className="mb-10">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <History className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent pb-1">
            Audit Trail
          </h1>
        </div>
        <p className="text-slate-400 text-lg ml-16">
          Comprehensive governance logs with before/after state snapshots.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
        <input
          type="text"
          placeholder="Search actions or actors..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-slate-900/40 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
        />
      </div>

      {/* Log entries */}
      <div className="space-y-3">
        {filtered.map((log) => (
          <div
            key={log.id}
            className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-slate-700"
          >
            {/* Main row */}
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => setExpanded(expanded === log.id ? null : log.id)}
            >
              {/* Action badge */}
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap",
                ACTION_COLORS[log.action] ?? "text-slate-400 bg-slate-400/10 border-slate-500/20"
              )}>
                {log.action.replace(/_/g, ' ')}
              </span>

              {/* User */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-black flex-shrink-0">
                  {log.user?.name?.slice(0, 2).toUpperCase() ?? "??"}
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-bold truncate leading-none mb-1">{log.user?.name}</span>
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">{log.user?.role}</span>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-6 flex-shrink-0">
                <div className="flex flex-col items-end">
                   <span className="text-slate-300 text-[11px] font-medium flex items-center gap-1.5 mb-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-slate-500 text-[10px] font-bold">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-slate-600">
                  {expanded === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* Expanded — before/after diff */}
            {expanded === log.id && log.meta && (
              <div className="border-t border-slate-800 bg-black/20 px-4 pb-5 pt-4 animate-in slide-in-from-top-2 duration-300">
                {log.meta.before && log.meta.after ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Original State
                      </p>
                      <pre className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-[11px] text-slate-300 font-mono overflow-auto leading-relaxed max-h-60">
                        {JSON.stringify(log.meta.before, null, 2)}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> New State
                      </p>
                      <pre className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-[11px] text-slate-300 font-mono overflow-auto leading-relaxed max-h-60">
                        {JSON.stringify(log.meta.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Event Metadata
                    </p>
                    <pre className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 text-[11px] text-slate-300 font-mono overflow-auto leading-relaxed">
                      {JSON.stringify(log.meta, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="py-20 text-center text-slate-600 italic font-medium">
            No audit records found.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-10 px-2">
        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{total} total entries</span>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-6 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Previous
          </button>
          <button
            disabled={logs.length < 20 || page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-6 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
