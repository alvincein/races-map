"use client";

import React, { useState, useMemo } from 'react';
import { Race, SubRace } from '../types/database';
import { supabase } from '../lib/supabase';
import MapClient from './MapClient';
import Sidebar from './Sidebar';
import { ElevationWidget } from './ElevationWidget';
import { FilterWidget } from './FilterWidget';
import { fetchRaceRoute, OptimizedRoute } from '../lib/routes';
export interface FilterState {
  type: 'all' | 'road' | 'trail';
  distanceRange: string[]; // ['5k', '10k', '21k', '42k', 'ultra']
  months: number[]; // 0-11
  upcomingOnly: boolean;
  dateRange: 'all' | '3months' | '6months' | 'custom';
  regions: string[];
  hasGpxOnly: boolean;
  customDateStart?: string;
  customDateEnd?: string;
}

interface HomeClientProps {
  initialRaces: Race[];
}

export default function HomeClient({ initialRaces }: HomeClientProps) {
  const [races, setRaces] = useState<Race[]>(initialRaces);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [selectedSubRaceId, setSelectedSubRaceId] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [subRaces, setSubRaces] = useState<SubRace[]>([]);
  const [isLoadingSubRaces, setIsLoadingSubRaces] = useState(false);
  const [focusedRaces, setFocusedRaces] = useState<Race[] | null>(null);
  const [visibleRaces, setVisibleRaces] = useState<Race[]>(races);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [fetchedRoutes, setFetchedRoutes] = useState<Record<string, OptimizedRoute>>({});
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    distanceRange: [],
    months: [],
    upcomingOnly: true,
    dateRange: 'all',
    regions: [],
    hasGpxOnly: false
  });

  // Debug refresh function
  const refreshData = async () => {
    console.log('🔄 Debug: Force refreshing data from Supabase...');
    const { data, error } = await supabase
      .from('races')
      .select('*, sub_races!inner(id, has_gpx)')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .limit(1000);
    
    if (!error && data) {
      // Group by race ID and collect all sub_races
      const raceMap = new Map<string, any>();
      
      (data as any[]).forEach(item => {
        if (!raceMap.has(item.id)) {
          raceMap.set(item.id, { ...item, sub_races: [] });
        }
        const race = raceMap.get(item.id);
        const subRaceData = item.sub_races;
        if (Array.isArray(subRaceData)) {
          race.sub_races.push(...subRaceData);
        } else if (subRaceData) {
          race.sub_races.push(subRaceData);
        }
      });

      setRaces(Array.from(raceMap.values()) as unknown as Race[]);
      console.log('✅ Debug: Data refreshed!');
    } else {
      console.error('❌ Debug: Failed to refresh:', error);
    }
  };

  // Hotkey listener (Ctrl + Shift + R)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        refreshData();
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

  const filteredByControls = useMemo(() => {
    return races.filter(race => {
      // Type Filter
      if (filters.type !== 'all' && race.event_type?.toLowerCase() !== filters.type) return false;

      // Distance Filter
      if (filters.distanceRange.length > 0) {
        const dist = race.max_distance || 0;
        const matchesDistance = filters.distanceRange.some(range => {
          if (range === '5k') return dist <= 5000;
          if (range === '10k') return dist > 5000 && dist <= 12000;
          if (range === '21k') return dist > 12000 && dist <= 25000;
          if (range === '42k') return dist > 25000 && dist <= 45000;
          if (range === 'ultra') return dist > 45000;
          return false;
        });
        if (!matchesDistance) return false;
      }

      // Month Filter
      if (filters.months.length > 0) {
        if (!race.dates || race.dates.length === 0) return false;
        const raceMonth = new Date(race.dates[0]).getMonth();
        if (!filters.months.includes(raceMonth)) return false;
      }
      
      // Region Filter
      if (filters.regions.length > 0) {
        if (!race.location_region || !filters.regions.includes(race.location_region)) return false;
      }

      // Upcoming & Date Range Logic
      if (race.dates && race.dates.length > 0) {
        const raceDate = new Date(race.dates[0]);
        const now = new Date();

        if (filters.upcomingOnly && raceDate < now) return false;

        if (filters.dateRange !== 'all') {
          const now = new Date();
          
          if (filters.dateRange === 'custom') {
            if (filters.customDateStart) {
              const start = new Date(filters.customDateStart);
              if (raceDate < start) return false;
            }
            if (filters.customDateEnd) {
              const end = new Date(filters.customDateEnd);
              if (raceDate > end) return false;
            }
          } else {
            const rangeEnd = new Date();
            if (filters.dateRange === '3months') rangeEnd.setMonth(now.getMonth() + 3);
            if (filters.dateRange === '6months') rangeEnd.setMonth(now.getMonth() + 6);
            
            if (raceDate > rangeEnd) return false;
          }
        }
      }

      // GPX Filter
      if (filters.hasGpxOnly) {
        const hasGpx = (race as any).sub_races?.some((sr: any) => sr.has_gpx === true);
        if (!hasGpx) return false;
      }

      return true;
    });
  }, [races, filters]);

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
          routeData={fetchedRoutes[selectedSubRaceId] as any}
          officialStats={subRaces.find(s => s.id === selectedSubRaceId)}
          hoveredPoint={hoveredPoint}
          onHover={setHoveredPoint}
          onClose={() => setSelectedSubRaceId(null)}
        />
      )}
    </main>
  );
}
