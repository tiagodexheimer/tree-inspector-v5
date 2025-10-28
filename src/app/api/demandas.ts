// pages/api/demandas.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db'; // Verifique se este caminho está correto
import { DemandaType } from '@/types/demanda'; // Verifique se este caminho está correto

// --- Função Placeholder de Geocodificação ---
// ATUALIZADA para receber os campos separados
async function geocodeAddress(logradouro?: string | null, numero?: string | null, cidade?: string | null, uf?: string | null): Promise<[number, number] | null> {
    const addressString = [logradouro, numero, cidade, uf].filter(Boolean).join(', ');
    console.log(`[API_PAGES] Simulando geocodificação para: ${addressString}`);
    if (logradouro && cidade && uf) {
      console.log('[API_PAGES] Geocodificação simulada com sucesso.');
      return [-51.1714, -29.8588]; // [longitude, latitude]
    }
    console.log('[API_PAGES] Geocodificação simulada falhou (dados de endereço insuficientes).');
    return null;
}
// ------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // --- Rota POST: Criar uma nova demanda ---
  if (req.method === 'POST') {
    console.log('[API_PAGES] Recebido POST em /api/demandas. Body:', req.body);

    try {
      // ***** CORREÇÃO AQUI *****
      // Desestruturar os novos campos de endereço
      const {
        nome_solicitante,
        telefone_solicitante,
        email_solicitante,
        // Remover 'endereco'
        cep, logradouro, numero, complemento, bairro, cidade, uf, // Adicionar novos campos
        tipo_demanda,
        descricao,
        prazo // Adicionado prazo se aplicável neste arquivo também
      } = req.body as Partial<DemandaType & { prazo: string }>; // Manter prazo se usado

      // Validação Mínima (Atualizada)
      if (!nome_solicitante || !cep || !numero || !tipo_demanda || !descricao) { // Usar cep e numero na validação
        console.error('[API_PAGES] Erro 400: Campos obrigatórios ausentes.');
        return res.status(400).json({ message: 'Campos obrigatórios ausentes: Nome, CEP, Número, Tipo e Descrição.' });
      }
      if (!/^\d{5}-?\d{3}$/.test(cep)) {
        return res.status(400).json({ message: 'Formato de CEP inválido.' });
      }

      // 1. Gerar Protocolo
      const protocolo = `DEM-${Date.now()}`;
      console.log(`[API_PAGES] Protocolo gerado: ${protocolo}`);

      // 2. Geocodificar (usando novos campos)
      const coordinates = await geocodeAddress(logradouro, numero, cidade, uf);

      // 3. Montar a Query SQL (Atualizada para novos campos)
      const queryText = `
        INSERT INTO demandas (
          protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
          cep, logradouro, numero, complemento, bairro, cidade, uf, -- Novos campos aqui
          tipo_demanda, descricao, status, geom, prazo -- Adicionado prazo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) -- Ajustar número de params
        RETURNING id, protocolo, nome_solicitante, status, created_at, prazo, ST_AsGeoJSON(geom) as geom;
      `;

      const prazoDate = prazo && prazo.trim() !== '' ? new Date(prazo) : null;
      const prazoValidoParaSQL = prazoDate instanceof Date && !isNaN(prazoDate.getTime()) ? prazoDate : null;

      // Parâmetros Atualizados
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
           coordinates ? `POINT(${coordinates[0]} ${coordinates[1]})` : null, // WKT ou NULL
           prazoValidoParaSQL // Prazo
       ];

      console.log('[API_PAGES] Executando query:', queryText);
      console.log('[API_PAGES] Com parâmetros:', queryParams);

      // 4. Executar a Query
      const result = await pool.query(queryText, queryParams);

      console.log('[API_PAGES] Query executada com sucesso. Resultado:', result.rows);

      if (result.rows.length === 0) {
          throw new Error('Falha ao inserir a demanda, nenhum registo retornado.');
      }

      // 5. Preparar e Enviar a Resposta
      const createdDemanda = result.rows[0];
      if (createdDemanda.geom) {
          createdDemanda.geom = JSON.parse(createdDemanda.geom);
      }
      if (createdDemanda.prazo) { // Tratar prazo na resposta
          createdDemanda.prazo = new Date(createdDemanda.prazo);
      }

      console.log('[API_PAGES] Demanda criada:', createdDemanda);
      res.status(201).json({
          message: 'Demanda registrada com sucesso!',
          protocolo: createdDemanda.protocolo,
          demanda: createdDemanda
      });

    } catch (error) {
      console.error('[API_PAGES] Erro detalhado ao criar demanda:', error);
      // ... (tratamento de erro como antes) ...
      let errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      let status = 500;
      if (error instanceof Error && 'code' in error && error.code === '23505' && error.message.includes('protocolo')) {
         status = 409;
         errorMessage = 'Erro: Protocolo já existe. Tente novamente.';
      }
      res.status(status).json({ message: 'Erro interno do servidor ao criar demanda.', error: errorMessage });
    }
  }
  // --- Outros Métodos (GET) ---
  else if (req.method === 'GET') {
       console.log('[API_PAGES] Recebido GET em /api/demandas.');
       try {
           // **FIX:** Adiciona os novos campos de endereço e remove o antigo 'endereco'
           const result = await pool.query(
             `SELECT id, protocolo, nome_solicitante,
                     cep, logradouro, numero, complemento, bairro, cidade, uf, -- Novos campos
                     tipo_demanda, descricao, status, prazo, created_at,
                     ST_AsGeoJSON(geom) as geom
              FROM demandas ORDER BY created_at DESC`
           );
           const demandas = result.rows.map(row => ({
               ...row,
               prazo: row.prazo ? new Date(row.prazo) : null, // Converte prazo
               geom: row.geom ? JSON.parse(row.geom) : null // Trata geom nulo
           }));
           res.status(200).json(demandas);
       } catch (error) {
           console.error('[API_PAGES] Erro ao buscar demandas (GET):', error);
           res.status(500).json({ message: 'Erro interno ao buscar demandas', error: (error instanceof Error ? error.message : String(error)) });
       }
  } else {
    console.log(`[API_PAGES] Método ${req.method} não permitido para /api/demandas.`);
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}