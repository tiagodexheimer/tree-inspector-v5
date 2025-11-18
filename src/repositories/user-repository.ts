// src/repositories/user-repository.ts
import pool from "@/lib/db";

// Interface para o que o banco retorna (incluindo a senha hash)
export interface UserPersistence {
  id: string;
  name: string;
  email: string;
  password?: string; // Opcional porque pode não vir em todas as queries
  role: 'admin' | 'paid_user' | 'free_user';
}

export const UserRepository = {
  async findByEmail(email: string): Promise<UserPersistence | null> {
    try {
      const query = `
        SELECT id, name, email, role, password 
        FROM users 
        WHERE email = $1
      `;
      
      const result = await pool.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      // Retorna o objeto cru do banco
      return result.rows[0] as UserPersistence;
    } catch (error) {
      console.error("Erro no UserRepository.findByEmail:", error);
      return null;
    }
  }
};