import { RotasRepository, RotaPersistence, UpdateRotaDTO } from "@/repositories/rotas-repository";
import * as XLSX from 'xlsx'; 
import { format } from 'date-fns';

interface CreateRotaInput {
  nome: string;
  responsavel: string;
  demandas: { id: number }[];
}

const START_END_POINT_COORDS = { latitude: -29.8533191, longitude: -51.1789191 };

export class RotasService {
  
  async listRotas() {
      return await RotasRepository.findAll();
  }

  async createRota(input: CreateRotaInput) {
      if (!input.nome || input.nome.trim() === "") throw new Error("O nome da rota é obrigatório.");
      if (!input.responsavel || input.responsavel.trim() === "") throw new Error("O responsável é obrigatório.");
      if (!input.demandas || input.demandas.length === 0) throw new Error("A rota deve conter pelo menos uma demanda.");

      const demandasComOrdem = input.demandas.map((d, index) => ({ id: d.id, ordem: index }));
      return await RotasRepository.create({
          nome: input.nome.trim(),
          responsavel: input.responsavel.trim(),
          status: "Pendente",
          demandas: demandasComOrdem
      });
  }

  async getRotaDetails(id: number) {
    const rota = await RotasRepository.findById(id);
    if (!rota) return null;

    const demandas = await RotasRepository.findDemandasByRotaId(id);
    
    let encodedPolyline: string | null = null;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    const demandasComGeom = demandas.filter((d: any) => d.lat && d.lng);

    if (demandasComGeom.length > 0 && apiKey) {
        try {
            const requestBody = {
                origin: { location: { latLng: START_END_POINT_COORDS } },
                destination: { location: { latLng: START_END_POINT_COORDS } },
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
    return { rota, demandas, encodedPolyline };
  }

  async updateRota(id: number, input: UpdateRotaDTO) {
    if (!input.nome || input.nome.trim() === '') throw new Error("Nome é obrigatório.");
    if (!input.responsavel || input.responsavel.trim() === '') throw new Error("Responsável é obrigatório.");

    const updated = await RotasRepository.update(id, input);
    if (!updated) throw new Error("Rota não encontrada para atualização.");
    return updated;
  }

  async deleteRota(id: number) {
      const success = await RotasRepository.delete(id);
      if (!success) throw new Error("Rota não encontrada para exclusão.");
  }

  // [NOVO] Reordenar
  async reorderDemandas(rotaId: number, demandasIds: { id: number }[]) {
      // 1. Verificar existência
      const rota = await RotasRepository.findById(rotaId);
      if (!rota) throw new Error("Rota não encontrada.");

      // 2. Preparar ordem
      const demandasComOrdem = demandasIds.map((d, index) => ({
          id: d.id,
          ordem: index
      }));

      // 3. Salvar
      await RotasRepository.reorderDemandas(rotaId, demandasComOrdem);
  }

  async generateExport(id: number): Promise<{ buffer: Buffer; filename: string }> {
    const data = await RotasRepository.findExportData(id);
    if (!data) throw new Error("Rota não encontrada para exportação.");

    const { rotaNome, demandas } = data;
    const dadosFormatados = demandas.map(row => ({
        "Ordem": row.ordem, "ID Demanda": row.id, "Tipo": row.tipo_demanda,
        "Descrição": row.descricao, "CEP": row.cep, "Rua": row.logradouro,
        "Número": row.numero, "Bairro": row.bairro, "Cidade": row.cidade,
        "UF": row.uf, "Complemento": row.complemento, "Solicitante": row.nome_solicitante,
        "Telefone": row.telefone_solicitante, "E-mail": row.email_solicitante,
        "Status": row.status_nome, "Prazo": row.prazo ? format(new Date(row.prazo), 'dd/MM/yyyy') : '',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const wch = (width: number) => ({ wch: width });
    worksheet['!cols'] = [
        wch(6), wch(10), wch(15), wch(40), wch(10), wch(30), wch(8),  
        wch(20), wch(20), wch(5), wch(15), wch(25), wch(15), wch(25), wch(15), wch(12)
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandas da Rota');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const safeName = rotaNome.replace(/[^a-z0-9_\- ]/gi, '').trim().replace(/ /g, '_');
    return { buffer, filename: `Rota_${id}_${safeName}.xlsx` };
  }

  async addDemandasToRota(rotaId: number, demandaIds: number[]) {
        // 1. Verifica se a rota existe
        const rota = await RotasRepository.findById(rotaId);
        if (!rota) throw new Error("Rota não encontrada.");

        // 2. Busca a ordem máxima atual para continuar a contagem
        const currentDemandas = await RotasRepository.findDemandasByRotaId(rotaId);
        let maxOrder = currentDemandas.reduce((max: number, d: any) => Math.max(max, d.ordem), -1);
        
        // 3. Prepara as novas demandas com a ordem sequencial
        const newDemandasWithOrder = demandaIds.map((id) => ({
            id: id,
            ordem: ++maxOrder
        }));
        
        // 4. Salva as novas associações
        const result = await RotasRepository.addDemandasToRota(rotaId, newDemandasWithOrder);

        // 5. Retorna a lista completa atualizada (incluindo as novas)
        return await RotasRepository.findDemandasByRotaId(rotaId);
    }
}

export const rotasService = new RotasService();