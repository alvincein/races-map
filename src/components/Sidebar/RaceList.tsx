"use client";

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import type { Race } from '../../types/database';
import { RaceCard } from './RaceCard';

interface RaceListProps {
  races: Race[];
  isFiltered: boolean;
  onRaceClick: (race: Race) => void;
  onBack: () => void;
}

export function RaceList({ races, isFiltered, onRaceClick, onBack }: RaceListProps) {
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
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Εμφάνιση όλων των αγώνων</span>
          </button>
        ) : (
          <h1>Αγώνες στην Ελλάδα</h1>
        )}

        {isFiltered && <h2 className="filter-title">Αγώνες σε αυτή την τοποθεσία</h2>}

        <div className="search-row">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Αναζήτηση αγώνων..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="races-list">
        {filteredRaces.map(race => (
          <RaceCard key={race.id} race={race} isSelected={false} onClick={onRaceClick} />
        ))}
        {filteredRaces.length === 0 && (
          <div className="no-results">Δεν βρέθηκαν αγώνες.</div>
        )}
      </div>
    </>
  );
}
