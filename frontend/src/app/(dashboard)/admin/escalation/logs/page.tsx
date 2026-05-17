"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { History } from "lucide-react";

const TRIGGER_COLORS: Record<string, string> = {
  goal_not_submitted: "text-amber-400 bg-amber-400/10",
  goal_not_approved:  "text-red-400   bg-red-400/10",
  checkin_missed:     "text-blue-400  bg-blue-400/10",
};

const TRIGGER_LABELS: Record<string, string> = {
  goal_not_submitted: "Goal Not Submitted",
  goal_not_approved:  "Goal Not Approved",
  checkin_missed:     "Check-in Missed",
};

export default function EscalationLogsPage() {
  const [logs,     setLogs]     = useState<any[]>([]);
  const [filter,   setFilter]   = useState<"all"|"active"|"resolved">("all");
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [resolving,setResolving]= useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (filter === "active")   params.set("resolved", "false");
      if (filter === "resolved") params.set("resolved", "true");

      const { data } = await api.get(`/escalation/logs?${params}`);
      setLogs(data.logs   ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [filter, page]);

  const handleResolve = async (logId: string) => {
    setResolving(logId);
    try {
      await api.put(`/escalation/logs/${logId}/resolve`, {
        notes: "Resolved by admin",
      });
      toast.success("Marked as resolved");
      fetchLogs();
    } catch {
      toast.error("Failed to resolve");
    } finally {
      setResolving(null);
    }
  };

  const activeCount   = logs.filter((l) => !l.resolved).length;
  const resolvedCount = logs.filter((l) =>  l.resolved).length;

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <History className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent pb-1">
            Escalation Log
          </h1>
        </div>
        <p className="text-slate-400 text-lg ml-16">
          Track all escalation alerts and their resolution status
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
            Total
          </p>
          <p className="text-3xl font-black text-white">{total}</p>
        </div>
        <div className="bg-red-400/5 border border-red-400/20 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-red-400/70 mb-1">
            Active
          </p>
          <p className="text-3xl font-black text-red-400">{activeCount}</p>
        </div>
        <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400/70 mb-1">
            Resolved
          </p>
          <p className="text-3xl font-black text-emerald-400">{resolvedCount}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-900/60 border border-slate-800 rounded-xl w-fit">
        {(["all","active","resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log entries */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-3xl">
          <p className="text-4xl mb-4">✅</p>
          <p className="text-slate-400 font-medium">No escalations found</p>
          <p className="text-slate-500 text-sm mt-1">
            {filter === "active" ? "All issues have been resolved!" : "No logs yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`border rounded-2xl p-5 transition-all ${
                log.resolved
                  ? "bg-slate-900/20 border-slate-800/40"
                  : "bg-slate-900/40 border-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {/* Trigger badge */}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      TRIGGER_COLORS[log.trigger_type] ?? "text-slate-400 bg-slate-400/10"
                    }`}>
                      {TRIGGER_LABELS[log.trigger_type] ?? log.trigger_type}
                    </span>

                    {/* Resolved badge */}
                    {log.resolved ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg text-emerald-400 bg-emerald-400/10">
                        ✓ Resolved
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg text-red-400 bg-red-400/10 animate-pulse">
                        ● Active
                      </span>
                    )}
                  </div>

                  {/* Employee + rule */}
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 text-xs font-bold flex-shrink-0">
                      {log.employee?.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {log.employee?.name}
                      </p>
                      <p className="text-slate-500 text-xs">
                        Rule: {log.rule?.name}
                      </p>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                    <span>📅 {format(new Date(log.created_at), "dd MMM yyyy, hh:mm a")}</span>
                    <span>⏱ {log.days_passed} days overdue</span>
                    {log.resolved && log.resolved_at && (
                      <span className="text-emerald-500">
                        ✓ Resolved {format(new Date(log.resolved_at), "dd MMM yyyy")}
                      </span>
                    )}
                    {log.notes && (
                      <span className="text-slate-400">📝 {log.notes}</span>
                    )}
                  </div>
                </div>

                {/* Resolve button */}
                {!log.resolved && (
                  <button
                    onClick={() => handleResolve(log.id)}
                    disabled={resolving === log.id}
                    className="flex-shrink-0 px-4 py-2 rounded-xl border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-400/10 transition-all disabled:opacity-50"
                  >
                    {resolving === log.id ? "..." : "Resolve"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <span className="text-slate-500 text-sm">{total} total entries</span>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-all"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
