"use client";

import React from 'react';
import { Marker } from 'react-map-gl/maplibre';
import type { Race } from '../../types/database';
import { RaceMarker } from './RaceMarker';

interface SpiderfiedClusterProps {
  longitude: number;
  latitude: number;
  races: Race[];
  selectedRaceId: string | null;
  onRaceClick: (race: Race, lng: number, lat: number) => void;
}

const SPIDER_BASE_RADIUS = 60;
const SPIDER_RADIUS_INCREMENT = 2;

function spokePosition(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2;
  const radius = SPIDER_BASE_RADIUS + index * SPIDER_RADIUS_INCREMENT;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

export const SpiderfiedCluster = React.memo(function SpiderfiedCluster({
  longitude, latitude, races, selectedRaceId, onRaceClick,
}: SpiderfiedClusterProps) {
  return (
    <>
      <Marker
        longitude={longitude}
        latitude={latitude}
        anchor="center"
        style={{ zIndex: 0, pointerEvents: 'none' }}
      >
        <svg width="400" height="400" viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
          <circle cx="200" cy="200" r="5" fill="white" opacity="0.5" />
          {races.map((race, i) => {
            const { x, y } = spokePosition(i, races.length);
            return (
              <line
                key={`l-${race.id}`}
                x1="200"
                y1="200"
                x2={200 + x}
                y2={200 + y}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
            );
          })}
        </svg>
      </Marker>

      {races.map((race, i) => {
        const { x, y } = spokePosition(i, races.length);
        return (
          <RaceMarker
            key={`spider-${race.id}`}
            race={race}
            isSelected={selectedRaceId === race.id}
            onClick={onRaceClick}
            lng={longitude}
            lat={latitude}
            offset={[x, y]}
          />
        );
      })}
    </>
  );
});
