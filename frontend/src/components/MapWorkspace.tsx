import React, { useState, useEffect, useMemo } from 'react';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
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
  const { incidents, selectedIncidentId, selectIncident } = useIncidentStore();
  const [clusters, setClusters] = useState<any[]>([]);

  useEffect(() => {
    // Fetch clusters
    fetch('http://localhost:8000/api/clusters')
      .then(res => res.json())
      .then(data => setClusters(data.clusters || []))
      .catch(err => console.error("Failed to fetch clusters", err));
  }, []);

  const layers = useMemo(() => [
    // Vulnerability Clusters (DBSCAN results)
    new ScatterplotLayer({
      id: 'vulnerability-clusters',
      data: clusters,
      getPosition: d => [d.centroid.lng, d.centroid.lat],
      getFillColor: [255, 50, 50, 50],
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
  ], [incidents, clusters, selectedIncidentId, selectIncident]);

  return (
    <div className="absolute inset-0">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        getCursor={({isHovering}) => isHovering ? 'pointer' : 'grab'}
      >
        <Map 
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          reuseMaps
        >
          <NavigationControl position="bottom-right" />
        </Map>
      </DeckGL>
    </div>
  );
}
