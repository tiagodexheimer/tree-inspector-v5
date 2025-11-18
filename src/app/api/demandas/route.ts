// src/app/api/demandas/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db"; 
import { DemandaType } from "@/types/demanda";

// [CORREÇÃO v5] Importar 'auth' em vez de 'getServerSession/authOptions'
import { auth } from "@/auth";

// --- Handler para GET (Listar Demandas) ---
export async function GET(request: NextRequest) {
  console.log("[API /demandas] Recebido GET com paginação/limite.");

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  let limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = Math.max(0, (page - 1) * limit);

  // [CORREÇÃO v5] Usar auth()
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }
  // Nota: O TypeScript pode reclamar de 'role' se não estiver tipado no next-auth.d.ts,
  // mas funcionará em runtime se o callback da sessão estiver configurado.
  const userRole = session.user.role; 

  if (userRole === "free_user") {
    console.log("[API /demandas] Usuário 'free_user' detectado, limitando resultados.");
    limit = 10;
  }

  try {
    const baseQuery = `
           FROM demandas d 
           LEFT JOIN demandas_status s ON d.id_status = s.id
           ORDER BY d.created_at DESC
        `;

    let totalCount = 0;
    if (userRole !== "free_user") {
      const countResult = await pool.query(
        `SELECT COUNT(d.id) AS count ${baseQuery.replace("ORDER BY d.created_at DESC", "")}`
      );
      totalCount = parseInt(countResult.rows[0].count, 10);
    } else {
      const countResult = await pool.query(`SELECT COUNT(d.id) AS count FROM demandas d`);
      totalCount = parseInt(countResult.rows[0].count, 10);
    }

    const queryText = ` 
           SELECT
              d.id, d.protocolo, d.nome_solicitante,
              d.cep, d.logradouro, d.numero, d.complemento, d.bairro, d.cidade, d.uf,
              d.tipo_demanda, d.descricao, d.prazo, d.created_at, d.updated_at,
              d.id_status,
              s.nome as status_nome, 
              s.cor as status_cor,   
              ST_AsGeoJSON(d.geom) as geom,
              ST_Y(d.geom) as lat, ST_X(d.geom) as lng
           ${baseQuery}
           LIMIT $1 OFFSET $2
        `;

    const queryParams: (string | number)[] = [limit, offset];

    if (userRole === "free_user") {
      queryParams[0] = 10;
      queryParams[1] = 0;
    }

    const result = await pool.query(queryText, queryParams);

    const demandas = result.rows.map((row) => ({
      ...row,
      prazo: row.prazo ? new Date(row.prazo) : null,
      geom: row.geom ? row.geom : null,
    }));

    return NextResponse.json(
      {
        demandas: demandas,
        totalCount: totalCount,
        limit: queryParams[0],
        page: page,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /demandas] Erro ao buscar demandas (GET):", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { message: "Erro interno ao buscar demandas", error: errorMessage },
      { status: 500 }
    );
  }
}

// --- Handler para POST (Criar Demanda) ---
export async function POST(request: NextRequest) {
  console.log("[API /demandas] Recebido POST.");

  // [CORREÇÃO v5] Usar auth()
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<DemandaType & { prazo: string }>;

    const {
      nome_solicitante, telefone_solicitante, email_solicitante, cep,
      logradouro, numero, complemento, bairro, cidade, uf,
      tipo_demanda, descricao, prazo, coordinates,
    } = body as Partial<DemandaType & { prazo: string; coordinates?: [number, number] | null }>;

    if (!cep || !numero || !tipo_demanda || !descricao) {
      return NextResponse.json({ message: "Campos obrigatórios ausentes." }, { status: 400 });
    }

    const protocolo = `DEM-${Date.now()}`;
    let initialStatusId: number | null = null;

    try {
      const statusResult = await pool.query("SELECT id FROM demandas_status WHERE nome = $1 LIMIT 1", ["Pendente"]);
      if ((statusResult.rowCount ?? 0) > 0) {
        initialStatusId = statusResult.rows[0].id;
      }
    } catch (statusError) {
      console.error("[API /demandas] Erro status:", statusError);
    }

    const queryText = `
            INSERT INTO demandas (
              protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
              cep, logradouro, numero, complemento, bairro, cidade, uf,
              tipo_demanda, descricao, id_status, geom, prazo
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, ST_SetSRID(ST_MakePoint($15, $16), 4326), $17)
            RETURNING id, protocolo, nome_solicitante, id_status, created_at, prazo, ST_AsGeoJSON(geom) as geom;
          `;

    const prazoDate = prazo && prazo.trim() !== "" ? new Date(prazo) : null;
    
    const queryParams = [
      protocolo,
      nome_solicitante || "",
      telefone_solicitante || null,
      email_solicitante || null,
      cep.replace(/\D/g, ""),
      logradouro || null,
      numero,
      complemento || null,
      bairro || null,
      cidade || null,
      uf ? uf.toUpperCase() : null,
      tipo_demanda,
      descricao,
      initialStatusId,
      coordinates ? coordinates[1] : null, // Longitude
      coordinates ? coordinates[0] : null, // Latitude
      prazoDate,
    ];

    const result = await pool.query(queryText, queryParams);
    const createdDemanda = result.rows[0];

    return NextResponse.json(
      {
        message: "Demanda registrada com sucesso!",
        protocolo: createdDemanda.protocolo,
        demanda: createdDemanda,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API /demandas] Erro POST:", error);
    let errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    let status = 500;
    if (error instanceof Error && 'code' in error && error.code === "23505") {
        status = 409;
        errorMessage = "Erro: Protocolo já existe.";
    }
    return NextResponse.json({ message: "Erro interno.", error: errorMessage }, { status });
  }
}

// --- Handler para DELETE (Excluir Demandas) ---
export async function DELETE(request: NextRequest) {
  console.log("[API /demandas] Recebido DELETE.");

  // [CORREÇÃO v5] Usar auth()
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ message: "Não autorizado: Apenas admins." }, { status: 403 });
  }

  const client = await pool.connect();

  try {
    const body = await request.json();
    const idsToDelete: number[] = body.ids;

    if (!idsToDelete || !Array.isArray(idsToDelete) || idsToDelete.length === 0) {
      return NextResponse.json({ message: "Nenhum ID fornecido." }, { status: 400 });
    }

    const numericIds = idsToDelete.filter((id) => typeof id === "number" && !isNaN(id));

    await client.query("BEGIN");
    const deleteRotasQuery = "DELETE FROM rotas_demandas WHERE demanda_id = ANY($1::int[])";
    await client.query(deleteRotasQuery, [numericIds]);

    const deleteDemandasQuery = "DELETE FROM demandas WHERE id = ANY($1::int[]) RETURNING id";
    const result = await pool.query(deleteDemandasQuery, [numericIds]);
    await client.query("COMMIT");

    return NextResponse.json(
      { message: `${result.rowCount} demandas deletadas.`, deletedIds: result.rows.map((r) => r.id) },
      { status: 200 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[API /demandas] Erro DELETE:", error);
    return NextResponse.json({ message: "Erro interno.", error: String(error) }, { status: 500 });
  } finally {
    client.release();
  }
}