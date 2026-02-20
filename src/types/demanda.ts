// src/types/demanda.ts
import { UniqueIdentifier } from "@dnd-kit/core";
import { GeoJsonPoint } from "./common"; // Reuso

export type Status = "Pendente" | "Em andamento" | "Concluído" | "Vistoria Agendada" | "Em Rota";

// Entidade de Domínio Pura
export interface DemandaType {
  id?: number;
  protocolo?: string;

  created_at?: string;

  // Dados do Solicitante
  nome_solicitante: string;
  telefone_solicitante?: string | null;
  email_solicitante?: string | null;

  // Endereço
  cep: string;
  logradouro?: string | null;
  numero: string;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;

  // Detalhes
  tipo_demanda: string;
  descricao: string;
  prazo?: Date | null;
  status?: Status;
  responsavel?: string | null;
  anexos?: { url: string; nome: string; type: string }[];
  geom?: GeoJsonPoint | null;
}

// --- DTOs (Data Transfer Objects) e ViewModels ---
// Usados para comunicação com API e Componentes UI

export interface DemandaComIdStatus extends DemandaType {
  id_status?: number | null;
  status_nome?: string;
  status_cor?: string;
  // Atalhos de coordenadas para facilitar uso em mapas (Leaflet/Google)
  lat: number | null;
  lng: number | null;
  // Informações de Notificações vinculadas
  notificacao_status?: string;
  notificacao_vencimento?: string | Date;
}

export interface OptimizedRouteData {
  optimizedDemands: DemandaComIdStatus[];
  routePath: string | [number, number][];
  startPoint: { lat: number, lng: number };
}