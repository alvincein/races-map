import React, { useMemo, useRef, useCallback } from 'react';
import './ElevationProfile.css';

interface Point {
  d: number; // distance
  e: number; // elevation
  c?: [number, number]; // coords
}

interface ElevationProfileProps {
  data: Point[];
  color?: string;
  onHover?: (point: Point | null) => void;
  hoveredPoint?: Point | null;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({ 
  data, 
  color = '#3b82f6',
  onHover,
  hoveredPoint 
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

        {/* Sync Cursor */}
        {hoveredPoint && (
          <>
            <line x1={cursorX} y1="0" x2={cursorX} y2="150" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="4 2" />
            <circle cx={cursorX} cy={cursorY} r="5" fill="white" stroke={color} strokeWidth="2" />
          </>
        )}
      </svg>
      
      <div className="chart-footer">
        <span>0km</span>
        <span>{(maxDist / 1000).toFixed(1)}km</span>
      </div>
    </div>
  );
};
