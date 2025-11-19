// src/types/formularios.ts
import { UniqueIdentifier } from "@dnd-kit/core";

export interface CampoOpcao {
  id: string;
  value: string;
  label: string;
}

export type CampoTipo =
  | 'text'
  | 'textarea'
  | 'checkbox'
  | 'select'
  | 'radio'
  | 'switch'
  | 'password'
  | 'email'
  | 'number'
  | 'date';

// Propriedades comuns a todos os campos
interface CampoBase {
  id: string;
  name: string;
  label: string;
  type: CampoTipo;
  placeholder?: string;
  required?: boolean;
}

// Definições Específicas (Segregação de Interface)

interface CampoTexto extends CampoBase {
  type: 'text' | 'password' | 'email' | 'date' | 'number';
}

interface CampoTextArea extends CampoBase {
  type: 'textarea';
  rows?: number; // Específico de textarea
}

interface CampoComOpcoes extends CampoBase {
  type: 'select' | 'radio';
  options: CampoOpcao[]; // Obrigatório para estes tipos
}

interface CampoBooleano extends CampoBase {
  type: 'checkbox' | 'switch';
  defaultValue?: boolean; // Específico para toggles
}

// União Discriminada: O tipo final é uma união dessas interfaces
// Isso permite que o TypeScript infira quais props existem baseado no 'type'
export type CampoDef = CampoTexto | CampoTextArea | CampoComOpcoes | CampoBooleano;

// Trazendo os tipos que estavam perdidos em demanda.ts para cá (Contexto correto)
export type FormField = {
  id: UniqueIdentifier;
  type: "input" | "checkbox" | "select" | "switch";
  label: string;
  placeholder: string;
  options?: string[];
};

export type LaudoForm = {
  id: string;
  nome: string;
  tipoDemandaVinculada: string;
  campos: FormField[]; // Ou CampoDef[], dependendo da unificação
  dataCriacao: string;
};