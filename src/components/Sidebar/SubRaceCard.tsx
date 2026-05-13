"use client";

import React from 'react';
import { Calendar, Route } from 'lucide-react';
import type { SubRace } from '../../types/database';
import type { RouteData } from '../../types/routes';
import { getSubRaceName } from './raceLabels';

interface SubRaceCardProps {
  subRace: SubRace;
  routeData: RouteData | undefined;
  isSelected: boolean;
  onClick: (subRaceId: string) => void;
}

export function SubRaceCard({ subRace, routeData, isSelected, onClick }: SubRaceCardProps) {
  const hasRoute = !!routeData;
  const distanceLabel = subRace.distance
    ? `${subRace.distance / 1000}km`
    : routeData ? `${(routeData.distance / 1000).toFixed(1)}km` : '?';
  const elevationLabel = subRace.elevation != null
    ? `+${Math.round(subRace.elevation)}m`
    : routeData ? `+${Math.round(routeData.stats.gain)}m` : null;

  return (
    <div
      className={`sub-race-card ${hasRoute ? 'has-route' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={() => hasRoute && onClick(subRace.id)}
    >
      <div className="sub-race-header">
        <div className="sub-race-info">
          <div className="sub-race-name">{getSubRaceName(subRace)}</div>
          {subRace.date && (
            <div className="sub-race-date">
              <Calendar size={12} />
              <span>{new Date(subRace.date).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}</span>
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

      <div className="sub-race-stats">
        <div className="stat-box highlight">
          <span className="stat-label">Απόστ.</span>
          <span className="stat-value">{distanceLabel}</span>
        </div>
        {elevationLabel && (
          <div className="stat-box">
            <span className="stat-label">υψομ.</span>
            <span className="stat-value">{elevationLabel}</span>
          </div>
        )}
        {subRace.start_time && (
          <div className="stat-box">
            <span className="stat-label">Εκκίνηση</span>
            <span className="stat-value">{subRace.start_time.substring(0, 5)}</span>
          </div>
        )}
        {subRace.cut_off_time_hours && (
          <div className="stat-box">
            <span className="stat-label">Όριο</span>
            <span className="stat-value">{subRace.cut_off_time_hours}h</span>
          </div>
        )}
        {!!subRace.price && (
          <div className="stat-box">
            <span className="stat-label">Τιμή</span>
            <span className="stat-value">{subRace.price}€</span>
          </div>
        )}

      </div>
    </div>
  );
}
