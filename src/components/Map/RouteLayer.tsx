"use client";

import React from 'react';
import { Marker, Source, Layer } from 'react-map-gl/maplibre';
import { Play, Flag } from 'lucide-react';
import type { RouteData } from '../../types/routes';

interface RouteLayerProps {
  route: RouteData & { aid_stations?: any };
  index: number;
  color: string;
  isFocused: boolean;
  hasFocus: boolean;
}

export const RouteLayer = React.memo(function RouteLayer({ 
  route, 
  index, 
  color, 
  isFocused, 
  hasFocus 
}: RouteLayerProps) {
  const coords = route.geojson.geometry.coordinates;
  // While a sub-race is focused, dim the others heavily so the focus is unmistakable.
  const opacity = isFocused ? 1 : (hasFocus ? 0.15 : 0.8);
  const markerOpacity = isFocused ? 1 : (hasFocus ? 0.15 : 0.7);

  // Inject subRaceId into geojson properties for click detection
  const geojsonData = React.useMemo(() => ({
    ...route.geojson,
    properties: {
      ...route.geojson.properties,
      subRaceId: (route as any).subRaceId
    }
  }), [route.geojson, (route as any).subRaceId]);

  return (
    <>
      <Source id={`route-${index}`} type="geojson" data={geojsonData}>
        {/* Transparent hit area for easier tapping */}
        <Layer
          id={`route-hitarea-${index}`}
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-color': 'rgba(0,0,0,0)',
            'line-width': 100,
          }}
        />
        <Layer
          id={`route-line-${index}`}
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-color': color,
            'line-width': isFocused ? 6 : 4,
            'line-opacity': opacity,
          }}
        />
        {isFocused && (
          <Layer
            id={`route-glow-${index}`}
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{
              'line-color': color,
              'line-width': 12,
              'line-opacity': 0.4,
              'line-blur': 8,
            }}
          />
        )}
      </Source>

      {coords.length > 1 && (
        <>
          <Marker longitude={coords[0][0]} latitude={coords[0][1]} anchor="center">
            <div
              className="route-marker-container"
              style={{ opacity: markerOpacity, transform: isFocused ? 'scale(1)' : 'scale(0.8)' }}
            >
              <div className="route-marker-pin route-marker-start">
                <Play size={14} fill="currentColor" />
              </div>
              <div className="route-marker-label">Εκκίνηση</div>
            </div>
          </Marker>

          <Marker
            longitude={coords[coords.length - 1][0]}
            latitude={coords[coords.length - 1][1]}
            anchor="center"
          >
            <div
              className="route-marker-container"
              style={{ opacity: markerOpacity, transform: isFocused ? 'scale(1)' : 'scale(0.8)' }}
            >
              <div className="route-marker-pin route-marker-end">
                <Flag size={14} fill="#FF3366" stroke="white" strokeWidth={1.5} />
              </div>
              <div className="route-marker-label">Τερματισμός</div>
            </div>
          </Marker>

          {/* Aid Station Markers */}
          {isFocused && Array.isArray(route.aid_stations) && route.aid_stations.map((station, sIndex) => {
            if (station.km_location == null) return null;
            
            const profilePoints = route.profile;
            if (!profilePoints || profilePoints.length === 0) return null;
            
            const targetDist = station.km_location * 1000;
            let closestPoint = profilePoints[0];
            let minDiff = Math.abs(profilePoints[0].d - targetDist);
            
            for (const p of profilePoints) {
              const diff = Math.abs(p.d - targetDist);
              if (diff < minDiff) {
                minDiff = diff;
                closestPoint = p;
              }
            }
            
            if (!closestPoint || !closestPoint.c) return null;
            
            return (
              <Marker
                key={`aid-${index}-${sIndex}`}
                longitude={closestPoint.c[0]}
                latitude={closestPoint.c[1]}
                anchor="center"
              >
                <div className="route-marker-container" style={{ opacity: 1, transform: 'scale(1)', zIndex: 10 }}>
                  <div className="route-marker-pin" style={{ background: '#FF3366', borderColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 0 10px rgba(255, 51, 102, 0.5)' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '11px' }}>{station.station_number || ''}</span>
                  </div>
                  <div className="route-marker-label">Σταθμός {station.station_number || ''}</div>
                </div>
              </Marker>
            );
          })}
        </>
      )}
    </>
  );
});

