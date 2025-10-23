import { UniqueIdentifier } from "@dnd-kit/core";

export type Status = "Pendente" | "Em andamento" | "Concluído";

export type DemandaType = {
  ID: string;
  endereco: string;
  descricao: string;
  prazo: number;
  status: Status;
  responsavel?: string;
  contato?: {
    nome: string;
    telefone: string;
    email: string;
    endereco: string;
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
