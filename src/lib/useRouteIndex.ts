"use client";

import { useEffect, useState } from 'react';
import type { SubRace } from '../types/database';
import type { RouteIndex } from '../types/routes';
import { fetchRaceRoute } from './routes';

interface UseRouteIndexResult {
  routes: RouteIndex;
  isLoading: boolean;
}

const EMPTY: RouteIndex = {};

/**
 * Loads available GPX routes for a list of sub-races, in parallel. Resets when
 * the sub-race set changes. Sub-races without a stored route fail silently and
 * simply don't appear in the returned index.
 */
export function useRouteIndex(subRaces: SubRace[]): UseRouteIndexResult {
  const [routes, setRoutes] = useState<RouteIndex>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (subRaces.length === 0) {
      setRoutes(EMPTY);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setRoutes(EMPTY);

    // Debounce the fetching and decoding of routes by 800ms. This prevents the
    // CPU-heavy polyline decoding and distance calculations from blocking the
    // browser main thread during map camera flight transitions (flyTo).
    const timer = setTimeout(() => {
      Promise.all(
        subRaces.map(async sub => {
          if (!sub.has_gpx) return null;
          try {
            const route = await fetchRaceRoute(sub.id);
            return [sub.id, route] as const;
          } catch {
            return null;
          }
        }),
      ).then(entries => {
        if (cancelled) return;
        const next: RouteIndex = {};
        for (const entry of entries) if (entry) next[entry[0]] = entry[1];
        setRoutes(next);
        setIsLoading(false);
      });
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [subRaces]);

  return { routes, isLoading };
}
