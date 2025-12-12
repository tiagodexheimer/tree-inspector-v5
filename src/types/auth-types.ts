// src/types/auth-types.ts

// [FIX] Exportação explícita do tipo UserRole
export type UserRole = "admin" | "free" | "basic" | "pro" | "premium";

/**
 * Define os tipos de planos válidos para a organização.
 */
export type PlanType = "free" | "basic" | "pro" | "premium";

// ==========================================================
// CENTRALIZAÇÃO DE REGRAS DE NEGÓCIO (LIMITES POR PLANO/ROLE)
// ==========================================================

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
    if (role === 'free') return PLAN_LIMITS.FREE;
    if (role === 'basic') return PLAN_LIMITS.BASIC;
    return PLAN_LIMITS.UNLIMITED;
};