// pages/api/demandas.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db'; // Verifique se este caminho está correto
import { DemandaType } from '@/types/demanda'; // Verifique se este caminho está correto

// --- Função Placeholder de Geocodificação ---
async function geocodeAddress(address: string): Promise<[number, number] | null> {
    console.log(`[API] Simulando geocodificação para: ${address}`); // Log para depuração
    // Coordenadas aproximadas de Esteio: [-51.1714, -29.8588] (Longitude, Latitude)
    if (address && address.length > 3) { // Simula sucesso apenas se endereço parecer válido
      // Adiciona um pequeno log para indicar sucesso na simulação
      console.log('[API] Geocodificação simulada com sucesso.');
      return [-51.1714, -29.8588];
    }
    // Adiciona um log para indicar falha na simulação
    console.log('[API] Geocodificação simulada falhou ou endereço inválido.');
    return null;
}
// ------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // --- Rota POST: Criar uma nova demanda ---
  if (req.method === 'POST') {
    // Log para confirmar recebimento da requisição
    console.log('[API] Recebido POST em /api/demandas. Body:', req.body);

    try {
      const {
        nome_solicitante,
        telefone_solicitante,
        email_solicitante,
        endereco,
        tipo_demanda,
        descricao,
      } = req.body as Partial<DemandaType>;

      // Validação Mínima (Melhorada)
      if (!nome_solicitante || !endereco || !tipo_demanda || !descricao) {
        console.error('[API] Erro 400: Campos obrigatórios ausentes.');
        return res.status(400).json({ message: 'Campos obrigatórios ausentes: nome, endereço, tipo e descrição.' });
      }

      // 1. Gerar Protocolo
      const protocolo = `DEM-${Date.now()}`;
      console.log(`[API] Protocolo gerado: ${protocolo}`);

      // 2. Geocodificar o Endereço
      const coordinates = await geocodeAddress(endereco);

      // 3. Montar a Query SQL (Verifique nomes das colunas com \d demandas no psql)
      const queryText = `
        INSERT INTO demandas (
          protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
          endereco, tipo_demanda, descricao, status, geom
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
          -- Usa ST_MakePoint diretamente se coordinates não for null
          CASE
            WHEN $9::float[] IS NOT NULL THEN ST_SetSRID(ST_MakePoint($9[1], $9[2]), 4326)
            ELSE NULL
          END
        )
        RETURNING id, protocolo, nome_solicitante, status, created_at, ST_AsGeoJSON(geom) as geom;
      `;

       const queryParams = [
           protocolo,
           nome_solicitante,
           telefone_solicitante || null,
           email_solicitante || null,
           endereco,
           tipo_demanda,
           descricao,
           'Pendente', // Status inicial
           coordinates // Passa o array [lon, lat] ou null diretamente
       ];

      console.log('[API] Executando query:', queryText);
      console.log('[API] Com parâmetros:', queryParams);

      // 4. Executar a Query
      const result = await pool.query(queryText, queryParams);

      console.log('[API] Query executada com sucesso. Resultado:', result.rows);


      if (result.rows.length === 0) {
          throw new Error('Falha ao inserir a demanda, nenhum registo retornado.');
      }

      // 5. Preparar e Enviar a Resposta
      const createdDemanda = result.rows[0];
      if (createdDemanda.geom) {
          createdDemanda.geom = JSON.parse(createdDemanda.geom);
      }

      console.log('[API] Demanda criada:', createdDemanda);
      res.status(201).json({
          message: 'Demanda registrada com sucesso!',
          protocolo: createdDemanda.protocolo,
          demanda: createdDemanda
      });

    } catch (error) {
      // Log detalhado do erro
      console.error('[API] Erro detalhado ao criar demanda:', error);
      // Mantém a verificação de erro UNIQUE
      if (error instanceof Error && 'code' in error && error.code === '23505') {
          if (error.message.includes('protocolo')) {
             return res.status(409).json({ message: 'Erro: Protocolo já existe. Tente novamente.', error: error.message });
          }
      }
      res.status(500).json({ message: 'Erro interno do servidor ao criar demanda.', error: (error instanceof Error ? error.message : String(error)) });
    }
  }
  // --- Outros Métodos ---
  else if (req.method === 'GET') {
       console.log('[API] Recebido GET em /api/demandas.');
       // (Implementação da listagem virá depois)
       try {
           const result = await pool.query('SELECT id, protocolo, nome_solicitante, endereco, tipo_demanda, status, created_at, ST_AsGeoJSON(geom) as geom FROM demandas ORDER BY created_at DESC');
           const demandas = result.rows.map(row => ({
               ...row,
               geom: row.geom ? JSON.parse(row.geom) : null // Trata geom nulo
           }));
           res.status(200).json(demandas);
       } catch (error) {
           console.error('[API] Erro ao buscar demandas (GET):', error);
           res.status(500).json({ message: 'Erro interno ao buscar demandas', error: (error instanceof Error ? error.message : String(error)) });
       }
  } else {
    console.log(`[API] Método ${req.method} não permitido para /api/demandas.`);
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}