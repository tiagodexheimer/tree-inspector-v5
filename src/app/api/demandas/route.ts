import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demandasService } from "@/services/demandas-service";

// [IMPORTANTE] Força a rota a ser dinâmica para evitar erros de validação estática
export const dynamic = 'force-dynamic';

// --- GET: LISTAR DEMANDAS ---
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  // Cast seguro para evitar erro se organizationId não existir no tipo
  const organizationId = parseInt((session.user as any).organizationId || "0", 10);
  const userRole = session.user.role;

  // Validação
  if (isNaN(organizationId) || organizationId === 0) {
     // Em dev, pode não ter orgId, então apenas logamos e seguimos (ou bloqueamos se for crítico)
     // console.warn("[API] Sem organizationId na sessão.");
  }

  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const filtro = searchParams.get("filtro") || undefined;

  // Processa array de status
  let statusIds: number[] | undefined;
  const statusParam = searchParams.get("statusIds") || searchParams.get("status");
  if (statusParam) {
      statusIds = statusParam.split(",").map(Number).filter(n => !isNaN(n));
  } else {
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
        organizationId, 
      },
      userRole,
      organizationId // Agora isso bate com o tipo 'number' do service
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

  const organizationId = parseInt((session.user as any).organizationId || "0", 10);
  const planType = (session.user as any).planType || "Free";

  try {
    const body = await request.json();

    const novaDemanda = await demandasService.createDemanda({
      ...body, 
      organizationId, 
      planType,        
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
      if (message.includes("obrigatórios") || message.includes("Limite de")) {
        status = 400;
      }
      if ((error as any).code === "23505") {
        status = 409;
        message = "Erro: Dados duplicados.";
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

  const organizationId = parseInt((session.user as any).organizationId || "0", 10);

  try {
    const body = await request.json();
    const { ids } = body; 

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "Lista de IDs inválida." }, { status: 400 });
    }

    // Agora o deleteDemandas aceita organizationId como segundo argumento
    await demandasService.deleteDemandas(ids, organizationId);

    return NextResponse.json({ message: "Demandas deletadas com sucesso." }, { status: 200 });
  } catch (error) {
    console.error("[API DELETE Demandas]", error);

    let status = 500;
    let message = "Erro ao deletar demandas.";

    if (error instanceof Error) {
      message = error.message;
      if (message.includes("vinculadas a rotas") || (error as any).code === "23503") {
        status = 409;
        message = "Não é possível excluir demandas que estão em rotas ativas.";
      }
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}