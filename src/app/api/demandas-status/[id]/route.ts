// src/app/api/demandas-status/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { statusService } from "@/services/status-service";
import { UserRole } from "@/types/auth-types";

// Definição do contexto de rota para Next.js 15+
type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

// Helper de Segurança Multi-tenant
async function getAuthContext(session: any) {
  if (!session || !session.user) {
    throw new Error("Não autenticado");
  }
  
  const user = session.user as any;
  const organizationId = parseInt(user.organizationId || "0", 10);
  const userRole = user.role as UserRole; // Plan Type

  if (isNaN(organizationId) || organizationId === 0) {
    throw new Error("Sessão inválida: ID da organização ausente.");
  }

  return { organizationId, userRole };
}

// --- PUT: Atualizar Status ---
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // 1. Resolve Parâmetros
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
       return NextResponse.json({ message: 'ID inválido.' }, { status: 400 });
    }

    // 2. Obtém Contexto de Segurança
    const session = await auth();
    const { organizationId, userRole } = await getAuthContext(session);

    // 3. Processa Body
    const body = await request.json();

    // 4. Chama o Serviço com os 4 argumentos exigidos
    const updatedStatus = await statusService.updateStatus(
        id, 
        {
            nome: body.nome,
            cor: body.cor
        },
        organizationId, // Argumento 3: ID da organização
        userRole        // Argumento 4: Tipo do plano
    );

    return NextResponse.json(updatedStatus, { status: 200 });

  } catch (error: any) {
    // Tratamento de erros seguro
    if (error.message === "Não autenticado") return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    if (error.message.includes("Sessão inválida")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    
    console.error('[API PUT Status]', error);
    let status = 500;
    let message = 'Erro interno ao atualizar status.';

    if (error instanceof Error) {
        message = error.message;
        if (message === "Status não encontrado.") status = 404;
        if (message.includes("não permite") || message.includes("permissão")) status = 403;
        if (message === "Já existe um status com este nome.") status = 409;
        if (message.includes("obrigatório") || message.includes("formato")) status = 400;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}

// --- DELETE: Deletar Status ---
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
       return NextResponse.json({ message: 'ID inválido.' }, { status: 400 });
    }

    const session = await auth();
    const { organizationId, userRole } = await getAuthContext(session);

    // Chama o Serviço com os 3 argumentos exigidos
    await statusService.deleteStatus(
        id, 
        organizationId, 
        userRole
    );

    return NextResponse.json({ message: `Status ${id} deletado com sucesso.` }, { status: 200 });

  } catch (error: any) {
    if (error.message === "Não autenticado") return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    
    console.error('[API DELETE Status]', error);
    let status = 500;
    let message = 'Erro interno ao deletar status.';

    if (error instanceof Error) {
        message = error.message;
        if (message === "Status não encontrado.") status = 404;
        if (message.includes("não permite") || message.includes("permissão")) status = 403;
        if (message.includes("associado a")) status = 409;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}