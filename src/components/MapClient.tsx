"use client";

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import { Layers, Mountain, Calendar, MapPin, Maximize2, ChevronRight, Icon, Play, Flag, Navigation } from 'lucide-react';
import { sneaker } from '@lucide/lab';
import useSupercluster from 'use-supercluster';
import type Supercluster from 'supercluster';
import type { StyleSpecification } from 'maplibre-gl';
import type { MapRef } from 'react-map-gl/maplibre';
import { Race, SubRace } from '../types/database';
import type { RouteData, RouteIndex } from '../types/routes';
import 'maplibre-gl/dist/maplibre-gl.css';

interface HoverPoint {
  d: number;
  e: number;
  c?: [number, number];
}

interface RacePointProps {
  cluster: false;
  raceId: string;
  race: Race;
}

type ClusterFeature = Supercluster.ClusterFeature<Supercluster.AnyProps>;
type RacePointFeature = Supercluster.PointFeature<RacePointProps>;

const ROUTE_COLORS = [
  '#FFE800', // Primary Yellow
  '#00E5FF', // Cyan
  '#FF3366', // Hot Pink
  '#00FF66', // Lime Green
  '#FF9900', // Bright Orange
  '#B829FF', // Purple
  '#3366FF', // Electric Blue
  '#FF2A2A', // Bright Red
];

interface MapClientProps {
  races: Race[];
  selectedRace: Race | null;
  selectedSubRaceId: string | null;
  subRaces: SubRace[];
  onRaceSelect: (race: Race) => void;
  onClusterClick: (races: Race[]) => void;
  onVisibleRacesChange: (races: Race[]) => void;
  onDeselect: () => void;
  hoveredPoint: HoverPoint | null;
  fetchedRoutes: RouteIndex;
}

interface MapStyle {
  id: string;
  label: string;
  value: string | StyleSpecification;
}

function rasterStyle(
  sourceId: string,
  tilesUrl: string,
  attribution?: string,
): StyleSpecification {
  return {
    version: 8,
    sources: {
      [sourceId]: {
        type: 'raster',
        tiles: [tilesUrl],
        tileSize: 256,
        ...(attribution ? { attribution } : {}),
      },
    },
    layers: [{ id: `${sourceId}-layer`, type: 'raster', source: sourceId }],
  };
}

const ESRI_ATTRIBUTION = 'Tiles &copy; Esri';
const ESRI_TOPO_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
const ESRI_SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

const HYBRID_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': { type: 'raster', tiles: [ESRI_SAT_URL], tileSize: 256 },
    'esri-labels': { type: 'raster', tiles: [ESRI_LABELS_URL], tileSize: 256 },
  },
  layers: [
    { id: 'satellite-layer', type: 'raster', source: 'esri-satellite' },
    { id: 'labels-layer', type: 'raster', source: 'esri-labels' },
  ],
};

const MAP_STYLES: MapStyle[] = [
  { id: 'dark', label: 'Σκούρο', value: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  { id: 'voyager', label: 'Χάρτης', value: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
  { id: 'terrain', label: 'Τοπογραφικός', value: rasterStyle('esri-topo', ESRI_TOPO_URL, ESRI_ATTRIBUTION) },
  { id: 'satellite', label: 'Δορυφόρος', value: rasterStyle('esri-satellite', ESRI_SAT_URL, ESRI_ATTRIBUTION) },
  { id: 'hybrid', label: 'Υβριδικός', value: HYBRID_STYLE },
];

// Memoized Single Race Marker
const RaceMarker = React.memo(({ race, isSelected, onClick, offset, lng: propLng, lat: propLat }: { 
  race: Race, 
  isSelected: boolean, 
  onClick: (race: Race, lng: number, lat: number) => void,
  offset?: [number, number],
  lng?: number,
  lat?: number
}) => {
  const isTrail = race.event_type?.toLowerCase() === 'trail';
  const lng = propLng || race.location_lng!;
  const lat = propLat || race.location_lat!;
  
  return (
    <Marker
      longitude={lng}
      latitude={lat}
      anchor="center"
      offset={offset}
      onClick={e => {
        e.originalEvent.stopPropagation();
        onClick(race, lng, lat);
      }}
      style={{ zIndex: isSelected ? 10 : 1 }}
    >
      <div className={`marker-container ${isSelected ? 'selected' : ''}`}>
        <div className={`marker-pin ${isTrail ? 'marker-trail' : 'marker-road'}`}>
          {isTrail ? <Mountain size={16} /> : <Icon iconNode={sneaker} size={16} />}
        </div>
        <div className="marker-label">
          <div className="label-header">
            <span className="label-name">{race.event_name}</span>
            {race.max_distance && <span className="label-km">{race.max_distance / 1000}χλμ</span>}
          </div>
          <div className="label-details">
            {race.dates && race.dates.length > 0 && (
              <div className="label-detail-item">
                <Calendar size={12} />
                <span>{new Date(race.dates[0]).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}</span>
              </div>
            )}
            {(race.location_place || race.location_city) && (
              <div className="label-detail-item">
                <MapPin size={12} />
                <span>{race.location_place || race.location_city}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Marker>
  );
});

// Memoized Cluster Marker
const ClusterMarker = React.memo(({
  cluster,
  supercluster,
  viewStateZoom,
  onZoom,
  onSpiderfy,
  onRaceClick
}: {
  cluster: ClusterFeature,
  supercluster: Supercluster<RacePointProps> | null,
  viewStateZoom: number,
  onZoom: (lng: number, lat: number, zoom: number) => void,
  onSpiderfy: (id: number, races: Race[], lng: number, lat: number) => void,
  onRaceClick: (race: Race, lng: number, lat: number) => void
}) => {
  const [longitude, latitude] = cluster.geometry.coordinates;
  const { point_count: pointCount, cluster_id: clusterId } = cluster.properties;

  // Only fetch leaves on hover for performance
  const [hoveredLeaves, setHoveredLeaves] = useState<RacePointFeature[]>([]);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (supercluster && hoveredLeaves.length === 0) {
      setHoveredLeaves(supercluster.getLeaves(clusterId, 10) as RacePointFeature[]);
    }
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredLeaves([]);
    }, 150);
  };

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="center"
    >
      <div 
        className="marker-cluster-container" 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          className="marker-cluster"
          onClick={(e) => {
            e.stopPropagation();
            const expansionZoom = supercluster?.getClusterExpansionZoom(clusterId) ?? 20;

            if (expansionZoom > 18 || expansionZoom <= viewStateZoom) {
              const allLeaves = (supercluster?.getLeaves(clusterId, Infinity) ?? []) as RacePointFeature[];
              const clusterRaces = allLeaves.map(leaf => leaf.properties.race);
              onSpiderfy(clusterId, clusterRaces, longitude, latitude);
            } else {
              onZoom(longitude, latitude, Math.min(expansionZoom, 18));
            }
          }}
        >
          {pointCount}
        </div>
        
        {hoveredLeaves.length > 0 && (
          <div className="cluster-hover-list glass-panel animation-slide-up">
            <div className="cluster-hover-title">Αγώνες στην περιοχή</div>
            <div className="hover-list-scroll" onWheel={(e) => e.stopPropagation()}>
              {hoveredLeaves.map(leaf => {
                const r = leaf.properties.race;
                return (
                  <div 
                    key={leaf.properties.raceId} 
                    className="cluster-hover-card"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRaceClick(r, r.location_lng ?? longitude, r.location_lat ?? latitude);
                    }}
                  >
                    <div className="hover-card-main">
                      <span className="item-name">{r.event_name}</span>
                      <div className="item-meta">
                        {r.dates && r.dates.length > 0 && (
                          <span className="item-date">
                            <Calendar size={10} />
                            {new Date(r.dates[0]).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {r.max_distance && (
                          <span className="item-km">
                            {r.max_distance / 1000}km
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="hover-card-arrow" />
                  </div>
                );
              })}
            </div>
            {pointCount > 10 && (
              <div className="more-items">...και {pointCount - 10} ακόμα</div>
            )}
          </div>
        )}
      </div>
    </Marker>
  );
});

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
  fetchedRoutes
}: MapClientProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [currentStyle, setCurrentStyle] = useState(MAP_STYLES[0]);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [spiderfiedCluster, setSpiderfiedCluster] = useState<{ 
    id: number; 
    races: Race[]; 
    lng: number; 
    lat: number; 
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const locatingRef = useRef(false);
  const userLocationRef = useRef<{ lng: number; lat: number } | null>(null);
  const selectedRaceRef = useRef<Race | null>(null);

  useEffect(() => {
    selectedRaceRef.current = selectedRace;
  }, [selectedRace]);
  
  const INITIAL_VIEW_STATE = {
    longitude: 23.7275,
    latitude: 37.9838,
    zoom: 5.2,
    pitch: 30,
    bearing: 0
  };

  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  const resetView = useCallback(() => {
    mapRef.current?.getMap().flyTo({
      center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
      zoom: 5.2, // Slightly more zoomed out for whole Greece
      pitch: INITIAL_VIEW_STATE.pitch,
      bearing: INITIAL_VIEW_STATE.bearing,
      duration: 1500
    });
  }, []);

  const [bounds, setBounds] = useState<[number, number, number, number] | undefined>(undefined);

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
    options: { radius: 50, maxZoom: 20 },
  });

  const updateBounds = useCallback(() => {
    if (mapRef.current) {
      const mapBounds = mapRef.current.getMap().getBounds();
      if (mapBounds) {
        setBounds([
          mapBounds.getWest(),
          mapBounds.getSouth(),
          mapBounds.getEast(),
          mapBounds.getNorth()
        ]);
      }
    }
  }, []);

  useEffect(() => {
    if (!bounds) return;
    const timer = setTimeout(() => {
      const filtered = races.filter(race => 
        race.location_lng! >= bounds[0] &&
        race.location_lat! >= bounds[1] &&
        race.location_lng! <= bounds[2] &&
        race.location_lat! <= bounds[3]
      );
      onVisibleRacesChange(filtered);
    }, 400); // Slightly longer debounce for smoothness
    return () => clearTimeout(timer);
  }, [bounds, races, onVisibleRacesChange]);

  const handleClusterZoom = useCallback((lng: number, lat: number, zoom: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 500 });
  }, []);

  const handleSpiderfy = useCallback((id: number, clusterRaces: Race[], lng: number, lat: number) => {
    setSpiderfiedCluster({ id, races: clusterRaces, lng, lat });
    onClusterClick(clusterRaces);
  }, [onClusterClick]);

  const handleRaceClick = useCallback((race: Race, lng: number, lat: number) => {
    onRaceSelect(race);
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: 12,
      pitch: 45,
      duration: 1000
    });
  }, [onRaceSelect]);


  const handleLocate = useCallback(() => {
    if (locatingRef.current) return;

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      alert('Η γεωτοποθεσία απαιτεί ασφαλή σύνδεση (HTTPS ή localhost). Παρακαλώ ελέγξτε τη διεύθυνση URL.');
      return;
    }

    if (!navigator.geolocation) {
      alert('Η γεωτοποθεσία δεν υποστηρίζεται από τον περιηγητή σας.');
      return;
    }

    // If we already have location, fly there and stop
    if (userLocationRef.current) {
      mapRef.current?.flyTo({
        center: [userLocationRef.current.lng, userLocationRef.current.lat],
        zoom: 12,
        pitch: 45,
        duration: 1000
      });
      return;
    }

    locatingRef.current = true;
    setIsLocating(true);
    const startTime = Date.now();
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        const newLoc = { lng: longitude, lat: latitude };
        setUserLocation(newLoc);
        userLocationRef.current = newLoc;
        setIsLocating(false);
        locatingRef.current = false;
        
        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 12,
          pitch: 45,
          duration: 1500
        });
      },
      (error) => {
        setIsLocating(false);
        locatingRef.current = false;
        const duration = Date.now() - startTime;
        
        console.error('Geolocation error details:', {
          code: error.code,
          message: error.message,
          duration,
          isSecure: window.isSecureContext
        });

        // If the error happened almost instantly (< 250ms), it's an automatic browser block.
        // In this case, we don't show the alert because the user never even saw a prompt.
        if (duration < 250 && error.code === error.PERMISSION_DENIED) {
          return;
        }

        // Extremely aggressive suppression of denial alerts.
        // We check both the code and the message string to handle buggy extensions.
        setTimeout(() => {
          if (userLocationRef.current) return;

          const isDenied = error.code === error.PERMISSION_DENIED || 
                          (error.message && error.message.toLowerCase().includes('denied'));

          if (!isDenied) {
            alert(`Σφάλμα τοποθεσίας: ${error.message}`);
          }
        }, 2000);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [selectedRace]);


  const routesToShow = useMemo<(RouteData & { isFocused: boolean })[]>(() => {
    if (!selectedRace || !subRaces.length) return [];
    return subRaces
      .filter(sub => fetchedRoutes[sub.id])
      .map(sub => ({
        ...fetchedRoutes[sub.id],
        isFocused: selectedSubRaceId === sub.id,
      }));
  }, [selectedRace, selectedSubRaceId, subRaces, fetchedRoutes]);

  // Handle focusing on a specific sub-race route
  useEffect(() => {
    if (!selectedSubRaceId || !mapRef.current) return;
    const focusedRoute = routesToShow.find(r => r.isFocused);
    if (!focusedRoute) return;

    const coords = focusedRoute.geojson.geometry.coordinates as [number, number][];
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
    <div className={`map-wrapper style-${currentStyle.id}`} style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => {
          setViewState(evt.viewState);
        }}
        onLoad={updateBounds}
        onZoomEnd={updateBounds}
        onMoveEnd={updateBounds}
        mapStyle={currentStyle.value}
        dragRotate={true}
        onClick={(e) => {
          // Only clear if we didn't click on a marker (markers call stopPropagation)
          if (spiderfiedCluster) setSpiderfiedCluster(null);
          onDeselect();
        }}
      >
        <NavigationControl position="bottom-right" />

        {clusters.map(feature => {
          if (feature.properties.cluster) {
            const clusterFeature = feature as ClusterFeature;
            // Hide the actual cluster marker if it's currently spiderfied
            if (spiderfiedCluster && spiderfiedCluster.id === clusterFeature.id) return null;
            return (
              <ClusterMarker
                key={`cluster-${clusterFeature.id}`}
                cluster={clusterFeature}
                supercluster={supercluster ?? null}
                viewStateZoom={viewState.zoom}
                onZoom={handleClusterZoom}
                onSpiderfy={handleSpiderfy}
                onRaceClick={handleRaceClick}
              />
            );
          }

          const racePoint = feature as RacePointFeature;
          // Skip if this is the selected race (rendered separately for consistency)
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

        {/* Always render selected race marker outside clusters, unless it's in a spider view */}
        {selectedRace && selectedRace.location_lng && selectedRace.location_lat && 
         (!spiderfiedCluster || !spiderfiedCluster.races.some(r => r.id === selectedRace.id)) && (
          <RaceMarker 
            race={selectedRace}
            isSelected={true}
            onClick={handleRaceClick}
          />
        )}

        {spiderfiedCluster && (
          <Marker
            longitude={spiderfiedCluster.lng}
            latitude={spiderfiedCluster.lat}
            anchor="center"
            style={{ zIndex: 101, pointerEvents: 'none' }}
          >
            <svg width="400" height="400" viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
              {/* Center anchor for the spider */}
              <circle cx="200" cy="200" r="5" fill="white" opacity="0.5" />
              {spiderfiedCluster.races.map((race, index) => {
                const angle = (index / spiderfiedCluster.races.length) * Math.PI * 2;
                const radius = 60 + (index * 2);
                const x = 200 + Math.cos(angle) * radius;
                const y = 200 + Math.sin(angle) * radius;
                return (
                  <line 
                    key={`l-${race.id}`} 
                    x1="200" y1="200" x2={x} y2={y} 
                    stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="4 2" 
                  />
                );
              })}
            </svg>
          </Marker>
        )}

        {spiderfiedCluster && spiderfiedCluster.races.map((race, index) => {
          const angle = (index / spiderfiedCluster.races.length) * Math.PI * 2;
          const radius = 60 + (index * 2);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return (
            <RaceMarker 
              key={`spider-${race.id}`}
              race={race}
              isSelected={selectedRace?.id === race.id}
              onClick={handleRaceClick}
              lng={spiderfiedCluster.lng}
              lat={spiderfiedCluster.lat}
              offset={[x, y]}
            />
          );
        })}

        {/* Render Routes for Selected Race */}
        {routesToShow.map((route, index) => {
          const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
          const isFocused = route.isFocused;
          const hasSelection = !!selectedSubRaceId;

          return (
            <React.Fragment key={`route-group-${index}`}>
              <Source id={`route-${index}`} type="geojson" data={route.geojson}>
                <Layer
                  id={`route-line-${index}`}
                  type="line"
                  layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{
                    'line-color': color,
                    'line-width': isFocused ? 6 : 4,
                    'line-opacity': isFocused ? 1 : (hasSelection ? 0.15 : 0.8)
                  }}
                />
                {isFocused && (
                  <Layer
                    id={`route-glow-${index}`}
                    type="line"
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                    paint={{
                      'line-color': color,
                      'line-width': 12,
                      'line-opacity': 0.4,
                      'line-blur': 8
                    }}
                  />
                )}
              </Source>

              {/* Route Start/End Markers */}
              {route.geojson?.geometry?.coordinates?.length > 1 && (
                <>
                  <Marker 
                    longitude={route.geojson.geometry.coordinates[0][0]} 
                    latitude={route.geojson.geometry.coordinates[0][1]} 
                    anchor="center"
                  >
                    <div className="route-marker-container" style={{ 
                      opacity: isFocused ? 1 : (hasSelection ? 0.15 : 0.7),
                      transform: isFocused ? 'scale(1)' : 'scale(0.8)'
                    }}>
                      <div className="route-marker-pin route-marker-start">
                        <Play size={14} fill="currentColor" />
                      </div>
                      <div className="route-marker-label">Εκκίνηση</div>
                    </div>
                  </Marker>

                  <Marker 
                    longitude={route.geojson.geometry.coordinates[route.geojson.geometry.coordinates.length - 1][0]} 
                    latitude={route.geojson.geometry.coordinates[route.geojson.geometry.coordinates.length - 1][1]} 
                    anchor="center"
                  >
                    <div className="route-marker-container" style={{ 
                      opacity: isFocused ? 1 : (hasSelection ? 0.15 : 0.7),
                      transform: isFocused ? 'scale(1)' : 'scale(0.8)'
                    }}>
                      <div className="route-marker-pin route-marker-end">
                        <Flag size={14} fill="#FF3366" stroke="white" strokeWidth={1.5} />
                      </div>
                      <div className="route-marker-label">Τερματισμός</div>
                    </div>
                  </Marker>
                </>
              )}
            </React.Fragment>
          );
        })}

        {/* User Location Blue Dot */}
        {userLocation && (
          <Marker
            longitude={userLocation.lng}
            latitude={userLocation.lat}
            anchor="center"
          >
            <div className="user-location-marker">
              <div className="user-location-pulse"></div>
              <div className="user-location-dot"></div>
            </div>
          </Marker>
        )}

        {/* Hover Sync Marker */}
        {hoveredPoint && hoveredPoint.c && (
          <Marker
            longitude={hoveredPoint.c[0]}
            latitude={hoveredPoint.c[1]}
            anchor="center"
          >
            <div className="hover-sync-marker">
              <div className="pulse-ring"></div>
              <div className="marker-dot"></div>
            </div>
          </Marker>
        )}
      </Map>

      <div className="map-controls-top-right">
        <div className="map-control-group">
          <button 
            className={`map-control-btn ${showStyleMenu ? 'active' : ''}`}
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            title="Εναλλαγή Χάρτη"
          >
            <Layers size={18} />
          </button>

          {showStyleMenu && (
            <div className="style-menu">
              {MAP_STYLES.map(style => (
                <button 
                  key={style.id} 
                  className={`style-option ${currentStyle.id === style.id ? 'active' : ''}`}
                  onClick={() => { 
                    setCurrentStyle(style); 
                    setShowStyleMenu(false); 
                  }}
                >
                  {style.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="map-control-group">
          <button 
            className={`map-control-btn ${isLocating ? 'loading' : ''} ${userLocation ? 'active' : ''}`}
            onClick={() => handleLocate()}
            title="Η τοποθεσία μου"
          >
            <Navigation size={18} fill={userLocation ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Mobile Reset View Button */}
        {(viewState.zoom > 7 || selectedRace) && (
          <div className="map-control-group mobile-only-flex">
            <button 
              className="map-control-btn"
              onClick={resetView}
              title="Επαναφορά Προβολής"
            >
              <Maximize2 size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
