import React, { useEffect, useState } from 'react';
import { useAuthStore, type Role } from '@/store/authStore';
import { useIncidentStore } from '@/store/incidentStore';
import { Shield, Activity, Database, ChevronDown, LogOut, User, RefreshCw, CheckCircle, Download } from 'lucide-react';
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
  const { 
    setIncidents, incidents, 
    proxyAlerts, setProxyAlerts, 
    simulationData, setSimulationData, 
    transitData, setTransitData 
  } = useIncidentStore();
  
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Sandbox simulation states
  const [footfall, setFootfall] = useState(15000);
  const [vehicles, setVehicles] = useState(6000);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Transit overlays state
  const [showBusLanes, setShowBusLanes] = useState(false);

  const fetchIncidents = async () => {
    if (!user?.token) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('http://localhost:8080/api/incidents', {
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

  const fetchProxyAlerts = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch('http://localhost:8080/api/proxy-alerts', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProxyAlerts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const runSimulation = async () => {
    if (!user?.token) return;
    setIsSimulating(true);
    try {
      // Mock event polygon vertices around Chinnaswamy Stadium / central Bengaluru
      const coords = [
        [77.5960, 12.9870],
        [77.6010, 12.9920],
        [77.6080, 12.9830],
        [77.5990, 12.9780]
      ];
      
      const res = await fetch('http://localhost:8080/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          coordinates: coords,
          footfall,
          vehicles
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setSimulationData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const toggleBusLanes = async (checked: boolean) => {
    setShowBusLanes(checked);
    if (!checked) {
      setTransitData(null);
      return;
    }
    if (!user?.token) return;
    try {
      const res = await fetch('http://localhost:8080/api/transit/multi-modal', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransitData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchRole = async (targetRole: Role, targetPS?: string) => {
    setShowRoleMenu(false);
    if (!user?.token) return;
    try {
      const station = targetRole === 'Field Inspector' ? (targetPS || user?.police_station || 'HAL Old Airport') : null;
      const res = await fetch('http://localhost:8080/api/auth/switch-role', {
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
        // Clear any simulator state when switching roles
        setSimulationData(null);
        setTransitData(null);
        setShowBusLanes(false);
      }
    } catch (err) {
      console.error('Failed to switch role', err);
    }
  };

  const handleExportCSV = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch('http://localhost:8080/api/incidents/export/csv', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `incident_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        console.error('Failed to export CSV');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchProxyAlerts();
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
              <select
                value={user?.police_station || 'HAL Old Airport'}
                onChange={e => handleSwitchRole('Field Inspector', e.target.value)}
                className="w-full mt-1.5 bg-[#0b0f19] border border-green-500/30 rounded px-2 py-1.5 text-xs text-green-300 font-semibold focus:outline-none focus:border-green-500"
              >
                {['Yelahanka', 'HAL Old Airport', 'Sadashivanagar', 'Halasuru Gate', 'Byatarayanapura', 'Yeshwanthpura', 'Hennuru', 'Kodigehalli', 'Banaswadi', 'K.R. Pura'].map(ps => (
                  <option key={ps} value={ps}>{ps} PS Division</option>
                ))}
              </select>
              <p className="text-[9px] text-muted-foreground mt-1.5">Telemetry and clearance controls are locked to this division.</p>
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

        {/* Accordion Panels for Transit Planner */}
        {role === 'Transit Planner' && (
          <div className="px-4 py-2 border-b border-border space-y-2 shrink-0 bg-secondary/5">
            {/* Sandbox Card */}
            <div className="p-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5 space-y-2">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Digital Twin Sandbox</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[9px] text-muted-foreground block">Footfall Surge</label>
                  <input type="number" value={footfall} onChange={e => setFootfall(parseInt(e.target.value) || 0)} className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground block">Vehicles Surge</label>
                  <input type="number" value={vehicles} onChange={e => setVehicles(parseInt(e.target.value) || 0)} className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <button onClick={runSimulation} disabled={isSimulating} className="w-full text-[10px] font-bold py-1 bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors disabled:opacity-50">
                {isSimulating ? "Simulating..." : "Run Scenario Simulation"}
              </button>
              {simulationData && (
                <div className="p-1.5 bg-black/30 rounded border border-orange-500/20 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impact:</span>
                    <span className="font-bold text-orange-400 capitalize">{simulationData.impact_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Spillback Delay:</span>
                    <span className="font-bold text-orange-400">+{simulationData.predicted_spillback_minutes}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bottlenecks:</span>
                    <span className="text-orange-300 font-medium">{simulationData.bottleneck_nodes?.length || 0} Nodes</span>
                  </div>
                </div>
              )}
            </div>

            {/* Transit priority overlay */}
            <div className="p-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Multi-Modal Overlays</span>
                <input type="checkbox" checked={showBusLanes} onChange={e => toggleBusLanes(e.target.checked)} className="rounded border-border text-purple-600 focus:ring-purple-500 focus:ring-offset-background h-3.5 w-3.5" />
              </div>
              <p className="text-[9px] text-muted-foreground">Draw emergency Bus Priority Lanes and calculate BMTC reroutes.</p>
              {transitData && (
                <div className="space-y-1 text-[9px] max-h-24 overflow-y-auto">
                  <p className="font-semibold text-green-400 uppercase tracking-wide">BMTC Dispatch Suggestions:</p>
                  {transitData.rerouting_suggestions?.map((r: any, idx: number) => (
                    <div key={idx} className="p-1 bg-green-500/5 rounded border border-green-500/10">
                      <span className="font-bold text-foreground font-mono">Route {r.route_no}</span>: {r.reroute_via}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cross-Agency Alternative Data Feeds (Weather & Anomalies) */}
        {proxyAlerts && (
          <div className="px-4 py-2.5 border-b border-border shrink-0 bg-secondary/5 space-y-2 max-h-44 overflow-y-auto">
            <div className="flex items-center justify-between text-[10px] font-bold text-orange-400 uppercase tracking-wider">
              <span>Alternative Data Feeds</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 lowercase text-[9px] font-normal font-mono">
                {proxyAlerts.weather?.intensity_mm_hr}mm/h rain
              </span>
            </div>
            <div className="space-y-1.5 text-[10px]">
              {proxyAlerts.anomalies?.map((anom: any) => (
                <div key={anom.id} className="p-1.5 rounded border border-border bg-card space-y-0.5">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-primary font-semibold uppercase">{anom.source}</span>
                    <span className="text-muted-foreground">{anom.time}</span>
                  </div>
                  <p className="font-semibold text-foreground">{anom.title}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{anom.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
          <div className="flex items-center gap-3">
            <button onClick={handleExportCSV} title="Export Active Logs (Excel/CSV)"
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-green-400 transition-colors">
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
            <button onClick={fetchIncidents} disabled={isRefreshing}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </button>
          </div>
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
