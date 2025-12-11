// src/services/rotas-service.ts
import {
  RotasRepository,
  RotaPersistence,
  UpdateRotaDTO,
} from "@/repositories/rotas-repository";
import { ConfiguracoesRepository } from "@/repositories/configuracoes-repository"; 
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { UserRole } from "@/types/auth-types"; 

// [ATUALIZADO] Interface Pura (sem contexto de autenticação/sessão)
interface CreateRotaInput {
  nome: string;
  responsavel: string;
  demandas: { id: number }[];
  inicio_personalizado?: { lat: number; lng: number };
  fim_personalizado?: { lat: number; lng: number };
}

const DEFAULT_FALLBACK_COORDS = {
  latitude: -29.8533191,
  longitude: -51.1789191,
};

const MAX_ROTAS_FREE = 1; // Limite de rotas ativas para o Plano Free

export class RotasService {
  async listRotas(organizationId: number) {
    return await RotasRepository.findAll(organizationId);
  }

  // [CORREÇÃO APLICADA] createRota recebe organizationId e userRole explicitamente
  async createRota(
    input: CreateRotaInput,
    organizationId: number, // Argumento explícito e garantido
    userRole: UserRole // Argumento explícito para aplicar regras
  ) {
    // Validação básica da rota
    if (!input.nome || input.nome.trim() === "")
      throw new Error("O nome da rota é obrigatório.");
    if (!input.responsavel || input.responsavel.trim() === "")
      throw new Error("O responsável é obrigatório.");
    if (!input.demandas || input.demandas.length === 0)
      throw new Error("A rota deve conter pelo menos uma demanda.");

    // [REGRA DE NEGÓCIO: Limite de Rotas]
    if (userRole === 'free') {
        // Assume-se que RotasRepository.countByOrganization está implementado
        const currentCount = await RotasRepository.countByOrganization(organizationId);
        if (currentCount >= MAX_ROTAS_FREE) {
            throw new Error(`Limite de ${MAX_ROTAS_FREE} rota ativa atingido para o Plano Free. Considere atualizar seu plano.`);
        }
    }

    const demandasComOrdem = input.demandas.map((d, index) => ({
      id: d.id,
      ordem: index,
    }));

    return await RotasRepository.create({
      nome: input.nome.trim(),
      responsavel: input.responsavel.trim(),
      status: "Pendente",
      demandas: demandasComOrdem,
      organization_id: organizationId, // ID da organização passado pelo argumento
      inicio_personalizado: input.inicio_personalizado || null,
      fim_personalizado: input.fim_personalizado || null,
    });
  }

  async getRotaDetails(id: number, organizationId: number) {
    const rota = await RotasRepository.findById(id, organizationId);
    if (!rota) return null;

    const demandas = await RotasRepository.findDemandasByRotaId(id);
    
    // 1. Busca configuração global (filtrada por organizationId)
    const configGlobal = await ConfiguracoesRepository.getRotaConfig(organizationId); 
    
    const r = rota as any; 
    
    const hasPersonalStart = r.inicio_personalizado_lat !== null && r.inicio_personalizado_lat !== undefined;
    const hasPersonalEnd = r.fim_personalizado_lat !== null && r.fim_personalizado_lat !== undefined;

    const startPoint = {
        latitude: hasPersonalStart ? r.inicio_personalizado_lat : (configGlobal?.inicio.lat || DEFAULT_FALLBACK_COORDS.latitude),
        longitude: hasPersonalStart ? r.inicio_personalizado_lng : (configGlobal?.inicio.lng || DEFAULT_FALLBACK_COORDS.longitude)
    };

    const endPoint = {
        latitude: hasPersonalEnd ? r.fim_personalizado_lat : (configGlobal?.fim.lat || DEFAULT_FALLBACK_COORDS.latitude),
        longitude: hasPersonalEnd ? r.fim_personalizado_lng : (configGlobal?.fim.lng || DEFAULT_FALLBACK_COORDS.longitude)
    };

    let encodedPolyline: string | null = null;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    const demandasComGeom = demandas.filter((d: any) => d.lat && d.lng);

    if (demandasComGeom.length > 0 && apiKey) {
        try {
            const requestBody = {
                origin: { location: { latLng: startPoint } },
                destination: { location: { latLng: endPoint } },
                intermediates: demandasComGeom.map((d: any) => ({
                    location: { latLng: { latitude: d.lat, longitude: d.lng } }
                })),
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_AWARE',
                optimizeWaypointOrder: false 
            };

            const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'routes.polyline'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            if (response.ok && data.routes && data.routes.length > 0 && data.routes[0].polyline) {
                encodedPolyline = data.routes[0].polyline.encodedPolyline;
            }
        } catch (error) {
            console.error(`[RotasService] Erro Google API rota ${id}:`, error);
        }
    }
    
    return { rota, demandas, encodedPolyline, startPoint, endPoint };
  }

  async updateRota(id: number, organizationId: number, input: UpdateRotaDTO) {
    if (!input.nome || input.nome.trim() === "")
      throw new Error("Nome é obrigatório.");
    if (!input.responsavel || input.responsavel.trim() === "")
      throw new Error("Responsável é obrigatório.");

    const updated = await RotasRepository.update(id, organizationId, input); 
    if (!updated) throw new Error("Rota não encontrada para atualização.");
    return updated;
  }

  async deleteRota(id: number, organizationId: number) {
    const success = await RotasRepository.delete(id, organizationId);
    if (!success) throw new Error("Rota não encontrada para exclusão.");
  }

  async reorderDemandas(rotaId: number, organizationId: number, demandasIds: { id: number }[]) {
    const rota = await RotasRepository.findById(rotaId, organizationId);
    if (!rota) throw new Error("Rota não encontrada.");

    const demandasComOrdem = demandasIds.map((d, index) => ({
      id: d.id,
      ordem: index,
    }));

    await RotasRepository.reorderDemandas(rotaId, demandasComOrdem);
  }

  async generateExport(
    id: number,
    organizationId: number
  ): Promise<{ buffer: Buffer; filename: string }> {
    const data = await RotasRepository.findExportData(id, organizationId);
    if (!data) throw new Error("Rota não encontrada para exportação.");

    const { rotaNome, demandas } = data;
    const dadosFormatados = demandas.map((row) => ({
      Ordem: row.ordem,
      "ID Demanda": row.id,
      Tipo: row.tipo_demanda,
      Descrição: row.descricao,
      CEP: row.cep,
      Rua: row.logradouro,
      Número: row.numero,
      Bairro: row.bairro,
      Cidade: row.cidade,
      UF: row.uf,
      Complemento: row.complemento,
      Solicitante: row.nome_solicitante,
      Telefone: row.telefone_solicitante,
      "E-mail": row.email_solicitante,
      Status: row.status_nome,
      Prazo: row.prazo ? format(new Date(row.prazo), "dd/MM/yyyy") : "",
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const wch = (width: number) => ({ wch: width });
    worksheet["!cols"] = [
      wch(6),
      wch(10),
      wch(15),
      wch(40),
      wch(10),
      wch(30),
      wch(8),
      wch(20),
      wch(20),
      wch(5),
      wch(15),
      wch(25),
      wch(15),
      wch(25),
      wch(15),
      wch(12),
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Demandas da Rota");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const safeName = rotaNome
      .replace(/[^a-z0-9_\- ]/gi, "")
      .trim()
      .replace(/ /g, "_");
    return { buffer, filename: `Rota_${id}_${safeName}.xlsx` };
  }

  async addDemandasToRota(rotaId: number, organizationId: number, demandaIds: number[]) {
    const rota = await RotasRepository.findById(rotaId, organizationId);
    if (!rota) throw new Error("Rota não encontrada.");

    const currentDemandas = await RotasRepository.findDemandasByRotaId(rotaId);
    let maxOrder = currentDemandas.reduce(
      (max: number, d: any) => Math.max(max, d.ordem),
      -1
    );

    const newDemandasWithOrder = demandaIds.map((id) => ({
      id: id,
      ordem: ++maxOrder,
    }));

    await RotasRepository.addDemandasToRota(rotaId, newDemandasWithOrder);

    return await RotasRepository.findDemandasByRotaId(rotaId);
  }
}

export const rotasService = new RotasService();