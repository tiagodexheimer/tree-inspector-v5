import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demandasService } from "@/services/demandas-service";

// --- GET: LISTAR DEMANDAS ---
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Extração de Parâmetros
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const filtro = searchParams.get("filtro") || undefined;

  // Filtros de Array (Status e Tipos)
  const statusIdsRaw = searchParams.get("statusIds");
  const statusIds = statusIdsRaw
    ? statusIdsRaw
        .split(",")
        .map(Number)
        .filter((n) => !isNaN(n))
    : undefined;

  const tipoNomesRaw = searchParams.get("tipoNomes");
  const tipoNomes = tipoNomesRaw
    ? tipoNomesRaw.split(",").filter(Boolean)
    : undefined;

  try {
    const result = await demandasService.listDemandas(
      {
        page,
        limit,
        filtro,
        statusIds,
        tipoNomes,
      },
      session.user.role
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
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { message: "Erro ao buscar demandas", error: message },
      { status: 500 }
    );
  }
}

// --- POST: CRIAR DEMANDA ---
export async function POST(request: NextRequest) {
  const session = await auth();
  
  // 1. [CRÍTICO] Verifica se o usuário e o orgId/planType estão na sessão
  // Nota: A verificação de typeof 'number' é importante, pois o ID não pode ser NULL/undefined
  if (!session || !session.user || typeof session.user.orgId !== 'number' || !session.user.planType) {
    return NextResponse.json({ message: "Sessão inválida ou organização não configurada. Tente fazer login novamente." }, { status: 401 });
  }

  try {
    const body = await request.json();

    // 2. [CRÍTICO] Delega para o serviço, passando organizationId e planType
    const novaDemanda = await demandasService.createDemanda(
        body, 
        session.user.orgId, 
        session.user.planType
    );

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
      if (message.includes("obrigatórios") || message.includes("Limite")) status = 400; // Limites de Plano
      if ((error as any).code === "23505") {
        status = 409;
        message = "Erro: Protocolo duplicado.";
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

  // Opcional: Verificar se é admin
  if (session.user.role !== "admin") {
    return NextResponse.json({ message: "Permissão negada." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { ids } = body; // Espera um JSON: { "ids": [1, 2, 5] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: "Lista de IDs inválida." },
        { status: 400 }
      );
    }

    // Chama o serviço para deletar (Certifique-se de ter criado este método no Service)
    await demandasService.deleteDemandas(ids);

    return NextResponse.json(
      { message: "Demandas deletadas com sucesso." },
      { status: 200 }
    );

    // Em src/app/api/demandas/route.ts -> DELETE
  } catch (error) {
    console.error("[API DELETE Demandas]", error);

    let status = 500;
    let message = "Erro ao deletar demandas.";

    if (error instanceof Error) {
      message = error.message;
      // Se for o erro de rota vinculada, retorna 409 (Conflict)
      if (message.includes("vinculadas a rotas")) status = 409;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}
