import { GeoJsonPoint } from "./common";

export interface Feature {
  id?: number;
  name: string;
  description?: string;
  geom: GeoJsonPoint;
}