import React, { useMemo, useRef, useCallback } from 'react';
import type { RoutePoint } from '../types/routes';
import './ElevationProfile.css';

interface ElevationProfileProps {
  data: RoutePoint[];
  color?: string;
  onHover?: (point: RoutePoint | null) => void;
  hoveredPoint?: RoutePoint | null;
  aidStations?: any[];

}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({ 
  data, 
  color = '#FFE800',
  onHover,
  hoveredPoint,
  aidStations
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const { fillPath, strokePath, minEle, maxEle, maxDist } = useMemo(() => {
    if (!data.length) return { fillPath: '', strokePath: '', minEle: 0, maxEle: 0, maxDist: 0 };
    
    const maxDist = data[data.length - 1].d;
    const elevations = data.map(p => p.e);
    const minEle = Math.min(...elevations);
    const maxEle = Math.max(...elevations);
    
    const eleRange = maxEle - minEle || 100;
    const paddedMin = Math.max(0, minEle - eleRange * 0.1);
    const paddedMax = maxEle + eleRange * 0.1;
    const finalRange = paddedMax - paddedMin;

    const width = 1000;
    const height = 150;

    const points = data.map(p => {
      const x = (p.d / maxDist) * width;
      const y = height - ((p.e - paddedMin) / finalRange) * height;
      return `${x},${y}`;
    });

    const fillPath = `M0,${height} ${points.join(' ')} L${width},${height} Z`;
    const strokePath = `M${points.join(' ')}`;

    return { fillPath, strokePath, minEle, maxEle, maxDist };
  }, [data]);

  const findClosestPoint = useCallback((clientX: number) => {
    if (!onHover || !data.length || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const targetDist = percent * maxDist;
    
    let closest = data[0];
    let minDiff = Math.abs(data[0].d - targetDist);
    
    for (const p of data) {
      const diff = Math.abs(p.d - targetDist);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    
    onHover(closest);
  }, [onHover, data, maxDist]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    findClosestPoint(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      findClosestPoint(e.touches[0].clientX);
    }
  };

  const handleMouseLeave = () => {
    if (onHover) onHover(null);
  };

  const handleTouchEnd = () => {
    if (onHover) onHover(null);
  };

  if (!data.length) return null;

  const validAidStations = useMemo(() => {
    if (!aidStations || !Array.isArray(aidStations) || maxDist === 0) return [];
    return aidStations
      .filter(station => station && station.km_location != null)
      .map(station => {
        const d = station.km_location * 1000;
        const x = (d / maxDist) * 1000;
        return {
           ...station,
           x,
           d
        };
      })
      .filter(station => station.x >= 0 && station.x <= 1000);
  }, [aidStations, maxDist]);

  const gradientId = `eleGradient-${data.length}-${Math.round(maxEle)}`;
  
  const cursorX = hoveredPoint ? (hoveredPoint.d / maxDist) * 1000 : 0;

  const eleRange = maxEle - minEle || 100;
  const paddedMin = Math.max(0, minEle - eleRange * 0.1);
  const paddedMax = maxEle + eleRange * 0.1;
  const finalRange = paddedMax - paddedMin;
  const cursorY = hoveredPoint ? 150 - ((hoveredPoint.e - paddedMin) / finalRange) * 150 : 0;

  return (
    <div className="elevation-chart-container">
      <div className="chart-header">
        <span className="ele-tag">Υψομετρικά</span>
        <div className="ele-bounds">
          <span>{minEle}m</span>
          <div className="ele-line"></div>
          <span>{maxEle}m</span>
        </div>
      </div>
      
      <div style={{ position: 'relative' }}>
        <svg 
          ref={svgRef}
          viewBox="0 0 1000 150" 
          className="elevation-svg" 
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        <line x1="0" y1="0" x2="1000" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <line x1="0" y1="75" x2="1000" y2="75" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <line x1="0" y1="150" x2="1000" y2="150" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        <path d={fillPath} fill={`url(#${gradientId})`} />
        <path d={strokePath} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />

        {/* Aid Stations Lines */}
        {validAidStations.map((station, idx) => (
          <g key={`aid-line-${idx}`}>
            <line 
              x1={station.x} 
              y1="0" 
              x2={station.x} 
              y2="150" 
              stroke="rgba(255, 51, 102, 0.6)" 
              strokeWidth="1.5" 
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}

        {/* Sync Cursor Line */}
        {hoveredPoint && (
          <line x1={cursorX} y1="0" x2={cursorX} y2="150" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="4 2" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      
      {/* HTML Overlays for perfect circles & text */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {/* Aid Station Markers */}
        {validAidStations.map((station, idx) => {
          const leftPercent = (station.x / 1000) * 100;
          const topPercent = (140 / 150) * 100;
          return (
            <div 
              key={`aid-overlay-${idx}`}
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#FF3366',
                border: '1.5px solid #fff',
                boxSizing: 'border-box',
                marginBottom: '2px',
                boxShadow: '0 0 5px rgba(255, 51, 102, 0.5)'
              }}></div>
              <span style={{
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                textShadow: '0px 1px 2px rgba(0,0,0,0.8)'
              }}>
                {station.station_number || ''}
              </span>
            </div>
          );
        })}

        {/* Sync Cursor Marker */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              left: `${(cursorX / 1000) * 100}%`,
              top: `${(cursorY / 150) * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'white',
              border: `2px solid ${color}`,
              boxSizing: 'border-box',
              boxShadow: '0 0 4px rgba(0,0,0,0.5)'
            }}
          ></div>
        )}
      </div>
    </div>
      
      <div className="chart-footer">
        <span>0km</span>
        <span>{(maxDist / 1000).toFixed(1)}km</span>
      </div>
    </div>
  );
};
