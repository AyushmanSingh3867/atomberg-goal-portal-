'use client';

import React, { useState, useEffect } from 'react';
import { useGoalStore, Goal } from '../store/useGoalStore';
import { PlusCircle, Trash2, Send, Activity, Target, Weight, CheckCircle2, Circle, Edit3, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import toast from 'react-hot-toast';
import { CustomDropdown } from '@/components/CustomDropdown';
import { api } from '@/lib/api';

export default function GoalSettingPage() {
  const { goals, addGoal, updateGoal, removeGoal, getTotalWeightage, clearGoals } = useGoalStore();
  const [thrustArea, setThrustArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [thrustAreas, setThrustAreas] = useState<{value: string; label: string; icon: string; color: string}[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const areasRes = await api.goals.getThrustAreas();
        const colorMap: Record<string, string> = { 'Innovation & R&D': 'bg-purple-500', 'Revenue Growth': 'bg-emerald-500', 'Operational Efficiency': 'bg-blue-500' };
        const iconMap: Record<string, string> = { 'Innovation & R&D': '💡', 'Revenue Growth': '📈', 'Operational Efficiency': '⚙️' };
        setThrustAreas(areasRes.thrustAreas.map((a: any) => ({
          value: a.id,
          label: a.name,
          icon: iconMap[a.name] || '🎯',
          color: colorMap[a.name] || 'bg-indigo-500',
        })));
        const cyclesRes = await api.goals.getActiveCycles();
        if (cyclesRes.cycles.length > 0) setActiveCycleId(cyclesRes.cycles[0].id);
      } catch (err) {
        console.error('Init error:', err);
        toast.error('Failed to connect to server. Is the backend running?');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleAddGoal = () => {
    addGoal({
      id: generateId(),
      thrust_area_id: thrustArea || thrustAreas[0]?.value || '',
      title: '',
      description: '',
      uom_type: 'NUMERIC',
      target_value: '',
      weightage: 0,
    });
  };

  const handleSubmit = async () => {
    if (!activeCycleId) { toast.error('No active goal cycle found.'); return; }
    setIsSubmitting(true);
    try {
      const apiGoals = goals.map(g => ({
        thrust_area_id: g.thrust_area_id || thrustArea,
        title: g.title,
        description: g.description || undefined,
        uom_type: g.uom_type,
        target_value: g.target_value,
        weightage: g.weightage,
      }));
      await api.goals.submit(activeCycleId, apiGoals);
      setIsSubmitting(false);
      setIsSuccess(true);
      toast.success('Goal Sheet saved to database!');
      setTimeout(() => { setIsSuccess(false); clearGoals(); setThrustArea(''); }, 2000);
    } catch (err: any) {
      setIsSubmitting(false);
      toast.error(err.message || 'Submission failed');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen radial-bg bg-dot-pattern flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const totalWeight = getTotalWeightage();
  
  // Validation Rules
  const is100Percent = totalWeight === 100;
  const isMin10Percent = goals.length > 0 && goals.every(g => g.weightage >= 10);
  const isMax8Goals = goals.length > 0 && goals.length <= 8;
  const isReadyToSubmit = is100Percent && isMin10Percent && isMax8Goals;

  // Circular Progress Calculation
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(totalWeight, 100) / 100) * circumference;
  
  const getProgressColor = () => {
    if (totalWeight === 100) return '#10b981'; // Emerald
    if (totalWeight > 100) return '#ef4444'; // Red
    return '#fbbf24'; // Gold
  };

  const getBorderColor = (areaValue: string) => {
    const area = thrustAreas.find(a => a.value === areaValue);
    if (!area) return 'border-l-indigo-500';
    if (area.color === 'bg-purple-500') return 'border-l-purple-500';
    if (area.color === 'bg-emerald-500') return 'border-l-emerald-500';
    return 'border-l-blue-500';
  };

  return (
    <div className="w-full radial-bg bg-dot-pattern pt-10 pb-20 px-8 selection:bg-indigo-500/30 overflow-x-hidden min-h-screen">
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[900px] mx-auto mb-10"
      >
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <Target className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent pb-1">
            Goal Setting Portal
          </h1>
        </div>
        <p className="text-slate-400 text-lg ml-16">Define your Phase 1 targets and align your thrust areas.</p>
      </motion.div>

      <div className="max-w-[900px] mx-auto space-y-8">
        
        {/* Global Controls & Status */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/[0.03] backdrop-blur-xl border border-indigo-500/30 p-6 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.1)] flex flex-col md:flex-row gap-6 items-center justify-between relative z-20"
        >
          <div className="flex-1 w-full space-y-3 pl-3 border-l-2 border-indigo-500/80">
            <label className="text-xs font-semibold text-slate-100/50 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Selected Thrust Area
            </label>
            <CustomDropdown 
              value={thrustArea}
              onChange={setThrustArea}
              options={thrustAreas}
            />
          </div>

          <div className="flex items-center gap-4 min-w-[200px] justify-end pr-2">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-400/80 mb-1 tracking-wide">Total Weightage</span>
              <div className="flex items-baseline gap-1">
                <span className="text-slate-500 font-medium">Out of 100%</span>
              </div>
            </div>
            
            <div className="relative w-20 h-20 flex items-center justify-center bg-[#0f0f1a] rounded-full shadow-inner border border-white/5">
              <svg width="100%" height="100%" viewBox="0 0 100 100" className="-rotate-90 transform origin-center absolute inset-0">
                <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="50" cy="50" r={radius} 
                  stroke={getProgressColor()} 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={strokeDashoffset} 
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out" 
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col z-10">
                <span className={cn(
                  "text-xl font-bold transition-colors duration-500",
                  totalWeight > 100 ? "text-red-400" : totalWeight === 100 ? "text-emerald-400" : "text-amber-400"
                )}>
                  <CountUp end={totalWeight} duration={0.8} preserveValue />%
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Live Validation Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap gap-4 items-center justify-center relative z-10"
        >
          <div className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-300 backdrop-blur-md",
            is100Percent 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
              : "bg-slate-900/40 border-slate-800/80 text-slate-500"
          )}>
            {is100Percent ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-slate-600" />}
            <span className="text-xs font-bold uppercase tracking-wider">Total weightage = 100%</span>
          </div>

          <div className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-300 backdrop-blur-md",
            isMin10Percent 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
              : "bg-slate-900/40 border-slate-800/80 text-slate-500"
          )}>
            {isMin10Percent ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-slate-600" />}
            <span className="text-xs font-bold uppercase tracking-wider">Min 10% per goal</span>
          </div>

          <div className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-300 backdrop-blur-md",
            isMax8Goals 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
              : "bg-slate-900/40 border-slate-800/80 text-slate-500"
          )}>
            {isMax8Goals ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-slate-600" />}
            <span className="text-xs font-bold uppercase tracking-wider">Max 8 goals</span>
          </div>
        </motion.div>

        {/* Goals List */}
        <div className="space-y-4 relative z-0">
          <AnimatePresence>
            {goals.map((goal, index) => (
              <motion.div 
                key={goal.id} 
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "group bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-600/80 p-5 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden border-l-[6px]",
                  getBorderColor(thrustArea)
                )}
              >
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 shadow-inner">
                      {index + 1}
                    </div>
                    <div className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">
                      {goal.uom_type}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 mr-2">
                      <button className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-md transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => removeGoal(goal.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Weightage Chip Top Right */}
                    <div className="bg-[#1a1a2e] border border-slate-700/50 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-inner">
                      <Weight className="w-3.5 h-3.5 text-indigo-400" />
                      <input 
                        type="number" 
                        min="0" max="100"
                        placeholder="0"
                        value={goal.weightage || ''}
                        onChange={(e) => updateGoal(goal.id, { weightage: parseFloat(e.target.value) || 0 })}
                        className="w-12 bg-transparent text-right text-sm font-bold text-slate-200 focus:outline-none focus:text-indigo-300"
                      />
                      <span className="text-slate-500 font-bold">%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 space-y-1">
                    <input 
                      type="text" 
                      placeholder="Enter goal title..."
                      value={goal.title}
                      onChange={(e) => updateGoal(goal.id, { title: e.target.value })}
                      className="w-full bg-transparent border-b-2 border-slate-700/50 px-2 py-2 text-lg font-medium text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 hover:bg-white/[0.02] rounded-t-lg"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-1">
                    <select 
                      value={goal.uom_type}
                      onChange={(e) => updateGoal(goal.id, { uom_type: e.target.value as Goal['uom_type'] })}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="NUMERIC">Numeric</option>
                      <option value="PERCENTAGE">Percent</option>
                      <option value="TIMELINE">Date</option>
                      <option value="ZERO_BASED">Yes/No</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <input 
                      type={goal.uom_type === 'TIMELINE' ? 'date' : 'text'}
                      placeholder="Target"
                      value={goal.target_value}
                      onChange={(e) => updateGoal(goal.id, { target_value: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {goals.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 mt-4 animate-dash-border flex flex-col items-center justify-center text-slate-400 bg-white/[0.01] backdrop-blur-sm relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full scale-150 animate-pulse" />
                  <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <Target className="w-10 h-10 text-indigo-400 relative z-10" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-200 mb-2">No goals yet</h3>
                <p className="text-slate-500 text-center max-w-sm mb-6">Start defining your performance metrics by adding your first goal. Remember, each goal must be at least 10%.</p>
                <button 
                  onClick={handleAddGoal}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors border border-slate-700"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                  Add New Goal
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 pt-8 mt-10 border-t border-slate-800/60 pb-12 relative z-0">
          <button 
            onClick={handleAddGoal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-medium hover:scale-[1.02] transition-all duration-200 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)]"
          >
            <PlusCircle className="w-5 h-5" />
            Add New Goal
          </button>

          <button 
            onClick={handleSubmit}
            disabled={!isReadyToSubmit || isSubmitting || isSuccess}
            className={cn(
              "w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3.5 rounded-xl font-bold transition-all duration-300 group",
              isReadyToSubmit && !isSubmitting && !isSuccess
                ? "bg-gradient-to-br from-amber-500 to-amber-400 text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] cursor-pointer" 
                : isSuccess
                  ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  : "bg-slate-800/40 text-slate-600 opacity-40 cursor-not-allowed border border-slate-700/50"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Submitted
              </>
            ) : (
              <>
                Submit Goal Sheet
                <Send className={cn("w-5 h-5", isReadyToSubmit && "group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300")} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
