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

            // 3. Endereço — PRIORIZA o "Local da Atividade" sobre o endereço do requerente
            // Quando o PDF contém 2 endereços (requerente + local da atividade),
            // precisamos extrair o LOCAL DA ATIVIDADE (onde a demanda ocorre).
            
            // Estratégia:
            // a) Primeiro, tenta achar uma seção "Local da Atividade" / "Endereço da Atividade"
            // b) Se não encontrar, usa o ÚLTIMO endereço/CEP encontrado no documento
            //    (geralmente o local da atividade vem depois do endereço do requerente)

            // Tenta localizar a seção "Local da Atividade" no texto
            const localAtividadeSection = this.extractLocalAtividade(text);
            
            if (localAtividadeSection) {
                // Extrair endereço da seção de local da atividade
                this.extractAddressFromSection(localAtividadeSection, result);
            } else {
                // Fallback: extrai usando todos os matches, priorizando o último (local da atividade)
                this.extractAddressFallback(text, result);
            }

            // Cidade e UF — fallback
            if (!result.cidade && text.includes("Esteio")) {
                result.cidade = "Esteio";
                result.uf = "RS";
            }

            // 4. Descrição / Tipo de Demanda
            if (text.match(/Poda irregular/i) || text.match(/poda/i)) {
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
                result.descricao = result.tipo_demanda === "Poda" ? "Poda de árvore solicitada via PDF." : "Corte de árvore solicitado via PDF.";
            }

            return result;

        } catch (error) {
            console.error("[DemandasParser] Erro ao processar PDF:", error);
            throw new Error("Falha ao analisar o arquivo PDF.");
        }
    },

    /**
     * Tenta extrair a seção "Local da Atividade" do texto do PDF.
     * Retorna o texto da seção se encontrado, ou null.
     */
    extractLocalAtividade(text: string): string | null {
        // Padrões comuns para identificar a seção do local da atividade
        const sectionPatterns = [
            /Local da Atividade[\s\S]*?(?=Descrição|Motivo|Declaro|Recebido|$)/i,
            /Endereço da Atividade[\s\S]*?(?=Descrição|Motivo|Declaro|Recebido|$)/i,
            /Local da Ocorrência[\s\S]*?(?=Descrição|Motivo|Declaro|Recebido|$)/i,
            /Endereço da Ocorrência[\s\S]*?(?=Descrição|Motivo|Declaro|Recebido|$)/i,
            /Local do Fato[\s\S]*?(?=Descrição|Motivo|Declaro|Recebido|$)/i,
            /Dados da[s]? Árvore[\s\S]*?(?=Descrição|Motivo|Declaro|Recebido|$)/i,
            /Dados do Imóvel[\s\S]*?(?=Descrição|Motivo|Declaro|Recebido|$)/i,
        ];

        for (const pattern of sectionPatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[0];
            }
        }

        return null;
    },

    /**
     * Extrai endereço de uma seção específica do PDF.
     */
    extractAddressFromSection(section: string, result: ExtractedDemanda): void {
        // CEP
        const cepMatch = section.match(/CEP:\s*(\d{5}-?\d{3})/i) ||
            section.match(/(\d{5}-\d{3})/);
        if (cepMatch) result.cep = cepMatch[1].includes('-') ? cepMatch[1] : cepMatch[1].replace(/(\d{5})(\d{3})/, '$1-$2');

        // Rua e Número
        const enderecoMatch = section.match(/Endereço:\s*([^,]+),\s*(\d+)/i) ||
            section.match(/Logradouro:\s*([^,\n]+),?\s*(\d+)?/i) ||
            section.match(/Rua:\s*([^,\n]+),?\s*(\d+)?/i);
        if (enderecoMatch) {
            result.logradouro = enderecoMatch[1].trim();
            if (enderecoMatch[2]) result.numero = enderecoMatch[2].trim();
        }

        // Número separado
        if (!result.numero) {
            const numMatch = section.match(/N(?:ú|u)mero:\s*(\d+)/i) ||
                section.match(/Nº:?\s*(\d+)/i);
            if (numMatch) result.numero = numMatch[1].trim();
        }

        // Bairro
        const bairroMatch = section.match(/Bairro:\s*(.*?)(?:\s*-|\s*CEP|\n)/i) ||
            section.match(/Bairro\/ Loteamento:\s*(.*?)(?:\s*-|\s*CEP|\n)/i);
        if (bairroMatch) result.bairro = bairroMatch[1].trim();

        // Cidade
        const cidadeMatch = section.match(/Cidade:\s*([^\n,]+)/i) ||
            section.match(/Município:\s*([^\n,]+)/i);
        if (cidadeMatch) {
            result.cidade = cidadeMatch[1].trim();
        }

        // UF
        const ufMatch = section.match(/UF:\s*([A-Z]{2})/i) ||
            section.match(/Estado:\s*([A-Z]{2})/i);
        if (ufMatch) {
            result.uf = ufMatch[1].trim().toUpperCase();
        }
    },

    /**
     * Fallback: quando não encontra seção "Local da Atividade",
     * busca TODAS as ocorrências de CEP/Endereço e pega a ÚLTIMA
     * (na maioria dos PDFs brasileiros, o local da atividade vem depois do requerente).
     */
    extractAddressFallback(text: string, result: ExtractedDemanda): void {
        // Pega TODOS os CEPs e usa o último
        const allCeps = [...text.matchAll(/CEP:\s*(\d{5}-?\d{3})/gi)];
        if (allCeps.length > 0) {
            const lastCep = allCeps[allCeps.length - 1][1];
            result.cep = lastCep.includes('-') ? lastCep : lastCep.replace(/(\d{5})(\d{3})/, '$1-$2');
        }

        // Pega TODOS os endereços e usa o último
        const allEnderecos = [...text.matchAll(/Endereço:\s*([^,]+),\s*(\d+)/gi)];
        if (allEnderecos.length > 0) {
            const lastEndereco = allEnderecos[allEnderecos.length - 1];
            result.logradouro = lastEndereco[1].trim();
            result.numero = lastEndereco[2].trim();
        }

        // Pega TODOS os bairros e usa o último
        const allBairros = [
            ...text.matchAll(/Bairro:\s*(.*?)(?:\s*-|\s*CEP|\n)/gi),
            ...text.matchAll(/Bairro\/ Loteamento:\s*(.*?)(?:\s*-|\s*CEP|\n)/gi)
        ];
        if (allBairros.length > 0) {
            result.bairro = allBairros[allBairros.length - 1][1].trim();
        }
    },
};
