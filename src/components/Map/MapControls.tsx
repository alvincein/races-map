"use client";

import React, { useState } from 'react';
import { Layers, Maximize2, Navigation } from 'lucide-react';
import { MAP_STYLES } from './mapStyles';
import type { MapStyle } from './types';

import { FilterWidget } from '../FilterWidget';
import type { FilterState } from '../HomeClient';

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

      <FilterWidget
        filters={filters}
        onChange={onFiltersChange}
        isOpen={showFilterMenu}
        onToggle={onToggleFilterMenu}
      />
    </div>
  );
});
