// src/app/api/test/cleanup/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CleanupService } from "@/services/cleanup-service";
import db from "@/lib/db"; 

export async function POST(request: Request) {
  let organizationId: number | undefined;

  // Tenta ler o JSON com segurança
  const body = await request.json().catch(() => ({}));
  const testSecret = request.headers.get("x-test-bypass");
  const EXPECTED_SECRET = process.env.TEST_SECRET || "dev-bypass-secret-123";

  // --- LÓGICA DE DECISÃO ---

  // 1. Caminho de BYPASS (TESTES E2E)
  if (testSecret === EXPECTED_SECRET) {
    if (!body.email) {
      return NextResponse.json({ message: "Email obrigatório para bypass." }, { status: 400 });
    }
    
    // Busca real no banco de dados
    const user = await db.query(
        'SELECT "orgId" FROM "users" WHERE "email" = $1 LIMIT 1', 
        [body.email]
    );
    
    if (user && user.rows && user.rows.length > 0) {
      organizationId = user.rows[0].orgId;
    } else {
      // Se o bypass falhou em encontrar o usuário, retornamos 404/400
      return NextResponse.json({ message: "Usuário de teste não encontrado no DB." }, { status: 404 });
    }
    
  } // <--- CHAVE DE FECHAMENTO CRÍTICA DO BLOCO 'if (testSecret...)'

  // 2. CAMINHO PADRÃO (SESSÃO/COOKIES)
  else {
    const session = await auth();
    if (!session || !session.user || typeof session.user.orgId !== "number") {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }
    organizationId = session.user.orgId;
  }
  
  // --- EXECUÇÃO COMUM ---
  if (organizationId === undefined) {
    return NextResponse.json({ message: "Organization ID não encontrado." }, { status: 404 });
  }

  try {
    const result = await CleanupService.runCleanup(organizationId);
    return NextResponse.json({ message: "Limpeza concluída.", ...result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Erro interno.", details: String(error) }, { status: 500 });
  }
}