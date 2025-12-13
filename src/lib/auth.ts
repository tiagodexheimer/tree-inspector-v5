// src/lib/auth.ts

import * as bcrypt from 'bcryptjs'; 

/**
 * Cria um hash seguro para a senha usando bcryptjs.
 * @param password A senha em texto puro.
 * @returns O hash da senha.
 */
export async function hash(password: string): Promise<string> {
    // 10 é um bom custo de trabalho (salt rounds)
    const salt = await bcrypt.genSalt(10); 
    return bcrypt.hash(password, salt);
}

/**
 * Compara uma senha em texto puro com um hash para verificar a autenticidade.
 * @param password Senha em texto puro.
 * @param passwordHash Hash armazenado no banco de dados.
 * @returns Verdadeiro se as senhas corresponderem.
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
}