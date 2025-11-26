import {
  DemandasRepository,
  FindDemandasParams,
} from "@/repositories/demandas-repository";
import { StatusRepository } from "@/repositories/status-repository";
import { DemandasTiposRepository } from "@/repositories/demandas-tipos-repository";
import { geocodingService } from "@/services/geocoding-service";

// (Interface CreateDemandaInput mantida...)
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
  coordinates?: [number, number] | null;
}

// [NOVO] Interface para input de atualização
interface UpdateDemandaInput extends CreateDemandaInput {
  // Herda os campos, mas vamos tratar o que for opcional na lógica
}

export class DemandasService {
  // ... (métodos listDemandas, createDemanda e importBatch existentes) ...
  async listDemandas(params: FindDemandasParams, userRole?: string) {
    if (userRole === "free_user") {
      params.limit = 10;
      params.page = 1;
    }
    const { demandas, totalCount } = await DemandasRepository.findAll(params);
    const demandasFormatadas = demandas.map((d) => ({
      ...d,
      prazo: d.prazo ? new Date(d.prazo) : null,
      geom: d.geom ? JSON.parse(d.geom) : null,
    }));
    return { demandas: demandasFormatadas, totalCount };
  }

  async createDemanda(input: CreateDemandaInput) {
    if (
      !input.cep ||
      !input.numero ||
      !input.tipo_demanda ||
      !input.descricao
    ) {
      throw new Error(
        "Campos obrigatórios ausentes: CEP, Número, Tipo e Descrição."
      );
    }
    const protocolo = `DEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const statusPendente = await StatusRepository.findByName("Pendente");
    const initialStatusId = statusPendente?.id || null;
    const prazoDate =
      input.prazo && input.prazo.trim() !== "" ? new Date(input.prazo) : null;
    const lat = input.coordinates ? input.coordinates[0] : null;
    const lng = input.coordinates ? input.coordinates[1] : null;

    return await DemandasRepository.create({
      protocolo,
      nome_solicitante: input.nome_solicitante,
      telefone_solicitante: input.telefone_solicitante || null,
      email_solicitante: input.email_solicitante || null,
      cep: input.cep.replace(/\D/g, ""),
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
      prazo: prazoDate,
    });
  }

  async importBatch(rows: any[]) {
    return { successCount: 0, errors: [] };
  }
  private parseDate(d: any) {
    return null;
  }

  // [NOVO] Atualizar Demanda
  async updateDemanda(id: number, input: Partial<UpdateDemandaInput>) {
    // 1. Validação Básica
    if (
      !input.cep ||
      !input.numero ||
      !input.tipo_demanda ||
      !input.descricao
    ) {
      throw new Error(
        "Campos obrigatórios ausentes: CEP, Número, Tipo e Descrição."
      );
    }

    if (!/^\d{5}-?\d{3}$/.test(input.cep)) {
      throw new Error("Formato de CEP inválido.");
    }

    // 2. Tratamento de Prazo
    const prazoDate =
      input.prazo && input.prazo.trim() !== "" ? new Date(input.prazo) : null;

    // 3. Coordenadas
    // Se vier do front, usa. Se não, tenta manter. A lógica do SQL 'ELSE geom' lida com manter.
    // Se quisermos limpar, teríamos que passar explicitamente. Aqui assumimos que se coordinates é undefined, mantemos.
    // Se coordinates for null, o SQL define lat/lng como null? Não, nosso SQL usa CASE.
    // Para simplificar: passamos lat/lng se existirem no input.
    const lat = input.coordinates ? input.coordinates[0] : null;
    const lng = input.coordinates ? input.coordinates[1] : null;

    // 4. Atualizar
    const updated = await DemandasRepository.update(id, {
      nome_solicitante: input.nome_solicitante || "",
      telefone_solicitante: input.telefone_solicitante || null,
      email_solicitante: input.email_solicitante || null,
      cep: input.cep.replace(/\D/g, ""),
      logradouro: input.logradouro || null,
      numero: input.numero,
      complemento: input.complemento || null,
      bairro: input.bairro || null,
      cidade: input.cidade || null,
      uf: input.uf ? input.uf.toUpperCase() : null,
      tipo_demanda: input.tipo_demanda,
      descricao: input.descricao,
      lat,
      lng,
      prazo: prazoDate,
    });

    if (!updated) {
      throw new Error("Demanda não encontrada.");
    }

    return updated;
  }

  // [NOVO] Deletar Demanda
  async deleteDemanda(id: number): Promise<void> {
    // Poderíamos verificar se a demanda faz parte de uma rota ativa aqui, por exemplo.
    const success = await DemandasRepository.delete(id);
    if (!success) {
      throw new Error("Demanda não encontrada.");
    }
  }
  // [NOVO] Atualizar Status da Demanda
  async updateDemandaStatus(id: number, idStatus: number): Promise<void> {
    // 1. Validar se o Status existe
    const statusExists = await StatusRepository.findById(idStatus);
    if (!statusExists) {
      throw new Error(`Status com ID ${idStatus} não encontrado.`);
    }

    // 2. Atualizar
    const updated = await DemandasRepository.updateStatus(id, idStatus);

    if (!updated) {
      throw new Error("Demanda não encontrada para atualização de status.");
    }
  }
  // Adicione dentro da classe DemandasService
  async deleteDemandas(ids: number[]): Promise<void> {
    // Aqui você pode adicionar validações extras, ex: verificar se alguma demanda já está em uma rota ativa
    // antes de permitir a exclusão.

    await DemandasRepository.deleteMany(ids);
  }
}

export const demandasService = new DemandasService();
