// src/services/demandas-parser.ts
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse';

export interface ExtractedDemanda {
    protocolo?: string;
    nome_solicitante?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cep?: string;
    cidade?: string;
    uf?: string;
    descricao?: string;
    tipo_demanda?: string;
}

export const DemandasParser = {
    async parsePdf(buffer: Buffer): Promise<ExtractedDemanda> {
        try {
            const data = await pdf(buffer);
            const text = data.text;

            const result: ExtractedDemanda = {};

            // 1. Protocolo / Número da Solicitação
            const protocoloMatch = text.match(/Nr\. Solicitação:\s*(\d+)/i) ||
                text.match(/NÚMERO DA SOLICITAÇÃO\s*[\n\r]\s*(\d+)/i) ||
                text.match(/NÚMERO DA SOLICITAÇÃO\s+(\d+)/i);
            if (protocoloMatch) result.protocolo = protocoloMatch[1];

            // 2. Nome do Solicitante
            const nomeMatch = text.match(/Nome:\s*(.*)/i);
            if (nomeMatch) result.nome_solicitante = nomeMatch[1].trim();

            // 3. Endereço

            // CEP
            const cepMatch = text.match(/CEP:\s*(\d{5}-\d{3})/i);
            if (cepMatch) result.cep = cepMatch[1];

            // Rua e Número
            const enderecoMatch = text.match(/Endereço:\s*([^,]+),\s*(\d+)/i);
            if (enderecoMatch) {
                result.logradouro = enderecoMatch[1].trim();
                result.numero = enderecoMatch[2].trim();
            }

            // Bairro
            const bairroMatch = text.match(/Bairro:\s*(.*?)\s*-/i) ||
                text.match(/Bairro\/ Loteamento:\s*(.*?)\s*-/i) ||
                text.match(/Bairro\/ Loteamento:\s*(.*?)\s*CEP/i);
            if (bairroMatch) result.bairro = bairroMatch[1].trim();

            // Cidade e UF
            if (text.includes("Esteio")) {
                result.cidade = "Esteio";
                result.uf = "RS";
            }

            // 4. Descrição / Tipo de Demanda
            if (text.match(/Poda irregular/i)) {
                result.tipo_demanda = "Poda";
            } else if (text.match(/Corte/i) || text.includes("REQUERIMENTO PARA ARBORIZAÇÃO URBANA")) {
                result.tipo_demanda = "Corte";
            }

            // Descrição mais completa
            const descMatch = text.match(/Descrição da Apuração Fiscalizatória\/[\n\r]\s*Denúncia[\n\r]\s*([\s\S]*?)Recebido Por:/i) ||
                text.match(/Motivo da IntervençãoDescrição[\n\r]\s*([\s\S]*?)Declaro/i);
            if (descMatch) {
                result.descricao = descMatch[1].trim().replace(/\s+/g, ' ');
            } else if (!result.descricao) {
                // Fallback decription based on type
                result.descricao = result.tipo_demanda === "Poda" ? "Poda de árvore solicitada via PDF." : "Corte de árvore solicitado via PDF.";
            }

            return result;

        } catch (error) {
            console.error("[DemandasParser] Erro ao processar PDF:", error);
            throw new Error("Falha ao analisar o arquivo PDF.");
        }
    }
};
