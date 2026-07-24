"use client";

import React, { useState } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { Mountain, Calendar, MapPin, Icon, Heart, Sparkles, Star, Crown, Trophy } from 'lucide-react';
import { sneaker } from '@lucide/lab';
import { RaceWithSubRaces } from '../../types/database';
import type { Race } from '../../types/database';

interface RaceMarkerProps {
  race: RaceWithSubRaces;
  isSelected: boolean;
  onClick: (race: RaceWithSubRaces, lng: number, lat: number) => void;
  offset?: [number, number];
  /** When part of a spiderfied cluster, render at the cluster center, not the race's own coords. */
  lng?: number;
  lat?: number;
  isFavorite?: boolean;
  isHovered?: boolean;
}

export const RaceMarker = React.memo(function RaceMarker({
  race, isSelected, onClick, offset, lng: propLng, lat: propLat, isFavorite, isHovered,
}: RaceMarkerProps) {
  const isFeatured = !!race.is_featured;
  const isTrail = race.event_type?.toLowerCase() === 'trail';
  const lng = propLng ?? race.location_lng;
  const lat = propLat ?? race.location_lat;
  if (lng == null || lat == null) return null;

  const [hasImgError, setHasImgError] = useState(false);

  const isImageUrl = (val?: string | null) => {
    if (!val) return false;
    const str = val.trim();
    return (
      str.startsWith('http://') ||
      str.startsWith('https://') ||
      str.startsWith('/') ||
      str.startsWith('data:image/') ||
      /\.(png|jpe?g|svg|webp|gif)($|\?)/i.test(str)
    );
  };

  const renderIcon = () => {
    if (isFeatured) {
      const iconVal = race.featured_icon?.trim();
      if (iconVal && isImageUrl(iconVal) && !hasImgError) {
        return (
          <img
            src={iconVal}
            alt=""
            onError={() => setHasImgError(true)}
            style={{
              width: '18px',
              height: '18px',
              objectFit: 'contain',
              borderRadius: '4px',
              display: 'block',
            }}
          />
        );
      }
      const iconKey = iconVal?.toLowerCase();
      if (iconKey === 'crown') return <Crown size={16} />;
      if (iconKey === 'trophy') return <Trophy size={16} />;
      if (iconKey === 'star') return <Star size={16} />;
      return <Sparkles size={16} />;
    }
    return isTrail ? <Mountain size={16} /> : <Icon iconNode={sneaker} size={16} />;
  };

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
      style={{ zIndex: isSelected ? 10 : isFeatured ? 5 : 1 }}
    >
      <div className={`marker-container ${isSelected ? 'selected' : ''} ${isFavorite ? 'favorited' : ''} ${isFeatured ? 'featured' : ''} ${isHovered ? 'hover-shake' : ''}`}>
        {isFavorite && (
          <div className="marker-favorite-badge" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FF3366'
          }}>
            <Heart size={10} fill="white" color="white" />
          </div>
        )}
        <div 
          className={`marker-pin ${isFeatured ? 'marker-featured' : isTrail ? 'marker-trail' : 'marker-road'}`}
          style={isFeatured ? { background: race.featured_bg_color?.trim() || '#27272a' } : undefined}
        >
          {renderIcon()}
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
          {race.sub_races && race.sub_races.length > 0 && (
            <div className="label-distances" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              {[...race.sub_races]
                .filter(sub => sub.distance && sub.distance > 0)
                .sort((a, b) => (b.distance || 0) - (a.distance || 0))
                .map((sub, idx) => (
                  <span 
                    key={sub.id || idx} 
                    className="distance-badge"
                    style={{ 
                      fontSize: '9px', 
                      background: 'rgba(255,255,255,0.08)', 
                      padding: '1px 5px', 
                      borderRadius: '4px',
                      color: 'rgba(255,255,255,0.7)',
                      fontWeight: '600'
                    }}
                  >
                    {(() => {
                      const m = sub.distance || 0;
                      if (m < 1000) return `${m}m`;
                      const km = m / 1000;
                      return km % 1 === 0 ? `${km}k` : `${km.toFixed(1)}k`;
                    })()}
                  </span>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </Marker>
  );
});
