"use client";

import React from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { Mountain, Calendar, MapPin, Icon } from 'lucide-react';
import { sneaker } from '@lucide/lab';
import type { Race } from '../../types/database';

interface RaceMarkerProps {
  race: Race;
  isSelected: boolean;
  onClick: (race: Race, lng: number, lat: number) => void;
  offset?: [number, number];
  /** When part of a spiderfied cluster, render at the cluster center, not the race's own coords. */
  lng?: number;
  lat?: number;
}

export const RaceMarker = React.memo(function RaceMarker({
  race, isSelected, onClick, offset, lng: propLng, lat: propLat,
}: RaceMarkerProps) {
  const isTrail = race.event_type?.toLowerCase() === 'trail';
  const lng = propLng ?? race.location_lng;
  const lat = propLat ?? race.location_lat;
  if (lng == null || lat == null) return null;

  return (
    <Marker
      longitude={lng}
      latitude={lat}
      anchor="center"
      offset={offset}
      onClick={e => {
        e.originalEvent.stopPropagation();
        onClick(race, lng, lat);
      }}
      style={{ zIndex: isSelected ? 10 : 1 }}
    >
      <div className={`marker-container ${isSelected ? 'selected' : ''}`}>
        <div className={`marker-pin ${isTrail ? 'marker-trail' : 'marker-road'}`}>
          {isTrail ? <Mountain size={16} /> : <Icon iconNode={sneaker} size={16} />}
        </div>
        <div className="marker-label">
          <div className="label-header">
            <span className="label-name">{race.event_name}</span>
            {race.max_distance && <span className="label-km">{race.max_distance / 1000}χλμ</span>}
          </div>
          <div className="label-details">
            {race.dates && race.dates.length > 0 && (
              <div className="label-detail-item">
                <Calendar size={12} />
                <span>{new Date(race.dates[0]).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}</span>
              </div>
            )}
            {(race.location_place || race.location_city) && (
              <div className="label-detail-item">
                <MapPin size={12} />
                <span>{race.location_place || race.location_city}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Marker>
  );
});
