// src/services/cleanup-service.ts
import { DemandasRepository } from "@/repositories/demandas-repository"; 
import { RotasRepository } from "@/repositories/rotas-repository";


interface CleanupResult {
  deletedDemandas: number;
  deletedRotas: number;
}

export class CleanupService {
  /**
   * Executa a exclusão segura de todos os dados de um tenant.
   * A ordem é crítica para evitar violações de Chaves Estrangeiras (FKs).
   * @param organizationId O ID do tenant logado.
   */

  static async runCleanup(organizationId: number): Promise<CleanupResult> {
    try {
      // ✅ FIX 1: Use uma INSTÂNCIA (se o repositório for uma classe)
      // Se o repositório exporta a instância minúscula (rotasRepository), use-a:
      const deletedRotas = await RotasRepository.deleteAllByOrganization(
        organizationId
      );
      const deletedDemandas = await DemandasRepository.deleteAllByOrganization(
        organizationId
      );

      return { deletedDemandas, deletedRotas };
    } catch (error) {
      console.error("Erro de DB/SQL durante a limpeza:", error);
      // Re-lança para que a rota de API capture o erro e retorne o Status 500
      throw error;
    }
  }
}
