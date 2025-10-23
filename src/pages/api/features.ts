// pages/api/features.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db'; // Importa o pool de conexão
import { Feature } from '@/types/feature'; // Importa a interface (ajuste o caminho)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // --- Rota GET: Listar todas as features ---
  if (req.method === 'GET') {
    try {
      // Query para selecionar os dados. Usamos ST_AsGeoJSON para converter a geometria
      const result = await pool.query(
        'SELECT id, name, description, ST_AsGeoJSON(geom) as geom FROM features ORDER BY id'
      );

      // Ajusta a saída para que 'geom' seja um objeto JSON
      const features = result.rows.map(row => ({
          ...row,
          geom: JSON.parse(row.geom) // Converte a string GeoJSON em objeto
      }));

      res.status(200).json(features);
    } catch (error) {
      console.error('Erro ao buscar features:', error);
      res.status(500).json({ message: 'Erro interno do servidor ao buscar features', error: (error as Error).message });
    }
  }
  // --- Rota POST: Criar uma nova feature ---
  else if (req.method === 'POST') {
    try {
      const { name, description, geom } = req.body as Feature; // Pega os dados do corpo da requisição

      // Validação básica (adicione mais validações conforme necessário)
      if (!name || !geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates) || geom.coordinates.length !== 2) {
        return res.status(400).json({ message: 'Dados inválidos. Nome e geometria (Point GeoJSON) são obrigatórios.' });
      }

      // Query para inserir, usando ST_GeomFromGeoJSON e ST_SetSRID
      // SRID 4326 é o padrão para coordenadas geográficas (latitude/longitude)
      const queryText = `
        INSERT INTO features (name, description, geom)
        VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))
        RETURNING id, name, description, ST_AsGeoJSON(geom) as geom
      `;
      const queryParams = [name, description || null, JSON.stringify(geom)]; // Geom precisa ser uma string JSON

      const result = await pool.query(queryText, queryParams);

      // Ajusta a saída da feature criada
       const createdFeature = {
          ...result.rows[0],
          geom: JSON.parse(result.rows[0].geom)
       };

      res.status(201).json(createdFeature); // 201 Created

    } catch (error) {
      console.error('Erro ao criar feature:', error);
      res.status(500).json({ message: 'Erro interno do servidor ao criar feature', error: (error as Error).message });
    }
  }
  // --- Método não suportado ---
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}