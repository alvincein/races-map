"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Race } from '../types/database';
import { supabase } from '../lib/supabase';
import { fetchRacesWithSubRaces } from '../lib/races';
import { FilterState, DEFAULT_FILTERS } from '../types/filters';
import { applyFilters } from '../lib/filters';
import type { RoutePoint } from '../types/routes';
import { useSubRaces } from '../lib/useSubRaces';
import { useRouteIndex } from '../lib/useRouteIndex';
import MapClient from './MapClient';
import Sidebar from './Sidebar';
import { ElevationWidget } from './ElevationWidget';
import { FilterWidget } from './FilterWidget';

interface HomeClientProps {
  initialRaces: Race[];
}

export default function HomeClient({ initialRaces }: HomeClientProps) {
  const [races, setRaces] = useState<Race[]>(initialRaces);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [selectedSubRaceId, setSelectedSubRaceId] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<RoutePoint | null>(null);
  const [focusedRaces, setFocusedRaces] = useState<Race[] | null>(null);
  const [visibleRaces, setVisibleRaces] = useState<Race[]>(initialRaces);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const { subRaces, isLoading: isLoadingSubRaces } = useSubRaces(selectedRace?.id ?? null);
  const { routes: fetchedRoutes } = useRouteIndex(subRaces);

  // Ctrl/Cmd+Shift+R bypasses ISR and re-fetches races from Supabase. Useful
  // when editing data in Supabase and previewing without waiting for the
  // 1-hour revalidate window.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        fetchRacesWithSubRaces(supabase).then(rows => {
          if (rows.length > 0) setRaces(rows as unknown as Race[]);
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredByControls = useMemo(() => applyFilters(races, filters), [races, filters]);

  const handleRaceSelect = (race: Race) => {
    setSelectedRace(race);
    setSelectedSubRaceId(null);
    setIsSidebarMinimized(false);
  };

  const handleSubRaceSelect = (subRaceId: string) => {
    const isSelecting = subRaceId !== selectedSubRaceId;
    setSelectedSubRaceId(isSelecting ? subRaceId : null);
    if (isSelecting) setIsSidebarMinimized(true);
  };

  const handleClusterClick = (racesInCluster: Race[]) => {
    setFocusedRaces(racesInCluster);
    setSelectedRace(null);
  };

  const handleDeselect = () => {
    setSelectedRace(null);
    setSelectedSubRaceId(null);
    setFocusedRaces(null);
    setIsSidebarMinimized(true);
  };

  const hasElevation = !!(selectedSubRaceId && fetchedRoutes[selectedSubRaceId]);

  const sidebarRaces = focusedRaces
    ?? visibleRaces.filter(r => filteredByControls.some(f => f.id === r.id));

  return (
    <main className={`app-layout ${hasElevation ? 'has-elevation' : ''}`}>
      <MapClient
        races={filteredByControls}
        selectedRace={selectedRace}
        selectedSubRaceId={selectedSubRaceId}
        subRaces={subRaces}
        fetchedRoutes={fetchedRoutes}
        hoveredPoint={hoveredPoint}
        onRaceSelect={handleRaceSelect}
        onClusterClick={handleClusterClick}
        onVisibleRacesChange={setVisibleRaces}
        onDeselect={handleDeselect}
      />
      <Sidebar
        races={sidebarRaces}
        isFiltered={focusedRaces !== null}
        selectedRace={selectedRace}
        selectedSubRaceId={selectedSubRaceId}
        subRaces={subRaces}
        fetchedRoutes={fetchedRoutes}
        isLoadingSubRaces={isLoadingSubRaces}
        onRaceClick={handleRaceSelect}
        onSubRaceClick={handleSubRaceSelect}
        onBack={handleDeselect}
        isMinimized={isSidebarMinimized}
        onMinimize={() => setIsSidebarMinimized(!isSidebarMinimized)}
      />

      <FilterWidget filters={filters} onChange={setFilters} />

      {isSidebarMinimized && (
        <button
          className="mobile-expand-btn glass-panel"
          onClick={() => setIsSidebarMinimized(false)}
        >
          Εμφάνιση Λίστας
        </button>
      )}

      {selectedSubRaceId && fetchedRoutes[selectedSubRaceId] && (
        <ElevationWidget
          routeData={fetchedRoutes[selectedSubRaceId]}
          officialStats={subRaces.find(s => s.id === selectedSubRaceId) ?? null}
          hoveredPoint={hoveredPoint}
          onHover={setHoveredPoint}
          onClose={() => setSelectedSubRaceId(null)}
        />
      )}
    </main>
  );
}
