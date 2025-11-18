import { DemandasRepository, FindDemandasParams } from "@/repositories/demandas-repository";
import { StatusRepository } from "@/repositories/status-repository";
import { DemandasTiposRepository } from "@/repositories/demandas-tipos-repository";
import { geocodingService } from "@/services/geocoding-service";

// DTO de entrada para criação via API (pode ter coordenadas diretas ou precisar de geocoding)
interface CreateDemandaInput {
  nome_solicitante: string;
  telefone_solicitante?: string | null;
  email_solicitante?: string | null;
  cep: string;
  logradouro?: string | null;
  numero: string;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  tipo_demanda: string;
  descricao: string;
  prazo?: string | null;
  coordinates?: [number, number] | null; // [lat, lng] vindos do front
}

export class DemandasService {
  
  // --- LISTAGEM ---
  async listDemandas(params: FindDemandasParams, userRole?: string) {
    // Regra de Negócio: Limite para usuário gratuito
    if (userRole === 'free_user') {
      console.log("[DemandasService] Usuário free_user: limitando resultados.");
      params.limit = 10;
      params.page = 1; // Força primeira página? Ou apenas limita o tamanho? Geralmente limita o acesso.
    }

    const { demandas, totalCount } = await DemandasRepository.findAll(params);

    // Formatação final (datas, geom) se necessário
    const demandasFormatadas = demandas.map(d => ({
        ...d,
        prazo: d.prazo ? new Date(d.prazo) : null,
        geom: d.geom ? JSON.parse(d.geom) : null
    }));

    return { demandas: demandasFormatadas, totalCount };
  }

  // --- CRIAÇÃO (Unitária) ---
  async createDemanda(input: CreateDemandaInput) {
    // 1. Validação Básica
    if (!input.cep || !input.numero || !input.tipo_demanda || !input.descricao) {
        throw new Error("Campos obrigatórios ausentes: CEP, Número, Tipo e Descrição.");
    }

    // 2. Gerar Protocolo
    const protocolo = `DEM-${Date.now()}`;

    // 3. Buscar Status Inicial ("Pendente")
    const statusPendente = await StatusRepository.findByName("Pendente");
    const initialStatusId = statusPendente?.id || null;

    // 4. Tratamento de Prazo
    const prazoDate = input.prazo && input.prazo.trim() !== "" ? new Date(input.prazo) : null;

    // 5. Coordenadas
    // Se o frontend já mandou coordinates, usamos. Senão, latitude/longitude ficam null.
    // (Poderíamos chamar o geocodingService aqui se quiséssemos forçar no backend)
    const lat = input.coordinates ? input.coordinates[0] : null;
    const lng = input.coordinates ? input.coordinates[1] : null;

    // 6. Salvar
    return await DemandasRepository.create({
        protocolo,
        nome_solicitante: input.nome_solicitante,
        telefone_solicitante: input.telefone_solicitante || null,
        email_solicitante: input.email_solicitante || null,
        cep: input.cep.replace(/\D/g, ""), // Limpa CEP
        logradouro: input.logradouro || null,
        numero: input.numero,
        complemento: input.complemento || null,
        bairro: input.bairro || null,
        cidade: input.cidade || null,
        uf: input.uf ? input.uf.toUpperCase() : null,
        tipo_demanda: input.tipo_demanda,
        descricao: input.descricao,
        id_status: initialStatusId,
        lat,
        lng,
        prazo: prazoDate
    });
  }

  // ... (mantenha o método importBatch aqui se ele já existe no seu arquivo) ...
  async importBatch(rows: any[]) {
     // ... (código do importBatch da resposta anterior)
     // Apenas para garantir que o arquivo não quebre se você colar por cima
     return { successCount: 0, errors: [] }; // Placeholder se não tiver o código
  }
  // Helper privado parseDate (se necessário para o importBatch)
  private parseDate(d: any) { return null; } 
}

export const demandasService = new DemandasService();