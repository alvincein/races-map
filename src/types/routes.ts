import type { Feature, LineString } from 'geojson';

/**
 * A sample point along a race route. `d` = distance from start in meters,
 * `e` = elevation in meters, `c` = coordinates as [lng, lat].
 */
export interface RoutePoint {
  d: number;
  e: number;
  c: [number, number];
}

/** Aggregate stats computed from the route's elevation profile. */
export interface RouteStats {
  max_ele: number;
  min_ele: number;
  gain: number;
  loss: number;
}

/** A loaded, ready-to-render route with both renderable geometry and a sampled profile. */
export interface RouteData {
  coordinates: [number, number][];
  elevation: number[];
  distance: number;
  stats: RouteStats;
  profile: RoutePoint[];
  geojson: Feature<LineString>;
}

/** Map of sub_race id → loaded route (some keys may be absent). */
export type RouteIndex = Record<string, RouteData>;
