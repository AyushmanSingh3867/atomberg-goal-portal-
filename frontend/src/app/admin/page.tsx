'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ShieldAlert, Unlock, CalendarPlus, FileText, Loader2, Target, Users, LayoutDashboard, Settings, Activity, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'cycles' | 'unlock' | 'audit' | 'settings'>('cycles');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Cycle State
  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cycles, setCycles] = useState<any[]>([]);

  // Unlock State
  const [goalId, setGoalId] = useState('');

  const handleOrgSync = async () => {
    setSyncing(true);
    try {
      await api.post("/auth/azure/sync-org", {
        accessToken: localStorage.getItem("ag_token"), // In production this comes from their SSO session.
      });
      toast.success("Org hierarchy synced from Azure AD!");
    } catch (err: any) {
      toast.error(err.message || "Sync failed — ensure you're logged in via Microsoft SSO");
    } finally {
      setSyncing(false);
    }
  };

  const fetchCycles = async () => {
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://atomberg-backend.onrender.com/api'}/admin/cycles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setCycles(data.cycles || []);
    } catch (error) {
      console.error('Error fetching cycles:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'cycles') {
      fetchCycles();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      // Assuming api.ts has this implemented, if not we will fetch directly
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://atomberg-backend.onrender.com/api'}/admin/audit-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setLogs(data.logs);
      else toast.error(data.error || 'Failed to fetch logs');
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://atomberg-backend.onrender.com/api'}/admin/cycles`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: cycleName, start_date: new Date(startDate).toISOString(), end_date: new Date(endDate).toISOString() })
      });
      if (res.ok) {
        toast.success('Cycle created successfully');
        setCycleName(''); setStartDate(''); setEndDate('');
        fetchCycles();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create cycle');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://atomberg-backend.onrender.com/api'}/admin/goals/${goalId}/unlock`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Goal unlocked successfully');
        setGoalId('');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to unlock goal');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
              <ShieldAlert className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent pb-1">
              Admin Console
            </h1>
          </div>
          <p className="text-slate-400 text-lg ml-16">Manage system configurations and users</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleOrgSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:border-indigo-500 hover:text-white transition-all disabled:opacity-50"
          >
            <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
              <div className="bg-[#f25022] rounded-sm" />
              <div className="bg-[#7fba00] rounded-sm" />
              <div className="bg-[#00a4ef] rounded-sm" />
              <div className="bg-[#ffb900] rounded-sm" />
            </div>
            {syncing ? "Syncing..." : "Sync from Azure AD"}
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('cycles')} 
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border",
            activeTab === 'cycles' 
              ? "bg-indigo-600 border-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]" 
              : "bg-transparent border-[#2a2a45] text-slate-400 hover:text-slate-200 hover:border-slate-600"
          )}
        >
          <CalendarPlus className="w-4 h-4" /> Goal Cycles
        </button>
        <button 
          onClick={() => setActiveTab('unlock')} 
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border",
            activeTab === 'unlock' 
              ? "bg-indigo-600 border-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]" 
              : "bg-transparent border-[#2a2a45] text-slate-400 hover:text-slate-200 hover:border-slate-600"
          )}
        >
          <Unlock className="w-4 h-4" /> Unlock Goals
        </button>
        <button 
          onClick={() => setActiveTab('audit')} 
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border",
            activeTab === 'audit' 
              ? "bg-indigo-600 border-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]" 
              : "bg-transparent border-[#2a2a45] text-slate-400 hover:text-slate-200 hover:border-slate-600"
          )}
        >
          <FileText className="w-4 h-4" /> Audit Logs
        </button>
      </div>

      {activeTab === 'cycles' && (
        <div className="space-y-8">
          {/* Grid Layout: Create Goal Cycle Form & Active Cycles Card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Create Goal Cycle Card */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CalendarPlus className="w-5 h-5 text-indigo-400" /> Create Goal Cycle
                </h2>
                <form onSubmit={handleCreateCycle} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Cycle Name (e.g., FY2026-27)</label>
                    <input 
                      type="text" 
                      value={cycleName} 
                      onChange={e=>setCycleName(e.target.value)} 
                      required 
                      className="w-full bg-black/40 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500 transition-all" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Start Date</label>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={e=>setStartDate(e.target.value)} 
                        required 
                        min="2020-01-01"
                        max="2099-12-31"
                        className="w-full bg-black/40 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">End Date</label>
                      <input 
                        type="date" 
                        value={endDate} 
                        onChange={e=>setEndDate(e.target.value)} 
                        required 
                        min="2020-01-01"
                        max="2099-12-31"
                        className="w-full bg-black/40 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500 transition-all" 
                      />
                    </div>
                  </div>
                  <button 
                    disabled={isLoading} 
                    className="mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />} Create Cycle
                  </button>
                </form>
              </div>
            </div>

            {/* Active Cycles Card (Right Column) */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col h-full justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" /> Active Cycles
                </h2>
                <p className="text-slate-400 text-sm mb-6 font-medium">
                  {cycles.filter(c => c.is_active).length === 1 
                    ? `1 active cycle · ${cycles.filter(c => c.is_active)[0]?.name}` 
                    : `${cycles.filter(c => c.is_active).length} active cycles`
                  }
                </p>
                <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {cycles.filter(c => c.is_active).length === 0 ? (
                    <div className="text-center py-10 text-slate-500 italic">No active cycles found.</div>
                  ) : (
                    cycles.filter(c => c.is_active).map(c => (
                      <div key={c.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between hover:border-emerald-500/30 transition-all group">
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">{c.name}</h3>
                          <p className="text-[11px] text-slate-500">
                            {new Date(c.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(c.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black rounded-full uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                          </span>
                          <span className="text-xs text-slate-400 font-semibold bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-400" />
                            {c._count?.goalSheets ?? 0} {c._count?.goalSheets === 1 ? 'employee' : 'employees'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Table: Existing Cycles */}
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-400" /> All Goal Cycles
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 text-sm">
                    <th className="pb-3 font-medium">Cycle Name</th>
                    <th className="pb-3 font-medium">Start Date</th>
                    <th className="pb-3 font-medium">End Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Goal Sheets Count</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {cycles.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800/40 hover:bg-white/[0.01] transition-colors group">
                      <td className="py-4 font-bold text-slate-100 flex items-center gap-2">
                        <CalendarPlus className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                        {c.name}
                      </td>
                      <td className="py-4 text-slate-400">
                        {new Date(c.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 text-slate-400">
                        {new Date(c.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                          c.is_active 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-slate-850 text-slate-500 border-slate-800"
                        )}>
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 text-right font-semibold text-slate-200">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          {c._count?.goalSheets ?? 0} {c._count?.goalSheets === 1 ? 'employee' : 'employees'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {cycles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 italic">
                        No goal cycles found. Create one above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'unlock' && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 max-w-xl">
          <h2 className="text-xl font-bold mb-4">Unlock Approved Goal</h2>
          <p className="text-sm text-slate-400 mb-6">Use this to unlock a goal&apos;s target/title after it has been approved. This action is logged.</p>
          <form onSubmit={handleUnlockGoal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Goal ID</label>
              <input type="text" value={goalId} onChange={e=>setGoalId(e.target.value)} required placeholder="uuid" className="w-full bg-black/40 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-sm" />
            </div>
            <button disabled={isLoading} className="mt-4 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />} <Unlock className="w-4 h-4" /> Force Unlock Goal
            </button>
          </form>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">System Audit Logs {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-sm">
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">Actor</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {logs.map((log: any) => {
                  let detailsObj: any = null;
                  try { detailsObj = JSON.parse(log.details); } catch {}

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="py-4 font-semibold text-white">{log.user?.name}</td>
                        <td className="py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                            log.action.includes('UNLOCK') ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            log.action.includes('APPROVE') ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            log.action.includes('RETURN') ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          )}>
                            {log.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4">
                          {detailsObj ? (
                            <details className="cursor-pointer group/details">
                              <summary className="text-slate-500 hover:text-indigo-400 font-medium transition-colors list-none flex items-center gap-2">
                                <span>View Payload</span>
                                <FileText className="w-3 h-3" />
                              </summary>
                              <div className="mt-3 p-4 bg-black/40 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto">
                                {detailsObj.changes ? (
                                  <div className="space-y-2">
                                    {Object.entries(detailsObj.changes).map(([field, val]: any) => (
                                      <div key={field} className="flex flex-col gap-1">
                                        <span className="text-indigo-400 font-bold uppercase text-[9px]">{field}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-red-400 line-through opacity-60">{String(val.old)}</span>
                                          <span className="text-slate-600">→</span>
                                          <span className="text-emerald-400">{String(val.new)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <pre>{JSON.stringify(detailsObj, null, 2)}</pre>
                                )}
                              </div>
                            </details>
                          ) : (
                            <span className="text-slate-500">{log.details || '-'}</span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
                {logs.length === 0 && !isLoading && (
                  <tr><td colSpan={4} className="py-12 text-center text-slate-500 italic">No audit logs found in the last 100 actions.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
