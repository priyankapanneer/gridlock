import React, { useState } from 'react';
import { useIncidentStore } from '@/store/incidentStore';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';
import { X, Clock, Users, Cone, Route, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AIInspectorDrawer() {
  const { 
    selectedIncidentId, incidents, selectIncident, 
    predictionData, prescriptiveData, isLoadingPredict, 
    setIncidents, sopBriefing 
  } = useIncidentStore();
  const { user } = useAuthStore();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Ground feedback states
  const [officersDeployed, setOfficersDeployed] = useState(0);
  const [barricadesDeployed, setBarricadesDeployed] = useState(0);
  const [feedbackResult, setFeedbackResult] = useState<any | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const incident = incidents.find(i => i.id === selectedIncidentId);

  // Reset feedback state when selected incident changes
  React.useEffect(() => {
    setFeedbackResult(null);
    setOfficersDeployed(0);
    setBarricadesDeployed(0);
  }, [selectedIncidentId]);

  if (!selectedIncidentId || !incident) return null;

  const handleUpdateStatus = async (newStatus: string) => {
    if (!user?.token) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`http://localhost:8080/api/incidents/${incident.id}/status?status=${newStatus}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (res.ok) {
        const updatedIncidents = incidents.map(i => i.id === incident.id ? { ...i, status: newStatus } : i);
        setIncidents(updatedIncidents);
      }
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;
    setIsSubmittingFeedback(true);
    try {
      const res = await fetch(`http://localhost:8080/api/incidents/${incident.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          officers_deployed: officersDeployed,
          barricades_deployed: barricadesDeployed
        })
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbackResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const isInspector = user?.role === 'Field Inspector';
  const isCommissioner = user?.role === 'Command Commissioner';
  const isPlanner = user?.role === 'Transit Planner';
  const canResolve = isCommissioner || (isInspector && incident.police_station === user?.police_station);

  return (
    <div className="w-full h-full flex items-stretch gap-4 p-4 overflow-x-auto min-w-0 bg-[#090d16] select-none pr-10">
      
      {/* CARD 1: Incident Overview & Clear Status */}
      <div className="w-72 shrink-0 glass-panel border border-white/8 rounded-xl p-3 flex flex-col justify-between bg-black/15">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest font-mono">Telemetry Event</span>
            <button onClick={() => selectIncident(null)} className="text-white/40 hover:text-white/80 p-0.5 hover:bg-white/5 rounded cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <h3 className="text-xs font-bold text-white leading-snug truncate">{incident.address}</h3>
          <p className="text-[10px] text-white/40 font-mono mt-1 mb-2">ID: {incident.id}</p>
          
          <div className="flex items-center justify-between p-2 bg-[#0b0f19]/80 rounded-lg border border-white/5 text-[11px] mb-2">
            <span className="text-white/50 font-mono uppercase text-[9px]">Status</span>
            <Badge className={cn(
              "capitalize font-medium text-[9px] px-1.5 py-0.5",
              incident.status === 'active' ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"
            )}>
              {incident.status}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5 shrink-0">
          {canResolve ? (
            incident.status === 'active' ? (
              <button
                onClick={() => handleUpdateStatus('resolved')}
                disabled={isUpdatingStatus}
                className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold py-1.5 px-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors border border-green-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Clear Incident
              </button>
            ) : (
              <button
                onClick={() => handleUpdateStatus('active')}
                disabled={isUpdatingStatus}
                className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors border border-red-500/20 disabled:opacity-50 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Re-open Incident
              </button>
            )
          ) : (
            <div className="p-2 bg-yellow-500/5 border border-yellow-500/10 rounded-lg text-[9px] text-yellow-500/80 leading-normal">
              Only inspectors from <strong>{incident.police_station} PS</strong> can clear this event.
            </div>
          )}
        </div>
      </div>

      {/* CARD 2: LightGBM Predictions & SHAP explainability */}
      {isLoadingPredict ? (
        <div className="w-80 shrink-0 glass-panel border border-white/8 rounded-xl p-3 flex flex-col justify-center items-center gap-3 bg-black/15">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p className="text-[10px] text-muted-foreground animate-pulse font-mono">Running LightGBM Inference...</p>
        </div>
      ) : (
        predictionData && (
          <div className="w-80 shrink-0 glass-panel border border-white/8 rounded-xl p-3 flex flex-col justify-between bg-black/15 overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-white/5">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Time-to-Clear
                </span>
                <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20 px-1 py-0">
                  LightGBM v4
                </Badge>
              </div>
              <div className="text-3xl font-black text-center my-1.5 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.4)] font-mono">
                {predictionData.eta_minutes} <span className="text-xs text-muted-foreground font-normal">min</span>
              </div>
              
              <div className="space-y-1.5 mt-2">
                <h4 className="text-[9px] font-bold text-white/40 uppercase tracking-wider font-mono">SHAP Contribution Metrics</h4>
                {Object.entries(predictionData.shap_values).map(([feature, value]) => (
                  <div key={feature} className="flex flex-col gap-0.5 text-[10px]">
                    <div className="flex justify-between font-mono">
                      <span className="capitalize text-white/60 truncate max-w-[160px]">{feature.replace('_', ' ')}</span>
                      <span className={value > 0 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                        {value > 0 ? '+' : ''}{value.toFixed(1)}m
                      </span>
                    </div>
                    <div className="w-full bg-[#0b0f19] rounded-full h-1">
                      <div 
                         className={cn("h-1 rounded-full", value > 0 ? "bg-red-500" : "bg-green-500")}
                         style={{ width: `${Math.min(Math.abs(value) / (predictionData.eta_minutes || 1) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}

      {/* CARD 3: Prescriptive Resource Allocation & Bypass */}
      {prescriptiveData && (
        <div className="w-80 shrink-0 glass-panel border border-white/8 rounded-xl p-3 flex flex-col justify-between bg-black/15 overflow-y-auto">
          <div>
            <div className="pb-1.5 border-b border-white/5 mb-1.5">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest font-mono">
                Prescriptive Resource Deck
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="flex flex-col items-center p-2 bg-[#0b0f19]/80 rounded-lg border border-white/5">
                <Users className="w-4 h-4 mb-1 text-orange-400" />
                <span className="text-base font-bold font-mono text-orange-300">{prescriptiveData.officers_needed}</span>
                <span className="text-[8px] text-white/40 uppercase font-mono">Officers</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-[#0b0f19]/80 rounded-lg border border-white/5">
                <Cone className="w-4 h-4 mb-1 text-yellow-400" />
                <span className="text-base font-bold font-mono text-yellow-300">{prescriptiveData.barricades_needed}</span>
                <span className="text-[8px] text-white/40 uppercase font-mono">Barricades</span>
              </div>
            </div>
            
            {prescriptiveData.bypass_routes.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-[9px] font-bold text-white/40 uppercase tracking-wider font-mono flex items-center gap-0.5">
                  <Route className="w-3 h-3 text-cyan-400" /> Network Flow Bypass
                </h4>
                <ul className="space-y-1">
                  {prescriptiveData.bypass_routes.map((route, i) => (
                    <li key={i} className="text-[10px] p-1.5 bg-cyan-950/20 rounded border border-cyan-800/30 text-cyan-200 font-medium">
                      {route}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CARD 4: Llama 3 Tactical SOP Briefing */}
      {sopBriefing.length > 0 && (
        <div className="w-80 shrink-0 glass-panel border border-white/8 rounded-xl p-3 flex flex-col justify-between bg-black/15 overflow-y-auto">
          <div>
            <div className="pb-1.5 border-b border-white/5 mb-1.5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Llama 3 Tactical SOP
              </span>
            </div>
            <ul className="space-y-1.5 text-[10px] text-slate-300">
              {sopBriefing.map((bullet, idx) => (
                <li key={idx} className="bg-emerald-500/5 p-1.5 rounded border border-emerald-500/10 leading-snug">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* CARD 5: Verify Ground Deployment (Feedback Loop) */}
      {(isCommissioner || isInspector) && canResolve && (
        <div className="w-80 shrink-0 glass-panel border border-white/8 rounded-xl p-3 flex flex-col justify-between bg-black/15 overflow-y-auto no-print">
          <form onSubmit={handleSubmitFeedback} className="space-y-2.5 h-full flex flex-col justify-between">
            <div>
              <div className="pb-1.5 border-b border-white/5 mb-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono">
                  Ground Deployment Loop
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-white/50 font-mono">Officers</label>
                  <input type="number" value={officersDeployed} onChange={e => setOfficersDeployed(parseInt(e.target.value) || 0)} className="w-full bg-[#0b0f19] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 text-white font-mono" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-white/50 font-mono">Barricades</label>
                  <input type="number" value={barricadesDeployed} onChange={e => setBarricadesDeployed(parseInt(e.target.value) || 0)} className="w-full bg-[#0b0f19] border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 text-white font-mono" />
                </div>
              </div>
              
              {feedbackResult && (
                <div className="p-2 bg-black/40 rounded border border-blue-500/20 text-[9px] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Sector Speed Drop:</span>
                    <span className={cn("font-bold font-mono", feedbackResult.speed_drop_kmh > 10 ? "text-red-400" : "text-green-400")}>
                      -{feedbackResult.speed_drop_kmh} km/h
                    </span>
                  </div>
                  {feedbackResult.escalated && (
                    <div className="text-[8px] text-red-400 font-bold uppercase live-pulse">
                      Speed drop exceeded threshold!
                    </div>
                  )}
                  <div className="text-[8px] text-slate-300 border-t border-white/5 pt-1 truncate">
                    <span className="font-semibold text-blue-300">Rec. Detour:</span> {feedbackResult.recommended_detour}
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={isSubmittingFeedback} className="w-full text-[10px] font-semibold py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 cursor-pointer">
              {isSubmittingFeedback ? "Submitting..." : "Verify Ground Deploy"}
            </button>
          </form>
        </div>
      )}

      {/* CARD 6: Transit Signal offsets (Planner control overlay) */}
      {isPlanner && (
        <div className="w-72 shrink-0 glass-panel border border-white/8 rounded-xl p-3 flex flex-col justify-between bg-black/15 no-print">
          <div className="space-y-2">
            <div className="pb-1.5 border-b border-white/5 mb-1.5">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-mono">
                Transit Optimization Controls
              </span>
            </div>
            <div className="space-y-1.5 text-[10px] font-mono">
              <div className="flex justify-between">
                <span className="text-white/40">Signal Offset</span>
                <span className="text-purple-300 font-bold">+24s (Adaptive)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Queue Spillback</span>
                <span className="text-yellow-400 font-bold">Moderate (42%)</span>
              </div>
            </div>
          </div>
          <button className="w-full text-[10px] font-bold py-1.5 bg-purple-600/80 hover:bg-purple-600 border border-purple-400/30 text-white rounded-lg transition-colors uppercase tracking-wider cursor-pointer">
            Trigger Signal offset
          </button>
        </div>
      )}
    </div>
  );
}
