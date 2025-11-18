import pool from "@/lib/db";

// Define o formato do usuário vindo do banco (com a senha hash)
export interface UserWithPassword {
  id: string;
  name: string;
  email: string;
  password: string; // Hash
  role: 'admin' | 'paid_user' | 'free_user';
}

export const UserRepository = {
  async findByEmail(email: string): Promise<UserWithPassword | null> {
    try {
      const result = await pool.query(
        "SELECT id, name, email, role, password FROM users WHERE email = $1",
        [email]
      );
      
      if (result.rows.length === 0) return null;
      return result.rows[0];
    } catch (error) {
      console.error("[UserRepository] Erro ao buscar usuário:", error);
      throw new Error("Erro de infraestrutura ao buscar usuário.");
    }
  }
};