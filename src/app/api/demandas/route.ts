import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demandasService } from "@/services/demandas-service";

// --- GET: LISTAR DEMANDAS ---
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  // [CORREÇÃO] Extrai o ID da organização da sessão (adicionado no auth.ts)
  // Usamos um cast para garantir, ou fallback para evitar crash imediato
  const organizationId = parseInt((session.user as any).organizationId, 10);
  const userRole = session.user.role;

  // Validação de Segurança
  if (!organizationId || isNaN(organizationId)) {
    console.error("[API GET Demandas] Erro: organizationId inválido na sessão.");
    return NextResponse.json(
      { message: "Sessão inválida. Faça login novamente." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const filtro = searchParams.get("filtro") || undefined;

  // Processa array de status (ex: ?status=1,2,3 ou ?status=1&status=2)
  // O nextjs/searchParams pode vir como string separada por virgula ou multiplas chaves
  // Aqui tratamos se vier separado por vírgula manualmente ou usamos getAll se for multiplas chaves
  let statusIds: number[] | undefined;
  const statusParam = searchParams.get("statusIds") || searchParams.get("status");
  if (statusParam) {
      statusIds = statusParam.split(",").map(Number).filter(n => !isNaN(n));
  } else {
      // Tenta pegar multiplos parametros ?status=1&status=2
      const statusAll = searchParams.getAll("status");
      if (statusAll.length > 0) {
          statusIds = statusAll.map(Number).filter(n => !isNaN(n));
      }
  }

  // Processa array de tipos
  let tipoNomes: string[] | undefined;
  const tipoParam = searchParams.get("tipoNomes") || searchParams.get("tipo");
  if (tipoParam) {
      tipoNomes = tipoParam.split(",").filter(Boolean);
  } else {
      const tiposAll = searchParams.getAll("tipo");
      if (tiposAll.length > 0) tipoNomes = tiposAll;
  }

  try {
    const result = await demandasService.listDemandas(
      {
        page,
        limit,
        filtro,
        statusIds,
        tipoNomes,
        organizationId, // [CRÍTICO] Passa para o service para filtrar no repositório
      },
      userRole,
      organizationId
    );

    return NextResponse.json(
      {
        demandas: result.demandas,
        totalCount: result.totalCount,
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API GET Demandas]", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { message: "Erro ao buscar demandas", error: message },
      { status: 500 }
    );
  }
}

// --- POST: CRIAR DEMANDA ---
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  // [CORREÇÃO] Recupera dados vitais para o controle de limites
  const organizationId = parseInt((session.user as any).organizationId, 10);
  const planType = (session.user as any).planType || "Free";

  if (!organizationId || isNaN(organizationId)) {
    return NextResponse.json(
      { message: "Sessão inválida. Organização não encontrada." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Chama o serviço passando o objeto único conforme definido no `CreateDemandaInput`
    const novaDemanda = await demandasService.createDemanda({
      ...body, // Espalha nome, cep, etc.
      organizationId, // [CRÍTICO] Vincula à organização
      planType,       // [CRÍTICO] Passa para validação de limites (Free vs Pro)
    });

    return NextResponse.json(
      {
        message: "Demanda registrada com sucesso!",
        protocolo: novaDemanda.protocolo,
        demanda: novaDemanda,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API POST Demanda]", error);

    let status = 500;
    let message = "Erro interno ao criar demanda.";

    if (error instanceof Error) {
      message = error.message;

      // Erros de validação e regras de negócio
      if (
        message.includes("obrigatórios") ||
        message.includes("Limite de") // Tratamento específico para o erro de limite
      ) {
        status = 400;
      }

      // Erro de constraint do banco (ex: protocolo duplicado, embora usemos sequence)
      if ((error as any).code === "23505") {
        status = 409;
        message = "Erro: Dados duplicados (possível protocolo repetido).";
      }
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}

// --- DELETE: DELETAR DEMANDAS EM LOTE ---
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  const organizationId = parseInt((session.user as any).organizationId, 10);
  const userRole = session.user.role;

  // Opcional: Apenas admins podem deletar em lote?
  // Ajuste conforme sua regra de negócio. Se usuários free podem deletar, remova este if.
  /*
  if (userRole !== "admin") {
    return NextResponse.json({ message: "Permissão negada." }, { status: 403 });
  }
  */

  if (!organizationId || isNaN(organizationId)) {
    return NextResponse.json(
      { message: "ID da Organização ausente ou inválido" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { ids } = body; // Espera: { "ids": [1, 2, 5] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: "Lista de IDs inválida." },
        { status: 400 }
      );
    }

    // Passa o organizationId para garantir que o usuário só delete o que é dele
    await demandasService.deleteDemandas(ids, organizationId);

    return NextResponse.json(
      { message: "Demandas deletadas com sucesso." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API DELETE Demandas]", error);

    let status = 500;
    let message = "Erro ao deletar demandas.";

    if (error instanceof Error) {
      message = error.message;
      // Erro de constraint (FK) se tentar deletar demanda em rota
      if (message.includes("vinculadas a rotas") || (error as any).code === "23503") {
        status = 409;
        message = "Não é possível excluir demandas que estão em rotas ativas.";
      }
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}