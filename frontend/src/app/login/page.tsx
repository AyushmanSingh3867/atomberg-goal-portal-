'use client';

import React, { useState } from 'react';
import { Target, Lock, Mail, Activity, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Suspense } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      setUser(res.user);
      toast.success(`Welcome back, ${res.user.name}!`);
      router.push(res.user.role === 'ADMIN' ? '/admin' : res.user.role === 'MANAGER' ? '/dashboard' : '/');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#05050a] flex items-center justify-center p-4 z-[200]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full animate-pulse delay-700"></div>
      </div>

      <div className="w-full max-w-[440px] relative">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10 group cursor-default">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl blur-[12px] opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.4)] mb-6 transition-transform duration-500 hover:rotate-6">
              <Target className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight text-center">
            Performance Portal
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Enterprise Performance Governance</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-700 font-medium"
                  placeholder="name@atomberg.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-black py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black">
                <span className="bg-slate-900 px-4 text-slate-500 tracking-widest">Enterprise SSO</span>
              </div>
            </div>

            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'https://atomberg-backend.onrender.com/api'}/auth/azure/login`}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-all group"
            >
              {/* Microsoft Logo */}
              <div className="grid grid-cols-2 gap-0.5 w-5 h-5 flex-shrink-0">
                <div className="bg-[#f25022] rounded-sm" />
                <div className="bg-[#7fba00] rounded-sm" />
                <div className="bg-[#00a4ef] rounded-sm" />
                <div className="bg-[#ffb900] rounded-sm" />
              </div>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                Sign in with Microsoft
              </span>
            </a>

            {/* Show error if SSO failed */}
            {searchParams.get("error") && (
              <p className="text-red-400 text-sm text-center mt-3">
                {decodeURIComponent(searchParams.get("error") || "")}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-8">
          By signing in, you agree to our <span className="text-slate-400">Terms of Service</span> and <span className="text-slate-400">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05050a] flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
