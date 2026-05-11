"use client";

import React, { useRef, useState } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { Calendar, ChevronRight } from 'lucide-react';
import type Supercluster from 'supercluster';
import type { Race } from '../../types/database';
import type { ClusterFeature, RacePointFeature, RacePointProps } from './types';

interface ClusterMarkerProps {
  cluster: ClusterFeature;
  supercluster: Supercluster<RacePointProps> | null;
  viewStateZoom: number;
  onZoom: (lng: number, lat: number, zoom: number) => void;
  onSpiderfy: (id: number, races: Race[], lng: number, lat: number) => void;
  onRaceClick: (race: Race, lng: number, lat: number) => void;
}

const HOVER_LEAVES_LIMIT = 10;
const HOVER_LEAVE_BUFFER_MS = 150;

export const ClusterMarker = React.memo(function ClusterMarker({
  cluster, supercluster, viewStateZoom, onZoom, onSpiderfy, onRaceClick,
}: ClusterMarkerProps) {
  const [longitude, latitude] = cluster.geometry.coordinates;
  const { point_count: pointCount, cluster_id: clusterId } = cluster.properties;

  const [hoveredLeaves, setHoveredLeaves] = useState<RacePointFeature[]>([]);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (supercluster && hoveredLeaves.length === 0) {
      setHoveredLeaves(supercluster.getLeaves(clusterId, HOVER_LEAVES_LIMIT) as RacePointFeature[]);
    }
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredLeaves([]), HOVER_LEAVE_BUFFER_MS);
  };

  const handleClusterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const expansionZoom = supercluster?.getClusterExpansionZoom(clusterId) ?? 20;
    // If zooming wouldn't actually break the cluster apart, fall back to spider-fy.
    if (expansionZoom > 18 || expansionZoom <= viewStateZoom) {
      const allLeaves = (supercluster?.getLeaves(clusterId, Infinity) ?? []) as RacePointFeature[];
      onSpiderfy(clusterId, allLeaves.map(leaf => leaf.properties.race), longitude, latitude);
    } else {
      onZoom(longitude, latitude, Math.min(expansionZoom, 18));
    }
  };

  return (
    <Marker longitude={longitude} latitude={latitude} anchor="center">
      <div
        className="marker-cluster-container"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="marker-cluster" onClick={handleClusterClick}>{pointCount}</div>

        {hoveredLeaves.length > 0 && (
          <div className="cluster-hover-list glass-panel animation-slide-up">
            <div className="cluster-hover-title">Αγώνες στην περιοχή</div>
            <div className="hover-list-scroll" onWheel={e => e.stopPropagation()}>
              {hoveredLeaves.map(leaf => {
                const r = leaf.properties.race;
                return (
                  <div
                    key={leaf.properties.raceId}
                    className="cluster-hover-card"
                    onClick={e => {
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
                          <span className="item-km">{r.max_distance / 1000}km</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="hover-card-arrow" />
                  </div>
                );
              })}
            </div>
            {pointCount > HOVER_LEAVES_LIMIT && (
              <div className="more-items">...και {pointCount - HOVER_LEAVES_LIMIT} ακόμα</div>
            )}
          </div>
        )}
      </div>
    </Marker>
  );
});
