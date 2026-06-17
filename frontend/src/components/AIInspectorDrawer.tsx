import React, { useState } from 'react';
import { useIncidentStore } from '@/store/incidentStore';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      const res = await fetch(`http://localhost:8000/api/incidents/${incident.id}/status?status=${newStatus}`, {
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
      const res = await fetch(`http://localhost:8000/api/incidents/${incident.id}/feedback`, {
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

  // Can resolve: Commissioner, or Inspector if the incident belongs to their station
  const canResolve = isCommissioner || (isInspector && incident.police_station === user?.police_station);

  return (
    <div className="w-96 border-l border-border bg-card shadow-2xl flex flex-col z-30 transition-transform duration-300">
      <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
        <div>
          <h2 className="font-bold">AI Inspector</h2>
          <p className="text-xs text-muted-foreground">{incident.id}</p>
        </div>
        <button onClick={() => selectIncident(null)} className="p-1 hover:bg-muted rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoadingPredict ? (
          <div className="flex flex-col items-center justify-center h-40 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground animate-pulse">Running LightGBM Inference...</p>
          </div>
        ) : (
          <>
            {/* Status Display */}
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Status</span>
              <Badge className={cn(
                "capitalize font-medium",
                incident.status === 'active' ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"
              )}>
                {incident.status}
              </Badge>
            </div>

            {/* Prediction Card */}
            {predictionData && (
              <Card className="border-primary/50 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-blue-400" />
                      Predicted Time-to-Clear
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                      LightGBM v4
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-center my-4 text-blue-400">
                    {predictionData.eta_minutes} <span className="text-lg text-muted-foreground font-normal">min</span>
                  </div>
                  
                  <div className="space-y-2 mt-6">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">SHAP Contributions</h4>
                    {Object.entries(predictionData.shap_values).map(([feature, value]) => (
                      <div key={feature} className="flex flex-col gap-1 text-xs">
                        <div className="flex justify-between">
                          <span className="capitalize">{feature.replace('_', ' ')}</span>
                          <span className={value > 0 ? "text-destructive" : "text-green-500"}>
                            {value > 0 ? '+' : ''}{value.toFixed(1)}m
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div 
                             className={cn("h-1.5 rounded-full", value > 0 ? "bg-destructive" : "bg-green-500")}
                             style={{ width: `${Math.min(Math.abs(value) / (predictionData.eta_minutes || 1) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prescriptive Card */}
            {prescriptiveData && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Prescriptive Allocation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                      <Users className="w-5 h-5 mb-1 text-orange-400" />
                      <span className="text-xl font-bold">{prescriptiveData.officers_needed}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">Officers</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                      <Cone className="w-5 h-5 mb-1 text-yellow-400" />
                      <span className="text-xl font-bold">{prescriptiveData.barricades_needed}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">Barricades</span>
                    </div>
                  </div>
                  
                  {prescriptiveData.bypass_routes.length > 0 && (
                    <div className="mt-4 border-t border-border pt-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center">
                        <Route className="w-3 h-3 mr-1" /> Network Flow Bypass
                      </h4>
                      <ul className="space-y-2">
                        {prescriptiveData.bypass_routes.map((route, i) => (
                          <li key={i} className="text-xs p-2 bg-primary/10 rounded border border-primary/20">
                            {route}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* GenAI SOP Tactical Briefing Card */}
            {sopBriefing.length > 0 && (
              <Card className="border-emerald-500/20 bg-emerald-950/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Llama 3 Tactical Briefing (SOP)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <ul className="space-y-2 text-xs text-slate-300">
                    {sopBriefing.map((bullet, idx) => (
                      <li key={idx} className="bg-emerald-500/5 p-2 rounded border border-emerald-500/10 leading-snug">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Role Specific Control Board */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Operational Actions</h3>
              
              {isPlanner && (
                <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/15 space-y-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Transit Optimization Controls</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Traffic Signal Offset</span>
                      <span className="text-purple-300 font-semibold font-mono">+24s (Adaptive)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Queue Spillback risk</span>
                      <span className="text-yellow-400 font-semibold">Moderate (42%)</span>
                    </div>
                  </div>
                  <button className="w-full text-xs font-semibold py-2 px-3 bg-purple-600/80 hover:bg-purple-600 border border-purple-400/30 text-white rounded-lg transition-all shadow-md">
                    Trigger Smart Signal Adjustments
                  </button>
                </div>
              )}

              {(isCommissioner || isInspector) && (
                <div className="space-y-4">
                  {/* Closed-loop Feedback Form for Ground Personnel */}
                  {canResolve && (
                    <form onSubmit={handleSubmitFeedback} className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/15 space-y-3 text-xs">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-blue-400">Verify Ground Deployment (Feedback Loop)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-muted-foreground">Officers Deployed</label>
                          <input type="number" value={officersDeployed} onChange={e => setOfficersDeployed(parseInt(e.target.value) || 0)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground">Barricades Deployed</label>
                          <input type="number" value={barricadesDeployed} onChange={e => setBarricadesDeployed(parseInt(e.target.value) || 0)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500" />
                        </div>
                      </div>
                      <button type="submit" disabled={isSubmittingFeedback} className="w-full font-semibold py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50">
                        {isSubmittingFeedback ? "Updating..." : "Submit Deploy Verification"}
                      </button>

                      {feedbackResult && (
                        <div className="p-2 bg-black/40 rounded border border-blue-500/20 text-[10px] space-y-1.5 animate-fadeIn">
                          <div className="flex justify-between items-center">
                            <span>Sector Speed Drop:</span>
                            <span className={cn("font-bold font-mono", feedbackResult.speed_drop_kmh > 10 ? "text-red-400" : "text-green-400")}>
                              -{feedbackResult.speed_drop_kmh} km/h
                            </span>
                          </div>
                          {feedbackResult.escalated && (
                            <div className="flex items-center gap-1 text-[9px] text-red-400 font-bold uppercase live-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Speed drop threshold exceeded!
                            </div>
                          )}
                          <div className="text-[9px] text-slate-300 border-t border-border pt-1">
                            <span className="font-semibold text-blue-300">Rec. Detour:</span> {feedbackResult.recommended_detour}
                          </div>
                        </div>
                      )}
                    </form>
                  )}

                  {canResolve ? (
                    incident.status === 'active' ? (
                      <button
                        onClick={() => handleUpdateStatus('resolved')}
                        disabled={isUpdatingStatus}
                        className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 px-3 bg-green-600/90 hover:bg-green-600 text-white rounded-lg transition-all border border-green-500/20 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" /> Clear Incident / Mark Resolved
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus('active')}
                        disabled={isUpdatingStatus}
                        className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 px-3 bg-red-600/90 hover:bg-red-600 text-white rounded-lg transition-all border border-red-500/20 disabled:opacity-50"
                      >
                        <AlertTriangle className="w-4 h-4" /> Re-open Incident (Set Active)
                      </button>
                    )
                  ) : (
                    <div className="flex gap-2 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-[11px] text-yellow-500/90">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      <span>Only inspectors from <strong>{incident.police_station} PS</strong> can clear this incident.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
