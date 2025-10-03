import { UniqueIdentifier } from "@dnd-kit/core";

export type Status = "Pendente" | "Em andamento" | "Concluído";

export type DemandaType = {
  ID: string;
  endereco: string;
  descricao: string;
  prazo: number;
  status: Status;
  responsavel: string;
  contato: {
    nome: string;
    telefone: string;
    email: string;
    endereco: string;
  };
};

// Representa um único campo que você cria no construtor de formulários
export type FormField = {
  id: UniqueIdentifier;
  type: "input" | "checkbox" | "select";
  label: string; // O título que aparece acima ou ao lado do campo
  placeholder: string; // A dica que aparece dentro do campo de input
  options?: string[]; // A lista de opções para checkbox e select
};

// Representa a estrutura completa de um laudo que foi salvo
export type LaudoForm = {
  id: string;
  nome: string;
  tipoDemandaVinculada: string; // Ex: 'Poda', 'Remoção de Árvore', etc.
  campos: FormField[]; // Um array com todos os campos que o laudo contém
  dataCriacao: string;
};
