"use client";

import React, { useState } from 'react';
import { Calendar, MapPin, ArrowLeft, ExternalLink, Navigation, Trophy, Heart, AlertCircle, Share2, Check, Loader2, Sparkles } from 'lucide-react';
import type { Race, SubRace, RaceWithSubRaces } from '../../types/database';
import type { RouteIndex } from '../../types/routes';
import { WeatherWidget } from '../WeatherWidget';
import { RaceTypeBadge, RaceStatusBadge } from './raceLabels';
import { SubRaceCard } from './SubRaceCard';
import { getRaceSlug } from '../../lib/slugs';
import { getRegionLabel } from '../../lib/regions';

const DESCRIPTION_TRUNCATE_LENGTH = 250;

interface RaceDetailProps {
  race: RaceWithSubRaces;
  subRaces: SubRace[];
  selectedSubRaceId: string | null;
  isLoadingSubRaces: boolean;
  isLoadingRaceDetail?: boolean;
  onSubRaceClick: (subRaceId: string) => void;
  onBack: () => void;
  fetchedRoutes: RouteIndex;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  onReportRace: (raceId: string, raceName: string) => void;
}

export function RaceDetail({
  race, subRaces, selectedSubRaceId, fetchedRoutes, isLoadingSubRaces, isLoadingRaceDetail = false, onSubRaceClick, onBack, toggleFavorite, isFavorite, onReportRace,
}: RaceDetailProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [hasHeroImgError, setHasHeroImgError] = useState(false);

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

  const handleShare = () => {
    const slug = getRaceSlug(race);
    const siteUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'https://races-map.vercel.app';
    const shareUrl = `${siteUrl}/race/${slug}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  const description =
    race.display_description || race.description_en || 'Δεν υπάρχουν διαθέσιμες πληροφορίες για αυτή την εκδήλωση.';
  const isLong = description.length > DESCRIPTION_TRUNCATE_LENGTH;
  const displayedDescription = isDescriptionExpanded || !isLong
    ? description
    : description.substring(0, DESCRIPTION_TRUNCATE_LENGTH) + '...';

  const firstDate = race.dates && race.dates.length > 0 ? race.dates[0] : null;
  const isDetailLoading = isLoadingRaceDetail || !('display_description' in race);

  return (
    <>
      <div className="detail-header-actions">
        <button
          className="back-btn"
          onClick={() => {
            setIsDescriptionExpanded(false);
            onBack();
          }}
        >
          <ArrowLeft size={16} />
          <span>Πίσω στη λίστα</span>
        </button>
        <div className="header-action-buttons" style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`share-btn ${showCopied ? 'copied' : ''}`}
            onClick={handleShare}
            title="Κοινοποίηση αγώνα"
          >
            {showCopied ? (
              <Check size={20} />
            ) : (
              <Share2 size={20} />
            )}
            {showCopied && <div className="share-tooltip">Αντιγράφηκε!</div>}
          </button>
          <button 
            className={`favorite-toggle-btn ${isFavorite(race.id) ? 'active' : ''}`}
            onClick={() => toggleFavorite(race.id)}
          >
            <Heart size={20} fill={isFavorite(race.id) ? '#FF3366' : 'none'} color={isFavorite(race.id) ? '#FF3366' : 'currentColor'} />
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-hero">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
            {race.is_featured && (
              <span 
                className="race-badge featured"
                style={race.featured_bg_color ? { background: race.featured_bg_color, borderColor: 'rgba(255,255,255,0.4)', color: '#ffffff' } : undefined}
              >
                <Sparkles size={12} />
                <span>Featured</span>
              </span>
            )}
            <RaceTypeBadge eventType={race.event_type} iconSize={12} />
            <RaceStatusBadge status={race.status} iconSize={12} />
          </div>
          <div className="title-with-logo">
            {race.is_featured && race.featured_icon && isImageUrl(race.featured_icon) && !hasHeroImgError && (
              <div 
                className="standalone-hero-logo"
                style={race.featured_bg_color ? { background: race.featured_bg_color, borderColor: race.featured_bg_color } : undefined}
              >
                <img
                  src={race.featured_icon}
                  alt=""
                  onError={() => setHasHeroImgError(true)}
                />
              </div>
            )}
            <h1>{race.event_name}</h1>
          </div>

          <div className="detail-meta">
            <div className="meta-item">
              <Calendar size={16} />
              <span>
                {firstDate
                  ? new Date(firstDate).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Δεν έχει οριστεί'}
              </span>
            </div>
            <div className="meta-item">
              <MapPin size={16} />
              <span>{race.location_place || race.location_city || 'Ελλάδα'}</span>
            </div>
            {race.location_region && (
              <div className="meta-item">
                <Navigation size={16} />
                <span>{getRegionLabel(race.location_region)}</span>
              </div>
            )}
          </div>

          <WeatherWidget lat={race.location_lat} lng={race.location_lng} date={firstDate} />
        </div>

        <div className="detail-section">
          <h3>Πληροφορίες Εκδήλωσης</h3>
          
          {/* Certifications & Swag */}
          {((race.certifications && race.certifications.length > 0) || 
            (race.swag_included && race.swag_included.length > 0)) && (
            <div className="event-extras" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {race.certifications?.map((cert, idx) => (
                <span key={`cert-${idx}`} className="badge cert-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Trophy size={10} /> {cert}
                </span>
              ))}
              {race.swag_included?.map((swag, idx) => (
                <span key={`swag-${idx}`} className="badge swag-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
                  {swag}
                </span>
              ))}
            </div>
          )}

          {isDetailLoading ? (
            <div className="description-loader">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
              <span>Φόρτωση περιγραφής...</span>
            </div>
          ) : (
            <div className="full-description">
              <p>{displayedDescription}</p>
              {isLong && (
                <button
                  className="text-toggle-btn"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                >
                  {isDescriptionExpanded ? 'Λιγότερα' : 'Περισσότερα'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="detail-section">
          <h3>Διαθέσιμες Διαδρομές</h3>
          {isLoadingSubRaces ? (
            <div className="loader">Φόρτωση αποστάσεων...</div>
          ) : subRaces.length > 0 ? (
            <div className="sub-races-list">
              {[...subRaces]
                .sort((a, b) => (b.distance || 0) - (a.distance || 0))
                .map(sub => (
                  <SubRaceCard
                    key={sub.id}
                    subRace={sub}
                    routeData={fetchedRoutes[sub.id]}
                    isSelected={selectedSubRaceId === sub.id}
                    onClick={onSubRaceClick}
                  />
                ))}
            </div>
          ) : (
            <p className="no-subraces">Δεν έχουν καταχωρηθεί συγκεκριμένες αποστάσεις.</p>
          )}
        </div>
      </div>

      <div className="detail-actions" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        {race.registration_url && (
          <a
            href={race.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            className="registration-btn"
            style={{ flex: 1 }}
          >
            Εγγραφή
          </a>
        )}
        <a
          href={race.event_url || race.scraped_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="website-btn"
          style={{ flex: race.registration_url ? 1 : 'none', width: race.registration_url ? 'auto' : '100%' }}
        >
          Ιστοσελίδα <ExternalLink size={16} />
        </a>
      </div>

      <button
        className="race-report-link"
        onClick={() => onReportRace(race.id, race.event_name)}
      >
        <AlertCircle size={14} />
        <span>Κάτι δεν είναι σωστό; Αναφέρετε λάθος ή ελλιπή πληροφορία</span>
      </button>
    </>
  );
}
