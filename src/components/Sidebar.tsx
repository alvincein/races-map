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
  hubLinks?: { href: string; label: string }[];
  // Hub landing pages: header (title/count/intro) shown above the race list,
  // with an exit button that clears the hub scope.
  hubHeader?: { title: string; count: number; intro?: string };
  onExitHub?: () => void;
  // /agones index: grouped hub links rendered as a directory above the list.
  hubDirectory?: { heading: string; links: { href: string; label: string; count: number }[] }[];
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
  hubLinks,
  hubHeader,
  onExitHub,
  hubDirectory,
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
              hubLinks={hubLinks}
            />
          </div>
        ) : hubDirectory && hubDirectory.length > 0 ? (
          <div key="directory" className="animation-fade-in hub-directory">
            <h2 className="hub-directory-title">Εξερεύνηση Αγώνων</h2>
            {hubDirectory.map((group) => (
              <section key={group.heading}>
                <h3>{group.heading}</h3>
                <ul className="hub-link-grid">
                  {group.links.map((l) => (
                    <li key={l.href}>
                      <a href={l.href}>
                        {l.label} <span className="hub-count">({l.count})</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div key="list" className="animation-fade-in">
            {hubHeader && (
              <div className="hub-panel-header">
                <h2>{hubHeader.title}</h2>
                <p className="hub-panel-count">{hubHeader.count} αγώνες</p>
                {hubHeader.intro && <p className="hub-panel-intro">{hubHeader.intro}</p>}
                {onExitHub && (
                  <button className="hub-exit-btn" onClick={onExitHub}>
                    Δες όλους τους αγώνες ✕
                  </button>
                )}
              </div>
            )}
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
