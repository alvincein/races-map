import type { StyleSpecification } from 'maplibre-gl';
import type { MapStyle } from './types';

function rasterStyle(
  sourceId: string,
  tilesUrl: string,
  attribution?: string,
): StyleSpecification {
  return {
    version: 8,
    sources: {
      [sourceId]: {
        type: 'raster',
        tiles: [tilesUrl],
        tileSize: 256,
        ...(attribution ? { attribution } : {}),
      },
    },
    layers: [{ id: `${sourceId}-layer`, type: 'raster', source: sourceId }],
  };
}

const ESRI_ATTRIBUTION = 'Tiles &copy; Esri';
const ESRI_TOPO_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
const ESRI_SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

const HYBRID_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': { type: 'raster', tiles: [ESRI_SAT_URL], tileSize: 256 },
    'esri-labels': { type: 'raster', tiles: [ESRI_LABELS_URL], tileSize: 256 },
  },
  layers: [
    { id: 'satellite-layer', type: 'raster', source: 'esri-satellite' },
    { id: 'labels-layer', type: 'raster', source: 'esri-labels' },
  ],
};

export const MAP_STYLES: MapStyle[] = [
  { id: 'dark', label: 'Σκούρο', value: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  { id: 'voyager', label: 'Χάρτης', value: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
  { id: 'terrain', label: 'Τοπογραφικός', value: rasterStyle('esri-topo', ESRI_TOPO_URL, ESRI_ATTRIBUTION) },
  { id: 'satellite', label: 'Δορυφόρος', value: rasterStyle('esri-satellite', ESRI_SAT_URL, ESRI_ATTRIBUTION) },
  { id: 'hybrid', label: 'Υβριδικός', value: HYBRID_STYLE },
];

export const ROUTE_COLORS = [
  '#FFE800', '#00E5FF', '#FF3366', '#00FF66',
  '#FF9900', '#B829FF', '#3366FF', '#FF2A2A',
];
