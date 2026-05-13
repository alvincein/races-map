export type DistanceBucket = '5k' | '10k' | '21k' | '42k' | 'ultra';
export type DateRangePreset = 'all' | '3months' | '6months' | 'custom';
export type EventTypeFilter = 'all' | 'road' | 'trail';

export interface FilterState {
  type: EventTypeFilter;
  distanceRange: DistanceBucket[];
  months: number[]; // 0-11
  upcomingOnly: boolean;
  dateRange: DateRangePreset;
  regions: string[];
  hasGpxOnly: boolean;
  favoritesOnly: boolean;
  customDateStart?: string;
  customDateEnd?: string;
}

export const DEFAULT_FILTERS: FilterState = {
  type: 'all',
  distanceRange: [],
  months: [],
  upcomingOnly: true,
  dateRange: 'all',
  regions: [],
  hasGpxOnly: false,
  favoritesOnly: false,
};
