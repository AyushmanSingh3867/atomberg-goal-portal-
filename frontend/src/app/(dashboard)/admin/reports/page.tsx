"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { PieChart } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  APPROVED:  "text-green-400 bg-green-400/10",
  SUBMITTED: "text-blue-400  bg-blue-400/10",
  RETURNED:  "text-amber-400 bg-amber-400/10",
  DRAFT:     "text-gray-400  bg-gray-400/10",
};

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
};

export default function ReportsPage() {
  const [tab, setTab]             = useState<"report" | "completion" | "heatmap">("report");
  const [rows, setRows]           = useState<any[]>([]);
  const [completion, setCompletion] = useState<any>(null);
  const [heatmap, setHeatmap]     = useState<any[]>([]);
  const [filters, setFilters]     = useState({ cycleId: "", departmentId: "", managerId: "" });
  const [loading, setLoading]     = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ── Fetch Heatmap ───────────────────────────────────────
  const fetchHeatmap = useCallback(async () => {
    try {
      const data = await api.reports.getHeatmap();
      setHeatmap(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // ── Fetch report table ──────────────────────────────────
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.cycleId)      params.set("cycleId",      filters.cycleId);
      if (filters.departmentId) params.set("departmentId", filters.departmentId);
      if (filters.managerId)    params.set("managerId",    filters.managerId);
      
      const data = await api.reports.getTable(params.toString());
      setRows(data.rows ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ── Fetch completion dashboard ──────────────────────────
  const fetchCompletion = useCallback(async () => {
    try {
      const data = await api.reports.getCompletion();
      setCompletion(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchReport(); },    [fetchReport]);
  useEffect(() => { fetchCompletion(); }, [fetchCompletion]);
  useEffect(() => { fetchHeatmap(); }, [fetchHeatmap]);

  // 60-second auto-refresh for completion
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCompletion();
      fetchHeatmap();
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchCompletion, fetchHeatmap]);

  // ── Export handlers ─────────────────────────────────────
  const handleExport = async (type: "csv" | "excel") => {
    const params = new URLSearchParams();
    if (filters.cycleId)      params.set("cycleId",      filters.cycleId);
    if (filters.departmentId) params.set("departmentId", filters.departmentId);

    const token = document.cookie.split('token=')[1]?.split(';')[0];
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'https://atomberg-backend.onrender.com/api'}/reports/export/${type}?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const blob     = await response.blob();
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement("a");
    a.href         = url;
    a.download     = `achievement-report.${type === "excel" ? "xlsx" : "csv"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <PieChart className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent pb-1">
            Reporting & Governance
          </h1>
        </div>
        <p className="text-slate-400 text-lg ml-16">
          Achievement reports, completion tracking, and governance data
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {[
          { key: "report",     label: "Achievement Report" },
          { key: "completion", label: "Completion Dashboard" },
          { key: "heatmap",    label: "Department Heatmap" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === t.key
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Achievement Report Tab ── */}
      {tab === "report" && (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          {/* Filters + Export */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              className="bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value }))}
            >
              <option value="">All Departments</option>
            </select>
            <select
              className="bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              onChange={(e) => setFilters((f) => ({ ...f, managerId: e.target.value }))}
            >
              <option value="">All Managers</option>
            </select>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => handleExport("csv")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-indigo-500 transition-all"
              >
                ↓ CSV
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all"
              >
                ↓ Export Excel
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {["Employee","Department","Goal Title","Thrust Area",
                      "UoM","Target","Weightage","Q1","Q2","Q3","Q4","Status"
                    ].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-slate-500 font-bold whitespace-nowrap uppercase text-[10px] tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-12 text-slate-500 italic">No data found</td></tr>
                  ) : rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-800/40 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-3 font-semibold text-white">{row.employee}</td>
                      <td className="py-4 px-3 text-slate-400">{row.department}</td>
                      <td className="py-4 px-3 text-white">{row.goal_title}</td>
                      <td className="py-4 px-3 text-slate-400">{row.thrust_area}</td>
                      <td className="py-4 px-3 text-slate-400">{row.uom_type}</td>
                      <td className="py-4 px-3 text-white">{row.target}</td>
                      <td className="py-4 px-3 text-slate-400">{row.weightage}</td>
                      <td className={`py-4 px-3 font-bold ${SCORE_COLOR(parseFloat(row.q1_score))}`}>{row.q1_score}</td>
                      <td className={`py-4 px-3 font-bold ${SCORE_COLOR(parseFloat(row.q2_score))}`}>{row.q2_score}</td>
                      <td className={`py-4 px-3 font-bold ${SCORE_COLOR(parseFloat(row.q3_score))}`}>{row.q3_score}</td>
                      <td className={`py-4 px-3 font-bold ${SCORE_COLOR(parseFloat(row.q4_score))}`}>{row.q4_score}</td>
                      <td className="py-4 px-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[row.sheet_status]}`}>
                          {row.sheet_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Completion Dashboard Tab ── */}
      {tab === "completion" && (
        <div>
          {/* Last updated */}
          <div className="flex justify-end mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {lastUpdated
                ? `Last updated: ${lastUpdated.toLocaleTimeString()} · Auto-refreshes every 60s`
                : "Loading..."}
            </span>
          </div>

          {/* Summary Cards */}
          {completion?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { label: "Submitted Goals",  pct: completion.summary.submitted_pct,  val: completion.summary.submitted,  color: "text-blue-400"  },
                { label: "Approved & Locked", pct: completion.summary.approved_pct,   val: completion.summary.approved,   color: "text-emerald-400" },
                { label: "Check-ins Logged",  pct: completion.summary.checkin_pct,    val: completion.summary.checkedIn,  color: "text-indigo-400" },
              ].map((card) => (
                <div key={card.label} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                   <div className={cn("absolute top-0 left-0 h-1 transition-all duration-1000", card.color.replace('text', 'bg'))} style={{ width: `${card.pct}%` }}></div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-2">{card.label}</p>
                  <p className={`text-4xl font-black ${card.color}`}>
                    {card.pct}%
                  </p>
                  <p className="text-slate-400 text-sm mt-2 font-medium">
                    {card.val} of {completion.summary.total} employees
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Per-employee list */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              Employee Compliance Status
            </h3>
            <div className="space-y-3">
              {(completion?.employees ?? []).map((emp: any) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-slate-800"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs flex-shrink-0">
                    {emp.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{emp.name}</p>
                    <p className="text-slate-500 text-xs truncate font-medium">
                      {emp.department} · Managed by {emp.manager}
                    </p>
                  </div>

                  {/* Sheet status */}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[emp.sheetStatus]}`}>
                    {emp.sheetStatus}
                  </span>

                  {/* Check-in status */}
                  <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                    emp.checkinComplete ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {emp.checkinComplete ? "✓ Complete" : "⏳ Pending"}
                  </span>

                  {/* Score */}
                  <span className={`text-sm font-black min-w-[56px] text-right ${SCORE_COLOR(emp.overallScore)}`}>
                    {emp.overallScore > 0 ? `${emp.overallScore}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Department Heatmap Tab ── */}
      {tab === "heatmap" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {heatmap.map((dept) => (
            <div key={dept.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{dept.name}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{dept.totalEmployees} Employees</p>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm",
                  dept.status === 'HEALTHY' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  dept.status === 'WARNING' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                  {dept.status}
                </span>
              </div>

              {/* Progress Circle/Bar */}
              <div className="relative pt-2">
                <div className="flex items-end justify-between mb-2">
                  <span className="text-3xl font-black text-white">{dept.completionRate}%</span>
                  <span className="text-slate-400 text-xs font-medium">{dept.completedSheets} Approved</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000",
                      dept.status === 'HEALTHY' ? "bg-emerald-500" :
                      dept.status === 'WARNING' ? "bg-amber-500" :
                      "bg-red-500"
                    )}
                    style={{ width: `${dept.completionRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800/50 grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-xl bg-black/20">
                  <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Approved</p>
                  <p className="text-white font-bold">{dept.completedSheets}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-black/20">
                  <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Pending</p>
                  <p className="text-white font-bold">{dept.totalEmployees - dept.completedSheets}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
