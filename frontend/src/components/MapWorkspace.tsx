import { useState, useEffect, useMemo } from 'react';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useIncidentStore } from '@/store/incidentStore';

const INITIAL_VIEW_STATE = {
  longitude: 77.5960,
  latitude: 12.9870,
  zoom: 11,
  pitch: 45,
  bearing: 0
};

export default function MapWorkspace() {
  const { incidents, selectedIncidentId, selectIncident, simulationData, transitData, deployedRoutes, footfall, vehicles } = useIncidentStore();
  const [clusters, setClusters] = useState<any[]>([]);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  useEffect(() => {
    // Fetch clusters
    fetch('http://localhost:8080/api/clusters')
      .then(res => res.json())
      .then(data => setClusters(data.clusters || []))
      .catch(err => console.error("Failed to fetch clusters", err));
  }, []);

  const layers = useMemo(() => {
    const list = [
      // Vulnerability Clusters (DBSCAN results)
      new ScatterplotLayer({
        id: 'vulnerability-clusters',
        data: clusters,
        getPosition: d => [d.centroid.lng, d.centroid.lat],
        getFillColor: [255, 50, 50, 35],
        getRadius: d => d.radius_approx_km * 500, // Visual scaling
        radiusScale: 1,
        radiusMinPixels: 20,
        radiusMaxPixels: 100,
        pickable: true,
      }),
      
      // Incident Points
      new ScatterplotLayer({
        id: 'incidents-layer',
        data: incidents,
        getPosition: d => [d.longitude, d.latitude],
        getFillColor: d => d.priority === 'High' ? [255, 0, 0, 200] : [255, 165, 0, 180],
        getLineColor: d => d.id === selectedIncidentId ? [255, 255, 255, 255] : [0, 0, 0, 0],
        lineWidthMinPixels: 2,
        getRadius: 100,
        radiusScale: 1,
        radiusMinPixels: 5,
        radiusMaxPixels: 15,
        pickable: true,
        onClick: ({object}) => {
          if (object) {
            selectIncident(object.id);
          }
        }
      })
    ];

    // Scenario Sandbox Bottlenecks Layer
    if (simulationData && simulationData.bottleneck_nodes) {
      list.push(
        new ScatterplotLayer({
          id: 'sandbox-bottlenecks-layer',
          data: simulationData.bottleneck_nodes,
          getPosition: d => [d.lng, d.lat],
          getFillColor: [251, 146, 60, 230], // Flashing orange
          getLineColor: [255, 255, 255, 255],
          lineWidthMinPixels: 1,
          getRadius: 150,
          radiusScale: 1,
          radiusMinPixels: 8,
          radiusMaxPixels: 20,
          pickable: true
        }) as any
      );
    }

    // Bus Priority Lanes Layer
    if (transitData && transitData.bus_lanes) {
      list.push(
        new PathLayer({
          id: 'bus-lanes-layer',
          data: transitData.bus_lanes,
          getPath: d => d.coordinates,
          getColor: (d: any) => {
            const isDeployed = (deployedRoutes || []).some(r => {
              if (d.id === 'lane-1' && r.startsWith('500A')) return true;
              if (d.id === 'lane-2' && r.startsWith('G-4')) return true;
              return false;
            });
            if (isDeployed) {
              return [6, 182, 212, 255]; // Priority Neon Cyan-Blue
            }

            const isHighVehicles = (vehicles || 0) >= 5000;
            const isHighFootfall = (footfall || 0) >= 10000;

            if (isHighVehicles && isHighFootfall) {
              // Compound Gridlock Coordinated Override
              if (d.id === 'lane-1' || d.id === 'lane-5') return [6, 182, 212, 255]; // Highways: Neon Cyan-blue
              if (d.id === 'lane-2' || d.id === 'lane-3' || d.id === 'lane-7') return [239, 68, 68, 255]; // Core corridors: Crimson Red
              return [245, 158, 11, 255]; // Amber-Orange
            }

            if (isHighVehicles) {
              // Outer/Peripheral Highway Corridors highlight
              if (d.id === 'lane-1' || d.id === 'lane-5' || d.id === 'lane-6') {
                return [6, 182, 212, 255]; // Neon Cyan-Blue
              }
            }

            if (isHighFootfall) {
              // Inner City / High-Density Transit Corridors highlight
              if (d.id === 'lane-2' || d.id === 'lane-3' || d.id === 'lane-4' || d.id === 'lane-7') {
                return [245, 158, 11, 255]; // Amber-Orange
              }
            }

            return [34, 197, 94, 200]; // Standard green with moderate opacity
          },
          getWidth: (d: any) => {
            const isDeployed = (deployedRoutes || []).some(r => {
              if (d.id === 'lane-1' && r.startsWith('500A')) return true;
              if (d.id === 'lane-2' && r.startsWith('G-4')) return true;
              return false;
            });
            if (isDeployed) return 24; // Extra thick priority

            const isHighVehicles = (vehicles || 0) >= 5000;
            const isHighFootfall = (footfall || 0) >= 10000;

            if (isHighVehicles && isHighFootfall) return 20; // Coordinated gridlock override

            if (isHighVehicles && (d.id === 'lane-1' || d.id === 'lane-5' || d.id === 'lane-6')) {
              return 18;
            }

            if (isHighFootfall && (d.id === 'lane-2' || d.id === 'lane-3' || d.id === 'lane-4' || d.id === 'lane-7')) {
              return 18;
            }

            return 10; // Standard thickness
          },
          widthMinPixels: 4,
          pickable: true
        }) as any
      );
    }

    return list;
  }, [incidents, clusters, selectedIncidentId, selectIncident, simulationData, transitData, deployedRoutes, footfall, vehicles]);

  return (
    <div className="absolute inset-0">
      <DeckGL
        viewState={viewState}
        onViewStateChange={e => setViewState(e.viewState as any)}
        controller={true}
        layers={layers}
        getCursor={({isHovering}) => isHovering ? 'pointer' : 'grab'}
      >
        <Map 
          {...viewState}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          reuseMaps
        >
          <NavigationControl position="bottom-left" />
        </Map>
      </DeckGL>
    </div>
  );
}
