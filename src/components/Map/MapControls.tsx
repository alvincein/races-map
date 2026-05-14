"use client";

import React, { useState } from 'react';
import { Layers, Maximize2, Navigation, MessageSquarePlus, Heart } from 'lucide-react';
import { MAP_STYLES } from './mapStyles';
import type { MapStyle } from './types';

import { FilterWidget } from '../FilterWidget';
import type { FilterState } from '../../types/filters';

interface MapControlsProps {
  currentStyle: MapStyle;
  onStyleChange: (style: MapStyle) => void;
  showStyleMenu: boolean;
  onToggleStyleMenu: (e: React.MouseEvent) => void;
  isLocating: boolean;
  hasUserLocation: boolean;
  onLocate: () => void;
  onResetView: () => void;
  // Filter props
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  showFilterMenu: boolean;
  onToggleFilterMenu: (open: boolean) => void;
  // Feedback
  onFeedbackClick: () => void;
  // Favorites toggle
  favoritesCount: number;
  onToggleFavorites: () => void;
}

export const MapControls = React.memo(function MapControls({
  currentStyle,
  onStyleChange,
  showStyleMenu,
  onToggleStyleMenu,
  isLocating,
  hasUserLocation,
  onLocate,
  onResetView,
  filters,
  onFiltersChange,
  showFilterMenu,
  onToggleFilterMenu,
  onFeedbackClick,
  favoritesCount,
  onToggleFavorites,
}: MapControlsProps) {
  return (
    <div className="map-controls-top-right">
      <div className="map-control-group">
        <button
          className={`map-control-btn ${showStyleMenu ? 'active' : ''}`}
          onClick={onToggleStyleMenu}
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
                  onStyleChange(style);
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
          className={`map-control-btn ${isLocating ? 'loading' : ''} ${hasUserLocation ? 'active' : ''}`}
          onClick={onLocate}
          title="Η τοποθεσία μου"
        >
          <Navigation size={18} fill={hasUserLocation ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="map-control-group">
        <button
          className={`map-control-btn favorites-btn ${filters.favoritesOnly ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFavorites(); }}
          title="Αγαπημένα"
        >
          <div className="favorites-icon-wrapper">
            <Heart size={24} fill={filters.favoritesOnly ? 'currentColor' : 'none'} />
            {favoritesCount > 0 && (
              <span className={`favorites-count-inside digits-${favoritesCount.toString().length}`}>
                {favoritesCount}
              </span>
            )}
          </div>
        </button>
      </div>

      <FilterWidget
        filters={filters}
        onChange={onFiltersChange}
        isOpen={showFilterMenu}
        onToggle={onToggleFilterMenu}
      />

      <div className="map-control-group">
        <button
          className="map-control-btn"
          onClick={(e) => { e.stopPropagation(); onFeedbackClick(); }}
          title="Αναφορά / Πρόταση"
        >
          <MessageSquarePlus size={18} />
        </button>
      </div>
    </div>
  );
});
