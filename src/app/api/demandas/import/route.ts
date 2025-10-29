// src/app/api/demandas/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db'; // Ajuste o caminho
// Importe a biblioteca do Google Sheets que você escolher
// Exemplo com google-spreadsheet:
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library'; // Para autenticação com Conta de Serviço

// Supondo que você tenha configurado variáveis de ambiente para a Conta de Serviço
const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Lida com quebras de linha em .env
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// Funções auxiliares (reutilizar/adaptar da API de demandas)
async function geocodeAddress(logradouro?: string | null, numero?: string | null, cidade?: string | null, uf?: string | null): Promise<[number, number] | null> {
    // Implemente a lógica real de geocodificação aqui (chamando sua API /api/geocode ou diretamente o Google)
    // Exemplo simplificado:
    if (logradouro && numero && cidade && uf) {
        console.log(`[IMPORT API] Geocoding: ${numero} ${logradouro}, ${cidade}, ${uf}`);
        // Simulação - Chame sua API /api/geocode ou a API do Google aqui
        // const coords = await geocodeAddressViaBackend(logradouro, numero, cidade, uf);
        // return coords ? [coords[1], coords[0]] : null; // Lembre-se que o banco espera [lon, lat]
         return [-51.17, -29.85]; // Exemplo [lon, lat]
    }
    return null;
}

async function getStatusId(nomeStatus: string): Promise<number | null> {
    try {
        const result = await pool.query('SELECT id FROM demandas_status WHERE nome = $1 LIMIT 1', [nomeStatus]);
        return result.rowCount > 0 ? result.rows[0].id : null;
    } catch (err) {
        console.error(`Erro ao buscar ID do status "${nomeStatus}":`, err);
        return null;
    }
}

async function checkTipoDemandaExists(nomeTipo: string): Promise<boolean> {
     try {
        const result = await pool.query('SELECT 1 FROM demandas_tipos WHERE nome = $1 LIMIT 1', [nomeTipo]);
        return result.rowCount > 0;
    } catch (err) {
        console.error(`Erro ao verificar tipo de demanda "${nomeTipo}":`, err);
        return false; // Assume que não existe em caso de erro
    }
}

// Função para parsear data (aceita YYYY-MM-DD ou DD/MM/YYYY)
function parseDate(dateString: string | undefined | null): Date | null {
    if (!dateString) return null;
    try {
        let date: Date | null = null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) { // YYYY-MM-DD
             // Ajuste para UTC para evitar problemas de fuso ao salvar
            date = new Date(dateString + 'T00:00:00Z');
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) { // DD/MM/YYYY
            const parts = dateString.split('/');
            // Ajuste para UTC
            date = new Date(Date.UTC(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
        }
        // Verifica se a data é válida
        if (date && !isNaN(date.getTime())) {
            return date;
        }
    } catch (e) {
        console.warn("Erro ao parsear data:", dateString, e);
    }
    return null;
}


export async function POST(request: NextRequest) {
    console.log('[API /demandas/import] Recebido POST.');
    let successCount = 0;
    const errors: { row: number; message: string; data: any }[] = [];

    try {
        const body = await request.json();
        const sheetLink = body.sheetLink;

        if (!sheetLink || typeof sheetLink !== 'string' || !sheetLink.includes('docs.google.com/spreadsheets/d/')) {
            return NextResponse.json({ message: 'Link inválido ou ausente.' }, { status: 400 });
        }

        // Extrai o ID da planilha do link
        const sheetIdMatch = sheetLink.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!sheetIdMatch || !sheetIdMatch[1]) {
             return NextResponse.json({ message: 'Não foi possível extrair o ID da planilha do link.' }, { status: 400 });
        }
        const sheetId = sheetIdMatch[1];
        console.log(`[IMPORT API] Processando planilha ID: ${sheetId}`);

        // Autentica e carrega a planilha
        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo(); // Carrega metadados e folhas
        const sheet = doc.sheetsByIndex[0]; // Assume a primeira folha
        const rows = await sheet.getRows(); // Pega as linhas (ignora cabeçalho automaticamente)

        console.log(`[IMPORT API] Encontradas ${rows.length} linhas de dados.`);

        // Busca o ID do status 'Pendente' uma vez
        const pendenteStatusId = await getStatusId('Pendente');
        if (!pendenteStatusId) {
            console.warn('[IMPORT API] Status "Pendente" não encontrado no banco. Novas demandas terão id_status NULL.');
        }


        // Itera sobre as linhas da planilha
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowData = row.toObject(); // Converte a linha para um objeto { header: value }
            const rowNumber = i + 2; // +1 porque índice é 0, +1 para contar cabeçalho

            try {
                // --- Validação ---
                const nome_solicitante = rowData['nome_solicitante']?.trim();
                const cepRaw = rowData['cep']?.replace(/\D/g, ''); // Remove não-dígitos
                const numero = rowData['numero']?.trim();
                const tipo_demanda = rowData['tipo_demanda']?.trim();
                const descricao = rowData['descricao']?.trim();

                if (!nome_solicitante) throw new Error('Coluna "nome_solicitante" é obrigatória.');
                if (!cepRaw || cepRaw.length !== 8) throw new Error('Coluna "cep" obrigatória e deve ter 8 dígitos.');
                if (!numero) throw new Error('Coluna "numero" é obrigatória.');
                if (!tipo_demanda) throw new Error('Coluna "tipo_demanda" é obrigatória.');
                if (!descricao) throw new Error('Coluna "descricao" é obrigatória.');

                 // Valida se tipo_demanda existe no banco
                 const tipoExists = await checkTipoDemandaExists(tipo_demanda);
                 if (!tipoExists) {
                     throw new Error(`Tipo de demanda "${tipo_demanda}" não encontrado no sistema. Cadastre-o primeiro.`);
                 }


                // --- Processamento (semelhante ao POST individual) ---
                const protocolo = `DEM-IMP-${Date.now()}-${i}`; // Protocolo de importação

                // Pega dados opcionais ou tenta buscar via CEP (se não preenchidos)
                let { logradouro, bairro, cidade, uf } = rowData;
                if (!logradouro || !bairro || !cidade || !uf) {
                    try {
                        const cepResponse = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`);
                        if (cepResponse.ok) {
                            const cepData = await cepResponse.json();
                            if (!cepData.erro) {
                                logradouro = logradouro || cepData.logradouro;
                                bairro = bairro || cepData.bairro;
                                cidade = cidade || cepData.localidade;
                                uf = uf || cepData.uf;
                            }
                        }
                    } catch (cepErr) { console.warn(`[IMPORT API] Linha ${rowNumber}: Erro ao buscar ViaCEP: ${cepErr}`); }
                }

                // Geocodificação
                const coordinates = await geocodeAddress(logradouro, numero, cidade, uf);

                // Prazo
                const prazoOriginal = rowData['prazo'];
                const prazoDate = parseDate(prazoOriginal);


                // --- Inserção no Banco ---
                 const queryText = `
                    INSERT INTO demandas (
                        protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
                        cep, logradouro, numero, complemento, bairro, cidade, uf,
                        tipo_demanda, descricao, id_status, geom, prazo
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, ST_SetSRID(ST_MakePoint($15, $16), 4326), $17)
                    RETURNING id;`;

                 const queryParams = [
                     protocolo, nome_solicitante, rowData['telefone_solicitante'] || null, rowData['email_solicitante'] || null,
                     cepRaw, logradouro || null, numero, rowData['complemento'] || null, bairro || null, cidade || null, uf ? uf.toUpperCase() : null,
                     tipo_demanda, descricao, pendenteStatusId, // Usa ID do status pendente
                     coordinates ? coordinates[0] : null, // Longitude
                     coordinates ? coordinates[1] : null, // Latitude
                     prazoDate // Date ou Null
                 ];

                const result = await pool.query(queryText, queryParams);
                if (result.rowCount > 0) {
                    successCount++;
                } else {
                     throw new Error('Falha ao inserir no banco de dados (nenhuma linha retornada).');
                }

            } catch (rowError) {
                console.error(`[IMPORT API] Erro na linha ${rowNumber}:`, rowError);
                errors.push({
                    row: rowNumber,
                    message: rowError instanceof Error ? rowError.message : 'Erro desconhecido na linha.',
                    data: rowData // Guarda os dados da linha com erro
                });
            }
        } // Fim do loop for

        console.log(`[IMPORT API] Importação concluída. Sucesso: ${successCount}, Erros: ${errors.length}`);
        return NextResponse.json({ successCount, errors }, { status: 200 });

    } catch (error) {
        console.error('[API /demandas/import] Erro geral na importação:', error);
        let message = 'Erro interno do servidor ao processar a importação.';
        if (error instanceof Error) {
            // Trata erros específicos da API do Google Sheets (ex: permissão, planilha não encontrada)
            if ('response' in error && typeof error.response === 'object' && error.response && 'data' in error.response) {
                 const gaxiosError = error as any; // Tipagem GaxiosResponse pode ser complexa
                 message = `Erro ao acessar Google Sheets: ${gaxiosError.response.data?.error?.message || error.message}`;
            } else {
                 message = error.message;
            }
        }
        return NextResponse.json({ message, successCount, errors }, { status: 500 });
    }
}