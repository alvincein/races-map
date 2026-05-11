"use client";

import React, { useState } from 'react';
import { Calendar, MapPin, ArrowLeft, ExternalLink, Navigation } from 'lucide-react';
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
}

export function RaceDetail({
  race, subRaces, selectedSubRaceId, fetchedRoutes, isLoadingSubRaces, onSubRaceClick, onBack,
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
      <div className="sidebar-header">
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
              {subRaces.map(sub => (
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

      <div className="detail-actions">
        <a
          href={race.event_url || race.scraped_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="primary-btn"
        >
          Επίσημη Ιστοσελίδα <ExternalLink size={18} />
        </a>
      </div>
    </>
  );
}
