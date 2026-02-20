// src/types/auth-types.ts

// [MANTIDO] Tipos existentes
export type UserRole = "admin" | "free" | "basic" | "pro" | "premium" | "paid_user" | "free_user" | "pro_user" | "premium_user";
export type PlanType = "free" | "basic" | "pro" | "premium";

// [NOVO] Papéis dentro da organização
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';

// [NOVO] Interface para Membros da Organização
export interface OrganizationMember {
    id: string;
    name: string;
    email: string;
    role: UserRole; // Role do sistema (ex: 'basic')
    organizationRole: OrganizationRole; // Role na organização (ex: 'owner')
    organizationId: number;
}

// [NOVO] Interface para Convites Ativos
export interface ActiveInvite {
    id: number;
    email: string;
    role: OrganizationRole;
    token: string;
    expires_at: string; // ou Date, dependendo de como vem do JSON
}

export const PLAN_LIMITS = {
    FREE: {
        MAX_DEMANDS: 10,
        MAX_ROTAS: 1,
        MAX_USERS: 1,
        MAX_FORMULARIOS: 1,
        ALLOW_CUSTOM_STATUS: false,
        ALLOW_CUSTOM_TYPES: false,
    },
    BASIC: {
        MAX_DEMANDS: 500,
        MAX_ROTAS: 5,
        MAX_USERS: 5,
        MAX_FORMULARIOS: 2,
        ALLOW_CUSTOM_STATUS: false,
        ALLOW_CUSTOM_TYPES: false,
    },
    UNLIMITED: {
        MAX_DEMANDS: 99999,
        MAX_ROTAS: 99999,
        MAX_USERS: 99999,
        MAX_FORMULARIOS: 99999,
        ALLOW_CUSTOM_STATUS: true,
        ALLOW_CUSTOM_TYPES: true,
    }
};

export const getLimitsByRole = (role: UserRole) => {
    const r = (role || "").toLowerCase();
    if (r.includes('free')) return PLAN_LIMITS.FREE;
    if (r.includes('basic')) return PLAN_LIMITS.BASIC;
    return PLAN_LIMITS.UNLIMITED;
};