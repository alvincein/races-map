"use client";

import { useEffect, useState } from 'react';
import type { SubRace } from '../types/database';
import type { RouteIndex } from '../types/routes';
import { fetchRaceRoute } from './routes';

interface UseRouteIndexResult {
  routes: RouteIndex;
  isLoading: boolean;
}

/**
 * Loads available GPX routes for a list of sub-races, in parallel.
 *
 * Resets when the sub-race set changes (e.g. selecting a new parent race).
 * Sub-races without a stored route fail silently — they simply won't appear
 * in the returned `routes` index. Callers should treat absence as "no route".
 */
export function useRouteIndex(subRaces: SubRace[]): UseRouteIndexResult {
  const [routes, setRoutes] = useState<RouteIndex>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (subRaces.length === 0) {
      setRoutes({});
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setRoutes({});

    Promise.all(
      subRaces.map(async sub => {
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
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }
      setRoutes(next);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [subRaces]);

  return { routes, isLoading };
}
