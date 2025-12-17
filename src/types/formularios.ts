// src/types/formularios.ts
import { UniqueIdentifier } from "@dnd-kit/core";

// =========================================================================
// 1. DEFINIÇÕES DETALHADAS DE CAMPOS (MANTIDAS PELO USUÁRIO)
// =========================================================================

export interface CampoOpcao {
  id: string;
  value: string;
  label: string;
}

export type CampoTipo =
  | 'text'
  | 'textarea'
  | 'checkbox' // Checkbox único (sim/não)
  | 'checkbox_group' // [NOVO] Múltipla escolha
  | 'select'
  | 'radio'
  | 'switch'
  | 'password'
  | 'email'
  | 'number'
  | 'date'
  | 'file'
  | 'header'    // [NOVO] Título de Seção
  | 'separator' // [NOVO] Linha divisória
  | 'tree_species'; // [NOVO] Autocomplete de Espécies

// Propriedades comuns a todos os campos
interface CampoBase {
  id: string;
  name: string;
  label: string;
  type: CampoTipo;
  placeholder?: string;
  required?: boolean;
}

// Definições Específicas

interface CampoTexto extends CampoBase {
  type: 'text' | 'password' | 'email' | 'date' | 'number';
}

interface CampoTextArea extends CampoBase {
  type: 'textarea';
  rows?: number;
}

interface CampoComOpcoes extends CampoBase {
  type: 'select' | 'radio' | 'checkbox_group'; // [UPDATE] Adicionado checkbox_group
  options: CampoOpcao[];
}

interface CampoBooleano extends CampoBase {
  type: 'checkbox' | 'switch';
  defaultValue?: boolean;
}

interface CampoFile extends CampoBase {
  type: 'file';
  max_files?: number;
  accept?: string;
}

// [NOVO] Campos de Layout (Visual)
interface CampoLayout extends CampoBase {
  type: 'header' | 'separator';
  // Headers e Separators usam 'label' como texto, ou ignoram
}

interface CampoTreeSpecies extends CampoBase {
  type: 'tree_species';
}


// União Discriminada: O tipo final é uma união destas interfaces
export type CampoDef = CampoTexto | CampoTextArea | CampoComOpcoes | CampoBooleano | CampoFile | CampoLayout | CampoTreeSpecies;


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


// =========================================================================
// 2. INTERFACES DE PERSISTÊNCIA E DTO (NECESSÁRIAS PARA O BACKEND)
// =========================================================================

/**
 * Interface de Persistência: Representa a linha da tabela 'formularios'.
 */
export interface FormulariosPersistence {
  id: number;
  organization_id: number;
  nome: string;
  descricao: string | null;
  // Armazenado como string JSON no DB
  definicao_campos: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * DTO para Criação de Formulário (Usado pelo Service).
 */
export interface CreateFormularioDTO {
  organization_id: number;
  nome: string;
  descricao?: string | null;
  // Deve ser uma string JSON válida de CampoDef[]
  definicao_campos: string;
}

/**
 * DTO para Atualização de Formulário.
 */
export interface UpdateFormularioDTO {
  nome?: string;
  descricao?: string | null;
  definicao_campos?: string;
}