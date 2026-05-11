import type Supercluster from 'supercluster';
import type { StyleSpecification } from 'maplibre-gl';
import type { Race } from '../../types/database';

export interface RacePointProps {
  cluster: false;
  raceId: string;
  race: Race;
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
  races: Race[];
  lng: number;
  lat: number;
}
