// src/types/auth-types.ts

// Define as roles canônicas do sistema, baseadas nos planos e na administração.
export type UserRole = "admin" | "free" | "basic" | "pro" | "premium";

/**
 * Define os tipos de planos válidos para a organização.
 * Geralmente é o mesmo que UserRole (exceto 'admin').
 */
export type PlanType = "free" | "basic" | "pro" | "premium";