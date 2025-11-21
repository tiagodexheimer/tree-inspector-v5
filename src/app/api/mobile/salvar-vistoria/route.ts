// src/app/api/mobile/salvar-vistoria/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { demandaId, respostas } = body;

    if (!demandaId || !respostas) {
      return NextResponse.json({ message: "Dados incompletos." }, { status: 400 });
    }

    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Salvar o JSON das respostas
      // O PostgreSQL converte automaticamente o objeto JS para JSONB
      const insertQuery = `
        INSERT INTO vistorias_realizadas (demanda_id, respostas)
        VALUES ($1, $2)
        ON CONFLICT (demanda_id) 
        DO UPDATE SET respostas = $2, data_realizacao = NOW();
      `;
      await client.query(insertQuery, [demandaId, JSON.stringify(respostas)]);

      // 2. Atualizar o status da demanda para "Concluído" (ID 3 no seu seed, ajuste se necessário)
      // Buscamos o ID do status 'Concluído' dinamicamente para evitar erros
      const updateStatusQuery = `
        UPDATE demandas 
        SET id_status = (SELECT id FROM demandas_status WHERE nome = 'Concluído' LIMIT 1),
            updated_at = NOW()
        WHERE id = $1
      `;
      await client.query(updateStatusQuery, [demandaId]);

      await client.query('COMMIT');

      return NextResponse.json({ message: "Vistoria salva com sucesso!" }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("[API Mobile] Erro ao salvar vistoria:", error);
    return NextResponse.json({ message: "Erro interno ao salvar vistoria." }, { status: 500 });
  }
}