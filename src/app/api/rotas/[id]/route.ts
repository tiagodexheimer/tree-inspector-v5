import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { rotasService } from "@/services/rotas-service";
import { getToken } from "next-auth/jwt";

type ExpectedContext = { params: Promise<{ id: string }> };

async function checkAuth(req: NextRequest) {
  const session = await auth();
  if (session?.user) {
    return { authorized: true, session, response: null };
  }

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req, secret, salt: "authjs.session-token" }) ||
                await getToken({ req, secret, salt: "next-auth.session-token" }) || 
                await getToken({ req, secret, salt: "__Secure-authjs.session-token" });

  if (token) {
    return { authorized: true, session: { user: token }, response: null };
  }

  return { 
      authorized: false, 
      response: NextResponse.json({ message: "Não autenticado" }, { status: 401 }) 
  };
}

// --- GET: Detalhes da Rota ---
export async function GET(request: NextRequest, context: ExpectedContext) {
  const authCheck = await checkAuth(request); 
  if (!authCheck.authorized) return authCheck.response!;

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

    // [NOVO] Extrai organizationId da sessão
    const user = authCheck.session!.user as any;
    const organizationId = parseInt(user.organizationId, 10);

    if (!organizationId) {
        return NextResponse.json({ message: "Sessão inválida" }, { status: 403 });
    }

    const result = await rotasService.getRotaDetails(id, organizationId);

    if (!result) {
        return NextResponse.json({ message: "Rota não encontrada" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("[API GET Rota] Erro:", error);
    return NextResponse.json({ message: "Erro interno ao buscar rota." }, { status: 500 });
  }
}

// --- PUT: Atualizar Rota ---
export async function PUT(request: NextRequest, context: ExpectedContext) {
  const authCheck = await checkAuth(request);
  if (!authCheck.authorized) return authCheck.response!;

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

    const body = await request.json();
    const { nome, responsavel, status, data_rota } = body;

    // TODO: Adicionar verificação de organização no update também
    const updatedRota = await rotasService.updateRota(id, {
        nome,
        responsavel,
        status,
        data_rota: data_rota ? new Date(data_rota) : null
    });

    return NextResponse.json(updatedRota, { status: 200 });

  } catch (error) {
    console.error("[API PUT Rota] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const status = message === "Rota não encontrada para atualização." ? 404 : 500;
    return NextResponse.json({ message, error: message }, { status });
  }
}

// --- DELETE: Deletar Rota ---
export async function DELETE(request: NextRequest, context: ExpectedContext) {
  const authCheck = await checkAuth(request);
  if (!authCheck.authorized) return authCheck.response!;

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

    await rotasService.deleteRota(id);

    return NextResponse.json({ message: "Rota deletada com sucesso." }, { status: 200 });

  } catch (error) {
    console.error("[API DELETE Rota] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const status = message === "Rota não encontrada para exclusão." ? 404 : 500;
    return NextResponse.json({ message, error: message }, { status });
  }
}