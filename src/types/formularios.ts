// src/types/formularios.ts
export interface CampoOpcao {
  id: string;
  value: string;
  label: string;
}

// Ensure ALL these types are present
export type CampoTipo =
  | 'text'
  | 'textarea'
  | 'checkbox'
  | 'select'
  | 'radio'
  | 'switch'
  | 'password' // Make sure this is here
  | 'email'    // Make sure this is here
  | 'number'   // Make sure this is here
  | 'date';    // Make sure this is here

export interface CampoDef {
  id: string;
  type: CampoTipo;
  name: string;
  label: string;
  placeholder?: string;
  options?: CampoOpcao[];
  defaultValue?: string | boolean;
  rows?: number;
}