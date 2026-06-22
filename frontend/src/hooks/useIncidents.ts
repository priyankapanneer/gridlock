import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';
import type { Incident, ProxyAlert, SimulationData, TransitData } from '@/types';

export const useIncidentsQuery = () => {
  return useQuery<Incident[]>({
    queryKey: ['incidents'],
    queryFn: () => fetchWithAuth('/incidents'),
  });
};

export const useProxyAlertsQuery = () => {
  return useQuery<ProxyAlert[]>({
    queryKey: ['proxy-alerts'],
    queryFn: () => fetchWithAuth('/proxy-alerts'),
  });
};

interface SimulateParams {
  coordinates: number[][];
  footfall: number;
  vehicles: number;
}

export const useSimulationMutation = () => {
  return useMutation<SimulationData, Error, SimulateParams>({
    mutationFn: (params) =>
      fetchWithAuth('/simulate', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  });
};

export const useTransitRecommendationsQuery = (footfall: number, vehicles: number, enabled: boolean) => {
  return useQuery<TransitData>({
    queryKey: ['transit', footfall, vehicles],
    queryFn: () => fetchWithAuth(`/transit/multi-modal?footfall=${footfall}&vehicles=${vehicles}`),
    enabled,
  });
};
