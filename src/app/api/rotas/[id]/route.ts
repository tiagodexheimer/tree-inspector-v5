import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { rotasService } from "@/services/rotas-service";
import { getToken } from "next-auth/jwt"; 

type ExpectedContext = { params: Promise<{ id: string }> };

// Helper de Auth Robusto (Com Logs de Diagnóstico) - Mantido inalterado
async function checkAuth(req: NextRequest) {
  // LOG 1: Verificamos o que está chegando
  console.log(`[API Auth] Verificando acesso a: ${req.nextUrl.pathname}`);
  const cookieNames = req.cookies.getAll().map(c => c.name).join(', ');
  console.log(`[API Auth] Cookies recebidos: [${cookieNames}]`);

  // 1. Tentativa Padrão (Sessão do NextAuth)
  const session = await auth();
  if (session?.user) {
    console.log("[API Auth] Sucesso via auth() padrão.");
    return { authorized: true, session, response: null };
  }

  // 2. Fallback: Leitura manual do Token (Para Android/Emuladores)
  console.log("[API Auth] auth() falhou. Tentando leitura direta do token (getToken)...");
  
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  
  // Tenta encontrar o token com nomes variados (V4, V5, Seguro ou Inseguro)
  const token = await getToken({ req, secret, salt: "authjs.session-token" }) ||
                await getToken({ req, secret, salt: "next-auth.session-token" }) || 
                await getToken({ req, secret, salt: "__Secure-authjs.session-token" }) ||
                await getToken({ req, secret, salt: "__Secure-next-auth.session-token" });

  if (token) {
    console.log("[API Auth] Sucesso via getToken! Usuário: " + token.email);
    // Cria uma sessão "fake" baseada no token para o resto do código usar
    return { authorized: true, session: { user: token }, response: null };
  }

  console.log("[API Auth] Falha: Nenhum token válido encontrado.");
  return { 
      authorized: false, 
      response: NextResponse.json({ message: "Não autenticado (Token não encontrado ou inválido)" }, { status: 401 }) 
  };
}

// --- GET: Detalhes da Rota (CORRIGIDO) ---
export async function GET(request: NextRequest, context: ExpectedContext) {
  const authCheck = await checkAuth(request); 
  if (!authCheck.authorized) return authCheck.response!;

  // Extrai organizationId
  const user = authCheck.session!.user as any;
  const organizationId = Number(user.organizationId);
  if (isNaN(organizationId) || organizationId <= 0) {
      return NextResponse.json({ message: "Organização não definida para o usuário." }, { status: 403 });
  }

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

    // ✅ CORREÇÃO: Passa organizationId como o segundo argumento
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

// --- PUT: Atualizar Rota (CORRIGIDO) ---
export async function PUT(request: NextRequest, context: ExpectedContext) {
  const authCheck = await checkAuth(request);
  if (!authCheck.authorized) return authCheck.response!;
  
  // Extrai organizationId
  const user = authCheck.session!.user as any;
  const organizationId = Number(user.organizationId);
  if (isNaN(organizationId) || organizationId <= 0) {
      return NextResponse.json({ message: "Organização não definida para o usuário." }, { status: 403 });
  }

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

    const body = await request.json();
    const { nome, responsavel, status, data_rota } = body;

    // ✅ CORREÇÃO: Passa organizationId como o segundo argumento
    const updatedRota = await rotasService.updateRota(id, organizationId, {
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

// --- DELETE: Deletar Rota (CORRIGIDO) ---
export async function DELETE(request: NextRequest, context: ExpectedContext) {
  const authCheck = await checkAuth(request);
  if (!authCheck.authorized) return authCheck.response!;

  // Extrai organizationId
  const user = authCheck.session!.user as any;
  const organizationId = Number(user.organizationId);
  if (isNaN(organizationId) || organizationId <= 0) {
      return NextResponse.json({ message: "Organização não definida para o usuário." }, { status: 403 });
  }
  
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

    // ✅ CORREÇÃO: Passa organizationId como o segundo argumento
    await rotasService.deleteRota(id, organizationId);

    return NextResponse.json({ message: "Rota deletada com sucesso." }, { status: 200 });

  } catch (error) {
    console.error("[API DELETE Rota] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const status = message === "Rota não encontrada para exclusão." ? 404 : 500;
    return NextResponse.json({ message, error: message }, { status });
  }
}