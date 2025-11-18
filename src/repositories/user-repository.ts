import pool from "@/lib/db";

// Interface mantida exatamente como você enviou
export interface UserPersistence {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'paid_user' | 'free_user';
}

// DTO para os dados necessários na criação
export interface CreateUserRepoDTO {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
}

export const UserRepository = {
  // Seu método existente (inalterado)
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

      return result.rows[0] as UserPersistence;
    } catch (error) {
      console.error("Erro no UserRepository.findByEmail:", error);
      return null;
    }
  },
  
  // Novo: Listar todos os usuários (apenas dados públicos)
  async findAll(): Promise<UserPersistence[]> {
    try {
      // Selecionamos apenas campos seguros (sem password)
      const query = "SELECT id, name, email, role FROM users ORDER BY name ASC";
      const result = await pool.query(query);
      return result.rows as UserPersistence[];
    } catch (error) {
      console.error("Erro no UserRepository.findAll:", error);
      throw new Error("Falha ao buscar usuários no banco de dados.");
    }
  },

  // Novo: Criar usuário
  async create(data: CreateUserRepoDTO): Promise<UserPersistence> {
    try {
      const query = `
        INSERT INTO users (id, name, email, password, role) 
        VALUES (gen_random_uuid(), $1, $2, $3, $4) 
        RETURNING id, name, email, role
      `;
      
      const result = await pool.query(query, [
        data.name, 
        data.email, 
        data.passwordHash, 
        data.role
      ]);
      
      return result.rows[0] as UserPersistence;
    } catch (error) {
      console.error("Erro no UserRepository.create:", error);
      throw error; // Lança o erro para ser tratado no Service (ex: duplicidade)
    }
  },
  
  // Novo método: Deletar usuário pelo ID
  async delete(id: string): Promise<boolean> {
    try {
      // Retorna o ID deletado para confirmar se algo foi removido
      const query = "DELETE FROM users WHERE id = $1 RETURNING id";
      const result = await pool.query(query, [id]);
      
      // Retorna true se uma linha foi afetada (deletada), false se não encontrou
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Erro no UserRepository.delete:", error);
      throw new Error("Falha de infraestrutura ao deletar usuário.");
    }
  }
};