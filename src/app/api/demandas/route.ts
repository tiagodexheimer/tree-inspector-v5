import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demandasService } from "@/services/demandas-service";

// O objeto de sessão, após a correção no @/auth.ts, deve incluir:
// session.user.orgId: number (ID da organização)
// session.user.role: string (papel do usuário, ex: 'free_user')

// --- GET: LISTAR DEMANDAS ---
export async function GET(request: NextRequest) {
  const session = await auth();

  // 1. Validação da Sessão e Extração do orgId
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  // ✅ CORREÇÃO: Extrai o ID da organização para usar no filtro SQL
  const { orgId, role: userRole } = session.user;

  // Validação Crítica de Tipagem e Existência
  if (typeof orgId !== 'number' || orgId === 0) {
      console.error("[API GET Demandas] Erro de Sessão: orgId inválido ou ausente.", { orgId, userRole });
      return NextResponse.json({ message: "ID da Organização ausente ou inválido. Tente fazer login novamente." }, { status: 400 });
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
    // 2. Chamada ao Serviço com o orgId NUMÉRICO
    const result = await demandasService.listDemandas(
      {
        page,
        limit,
        filtro,
        statusIds,
        tipoNomes,
      },
      orgId // Agora passa o NÚMERO, conforme o service espera
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
  if (!session || !session.user || typeof session.user.orgId !== 'number' || !session.user.planType) {
    return NextResponse.json({ message: "Sessão inválida ou organização não configurada. Tente fazer login novamente." }, { status: 401 });
  }
  
  const { orgId, planType } = session.user;

  try {
    const body = await request.json();

    // 2. [CRÍTICO] Delega para o serviço, passando organizationId e planType
    const novaDemanda = await demandasService.createDemanda(
        body, 
        orgId, // Usando o orgId extraído
        planType // Usando o planType extraído
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

  // ✅ Extração do orgId e role
  const { orgId, role: userRole } = session.user;
  
  // Opcional: Verificar se é admin
  if (userRole !== "admin") {
    return NextResponse.json({ message: "Permissão negada." }, { status: 403 });
  }
  
  // Validação de Tipagem
  if (typeof orgId !== 'number') {
     return NextResponse.json({ message: "ID da Organização ausente ou inválido" }, { status: 400 });
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

    // Chama o serviço para deletar (Passa o orgId para garantir exclusão segura)
    await demandasService.deleteDemandas(ids, orgId);

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
      // Se for o erro de rota vinculada, retorna 409 (Conflict)
      if (message.includes("vinculadas a rotas")) status = 409;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}