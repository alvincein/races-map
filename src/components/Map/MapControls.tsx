"use client";

import React, { useState } from 'react';
import { Layers, Maximize2, Navigation } from 'lucide-react';
import { MAP_STYLES } from './mapStyles';
import type { MapStyle } from './types';

interface MapControlsProps {
  currentStyle: MapStyle;
  onStyleChange: (style: MapStyle) => void;
  isLocating: boolean;
  hasUserLocation: boolean;
  onLocateClick: () => void;
  showResetView: boolean;
  onResetView: () => void;
}

export function MapControls({
  currentStyle, onStyleChange, isLocating, hasUserLocation, onLocateClick, showResetView, onResetView,
}: MapControlsProps) {
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  return (
    <div className="map-controls-top-right">
      <div className="map-control-group">
        <button
          className={`map-control-btn ${showStyleMenu ? 'active' : ''}`}
          onClick={() => setShowStyleMenu(!showStyleMenu)}
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
                onClick={() => { onStyleChange(style); setShowStyleMenu(false); }}
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
          onClick={onLocateClick}
          title="Η τοποθεσία μου"
        >
          <Navigation size={18} fill={hasUserLocation ? 'currentColor' : 'none'} />
        </button>
      </div>

      {showResetView && (
        <div className="map-control-group mobile-only-flex">
          <button className="map-control-btn" onClick={onResetView} title="Επαναφορά Προβολής">
            <Maximize2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
