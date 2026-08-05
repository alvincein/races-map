"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Race, RaceWithSubRaces } from '../types/database';
import { supabase } from '../lib/supabase';
import { fetchRacesWithSubRaces, fetchRaceById } from '../lib/races';
import { getActiveHubs, buildHubDirectory, toActiveHub, type ActiveHub, type HubDirectoryGroup } from '../lib/hubs';
import { FilterState, DEFAULT_FILTERS } from '../types/filters';
import { applyFilters } from '../lib/filters';
import type { RoutePoint } from '../types/routes';
import type { RelatedRaceLink } from '../lib/relatedRaces';
import { useSubRaces } from '../lib/useSubRaces';
import { useRouteIndex } from '../lib/useRouteIndex';
import { useFavorites } from '../lib/useFavorites';
import { getRaceSlug } from '../lib/slugs';
import { List, Loader2, Compass } from 'lucide-react';
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
  // The full race list is always loaded client-side from the cached /api/races
  // endpoint. `initialRaces` is an optional partial seed so the sidebar list is
  // server-rendered — real race links and text in the initial HTML, for SEO —
  // and is replaced by the full set on hydration. Race detail pages instead
  // pass just `initialSelectedRace` so the detail panel renders immediately.
  initialRaces?: RaceWithSubRaces[];
  initialSelectedRaceId?: string;
  initialSelectedRace?: RaceWithSubRaces;
  // Server-computed "Σχετικοί Αγώνες" links for the initially selected race
  // (race detail pages only) — rendered into the SSR HTML for SEO.
  relatedRaces?: RelatedRaceLink[];
  // Server-computed /agones hub links for the initially selected race.
  hubLinks?: { href: string; label: string }[];
  // Hub landing pages (/agones/[hub]): the map opens filtered to this hub's
  // races, framed on its area. `initialRaces` then carries the hub's races
  // (slim) so the list is server-rendered for SEO.
  initialHub?: ActiveHub;
  // /agones index: grouped hub links rendered as a directory panel in the sidebar.
  hubDirectory?: HubDirectoryGroup[];
}

export default function HomeClient({ initialRaces, initialSelectedRaceId, initialSelectedRace, relatedRaces, hubLinks, initialHub, hubDirectory }: HomeClientProps) {
  const seedRaces = initialRaces ?? (initialSelectedRace ? [initialSelectedRace] : []);
  const [races, setRaces] = useState<RaceWithSubRaces[]>(seedRaces);
  const [selectedRace, setSelectedRace] = useState<RaceWithSubRaces | null>(() => {
    if (initialSelectedRace) return initialSelectedRace;
    if (initialSelectedRaceId) {
      return seedRaces.find(r => r.id === initialSelectedRaceId) || null;
    }
    return null;
  });
  const [selectedSubRaceId, setSelectedSubRaceId] = useState<string | null>(null);
  const [hoveredRaceId, setHoveredRaceId] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<RoutePoint | null>(null);
  const [focusedRaces, setFocusedRaces] = useState<RaceWithSubRaces[] | null>(null);
  const [visibleRaces, setVisibleRaces] = useState<RaceWithSubRaces[]>(seedRaces);
  const [sidebarState, setSidebarState] = useState<'minimized' | 'half' | 'full'>(
    (initialSelectedRaceId || initialSelectedRace || initialHub || hubDirectory) ? 'half' : 'minimized'
  );
  const [isListRefreshing, setIsListRefreshing] = useState(false);
  const [isLoadingRaceDetail, setIsLoadingRaceDetail] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  // The active hub scopes the map + list to its races; "Όλοι οι αγώνες" exits.
  // Seeded from the SSR'd hub page prop, and switched entirely client-side
  // when a hub is picked from the Εξερεύνηση panel — no page reloads.
  const [activeHub, setActiveHub] = useState<ActiveHub | null>(initialHub ?? null);
  const hubIdSet = useMemo(
    () => (activeHub ? new Set(activeHub.raceIds) : null),
    [activeHub],
  );
  // The Εξερεύνηση panel (hub directory) replaces the race list when open.
  // /agones passes an SSR'd directory (and starts open, for SEO); once the
  // full race list loads, hubs resolve client-side so selection is instant.
  const [showDirectory, setShowDirectory] = useState<boolean>(!!hubDirectory);
  const clientHubs = useMemo(() => (races.length > 0 ? getActiveHubs(races) : []), [races]);
  const directory = useMemo(() => {
    if (clientHubs.length > 0) return buildHubDirectory(clientHubs);
    return hubDirectory ?? [];
  }, [clientHubs, hubDirectory]);

  const handleToggleDirectory = useCallback(() => {
    setShowDirectory(prev => {
      const next = !prev;
      if (next) {
        setSelectedRace(null);
        setSelectedSubRaceId(null);
        setSidebarState('half');
      }
      return next;
    });
  }, []);

  const handleSelectHub = useCallback((slug: string) => {
    const hub = clientHubs.find(h => h.slug === slug);
    if (!hub) {
      // Race list not loaded yet — fall back to a normal navigation.
      window.location.href = `/agones/${slug}`;
      return;
    }
    setActiveHub(toActiveHub(hub, hub.upcoming.map(r => r.id)));
    setShowDirectory(false);
    setSelectedRace(null);
    setSelectedSubRaceId(null);
    setFocusedRaces(null);
    setSidebarState('half');
    pushStateBypassingNext(null, '', `/agones/${slug}`);
  }, [clientHubs]);

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

  const handleRaceHover = useCallback((raceId: string | null) => {
    setHoveredRaceId(raceId);
  }, []);

  const handleReportRace = useCallback((raceId: string, raceName: string) => {
    setFeedbackType('race_data');
    setFeedbackRaceContext({ id: raceId, name: raceName });
    setShowFeedbackModal(true);
  }, []);


  // Load the full race list from the edge-cached /api/races endpoint. This keeps
  // the ~1,000-race payload out of every statically generated page: pages ship
  // only the slice they need for their initial HTML, then the map data streams
  // in from the CDN here and replaces it. Every caller's `initialRaces` is a
  // partial seed (the home page's next few races, a hub's own races), so this
  // always runs — the full set is needed for the map, the filters, and for
  // "Όλοι οι αγώνες" to exit a hub instantly.
  useEffect(() => {
    let cancelled = false;
    setIsListRefreshing(true);
    fetch('/api/races')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((rows: RaceWithSubRaces[]) => {
        if (cancelled || !Array.isArray(rows)) return;
        setRaces(rows);
        // Seed the visible set so the sidebar list shows races immediately; the
        // map narrows this to the current viewport once it reports bounds.
        setVisibleRaces(rows);
        if (initialSelectedRaceId) {
          setSelectedRace(prev => {
            // Keep an already-hydrated (full-detail) selection; only fill in
            // from the list when we don't yet have the race object.
            if (prev && 'display_description' in (prev as Record<string, unknown>)) return prev;
            return rows.find(r => r.id === initialSelectedRaceId) ?? prev;
          });
        }
      })
      .catch(err => console.error('Failed to load races:', err))
      .finally(() => {
        if (!cancelled) setIsListRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
    // Run once on mount; props are stable per page render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The race list from /api/races is slim (no descriptions, certifications,
  // registration links, etc.) to keep the payload small. When a race is
  // selected, hydrate it with full detail on-demand. Skipped when the object is
  // already full — race detail pages seed a complete `initialSelectedRace`, and
  // a hydrated selection carries the `display_description` key even when it is null.
  useEffect(() => {
    if (!selectedRace) {
      setIsLoadingRaceDetail(false);
      return;
    }
    // Runtime presence check via a cast so TypeScript doesn't narrow the typed
    // object (which always declares `display_description`) down to `never`.
    const alreadyFull = 'display_description' in (selectedRace as Record<string, unknown>);
    if (alreadyFull) {
      setIsLoadingRaceDetail(false);
      return;
    }
    const id = selectedRace.id;
    let cancelled = false;
    setIsLoadingRaceDetail(true);
    fetchRaceById(supabase, id).then(full => {
      if (cancelled) return;
      if (full) {
        setSelectedRace(prev => (prev && prev.id === id ? full : prev));
      }
      setIsLoadingRaceDetail(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedRace]);

  // Ctrl/Cmd+Shift+R bypasses the cache and re-fetches races directly from
  // Supabase. Useful when editing data in Supabase and previewing without
  // triggering an on-demand revalidation.
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
      const raceMatch = path.match(/^\/race\/([^/]+)/);
      const hubMatch = path.match(/^\/agones\/([^/]+)/);
      if (raceMatch) {
        const slugOrId = raceMatch[1];
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
      } else if (hubMatch) {
        // Back/forward onto a hub URL — reactivate it client-side.
        const hub = clientHubs.find(h => h.slug === hubMatch[1]);
        setSelectedRace(null);
        setSelectedSubRaceId(null);
        if (hub) {
          setActiveHub(toActiveHub(hub, hub.upcoming.map(r => r.id)));
          setShowDirectory(false);
          setSidebarState('half');
        }
      } else if (path === '/agones') {
        setSelectedRace(null);
        setSelectedSubRaceId(null);
        setActiveHub(null);
        setShowDirectory(true);
        setSidebarState('half');
      } else {
        setSelectedRace(null);
        setSelectedSubRaceId(null);
        setActiveHub(null);
        setShowDirectory(false);
        setSidebarState('minimized');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [races, clientHubs]);

  const filteredByControls = useMemo(() => {
    const base = applyFilters(races, filters, new Date(), favorites);
    // An active hub scopes the map + list to its races until the user exits
    // via "Όλοι οι αγώνες".
    if (hubIdSet) return base.filter(r => hubIdSet.has(r.id));
    return base;
  }, [races, filters, favorites, hubIdSet]);

  // While a hub is active, leaving a race detail returns to the hub URL, not "/".
  const basePath = activeHub ? `/agones/${activeHub.slug}` : '/';

  const handleExitHub = useCallback(() => {
    setActiveHub(null);
    setFocusedRaces(null);
    pushStateBypassingNext(null, '', '/');
  }, []);

  const handleRaceSelect = useCallback((race: RaceWithSubRaces) => {
    setSelectedRace(race);
    setSelectedSubRaceId(null);
    setShowDirectory(false);
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
    setShowDirectory(false);
    pushStateBypassingNext(null, '', basePath);
  }, [basePath]);

  const handleDeselect = useCallback(() => {
    setSelectedRace(null);
    setSelectedSubRaceId(null);
    setFocusedRaces(null);
    setSidebarState('minimized');
    pushStateBypassingNext(null, '', basePath);
  }, [basePath]);

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
    pushStateBypassingNext(null, '', basePath);
  }, [basePath]);

  const hasElevation = !!(selectedSubRaceId && fetchedRoutes[selectedSubRaceId]);

  const sidebarRaces = focusedRaces
    ?? visibleRaces.filter(r => filteredByControls.some(f => f.id === r.id));

  // Brand card always returns to the plain home view (also exits any hub).
  const handleGoHome = useCallback(() => {
    setSelectedRace(null);
    setSelectedSubRaceId(null);
    setFocusedRaces(null);
    setActiveHub(null);
    setShowDirectory(false);
    setSidebarState('half');
    pushStateBypassingNext(null, '', '/');
  }, []);

  return (
    <main className={`app-layout ${hasElevation ? 'has-elevation' : ''}`}>
      <div className="main-brand-card glass-panel" onClick={handleGoHome} title="Αρχική Σελίδα">
        <img src="/logo-128.png" alt="RaceMap" className="main-brand-logo" />
        <span className="main-brand-title">RaceMap</span>
      </div>

      {/* A real href, not a button: this is the only link out of the SSR'd
          homepage, so crawlers reach the hub tree (and every race) through it.
          The click is still handled client-side, so the map never reloads. */}
      <a
        href="/agones"
        className={`explore-toggle glass-panel no-shimmer ${showDirectory ? 'active' : ''}`}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return;
          e.preventDefault();
          handleToggleDirectory();
        }}
        title="Εξερεύνηση αγώνων ανά πόλη, βουνό, μήνα και απόσταση"
      >
        <Compass size={18} />
        <span>Εξερεύνηση</span>
      </a>

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
        hoveredRaceId={hoveredRaceId}
        hubArea={activeHub?.area ?? null}
        hubFocus={!!activeHub && !activeHub.area}
        hubKey={activeHub?.slug ?? null}
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
        isLoadingRaceDetail={isLoadingRaceDetail}
        onRaceClick={handleRaceSelect}
        onSubRaceClick={handleSubRaceSelect}
        onBack={handleBack}
        sidebarState={sidebarState}
        onStateChange={setSidebarState}
        toggleFavorite={toggleFavorite}
        isFavorite={isFavorite}
        onReportRace={handleReportRace}
        onRaceHover={handleRaceHover}
        relatedRaces={selectedRace && selectedRace.id === initialSelectedRaceId ? relatedRaces : undefined}
        hubLinks={selectedRace && selectedRace.id === initialSelectedRaceId ? hubLinks : undefined}
        hubHeader={
          activeHub
            ? { title: activeHub.h1, count: filteredByControls.length, intro: activeHub.intro }
            : undefined
        }
        onExitHub={activeHub ? handleExitHub : undefined}
        hubDirectory={showDirectory ? directory : undefined}
        showDirectory={showDirectory}
        onToggleDirectory={handleToggleDirectory}
        onHubSelect={handleSelectHub}
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
