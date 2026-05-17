'use client';

import React from 'react';
import { useAuthStore, Role } from '../store/useAuthStore';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return null; // Or a spinner if preferred
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
