// src/config/plans.ts

export type PlanId = 'free' | 'basic' | 'pro' | 'premium';

export interface Plan {
  id: PlanId;
  title: string;
  price: number; // Preço Mensal Base
  tag: string;
  features: string[]; // Funcionalidades positivas
  limits: string[]; // Limitações
  isPaid: boolean;
  isAvailable: boolean; // Indica se o plano está ativo (Premium é 'false')
}

export const PLANS: Plan[] = [
  { 
      id: 'free', 
      title: 'Plano Free', 
      price: 0, 
      tag: 'Teste Gratuito',
      features: ['Visualização em mapa', 'Relatórios de vistoria (visualização)'], 
      limits: ['Até 10 Demandas ativas', 'Máximo de 1 Rota ativa', 'Máximo de 1 usuário', 'Gestão de Status/Tipos (Bloqueado)'], 
      isPaid: false, 
      isAvailable: true 
  },
  { 
      id: 'basic', 
      title: 'Plano Básico', 
      price: 29.90, 
      tag: 'Essencial',
      features: ['Demandas e Rotas ilimitadas', 'Relatórios Básicos', 'Múltiplos usuários (até 5)'], 
      limits: ['Gestão de Status/Tipos (Bloqueado)'], 
      isPaid: true, 
      isAvailable: true 
  },
  { 
      id: 'pro', 
      title: 'Plano Pro', 
      price: 99.90, 
      tag: 'Completo',
      features: ['Tudo do Básico', 'Gestão de Status/Tipos Personalizados', 'Personalização da Organização', 'Usuários Ilimitados'], 
      limits: [], 
      isPaid: true, 
      isAvailable: true 
  },
  { 
      id: 'premium', 
      title: 'Plano Premium', 
      price: 199.90, 
      tag: 'Em Breve',
      features: ['Tudo do Plano Pro', 'Hospedagem isolada (separada)', 'Domínio personalizado'], 
      limits: [], 
      isPaid: true, 
      isAvailable: false // Bloqueado
  },
];