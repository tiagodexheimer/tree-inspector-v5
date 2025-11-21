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

      // 2. Atualizar o status da demanda para "Concluído"
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
      throw error; // Re-lança para ser tratado no catch externo
    } finally {
      client.release();
    }

  } catch (error: any) { // 'any' para acessar propriedades do erro do Postgres
    console.error("[API Mobile] Erro ao salvar vistoria:", error);

    // --- CORREÇÃO ADICIONADA AQUI ---
    // Código 23503 = Violação de chave estrangeira (foreign_key_violation)
    // Significa que o 'demanda_id' enviado não existe na tabela 'demandas'
    if (error.code === '23503') {
        return NextResponse.json(
            { message: "Demanda não encontrada ou já excluída no servidor." }, 
            { status: 404 } // O Android vai ler este 404 e apagar a vistoria da fila
        );
    }
    // --------------------------------

    return NextResponse.json({ message: "Erro interno ao salvar vistoria." }, { status: 500 });
  }
}