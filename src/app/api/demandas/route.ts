// src/app/api/demandas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { DemandaType } from '../../../types/demanda';

// --- Função Placeholder de Geocodificação (sem alterações) ---
async function geocodeAddress(logradouro?: string | null, numero?: string | null, cidade?: string | null, uf?: string | null): Promise<[number, number] | null> {
    const addressString = [logradouro, numero, cidade, uf].filter(Boolean).join(', ');
    console.log(`[API] Simulando geocodificação para: ${addressString}`);
    if (logradouro && cidade && uf) {
        console.log('[API] Geocodificação simulada com sucesso.');
        return [-51.1714, -29.8588]; // [longitude, latitude]
    }
    console.log('[API] Geocodificação simulada falhou (dados de endereço insuficientes).');
    return null;
}



// --- Handler para GET (sem alterações) ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
    console.log('[API] Recebido GET em /api/demandas.');
    try {
        // **FIX:** Adiciona 'descricao' à query SELECT
        const result = await pool.query(
          `SELECT id, protocolo, nome_solicitante,
                  cep, logradouro, numero, complemento, bairro, cidade, uf,
                  tipo_demanda, descricao, status, prazo, created_at, -- <--- Adicionado 'descricao' aqui
                  ST_AsGeoJSON(geom) as geom
           FROM demandas ORDER BY created_at DESC`
        ); //

        const demandas = result.rows.map(row => ({
            ...row,
            prazo: row.prazo ? new Date(row.prazo) : null,
            geom: row.geom ? JSON.parse(row.geom) : null
        })); //

        return NextResponse.json(demandas, { status: 200 }); //

    } catch (error) {
        console.error('[API] Erro ao buscar demandas (GET):', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ message: 'Erro interno ao buscar demandas', error: errorMessage }, { status: 500 }); //
    }

    // Salvaguarda
    console.error("[API] GET /api/demandas atingiu o fim inesperadamente.");
    return NextResponse.json({ message: "Erro inesperado no servidor ao processar GET." }, { status: 500 }); //
}


// --- Handler para POST (Criar Demanda - CORRIGIDO) ---
export async function POST(request: NextRequest) {
    console.log('[API] Recebido POST em /api/demandas.');
    try {
        const body = await request.json() as Partial<DemandaType & { prazo: string }>;
        console.log('[API] Body recebido:', body);

        const {
            nome_solicitante, telefone_solicitante, email_solicitante,
            cep, logradouro, numero, complemento, bairro, cidade, uf,
            tipo_demanda, descricao, prazo
        } = body;

        // Validação Mínima
        if (!nome_solicitante || !cep || !numero || !tipo_demanda || !descricao) {
            return NextResponse.json({ message: 'Campos obrigatórios ausentes: Nome, CEP, Número, Tipo e Descrição.' }, { status: 400 });
        }
        if (!/^\d{5}-?\d{3}$/.test(cep)) {
             return NextResponse.json({ message: 'Formato de CEP inválido.' }, { status: 400 });
        }

        const protocolo = `DEM-${Date.now()}`;
        const coordinates = await geocodeAddress(logradouro, numero, cidade, uf);

        // **QUERY SIMPLIFICADA:** Passa $15 diretamente para a coluna geom
        const queryText = `
          INSERT INTO demandas (
            protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
            cep, logradouro, numero, complemento, bairro, cidade, uf,
            tipo_demanda, descricao, status, geom, prazo
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id, protocolo, nome_solicitante, status, created_at, prazo, ST_AsGeoJSON(geom) as geom;
        `;

        const prazoDate = prazo && prazo.trim() !== '' ? new Date(prazo) : null;
        const prazoValidoParaSQL = prazoDate instanceof Date && !isNaN(prazoDate.getTime()) ? prazoDate : null;

        // **PARÂMETROS SIMPLIFICADOS:** $15 é a string WKT ou NULL
        const queryParams = [
             protocolo,
             nome_solicitante,
             telefone_solicitante || null,
             email_solicitante || null,
             cep.replace(/\D/g,''), // Salva apenas dígitos
             logradouro || null,
             numero,
             complemento || null,
             bairro || null,
             cidade || null,
             uf ? uf.toUpperCase() : null,
             tipo_demanda,
             descricao,
             'Pendente',
             // Parâmetro $15: Passa a string WKT 'POINT(lon lat)' ou null
             coordinates ? `POINT(${coordinates[0]} ${coordinates[1]})` : null,
             prazoValidoParaSQL // Parâmetro $16
         ];

        console.log('[API] Executando query:', queryText);
        console.log('[API] Com parâmetros:', queryParams);

        // Executa a query
        const result = await pool.query(queryText, queryParams);

        console.log('[API] Query executada com sucesso. Resultado:', result.rows);

        if (result.rows.length === 0) {
            throw new Error('Falha ao inserir a demanda, nenhum registo retornado.');
        }

        // Preparar a Resposta
        const createdDemanda = result.rows[0];
        if (createdDemanda.geom) {
            createdDemanda.geom = JSON.parse(createdDemanda.geom);
        }
        if (createdDemanda.prazo) {
            createdDemanda.prazo = new Date(createdDemanda.prazo);
        }

        console.log('[API] Demanda criada:', createdDemanda);
        return NextResponse.json({
            message: 'Demanda registrada com sucesso!',
            protocolo: createdDemanda.protocolo,
            demanda: createdDemanda
        }, { status: 201 });

    // Tratamento de Erros
    } catch (error) {
        console.error('[API] Erro detalhado ao criar demanda (POST):', error);
        let errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        let status = 500;
        if (error instanceof Error && 'code' in error && error.code === '23505' && error.message.includes('protocolo')) {
           status = 409;
           errorMessage = 'Erro: Protocolo já existe. Tente novamente.';
        }
        // Log para erro 42P08 removido pois a causa deve estar resolvida
        // if (error instanceof Error && 'code' in error && error.code === '42P08') { ... }

        return NextResponse.json({ message: 'Erro interno do servidor ao criar demanda.', error: errorMessage }, { status });
    }
}