"use client";

import React, { useState, useMemo } from 'react';
import { Race, SubRace } from '../types/database';
import { supabase } from '../lib/supabase';
import { fetchRacesWithSubRaces } from '../lib/races';
import { fetchRaceRoute, OptimizedRoute } from '../lib/routes';
import { FilterState, DEFAULT_FILTERS } from '../types/filters';
import { applyFilters } from '../lib/filters';
import type { RoutePoint } from '../types/routes';
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
  const [subRaces, setSubRaces] = useState<SubRace[]>([]);
  const [isLoadingSubRaces, setIsLoadingSubRaces] = useState(false);
  const [focusedRaces, setFocusedRaces] = useState<Race[] | null>(null);
  const [visibleRaces, setVisibleRaces] = useState<Race[]>(races);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [fetchedRoutes, setFetchedRoutes] = useState<Record<string, OptimizedRoute>>({});
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  React.useEffect(() => {
    // Ctrl/Cmd+Shift+R to bypass ISR and refetch races from Supabase. Useful
    // when editing data in Supabase and previewing without waiting for the
    // 1-hour revalidate window.
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

  const fetchSubRaces = async (raceId: string) => {
    setIsLoadingSubRaces(true);
    setFetchedRoutes({});
    try {
      const { data, error } = await supabase
        .from('sub_races')
        .select('*')
        .eq('race_id', raceId);
      
      if (error) throw error;
      const subs: SubRace[] = data || [];
      setSubRaces(subs);

      const routesDict: Record<string, OptimizedRoute> = {};
      await Promise.all(subs.map(async (sub) => {
        try {
          const route = await fetchRaceRoute(sub.id);
          routesDict[sub.id] = route;
        } catch (e) {
          // Route not found, ignore
        }
      }));
      setFetchedRoutes(routesDict);

    } catch (err) {
      console.error('Error fetching sub-races:', err);
      setSubRaces([]);
    } finally {
      setIsLoadingSubRaces(false);
    }
  };

  const filteredByControls = useMemo(() => applyFilters(races, filters), [races, filters]);

  const handleRaceSelect = (race: Race) => {
    setSelectedRace(race);
    setSelectedSubRaceId(null);
    setIsSidebarMinimized(false);
    fetchSubRaces(race.id);
  };

  const handleSubRaceSelect = (subRaceId: string) => {
    const isSelecting = subRaceId !== selectedSubRaceId;
    setSelectedSubRaceId(isSelecting ? subRaceId : null);
    if (isSelecting) {
      setIsSidebarMinimized(true);
    }
  };

  const handleClusterClick = (races: Race[]) => {
    setFocusedRaces(races);
    setSelectedRace(null);
  };

  const handleDeselect = () => {
    setSelectedRace(null);
    setSelectedSubRaceId(null);
    setSubRaces([]);
    setFocusedRaces(null);
    setIsSidebarMinimized(true);
  };
  const hasElevation = !!(selectedSubRaceId && fetchedRoutes[selectedSubRaceId]);

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
        races={focusedRaces || visibleRaces.filter(r => filteredByControls.some(f => f.id === r.id))}
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

      <FilterWidget 
        filters={filters}
        onChange={setFilters}
      />

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
