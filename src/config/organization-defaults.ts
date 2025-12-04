// src/config/organization-defaults.ts

// Define as configurações iniciais para status, tipos de demanda e rota padrão
export const DEFAULT_ORGANIZATION_SETTINGS = {
  // Status Padrão para novas organizações
  statuses: [
    { nome: 'Pendente', cor: '#FFA500' },
    { nome: 'Vistoria Agendada', cor: '#1976D2' },
    { nome: 'Em Rota', cor: '#9c27b0' },
    { nome: 'Concluído', cor: '#2E7D32' }
  ],

  // Tipos de Demanda Padrão
  types: [
    'Avaliação',
    'Poda',
    'Supressão',
    'Fiscalização'
  ],

  // Configurações Gerais (Rota Padrão)
  config: {
    chave: 'padrao_rota',
    valor: {
      inicio: { lat: -30.1087668, lng: -51.3422914 },
      fim: { lat: -30.1087668, lng: -51.3422914 }
    }
  }
};