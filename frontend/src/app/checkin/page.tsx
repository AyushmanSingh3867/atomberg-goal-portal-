'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Target, Activity, AlertCircle, Calendar, Save, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import toast from 'react-hot-toast';

export default function CheckinPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeWindow, setActiveWindow] = useState<any>(null);
  const [goalSheet, setGoalSheet] = useState<any>(null);
  const [overallScore, setOverallScore] = useState(0);
  
  // Local state for achievement inputs before saving
  const [achievements, setAchievements] = useState<Record<string, { value: string, status: string, notes: string, score: number, id?: string }>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const winRes = await api.windows.getActive();
        
        if (winRes.activeWindow) {
          setActiveWindow(winRes.activeWindow);
          const data = await api.achievements.getMy(winRes.activeWindow.id);
          setGoalSheet(data.goalSheet);
          setOverallScore(data.overallScore);
          
          // Initialize local state
          const initialAchievements: any = {};
          data.goalSheet.goals.forEach((g: any) => {
            const existing = g.achievements[0];
            initialAchievements[g.id] = {
              id: existing?.id,
              value: existing?.actual_value || '',
              status: existing?.status || 'NOT_STARTED',
              notes: existing?.employee_notes || '',
              score: existing?.progress_score || 0
            };
          });
          setAchievements(initialAchievements);
        } else {
          setActiveWindow(null); // No active window
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute live score locally based on formula
  const computeLiveScore = (goal: any, actualValue: string) => {
    const target = parseFloat(goal.target_value);
    const actual = parseFloat(actualValue);

    if (goal.uom_type === 'NUMERIC' || goal.uom_type === 'PERCENTAGE') {
      if (isNaN(target) || isNaN(actual)) return 0;
      if (goal.uom_direction === 'MIN') {
        return Math.min(Math.round((actual / target) * 100), 100);
      } else {
        if (actual === 0) return 100;
        return Math.min(Math.round((target / actual) * 100), 100);
      }
    } else if (goal.uom_type === 'TIMELINE') {
      const deadline = new Date(goal.target_value).getTime();
      const completed = new Date(actualValue).getTime();
      if (isNaN(deadline) || isNaN(completed)) return 0;
      if (completed <= deadline) return 100;
      return 0; // Simplified live calculation for timeline
    } else if (goal.uom_type === 'ZERO_BASED') {
      if (isNaN(actual)) return 0;
      return actual === 0 ? 100 : 0;
    }
    return 0;
  };

  const handleUpdate = (goalId: string, field: string, value: string, goal: any) => {
    setAchievements(prev => {
      const current = prev[goalId];
      const updated = { ...current, [field]: value };
      
      if (field === 'value') {
        updated.score = computeLiveScore(goal, value);
      }
      
      return { ...prev, [goalId]: updated };
    });
  };

  const handleSave = async (goal: any) => {
    if (!activeWindow) return;
    
    setIsSubmitting(true);
    const data = achievements[goal.id];
    
    try {
      if (data.id) {
        // Update
        const res = await api.achievements.update(data.id, data.value, data.status, data.notes);
        toast.success('Achievement updated');
        // Update local score with server computed score
        setAchievements(prev => ({
          ...prev,
          [goal.id]: { ...prev[goal.id], score: res.progress_score }
        }));
      } else {
        // Create
        const res = await api.achievements.submit(goal.id, activeWindow.id, data.value, data.status, data.notes);
        toast.success('Achievement saved');
        setAchievements(prev => ({
          ...prev,
          [goal.id]: { ...prev[goal.id], id: res.achievement.id, score: res.progress_score }
        }));
      }
      
      // Refresh overall score
      const freshData = await api.achievements.getMy(activeWindow.id);
      setOverallScore(freshData.overallScore);
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen radial-bg bg-dot-pattern flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  // Circular Progress Calculation
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(overallScore, 100) / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };
  const getStrokeColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#fbbf24';
    return '#ef4444';
  };

  return (
    <div className="w-full radial-bg bg-dot-pattern pt-10 pb-20 px-8 selection:bg-indigo-500/30 overflow-x-hidden min-h-screen">
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[900px] mx-auto mb-8"
      >
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <Activity className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent pb-1">
            Performance Check-in
          </h1>
        </div>
        
        {!activeWindow ? (
          <div className="mt-6 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center gap-3 backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <p className="text-amber-200 font-medium">Check-in window is currently closed. You can view your past data but cannot make edits.</p>
          </div>
        ) : (
          <p className="text-slate-400 text-lg ml-16 flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-medium">{activeWindow.period.replace('_', ' ')} Window Open</span>
            <span>(Closes {new Date(activeWindow.closes_at).toLocaleDateString()})</span>
          </p>
        )}
      </motion.div>

      {goalSheet ? (
        <div className="max-w-[900px] mx-auto space-y-8">
          
          {/* Summary Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/[0.03] backdrop-blur-xl border border-indigo-500/30 p-6 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.1)] flex items-center justify-between relative z-20"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Overall Progress</h2>
              <p className="text-sm text-slate-400">Weighted average across all goals in this quarter</p>
            </div>
            
            <div className="relative w-24 h-24 flex items-center justify-center bg-[#0f0f1a] rounded-full shadow-inner border border-white/5">
              <svg width="100%" height="100%" viewBox="0 0 100 100" className="-rotate-90 transform origin-center absolute inset-0">
                <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="50" cy="50" r={radius} 
                  stroke={getStrokeColor(overallScore)} 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={strokeDashoffset} 
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out" 
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col z-10">
                <span className={cn("text-2xl font-bold transition-colors duration-500", getScoreColor(overallScore))}>
                  <CountUp end={overallScore} duration={1} preserveValue decimals={1} />%
                </span>
              </div>
            </div>
          </motion.div>

          {/* Goal Cards */}
          <div className="space-y-6">
            {goalSheet.goals.map((goal: any, index: number) => {
              const data = achievements[goal.id];
              const isLocked = !activeWindow;
              
              return (
                <motion.div 
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-md relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-xs font-bold uppercase">
                          {goal.thrustArea.name}
                        </span>
                        {goal.is_shared && (
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                            <Info className="w-3 h-3" /> Shared Goal
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-100">{goal.title}</h3>
                      <div className="text-sm text-slate-400 mt-1 flex items-center gap-4">
                        <span>Target: <strong className="text-slate-200">{goal.target_value}</strong></span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span>UoM: <strong className="text-slate-200">{goal.uom_type} {goal.uom_type === 'NUMERIC' ? `(${goal.uom_direction})` : ''}</strong></span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span>Weightage: <strong className="text-slate-200">{goal.weightage}%</strong></span>
                      </div>
                    </div>
                    
                    {/* Live Progress Bar for Goal */}
                    <div className="flex flex-col items-end w-32">
                      <span className={cn("text-2xl font-bold mb-1", getScoreColor(data.score))}>
                        {Math.round(data.score)}%
                      </span>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${Math.min(data.score, 100)}%`,
                            backgroundColor: getStrokeColor(data.score)
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                    
                    {/* Achievement Input */}
                    <div className="md:col-span-4 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actual Achievement</label>
                      <input 
                        type={goal.uom_type === 'TIMELINE' ? 'date' : 'text'}
                        value={data.value}
                        onChange={(e) => handleUpdate(goal.id, 'value', e.target.value, goal)}
                        disabled={isLocked}
                        placeholder={goal.uom_type === 'NUMERIC' ? 'e.g. 4500000' : 'Enter value...'}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Status Dropdown */}
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                      <select
                        value={data.status}
                        onChange={(e) => handleUpdate(goal.id, 'status', e.target.value, goal)}
                        disabled={isLocked}
                        className={cn(
                          "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed appearance-none",
                          data.status === 'NOT_STARTED' && "text-slate-400",
                          data.status === 'ON_TRACK' && "text-amber-400",
                          data.status === 'COMPLETED' && "text-emerald-400"
                        )}
                      >
                        <option value="NOT_STARTED">⚪ Not Started</option>
                        <option value="ON_TRACK">🟡 On Track</option>
                        <option value="COMPLETED">🟢 Completed</option>
                      </select>
                    </div>

                    {/* Employee Notes */}
                    <div className="md:col-span-5 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between">
                        <span>Notes</span>
                        {!isLocked && (
                          <button 
                            onClick={() => handleSave(goal)}
                            disabled={isSubmitting || !data.value}
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px]"
                          >
                            <Save className="w-3 h-3" /> Save Update
                          </button>
                        )}
                      </label>
                      <input 
                        type="text"
                        value={data.notes}
                        onChange={(e) => handleUpdate(goal.id, 'notes', e.target.value, goal)}
                        disabled={isLocked}
                        placeholder="Optional remarks..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  
                  {/* Manager Comment Area (if any) */}
                  {goalSheet.checkInComments && goalSheet.checkInComments.length > 0 && index === goalSheet.goals.length - 1 && (
                     <div className="mt-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                       <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                         <span className="text-xs font-bold text-blue-400">M</span>
                       </div>
                       <div>
                         <p className="text-xs font-semibold text-blue-400 mb-1">Manager&apos;s Feedback (This Quarter)</p>
                         <p className="text-sm text-slate-300 leading-relaxed">{goalSheet.checkInComments[0].comment}</p>
                       </div>
                     </div>
                  )}

                </motion.div>
              );
            })}
          </div>

        </div>
      ) : (
        <div className="max-w-[900px] mx-auto text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800">
          <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-300 mb-2">No Approved Goals Found</h2>
          <p className="text-slate-500">Your goal sheet must be approved by your manager before you can enter achievements.</p>
        </div>
      )}
    </div>
  );
}
