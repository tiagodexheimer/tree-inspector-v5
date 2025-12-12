// src/types/auth-types.ts

// Define as roles canônicas do sistema.
export type UserRole = "admin" | "free" | "basic" | "pro" | "premium";

/**
 * Define os tipos de planos válidos para a organização.
 */
export type PlanType = "free" | "basic" | "pro" | "premium";


// ==========================================================
// CENTRALIZAÇÃO DE REGRAS DE NEGÓCIO (LIMITES POR PLANO/ROLE)
// ==========================================================

export const PLAN_LIMITS = {
    // Limites de funcionalidades para o Plano Free
    FREE: {
        MAX_DEMANDS: 10,
        MAX_ROTAS: 1,
        MAX_USERS: 1,
        ALLOW_CUSTOM_STATUS: false, // Não permite status personalizados
        ALLOW_CUSTOM_TYPES: false,  // Não permite tipos personalizados
    },
    // Limites de funcionalidades para o Plano Basic (pago, mas com restrições)
    BASIC: {
        MAX_DEMANDS: 500, // Limite maior que Free
        MAX_ROTAS: 5,
        MAX_USERS: 5,
        ALLOW_CUSTOM_STATUS: false, // [NOVA RESTRIÇÃO] Não permite status personalizados
        ALLOW_CUSTOM_TYPES: false,  // [NOVA RESTRIÇÃO] Não permite tipos personalizados
    },
    // UNLIMITED aplica-se a Pro, Premium e Admin (sem restrições de limite)
    UNLIMITED: {
        MAX_DEMANDS: 99999, 
        MAX_ROTAS: 99999,
        MAX_USERS: 99999,
        ALLOW_CUSTOM_STATUS: true, // Permissão concedida
        ALLOW_CUSTOM_TYPES: true,  // Permissão concedida
    }
};

/**
 * Função utilitária para obter os limites de uma determinada role.
 * Retorna as regras específicas baseadas na role.
 */
export const getLimitsByRole = (role: UserRole) => {
    if (role === 'free') {
        return PLAN_LIMITS.FREE;
    }
    if (role === 'basic') {
        return PLAN_LIMITS.BASIC; // Retorna o conjunto de regras do Basic
    }
    // 'pro', 'premium', 'admin' obtêm os limites ilimitados
    return PLAN_LIMITS.UNLIMITED;
};