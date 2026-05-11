"use client";

import React from 'react';
import { Marker, Source, Layer } from 'react-map-gl/maplibre';
import { Play, Flag } from 'lucide-react';
import type { RouteData } from '../../types/routes';

interface RouteLayerProps {
  route: RouteData;
  index: number;
  color: string;
  isFocused: boolean;
  hasFocus: boolean;
}

export function RouteLayer({ route, index, color, isFocused, hasFocus }: RouteLayerProps) {
  const coords = route.geojson.geometry.coordinates;
  // While a sub-race is focused, dim the others heavily so the focus is unmistakable.
  const opacity = isFocused ? 1 : (hasFocus ? 0.15 : 0.8);
  const markerOpacity = isFocused ? 1 : (hasFocus ? 0.15 : 0.7);

  return (
    <>
      <Source id={`route-${index}`} type="geojson" data={route.geojson}>
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
        </>
      )}
    </>
  );
}
