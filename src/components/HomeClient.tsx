"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Race, RaceWithSubRaces } from '../types/database';
import { supabase } from '../lib/supabase';
import { fetchRacesWithSubRaces } from '../lib/races';
import { FilterState, DEFAULT_FILTERS } from '../types/filters';
import { applyFilters } from '../lib/filters';
import type { RoutePoint } from '../types/routes';
import { useSubRaces } from '../lib/useSubRaces';
import { useRouteIndex } from '../lib/useRouteIndex';
import { useFavorites } from '../lib/useFavorites';
import { getRaceSlug } from '../lib/slugs';
import { List, Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import dynamic from 'next/dynamic';

const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      background: '#111827',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '12px',
      color: '#9CA3AF',
      zIndex: 1
    }}>
      <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
      <span>Φόρτωση χάρτη...</span>
    </div>
  )
});
import { ElevationWidget } from './ElevationWidget';
import { FilterWidget } from './FilterWidget';
import { FeedbackModal } from './FeedbackModal';

// Safely bypass Next.js App Router's history interception to prevent heavy layout and React Server
// Component transitions during map animations. We first attempt to invoke the native prototype method,
// falling back to a clean iframe window history context, and finally to standard pushState.
function pushStateBypassingNext(state: any, title: string, url: string) {
  if (typeof window === 'undefined') return;

  try {
    if (typeof History !== 'undefined' && History.prototype.pushState) {
      History.prototype.pushState.call(window.history, state, title, url);
      return;
    }
  } catch (e) {
    console.error('Failed to call History.prototype.pushState:', e);
  }

  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const native = iframe.contentWindow?.history.pushState;
    if (native) {
      native.call(window.history, state, title, url);
      document.body.removeChild(iframe);
      return;
    }
    document.body.removeChild(iframe);
  } catch (e) {
    console.error('Failed to retrieve native pushState from iframe:', e);
  }

  window.history.pushState(state, title, url);
}

interface HomeClientProps {
  initialRaces: RaceWithSubRaces[];
  initialSelectedRaceId?: string;
}

export default function HomeClient({ initialRaces, initialSelectedRaceId }: HomeClientProps) {
  const [races, setRaces] = useState<RaceWithSubRaces[]>(initialRaces);
  const [selectedRace, setSelectedRace] = useState<RaceWithSubRaces | null>(() => {
    if (initialSelectedRaceId) {
      return initialRaces.find(r => r.id === initialSelectedRaceId) || null;
    }
    return null;
  });
  const [selectedSubRaceId, setSelectedSubRaceId] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<RoutePoint | null>(null);
  const [focusedRaces, setFocusedRaces] = useState<RaceWithSubRaces[] | null>(null);
  const [visibleRaces, setVisibleRaces] = useState<RaceWithSubRaces[]>(initialRaces);
  const [sidebarState, setSidebarState] = useState<'minimized' | 'half' | 'full'>(
    initialSelectedRaceId ? 'half' : 'minimized'
  );
  const [isListRefreshing, setIsListRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const { subRaces, isLoading: isLoadingSubRaces } = useSubRaces(selectedRace?.id ?? null);
  const { routes: fetchedRoutes } = useRouteIndex(subRaces);
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'race_data'>('bug');
  const [feedbackRaceContext, setFeedbackRaceContext] = useState<{ id: string; name: string } | null>(null);

  const handleOpenFeedback = useCallback(() => {
    setFeedbackType('bug');
    setFeedbackRaceContext(null);
    setShowFeedbackModal(true);
  }, []);

  const handleReportRace = useCallback((raceId: string, raceName: string) => {
    setFeedbackType('race_data');
    setFeedbackRaceContext({ id: raceId, name: raceName });
    setShowFeedbackModal(true);
  }, []);


  // Ctrl/Cmd+Shift+R bypasses ISR and re-fetches races from Supabase. Useful
  // when editing data in Supabase and previewing without waiting for the
  // 1-hour revalidate window.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        fetchRacesWithSubRaces(supabase).then(rows => {
          if (rows.length > 0) setRaces(rows);
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for browser back/forward history events to update selection state
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/race\/([^/]+)/);
      if (match) {
        const slugOrId = match[1];
        const race = races.find(r => getRaceSlug(r) === slugOrId || r.id === slugOrId);
        if (race) {
          setSelectedRace(race);
          setSelectedSubRaceId(null);
          setSidebarState('half');
        } else {
          setSelectedRace(null);
          setSelectedSubRaceId(null);
          setSidebarState('minimized');
        }
      } else {
        setSelectedRace(null);
        setSelectedSubRaceId(null);
        setSidebarState('minimized');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [races]);

  const filteredByControls = useMemo(() => applyFilters(races, filters, new Date(), favorites), [races, filters, favorites]);


  const handleRaceSelect = useCallback((race: RaceWithSubRaces) => {
    setSelectedRace(race);
    setSelectedSubRaceId(null);
    setSidebarState('half');
    pushStateBypassingNext(null, '', `/race/${getRaceSlug(race)}`);
  }, []);

  const handleSubRaceSelect = useCallback((subRaceId: string) => {
    setSelectedSubRaceId(prev => {
      const isSelecting = subRaceId !== prev;
      if (isSelecting) setSidebarState('minimized');
      return isSelecting ? subRaceId : null;
    });
  }, []);

  const handleClusterClick = useCallback((racesInCluster: RaceWithSubRaces[]) => {
    setFocusedRaces(racesInCluster);
    setSelectedRace(null);
    pushStateBypassingNext(null, '', '/');
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedRace(null);
    setSelectedSubRaceId(null);
    setFocusedRaces(null);
    setSidebarState('minimized');
    pushStateBypassingNext(null, '', '/');
  }, []);

  const handleFilterToggle = useCallback((open: boolean) => {
    if (open) setSidebarState('minimized');
    else setSidebarState('half');
  }, []);

  const handleToggleFavorites = useCallback(() => {
    setFilters(f => ({ ...f, favoritesOnly: !f.favoritesOnly }));
  }, []);

  const handleBack = useCallback(() => {
    setSelectedRace(null);
    setSelectedSubRaceId(null);
    setFocusedRaces(null);
    setSidebarState('half');
    pushStateBypassingNext(null, '', '/');
  }, []);

  const hasElevation = !!(selectedSubRaceId && fetchedRoutes[selectedSubRaceId]);

  const sidebarRaces = focusedRaces
    ?? visibleRaces.filter(r => filteredByControls.some(f => f.id === r.id));

  return (
    <main className={`app-layout ${hasElevation ? 'has-elevation' : ''}`}>
      <div className="main-brand-card glass-panel" onClick={handleBack} title="Αρχική Σελίδα">
        <img src="/logo-white.svg" alt="RaceMap" className="main-brand-logo" />
        <span className="main-brand-title">RaceMap</span>
      </div>

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
        filters={filters}
        onFiltersChange={setFilters}
        onFilterToggle={handleFilterToggle}
        onRefreshingChange={setIsListRefreshing}
        isFavorite={isFavorite}
        onFeedbackClick={handleOpenFeedback}
        onSubRaceSelect={handleSubRaceSelect}
        favoritesCount={favorites.length}
        onToggleFavorites={handleToggleFavorites}
      />
      <Sidebar
        races={sidebarRaces}
        isRefreshing={isListRefreshing}
        isFiltered={focusedRaces !== null}
        selectedRace={selectedRace}
        selectedSubRaceId={selectedSubRaceId}
        subRaces={subRaces}
        fetchedRoutes={fetchedRoutes}
        isLoadingSubRaces={isLoadingSubRaces}
        onRaceClick={handleRaceSelect}
        onSubRaceClick={handleSubRaceSelect}
        onBack={handleBack}
        sidebarState={sidebarState}
        onStateChange={setSidebarState}
        toggleFavorite={toggleFavorite}
        isFavorite={isFavorite}
        onReportRace={handleReportRace}
      />




      {sidebarState === 'minimized' && (
        <button
          className="mobile-expand-btn glass-panel"
          onClick={() => setSidebarState('half')}
        >
          {isListRefreshing ? (
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
          ) : (
            <List size={18} />
          )}
          <span>Λίστα Αγώνων ({sidebarRaces.length})</span>
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

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        preselectedType={feedbackType}
        raceContext={feedbackRaceContext}
      />
    </main>
  );
}
