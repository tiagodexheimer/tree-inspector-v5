// src/app/api/demandas/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Ajuste o caminho '../..' conforme necessário para apontar para a raiz da sua pasta 'src'
import pool from '../../../lib/db';
import { DemandaType } from '../../../types/demanda';

// --- Função Placeholder de Geocodificação ---
// No futuro, substitua isso por uma chamada a uma API de geocodificação real (Google, Nominatim, etc.)
async function geocodeAddress(address: string): Promise<[number, number] | null> {
    console.log(`[API] Simulando geocodificação para: ${address}`);
    // Coordenadas Exemplo: Esteio, RS [-51.1714, -29.8588] (Longitude, Latitude)
    if (address && address.length > 3) { // Simula sucesso apenas se endereço parecer válido
        console.log('[API] Geocodificação simulada com sucesso.');
        return [-51.1714, -29.8588]; // [longitude, latitude]
    }
    console.log('[API] Geocodificação simulada falhou ou endereço inválido.');
    return null;
}
// ------------------------------------------

// --- Handler para GET (Listar Demandas) ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
    console.log('[API] Recebido GET em /api/demandas.');
    try {
        // Seleciona as colunas, convertendo a geometria para GeoJSON
        const result = await pool.query(
          'SELECT id, protocolo, nome_solicitante, endereco, tipo_demanda, status, created_at, ST_AsGeoJSON(geom) as geom FROM demandas ORDER BY created_at DESC'
        );

        // Mapeia o resultado, fazendo parse da string GeoJSON para objeto
        const demandas = result.rows.map(row => ({
            ...row,
            geom: row.geom ? JSON.parse(row.geom) : null // Trata geom nulo
        }));

        // Retorna a lista de demandas como JSON
        return NextResponse.json(demandas, { status: 200 });

    } catch (error) {
        console.error('[API] Erro ao buscar demandas (GET):', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        // Retorna um erro 500 em caso de falha
        return NextResponse.json({ message: 'Erro interno ao buscar demandas', error: errorMessage }, { status: 500 });
    }
}

// --- Handler para POST (Criar Demanda) ---
export async function POST(request: NextRequest) {
    console.log('[API] Recebido POST em /api/demandas.');
    try {
        const body = await request.json() as Partial<DemandaType & { prazo: string }>; // Adiciona 'prazo: string' ao tipo esperado do body
        console.log('[API] Body recebido:', body);

        const {
            nome_solicitante,
            telefone_solicitante,
            email_solicitante,
            endereco,
            tipo_demanda,
            descricao,
            prazo // Extrai o prazo do body
        } = body;

        // Validação Mínima
        if (!nome_solicitante || !endereco || !tipo_demanda || !descricao) {
            console.error('[API] Erro 400: Campos obrigatórios ausentes.');
            return NextResponse.json({ message: 'Campos obrigatórios ausentes: nome, endereço, tipo e descrição.' }, { status: 400 });
        }

        // 1. Gerar Protocolo
        const protocolo = `DEM-${Date.now()}`;
        console.log(`[API] Protocolo gerado: ${protocolo}`);

        // 2. Geocodificar o Endereço
        const coordinates = await geocodeAddress(endereco);

        // 3. Montar a Query SQL - Adiciona 'prazo'
        const queryText = `
          INSERT INTO demandas (
            protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
            endereco, tipo_demanda, descricao, status, geom,
            prazo -- Adiciona a coluna prazo
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
            -- Lógica da geometria (igual antes)
            CASE
              WHEN $9::float[] IS NOT NULL THEN ST_SetSRID(ST_MakePoint($9[1], $9[2]), 4326)
              ELSE NULL
            END,
            $10 -- Placeholder para o prazo
          )
          -- Retorna os dados inseridos (pode adicionar 'prazo' se quiser)
          RETURNING id, protocolo, nome_solicitante, status, created_at, prazo, ST_AsGeoJSON(geom) as geom;
        `;

        // Converte a string 'YYYY-MM-DD' para Date ou null se vazia/inválida
        // O driver 'pg' lida bem com objetos Date ou strings no formato ISO para colunas DATE/TIMESTAMP
        const prazoDate = prazo && prazo.trim() !== '' ? new Date(prazo) : null;
        // Validação simples para garantir que a conversão resultou numa data válida
        const prazoValidoParaSQL = prazoDate instanceof Date && !isNaN(prazoDate.getTime()) ? prazoDate : null;


        // Prepara os parâmetros para a query SQL - Adiciona 'prazoValidoParaSQL'
        const queryParams = [
             protocolo,
             nome_solicitante,
             telefone_solicitante || null,
             email_solicitante || null,
             endereco,
             tipo_demanda,
             descricao,
             'Pendente', // Status inicial
             coordinates, // Array [lon, lat] ou null
             prazoValidoParaSQL // Date object ou null
         ];

        console.log('[API] Executando query:', queryText);
        console.log('[API] Com parâmetros:', queryParams);

        // 4. Executar a Query no banco de dados
        const result = await pool.query(queryText, queryParams);
        console.log('[API] Query executada com sucesso. Resultado:', result.rows);

        if (result.rows.length === 0) {
            throw new Error('Falha ao inserir a demanda, nenhum registo retornado.');
        }

        // 5. Preparar a Resposta
        const createdDemanda = result.rows[0];
        if (createdDemanda.geom) {
            createdDemanda.geom = JSON.parse(createdDemanda.geom);
        }
        // Converte o prazo retornado (que pode ser string ou Date) para um formato consistente se necessário
        if (createdDemanda.prazo) {
            createdDemanda.prazo = new Date(createdDemanda.prazo); // Garante que seja Date na resposta
        }


        console.log('[API] Demanda criada:', createdDemanda);
        return NextResponse.json({
            message: 'Demanda registrada com sucesso!',
            protocolo: createdDemanda.protocolo,
            demanda: createdDemanda
        }, { status: 201 });

    // Tratamento de Erros (sem alterações)
    } catch (error) {
        console.error('[API] Erro detalhado ao criar demanda (POST):', error);
        let errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        let status = 500;
        if (error instanceof Error && 'code' in error && error.code === '23505' && error.message.includes('protocolo')) {
           status = 409;
           errorMessage = 'Erro: Protocolo já existe. Tente novamente.';
        }
        return NextResponse.json({ message: 'Erro interno do servidor ao criar demanda.', error: errorMessage }, { status });
    }
}