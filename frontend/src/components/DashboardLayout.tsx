import { useEffect, useState } from 'react';
import { useAuthStore, type Role } from '@/store/authStore';
import { useIncidentStore } from '@/store/incidentStore';
import { Shield, ChevronDown, LogOut, User, RefreshCw, CheckCircle, Download, Compass, X } from 'lucide-react';
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
    setProxyAlerts, 
    simulationData, setSimulationData, 
    transitData, setTransitData,
    selectedIncidentId,
    deployedRoutes, setDeployedRoutes,
    footfall, setFootfall,
    vehicles, setVehicles
  } = useIncidentStore();
  
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tactical Routing & Notification states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  };
  
  // Sandbox simulation states
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
        triggerToast("Tactical logs synced with city telemetry feed.", "info");
      }
    } catch (err) {
      console.error('Failed to fetch incidents', err);
      triggerToast("Telemetry connection timeout.", "warning");
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
        triggerToast(`Simulation Complete: City impact is ${data.impact_level.toUpperCase()}. Spillback delay: +${data.predicted_spillback_minutes}m.`, 'info');
        
        // Dynamically update priority routes deck if transit overlay is enabled
        if (showBusLanes) {
          fetchTransitRecommendations(footfall, vehicles);
        }
      }
    } catch (err) {
      console.error(err);
      triggerToast("Sandbox twin simulation failed to respond.", "warning");
    } finally {
      setIsSimulating(false);
    }
  };

  const fetchTransitRecommendations = async (currentFootfall: number, currentVehicles: number) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`http://localhost:8080/api/transit/multi-modal?footfall=${currentFootfall}&vehicles=${currentVehicles}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransitData(data);
      }
    } catch (err) {
      console.error("Failed to fetch transit recommendations", err);
    }
  };

  const toggleBusLanes = async (checked: boolean) => {
    setShowBusLanes(checked);
    if (!checked) {
      setTransitData(null);
      return;
    }
    await fetchTransitRecommendations(footfall, vehicles);
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
        switchRole(targetRole, station || undefined, data.access_token);
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

  useEffect(() => {
    const handleGlobalClick = () => {
      setShowRoleMenu(false);
      setShowUserMenu(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const highCount = incidents.filter(i => i.priority === 'High').length;
  const role = user?.role ?? 'Field Inspector';
  const showBottomDeck = !!selectedIncidentId || (role === 'Transit Planner' && showBusLanes && !!transitData);

  return (
    <div className="w-screen h-screen flex flex-col bg-zinc-950 text-foreground overflow-hidden font-sans select-none">
      {/* ── Solid Global Header (Top Anchor) ── */}
      <header className="w-full h-16 bg-zinc-950 border-b border-zinc-800 shrink-0 flex items-center justify-between px-6 z-50">
        {/* Left: Brand typography + pulsing system status */}
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-rose-500 shrink-0" />
          <span className="font-bold text-sm tracking-widest text-white">RESILIO COMMAND PLATFORM</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {/* Center: Inline layouts (Role Selector, Jurisdiction selector, Transit Overlay, Sign-Out) */}
        <div className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800/80 px-4 py-1.5 rounded-xl">
          {/* Role Selector */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowRoleMenu(v => !v); setShowUserMenu(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/8 text-[11px] font-medium transition-all hover:bg-white/5 ${ROLE_COLORS[role]}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full live-pulse ${ROLE_DOTS[role]}`} />
              <span>{role}</span>
              <ChevronDown className="w-3 h-3 text-white/50" />
            </button>
            {showRoleMenu && (
              <div className="absolute top-8 left-0 w-44 bg-zinc-950 rounded-lg border border-white/8 shadow-2xl py-1 overflow-hidden z-50">
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

          {/* Jurisdiction select dropdown */}
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

          {/* Transit Overlay Toggle */}
          {role === 'Transit Planner' && (
            <>
              <div className="w-[1px] h-5 bg-white/10" />
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showBusLanes} 
                  onChange={e => toggleBusLanes(e.target.checked)} 
                  className="rounded border-white/20 text-emerald-500 focus:ring-emerald-500 bg-[#0b0f19] h-3.5 w-3.5 cursor-pointer" 
                />
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-mono">Transit Overlay</span>
              </label>
            </>
          )}

          <div className="w-[1px] h-5 bg-white/10" />

          {/* User profile */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowUserMenu(v => !v); setShowRoleMenu(false); }}
              className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              title={`${user?.username} (${user?.email})`}
            >
              <User className="w-3 h-3 text-white/70" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-8 w-44 bg-zinc-950 rounded-lg shadow-2xl border border-white/8 py-1.5 overflow-hidden z-50">
                <div className="px-3 py-1.5">
                  <p className="text-[10px] font-semibold text-white/90">{user?.username}</p>
                  <p className="text-[9px] text-white/40">{user?.email}</p>
                </div>
              </div>
            )}
          </div>

          <div className="w-[1px] h-5 bg-white/10" />

          {/* Separated Sign Out Button */}
          <button
            onClick={() => logout()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-semibold transition-all duration-200 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Right Area: Integrated Telemetry Counters (bright rose font-mono) */}
        <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-semibold">Active Incidents:</span>
            <span className="text-rose-400 font-bold text-sm tracking-widest">{incidents.length}</span>
          </div>
          <div className="w-[1px] h-4 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-semibold">Critical Threats:</span>
            <span className="text-rose-400 font-bold text-sm tracking-widest">{highCount}</span>
          </div>
        </div>
      </header>

      {/* ── Main Layout Body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* ── Formally Docked Left Sidebar ── */}
        <aside className="w-80 h-full bg-zinc-900 border-r border-zinc-850 flex flex-col p-4 overflow-hidden z-30 no-print">
          {/* Live Telemetry Header */}
          <div className="flex items-center justify-between shrink-0 pb-2 border-b border-white/8 mb-3">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest font-mono">Live Telemetry</span>
            <div className="flex items-center gap-2">
              <button onClick={handleExportCSV} title="Export Logs"
                className="flex items-center gap-1 text-[9px] text-white/40 hover:text-green-400 transition-colors cursor-pointer">
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
              <button onClick={fetchIncidents} disabled={isRefreshing}
                className="flex items-center gap-1 text-[9px] text-white/40 hover:text-primary transition-colors disabled:opacity-50 cursor-pointer">
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Scrollable Telemetry list */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-transparent pr-1">
            <IncidentTelemetry incidents={incidents} />
          </div>

          {/* Digital Twin Sandbox (Planner only) */}
          {role === 'Transit Planner' && (
            <div className="shrink-0 glass-panel border border-white/8 rounded-xl p-3.5 space-y-3 shadow-2xl bg-black/25 mt-4 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 live-pulse" />
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono">Digital Twin Sandbox</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9px] text-white/60 uppercase tracking-wider font-mono font-bold block select-none leading-normal">
                    Footfall Surge
                  </label>
                  <input
                    type="number"
                    value={footfall}
                    onChange={e => setFootfall(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0b0f19] border border-white/15 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none block leading-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9px] text-white/60 uppercase tracking-wider font-mono font-bold block select-none leading-normal">
                    Vehicles Surge
                  </label>
                  <input
                    type="number"
                    value={vehicles}
                    onChange={e => setVehicles(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0b0f19] border border-white/15 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none block leading-none"
                  />
                </div>
              </div>

              <button onClick={runSimulation} disabled={isSimulating} className="w-full text-[9px] font-bold py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors uppercase tracking-wider disabled:opacity-50 cursor-pointer">
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

          {/* Operational Coverage */}
          <div className="shrink-0 glass-panel px-3.5 py-2.5 rounded-xl border border-white/8 shadow-xl bg-black/15 mt-2">
            <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono font-semibold">Operational Coverage</p>
            <p className="text-xs font-bold text-foreground">Bengaluru, Karnataka</p>
          </div>
        </aside>

        {/* ── Right Workspace Column (Map + Split-Pane Detail Deck) ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* Dedicated Interactive Map Viewport */}
          <div className="flex-1 min-h-0 relative bg-zinc-950">
            <MapWorkspace />

            {/* Simulation Alert Banner */}
            {simulationData && (
              <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto ${
                simulationData.impact_level === 'low' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' :
                simulationData.impact_level === 'moderate' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]' :
                'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              }`}>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    simulationData.impact_level === 'low' ? 'bg-emerald-400' :
                    simulationData.impact_level === 'moderate' ? 'bg-amber-400' :
                    'bg-rose-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    simulationData.impact_level === 'low' ? 'bg-emerald-500' :
                    simulationData.impact_level === 'moderate' ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`}></span>
                </span>
                
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider font-semibold">
                  <span>Simulation Complete:</span>
                  <span className={`font-bold ${
                    simulationData.impact_level === 'low' ? 'text-emerald-300' :
                    simulationData.impact_level === 'moderate' ? 'text-amber-300' :
                    'text-rose-300'
                  }`}>
                    City Impact is {simulationData.impact_level.toUpperCase()}
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span>Spillback Delay:</span>
                  <span className="text-white">+{simulationData.predicted_spillback_minutes}m</span>
                  <span className="text-zinc-500">|</span>
                  <span>Bottlenecks:</span>
                  <span className="text-white">{simulationData.bottleneck_nodes?.length || 0} Nodes</span>
                </div>
                
                <button 
                  onClick={() => setSimulationData(null)}
                  className="ml-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss Simulation"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Split-Pane Detail Panel (Bottom-Right Deck) */}
          <div className={`transition-all duration-300 ease-in-out bg-[#090d16] shrink-0 overflow-hidden flex flex-col relative z-20 ${
            showBottomDeck ? 'h-72 border-t border-zinc-800' : 'h-0 border-t-0'
          }`}>
            {selectedIncidentId ? (
              <AIInspectorDrawer />
            ) : showBusLanes && transitData ? (
              <div className="w-full h-full flex flex-col p-4 select-none">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                      Dynamic Transit Priority Routing Optimization Deck
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto flex gap-4 min-w-0 pb-1 items-stretch">
                  {transitData.rerouting_suggestions?.map((r: any, idx: number) => {
                    const isEmergencyReroute = r.reroute_via !== "Maintain regular transit path";
                    return (
                      <div key={idx} className={`w-80 shrink-0 rounded-xl flex flex-col justify-between p-3.5 shadow-inner transition-all duration-300 ${
                        isEmergencyReroute 
                          ? "bg-amber-500/5 border border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.05)] animate-pulse" 
                          : "bg-emerald-500/5 border border-emerald-500/10"
                      }`}>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`px-2 py-0.5 rounded font-bold text-[9px] font-mono border ${
                              isEmergencyReroute
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}>
                              {r.route_no}
                            </span>
                            <span className="text-[8px] text-white/30 font-semibold uppercase tracking-wider">BMTC Transit</span>
                          </div>
                          <p className="text-[10px] text-white/40 leading-tight mb-1">{r.issue}</p>
                          <p className={`text-[10px] font-medium leading-snug ${
                            isEmergencyReroute ? 'text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]' : 'text-emerald-300'
                          }`}>
                            <span className="text-white/40">Divert:</span> {r.reroute_via}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setDeployedRoutes(prev => [...prev, r.route_no]);
                            triggerToast(`Tactical Priority Deployed: BMTC ${r.route_no} successfully rerouted via ${r.reroute_via}. Signals synced.`, 'success');
                          }}
                          disabled={deployedRoutes.includes(r.route_no)}
                          className={`mt-2 w-full text-[9px] font-bold py-1.5 rounded transition-all uppercase tracking-wider ${
                            deployedRoutes.includes(r.route_no)
                              ? isEmergencyReroute
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 cursor-default"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                              : isEmergencyReroute
                                ? "bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                          }`}
                        >
                          {deployedRoutes.includes(r.route_no) ? "✓ Deployed & Signals Synced" : "Deploy Priority Reroute"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {/* ── Dynamic Tactical Alert Toast ── */}
      {toast && (
        <div className="absolute top-20 right-4 z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`glass-panel px-4 py-2.5 rounded-xl border flex items-center gap-2.5 shadow-2xl ${
            toast.type === 'success' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-950/20' :
            toast.type === 'warning' ? 'border-yellow-500/30 text-yellow-300 bg-yellow-950/20' :
            'border-cyan-500/30 text-cyan-300 bg-cyan-950/20'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                toast.type === 'success' ? 'bg-emerald-400' :
                toast.type === 'warning' ? 'bg-yellow-400' :
                'bg-cyan-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                toast.type === 'success' ? 'bg-emerald-500' :
                toast.type === 'warning' ? 'bg-yellow-500' :
                'bg-cyan-500'
              }`}></span>
            </span>
            <span className="text-[11px] font-medium tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
