// src/app/api/demandas/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../lib/db";
import { DemandaType } from "../../../../types/demanda";

// Interface para o corpo da requisição PUT/PATCH
type UpdateDemandaBody = Partial<DemandaType & { prazo: string }>; // Permite campos opcionais e prazo como string

// Defina o tipo de contexto esperado (igual ao DELETE)
type ExpectedContext = { params: Promise<{ id: string }> };

// --- Handler para PUT (Atualizar Demanda) ---
export async function PUT(request: NextRequest, context: ExpectedContext) {
  const params = await context.params;
  const id = params.id;
  console.log(`[API] Recebido PUT em /api/demandas/${id}`);

  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    console.error("[API] Erro 400: ID inválido.");
    return NextResponse.json(
      { message: "ID da demanda inválido." },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as UpdateDemandaBody;
    console.log("[API] Body recebido para atualização:", body);

    // Extrai e valida os campos necessários (similar ao POST)
    const {
      nome_solicitante,
      telefone_solicitante,
      email_solicitante,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      tipo_demanda,
      descricao,
      prazo,
      coordinates, // <-- CAMPO ADICIONADO
    } = body as UpdateDemandaBody & { coordinates?: [number, number] | null }; // <-- TIPO ATUALIZADO

    // Validação Mínima (igual ao POST)
    if (!nome_solicitante || !cep || !numero || !tipo_demanda || !descricao) {
      console.log(
        "[API] Erro 400: Campos obrigatórios ausentes na atualização."
      );
      return NextResponse.json(
        {
          message:
            "Campos obrigatórios ausentes: Nome, CEP, Número, Tipo e Descrição.",
        },
        { status: 400 }
      );
    }
    if (!/^\d{5}-?\d{3}$/.test(cep)) {
      console.log("[API] Erro 400: Formato de CEP inválido na atualização.");
      return NextResponse.json(
        { message: "Formato de CEP inválido." },
        { status: 400 }
      );
    }

    // TODO: Geocodificar novamente SE os campos de endereço mudaram
    // (Pode ser mais complexo, por enquanto vamos pular ou assumir que não muda)
    // let coordinates: [number, number] | null = null;
    // ... lógica de geocodificação aqui ...
    // Por simplicidade, NÃO vamos atualizar geom neste exemplo inicial.
    // Para atualizar, você precisaria buscar a demanda atual, comparar endereços,
    // chamar a API de geocodificação se diferente, e incluir geom na query UPDATE.

    // Formata o prazo
    const prazoDate = prazo && prazo.trim() !== "" ? new Date(prazo) : null;
    const prazoValidoParaSQL =
      prazoDate instanceof Date && !isNaN(prazoDate.getTime())
        ? prazoDate
        : null;

    // Monta a Query SQL UPDATE
    const queryText = `
    UPDATE demandas SET
        nome_solicitante = $1,
        telefone_solicitante = $2,
        email_solicitante = $3,
        cep = $4,
        logradouro = $5,
        numero = $6,
        complemento = $7,
        bairro = $8,
        cidade = $9,
        uf = $10,
        tipo_demanda = $11,
        descricao = $12,
        prazo = $13,
        -- *** INÍCIO DA CORREÇÃO ***
        geom = ST_SetSRID(ST_MakePoint($15, $16), 4326)
        -- *** FIM DA CORREÇÃO ***
    WHERE id = $14
    RETURNING id, protocolo, nome_solicitante, status, created_at, updated_at, prazo, ST_AsGeoJSON(geom) as geom;
 `;
    // Parâmetros para a query UPDATE
    const queryParams = [
      nome_solicitante, // $1
      telefone_solicitante || null, // $2
      email_solicitante || null, // $3
      cep.replace(/\D/g, ""), // $4
      logradouro || null, // $5
      numero, // $6
      complemento || null, // $7
      bairro || null, // $8
      cidade || null, // $9
      uf ? uf.toUpperCase() : null, // $10
      tipo_demanda, // $11
      descricao, // $12
      prazoValidoParaSQL, // $13
      numericId, // $14 (ID para o WHERE)
      // *** INÍCIO DA CORREÇÃO ***
      // ST_MakePoint(Longitude, Latitude)
      coordinates ? coordinates[1] : null, // $15 (Longitude)
      coordinates ? coordinates[0] : null, // $16 (Latitude)
      // *** FIM DA CORREÇÃO ***
    ];

    console.log("[API] Executando query UPDATE:", queryText);
    // console.log('[API] Com parâmetros:', queryParams); // Cuidado ao logar dados sensíveis

    // Executa a Query
    const result = await pool.query(queryText, queryParams);

    if (result.rowCount === 0) {
      console.warn(
        `[API] Demanda com ID ${numericId} não encontrada para atualização.`
      );
      return NextResponse.json(
        { message: `Demanda com ID ${numericId} não encontrada.` },
        { status: 404 }
      );
    }

    // Prepara e Envia a Resposta
    const updatedDemanda = result.rows[0];
    if (updatedDemanda.geom) {
      updatedDemanda.geom = JSON.parse(updatedDemanda.geom);
    }
    if (updatedDemanda.prazo) {
      updatedDemanda.prazo = new Date(updatedDemanda.prazo);
    }
    // updated_at é atualizado automaticamente pelo banco (se configurado com trigger ou default)

    console.log("[API] Demanda atualizada com sucesso:", updatedDemanda);
    return NextResponse.json(
      {
        message: "Demanda atualizada com sucesso!",
        demanda: updatedDemanda,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[API] Erro ao atualizar demanda ${id}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    // Poderia adicionar tratamento específico para erros de constraint, etc.
    return NextResponse.json(
      {
        message: `Erro interno ao atualizar demanda ${id}.`,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  // Use o tipo esperado pelo erro
  context: ExpectedContext
) {
  // Como params é uma Promise, precisamos usar await
  const params = await context.params;
  const id = params.id;
  console.log(`[API] Recebido DELETE em /api/demandas/${id}`);

  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    console.error("[API] Erro 400: ID inválido.");
    return NextResponse.json(
      { message: "ID da demanda inválido." },
      { status: 400 }
    );
  }

  try {
    const queryText = "DELETE FROM demandas WHERE id = $1 RETURNING id";
    const queryParams = [numericId];

    console.log("[API] Executando query:", queryText, queryParams);
    const result = await pool.query(queryText, queryParams);

    if (result.rowCount === 0) {
      console.warn(
        `[API] Demanda com ID ${numericId} não encontrada para deleção.`
      );
      return NextResponse.json(
        { message: `Demanda com ID ${numericId} não encontrada.` },
        { status: 404 }
      );
    }

    console.log(`[API] Demanda com ID ${numericId} deletada com sucesso.`);
    return NextResponse.json(
      { message: `Demanda ${numericId} deletada com sucesso.` },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[API] Erro ao deletar demanda ${numericId}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      {
        message: `Erro interno ao deletar demanda ${numericId}.`,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
