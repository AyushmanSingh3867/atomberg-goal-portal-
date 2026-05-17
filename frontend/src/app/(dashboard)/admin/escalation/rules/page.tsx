"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const TRIGGER_LABELS: Record<string, string> = {
  goal_not_submitted: "Goal Not Submitted",
  goal_not_approved:  "Goal Not Approved",
  checkin_missed:     "Check-in Missed",
};

const LEVEL_LABELS: Record<string, string> = {
  employee: "Employee",
  manager:  "Manager",
  hr:       "HR / Admin",
};

const LEVEL_COLORS: Record<string, string> = {
  employee: "text-blue-400  bg-blue-400/10",
  manager:  "text-amber-400 bg-amber-400/10",
  hr:       "text-red-400   bg-red-400/10",
};

const defaultForm = {
  name:           "",
  trigger_type:   "goal_not_submitted",
  days_threshold: 3,
  notify_level:   "employee",
};

export default function EscalationRulesPage() {
  const [rules,     setRules]     = useState<any[]>([]);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState(defaultForm);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [triggering,setTriggering]= useState(false);

  const fetchRules = async () => {
    const { data } = await api.get("/escalation/rules");
    setRules(data.rules ?? []);
  };

  useEffect(() => { fetchRules(); }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error("Rule name required");
    setLoading(true);
    try {
      if (editId) {
        await api.put(`/escalation/rules/${editId}`, form);
        toast.success("Rule updated");
      } else {
        await api.post("/escalation/rules", {
          ...form,
          days_threshold: Number(form.days_threshold),
        });
        toast.success("Rule created");
      }
      setShowForm(false);
      setForm(defaultForm);
      setEditId(null);
      fetchRules();
    } catch {
      toast.error("Failed to save rule");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule: any) => {
    setForm({
      name:           rule.name,
      trigger_type:   rule.trigger_type,
      days_threshold: rule.days_threshold,
      notify_level:   rule.notify_level,
    });
    setEditId(rule.id);
    setShowForm(true);
  };

  const handleToggle = async (rule: any) => {
    await api.put(`/escalation/rules/${rule.id}`, {
      is_active: !rule.is_active,
    });
    fetchRules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await api.delete(`/escalation/rules/${id}`);
    toast.success("Rule deleted");
    fetchRules();
  };

  const handleManualTrigger = async () => {
    setTriggering(true);
    try {
      await api.post("/escalation/trigger");
      toast.success("Escalation check completed — check logs");
    } catch {
      toast.error("Trigger failed");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            Escalation Rules
          </h1>
          <p className="text-slate-400 mt-1">
            Configure automated escalation triggers and notification chains
          </p>
        </div>
        <div className="flex gap-3">
          {/* Manual trigger — useful for demo */}
          <button
            onClick={handleManualTrigger}
            disabled={triggering}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-400/5 transition-all disabled:opacity-50"
          >
            {triggering ? "Running..." : "▶ Run Now"}
          </button>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-all"
          >
            + New Rule
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4 mb-6 flex gap-3">
        <span className="text-indigo-400 text-lg">⏰</span>
        <p className="text-indigo-300 text-sm">
          Escalation rules run automatically every day at <strong>9:00 AM IST</strong>.
          Use &quot;Run Now&quot; to trigger manually for testing or demo purposes.
        </p>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-3xl p-8 mb-6">
          <h3 className="text-lg font-bold text-white mb-6">
            {editId ? "Edit Rule" : "New Escalation Rule"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Rule Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Remind employees after 3 days"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Trigger type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Trigger Condition
              </label>
              <select
                value={form.trigger_type}
                onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all"
              >
                <option value="goal_not_submitted">Goal Not Submitted</option>
                <option value="goal_not_approved"> Goal Not Approved by Manager</option>
                <option value="checkin_missed">    Check-in Not Completed</option>
              </select>
            </div>

            {/* Days threshold */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Trigger After (Days)
              </label>
              <input
                type="number"
                min={1} max={90}
                value={form.days_threshold}
                onChange={(e) => setForm((f) => ({ ...f, days_threshold: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all"
              />
              <p className="text-slate-500 text-xs mt-1">
                How many days must pass before escalating
              </p>
            </div>

            {/* Notify level */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Notify
              </label>
              <select
                value={form.notify_level}
                onChange={(e) => setForm((f) => ({ ...f, notify_level: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all"
              >
                <option value="employee">Employee directly</option>
                <option value="manager"> Employee&apos;s Manager</option>
                <option value="hr">      HR / Admin</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 bg-slate-800/50 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              Rule Preview
            </p>
            <p className="text-slate-300 text-sm">
              If{" "}
              <span className="text-indigo-400 font-medium">
                {TRIGGER_LABELS[form.trigger_type]}
              </span>{" "}
              after{" "}
              <span className="text-amber-400 font-medium">
                {form.days_threshold} days
              </span>
              , notify{" "}
              <span className="text-emerald-400 font-medium">
                {LEVEL_LABELS[form.notify_level]}
              </span>{" "}
              via email.
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : editId ? "Update Rule" : "Create Rule"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-6 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-medium hover:text-white transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-3xl">
          <p className="text-4xl mb-4">⚙️</p>
          <p className="text-slate-400 font-medium">No escalation rules yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Create a rule to start automated escalations
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`border rounded-2xl p-6 transition-all ${
                rule.is_active
                  ? "bg-slate-900/40 border-slate-800"
                  : "bg-slate-900/20 border-slate-800/40 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-white font-semibold">{rule.name}</h4>
                    {!rule.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                        Disabled
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-400">If</span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium">
                      {TRIGGER_LABELS[rule.trigger_type]}
                    </span>
                    <span className="text-slate-400">after</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-400/10 text-amber-400 text-xs font-bold">
                      {rule.days_threshold} days
                    </span>
                    <span className="text-slate-400">→ notify</span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${LEVEL_COLORS[rule.notify_level]}`}>
                      {LEVEL_LABELS[rule.notify_level]}
                    </span>
                  </div>

                  <p className="text-slate-500 text-xs mt-2">
                    Triggered {rule._count?.logs ?? 0} times
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      rule.is_active ? "bg-indigo-600" : "bg-slate-600"
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      rule.is_active ? "left-6" : "left-1"
                    }`} />
                  </button>

                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
