// src/app/api/demandas/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demandasService } from "@/services/demandas-service";
// [FIX] Importar UserRole
import { UserRole } from "@/types/auth-types";

export const dynamic = 'force-dynamic';

// --- Helper de Contexto de Segurança ---
async function getAuthContext(session: any) {
  if (!session || !session.user) {
    throw new Error("Não autenticado");
  }

  const organizationId = parseInt((session.user as any).organizationId || "0", 10);
  // [CORREÇÃO] A role do usuário é o novo tipo de plano (free, basic, pro, etc.)
  const userRole = (session.user as any).role as UserRole; // Agora UserRole está definido

  // Validação explícita de organização (necessário para NOT NULL)
  if (isNaN(organizationId) || organizationId === 0) {
    throw new Error("Sessão inválida: ID da organização ausente.");
  }
  return { organizationId, userRole };
}

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

  // Helper para processar arrays de forma robusta
  const parseArray = (key: string) => {
    const fromGet = searchParams.get(key);
    const fromGetAll = searchParams.getAll(key);
    const combined = [
      ...(fromGet ? fromGet.split(',').filter(Boolean) : []),
      ...fromGetAll.filter(Boolean)
    ];
    // Remove duplicatas e retorna undefined se vazio
    return combined.length > 0 ? Array.from(new Set(combined)) : undefined;
  };

  const statusIdsRaw = parseArray("statusIds") || parseArray("status");
  const statusIds = statusIdsRaw?.map(Number).filter(n => !isNaN(n));

  const tipoNomes = parseArray("tipoNomes") || parseArray("tipo");
  const bairros = parseArray("bairros") || parseArray("bairro");
  const notificacoesVencidas = searchParams.get("notificacoesVencidas") === 'true'; // [NOVO]

  try {
    const result = await demandasService.listDemandas(
      {
        page,
        limit,
        filtro,
        statusIds,
        tipoNomes,
        bairros,
        organizationId,
        notificacoesVencidas, // [NOVO]
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
  // [CORREÇÃO] A role do usuário é o novo tipo de plano (free, basic, pro, etc.)
  const userRole = (session.user as any).role as UserRole;

  // Validação explícita de organização (necessário para NOT NULL)
  if (isNaN(organizationId) || organizationId === 0) {
    return NextResponse.json({ message: "Sessão inválida: ID da organização ausente." }, { status: 401 });
  }

  try {
    const body = await request.json();

    // [CORREÇÃO] Chamada ao service com organizationId e userRole como argumentos separados
    const novaDemanda = await demandasService.createDemanda(
      body, // DTO sem organizationId/planType
      organizationId,
      userRole
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
      // Garante que a nova mensagem de limite do service seja capturada
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