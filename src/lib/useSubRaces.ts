"use client";

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { SubRace } from '../types/database';

interface UseSubRacesResult {
  subRaces: SubRace[];
  isLoading: boolean;
}

/**
 * Fetches sub-races for a given parent race id. Resets to `[]` when `raceId`
 * is null. Network errors are logged and surface as an empty list.
 */
export function useSubRaces(raceId: string | null): UseSubRacesResult {
  const [subRaces, setSubRaces] = useState<SubRace[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!raceId) {
      setSubRaces([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);

    supabase
      .from('sub_races')
      .select('*')
      .eq('race_id', raceId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error fetching sub-races:', error);
          setSubRaces([]);
        } else {
          setSubRaces((data ?? []) as SubRace[]);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [raceId]);

  return { subRaces, isLoading };
}
