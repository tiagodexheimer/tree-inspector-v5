// src/app/api/demandas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db'; // Ajuste o caminho se necessário
import { DemandaType } from '../../../types/demanda'; // Ajuste o caminho se necessário

// Interface para a resposta da API do Google Geocoding
interface GoogleGeocodeResult {
    results: {
        geometry: {
            location: {
                lat: number; // Latitude
                lng: number; // Longitude
            };
        };
        formatted_address: string;
    }[];
    status: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
    error_message?: string;
}

// --- Handler para GET (permanece igual) ---
export async function GET(_request: NextRequest) {
    console.log('[API /demandas] Recebido GET.');
    try {
        const result = await pool.query(
          `SELECT id, protocolo, nome_solicitante,
                  cep, logradouro, numero, complemento, bairro, cidade, uf,
                  tipo_demanda, descricao, status, prazo, created_at,
                  ST_AsGeoJSON(geom) as geom
           FROM demandas ORDER BY created_at DESC`
        );
        const demandas = result.rows.map(row => ({
            ...row,
            prazo: row.prazo ? new Date(row.prazo) : null,
            geom: row.geom ? JSON.parse(row.geom) : null
        }));
        return NextResponse.json(demandas, { status: 200 });
    } catch (error) {
        console.error('[API /demandas] Erro ao buscar demandas (GET):', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ message: 'Erro interno ao buscar demandas', error: errorMessage }, { status: 500 });
    }
}


// --- Handler para POST (Criar Demanda - CORRIGIDO) ---
export async function POST(request: NextRequest) {
    console.log('[API /demandas] Recebido POST.');
    try {
        const body = await request.json() as Partial<DemandaType & { prazo: string }>;
        console.log('[API /demandas] Body recebido:', body);

        const {
            nome_solicitante, telefone_solicitante, email_solicitante,
            cep, logradouro, numero, complemento, bairro, cidade, uf,
            tipo_demanda, descricao, prazo
        } = body;

        // Validação Mínima (igual)
        if (!nome_solicitante || !cep || !numero || !tipo_demanda || !descricao) {
             console.log('[API /demandas] Erro 400: Campos obrigatórios ausentes.');
             return NextResponse.json({ message: 'Campos obrigatórios ausentes: Nome, CEP, Número, Tipo e Descrição.' }, { status: 400 });
        }
        if (!/^\d{5}-?\d{3}$/.test(cep)) {
             console.log('[API /demandas] Erro 400: Formato de CEP inválido.');
             return NextResponse.json({ message: 'Formato de CEP inválido.' }, { status: 400 });
        }

        const protocolo = `DEM-${Date.now()}`;
        console.log(`[API /demandas] Protocolo gerado: ${protocolo}`);

        // --- INÍCIO: Geocodificação Real com Google Maps ---
        let coordinates: [number, number] | null = null; // [longitude, latitude] para o banco
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.warn('[API /demandas] GOOGLE_MAPS_API_KEY não configurada. Geocodificação será pulada.');
            // Você pode decidir se quer retornar um erro ou continuar sem coordenadas
            // return NextResponse.json({ message: 'Erro interno: Chave de API de geocodificação não configurada.' }, { status: 500 });
        } else if (logradouro && numero && cidade && uf) {
             const addressParts = [numero, logradouro, cidade, uf, 'Brasil'].filter(Boolean);
             const addressString = addressParts.join(', ');
             const queryParams = new URLSearchParams({ address: addressString, key: apiKey, language: 'pt-BR' });
             const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?${queryParams.toString()}`;

            try {
                console.log(`[API /demandas] Chamando Google Geocoding para: ${addressString}`);
                const googleResponse = await fetch(apiUrl);
                const data: GoogleGeocodeResult = await googleResponse.json();
                console.log('[API /demandas] Resposta Google Geocoding:', data.status);

                if (data.status === 'OK' && data.results && data.results.length > 0) {
                    const location = data.results[0].geometry.location;
                    // IMPORTANTE: Armazena como [longitude, latitude] para PostGIS
                    coordinates = [location.lng, location.lat];
                    console.log(`[API /demandas] Coordenadas obtidas: Lon=${coordinates[0]}, Lat=${coordinates[1]}`);
                } else if (data.status !== 'ZERO_RESULTS') {
                    // Loga outros erros da API do Google, mas continua (sem coordenadas)
                    console.warn(`[API /demandas] Aviso da API Google Geocoding: ${data.status} - ${data.error_message || 'Verifique chave/cotas.'}`);
                } else {
                     console.log(`[API /demandas] Google Geocoding não encontrou resultados para o endereço.`);
                }
            } catch(geoError) {
                 console.error('[API /demandas] Erro durante a chamada de geocodificação:', geoError);
                 // Continua a execução mesmo se a geocodificação falhar, mas loga o erro
            }
        } else {
             console.log('[API /demandas] Dados de endereço insuficientes para geocodificação.');
        }
        // --- FIM: Geocodificação Real com Google Maps ---

        // Query SQL (igual)
        const queryText = `
          INSERT INTO demandas (
            protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
            cep, logradouro, numero, complemento, bairro, cidade, uf,
            tipo_demanda, descricao, status, geom, prazo
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, ST_SetSRID(ST_MakePoint($15, $16), 4326), $17)
          RETURNING id, protocolo, nome_solicitante, status, created_at, prazo, ST_AsGeoJSON(geom) as geom;
        `;
          // Nota: Usando ST_MakePoint($15, $16) e ST_SetSRID para criar a geometria
          // Se `coordinates` for null, $15 e $16 serão null, resultando em geom = null

        const prazoDate = prazo && prazo.trim() !== '' ? new Date(prazo) : null;
        const prazoValidoParaSQL = prazoDate instanceof Date && !isNaN(prazoDate.getTime()) ? prazoDate : null;

        // Parâmetros Atualizados para ST_MakePoint
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
             'Pendente', // Status inicial
             coordinates ? coordinates[0] : null, // $15 = Longitude ou NULL
             coordinates ? coordinates[1] : null, // $16 = Latitude ou NULL
             prazoValidoParaSQL // $17 = Prazo ou NULL
         ];

        console.log('[API /demandas] Executando query INSERT:', queryText);
        console.log('[API /demandas] Com parâmetros (lon, lat):', queryParams.slice(14, 16)); // Loga apenas lon/lat para clareza

        // Executa a Query (igual)
        const result = await pool.query(queryText, queryParams);

        console.log('[API /demandas] Query INSERT executada. Linhas retornadas:', result.rowCount);

        if (result.rows.length === 0) {
            throw new Error('Falha ao inserir a demanda, nenhum registo retornado.');
        }

        // Preparar a Resposta (igual)
        const createdDemanda = result.rows[0];
        if (createdDemanda.geom) {
            createdDemanda.geom = JSON.parse(createdDemanda.geom);
        }
        if (createdDemanda.prazo) {
            createdDemanda.prazo = new Date(createdDemanda.prazo);
        }

        console.log('[API /demandas] Demanda criada com sucesso:', createdDemanda);
        return NextResponse.json({
            message: 'Demanda registrada com sucesso!',
            protocolo: createdDemanda.protocolo,
            demanda: createdDemanda
        }, { status: 201 });

    // Tratamento de Erros (igual)
    } catch (error) {
        console.error('[API /demandas] Erro detalhado ao criar demanda (POST):', error);
        let errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        let status = 500;
        if (error instanceof Error && 'code' in error && error.code === '23505' && error.message.includes('protocolo')) {
           status = 409;
           errorMessage = 'Erro: Protocolo já existe. Tente novamente.';
        }
        return NextResponse.json({ message: 'Erro interno do servidor ao criar demanda.', error: errorMessage }, { status });
    }
}

// Handler DELETE (deve estar em src/app/api/demandas/[id]/route.ts, não aqui)
// ...