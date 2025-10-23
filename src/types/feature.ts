// types/feature.ts (ou onde preferir)

interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Feature {
  id?: number;
  name: string;
  description?: string;
  geom: GeoJsonPoint;
  // Adicione outros campos se precisar
}