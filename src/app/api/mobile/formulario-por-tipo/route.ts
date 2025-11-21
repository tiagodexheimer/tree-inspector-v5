// src/app/api/mobile/formulario-por-tipo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo');

  if (!tipo) {
    return NextResponse.json({ message: "Tipo obrigatório" }, { status: 400 });
  }

  try {
    // Busca a definição dos campos cruzando Tipo -> Vínculo -> Formulário
    const query = `
      SELECT f.definicao_campos
      FROM demandas_tipos dt
      JOIN demandas_tipos_formularios dtf ON dt.id = dtf.id_tipo_demanda
      JOIN formularios f ON dtf.id_formulario = f.id
      WHERE dt.nome = $1
    `;
    
    const result = await db.query(query, [tipo]);

    if (result.rows.length === 0) {
      return NextResponse.json([], { status: 200 }); // Retorna array vazio se não tiver formulário
    }

    // Retorna o JSON dos campos diretamente
    return NextResponse.json(result.rows[0].definicao_campos, { status: 200 });

  } catch (error) {
    console.error("Erro ao buscar formulario mobile:", error);
    return NextResponse.json({ message: "Erro interno" }, { status: 500 });
  }
}