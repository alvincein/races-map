"use client";

import React from 'react';
import type { Race, SubRace } from '../types/database';
import type { RouteIndex } from '../types/routes';
import { useBottomSheetDrag } from './Sidebar/useBottomSheetDrag';
import { RaceList } from './Sidebar/RaceList';
import { RaceDetail } from './Sidebar/RaceDetail';
import './Sidebar.css';

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
  fetchedRoutes: RouteIndex;
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
  isMinimized = false,
  onMinimize,
  fetchedRoutes,
}: SidebarProps) {
  const drag = useBottomSheetDrag({
    isMinimized,
    onToggle: () => onMinimize?.(),
  });

  const containerClassName = [
    'sidebar-container',
    'glass-panel',
    selectedRace ? 'detail-mode' : '',
    isMinimized ? 'minimized' : '',
    drag.isDragging ? 'is-dragging' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClassName}
      style={{ transform: drag.dragY ? `translateY(${drag.dragY}px)` : undefined }}
    >
      <div
        className="drag-handle"
        onClick={onMinimize}
        onTouchStart={drag.onTouchStart}
        onTouchMove={drag.onTouchMove}
        onTouchEnd={drag.onTouchEnd}
      />

      {selectedRace ? (
        <RaceDetail
          race={selectedRace}
          subRaces={subRaces}
          selectedSubRaceId={selectedSubRaceId}
          fetchedRoutes={fetchedRoutes}
          isLoadingSubRaces={isLoadingSubRaces}
          onSubRaceClick={onSubRaceClick}
          onBack={onBack}
        />
      ) : (
        <RaceList
          races={races}
          isFiltered={isFiltered}
          onRaceClick={onRaceClick}
          onBack={onBack}
        />
      )}
    </div>
  );
}
