'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../lib/api';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LoginPage from '@/app/login/page';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setLoading(true);
    // Fetch current user
    api.auth.me()
      .then((res) => {
        if (res.user) {
          setUser(res.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [setUser, setLoading]);

  useEffect(() => {
    if (isLoading) return;

    // Route Protection Logic
    if (user) {
      if (pathname === '/dashboard' && user.role === 'EMPLOYEE') {
        router.push('/');
      }
      if (pathname === '/admin' && user.role !== 'ADMIN') {
        router.push('/');
      }
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#05050a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return <LoginPage />;
  }

  return <>{children}</>;
}
