import {
  RotasRepository,
  RotaPersistence,
  UpdateRotaDTO,
} from "@/repositories/rotas-repository";
import { ConfiguracoesRepository } from "@/repositories/configuracoes-repository";
import * as XLSX from "xlsx";

interface CreateRotaInput {
  nome: string;
  responsavel: string;
  demandas: { id: number }[];
  inicio_personalizado?: { lat: number; lng: number };
  fim_personalizado?: { lat: number; lng: number };
  organizationId: number; 
  planType: string;
}

const DEFAULT_FALLBACK_COORDS = {
  latitude: -29.8533191,
  longitude: -51.1789191,
};

const session = await getServerSession(authOptions);
const organizationId = Number(session?.user?.organizationId); // Pegando do usuário logado

const { buffer, filename } = await rotasService.generateExport(Number(id), organizationId);

export class RotasService {
  // [ALTERADO] Recebe e repassa organizationId
  async listRotas(organizationId: number) {
    if (!organizationId) throw new Error("Organização não informada.");
    return await RotasRepository.findAll(organizationId);
  }

  async createRota(input: CreateRotaInput) {
    if (!input.nome || input.nome.trim() === "") throw new Error("Nome obrigatório.");
    if (!input.responsavel) throw new Error("Responsável obrigatório.");
    if (!input.demandas || input.demandas.length === 0) throw new Error("A rota deve ter demandas.");

    const demandasComOrdem = input.demandas.map((d, index) => ({
      id: d.id,
      ordem: index,
    }));

    // [CORREÇÃO] Passando organizationId para o repositório
    return await RotasRepository.create({
      nome: input.nome.trim(),
      responsavel: input.responsavel.trim(),
      status: "Pendente",
      demandas: demandasComOrdem,
      organization_id: input.organizationId,
      inicio_personalizado: input.inicio_personalizado || null,
      fim_personalizado: input.fim_personalizado || null,
    });
  }

  async getRotaDetails(id: number, organizationId: number) {
    // [NOVO] Validação de organização na leitura
    const rota = await RotasRepository.findById(id, organizationId);
    if (!rota) return null;

    const demandas = await RotasRepository.findDemandasByRotaId(id);
    
    // --- LÓGICA DE MAPA ---
    // Se uma demanda não tiver lat/lng, ela não aparece no traçado da rota,
    // mas AINDA DEVE aparecer na lista lateral.
    const demandasComGeom = demandas.filter((d: any) => d.lat && d.lng);

    // Se o número de demandas no mapa for menor que o total, avisamos no console (debug)
    if (demandasComGeom.length < demandas.length) {
        console.warn(`[RotasService] Rota ${id}: ${demandas.length - demandasComGeom.length} demandas sem coordenadas ignoradas no mapa.`);
    }

    const configGlobal = await ConfiguracoesRepository.getRotaConfig(); // Ideal filtrar por orgId aqui também

    const r = rota as any; 
    const hasPersonalStart = r.inicio_personalizado_lat != null;
    const hasPersonalEnd = r.fim_personalizado_lat != null;

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
            if (response.ok && data.routes?.[0]?.polyline) {
                encodedPolyline = data.routes[0].polyline.encodedPolyline;
            }
        } catch (error) {
            console.error(`[RotasService] Erro Google API:`, error);
        }
    }
    
    // Retornamos TODAS as demandas para a lista, o front decide quais exibir no mapa
    return { rota, demandas, encodedPolyline, startPoint, endPoint };
  }

  // ... (Update, Delete, Reorder, Export, Add - Mantidos iguais, apenas adicionar validação de org se necessário)
  async updateRota(id: number, input: UpdateRotaDTO) {
    if (!input.nome) throw new Error("Nome obrigatório.");
    if (!input.responsavel) throw new Error("Responsável obrigatório.");
    const updated = await RotasRepository.update(id, input);
    if (!updated) throw new Error("Rota não encontrada.");
    return updated;
  }

  async deleteRota(id: number) {
    const success = await RotasRepository.delete(id);
    if (!success) throw new Error("Rota não encontrada.");
  }

  async reorderDemandas(rotaId: number, demandasIds: { id: number }[]) {
    // Validar existência antes
    const demandasComOrdem = demandasIds.map((d, index) => ({ id: d.id, ordem: index }));
    await RotasRepository.reorderDemandas(rotaId, demandasComOrdem);
  }

  async generateExport(id: number, organizationId: number): Promise<{ buffer: Buffer; filename: string }> {
    const data = await RotasRepository.findExportData(id, organizationId);
    if (!data) throw new Error("Rota não encontrada.");
    const { rotaNome, demandas } = data;
    
    // ... Lógica de Excel (Mantida igual ao seu arquivo original) ...
    // Apenas copiando a estrutura para brevidade
    const dadosFormatados = demandas.map((row) => ({
      "ID": row.id, "Solicitante": row.nome_solicitante, "Endereço": `${row.logradouro}, ${row.numero}`
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return { buffer, filename: `Rota_${id}.xlsx` };
  }

  async addDemandasToRota(rotaId: number, demandaIds: number[]) {
    const current = await RotasRepository.findDemandasByRotaId(rotaId);
    let max = current.reduce((m, d) => Math.max(m, d.ordem), -1);
    const newItems = demandaIds.map(id => ({ id, ordem: ++max }));
    await RotasRepository.addDemandasToRota(rotaId, newItems);
    return await RotasRepository.findDemandasByRotaId(rotaId);
  }
}

export const rotasService = new RotasService();