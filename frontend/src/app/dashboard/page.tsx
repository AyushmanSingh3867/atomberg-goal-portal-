'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { LayoutDashboard, CheckSquare, Target, Clock, CheckCircle2, XCircle, Share2, Users, Loader2, MessageSquare, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { RoleGuard } from '@/components/RoleGuard';

export default function ManagerDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'APPROVALS' | 'CHECKINS' | 'SHARED'>('APPROVALS');
  
  const [pendingSheets, setPendingSheets] = useState<any[]>([]);
  const [teamCheckins, setTeamCheckins] = useState<any[]>([]);
  const [activeWindow, setActiveWindow] = useState<any>(null);
  
  const [reworkComment, setReworkComment] = useState('');
  const [managerComments, setManagerComments] = useState<Record<string, string>>({}); // goalSheetId -> comment

  // Shared goal form state
  const [sharedForm, setSharedForm] = useState({
    title: '', target_value: '', weightage: 10, uom_type: 'NUMERIC', thrust_area_id: '', employee_ids: [] as string[]
  });
  const [thrustAreas, setThrustAreas] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      
      const [pendingRes, winRes, teamRes, areasRes] = await Promise.all([
        api.manager.getPendingSheets().catch(() => ({ sheets: [] })),
        api.windows.getActive().catch(() => ({ activeWindow: null })),
        api.manager.getTeamGoals().catch(() => ({ team: [] })),
        api.goals.getThrustAreas().catch(() => ({ thrustAreas: [] }))
      ]);

      setPendingSheets(pendingRes.sheets || []);
      setTeamMembers(teamRes.team || []);
      setThrustAreas(areasRes.thrustAreas || []);

      if (winRes.activeWindow) {
        setActiveWindow(winRes.activeWindow);
        const checkinsRes = await api.checkins.getTeamCheckins(winRes.activeWindow.id).catch(() => ({ team: [] }));
        setTeamCheckins(checkinsRes.team || []);
        
        // Initialize comments
        const initialComments: any = {};
        (checkinsRes.team || []).forEach((member: any) => {
          if (member.goalSheets[0]?.checkInComments?.[0]) {
            initialComments[member.goalSheets[0].id] = member.goalSheets[0].checkInComments[0].comment;
          }
        });
        setManagerComments(initialComments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (sheetId: string) => {
    try {
      await api.manager.approve(sheetId);
      toast.success('Goal sheet approved');
      setPendingSheets(prev => prev.filter(s => s.id !== sheetId));
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    }
  };

  const handleReturn = async (sheetId: string) => {
    if (!reworkComment) {
      toast.error('Please provide a rework comment');
      return;
    }
    try {
      await api.manager.returnSheet(sheetId, reworkComment);
      toast.success('Goal sheet returned for rework');
      setPendingSheets(prev => prev.filter(s => s.id !== sheetId));
      setReworkComment('');
    } catch (err: any) {
      toast.error(err.message || 'Return failed');
    }
  };

  const handleSaveCheckinComment = async (sheetId: string) => {
    if (!activeWindow) return;
    try {
      await api.checkins.postComment(sheetId, activeWindow.id, managerComments[sheetId] || '');
      toast.success('Feedback saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save feedback');
    }
  };

  const handleCreateSharedGoal = async () => {
    try {
      if (!sharedForm.thrust_area_id) {
        toast.error('Please select a thrust area');
        return;
      }
      await api.manager.createSharedGoal(sharedForm);
      toast.success('Shared goal deployed to team members');
      setSharedForm({ ...sharedForm, title: '', target_value: '', employee_ids: [] });
    } catch (err: any) {
      toast.error(err.message || 'Deployment failed');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen radial-bg bg-dot-pattern flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full radial-bg bg-dot-pattern pt-10 pb-20 px-8 selection:bg-indigo-500/30 overflow-x-hidden min-h-screen">
      <div className="max-w-[1000px] mx-auto mb-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <LayoutDashboard className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent pb-1">
            Manager Dashboard
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 backdrop-blur-sm mb-8 w-fit">
          <button
            onClick={() => setActiveTab('APPROVALS')}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
              activeTab === 'APPROVALS' ? "bg-indigo-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Clock className="w-4 h-4" />
            Pending Approvals
            {pendingSheets.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{pendingSheets.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('CHECKINS')}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
              activeTab === 'CHECKINS' ? "bg-indigo-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <CheckSquare className="w-4 h-4" />
            Team Check-ins
          </button>
          <button
            onClick={() => setActiveTab('SHARED')}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
              activeTab === 'SHARED' ? "bg-indigo-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Share2 className="w-4 h-4" />
            Deploy Shared Goals
          </button>
        </div>

        {/* Tab 1: Approvals */}
        {activeTab === 'APPROVALS' && (
          <div className="space-y-6">
            {pendingSheets.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
                <CheckCircle2 className="w-16 h-16 text-emerald-500/50 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-300 mb-2">All Caught Up</h2>
                <p className="text-slate-500">You have no pending goal sheets to review.</p>
              </div>
            ) : (
              pendingSheets.map(sheet => (
                <div key={sheet.id} className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-md">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                        {sheet.employee.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-100">{sheet.employee.name}</h3>
                        <p className="text-slate-400 text-sm">{sheet.cycle.name} • {sheet.goals.length} Goals</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-2">
                        <input 
                          type="text"
                          placeholder="Rework comment (if returning)..."
                          className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-200 focus:border-amber-500 outline-none w-64"
                          onChange={e => setReworkComment(e.target.value)}
                        />
                        <div className="flex gap-2 justify-end">
                          <RoleGuard allowedRoles={['MANAGER', 'ADMIN']}>
                            <button 
                              onClick={() => handleReturn(sheet.id)}
                              className="px-4 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-md text-sm font-semibold transition border border-amber-500/20 flex items-center gap-1"
                            >
                              <XCircle className="w-4 h-4" /> Return
                            </button>
                            <button 
                              onClick={() => handleApprove(sheet.id)}
                              className="px-6 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-sm font-semibold transition flex items-center gap-1 shadow-lg shadow-emerald-500/20"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Approve & Lock
                            </button>
                          </RoleGuard>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {sheet.goals.map((g: any) => (
                      <div key={g.id} className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-indigo-400 text-xs font-bold uppercase">{g.thrustArea.name}</span>
                          <span className="text-slate-400 text-xs font-bold">{g.weightage}%</span>
                        </div>
                        <h4 className="text-slate-200 font-semibold text-sm mb-2">{g.title}</h4>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Target: <strong className="text-slate-300">{g.target_value}</strong></span>
                          <span>UoM: <strong className="text-slate-300">{g.uom_type}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Team Check-ins (Planned vs Actual) */}
        {activeTab === 'CHECKINS' && (
          <div className="space-y-6">
            {!activeWindow && (
              <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-center gap-3 backdrop-blur-sm mb-6">
                <Info className="w-5 h-5 text-blue-400" />
                <p className="text-blue-200 font-medium">No check-in window is currently active. Displaying latest available data.</p>
              </div>
            )}
            {teamCheckins.length === 0 ? (
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-10 rounded-3xl text-center shadow-2xl max-w-xl mx-auto relative overflow-hidden group my-8">
                {/* Background glow decoration */}
                <div className="absolute inset-0 bg-indigo-500/5 blur-[80px] rounded-full group-hover:bg-indigo-500/10 transition-colors duration-500 pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Users className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-100 mb-3 tracking-tight">No Reporting Team Members Found</h4>
                  <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                    This workspace is reserved for Managers with direct reporting team members. Active reporting lines and their quarterly performance check-ins will automatically populate here.
                  </p>
                </div>
              </div>
            ) : (
              teamCheckins.map(member => (
                <div key={member.id} className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-md">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-100">{member.name}</h3>
                      {!member.hasSheet && <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-xs font-bold">No Approved Goals</span>}
                    </div>
                    
                    {member.hasSheet && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">Quarter Progress</span>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-sm font-bold border",
                          member.overallScore >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          member.overallScore >= 50 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          {member.overallScore}%
                        </div>
                      </div>
                    )}
                  </div>

                  {member.hasSheet && (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left mb-6">
                          <thead className="text-xs text-slate-400 uppercase bg-black/20 border-y border-slate-800">
                            <tr>
                              <th className="px-4 py-3">Goal</th>
                              <th className="px-4 py-3">Target</th>
                              <th className="px-4 py-3">Achieved</th>
                              <th className="px-4 py-3 text-center">Score</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {member.goalSheets[0].goals.map((g: any) => {
                              const ach = g.achievements[0] || {};
                              const score = ach.progress_score ?? 0;
                              return (
                                <tr key={g.id} className="border-b border-slate-800/50">
                                  <td className="px-4 py-3 font-medium text-slate-200">{g.title}</td>
                                  <td className="px-4 py-3 text-slate-400">{g.target_value}</td>
                                  <td className="px-4 py-3 text-slate-300 font-medium">{ach.actual_value || '--'}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={cn("font-bold", score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400")}>
                                      {score}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={cn(
                                      "text-xs font-semibold px-2 py-0.5 rounded",
                                      ach.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-400" :
                                      ach.status === 'ON_TRACK' ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-400"
                                    )}>
                                      {ach.status?.replace('_', ' ') || 'NO DATA'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Manager Feedback Box */}
                      <div className="bg-black/20 p-4 rounded-xl border border-slate-800">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                          <MessageSquare className="w-3 h-3 text-indigo-400" /> Manager Check-in Discussion Notes
                        </label>
                        <div className="flex gap-3">
                          <textarea 
                            value={managerComments[member.goalSheets[0].id] || ''}
                            onChange={(e) => setManagerComments(prev => ({ ...prev, [member.goalSheets[0].id]: e.target.value }))}
                            placeholder="Document your check-in discussion, feedback, and next steps..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 outline-none h-20 resize-none"
                          />
                          <button 
                            onClick={() => handleSaveCheckinComment(member.goalSheets[0].id)}
                            className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Deploy Shared Goals */}
        {activeTab === 'SHARED' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-md">
              <h3 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" /> Create Shared Goal
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold mb-1 block">Goal Title</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200" 
                    value={sharedForm.title} onChange={e => setSharedForm({...sharedForm, title: e.target.value})} placeholder="e.g. Reduce departmental cost by 15%" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-semibold mb-1 block">Thrust Area</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                      value={sharedForm.thrust_area_id} onChange={e => setSharedForm({...sharedForm, thrust_area_id: e.target.value})}>
                      <option value="">Select Area</option>
                      {thrustAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-semibold mb-1 block">UoM Type</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                      value={sharedForm.uom_type} onChange={e => setSharedForm({...sharedForm, uom_type: e.target.value})}>
                      <option value="NUMERIC">Numeric</option>
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="TIMELINE">Timeline</option>
                      <option value="ZERO_BASED">Zero-Based</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-semibold mb-1 block">Target Value</label>
                    <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200" 
                      value={sharedForm.target_value} onChange={e => setSharedForm({...sharedForm, target_value: e.target.value})} placeholder="Target" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-semibold mb-1 block">Mandatory Weightage (%)</label>
                    <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200" 
                      value={sharedForm.weightage} onChange={e => setSharedForm({...sharedForm, weightage: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-md flex flex-col">
              <h3 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> Select Assignees
              </h3>
              
              <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                {teamMembers.map(member => (
                  <label key={member.id} className="flex items-center gap-3 p-3 bg-black/20 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                      checked={sharedForm.employee_ids.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSharedForm(s => ({ ...s, employee_ids: [...s.employee_ids, member.id] }));
                        else setSharedForm(s => ({ ...s, employee_ids: s.employee_ids.filter(id => id !== member.id) }));
                      }}
                    />
                    <span className="text-slate-200 font-medium">{member.name}</span>
                  </label>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <button 
                  onClick={handleCreateSharedGoal}
                  disabled={sharedForm.employee_ids.length === 0}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" /> Deploy to {sharedForm.employee_ids.length} Member(s)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
