"use client";

import React from 'react';
import type { Race, SubRace, RaceWithSubRaces } from '../types/database';
import type { RouteIndex } from '../types/routes';
import type { RelatedRaceLink } from '../lib/relatedRaces';
import { useBottomSheetDrag } from './Sidebar/useBottomSheetDrag';
import { RaceList } from './Sidebar/RaceList';
import { RaceDetail } from './Sidebar/RaceDetail';
import './Sidebar.css';

interface SidebarProps {
  races: RaceWithSubRaces[];
  isFiltered: boolean;
  onRaceClick: (race: RaceWithSubRaces) => void;
  onSubRaceClick: (subRaceId: string) => void;
  selectedRace: RaceWithSubRaces | null;
  selectedSubRaceId: string | null;
  subRaces: SubRace[];
  isLoadingSubRaces: boolean;
  isLoadingRaceDetail?: boolean;
  onBack: () => void;
  sidebarState: 'minimized' | 'half' | 'full';
  isRefreshing: boolean;
  onStateChange: (state: 'minimized' | 'half' | 'full') => void;
  fetchedRoutes: RouteIndex;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  onReportRace: (raceId: string, raceName: string) => void;
  onRaceHover?: (raceId: string | null) => void;
  relatedRaces?: RelatedRaceLink[];
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
  isLoadingRaceDetail,
  onBack,
  sidebarState,
  onStateChange,
  fetchedRoutes,
  isRefreshing,
  toggleFavorite,
  isFavorite,
  onReportRace,
  onRaceHover,
  relatedRaces,
}: SidebarProps) {
  const drag = useBottomSheetDrag({
    state: sidebarState,
    onStateChange,
  });

  const containerClassName = [
    'sidebar-container',
    'glass-panel',
    selectedRace ? 'detail-mode' : '',
    `state-${sidebarState}`,
    drag.isDragging ? 'is-dragging' : '',
  ].filter(Boolean).join(' ');

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Reset scroll position when switching between list and detail, or between races
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [selectedRace?.id]);

  return (
    <div
      className={containerClassName}
      style={{ 
        transform: drag.dragY ? `translateY(${drag.dragY}px)` : undefined,
        height: sidebarState === 'full' ? '100vh' : undefined
      }}
    >
      <div
        className="drag-handle"
        onClick={() => {
          if (sidebarState === 'minimized') onStateChange('half');
          else if (sidebarState === 'half') onStateChange('full');
          else onStateChange('half');
        }}
        onTouchStart={drag.onTouchStart}
        onTouchMove={drag.onTouchMove}
        onTouchEnd={drag.onTouchEnd}
      />

      <div className="sidebar-content-scroll" ref={scrollRef}>
        {selectedRace ? (
          <div key={`detail-${selectedRace.id}`} className="animation-fade-in">
            <RaceDetail
              race={selectedRace}
              subRaces={subRaces}
              selectedSubRaceId={selectedSubRaceId}
              fetchedRoutes={fetchedRoutes}
              isLoadingSubRaces={isLoadingSubRaces}
              isLoadingRaceDetail={isLoadingRaceDetail}
              onSubRaceClick={onSubRaceClick}
              onBack={onBack}
              toggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
              onReportRace={onReportRace}
              relatedRaces={relatedRaces}
            />
          </div>
        ) : (
          <div key="list" className="animation-fade-in">
            <RaceList
              races={races}
              isFiltered={isFiltered}
              isRefreshing={isRefreshing}
              onRaceClick={onRaceClick}
              onBack={onBack}
              toggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
              onRaceHover={onRaceHover}
            />
          </div>
        )}
      </div>
    </div>
  );
}
