import type Supercluster from 'supercluster';
import type { StyleSpecification } from 'maplibre-gl';
import type { Race, RaceWithSubRaces } from '../../types/database';

export interface RacePointProps {
  cluster: false;
  raceId: string;
  race: RaceWithSubRaces;
}

export type ClusterFeature = Supercluster.ClusterFeature<Supercluster.AnyProps>;
export type RacePointFeature = Supercluster.PointFeature<RacePointProps>;

export interface MapStyle {
  id: string;
  label: string;
  value: string | StyleSpecification;
}

export interface SpiderfiedClusterState {
  id: number;
  races: RaceWithSubRaces[];
  lng: number;
  lat: number;
}
