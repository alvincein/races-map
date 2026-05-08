"use client";

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import { Layers, Mountain, Footprints, Calendar, MapPin, Maximize2, ChevronRight } from 'lucide-react';
import useSupercluster from 'use-supercluster';
import { Race } from '../types/database';
import raceRoutes from '../data/raceRoutes.json';
import 'maplibre-gl/dist/maplibre-gl.css';

const ROUTE_COLORS = [
  '#FF5733', // Primary Coral
  '#FF8D33', // Orange
  '#FFC300', // Gold
  '#FFB133', // Amber
  '#FF4433', // Deep Coral
  '#FFCC33', // Yellow
  '#FF7033', // Soft Orange
  '#FF9933', // Warm Orange
];

interface MapClientProps {
  races: Race[];
  selectedRace: Race | null;
  selectedSubRaceId: string | null;
  subRaces: any[];
  onRaceSelect: (race: Race) => void;
  onClusterClick: (races: Race[]) => void;
  onVisibleRacesChange: (races: Race[]) => void;
  onDeselect: () => void;
  hoveredPoint: any | null;
}

// Available map styles
const MAP_STYLES: any[] = [
  { id: 'dark', label: 'Σκούρο', value: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  { id: 'light', label: 'Φωτεινό', value: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
  { id: 'voyager', label: 'Χάρτης', value: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
  { 
    id: 'satellite',
    label: 'Δορυφόρος', 
    value: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri'
        }
      },
      layers: [
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    }
  }
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
          {isTrail ? <Mountain size={16} /> : <Footprints size={16} />}
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
  cluster: any, 
  supercluster: any, 
  viewStateZoom: number, 
  onZoom: (lng: number, lat: number, zoom: number) => void,
  onSpiderfy: (id: number, races: Race[], lng: number, lat: number) => void,
  onRaceClick: (race: Race, lng: number, lat: number) => void
}) => {
  const [longitude, latitude] = cluster.geometry.coordinates;
  const { point_count: pointCount, cluster_id: clusterId } = cluster.properties;
  
  // Only fetch leaves on hover for performance
  const [hoveredLeaves, setHoveredLeaves] = useState<any[]>([]);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (supercluster && hoveredLeaves.length === 0) {
      setHoveredLeaves(supercluster.getLeaves(clusterId, 10));
    }
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredLeaves([]);
    }, 150); // 150ms buffer to reach the list
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
              const allLeaves = supercluster?.getLeaves(clusterId, Infinity) || [];
              const clusterRaces = allLeaves.map((leaf: any) => leaf.properties.race);
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
              {hoveredLeaves.map((leaf: any) => {
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
  hoveredPoint
}: MapClientProps) {
  const mapRef = useRef<any>(null);
  const [currentStyle, setCurrentStyle] = useState(MAP_STYLES[0]);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [spiderfiedCluster, setSpiderfiedCluster] = useState<{ 
    id: number; 
    races: Race[]; 
    lng: number; 
    lat: number; 
  } | null>(null);
  
  const INITIAL_VIEW_STATE = {
    longitude: 23.7275,
    latitude: 37.9838,
    zoom: 5.5,
    pitch: 30,
    bearing: 0
  };

  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  const resetView = useCallback(() => {
    mapRef.current?.getMap().flyTo({
      center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
      zoom: INITIAL_VIEW_STATE.zoom,
      pitch: INITIAL_VIEW_STATE.pitch,
      bearing: INITIAL_VIEW_STATE.bearing,
      duration: 1500
    });
  }, []);

  const [bounds, setBounds] = useState<[number, number, number, number] | undefined>(undefined);

  const points = useMemo(() => {
    return races
      .filter(r => r.location_lat && r.location_lng && r.id !== selectedRace?.id)
      .map(race => ({
        type: 'Feature' as const,
        properties: { cluster: false, raceId: race.id, race },
        geometry: {
          type: 'Point' as const,
          coordinates: [race.location_lng!, race.location_lat!]
        }
      }));
  }, [races, selectedRace?.id]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom: Math.floor(viewState.zoom),
    options: { radius: 50, maxZoom: 20 }
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

  const routesToShow = useMemo(() => {
    if (!selectedRace || !subRaces.length) return [];
    
    // Find all sub-races of the selected race that have a route
    const routes = subRaces
      .filter(sub => (raceRoutes as any)[sub.id])
      .map(sub => {
        const routeData = (raceRoutes as any)[sub.id];
        return {
          ...routeData,
          isFocused: selectedSubRaceId === sub.id
        };
      });

    return routes;
  }, [selectedRace, selectedSubRaceId, subRaces]);

  // Handle focusing on a specific sub-race route
  useEffect(() => {
    if (selectedSubRaceId && mapRef.current) {
      const focusedRoute = routesToShow.find((r: any) => r.isFocused);
      if (focusedRoute) {
        const coords = focusedRoute.geojson.geometry.coordinates;
        const bounds = coords.reduce((acc: any, coord: any) => {
          return [
            [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
            [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])]
          ];
        }, [[coords[0][0], coords[0][1]], [coords[0][0], coords[0][1]]]);
        
        mapRef.current?.fitBounds(bounds, { padding: 100, duration: 1500 });
      }
    }
  }, [selectedSubRaceId, routesToShow]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
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

        {clusters.map(cluster => {
          const isCluster = cluster.properties.cluster;
          if (isCluster) {
            return (
              <ClusterMarker 
                key={`cluster-${cluster.id}`}
                cluster={cluster}
                supercluster={supercluster}
                viewStateZoom={viewState.zoom}
                onZoom={handleClusterZoom}
                onSpiderfy={handleSpiderfy}
                onRaceClick={handleRaceClick}
              />
            );
          }
          return (
            <RaceMarker 
              key={`race-${cluster.properties.raceId}`}
              race={cluster.properties.race}
              isSelected={selectedRace?.id === cluster.properties.raceId}
              onClick={handleRaceClick}
            />
          );
        })}

        {/* Always render selected race marker outside clusters */}
        {selectedRace && selectedRace.location_lng && selectedRace.location_lat && (
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
              {spiderfiedCluster.races.map((race, index) => {
                const angle = (index / spiderfiedCluster.races.length) * Math.PI * 2;
                const radius = 60 + (index * 2);
                const x = 200 + Math.cos(angle) * radius;
                const y = 200 + Math.sin(angle) * radius;
                return (
                  <line 
                    key={`l-${race.id}`} 
                    x1="200" y1="200" x2={x} y2={y} 
                    stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 2" 
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
        {routesToShow.map((route: any, index: number) => {
          const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
          const isFocused = route.isFocused;
          const hasSelection = !!selectedSubRaceId;

          return (
            <Source key={`route-${index}`} id={`route-${index}`} type="geojson" data={route.geojson}>
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
          );
        })}

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

      <div className="glass-panel" style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={() => setShowStyleMenu(!showStyleMenu)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px' }}>
          <Layers size={18} />
        </button>

        {/* Mobile Reset View Button */}
        {(viewState.zoom > 7 || selectedRace) && (
          <button 
            className="mobile-only-flex"
            onClick={resetView}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px' }}
          >
            <Maximize2 size={18} />
          </button>
        )}
        {showStyleMenu && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '8px' }}>
            {MAP_STYLES.map(style => (
              <button key={style.id} onClick={() => { setCurrentStyle(style); setShowStyleMenu(false); }} style={{ background: currentStyle.id === style.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent', border: 'none', color: currentStyle.id === style.id ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '8px 12px', borderRadius: '6px', textAlign: 'left', width: '100%', fontSize: '13px' }}>
                {style.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
