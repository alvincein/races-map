"use client";

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import useSupercluster from 'use-supercluster';
import { Race, SubRace, RaceWithSubRaces } from '../types/database';
import type { RouteData, RouteIndex, RoutePoint } from '../types/routes';
import { RaceMarker } from './Map/RaceMarker';
import { ClusterMarker } from './Map/ClusterMarker';
import { SpiderfiedCluster } from './Map/SpiderfiedCluster';
import { RouteLayer } from './Map/RouteLayer';
import { MapControls } from './Map/MapControls';
import { MAP_STYLES, ROUTE_COLORS } from './Map/mapStyles';
import type { ClusterFeature, RacePointFeature, RacePointProps, SpiderfiedClusterState, MapStyle } from './Map/types';
import { useGeolocation } from './Map/useGeolocation';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FilterWidget } from './FilterWidget';
import { FilterState } from '../types/filters';

const INITIAL_VIEW_STATE = {
  longitude: 23.7275,
  latitude: 37.9838,
  zoom: 5.2,
  pitch: 30,
  bearing: 0,
};

const VIEWPORT_DEBOUNCE_MS = 150;
const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 20;

export interface HubArea {
  lat: number;
  lng: number;
  radiusKm: number;
}

// Approximate a km-radius circle as a GeoJSON polygon (64 segments).
function circlePolygon(area: HubArea) {
  const latR = area.radiusKm / 110.574;
  const lngR = area.radiusKm / (111.32 * Math.cos((area.lat * Math.PI) / 180));
  const coords: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * 2 * Math.PI;
    coords.push([area.lng + lngR * Math.cos(t), area.lat + latR * Math.sin(t)]);
  }
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
  };
}

function circleBounds(area: HubArea): [[number, number], [number, number]] {
  const latR = area.radiusKm / 110.574;
  const lngR = area.radiusKm / (111.32 * Math.cos((area.lat * Math.PI) / 180));
  return [
    [area.lng - lngR, area.lat - latR],
    [area.lng + lngR, area.lat + latR],
  ];
}

function racesBounds(races: RaceWithSubRaces[]): [[number, number], [number, number]] | null {
  const pts = races.filter((r) => r.location_lat != null && r.location_lng != null);
  if (pts.length === 0) return null;
  let minLng = pts[0].location_lng!, minLat = pts[0].location_lat!;
  let maxLng = minLng, maxLat = minLat;
  for (const r of pts) {
    if (r.location_lng! < minLng) minLng = r.location_lng!;
    if (r.location_lat! < minLat) minLat = r.location_lat!;
    if (r.location_lng! > maxLng) maxLng = r.location_lng!;
    if (r.location_lat! > maxLat) maxLat = r.location_lat!;
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

interface MapClientProps {
  races: RaceWithSubRaces[];
  selectedRace: RaceWithSubRaces | null;
  selectedSubRaceId: string | null;
  subRaces: SubRace[];
  fetchedRoutes: RouteIndex;
  hoveredPoint: RoutePoint | null;
  onRaceSelect: (race: RaceWithSubRaces) => void;
  onClusterClick: (races: RaceWithSubRaces[]) => void;
  onVisibleRacesChange: (races: RaceWithSubRaces[]) => void;
  onDeselect: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onFilterToggle?: (open: boolean) => void;
  onRefreshingChange?: (refreshing: boolean) => void;
  isFavorite: (id: string) => boolean;
  onFeedbackClick: () => void;
  onSubRaceSelect: (id: string) => void;
  favoritesCount: number;
  onToggleFavorites: () => void;
  hoveredRaceId: string | null;
  /** Hub landing pages: geographic area to outline and frame (city/mountain). */
  hubArea?: HubArea | null;
  /** Hub landing pages without a geo area: frame the given races instead. */
  hubFocus?: boolean;
  /** Identity of the active hub — drives client-side fly-in/out transitions. */
  hubKey?: string | null;
}

export default function MapClient({
  races,
  selectedRace,
  selectedSubRaceId,
  subRaces,
  onRaceSelect,
  onClusterClick,
  onVisibleRacesChange,
  onDeselect,
  hoveredPoint,
  fetchedRoutes,
  filters,
  onFiltersChange,
  onFilterToggle,
  onRefreshingChange,
  isFavorite,
  onFeedbackClick,
  onSubRaceSelect,
  favoritesCount,
  onToggleFavorites,
  hoveredRaceId,
  hubArea = null,
  hubFocus = false,
  hubKey = null,
}: MapClientProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [currentStyle, setCurrentStyle] = useState(MAP_STYLES[0]);
  const [spiderfiedCluster, setSpiderfiedCluster] = useState<SpiderfiedClusterState | null>(null);
  // Only track the integer zoom level for cluster recalculation — avoids
  // re-rendering on every fractional zoom change during pinch/scroll.
  const [clusterZoom, setClusterZoom] = useState(Math.floor(INITIAL_VIEW_STATE.zoom));
  const [bounds, setBounds] = useState<[number, number, number, number] | undefined>(undefined);
  // Track whether to show the "reset view" button without triggering
  // cluster recalculations or re-rendering on every frame of a zoom.
  const [showResetZoom, setShowResetZoom] = useState(() => {
    if (selectedRace?.location_lng != null && selectedRace?.location_lat != null) {
      return true; // Selected race zoom is 12, which is > 7.5
    }
    return INITIAL_VIEW_STATE.zoom > 7.5;
  });
  const { userLocation, isLocating, locateAndFly } = useGeolocation();

  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // RAF-based throttle ref so we don't schedule more than one frame at a time.
  const rafRef = useRef<number | null>(null);

  const toggleStyleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !showStyleMenu;
    setShowStyleMenu(nextState);
    if (nextState) setShowFilterMenu(false);
  }, [showStyleMenu]);

  const handleStyleChange = useCallback((style: MapStyle) => {
    setCurrentStyle(style);
    setShowStyleMenu(false);
  }, []);

  const toggleFilterMenu = useCallback((open: boolean) => {
    setShowFilterMenu(open);
    if (open) setShowStyleMenu(false);
    onFilterToggle?.(open);
  }, [onFilterToggle]);

  const resetView = useCallback(() => {
    mapRef.current?.flyTo({
      center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
      zoom: INITIAL_VIEW_STATE.zoom,
      pitch: INITIAL_VIEW_STATE.pitch,
      bearing: INITIAL_VIEW_STATE.bearing,
      duration: 1500,
    });
  }, []);

  const points = useMemo<RacePointFeature[]>(() => {
    return (races as RaceWithSubRaces[])
      .filter((r): r is RaceWithSubRaces & { location_lat: number; location_lng: number } =>
        r.location_lat != null && r.location_lng != null && !r.is_featured,
      )
      .map(race => ({
        type: 'Feature',
        properties: { cluster: false, raceId: race.id, race },
        geometry: { type: 'Point', coordinates: [race.location_lng, race.location_lat] as [number, number] },
      }));
  }, [races]);

  const featuredRaces = useMemo(() => {
    return (races as RaceWithSubRaces[]).filter(
      (r): r is RaceWithSubRaces & { location_lat: number; location_lng: number } =>
        !!r.is_featured && r.location_lat != null && r.location_lng != null,
    );
  }, [races]);

  const { clusters, supercluster } = useSupercluster<RacePointProps>({
    points,
    bounds,
    zoom: clusterZoom,
    options: { radius: CLUSTER_RADIUS, maxZoom: CLUSTER_MAX_ZOOM },
  });

  const syncMapState = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const mapBounds = map.getBounds();
    if (mapBounds) {
      setBounds([
        mapBounds.getWest(),
        mapBounds.getSouth(),
        mapBounds.getEast(),
        mapBounds.getNorth(),
      ]);
    }
    const z = map.getZoom();
    const floorZ = Math.floor(z);
    setClusterZoom(prev => (prev !== floorZ ? floorZ : prev));
    const nextShow = z > 7.5;
    setShowResetZoom(prev => (prev !== nextShow ? nextShow : prev));
  }, []);

  useEffect(() => {
    if (!bounds) return;
    onRefreshingChange?.(true);
    const timer = setTimeout(() => {
      const filtered = races.filter(race =>
        race.location_lng != null &&
        race.location_lat != null &&
        race.location_lng >= bounds[0] &&
        race.location_lat >= bounds[1] &&
        race.location_lng <= bounds[2] &&
        race.location_lat <= bounds[3],
      );
      onVisibleRacesChange(filtered);
      onRefreshingChange?.(false);
    }, VIEWPORT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [bounds, races, onVisibleRacesChange, onRefreshingChange]);

  const handleClusterZoom = useCallback((lng: number, lat: number, zoom: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 500 });
  }, []);

  const handleSpiderfy = useCallback(
    (id: number, clusterRaces: RaceWithSubRaces[], lng: number, lat: number) => {
      setSpiderfiedCluster({ id, races: clusterRaces, lng, lat });
      onClusterClick(clusterRaces);
    },
    [onClusterClick],
  );

  const handleRaceClick = useCallback(
    (race: RaceWithSubRaces) => {
      onRaceSelect(race);
    },
    [onRaceSelect],
  );

  const routesToShow = useMemo(() => {
    if (!selectedRace || !subRaces.length) return [];
    return subRaces
      .filter(sub => fetchedRoutes[sub.id])
      .map(sub => ({
        ...fetchedRoutes[sub.id],
        subRaceId: sub.id,
        isFocused: selectedSubRaceId === sub.id,
        aid_stations: sub.aid_stations,
      }));
  }, [selectedRace, selectedSubRaceId, subRaces, fetchedRoutes]);

  const interactiveLayerIds = useMemo(() => {
    return [
      ...routesToShow.map((_, i) => `route-line-${i}`),
      ...routesToShow.map((_, i) => `route-hitarea-${i}`)
    ];
  }, [routesToShow]);

  // Cancel any pending RAF on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Dynamic initial view state calculated once on mount
  const initialViewState = useMemo(() => {
    if (selectedRace?.location_lng != null && selectedRace?.location_lat != null) {
      return {
        longitude: selectedRace.location_lng,
        latitude: selectedRace.location_lat,
        zoom: 12,
        pitch: 45,
        bearing: 0,
      };
    }
    // Hub landing pages open framed on their area (or their races).
    if (hubArea) {
      return { bounds: circleBounds(hubArea), fitBoundsOptions: { padding: 60 } };
    }
    if (hubFocus) {
      const bounds = racesBounds(races);
      if (bounds) return { bounds, fitBoundsOptions: { padding: 70 } };
    }
    return INITIAL_VIEW_STATE;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side hub transitions: entering/switching a hub frames its area (or
  // its races), exiting flies back out to Greece. The initial mount is framed
  // by initialViewState, so this only reacts to hub identity *changes* —
  // selection and exit never reload the page or reset the map.
  const racesRef = useRef(races);
  racesRef.current = races;
  const prevHubKeyRef = useRef<string | null>(hubKey);
  useEffect(() => {
    const prev = prevHubKeyRef.current;
    if (prev === hubKey) return;
    prevHubKeyRef.current = hubKey;
    const map = mapRef.current;
    if (!map) return;
    if (!hubKey) {
      map.flyTo({
        center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
        zoom: INITIAL_VIEW_STATE.zoom,
        pitch: INITIAL_VIEW_STATE.pitch,
        duration: 1200,
      });
      return;
    }
    if (hubArea) {
      map.fitBounds(circleBounds(hubArea), { padding: 60, duration: 1200 });
    } else {
      const bounds = racesBounds(racesRef.current);
      if (bounds) map.fitBounds(bounds, { padding: 70, duration: 1200 });
    }
  }, [hubKey, hubArea]);

  const hubCircle = useMemo(() => (hubArea ? circlePolygon(hubArea) : null), [hubArea]);

  // Navigate to race on select
  useEffect(() => {
    if (selectedRace?.location_lng != null && selectedRace?.location_lat != null) {
      const map = mapRef.current?.getMap();
      if (map) {
        const center = map.getCenter();
        const dist = Math.hypot(center.lng - selectedRace.location_lng, center.lat - selectedRace.location_lat);
        // If the map is already centered on this race (e.g. within 0.001 deg / ~100m), skip flyTo
        if (dist < 0.001 && Math.abs(map.getZoom() - 12) < 0.1) {
          return;
        }
      }
      mapRef.current?.flyTo({
        center: [selectedRace.location_lng, selectedRace.location_lat],
        zoom: 12,
        pitch: 45,
        duration: 1000,
      });
    }
  }, [selectedRace]);

  // Fit the focused sub-race's route into view whenever the focused id changes.
  useEffect(() => {
    if (!selectedSubRaceId || !mapRef.current) return;
    const focused = routesToShow.find(r => r.isFocused);
    if (!focused) return;
    const coords = focused.geojson.geometry.coordinates as [number, number][];
    if (coords.length === 0) return;
    let minLng = coords[0][0], minLat = coords[0][1], maxLng = coords[0][0], maxLat = coords[0][1];
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
    mapRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 100, duration: 1500 });
  }, [selectedSubRaceId, routesToShow]);

  return (
    <div
      className={`map-wrapper style-${currentStyle.id}`}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, background: '#000' }}
    >
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        onMoveStart={() => {
          onRefreshingChange?.(true);
        }}
        onMove={() => {
          // Throttle zoom reads to one per animation frame. Updates state
          // ONLY when the zoom level crosses the 7.5 threshold.
          if (rafRef.current == null) {
            rafRef.current = requestAnimationFrame(() => {
              rafRef.current = null;
              const z = mapRef.current?.getMap().getZoom();
              if (z != null) {
                const nextShow = z > 7.5;
                setShowResetZoom(prev => (prev !== nextShow ? nextShow : prev));
              }
            });
          }
        }}
        onMoveEnd={() => {
          syncMapState();
        }}
        mapStyle={currentStyle.value}
        dragRotate
        interactiveLayerIds={interactiveLayerIds}
        onLoad={() => {
          syncMapState();
        }}
        onClick={(e) => {
          if (spiderfiedCluster) setSpiderfiedCluster(null);
          setShowStyleMenu(false);
          setShowFilterMenu(false);
          onFilterToggle?.(false);
          
          // Check if we clicked on a route or its hitarea
          const routeFeature = e.features?.find(f => f.layer.id.startsWith('route-'));
          if (routeFeature && routeFeature.properties?.subRaceId) {
            onSubRaceSelect(routeFeature.properties.subRaceId);
            return;
          }

          onDeselect();
        }}
      >
        <NavigationControl position="bottom-right" />

        {clusters.map(feature => {
          if (feature.properties.cluster) {
            const clusterFeature = feature as ClusterFeature;
            if (spiderfiedCluster && spiderfiedCluster.id === clusterFeature.id) return null;
            return (
              <ClusterMarker
                key={`cluster-${clusterFeature.id}`}
                cluster={clusterFeature}
                supercluster={supercluster ?? null}
                viewStateZoom={clusterZoom}
                onZoom={handleClusterZoom}
                onSpiderfy={handleSpiderfy}
                onRaceClick={handleRaceClick}
                hoveredRaceId={hoveredRaceId}
              />
            );
          }
          const racePoint = feature as RacePointFeature;
          if (selectedRace && racePoint.properties.raceId === selectedRace.id) return null;
          return (
            <RaceMarker
              key={`race-${racePoint.properties.raceId}`}
              race={racePoint.properties.race}
              isSelected={false}
              onClick={handleRaceClick}
              isFavorite={isFavorite(racePoint.properties.raceId)}
              isHovered={hoveredRaceId === racePoint.properties.raceId}
            />
          );
        })}

        {featuredRaces.map(race => {
          if (selectedRace && race.id === selectedRace.id) return null;
          return (
            <RaceMarker
              key={`featured-${race.id}`}
              race={race}
              isSelected={false}
              onClick={handleRaceClick}
              isFavorite={isFavorite(race.id)}
              isHovered={hoveredRaceId === race.id}
            />
          );
        })}

        {selectedRace?.location_lng != null &&
          selectedRace.location_lat != null &&
          (!spiderfiedCluster || !spiderfiedCluster.races.some(r => r.id === selectedRace.id)) && (
            <RaceMarker 
              race={selectedRace} 
              isSelected 
              onClick={handleRaceClick} 
              isFavorite={isFavorite(selectedRace.id)}
              isHovered={hoveredRaceId === selectedRace.id}
            />
          )}

        {spiderfiedCluster && (
          <SpiderfiedCluster
            longitude={spiderfiedCluster.lng}
            latitude={spiderfiedCluster.lat}
            races={spiderfiedCluster.races}
            selectedRaceId={selectedRace?.id ?? null}
            onRaceClick={handleRaceClick}
            isFavorite={isFavorite}
            hoveredRaceId={hoveredRaceId}
          />
        )}

        {hubCircle && (
          <Source id="hub-area" type="geojson" data={hubCircle}>
            <Layer
              id="hub-area-fill"
              type="fill"
              paint={{ 'fill-color': '#FFE800', 'fill-opacity': 0.05 }}
            />
            <Layer
              id="hub-area-line"
              type="line"
              paint={{
                'line-color': '#FFE800',
                'line-width': 2,
                'line-opacity': 0.65,
                'line-dasharray': [2.5, 2.5],
              }}
            />
          </Source>
        )}

        {routesToShow.map((route, index) => (
          <RouteLayer
            key={`route-group-${index}`}
            route={route}
            index={index}
            color={ROUTE_COLORS[index % ROUTE_COLORS.length]}
            isFocused={route.isFocused}
            hasFocus={!!selectedSubRaceId}
          />
        ))}

        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div className="user-location-marker">
              <div className="user-location-pulse"></div>
              <div className="user-location-dot"></div>
            </div>
          </Marker>
        )}

        {hoveredPoint?.c && (
          <Marker longitude={hoveredPoint.c[0]} latitude={hoveredPoint.c[1]} anchor="center">
            <div className="hover-sync-marker">
              <div className="pulse-ring"></div>
              <div className="marker-dot"></div>
            </div>
          </Marker>
        )}
      </Map>

      <MapControls
        currentStyle={currentStyle}
        onStyleChange={handleStyleChange}
        showStyleMenu={showStyleMenu}
        onToggleStyleMenu={toggleStyleMenu}
        isLocating={isLocating}
        hasUserLocation={!!userLocation}
        onLocate={() => locateAndFly(mapRef)}
        onResetView={resetView}
        filters={filters}
        onFiltersChange={onFiltersChange}
        showFilterMenu={showFilterMenu}
        onToggleFilterMenu={toggleFilterMenu}
        onFeedbackClick={onFeedbackClick}
        favoritesCount={favoritesCount}
        onToggleFavorites={onToggleFavorites}
      />

      {showResetZoom && (
        <button className="reset-zoom-floating glass-panel" onClick={resetView}>
          <Maximize2 size={16} />
          <span>Επαναφορά Χάρτη</span>
        </button>
      )}
    </div>
  );
}
