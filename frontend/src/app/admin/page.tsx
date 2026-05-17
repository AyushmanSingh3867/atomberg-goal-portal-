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

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

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
      <div className="mb-8">
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

      <div className="flex gap-4 mb-8">
        <button onClick={() => setActiveTab('cycles')} className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${activeTab === 'cycles' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
          <CalendarPlus className="w-4 h-4" /> Goal Cycles
        </button>
        <button onClick={() => setActiveTab('unlock')} className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${activeTab === 'unlock' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
          <Unlock className="w-4 h-4" /> Unlock Goals
        </button>
        <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${activeTab === 'audit' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
          <FileText className="w-4 h-4" /> Audit Logs
        </button>
      </div>

      {activeTab === 'cycles' && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 max-w-xl">
          <h2 className="text-xl font-bold mb-4">Create Goal Cycle</h2>
          <form onSubmit={handleCreateCycle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Cycle Name (e.g., FY2025-26)</label>
              <input type="text" value={cycleName} onChange={e=>setCycleName(e.target.value)} required className="w-full bg-black/40 border border-slate-700 rounded-lg p-2.5 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Start Date</label>
                <input type="datetime-local" value={startDate} onChange={e=>setStartDate(e.target.value)} required className="w-full bg-black/40 border border-slate-700 rounded-lg p-2.5 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">End Date</label>
                <input type="datetime-local" value={endDate} onChange={e=>setEndDate(e.target.value)} required className="w-full bg-black/40 border border-slate-700 rounded-lg p-2.5 text-white" />
              </div>
            </div>
            <button disabled={isLoading} className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />} Create Cycle
            </button>
          </form>
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
