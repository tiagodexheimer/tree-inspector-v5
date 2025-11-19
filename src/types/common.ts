// src/types/common.ts

// Tipo GeoJSON padrão usado em várias entidades (Demandas, Features, Rotas)
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

// Pode adicionar outros tipos comuns aqui, ex: Paginação, Filtros genéricos
export interface PaginationParams {
  page: number;
  limit: number;
}