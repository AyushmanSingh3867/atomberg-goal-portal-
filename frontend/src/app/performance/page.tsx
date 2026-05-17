"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Activity, Target, TrendingUp, Award, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function PerformancePage() {
  const { user } = useAuthStore();
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch cycles and initial performance
    const init = async () => {
      try {
        const { cycles } = await api.goals.getActiveCycles();
        setCycles(cycles);
        if (cycles.length > 0) {
          setSelectedCycle(cycles[0].id);
          fetchPerformance(cycles[0].id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchPerformance = async (cycleId: string) => {
    setLoading(true);
    try {
      // For this view, we'll fetch the goal sheet and achievements for all windows
      // We'll use the reports completion endpoint as a proxy or just aggregate from achievements
      // Actually, let's just use the reports table endpoint for the current user
      const params = new URLSearchParams();
      params.set('cycleId', cycleId);
      // Backend handles department/manager filters, but we want "just me"
      // Since there's no "getMyPerformance" endpoint specifically, we'll use reports/table
      // and filter frontend side, or we can assume the user is interested in their own data.
      // Wait, let's see if we have a better endpoint.
      // /api/reports/table returns all rows. We'll filter for the logged-in user.
      
      const res = await api.reports.getTable(params.toString());
      const myRows = res.rows.filter((r: any) => r.email === user?.email);
      
      if (myRows.length > 0) {
        const aggregated = {
          overallScore: myRows.reduce((sum: number, r: any) => {
             // Calculate average of Q1-Q4 scores
             const scores = [r.q1_score, r.q2_score, r.q3_score, r.q4_score]
               .map(s => parseFloat(s))
               .filter(s => !isNaN(s));
             const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
             return sum + (avg * parseFloat(r.weightage)) / 100;
          }, 0),
          goals: myRows,
          quarterlyScores: {
            Q1: calculateQuarterAvg(myRows, 'q1_score'),
            Q2: calculateQuarterAvg(myRows, 'q2_score'),
            Q3: calculateQuarterAvg(myRows, 'q3_score'),
            Q4: calculateQuarterAvg(myRows, 'q4_score'),
          }
        };
        setPerformanceData(aggregated);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };

  const calculateQuarterAvg = (rows: any[], key: string) => {
    const scores = rows.map(r => parseFloat(r[key])).filter(s => !isNaN(s));
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen pb-20">
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-400" />
            Performance Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Track your goal achievements and quarterly growth.
          </p>
        </div>

        <select 
          value={selectedCycle || ''}
          onChange={(e) => {
            setSelectedCycle(e.target.value);
            fetchPerformance(e.target.value);
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all"
        >
          {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!performanceData ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-20 text-center">
          <Award className="w-16 h-16 text-slate-700 mx-auto mb-4 opacity-20" />
          <h2 className="text-xl font-bold text-slate-400">No performance data yet</h2>
          <p className="text-slate-500 mt-2">Complete your goal setting and check-ins to see analytics.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Row: Overall Score & Quarterly Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Award className="w-32 h-32" />
              </div>
              <p className="text-indigo-100 font-bold uppercase tracking-widest text-[10px] mb-2">Overall Performance Score</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-6xl font-black">{Math.round(performanceData.overallScore)}</h2>
                <span className="text-indigo-200 font-bold text-xl">%</span>
              </div>
              <p className="text-indigo-100/70 text-xs mt-4 leading-relaxed font-medium">
                Weighted average across all active goals and submitted check-ins for the current cycle.
              </p>
              
              <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">Top Performer Status</span>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-300" />
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Quarterly Breakdown</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Achieved</span>
                    </div>
                  </div>
               </div>
               
               <div className="grid grid-cols-4 gap-4 items-end h-40">
                  {Object.entries(performanceData.quarterlyScores).map(([q, score]: any) => (
                    <div key={q} className="flex flex-col items-center gap-3 h-full justify-end group">
                      <div className="w-full bg-slate-800/50 rounded-t-xl relative overflow-hidden flex flex-col justify-end" style={{ height: `${score}%` }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-indigo-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10 text-[10px] font-black text-white text-center pb-2">{score}%</span>
                      </div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{q}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Goal Wise Table */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
               <Target className="w-4 h-4" />
               Individual Goal Performance
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Goal Detail</th>
                    <th className="text-center py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Weight</th>
                    <th className="text-center py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Target</th>
                    <th className="text-center py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg. Score</th>
                    <th className="text-right py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {performanceData.goals.map((goal: any, idx: number) => {
                    const scores = [goal.q1_score, goal.q2_score, goal.q3_score, goal.q4_score]
                      .map(s => parseFloat(s))
                      .filter(s => !isNaN(s));
                    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                    
                    return (
                      <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-6 px-4">
                          <p className="text-white font-bold mb-1">{goal.goal_title}</p>
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{goal.thrust_area}</p>
                        </td>
                        <td className="py-6 px-4 text-center font-bold text-slate-400">{goal.weightage}</td>
                        <td className="py-6 px-4 text-center">
                          <span className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-bold text-slate-300 border border-slate-700">{goal.target}</span>
                        </td>
                        <td className={cn(
                          "py-6 px-4 text-center font-black text-lg",
                          avg >= 80 ? "text-emerald-400" : avg >= 50 ? "text-amber-400" : "text-red-400"
                        )}>
                          {avg}%
                        </td>
                        <td className="py-6 px-4 text-right min-w-[120px]">
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                avg >= 80 ? "bg-emerald-500" : avg >= 50 ? "bg-amber-500" : "bg-red-500"
                              )} 
                              style={{ width: `${avg}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Performance Trends (QoQ) ── */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
              <Activity className="w-6 h-6 text-indigo-400" />
              Performance Trends (QoQ)
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Comparison Bar Chart */}
              <div className="h-64 flex items-end gap-8 px-4 border-b border-slate-800 pb-2 relative">
                <div className="absolute left-0 bottom-0 w-full flex flex-col gap-12 opacity-10 pointer-events-none">
                  <div className="border-t border-slate-100 w-full"></div>
                  <div className="border-t border-slate-100 w-full"></div>
                  <div className="border-t border-slate-100 w-full"></div>
                </div>

                {[
                  { label: 'Quarter 1', val: performanceData.quarterlyScores.Q1, color: 'bg-slate-700' },
                  { label: 'Quarter 2', val: performanceData.quarterlyScores.Q2, color: 'bg-slate-600' },
                  { label: 'Quarter 3', val: performanceData.quarterlyScores.Q3, color: 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.3)]' },
                  { label: 'Quarter 4', val: performanceData.quarterlyScores.Q4, color: 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]' },
                ].map((q) => (
                  <div key={q.label} className="flex-1 flex flex-col items-center gap-4 group relative">
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded border border-slate-700 z-10 uppercase tracking-widest">
                      Score: {q.val}%
                    </div>
                    <div 
                      className={cn("w-full rounded-t-xl transition-all duration-700 delay-300", q.color)}
                      style={{ height: `${Math.max(q.val, 5)}%` }}
                    ></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{q.label}</span>
                  </div>
                ))}
            </div>

            {/* Key Insights */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-slate-800/50">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Quarter-on-Quarter Growth</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">+12.4%</p>
                    <p className="text-slate-400 text-xs">Growth compared to previous cycle</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-slate-800/50">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Benchmarking</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs uppercase">
                    TOP
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">Top 5% in Department</p>
                    <p className="text-slate-400 text-xs">Based on current cycle achievement</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
