"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Race, SubRace } from '../types/database';
import { FilterState } from './HomeClient';
import { 
  Calendar, 
  MapPin, 
  ChevronRight, 
  Search, 
  ArrowLeft, 
  ExternalLink, 
  Trophy, 
  TrendingUp,
  Euro,
  Navigation,
  Route,
  ArrowUpRight,
  Maximize2
} from 'lucide-react';
import raceRoutes from '../data/raceRoutes.json';
import { ElevationProfile } from './ElevationProfile';
import './Sidebar.css';

// Memoized Race Card for performance
const RaceCard = React.memo(({ race, isSelected, onClick }: { 
  race: Race, 
  isSelected: boolean, 
  onClick: (race: Race) => void 
}) => {
  return (
    <div 
      className={`race-card ${isSelected ? 'active' : ''}`}
      onClick={() => onClick(race)}
    >
      <div className="race-card-header">
        <span className={`race-badge ${race.event_type?.toLowerCase() === 'trail' ? 'trail' : 'road'}`}>
          {race.event_type?.toLowerCase() === 'trail' ? 'Βουνό' : 'Δρόμος'}
        </span>
        {race.dates && race.dates.length > 0 && (
          <span className="race-date">
            <Calendar size={14} />
            {new Date(race.dates[0]).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
      <h3>{race.event_name}</h3>
      <div className="race-location">
        <MapPin size={14} />
        <span>{race.location_place || race.location_city || 'TBD'}</span>
      </div>
    </div>
  );
});

interface SidebarProps {
  races: Race[];
  isFiltered: boolean;
  onRaceClick: (race: Race) => void;
  onSubRaceClick: (subRaceId: string) => void;
  selectedRace: Race | null;
  selectedSubRaceId: string | null;
  subRaces: SubRace[];
  isLoadingSubRaces: boolean;
  onBack: () => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
}

export default function Sidebar({ 
  races, 
  isFiltered,
  onRaceClick, 
  onSubRaceClick,
  selectedRace, 
  selectedSubRaceId,
  subRaces, 
  isLoadingSubRaces,
  onBack,
  isMinimized,
  onMinimize
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    
    // Only allow dragging downwards when not minimized
    if (!isMinimized && deltaY > 0) {
      setDragY(deltaY);
    }
    // Allow dragging upwards when minimized
    else if (isMinimized && deltaY < 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null) return;
    
    const threshold = 100; // threshold to trigger minimize/expand
    
    if (!isMinimized && dragY > threshold) {
      onMinimize?.();
    } else if (isMinimized && dragY < -threshold) {
      onMinimize?.();
    }
    
    setDragY(0);
    setIsDragging(false);
    touchStartY.current = null;
  };

  const filteredRaces = useMemo(() => {
    const filtered = races.filter(r => 
      r.event_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (r.location_place && r.location_place.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return [...filtered].sort((a, b) => {
      const dateA = a.dates && a.dates.length > 0 ? new Date(a.dates[0]).getTime() : Infinity;
      const dateB = b.dates && b.dates.length > 0 ? new Date(b.dates[0]).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [races, searchTerm]);

  // Detail View
  if (selectedRace) {
    const description = selectedRace.description || selectedRace.description_en || 'No description available for this event.';
    const isLongDescription = description.length > 250;
    const displayedDescription = isDescriptionExpanded || !isLongDescription 
      ? description 
      : description.substring(0, 250) + '...';

    return (
      <div 
        className={`sidebar-container glass-panel detail-mode ${isMinimized ? 'minimized' : ''} ${isDragging ? 'is-dragging' : ''}`}
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
      >
        <div 
          className="drag-handle" 
          onClick={onMinimize}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        ></div>
        <div className="sidebar-header">
          <button className="back-btn" onClick={() => {
            setIsDescriptionExpanded(false);
            onBack();
          }}>
            <ArrowLeft size={16} />
            <span>Πίσω στη λίστα</span>
          </button>
        </div>
        
        <div className="detail-content">
          <div className="detail-hero">
            <span className={`race-badge ${selectedRace.event_type?.toLowerCase() === 'trail' ? 'trail' : 'road'}`}>
              {selectedRace.event_type?.toLowerCase() === 'trail' ? 'Βουνό' : 'Δρόμος'}
            </span>
            <h1>{selectedRace.event_name}</h1>
            
            <div className="detail-meta">
              <div className="meta-item">
                <Calendar size={16} />
                <span>
                  {selectedRace.dates && selectedRace.dates.length > 0 
                    ? new Date(selectedRace.dates[0]).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Δεν έχει οριστεί'}
                </span>
              </div>
              <div className="meta-item">
                <MapPin size={16} />
                <span>{selectedRace.location_place || selectedRace.location_city || 'Ελλάδα'}</span>
              </div>
              {selectedRace.location_region && (
                <div className="meta-item">
                  <Navigation size={16} />
                  <span>{selectedRace.location_region}</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3>Πληροφορίες Εκδήλωσης</h3>
            <div className="full-description">
              <p>{displayedDescription}</p>
              {isLongDescription && (
                <button 
                  className="text-toggle-btn"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                >
                  {isDescriptionExpanded ? 'Λιγότερα' : 'Περισσότερα'}
                </button>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3>Διαθέσιμες Διαδρομές</h3>
            {isLoadingSubRaces ? (
              <div className="loader">Φόρτωση αποστάσεων...</div>
            ) : subRaces.length > 0 ? (
              <div className="sub-races-list">
                {subRaces.map(sub => {
                  const routeData = (raceRoutes as any)[sub.id];
                  const hasRoute = !!routeData;
                  const isSelected = selectedSubRaceId === sub.id;

                  const getSubRaceName = (s: any) => {
                    if (s.name) return s.name;
                    const cat = s.category?.toLowerCase();
                    if (cat === 'marathon') return "Μαραθώνιος";
                    if (cat === 'half-marathon') return "Ημιμαραθώνιος";
                    if (cat === 'ultra-marathon') return "Ultra";
                    if (cat === 'kids-run') return "Παιδικός Αγώνας";
                    if (s.distance) return `${s.distance / 1000}km`;
                    return s.category || 'Αγώνας';
                  };

                  return (
                    <div 
                      key={sub.id} 
                      className={`sub-race-card ${hasRoute ? 'has-route' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => hasRoute && onSubRaceClick(sub.id)}
                    >
                      <div className="sub-race-header">
                        <div className="sub-race-info">
                          <div className="sub-race-name">{getSubRaceName(sub)}</div>
                          {sub.date && (
                            <div className="sub-race-date">
                              <Calendar size={12} />
                              <span>{new Date(sub.date).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}</span>
                            </div>
                          )}
                        </div>
                        {hasRoute && (
                          <span className="route-badge">
                            <Route size={12} />
                            Διαδρομή
                          </span>
                        )}
                      </div>

                      {/* Display GPX Stats if available */}
                      <div className="sub-race-stats">
                        <div className="stat-box highlight">
                          <span className="stat-label">Απόστ.</span>
                          <span className="stat-value">
                            {routeData ? `${(routeData.stats.distance / 1000).toFixed(1)}km` : (sub.distance ? `${sub.distance / 1000}km` : '?')}
                          </span>
                        </div>
                        <div className="stat-box">
                          <span className="stat-label">υψομ.</span>
                          <span className="stat-value">
                            {routeData ? `+${routeData.stats.gain}m` : (sub.elevation ? `+${sub.elevation}m` : '-')}
                          </span>
                        </div>
                        {sub.price && (
                          <div className="stat-box">
                            <span className="stat-label">Τιμή</span>
                            <span className="stat-value">{sub.price}€</span>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-subraces">Δεν έχουν καταχωρηθεί συγκεκριμένες αποστάσεις.</p>
            )}
          </div>

          <div className="detail-actions">
            <a 
              href={selectedRace.event_url || selectedRace.scraped_url || '#'} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="primary-btn"
            >
              Επίσημη Ιστοσελίδα <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div 
      className={`sidebar-container glass-panel ${isMinimized ? 'minimized' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
    >
      <div 
        className="drag-handle" 
        onClick={onMinimize}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      ></div>
      <div className="sidebar-header">
        {isFiltered ? (
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Εμφάνιση όλων των αγώνων</span>
          </button>
        ) : (
          <h1>Αγώνες στην Ελλάδα</h1>
        )}
        
        {isFiltered && <h2 className="filter-title">Αγώνες σε αυτή την τοποθεσία</h2>}

        <div className="search-row">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Αναζήτηση αγώνων..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="races-list">
        {filteredRaces.map(race => (
          <RaceCard 
            key={race.id} 
            race={race} 
            isSelected={false} 
            onClick={onRaceClick} 
          />
        ))}
        {filteredRaces.length === 0 && (
          <div className="no-results">Δεν βρέθηκαν αγώνες.</div>
        )}
      </div>
    </div>
  );
}
