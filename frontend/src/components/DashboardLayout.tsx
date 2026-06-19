import React, { useEffect, useState } from 'react';
import { useAuthStore, type Role } from '@/store/authStore';
import { useIncidentStore } from '@/store/incidentStore';
import { Shield, Activity, Database, ChevronDown, LogOut, User, RefreshCw, CheckCircle, Download, Bus, Compass } from 'lucide-react';
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
    <div className="relative w-screen h-screen bg-[#070b13] text-foreground overflow-hidden font-sans">
      {/* ── Background Map Viewport ── */}
      <div className="absolute inset-0 z-10">
        <MapWorkspace />
      </div>

      {/* ── Top-Left Header Control Pill ── */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3.5 glass-panel px-4 py-2 rounded-xl border border-white/8 shadow-lg pointer-events-auto">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <span className="font-bold text-sm tracking-widest gradient-text">RESILIO</span>
        </div>
        <div className="w-[1px] h-5 bg-white/10" />
        
        {/* Role Selector */}
        <div className="relative">
          <button
            onClick={() => { setShowRoleMenu(v => !v); setShowUserMenu(false); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/8 text-[11px] font-medium transition-all hover:bg-white/5 ${ROLE_COLORS[role]}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full live-pulse ${ROLE_DOTS[role]}`} />
            <span>{role}</span>
            <ChevronDown className="w-3 h-3 text-white/50" />
          </button>
          {showRoleMenu && (
            <div className="absolute top-8 left-0 w-44 glass-panel rounded-lg border border-white/8 shadow-2xl py-1 overflow-hidden z-50">
              {ROLES.map(r => (
                <button key={r} onClick={() => handleSwitchRole(r)}
                  className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center justify-between hover:bg-white/5 transition-colors ${r === role ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${ROLE_DOTS[r]}`} />
                    {r}
                  </div>
                  {r === role && <CheckCircle className="w-3 h-3 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Jurisdiction dropdown */}
        {role === 'Field Inspector' && (
          <>
            <div className="w-[1px] h-5 bg-white/10" />
            <select
              value={user?.police_station || 'HAL Old Airport'}
              onChange={e => handleSwitchRole('Field Inspector', e.target.value)}
              className="bg-[#0b0f19]/80 border border-green-500/30 rounded-lg px-2 py-1 text-[11px] text-green-300 font-medium focus:outline-none"
            >
              {['Yelahanka', 'HAL Old Airport', 'Sadashivanagar', 'Halasuru Gate', 'Byatarayanapura', 'Yeshwanthpura', 'Hennuru', 'Kodigehalli', 'Banaswadi', 'K.R. Pura'].map(ps => (
                <option key={ps} value={ps}>{ps} PS</option>
              ))}
            </select>
          </>
        )}

        <div className="w-[1px] h-5 bg-white/10" />

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(v => !v); setShowRoleMenu(false); }}
            className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <User className="w-3 h-3 text-white/70" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-8 w-44 glass-panel rounded-lg shadow-2xl border border-white/8 py-1.5 overflow-hidden z-50">
              <div className="px-3 py-1.5 border-b border-white/5">
                <p className="text-[10px] font-semibold text-white/90">{user?.username}</p>
                <p className="text-[9px] text-white/40">{user?.email}</p>
              </div>
              <button onClick={() => { logout(); setShowUserMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-[10px] text-destructive hover:bg-destructive/10 flex items-center gap-1.5 transition-colors">
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Top-Right Global Metrics ── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-6 glass-panel px-5 py-2.5 rounded-xl border border-white/8 shadow-lg pointer-events-auto">
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono font-semibold">Active Incidents</span>
          <span className="text-sm font-bold text-white tabular-nums">{incidents.length}</span>
        </div>
        <div className="w-[1px] h-6 bg-white/10" />
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono font-semibold">Critical Priority</span>
          <span className="text-sm font-bold text-destructive/90 tabular-nums">{highCount}</span>
        </div>
      </div>

      {/* ── Left-Side Telemetry Strip ── */}
      <aside className="absolute left-4 top-20 bottom-52 w-80 z-20 flex flex-col rounded-2xl glass-panel shadow-2xl border border-white/8 overflow-hidden no-print pointer-events-auto">
        <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-white/8 bg-[#09090b]/40">
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest font-mono">Live Telemetry</span>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} title="Export Logs"
              className="flex items-center gap-1 text-[9px] text-white/40 hover:text-green-400 transition-colors">
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>
            <button onClick={fetchIncidents} disabled={isRefreshing}
              className="flex items-center gap-1 text-[9px] text-white/40 hover:text-primary transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-transparent">
          <IncidentTelemetry incidents={incidents} />
        </div>
      </aside>

      {/* ── Bottom-Left Digital Twin / Coverage Area Group ── */}
      <div className="absolute left-4 bottom-4 w-80 z-20 flex flex-col gap-2.5 no-print pointer-events-auto">
        <div className="glass-panel px-3.5 py-2.5 rounded-xl border border-white/8 shadow-xl">
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono font-semibold">Operational Coverage</p>
          <p className="text-xs font-bold text-foreground">Bengaluru, Karnataka</p>
        </div>

        {/* Digital Twin Sandbox (Planner only) */}
        {role === 'Transit Planner' && (
          <div className="glass-panel border border-white/8 rounded-xl p-3.5 space-y-3 shadow-2xl">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 live-pulse" />
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono">Digital Twin Sandbox</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <label className="text-[8px] text-white/40 block mb-0.5 uppercase tracking-wider font-mono">Footfall Surge</label>
                <input type="number" value={footfall} onChange={e => setFootfall(parseInt(e.target.value) || 0)} className="w-full input-recessed rounded-lg px-2 py-1 text-[11px] focus:outline-none" />
              </div>
              <div>
                <label className="text-[8px] text-white/40 block mb-0.5 uppercase tracking-wider font-mono">Vehicles Surge</label>
                <input type="number" value={vehicles} onChange={e => setVehicles(parseInt(e.target.value) || 0)} className="w-full input-recessed rounded-lg px-2 py-1 text-[11px] focus:outline-none" />
              </div>
            </div>

            <button onClick={runSimulation} disabled={isSimulating} className="w-full text-[9px] font-bold py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors uppercase tracking-wider disabled:opacity-50">
              {isSimulating ? "Simulating..." : "Run Scenario Simulation"}
            </button>

            {simulationData && (
              <div className="p-2 bg-black/40 rounded-lg border border-orange-500/20 text-[9px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-white/40">Sandbox Impact:</span>
                  <span className="font-bold text-orange-400 capitalize">{simulationData.impact_level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Predicted Delay:</span>
                  <span className="font-bold text-orange-400">+{simulationData.predicted_spillback_minutes}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Bottleneck Intersections:</span>
                  <span className="text-orange-300 font-bold">{simulationData.bottleneck_nodes?.length || 0} Nodes</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Flagship Horizon Bottom Dock ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[700px] z-20 glass-panel rounded-2xl border border-white/8 p-4 flex flex-col gap-3.5 shadow-2xl pointer-events-auto no-print">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
              Dynamic Transit Priority Routing Optimization Deck
            </span>
          </div>
          
          {role === 'Transit Planner' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-white/40 uppercase tracking-wider font-mono">Priority Overlay</span>
              <input 
                type="checkbox" 
                checked={showBusLanes} 
                onChange={e => toggleBusLanes(e.target.checked)} 
                className="rounded border-white/10 text-emerald-500 focus:ring-emerald-500 bg-background h-3.5 w-3.5" 
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {transitData ? (
            transitData.rerouting_suggestions?.map((r: any, idx: number) => (
              <div key={idx} className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex flex-col justify-between gap-2 shadow-inner">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[9px] font-mono">
                      {r.route_no}
                    </span>
                    <span className="text-[8px] text-white/30 font-semibold uppercase tracking-wider">BMTC Transit</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-tight mb-1">{r.issue}</p>
                  <p className="text-[10px] font-medium text-emerald-300 leading-snug">
                    <span className="text-white/40">Divert:</span> {r.reroute_via}
                  </p>
                </div>
                <button className="mt-1 w-full text-[9px] font-bold py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors uppercase tracking-wider">
                  Deploy Priority Reroute
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center py-6 text-center text-white/30 border border-dashed border-white/5 rounded-xl">
              <Bus className="w-6 h-6 mb-1 text-white/20" />
              <p className="text-[9px] font-bold tracking-wider uppercase">No Active Transit Diversions</p>
              <p className="text-[8px] text-white/20 leading-snug mt-0.5">Toggle Priority Overlay to compute live bus lane bypasses.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Floating AI Drawer ── */}
      <AIInspectorDrawer />
    </div>
  );
}
