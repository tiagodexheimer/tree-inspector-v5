// src/types/organization-types.ts

export type UserRole = "admin" | "free" | "basic" | "pro" | "premium" | "paid_user"; // Garanta que todos os nomes de role do sistema estão aqui
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'; 

export interface OrganizationMember {
    id: string; 
    name: string;
    email: string;
    role: OrganizationRole; 
}

export interface ActiveInvite {
    id: number;
    email: string;
    role: OrganizationRole; 
    token: string;
    expires_at: string; 
}

export interface NewUserForm {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'paid_user' | 'free_user'; 
}

export const INVITE_LIMITS_FRONTEND: Record<UserRole | 'none', number | 'unlimited'> = {
    'free': 0, 
    'basic': 5, 
    'pro': Infinity, // Seu PRO deve ser Infinity
    'premium': Infinity, 
    'admin': Infinity, 
    'paid_user': Infinity, // Se o seu sistema usa 'paid_user' para PRO
    'none': 0 
};

export const OrganizationRoleOptions: { value: OrganizationRole, label: string }[] = [
    { value: 'admin', label: 'Administrador da Organização' },
    { value: 'member', label: 'Membro (Cria/Edita Demandas)' },
    { value: 'viewer', label: 'Visualizador (Somente Leitura)' },
];