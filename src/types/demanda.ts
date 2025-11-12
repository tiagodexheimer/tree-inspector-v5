// src/types/demanda.ts
import { UniqueIdentifier } from "@dnd-kit/core";

export type Status = "Pendente" | "Em andamento" | "Concluído";

// Interface para representar a geometria (simplificada)
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

// Tipo atualizado para refletir o formulário e a geometria
export interface DemandaType {
  id?: number;
  protocolo?: string;
  nome_solicitante: string;
  telefone_solicitante?: string | null;
  email_solicitante?: string | null;

  // --- Campos de Endereço Atualizados ---
  // endereco: string; // Remover esta linha
  cep: string; // Obrigatório
  logradouro?: string | null; // Preenchido via CEP
  numero: string; // Obrigatório
  complemento?: string | null; // Opcional
  bairro?: string | null; // Preenchido via CEP
  cidade?: string | null; // Preenchido via CEP
  uf?: string | null; // Preenchido via CEP (UF)
  // ------------------------------------

  tipo_demanda: string;
  descricao: string;
  prazo?: Date | null;
  status?: Status;
  responsavel?: string | null;
  geom?: GeoJsonPoint | null;

  // Manter 'contato' se ainda for usado, mas pode ser redundante
  contato?: {
    nome: string;
    telefone: string;
    email: string;
    endereco: string; // Este campo 'endereco' dentro de 'contato' agora é provavelmente obsoleto
  };
}

// --- NOVAS INTERFACES COMPARTILHADAS ---
export interface DemandaComIdStatus extends DemandaType {
    id_status?: number | null;
    status_nome?: string;
    status_cor?: string;
    lat: number | null; 
    lng: number | null;
}

export interface OptimizedRouteData {
    optimizedDemands: DemandaComIdStatus[];
    routePath: [number, number][];
    startPoint: { lat: number, lng: number };
}
// --- FIM NOVAS INTERFACES COMPARTILHADAS ---


export type FormField = {
  id: UniqueIdentifier;
  // A CORREÇÃO ESTÁ AQUI: Adicionamos o novo tipo 'switch'
  type: "input" | "checkbox" | "select" | "switch";
  label: string;
  placeholder: string;
  options?: string[];
};

export type LaudoForm = {
  id: string;
  nome: string;
  tipoDemandaVinculada: string;
  campos: FormField[];
  dataCriacao: string;
};