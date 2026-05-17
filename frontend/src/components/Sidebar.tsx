'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Target, Activity, Settings, FileText, CheckSquare, ShieldAlert, ChevronLeft, ChevronRight, Bell, PieChart, AlertTriangle, List, History } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../lib/api';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeWindow, setActiveWindow] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Fetch active check-in window to show badge
    api.windows.getActive().then(res => {
      if (res.activeWindow) {
        setActiveWindow(res.activeWindow);
      }
    }).catch(() => {});

    // Fetch notifications
    const fetchNotifs = () => {
      if (user) {
        api.notifications.getAll().then(res => setNotifications(res)).catch(() => {});
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000); // 10s poll
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  const navItems = [
    { icon: Target, label: 'Goal Setting', path: '/', roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
    { icon: CheckSquare, label: 'Check-in', path: '/checkin', roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
    { icon: LayoutDashboard, label: 'Manager Dashboard', path: '/dashboard', roles: ['MANAGER', 'ADMIN'] },
    { icon: Activity, label: 'Performance', path: '/performance', roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
    { icon: FileText, label: 'Reports', path: '/admin/reports', roles: ['MANAGER', 'ADMIN'] },
    { icon: PieChart, label: 'Analytics', path: '/admin/analytics', roles: ['ADMIN'] },
    { icon: AlertTriangle, label: 'Escalation Rules', path: '/admin/escalation/rules', roles: ['ADMIN'] },
    { icon: List, label: 'Escalation Logs', path: '/admin/escalation/logs', roles: ['ADMIN'] },
    { icon: ShieldAlert, label: 'Admin Panel', path: '/admin', roles: ['ADMIN'] },
    { icon: History, label: 'Audit Trail', path: '/admin/audit', roles: ['ADMIN'] },
  ];

  const visibleNavItems = navItems.filter(item => !user || item.roles.includes(user.role));

  return (
    <aside 
      className={cn(
        "sticky top-0 h-screen bg-[#0a0a0a] border-r border-slate-800/60 flex flex-col pt-8 pb-6 shadow-2xl z-50 transition-all duration-300 shrink-0 self-start",
        isCollapsed ? "w-[80px]" : "w-[240px]"
      )}
    >
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-full p-1 shadow-lg z-50"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Brand & Notifications */}
      <div className={cn("flex items-center mb-12", isCollapsed ? "justify-center px-0 flex-col gap-4" : "px-6 justify-between")}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <Target className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 tracking-tight whitespace-nowrap">
              Atomberg
            </span>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-white transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute left-full top-0 ml-4 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-left-2 duration-200">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Alerts</h3>
                <button onClick={handleMarkAllRead} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest">Clear All</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-600 italic text-sm">No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={cn(
                        "p-4 border-b border-slate-800/50 cursor-pointer hover:bg-white/[0.02] transition-colors",
                        !n.is_read && "bg-indigo-500/5"
                      )}
                      onClick={async () => {
                        if (!n.is_read) await api.notifications.markRead(n.id);
                        if (n.link) router.push(n.link);
                        setShowNotifications(false);
                      }}
                    >
                      <p className="text-xs font-bold text-slate-200 mb-1">{n.title}</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                      <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">{new Date(n.created_at).toLocaleTimeString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center rounded-xl transition-all duration-200 text-sm font-medium group",
                isCollapsed ? "justify-center py-3 px-0" : "justify-between px-4 py-3",
                isActive 
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400")} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </div>
              
              {/* Active Window Badge for Check-in tab */}
              {item.path === '/checkin' && activeWindow && !isCollapsed && (
                <div className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Window Status Box */}
      {activeWindow && !isCollapsed && (
        <div className="px-4 mb-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">{activeWindow.period.replace('_', ' ')} Open</p>
            <p className="text-[10px] text-emerald-500/70 mt-0.5">Submit your achievements</p>
          </div>
        </div>
      )}

      {/* Footer / Logout */}
      <div className={cn("mt-auto p-4 border-t border-slate-800/50", isCollapsed && "px-2")}>
        <div className={cn(
          "bg-slate-900/40 border border-slate-800/60 rounded-xl flex items-center p-3 gap-3 mb-3",
          isCollapsed && "justify-center px-0"
        )}>
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black text-xs shrink-0">
            {user?.name ? user.name.substring(0, 1).toUpperCase() : 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-widest">{user?.role}</p>
            </div>
          )}
        </div>

        <button 
          onClick={async () => {
            await api.auth.logout();
            window.location.href = '/login';
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-all group"
        >
          <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
          {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
