import React, { useEffect, useState } from 'react';
import { useAuthStore, type Role } from '@/store/authStore';
import { useIncidentStore } from '@/store/incidentStore';
import { Shield, Activity, Database, ChevronDown, LogOut, User, RefreshCw, CheckCircle } from 'lucide-react';
import MapWorkspace from './MapWorkspace';
import IncidentTelemetry from './IncidentTelemetry';
import AIInspectorDrawer from './AIInspectorDrawer';

const ROLES: Role[] = ['Command Commissioner', 'Field Inspector', 'Transit Planner'];

const ROLE_COLORS: Record<Role, string> = {
  'Command Commissioner': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'Field Inspector':      'text-green-400 bg-green-500/10 border-green-500/30',
  'Transit Planner':      'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

const ROLE_DOTS: Record<Role, string> = {
  'Command Commissioner': 'bg-blue-400',
  'Field Inspector':      'bg-green-400',
  'Transit Planner':      'bg-purple-400',
};

export default function DashboardLayout() {
  const { user, logout, switchRole } = useAuthStore();
  const { setIncidents, incidents } = useIncidentStore();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchIncidents = async () => {
    if (!user?.token) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('http://localhost:8000/api/incidents', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setIncidents(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSwitchRole = async (targetRole: Role) => {
    setShowRoleMenu(false);
    if (!user?.token) return;
    try {
      const station = targetRole === 'Field Inspector' ? (user?.police_station || 'Yelahanka') : null;
      const res = await fetch('http://localhost:8000/api/auth/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          role: targetRole,
          police_station: station
        })
      });

      if (res.ok) {
        const data = await res.json();
        switchRole(targetRole, station, data.access_token);
      }
    } catch (err) {
      console.error('Failed to switch role', err);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [user?.username, user?.role, user?.token]);

  const highCount = incidents.filter(i => i.priority === 'High').length;
  const role = user?.role ?? 'Field Inspector';

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">

      {/* ── Left Sidebar ── */}
      <aside className="w-80 flex flex-col z-10 border-r border-border" style={{ background: 'hsl(var(--sidebar-bg, 222 47% 6%))' }}>

        {/* Brand header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-widest gradient-text">RESILIO</h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Command System</p>
            </div>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => { setShowUserMenu(v => !v); setShowRoleMenu(false); }}
              className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <User className="w-4 h-4 text-primary" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-10 w-52 glass rounded-xl shadow-2xl border border-border z-50 py-2 overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-semibold">{user?.username}</p>
                  <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                </div>
                <button onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors">
                  <LogOut className="w-3 h-3" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Role Switcher */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">Active Role</p>
          <div className="relative">
            <button
              onClick={() => { setShowRoleMenu(v => !v); setShowUserMenu(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all hover:opacity-90 ${ROLE_COLORS[role]}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full live-pulse ${ROLE_DOTS[role]}`} />
                {role}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRoleMenu ? 'rotate-180' : ''}`} />
            </button>

            {showRoleMenu && (
              <div className="absolute top-10 left-0 right-0 glass rounded-xl border border-border shadow-2xl z-50 py-1 overflow-hidden">
                {ROLES.map(r => (
                  <button key={r} onClick={() => handleSwitchRole(r)}
                    className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-muted transition-colors ${r === role ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${ROLE_DOTS[r]}`} />
                      {r}
                    </div>
                    {r === role && <CheckCircle className="w-3 h-3 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Role-Specific Operation Widget */}
        <div className="px-4 py-3 border-b border-border shrink-0 bg-secondary/10">
          {role === 'Field Inspector' && (
            <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
              <p className="text-[9px] text-green-400 font-bold uppercase tracking-widest mb-1">Inspector Jurisdiction</p>
              <p className="text-xs font-semibold text-foreground">{user?.police_station || 'HAL Old Airport'} PS Division</p>
              <p className="text-[10px] text-muted-foreground mt-1">Telemetry and clearance controls are locked to this division.</p>
            </div>
          )}
          {role === 'Command Commissioner' && (
            <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mb-1">Commissioner Dashboard</p>
              <p className="text-xs font-semibold text-foreground">Global dispatch command</p>
              <p className="text-[10px] text-muted-foreground mt-1">Full global overview of all active sectors with incident override controls.</p>
            </div>
          )}
          {role === 'Transit Planner' && (
            <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
              <p className="text-[9px] text-purple-400 font-bold uppercase tracking-widest mb-1">Transit Analytics Control</p>
              <p className="text-xs font-semibold text-foreground">Traffic Optimization System</p>
              <p className="text-[10px] text-muted-foreground mt-1">Accessing LightGBM prediction pipelines and adaptive routing suggestions.</p>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-px border-b border-border shrink-0 bg-border">
          {[
            { label: 'Total', value: incidents.length, color: 'text-foreground' },
            { label: 'Critical', value: highCount, color: 'text-destructive' },
            { label: 'Zones', value: new Set(incidents.map(i => i.zone)).size, color: 'text-primary' }
          ].map(stat => (
            <div key={stat.label} className="bg-card flex flex-col items-center justify-center py-3">
              <span className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Header row for telemetry list */}
        <div className="px-4 py-2.5 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Live Telemetry</span>
          <button onClick={fetchIncidents} disabled={isRefreshing}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </button>
        </div>

        {/* Incident list */}
        <div className="flex-1 overflow-y-auto">
          <IncidentTelemetry incidents={incidents} />
        </div>
      </aside>

      {/* ── Center Map ── */}
      <div className="flex-1 relative">
        {/* Floating top badges */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <div className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-pulse" />
            <Activity className="w-3 h-3 text-green-400" />
            <span className="text-[10px] font-medium text-green-400">System Optimal</span>
          </div>
          <div className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20">
            <Database className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-medium text-primary">GPU Accelerated</span>
          </div>
          {highCount > 0 && (
            <div className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-destructive/30 glow-red">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive live-pulse" />
              <span className="text-[10px] font-medium text-destructive">{highCount} Critical</span>
            </div>
          )}
        </div>

        {/* Bengaluru label */}
        <div className="absolute bottom-8 left-4 z-20">
          <div className="glass px-3 py-1.5 rounded-lg border border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Coverage Area</p>
            <p className="text-xs font-semibold text-foreground">Bengaluru, Karnataka</p>
          </div>
        </div>

        <MapWorkspace />
      </div>

      {/* ── Right AI Drawer ── */}
      <AIInspectorDrawer />
    </div>
  );
}
