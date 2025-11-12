// src/app/api/demandas/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db"; // Ajuste o caminho se necessário
import { DemandaType } from "@/types/demanda";

// [NOVO] Importações do Auth.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route"; // Importa suas opções de autenticação

// --- Handler para GET (Listar Demandas - ATUALIZADO COM PAGINAÇÃO) ---
export async function GET(request: NextRequest) {
  console.log("[API /demandas] Recebido GET com paginação/limite.");

  // 1. Obter parâmetros da URL
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  let limit = parseInt(searchParams.get('limit') || '20', 10); // Limite padrão de 20
  
  // Calcula o offset, garantindo que não seja negativo
  const offset = Math.max(0, (page - 1) * limit); 

  // 2. Verificação de autenticação e papel
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }
  const userRole = session.user.role; 

  // 3. Aplica limite de free_user (sobrescreve o parâmetro se for o caso)
  if (userRole === 'free_user') {
    console.log("[API /demandas] Usuário 'free_user' detectado, limitando a 10 resultados (ignorando paginação).");
    limit = 10;
    // Offset é zero para o free user
  }

  try {
    // 4. Query Base (mesma para contagem e dados, apenas sem LIMIT/OFFSET)
    const baseQuery = `
           FROM demandas d 
           LEFT JOIN demandas_status s ON d.id_status = s.id
           ORDER BY d.created_at DESC
        `;

    // 5. Query 1: Contagem Total (para todos os usuários, exceto free_user)
    let totalCount = 0;
    if (userRole !== 'free_user') {
        const countResult = await pool.query(`SELECT COUNT(d.id) AS count ${baseQuery.replace('ORDER BY d.created_at DESC', '')}`);
        totalCount = parseInt(countResult.rows[0].count, 10);
    } else {
        // Para free_user, o total count é 10 ou o total real, o que for menor.
        // Vamos retornar o total real para simplificar o frontend.
        const countResult = await pool.query(`SELECT COUNT(d.id) AS count FROM demandas`);
        totalCount = parseInt(countResult.rows[0].count, 10);
    }


    // 6. Query 2: Dados Paginados
    // [FIX: prefer-const]: Alterado 'let' para 'const'
    const queryText = ` 
           SELECT
              d.id, d.protocolo, d.nome_solicitante,
              d.cep, d.logradouro, d.numero, d.complemento, d.bairro, d.cidade, d.uf,
              d.tipo_demanda, d.descricao, d.prazo, d.created_at, d.updated_at,
              d.id_status,
              s.nome as status_nome, 
              s.cor as status_cor,   
              ST_AsGeoJSON(d.geom) as geom, -- MANTIDO, mas ignorado no map para tipagem correta
              ST_Y(d.geom) as lat, ST_X(d.geom) as lng -- Incluir lat/lng para facilitar
           ${baseQuery}
           LIMIT $1 OFFSET $2
        `;
    
    // Parâmetros para LIMIT e OFFSET
    const queryParams: (string | number)[] = [limit, offset];

    // O free user tem um limite fixo, mas mantemos a paginação no backend para o futuro, 
    // mesmo que o frontend o limite a 10.
    if (userRole === 'free_user') {
        // Se for free_user, a query é: LIMIT 10 OFFSET 0
        queryParams[0] = 10;
        queryParams[1] = 0;
    }


    const result = await pool.query(queryText, queryParams);

    const demandas = result.rows.map((row) => ({
      ...row,
      prazo: row.prazo ? new Date(row.prazo) : null,
      // [CORREÇÃO ADICIONAL]: Removido JSON.parse(row.geom). O campo geom do objeto retornado 
      // do banco agora é apenas para compatibilidade de tipos no banco, mas não mais usado 
      // como objeto no frontend, que usa lat/lng.
      // row.geom é uma string GeoJSON que não precisa ser enviada como objeto.
      geom: row.geom ? row.geom : null, 
    }));

    // 7. Retorna os dados E a contagem total
    return NextResponse.json({
        demandas: demandas,
        totalCount: totalCount,
        limit: queryParams[0], // Retorna o limite aplicado
        page: page,
    }, { status: 200 });

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

// --- Handler para POST (Criar Demanda - ATUALIZADO COM AUTENTICAÇÃO) ---
export async function POST(request: NextRequest) {
    console.log("[API /demandas] Recebido POST.");
  
    // [NOVO] Verificação de autenticação
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      // Usuário precisa estar logado para criar uma demanda
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }
    // [FIM NOVO]
  
    try {
      const body = (await request.json()) as Partial<
        DemandaType & { prazo: string }
      >;
  
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
        coordinates,
      } = body as Partial<
        DemandaType & { prazo: string; coordinates?: [number, number] | null }
      >;
  
      // Validação Mínima (nome_solicitante não é mais obrigatório)
      if (!cep || !numero || !tipo_demanda || !descricao) {
        console.log("[API /demandas] Erro 400: Campos obrigatórios ausentes.");
        return NextResponse.json(
          {
            message:
              "Campos obrigatórios ausentes: CEP, Número, Tipo e Descrição.",
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
      const prazoValidoParaSQL =
        prazoDate instanceof Date && !isNaN(prazoDate.getTime())
          ? prazoDate
          : null;
  
      const queryParams = [
        protocolo, // $1
        nome_solicitante || "", // $2 (Envia "" se for null/undefined)
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
        coordinates ? coordinates[1] : null, // $15 (Longitude)
        coordinates ? coordinates[0] : null, // $16 (Latitude)
        prazoValidoParaSQL, // $17
      ];
  
      const result = await pool.query(queryText, queryParams);
  
      if (result.rows.length === 0) {
        throw new Error("Falha ao inserir a demanda, nenhum registo retornado.");
      }
  
      const createdDemanda = result.rows[0];
      // [CORREÇÃO ADICIONAL]: Mudamos o parse para usar o campo ST_Y/ST_X retornado do PUT/GET,
      // mas no POST a API ainda retorna o GeoJSON string. Mantemos o parse aqui por enquanto
      // para compatibilidade com o retorno anterior, mas se o frontend não precisa do objeto geom,
      // esta parte pode ser simplificada no futuro.
      if (createdDemanda.geom) {
        createdDemanda.geom = JSON.parse(createdDemanda.geom);
      }
      if (createdDemanda.prazo) {
        createdDemanda.prazo = new Date(createdDemanda.prazo);
      }
  
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
  
  // --- Handler para DELETE (Excluir Demandas - ATUALIZADO COM AUTORIZAÇÃO) ---
  export async function DELETE(request: NextRequest) {
    console.log("[API /demandas] Recebido DELETE para exclusão em massa.");
  
    // [NOVO] Verificação de autenticação e autorização
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }
    
    const userRole = session.user.role;
    if (userRole !== 'admin') {
       // Apenas administradores podem deletar
       return NextResponse.json({ message: "Não autorizado: Apenas administradores podem deletar demandas." }, { status: 403 });
    }
    // [FIM NOVO]
  
    const client = await pool.connect();
  
    try {
      const body = await request.json();
      const idsToDelete: number[] = body.ids;
  
      if (!idsToDelete || !Array.isArray(idsToDelete) || idsToDelete.length === 0) {
        return NextResponse.json({ message: "Nenhum ID fornecido para exclusão." }, { status: 400 });
      }
  
      // Validação para garantir que são números
      const numericIds = idsToDelete.filter(id => typeof id === 'number' && !isNaN(id));
      if (numericIds.length !== idsToDelete.length) {
        return NextResponse.json({ message: "Array de IDs contém valores inválidos." }, { status: 400 });
      }
  
      await client.query('BEGIN');
      
      // 1. Deletar da tabela 'rotas_demandas' primeiro para evitar erro de FK
      const deleteRotasQuery = 'DELETE FROM rotas_demandas WHERE demanda_id = ANY($1::int[])';
      await client.query(deleteRotasQuery, [numericIds]);
  
      // 2. Deletar da tabela principal 'demandas'
      const deleteDemandasQuery = 'DELETE FROM demandas WHERE id = ANY($1::int[]) RETURNING id';
      const result = await pool.query(deleteDemandasQuery, [numericIds]);
  
      await client.query('COMMIT');
  
      const deletedCount = result.rowCount || 0;
      if (deletedCount === 0) {
        console.warn("[API /demandas] Nenhuma demanda encontrada para os IDs fornecidos:", numericIds);
        return NextResponse.json({ message: "Nenhuma demanda encontrada para os IDs fornecidos." }, { status: 404 });
      }
  
      console.log(`[API /demandas] ${deletedCount} demandas deletadas com sucesso.`);
      return NextResponse.json(
        { message: `${deletedCount} demandas deletadas com sucesso.`, deletedIds: result.rows.map(r => r.id) },
        { status: 200 }
      );
  
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("[API /demandas] Erro na transação de exclusão em massa:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido.";
      
      // Checar erro de Foreign Key
      if (error instanceof Error && 'code' in error && error.code === '23503') {
         console.warn("[API /demandas] Tentativa de deletar demandas referenciadas em outras tabelas.");
         return NextResponse.json({ message: "Erro: Algumas demandas não puderam ser deletadas pois estão associadas a outros registros (ex: rotas não deletadas).", error: errorMessage }, { status: 409 });
      }
      
      return NextResponse.json({ message: "Erro interno ao deletar demandas.", error: errorMessage }, { status: 500 });
    } finally {
      client.release();
    }
  }