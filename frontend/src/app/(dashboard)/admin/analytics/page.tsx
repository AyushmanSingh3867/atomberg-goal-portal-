"use client";
import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { api } from "@/lib/api";
import { PieChart as LucidePieChart } from "lucide-react";

// ─── Color Helpers ────────────────────────────────────────
const getScoreColor = (score: number) => {
  if (score >= 80) return "#10b981"; // green
  if (score >= 50) return "#f59e0b"; // amber
  if (score >   0) return "#ef4444"; // red
  return "#334155";                   // slate (no data)
};

const getScoreBg = (score: number) => {
  if (score >= 80) return "bg-emerald-500/80";
  if (score >= 50) return "bg-amber-500/80";
  if (score >   0) return "bg-red-500/80";
  return "bg-slate-800";
};

const CHART_COLORS = [
  "#6366f1","#8b5cf6","#06b6d4","#10b981",
  "#f59e0b","#ef4444","#ec4899","#14b8a6",
];

// ─── Types ────────────────────────────────────────────────
interface QoQData {
  teamAvg:      Record<string, number>;
  employeeData: { employeeName: string; scores: Record<string, number>; department?: string }[];
}
interface Distribution {
  byThrustArea: { name: string; count: number; avgScore: number }[];
  byUom:        { type: string; count: number }[];
  byStatus:     { status: string; count: number }[];
  totalGoals:   number;
}
interface HeatmapRow {
  employeeName: string;
  Q1: number; Q2: number; Q3: number; Q4: number;
}
interface ManagerRow {
  managerName:      string;
  teamSize:         number;
  approvalRate:     number;
  avgDaysToApprove: number | null;
  checkinPct:       number;
  teamAvgScore:     number;
}

// ─── Tabs ─────────────────────────────────────────────────
const TABS = [
  { key: "trends",      label: "QoQ Trends"            },
  { key: "distribution",label: "Goal Distribution"      },
  { key: "heatmap",     label: "Performance Heatmap"    },
  { key: "managers",    label: "Manager Effectiveness"  },
];

export default function AnalyticsPage() {
  const [tab,          setTab]          = useState("trends");
  const [loading,      setLoading]      = useState(false);
  const [qoq,          setQoq]          = useState<QoQData | null>(null);
  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [heatmap,      setHeatmap]      = useState<HeatmapRow[]>([]);
  const [managers,     setManagers]     = useState<ManagerRow[]>([]);
  const [sortKey,      setSortKey]      = useState<keyof ManagerRow>("teamAvgScore");
  const [sortDir,      setSortDir]      = useState<"asc"|"desc">("desc");

  const fetchTab = useCallback(async (t: string) => {
    setLoading(true);
    try {
      switch (t) {
        case "trends": {
          const { data } = await api.get("/analytics/qoq-trends");
          setQoq(data);
          break;
        }
        case "distribution": {
          const { data } = await api.get("/analytics/distribution");
          setDistribution(data);
          break;
        }
        case "heatmap": {
          const { data } = await api.get("/analytics/heatmap");
          setHeatmap(data.rows ?? []);
          break;
        }
        case "managers": {
          const { data } = await api.get("/analytics/manager-effectiveness");
          setManagers(data.managers ?? []);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTab(tab); }, [tab, fetchTab]);

  const handleSort = (key: keyof ManagerRow) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sortedManagers = [...managers].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortDir === "asc"
      ? (av > bv ? 1 : -1)
      : (av < bv ? 1 : -1);
  });

  // Build line chart data from QoQ
  const lineData = ["Q1","Q2","Q3","Q4"].map((q) => {
    const point: any = { quarter: q, "Team Avg": qoq?.teamAvg[q] ?? 0 };
    qoq?.employeeData.forEach((e) => {
      point[e.employeeName] = e.scores[q];
    });
    return point;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen pb-20">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <LucidePieChart className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent pb-1">
            Analytics
          </h1>
        </div>
        <p className="text-slate-400 text-lg ml-16">
          Quarter-on-quarter trends, goal insights, and manager performance
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-8 p-1 bg-slate-900/60 border border-slate-800 rounded-2xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── Tab: QoQ Trends ── */}
          {tab === "trends" && qoq && (
            <div className="space-y-6">

              {/* Team avg summary cards */}
              <div className="grid grid-cols-4 gap-4">
                {["Q1","Q2","Q3","Q4"].map((q) => (
                  <div
                    key={q}
                    className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
                      {q} Team Avg
                    </p>
                    <p
                      className="text-4xl font-black"
                      style={{ color: getScoreColor(qoq.teamAvg[q] ?? 0) }}
                    >
                      {qoq.teamAvg[q] ?? 0}
                      <span className="text-xl font-bold text-slate-500">%</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Line chart */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">
                  Quarter-on-Quarter Achievement Trends
                </h3>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="quarter"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#1e293b" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#1e293b" }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border:     "1px solid #1e293b",
                        borderRadius: "12px",
                        color:      "#f1f5f9",
                      }}
                      formatter={(v: any) => [`${v}%`]}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "24px", color: "#64748b", fontSize: "12px" }}
                    />
                    {/* Team avg — prominent */}
                    <Line
                      type="monotone"
                      dataKey="Team Avg"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#6366f1" }}
                      activeDot={{ r: 7 }}
                    />
                    {/* Individual lines */}
                    {qoq.employeeData.map((e, i) => (
                      <Line
                        key={e.employeeName}
                        type="monotone"
                        dataKey={e.employeeName}
                        stroke={CHART_COLORS[(i + 1) % CHART_COLORS.length]}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Employee score table */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">
                  Individual Scores by Quarter
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {["Employee","Department","Q1","Q2","Q3","Q4"].map((h) => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {qoq.employeeData.map((emp, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-4 font-medium text-white">{emp.employeeName}</td>
                          <td className="py-4 px-4 text-slate-400">{emp.department ?? "—"}</td>
                          {["Q1","Q2","Q3","Q4"].map((q) => (
                            <td key={q} className="py-4 px-4">
                              <span
                                className="font-bold text-sm"
                                style={{ color: getScoreColor(emp.scores[q] ?? 0) }}
                              >
                                {emp.scores[q] > 0 ? `${emp.scores[q]}%` : "—"}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Goal Distribution ── */}
          {tab === "distribution" && distribution && (
            <div className="space-y-6">

              {/* Summary stat */}
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white">
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">
                  Total Goals This Cycle
                </p>
                <p className="text-5xl font-black">{distribution.totalGoals}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* By Thrust Area — Donut */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">
                    By Thrust Area
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={distribution.byThrustArea}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                      >
                        {distribution.byThrustArea.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a", border: "1px solid #1e293b",
                          borderRadius: "12px", color: "#f1f5f9",
                        }}
                        formatter={(v: any, name: any) => [`${v} goals`, name]}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: "16px", color: "#64748b", fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Avg scores per thrust area */}
                  <div className="mt-4 space-y-2">
                    {distribution.byThrustArea.map((ta, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className="text-slate-300">{ta.name}</span>
                        </div>
                        <span
                          className="font-bold"
                          style={{ color: getScoreColor(ta.avgScore) }}
                        >
                          {ta.avgScore > 0 ? `${ta.avgScore}% avg` : "No data"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By UoM Type — Bar */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">
                    By UoM Type
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={distribution.byUom} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="type"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        axisLine={{ stroke: "#1e293b" }}
                        tickFormatter={(v) => v.replace("_", " ")}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        axisLine={{ stroke: "#1e293b" }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a", border: "1px solid #1e293b",
                          borderRadius: "12px", color: "#f1f5f9",
                        }}
                        formatter={(v: any) => [`${v} goals`]}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {distribution.byUom.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* By Status — Bar */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 lg:col-span-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">
                    Goal Sheet Status Distribution
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {distribution.byStatus.map((s, i) => {
                      const colors: Record<string, string> = {
                        APPROVED:  "border-emerald-500/30 text-emerald-400",
                        SUBMITTED: "border-blue-500/30    text-blue-400",
                        RETURNED:  "border-amber-500/30   text-amber-400",
                        DRAFT:     "border-slate-600      text-slate-400",
                      };
                      return (
                        <div
                          key={i}
                          className={`border rounded-2xl p-5 ${colors[s.status] ?? "border-slate-700 text-slate-400"}`}
                        >
                          <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">
                            {s.status}
                          </p>
                          <p className="text-4xl font-black">{s.count}</p>
                          <p className="text-xs opacity-50 mt-1">goal sheets</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Heatmap ── */}
          {tab === "heatmap" && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
                  Performance Heatmap — Employee × Quarter
                </h3>
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500/80" />
                    <span>≥80%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-amber-500/80" />
                    <span>50–79%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-red-500/80" />
                    <span>&lt;50%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-slate-800" />
                    <span>No data</span>
                  </div>
                </div>
              </div>

              {heatmap.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  No achievement data available yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500 min-w-[160px]">
                          Employee
                        </th>
                        {["Q1","Q2","Q3","Q4"].map((q) => (
                          <th key={q} className="text-center py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500 w-32">
                            {q}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                      {heatmap.map((row, i) => (
                        <tr key={i} className="group">
                          <td className="py-3 px-4 text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                            {row.employeeName}
                          </td>
                          {["Q1","Q2","Q3","Q4"].map((q) => {
                            const score = row[q as keyof HeatmapRow] as number;
                            return (
                              <td key={q} className="py-3 px-4 text-center">
                                <div className="relative group/cell mx-auto w-16 h-10 flex items-center justify-center">
                                  <div
                                    className={`w-full h-full rounded-xl flex items-center justify-center text-sm font-bold text-white transition-transform group-hover/cell:scale-110 ${getScoreBg(score)}`}
                                  >
                                    {score > 0 ? `${score}%` : "—"}
                                  </div>
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/cell:block z-10">
                                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white whitespace-nowrap shadow-xl">
                                      {row.employeeName} · {q}: {score > 0 ? `${score}%` : "No data"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Manager Effectiveness ── */}
          {tab === "managers" && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">
                Manager Effectiveness Comparison
              </h3>

              {managers.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  No manager data available
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {[
                          { key: "managerName",      label: "Manager"          },
                          { key: "teamSize",          label: "Team Size"        },
                          { key: "approvalRate",      label: "Approval Rate"    },
                          { key: "avgDaysToApprove",  label: "Avg Days Approve" },
                          { key: "checkinPct",        label: "Check-in %"       },
                          { key: "teamAvgScore",      label: "Team Avg Score"   },
                        ].map((col) => (
                          <th
                            key={col.key}
                            onClick={() => handleSort(col.key as keyof ManagerRow)}
                            className="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none"
                          >
                            <div className="flex items-center gap-1">
                              {col.label}
                              {sortKey === col.key && (
                                <span>{sortDir === "asc" ? "↑" : "↓"}</span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {sortedManagers.map((mgr, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                          {/* Manager name + avatar */}
                          <td className="py-5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 text-xs font-bold flex-shrink-0">
                                {mgr.managerName.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-medium text-white">{mgr.managerName}</span>
                            </div>
                          </td>

                          {/* Team size */}
                          <td className="py-5 px-4 text-slate-300 font-medium">
                            {mgr.teamSize}
                          </td>

                          {/* Approval rate */}
                          <td className="py-5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-800 rounded-full h-1.5 w-20 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-500 transition-all"
                                  style={{ width: `${mgr.approvalRate}%` }}
                                />
                              </div>
                              <span
                                className="font-bold text-sm"
                                style={{ color: getScoreColor(mgr.approvalRate) }}
                              >
                                {mgr.approvalRate}%
                              </span>
                            </div>
                          </td>

                          {/* Avg days */}
                          <td className="py-5 px-4">
                            {mgr.avgDaysToApprove !== null ? (
                              <span className={`font-bold ${
                                mgr.avgDaysToApprove <= 2 ? "text-emerald-400" :
                                mgr.avgDaysToApprove <= 5 ? "text-amber-400"  : "text-red-400"
                              }`}>
                                {mgr.avgDaysToApprove}d
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Check-in % */}
                          <td className="py-5 px-4">
                            <span
                              className="font-bold"
                              style={{ color: getScoreColor(mgr.checkinPct) }}
                            >
                              {mgr.checkinPct}%
                            </span>
                          </td>

                          {/* Team avg score — most important */}
                          <td className="py-5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-lg font-black"
                                style={{ color: getScoreColor(mgr.teamAvgScore) }}
                              >
                                {mgr.teamAvgScore}%
                              </span>
                              {i === 0 && (
                                <span className="text-xs bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full font-medium">
                                  Top
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bar chart comparison */}
              {managers.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">
                    Team Avg Score Comparison
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sortedManagers} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="managerName"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        axisLine={{ stroke: "#1e293b" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        axisLine={{ stroke: "#1e293b" }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a", border: "1px solid #1e293b",
                          borderRadius: "12px", color: "#f1f5f9",
                        }}
                        formatter={(v: any) => [`${v}%`, "Team Avg Score"]}
                      />
                      <Bar dataKey="teamAvgScore" radius={[6, 6, 0, 0]}>
                        {sortedManagers.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
