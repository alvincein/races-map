"use client";

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search, Loader2, Bookmark } from 'lucide-react';
import type { Race, RaceWithSubRaces } from '../../types/database';
import { RaceCard } from './RaceCard';

interface RaceListProps {
  races: RaceWithSubRaces[];
  isFiltered: boolean;
  isRefreshing: boolean;
  onRaceClick: (race: RaceWithSubRaces) => void;
  onBack: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export function RaceList({ races, isFiltered, isRefreshing, onRaceClick, onBack, toggleFavorite, isFavorite }: RaceListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRaces = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = races.filter(r =>
      r.event_name.toLowerCase().includes(term) ||
      (r.location_place?.toLowerCase().includes(term)),
    );
    return [...filtered].sort((a, b) => {
      const dateA = a.dates?.length ? new Date(a.dates[0]).getTime() : Infinity;
      const dateB = b.dates?.length ? new Date(b.dates[0]).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [races, searchTerm]);

  return (
    <>
      <div className="sidebar-header">
        {isFiltered ? (
          <button className="back-btn" onClick={onBack} style={{ marginBottom: '16px' }}>
            <ArrowLeft size={16} />
            <span>Εμφάνιση όλων των αγώνων</span>
            {isRefreshing && <Loader2 size={14} className="animate-spin" style={{ marginLeft: '8px', opacity: 0.7 }} />}
          </button>
        ) : null}

        {isFiltered && <h2 className="filter-title">Αγωνες σε αυτη την τοποθεσια</h2>}

        <div className="search-row">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Αναζήτηση αγώνων..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {!isFiltered && isRefreshing && (
              <Loader2 size={18} className="search-spinner animate-spin" />
            )}
          </div>
        </div>
      </div>

      <div className="races-list">
        {filteredRaces.map(race => (
          <RaceCard
            key={race.id}
            race={race}
            isSelected={false}
            onClick={onRaceClick}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite(race.id)}
          />
        ))}
        {filteredRaces.length === 0 && (
          <div className="no-results">Δεν βρέθηκαν αγώνες.</div>
        )}
      </div>
    </>
  );
}
