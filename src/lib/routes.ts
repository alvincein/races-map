import polyline from '@mapbox/polyline';
import type { Feature, LineString } from 'geojson';
import type { RouteData, RoutePoint, RouteStats } from '../types/routes';

// Re-export for backwards-compat with components that imported the old name.
export type OptimizedRoute = RouteData;

const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const BUCKET_PATH = '/storage/v1/object/public/race-tracks';
const EARTH_RADIUS_M = 6371000;

interface RawRoutePayload {
  points: string;
  elevation?: number[];
  distance: number;
  stats: Omit<RouteStats, 'loss'> & { loss?: number };
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export async function fetchRaceRoute(subRaceId: string): Promise<RouteData> {
  if (!STORAGE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  const url = `${STORAGE_URL}${BUCKET_PATH}/${subRaceId}.json?t=${Date.now()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Route for ${subRaceId} not found (status ${response.status})`);
  }

  const data: RawRoutePayload = await response.json();
  const decodedLatLon = polyline.decode(data.points) as [number, number][];

  const coordinates: [number, number][] = [];
  const profile: RoutePoint[] = [];
  let cumulativeDistance = 0;

  for (let i = 0; i < decodedLatLon.length; i++) {
    const [lat, lng] = decodedLatLon[i];
    coordinates.push([lng, lat]);

    if (i > 0) {
      const [prevLat, prevLng] = decodedLatLon[i - 1];
      cumulativeDistance += haversineMeters(prevLat, prevLng, lat, lng);
    }

    profile.push({
      d: cumulativeDistance,
      e: data.elevation?.[i] ?? 0,
      c: [lng, lat],
    });
  }

  const geojson: Feature<LineString> = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates },
  };

  return {
    coordinates,
    elevation: data.elevation ?? [],
    distance: data.distance,
    stats: { ...data.stats, loss: data.stats.loss ?? 0 },
    profile,
    geojson,
  };
}

/**
 * Calculates the local grade (%) at a point in the route profile.
 * Uses a rolling window around the point (default 30m) to smooth out micro GPS noise.
 */
export function calculatePointGrade(profile: RoutePoint[], point: RoutePoint, windowMeters: number = 30): number {
  if (!profile || profile.length < 2) return 0;

  // Find start of window (at least windowMeters back, or first point)
  let prevIdx = 0;
  for (let i = 0; i < profile.length; i++) {
    if (profile[i].d >= point.d - windowMeters) {
      prevIdx = i;
      break;
    }
  }

  // Find end of window (at least windowMeters ahead, or last point)
  let nextIdx = profile.length - 1;
  for (let i = profile.length - 1; i >= 0; i--) {
    if (profile[i].d <= point.d + windowMeters) {
      nextIdx = i;
      break;
    }
  }

  // If point is at extreme start or end and window range is 0, expand indices
  if (prevIdx === nextIdx) {
    if (prevIdx > 0) prevIdx--;
    else if (nextIdx < profile.length - 1) nextIdx++;
  }

  const prev = profile[prevIdx];
  const next = profile[nextIdx];

  const distDiff = next.d - prev.d;
  if (distDiff <= 0) return 0;

  const eleDiff = next.e - prev.e;
  const grade = (eleDiff / distDiff) * 100;
  return Math.round(grade * 10) / 10;
}
