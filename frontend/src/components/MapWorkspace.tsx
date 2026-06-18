import React, { useState, useEffect, useMemo } from 'react';
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
  const { incidents, selectedIncidentId, selectIncident, simulationData, transitData } = useIncidentStore();
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
          getColor: [34, 197, 94, 255], // Green path
          getWidth: 12,
          widthMinPixels: 4,
          pickable: true
        }) as any
      );
    }

    return list;
  }, [incidents, clusters, selectedIncidentId, selectIncident, simulationData, transitData]);

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
          <NavigationControl position="bottom-right" />
        </Map>
      </DeckGL>
    </div>
  );
}
