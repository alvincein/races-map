"use client";

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import useSupercluster from 'use-supercluster';
import { Race, SubRace } from '../types/database';
import type { RouteData, RouteIndex, RoutePoint } from '../types/routes';
import { RaceMarker } from './Map/RaceMarker';
import { ClusterMarker } from './Map/ClusterMarker';
import { SpiderfiedCluster } from './Map/SpiderfiedCluster';
import { RouteLayer } from './Map/RouteLayer';
import { MapControls } from './Map/MapControls';
import { MAP_STYLES, ROUTE_COLORS } from './Map/mapStyles';
import type { ClusterFeature, RacePointFeature, RacePointProps, SpiderfiedClusterState } from './Map/types';
import { useGeolocation } from './Map/useGeolocation';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FilterWidget } from './FilterWidget';
import { FilterState } from './HomeClient';

const INITIAL_VIEW_STATE = {
  longitude: 23.7275,
  latitude: 37.9838,
  zoom: 5.2,
  pitch: 30,
  bearing: 0,
};

const VIEWPORT_DEBOUNCE_MS = 100;
const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 20;

interface MapClientProps {
  races: Race[];
  selectedRace: Race | null;
  selectedSubRaceId: string | null;
  subRaces: SubRace[];
  onRaceSelect: (race: Race) => void;
  onClusterClick: (races: Race[]) => void;
  onVisibleRacesChange: (races: Race[]) => void;
  onDeselect: () => void;
  hoveredPoint: RoutePoint | null;
  fetchedRoutes: RouteIndex;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onFilterToggle?: (open: boolean) => void;
  onRefreshingChange?: (refreshing: boolean) => void;
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
}: MapClientProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [currentStyle, setCurrentStyle] = useState(MAP_STYLES[0]);
  const [spiderfiedCluster, setSpiderfiedCluster] = useState<SpiderfiedClusterState | null>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [bounds, setBounds] = useState<[number, number, number, number] | undefined>(undefined);
  const { userLocation, isLocating, locateAndFly } = useGeolocation();

  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const toggleStyleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !showStyleMenu;
    setShowStyleMenu(nextState);
    if (nextState) setShowFilterMenu(false);
  }, [showStyleMenu]);

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
    return races
      .filter((r): r is Race & { location_lat: number; location_lng: number } =>
        r.location_lat != null && r.location_lng != null,
      )
      .map(race => ({
        type: 'Feature',
        properties: { cluster: false, raceId: race.id, race },
        geometry: { type: 'Point', coordinates: [race.location_lng, race.location_lat] },
      }));
  }, [races]);

  const { clusters, supercluster } = useSupercluster<RacePointProps>({
    points,
    bounds,
    zoom: Math.floor(viewState.zoom),
    options: { radius: CLUSTER_RADIUS, maxZoom: CLUSTER_MAX_ZOOM },
  });

  const updateBounds = useCallback(() => {
    const mapBounds = mapRef.current?.getMap().getBounds();
    if (mapBounds) {
      setBounds([
        mapBounds.getWest(),
        mapBounds.getSouth(),
        mapBounds.getEast(),
        mapBounds.getNorth(),
      ]);
    }
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
    (id: number, clusterRaces: Race[], lng: number, lat: number) => {
      setSpiderfiedCluster({ id, races: clusterRaces, lng, lat });
      onClusterClick(clusterRaces);
    },
    [onClusterClick],
  );

  const handleRaceClick = useCallback(
    (race: Race) => {
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
        isFocused: selectedSubRaceId === sub.id,
        aid_stations: sub.aid_stations,
      }));
  }, [selectedRace, selectedSubRaceId, subRaces, fetchedRoutes]);

  // Navigate to race on select
  useEffect(() => {
    if (selectedRace?.location_lng != null && selectedRace?.location_lat != null) {
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
      style={{ width: '100vw', height: '100vh', position: 'relative' }}
    >
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        onMove={evt => {
          setViewState(evt.viewState);
          onRefreshingChange?.(true);
        }}
        onMoveEnd={() => {
          updateBounds();
        }}
        mapStyle={currentStyle.value}
        dragRotate
        onClick={() => {
          if (spiderfiedCluster) setSpiderfiedCluster(null);
          setShowStyleMenu(false);
          setShowFilterMenu(false);
          onFilterToggle?.(false);
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
                viewStateZoom={Math.floor(viewState.zoom)}
                onZoom={handleClusterZoom}
                onSpiderfy={handleSpiderfy}
                onRaceClick={handleRaceClick}
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
            />
          );
        })}

        {selectedRace?.location_lng != null &&
          selectedRace.location_lat != null &&
          (!spiderfiedCluster || !spiderfiedCluster.races.some(r => r.id === selectedRace.id)) && (
            <RaceMarker race={selectedRace} isSelected onClick={handleRaceClick} />
          )}

        {spiderfiedCluster && (
          <SpiderfiedCluster
            longitude={spiderfiedCluster.lng}
            latitude={spiderfiedCluster.lat}
            races={spiderfiedCluster.races}
            selectedRaceId={selectedRace?.id ?? null}
            onRaceClick={handleRaceClick}
          />
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
        onStyleChange={setCurrentStyle}
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
      />

      {viewState.zoom > 7.5 && (
        <button className="reset-zoom-floating glass-panel" onClick={resetView}>
          <Maximize2 size={16} />
          <span>Επαναφορά Χάρτη</span>
        </button>
      )}
    </div>
  );
}
