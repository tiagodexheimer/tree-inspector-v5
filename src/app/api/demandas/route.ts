// src/app/api/demandas/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db"; // Ajuste o caminho se necessário
import { DemandaType } from "@/types/demanda";
// Import DemandaType se precisar validar a estrutura completa
// import { DemandaType } from '../../../types/demanda';

// --- Handler para GET (Listar Demandas - CORRIGIDO) ---
export async function GET() {
  console.log("[API /demandas] Recebido GET.");
  try {
    const result = await pool.query(
      `SELECT
              d.id, d.protocolo, d.nome_solicitante,
              d.cep, d.logradouro, d.numero, d.complemento, d.bairro, d.cidade, d.uf,
              d.tipo_demanda, d.descricao, d.prazo, d.created_at,
              d.id_status,  -- <<< ADICIONADO AQUI
              s.nome as status_nome, -- Opcional: Pega o nome do status diretamente
              s.cor as status_cor,   -- Opcional: Pega a cor diretamente
              ST_AsGeoJSON(d.geom) as geom
           FROM demandas d -- Alias 'd' para a tabela demandas
           LEFT JOIN demandas_status s ON d.id_status = s.id -- JOIN para buscar nome/cor do status
           ORDER BY d.created_at DESC` // Ordena pela data de criação da demanda
    );

    // Mapeia os resultados, convertendo tipos conforme necessário
    const demandas = result.rows.map((row) => ({
      ...row,
      prazo: row.prazo ? new Date(row.prazo) : null,
      geom: row.geom ? JSON.parse(row.geom) : null,
      // status_nome e status_cor já vêm prontos se você usou o JOIN
      // O campo 'status' original pode ser removido ou ignorado se não for mais usado
    }));

    return NextResponse.json(demandas, { status: 200 });
  } catch (error) {
    console.error("[API /demandas] Erro ao buscar demandas (GET):", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { message: "Erro interno ao buscar demandas", error: errorMessage },
      { status: 500 }
    );
  }
}

// --- Handler para POST (Criar Demanda - Mantido como antes) ---
export async function POST(request: NextRequest) {
  // ... (código do POST permanece o mesmo) ...
  console.log("[API /demandas] Recebido POST.");
  try {
    const body = (await request.json()) as Partial<
      DemandaType & { prazo: string }
    >;
    console.log("[API /demandas] Body recebido:", body);

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
    } = body as Partial<
      DemandaType & { prazo: string; coordinates?: [number, number] | null }
    >; // <-- TIPO ATUALIZADO

    // Validação Mínima (igual)
    if (!nome_solicitante || !cep || !numero || !tipo_demanda || !descricao) {
      console.log("[API /demandas] Erro 400: Campos obrigatórios ausentes.");
      return NextResponse.json(
        {
          message:
            "Campos obrigatórios ausentes: Nome, CEP, Número, Tipo e Descrição.",
        },
        { status: 400 }
      );
    }
    if (!/^\d{5}-?\d{3}$/.test(cep)) {
      console.log("[API /demandas] Erro 400: Formato de CEP inválido.");
      return NextResponse.json(
        { message: "Formato de CEP inválido." },
        { status: 400 }
      );
    }

    const protocolo = `DEM-${Date.now()}`;
    console.log(`[API /demandas] Protocolo gerado: ${protocolo}`);

    // Geocodificação (usando a função importada ou a lógica direta)

    // ... (lógica de geocodificação como antes) ...

    // Define o ID do status inicial (Ex: busca por 'Pendente')
    let initialStatusId: number | null = null;
    try {
      const statusResult = await pool.query(
        "SELECT id FROM demandas_status WHERE nome = $1 LIMIT 1",
        ["Pendente"]
      );
      if ((statusResult.rowCount ?? 0) > 0) {
        initialStatusId = statusResult.rows[0].id;
      } else {
        console.warn(
          '[API /demandas] Status "Pendente" não encontrado no banco. id_status será NULL.'
        );
      }
    } catch (statusError) {
      console.error(
        "[API /demandas] Erro ao buscar ID do status inicial:",
        statusError
      );
      // Decide se quer parar ou continuar com NULL
    }

    // Query SQL (Atualizada para usar id_status inicial)
    const queryText = `
          INSERT INTO demandas (
            protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
            cep, logradouro, numero, complemento, bairro, cidade, uf,
            tipo_demanda, descricao, id_status, geom, prazo -- Usa id_status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, ST_SetSRID(ST_MakePoint($15, $16), 4326), $17)
          RETURNING id, protocolo, nome_solicitante, id_status, created_at, prazo, ST_AsGeoJSON(geom) as geom; -- Retorna id_status
        `;

    const prazoDate = prazo && prazo.trim() !== "" ? new Date(prazo) : null;
    const prazoValidoParaSQL =
      prazoDate instanceof Date && !isNaN(prazoDate.getTime())
        ? prazoDate
        : null;

    const queryParams = [
      protocolo, // $1
      nome_solicitante, // $2
      telefone_solicitante || null, // $3
      email_solicitante || null, // $4
      cep.replace(/\D/g, ""), // $5
      logradouro || null, // $6
      numero, // $7
      complemento || null, // $8
      bairro || null, // $9
      cidade || null, // $10
      uf ? uf.toUpperCase() : null, // $11
      tipo_demanda, // $12
      descricao, // $13
      initialStatusId, // $14
      // *** INÍCIO DA CORREÇÃO ***
      // ST_MakePoint(Longitude, Latitude)
      // O modal armazena como [Latitude, Longitude]
      coordinates ? coordinates[1] : null, // $15 (Longitude)
      coordinates ? coordinates[0] : null, // $16 (Latitude)
      // *** FIM DA CORREÇÃO ***
      prazoValidoParaSQL, // $17
    ];

    const result = await pool.query(queryText, queryParams);

    if (result.rows.length === 0) {
      throw new Error("Falha ao inserir a demanda, nenhum registo retornado.");
    }

    const createdDemanda = result.rows[0];
    // ... (processamento da resposta como antes) ...
    if (createdDemanda.geom) {
      createdDemanda.geom = JSON.parse(createdDemanda.geom);
    }
    if (createdDemanda.prazo) {
      createdDemanda.prazo = new Date(createdDemanda.prazo);
    }

    // Opcional: Adicionar nome/cor do status à resposta se fez o JOIN no RETURNING ou busca separada
    if (createdDemanda.id_status) {
      const statusInfo = await pool.query(
        "SELECT nome, cor FROM demandas_status WHERE id = $1",
        [createdDemanda.id_status]
      );
      if ((statusInfo.rowCount ?? 0) > 0) {
        createdDemanda.status_nome = statusInfo.rows[0].nome;
        createdDemanda.status_cor = statusInfo.rows[0].cor;
      }
    }

    return NextResponse.json(
      {
        message: "Demanda registrada com sucesso!",
        protocolo: createdDemanda.protocolo,
        demanda: createdDemanda,
      },
      { status: 201 }
    );
  } catch (error) {
    // ... (tratamento de erro como antes) ...
    console.error(
      "[API /demandas] Erro detalhado ao criar demanda (POST):",
      error
    );
    let errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    let status = 500;
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "23505" &&
      error.message.includes("protocolo")
    ) {
      status = 409;
      errorMessage = "Erro: Protocolo já existe. Tente novamente.";
    }
    return NextResponse.json(
      {
        message: "Erro interno do servidor ao criar demanda.",
        error: errorMessage,
      },
      { status }
    );
  }
}
