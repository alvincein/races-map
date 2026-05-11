import polyline from '@mapbox/polyline';

const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || 'https://YOUR_NEW_PROJECT_ID.supabase.co';
const BUCKET_PATH = '/storage/v1/object/public/race-tracks';

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371000; // Radius of the earth in m
  var dLat = deg2rad(lat2-lat1); 
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; 
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export interface OptimizedRoute {
  coordinates: [number, number][]; // [lng, lat]
  elevation: number[];
  distance: number;
  stats: {
    max_ele: number;
    min_ele: number;
    gain: number;
    loss?: number;
  };
  profile: { d: number, e: number, c: [number, number] }[];
  geojson: any;
}

export async function fetchRaceRoute(subRaceId: string): Promise<OptimizedRoute> {
  const url = `${STORAGE_URL}${BUCKET_PATH}/${subRaceId}.json`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Route for ${subRaceId} not found`);
  }
  
  const data = await response.json();
  
  // Decode polyline [lat, lng]
  const decodedLatLon = polyline.decode(data.points) as [number, number][];
  
  const coordinates: [number, number][] = [];
  const profile: { d: number, e: number, c: [number, number] }[] = [];
  
  let currentDist = 0;
  for (let i = 0; i < decodedLatLon.length; i++) {
    const lat = decodedLatLon[i][0];
    const lng = decodedLatLon[i][1];
    coordinates.push([lng, lat]);
    
    if (i > 0) {
      const prevLat = decodedLatLon[i-1][0];
      const prevLng = decodedLatLon[i-1][1];
      currentDist += getDistanceFromLatLonInMeters(prevLat, prevLng, lat, lng);
    }
    
    profile.push({
      d: currentDist,
      e: data.elevation && data.elevation[i] !== undefined ? data.elevation[i] : 0,
      c: [lng, lat]
    });
  }
  
  const geojson = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    }
  };
  
  return {
    coordinates,
    elevation: data.elevation,
    distance: data.distance,
    stats: {
      ...data.stats,
      loss: data.stats.loss || 0
    },
    profile,
    geojson
  };
}

