"use client";

import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import type { Race } from '../../types/database';
import { RaceTypeBadge } from './raceLabels';

interface RaceCardProps {
  race: Race;
  isSelected: boolean;
  onClick: (race: Race) => void;
}

export const RaceCard = React.memo(function RaceCard({ race, isSelected, onClick }: RaceCardProps) {
  return (
    <div className={`race-card ${isSelected ? 'active' : ''}`} onClick={() => onClick(race)}>
      <div className="race-card-header">
        <RaceTypeBadge eventType={race.event_type} />
        {race.dates && race.dates.length > 0 && (
          <span className="race-date">
            <Calendar size={14} />
            {new Date(race.dates[0]).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
      <h3>{race.event_name}</h3>
      <div className="race-location">
        <MapPin size={14} />
        <span>{race.location_place || race.location_city || 'TBD'}</span>
      </div>
    </div>
  );
});
