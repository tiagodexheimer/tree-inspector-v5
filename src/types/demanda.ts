// src/types/demanda.ts
import { UniqueIdentifier } from "@dnd-kit/core";

export type Status = "Pendente" | "Em andamento" | "Concluído";

// Interface para representar a geometria (simplificada)
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

// Tipo atualizado para refletir o formulário e a geometria
export type DemandaType = {
  // Campos do formulário AddDemandaModal
  id?: number; // ID será gerado pelo banco
  protocolo?: string; // Podemos gerar um protocolo
  nome_solicitante: string;
  telefone_solicitante?: string | null;
  email_solicitante?: string | null;
  endereco: string;
  tipo_demanda: string; // Ex: 'poda', 'remocao', etc.
  descricao: string;
  // Campos de gestão (do tipo original)
  prazo?: Date | null; // Data limite (agora Date, opcional)
  status?: Status; // Status inicial, pode ser definido no backend
  responsavel?: string | null; // Responsável técnico (opcional)
  // Campo Geográfico
  geom?: GeoJsonPoint | null; // Localização geocodificada (opcional no tipo, mas tentaremos preencher)

  // Manter o campo contato opcional se ainda for usado em outros lugares,
  // mas os campos individuais acima são preferíveis para a tabela.
  contato?: {
    nome: string;
    telefone: string;
    email: string;
    endereco: string; // Pode ser redundante se já tivermos o campo 'endereco' principal
  };
};

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
