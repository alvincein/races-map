import React from 'react';
import { ElevationProfile } from './ElevationProfile';
import { Route, X } from 'lucide-react';
import type { RouteData, RoutePoint } from '../types/routes';
import type { SubRace } from '../types/database';
import './ElevationWidget.css';

interface ElevationWidgetProps {
  routeData: RouteData;
  /** When the sub-race has its own official distance/elevation, prefer those over GPX-derived stats. */
  officialStats: Pick<SubRace, 'distance' | 'elevation'> | null;
  hoveredPoint: RoutePoint | null;
  onHover: (point: RoutePoint | null) => void;
  onClose: () => void;
}

export const ElevationWidget: React.FC<ElevationWidgetProps> = ({ 
  routeData, 
  officialStats,
  hoveredPoint, 
  onHover,
  onClose 
}) => {
  const displayDistance = officialStats?.distance
    ? (officialStats.distance / 1000).toFixed(1) + 'km'
    : (routeData.distance / 1000).toFixed(1) + 'km';

  const displayGain = officialStats?.elevation != null
    ? '+' + Math.round(officialStats.elevation) + 'm'
    : '+' + Math.round(routeData.stats.gain) + 'm';
  return (
    <div className="elevation-widget">
      <div className="widget-header">
        <div className="widget-title">
          <Route size={16} className="title-icon" />
          <span>Ανάλυση Διαδρομής</span>
        </div>
        <div className="widget-stats">
          <div className="w-stat">
            <span className="w-label">Απόσταση</span>
            <span className="w-value">{displayDistance}</span>
          </div>
          <div className="w-stat">
            <span className="w-label">D+</span>
            <span className="w-value accent-green">{displayGain}</span>
          </div>
          <div className="w-stat">
            <span className="w-label">D-</span>
            <span className="w-value accent-red">-{routeData.stats.loss}m</span>
          </div>
          <div className="w-stat desktop-only">
            <span className="w-label">Μέγιστο</span>
            <span className="w-value">{routeData.stats.max_ele}m</span>
          </div>
          <div className="w-stat desktop-only">
            <span className="w-label">Ελάχιστο</span>
            <span className="w-value">{routeData.stats.min_ele}m</span>
          </div>
        </div>
        <button className="close-widget" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="widget-content">
        <ElevationProfile 
          data={routeData.profile} 
          onHover={onHover} 
          hoveredPoint={hoveredPoint}
        />
        
        {hoveredPoint && (
          <div className="hover-indicator">
            <div className="h-stat">
              <span>Απόσταση: </span>
              <strong>{(hoveredPoint.d / 1000).toFixed(2)}km</strong>
            </div>
            <div className="h-stat">
              <span>Υψόμετρο: </span>
              <strong>{Math.round(hoveredPoint.e)}m</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

