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

export interface SimulationData {
  impact_level: 'high' | 'medium' | 'moderate' | 'low';
  predicted_spillback_minutes: number;
  status: string;
  bottleneck_nodes?: any[];
}

export interface TransitData {
  buses: Array<{
    id: string;
    route: string;
    delay: number;
    latitude: number;
    longitude: number;
  }>;
  metros: Array<{
    id: string;
    line: string;
    status: string;
    latitude: number;
    longitude: number;
  }>;
  bus_lanes?: any[];
  rerouting_suggestions?: any[];
}

export interface ProxyAlert {
  id: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}
