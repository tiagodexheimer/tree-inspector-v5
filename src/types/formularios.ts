// Em CriarFormularios.tsx (ou mova para um arquivo de tipos)
export interface CampoOpcao {
  id: string; // Para key no React e gerenciamento
  value: string;
  label: string;
}

export type CampoTipo =
  | 'text'
  | 'textarea'
  | 'checkbox' // Checkbox individual
  | 'select' // Dropdown
  | 'radio' // Grupo de opções de escolha única
  | 'switch'; // Toggle on/off

export interface CampoDef {
  id: string;
  type: CampoTipo;
  name: string; // Atributo name do HTML
  label: string; // Label visível para o usuário
  placeholder?: string; // Para text, textarea
  options?: CampoOpcao[]; // Para select, radio
  defaultValue?: string | boolean; // Valor inicial (para switch, radio default, etc.)
  rows?: number; // Para textarea
}