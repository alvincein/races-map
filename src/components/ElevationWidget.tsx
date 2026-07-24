import React from 'react';
import { ElevationProfile } from './ElevationProfile';
import { Route, X } from 'lucide-react';
import type { RouteData, RoutePoint } from '../types/routes';
import type { SubRace } from '../types/database';
import { calculatePointGrade } from '../lib/routes';
import './ElevationWidget.css';

interface ElevationWidgetProps {
  routeData: RouteData;
  /** When the sub-race has its own official distance/elevation, prefer those over GPX-derived stats. */
  officialStats: (Pick<SubRace, 'distance' | 'elevation' | 'aid_stations'>) | null;
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

  const gpxGain = '+' + Math.round(routeData.stats.gain) + 'm';
  const gpxLoss = '-' + Math.round(routeData.stats.loss) + 'm';
  const gpxMaxEle = Math.round(routeData.stats.max_ele) + 'm';
  const gpxMinEle = Math.round(routeData.stats.min_ele) + 'm';
  return (
    <div className="elevation-widget">
      <div className="widget-header">
        <div className="widget-title">
          <Route size={16} className="title-icon" />
          <span>Αναλυση Διαδρομης</span>
        </div>
        <div className="widget-stats">
          <div className="w-stat">
            <span className="w-label">Απόσταση</span>
            <span className="w-value">{displayDistance}</span>
          </div>
          <div className="w-stat">
            <span className="w-label">D+</span>
            <span className="w-value accent-green">{gpxGain}</span>
          </div>
          <div className="w-stat">
            <span className="w-label">D-</span>
            <span className="w-value accent-red">{gpxLoss}</span>
          </div>
          <div className="w-stat">
            <span className="w-label">Μέγιστο</span>
            <span className="w-value">{gpxMaxEle}</span>
          </div>
          <div className="w-stat">
            <span className="w-label">Ελάχιστο</span>
            <span className="w-value">{gpxMinEle}</span>
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
          aidStations={officialStats?.aid_stations as any[]}
        />

        {hoveredPoint && (() => {
          const rawGrade = calculatePointGrade(routeData.profile, hoveredPoint);
          const displayGrade = rawGrade > 0 ? `+${rawGrade.toFixed(1)}%` : `${rawGrade.toFixed(1)}%`;
          return (
            <div className="hover-indicator">
              <div className="h-stat">
                <span>Απόσταση: </span>
                <strong>{(hoveredPoint.d / 1000).toFixed(2)}km</strong>
              </div>
              <div className="h-stat">
                <span>Υψόμετρο: </span>
                <strong>{Math.round(hoveredPoint.e)}m</strong>
              </div>
              <div className="h-stat">
                <span>Κλίση: </span>
                <strong style={{ color: rawGrade > 0 ? '#10b981' : rawGrade < 0 ? '#ef4444' : 'inherit' }}>
                  {displayGrade}
                </strong>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

