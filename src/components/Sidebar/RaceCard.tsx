"use client";

import React from 'react';
import { Calendar, MapPin, Heart } from 'lucide-react';
import { RaceWithSubRaces } from '../../types/database';
import { RaceTypeBadge, RaceStatusBadge } from './raceLabels';
import { getRaceSlug } from '../../lib/slugs';

interface RaceCardProps {
  race: RaceWithSubRaces;
  isSelected: boolean;
  onClick: (race: RaceWithSubRaces) => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const RaceCard = React.memo(function RaceCard({ 
  race, isSelected, onClick, onToggleFavorite, isFavorite, onMouseEnter, onMouseLeave 
}: RaceCardProps) {
  return (
    <a 
      href={`/race/${getRaceSlug(race)}`}
      className={`race-card ${isSelected ? 'active' : ''}`} 
      onClick={(e) => {
        // Prevent default navigation for normal left clicks to run client-side selection
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          onClick(race);
        }
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button 
        className={`card-favorite-btn ${isFavorite ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault(); // Prevent triggering the card's link navigation
          e.stopPropagation();
          onToggleFavorite(race.id);
        }}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '6px',
          borderRadius: '50%',
          cursor: 'pointer',
          color: isFavorite ? '#FF3366' : 'rgba(255,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          transition: 'all 0.2s ease',
          borderColor: isFavorite ? 'rgba(255, 51, 102, 0.4)' : 'rgba(255,255,255,0.1)'
        }}
      >
        <Heart size={16} fill={isFavorite ? '#FF3366' : 'none'} />
      </button>
      <div className="race-card-header" style={{ justifyContent: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <RaceTypeBadge eventType={race.event_type} />
        {race.status && race.status !== 'scheduled' && (
          <RaceStatusBadge status={race.status} />
        )}
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
    </a>
  );
});
