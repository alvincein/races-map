import React from 'react';
import { Mountain, Icon } from 'lucide-react';
import { sneaker } from '@lucide/lab';
import type { SubRace } from '../../types/database';

export function isTrailRace(eventType: string | null | undefined): boolean {
  return eventType?.toLowerCase() === 'trail';
}

export function RaceTypeBadge({ eventType, iconSize = 10 }: { eventType: string | null | undefined; iconSize?: number }) {
  const trail = isTrailRace(eventType);
  return (
    <span className={`race-badge ${trail ? 'trail' : 'road'}`}>
      {trail ? <Mountain size={iconSize} /> : <Icon iconNode={sneaker} size={iconSize} />}
      {trail ? 'Βουνο' : 'Δρομος'}
    </span>
  );
}

export function getSubRaceName(s: SubRace): string {
  if (s.name) return s.name;
  const cat = s.category?.toLowerCase();
  if (cat === 'marathon') return 'Μαραθώνιος';
  if (cat === 'half-marathon') return 'Ημιμαραθώνιος';
  if (cat === 'ultra-marathon') return 'Ultra';
  if (cat === 'kids-run') return 'Παιδικός Αγώνας';
  if (s.distance) return `${s.distance / 1000}km`;
  return s.category || 'Αγώνας';
}
