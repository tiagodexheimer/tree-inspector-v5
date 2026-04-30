import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demandasService } from "@/services/demandas-service";
import { StatusRepository } from "@/repositories/status-repository"; // [NOVO] Importante para buscar ID pelo nome
import { getToken } from "next-auth/jwt"; // [NOVO] Para autenticação do Android

type ExpectedContext = { params: Promise<{ id: string }> };

// [HELPER] Garante autenticação tanto para Web (Cookie) quanto Mobile (Token)
async function ensureAuth(req: NextRequest) {
  const session = await auth();
  if (session?.user) return true;

  // Fallback para Mobile: Tenta ler o token manualmente
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req, secret, salt: "authjs.session-token" }) ||
    await getToken({ req, secret, salt: "next-auth.session-token" });
  return !!token;
}

// --- MÉTODO 1: PATCH (Mantido para compatibilidade com Web) ---
// Espera: { "id_status": 123 }
export async function PATCH(request: NextRequest, context: ExpectedContext) {
  const isAuthorized = await ensureAuth(request);
  if (!isAuthorized) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ message: "ID da demanda inválido." }, { status: 400 });
    }

    const body = await request.json();
    const { id_status } = body;

    if (typeof id_status !== 'number') {
      return NextResponse.json({ message: "ID do status inválido ou ausente." }, { status: 400 });
    }

    const session = await auth();
    const organizationId = parseInt((session?.user as any)?.organizationId || "0", 10);

    await demandasService.updateDemandaStatus(id, id_status, organizationId);

    return NextResponse.json({
      message: "Status atualizado com sucesso!"
    }, { status: 200 });

  } catch (error) {
    console.error("[API PATCH] Erro:", error);
    return handleError(error);
  }
}

// --- MÉTODO 2: PUT (Novo para o Android App) ---
// Espera: { "status": "Em Rota" } (Nome por extenso)
export async function PUT(request: NextRequest, context: ExpectedContext) {
  const isAuthorized = await ensureAuth(request);
  if (!isAuthorized) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ message: "ID inválido." }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body; // Android envia string: "Em Rota"

    if (!status || typeof status !== 'string') {
      return NextResponse.json({ message: "Nome do status inválido." }, { status: 400 });
    }

    // 1. Identifica a Organização
    const session = await auth();
    const organizationId = parseInt((session?.user as any)?.organizationId || "0", 10);

    // 2. Busca o ID do status pelo nome (Ex: "Em Rota" -> ID 2)
    let statusObj = await StatusRepository.findByName(status, organizationId);
    
    // Fallback: Se não encontrou pelo nome exato, tenta ignorar case/acentos se o repo suportar
    // Ou tenta mapeamentos comuns
    if (!statusObj) {
        const normalized = status.toLowerCase();
        if (normalized.includes("concluido") || normalized.includes("concluida")) {
            statusObj = await StatusRepository.findByName("Concluído", organizationId);
        }
    }

    if (!statusObj) {
      return NextResponse.json({ message: `Status '${status}' não encontrado no sistema.` }, { status: 404 });
    }

    // 3. Atualiza usando o ID encontrado
    await demandasService.updateDemandaStatus(id, statusObj.id, organizationId);

    return NextResponse.json({ message: "Status atualizado com sucesso!" }, { status: 200 });

  } catch (error) {
    console.error("[API PUT] Erro:", error);
    return handleError(error);
  }
}

// Helper de erro simples para evitar repetição
function handleError(error: unknown) {
  let status = 500;
  let message = "Erro interno ao atualizar status.";

  if (error instanceof Error) {
    message = error.message;
    if (message.includes("não encontrado")) status = 404;
  }
  return NextResponse.json({ message, error: message }, { status });
}