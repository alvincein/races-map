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
      {race.sub_races && race.sub_races.length > 0 && (
        <div className="race-card-distances" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
          {[...race.sub_races]
            .filter(sub => sub.distance && sub.distance > 0)
            .sort((a, b) => (b.distance || 0) - (a.distance || 0))
            .map((sub, idx) => (
              <span 
                key={sub.id || idx} 
                className="distance-badge"
                style={{ 
                  fontSize: '10px', 
                  background: 'rgba(255,255,255,0.08)', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  fontWeight: '600'
                }}
              >
                {(() => {
                  const m = sub.distance || 0;
                  if (m < 1000) return `${m}m`;
                  const km = m / 1000;
                  return km % 1 === 0 ? `${km}k` : `${km.toFixed(1)}k`;
                })()}
              </span>
            ))
          }
        </div>
      )}
    </div>
  );
});
