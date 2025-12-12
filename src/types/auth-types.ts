// src/types/auth-types.ts (Apenas a seção PLAN_LIMITS)

// ... (UserRole, PlanType, e getLimitsByRole mantidos) ...

// ==========================================================
// CENTRALIZAÇÃO DE REGRAS DE NEGÓCIO (LIMITES POR PLANO/ROLE)
// ==========================================================

export const PLAN_LIMITS = {
    // Limites de funcionalidades para o Plano Free
    FREE: {
        MAX_DEMANDS: 10,
        MAX_ROTAS: 1,
        MAX_USERS: 1,
        MAX_FORMULARIOS: 0,     // [NOVO] Apenas o formulário padrão fixo
        ALLOW_CUSTOM_STATUS: false,
        ALLOW_CUSTOM_TYPES: false,
    },
    // Limites de funcionalidades para o Plano Basic (pago, mas com restrições)
    BASIC: {
        MAX_DEMANDS: 500, 
        MAX_ROTAS: 5,
        MAX_USERS: 5,
        MAX_FORMULARIOS: 2,     // [NOVO] Formulário padrão + um adicional
        ALLOW_CUSTOM_STATUS: false,
        ALLOW_CUSTOM_TYPES: false,
    },
    // UNLIMITED aplica-se a Pro, Premium e Admin (sem restrições de limite)
    UNLIMITED: {
        MAX_DEMANDS: 99999, 
        MAX_ROTAS: 99999,
        MAX_USERS: 99999,
        MAX_FORMULARIOS: 99999, // [NOVO] Ilimitado
        ALLOW_CUSTOM_STATUS: true, 
        ALLOW_CUSTOM_TYPES: true,  
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