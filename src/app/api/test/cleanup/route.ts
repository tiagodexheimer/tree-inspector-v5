// src/app/api/test/cleanup/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CleanupService } from "@/services/cleanup-service";
import db from "@/lib/db"; // Pool de conexão (Postgres/Neon)
// Certifique-se que db é importado corretamente (export default)

export async function POST(request: Request) {
  let organizationId: number | undefined;

  // Tenta ler o JSON com segurança
  const body = await request.json().catch(() => ({}));

  const testSecret = request.headers.get("x-test-bypass");
  const EXPECTED_SECRET = process.env.TEST_SECRET || "dev-bypass-secret-123";

  // --- 1. LÓGICA DE DECISÃO ---

  // Caminho de BYPASS (TESTES E2E)
  if (testSecret === EXPECTED_SECRET) {
    if (!body.email) {
      return NextResponse.json({ message: "Email obrigatório para bypass." }, { status: 400 });
    }

    console.log(`[API Cleanup] Buscando usuário para bypass: ${body.email}`);

    // [FIX CRÍTICO AQUI] Busca 'organization_id' e o apela para 'orgId' (camelCase)
    const user = await db.query(
        'SELECT organization_id AS "orgId" FROM users WHERE email = $1 LIMIT 1', 
        [body.email]
    );
    
    // Acessa o resultado
    if (user && user.rows && user.rows.length > 0 && user.rows[0].orgId) {
      // Converte para integer
      organizationId = parseInt(user.rows[0].orgId, 10); 
    } else {
      // Se o bypass falhou em encontrar o usuário (ou sem OrgID), retorna 404
      return NextResponse.json({ message: "Usuário de teste não encontrado ou sem Organization ID." }, { status: 404 });
    }
    
  } 
  // 2. CAMINHO PADRÃO (SESSÃO/COOKIES)
  else {
    const session = await auth();
    // Verifica se a sessão é válida E se o OrgID existe no objeto da sessão (o que é esperado pelo NextAuth)
    if (!session || !session.user || typeof (session.user as any).orgId !== "number") {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }
    organizationId = (session.user as any).orgId;
  } 

  // --- EXECUÇÃO COMUM ---
  if (organizationId === undefined || isNaN(organizationId)) {
    return NextResponse.json({ message: "Organization ID não encontrado." }, { status: 404 });
  }

  try {
    const result = await CleanupService.runCleanup(organizationId);
    return NextResponse.json({ message: "Limpeza concluída.", ...result }, { status: 200 });
  } catch (error) {
    console.error("[API Cleanup] Erro interno durante a limpeza:", error);
    return NextResponse.json({ message: "Erro interno.", details: String(error) }, { status: 500 });
  }
}