"use client";

import React, { useState } from 'react';
import { Calendar, MapPin, ArrowLeft, ExternalLink, Navigation, Trophy, Bookmark } from 'lucide-react';
import type { Race, SubRace } from '../../types/database';
import type { RouteIndex } from '../../types/routes';
import { WeatherWidget } from '../WeatherWidget';
import { RaceTypeBadge } from './raceLabels';
import { SubRaceCard } from './SubRaceCard';

const DESCRIPTION_TRUNCATE_LENGTH = 250;

interface RaceDetailProps {
  race: Race;
  subRaces: SubRace[];
  selectedSubRaceId: string | null;
  fetchedRoutes: RouteIndex;
  isLoadingSubRaces: boolean;
  onSubRaceClick: (subRaceId: string) => void;
  onBack: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export function RaceDetail({
  race, subRaces, selectedSubRaceId, fetchedRoutes, isLoadingSubRaces, onSubRaceClick, onBack, toggleFavorite, isFavorite,
}: RaceDetailProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const description =
    race.description || race.description_en || 'No description available for this event.';
  const isLong = description.length > DESCRIPTION_TRUNCATE_LENGTH;
  const displayedDescription = isDescriptionExpanded || !isLong
    ? description
    : description.substring(0, DESCRIPTION_TRUNCATE_LENGTH) + '...';

  const firstDate = race.dates && race.dates.length > 0 ? race.dates[0] : null;

  return (
    <>
      <div className="detail-header-actions">
        <button
          className="back-btn"
          onClick={() => {
            setIsDescriptionExpanded(false);
            onBack();
          }}
        >
          <ArrowLeft size={16} />
          <span>Πίσω στη λίστα</span>
        </button>
        <button 
          className={`favorite-toggle-btn ${isFavorite(race.id) ? 'active' : ''}`}
          onClick={() => toggleFavorite(race.id)}
        >
          <Bookmark size={20} fill={isFavorite(race.id) ? 'var(--accent-primary)' : 'none'} />
        </button>
      </div>

      <div className="detail-content">
        <div className="detail-hero">
          <RaceTypeBadge eventType={race.event_type} iconSize={12} />
          <h1>{race.event_name}</h1>

          <div className="detail-meta">
            <div className="meta-item">
              <Calendar size={16} />
              <span>
                {firstDate
                  ? new Date(firstDate).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Δεν έχει οριστεί'}
              </span>
            </div>
            <div className="meta-item">
              <MapPin size={16} />
              <span>{race.location_place || race.location_city || 'Ελλάδα'}</span>
            </div>
            {race.location_region && (
              <div className="meta-item">
                <Navigation size={16} />
                <span>{race.location_region}</span>
              </div>
            )}
          </div>

          <WeatherWidget lat={race.location_lat} lng={race.location_lng} date={firstDate} />
        </div>

        <div className="detail-section">
          <h3>Πληροφορίες Εκδήλωσης</h3>
          
          {/* Certifications & Swag */}
          {((race.certifications && race.certifications.length > 0) || 
            (race.swag_included && race.swag_included.length > 0)) && (
            <div className="event-extras" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {race.certifications?.map((cert, idx) => (
                <span key={`cert-${idx}`} className="badge cert-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Trophy size={10} /> {cert}
                </span>
              ))}
              {race.swag_included?.map((swag, idx) => (
                <span key={`swag-${idx}`} className="badge swag-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
                  {swag}
                </span>
              ))}
            </div>
          )}

          <div className="full-description">
            <p>{displayedDescription}</p>
            {isLong && (
              <button
                className="text-toggle-btn"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                {isDescriptionExpanded ? 'Λιγότερα' : 'Περισσότερα'}
              </button>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h3>Διαθέσιμες Διαδρομές</h3>
          {isLoadingSubRaces ? (
            <div className="loader">Φόρτωση αποστάσεων...</div>
          ) : subRaces.length > 0 ? (
            <div className="sub-races-list">
              {[...subRaces]
                .sort((a, b) => (b.distance || 0) - (a.distance || 0))
                .map(sub => (
                  <SubRaceCard
                    key={sub.id}
                    subRace={sub}
                    routeData={fetchedRoutes[sub.id]}
                    isSelected={selectedSubRaceId === sub.id}
                    onClick={onSubRaceClick}
                  />
                ))}
            </div>
          ) : (
            <p className="no-subraces">Δεν έχουν καταχωρηθεί συγκεκριμένες αποστάσεις.</p>
          )}
        </div>
      </div>

      <div className="detail-actions" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        {race.registration_url && (
          <a
            href={race.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            className="registration-btn"
            style={{ flex: 1 }}
          >
            Εγγραφή
          </a>
        )}
        <a
          href={race.event_url || race.scraped_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="website-btn"
          style={{ flex: race.registration_url ? 1 : 'none', width: race.registration_url ? 'auto' : '100%' }}
        >
          Ιστοσελίδα <ExternalLink size={16} />
        </a>
      </div>
    </>
  );
}
