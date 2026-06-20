import { create } from 'zustand';

export interface Incident {
  id: string;
  event_type: string;
  latitude: number;
  longitude: number;
  address: string;
  event_cause: string;
  requires_road_closure: boolean;
  start_datetime: string;
  closed_datetime: string | null;
  status: string;
  priority: 'High' | 'Low';
  corridor: string;
  police_station: string;
  zone: string;
  description: string;
  veh_type: string | null;
}

export interface Prediction {
  eta_minutes: number;
  shap_values: Record<string, number>;
}

export interface Prescriptive {
  officers_needed: number;
  barricades_needed: number;
  bypass_routes: string[];
}

interface IncidentState {
  incidents: Incident[];
  selectedIncidentId: string | null;
  predictionData: Prediction | null;
  prescriptiveData: Prescriptive | null;
  isLoadingPredict: boolean;
  proxyAlerts: any | null;
  simulationData: any | null;
  transitData: any | null;
  sopBriefing: string[];
  deployedRoutes: string[];
  footfall: number;
  vehicles: number;
  setIncidents: (incidents: Incident[]) => void;
  selectIncident: (id: string | null) => void;
  fetchAIInsights: (id: string) => Promise<void>;
  setProxyAlerts: (alerts: any) => void;
  setSimulationData: (data: any) => void;
  setTransitData: (data: any) => void;
  fetchSopBriefing: (id: string) => Promise<void>;
  setDeployedRoutes: (routes: string[] | ((prev: string[]) => string[])) => void;
  setFootfall: (val: number) => void;
  setVehicles: (val: number) => void;
}

import { useAuthStore } from './authStore';

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: [],
  selectedIncidentId: null,
  predictionData: null,
  prescriptiveData: null,
  isLoadingPredict: false,
  proxyAlerts: null,
  simulationData: null,
  transitData: null,
  sopBriefing: [],
  deployedRoutes: [],
  footfall: 15000,
  vehicles: 6000,
  
  setIncidents: (incidents) => set({ incidents }),
  
  setProxyAlerts: (proxyAlerts) => set({ proxyAlerts }),
  setSimulationData: (simulationData) => set({ simulationData }),
  setTransitData: (transitData) => set({ transitData }),
  setFootfall: (footfall) => set({ footfall }),
  setVehicles: (vehicles) => set({ vehicles }),
  setDeployedRoutes: (routes) => {
    if (typeof routes === 'function') {
      set((state) => ({ deployedRoutes: routes(state.deployedRoutes) }));
    } else {
      set({ deployedRoutes: routes });
    }
  },
  
  selectIncident: (id) => {
    set({ selectedIncidentId: id });
    if (id) {
      get().fetchAIInsights(id);
      get().fetchSopBriefing(id);
    } else {
      set({ predictionData: null, prescriptiveData: null, sopBriefing: [] });
    }
  },
  
  fetchSopBriefing: async (id: string) => {
    try {
      const token = useAuthStore.getState().user?.token;
      if (!token) return;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/incidents/${id}/sop`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ sopBriefing: data.briefing });
      }
    } catch (err) {
      console.error(err);
    }
  },
  
  fetchAIInsights: async (id: string) => {
    set({ isLoadingPredict: true });
    try {
      const token = useAuthStore.getState().user?.token || 'mock-jwt-token';
      const headers = { 'Authorization': `Bearer ${token}` };

      const [predRes, presRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/${id}/predict`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/${id}/optimize`, { headers })
      ]);
      
      if (predRes.ok && presRes.ok) {
        const predictionData = await predRes.json();
        const prescriptiveData = await presRes.json();
        set({ predictionData, prescriptiveData, isLoadingPredict: false });
      } else {
        throw new Error('Failed to fetch AI insights');
      }
    } catch (error) {
      console.error(error);
      // Fallback mock data if backend isn't up
      set({ 
        predictionData: {
          eta_minutes: 45,
          shap_values: { base: 30, cause_breakdown: 15 }
        },
        prescriptiveData: {
          officers_needed: 3,
          barricades_needed: 10,
          bypass_routes: ["Simulated Divert"]
        },
        isLoadingPredict: false 
      });
    }
  }
}));
