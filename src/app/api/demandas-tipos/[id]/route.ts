// src/app/api/demandas-tipos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { demandasTiposService } from "@/services/demandas-tipos-service";
import { UserRole } from "@/types/auth-types"; 

// [FIX 1] Define o tipo de contexto de rota (Resolve o Type Error)
type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

// Helper de Segurança Multi-tenant
async function getAuthContext(session: any) {
  if (!session || !session.user) {
    throw new Error("Não autenticado");
  }
  
  const user = session.user as any;
  const organizationId = parseInt(user.organizationId || "0", 10);
  const userRole = user.role as UserRole; 

  if (isNaN(organizationId) || organizationId === 0) {
    throw new Error("Sessão inválida: ID da organização ausente.");
  }

  return { organizationId, userRole };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ message: 'ID inválido.' }, { status: 400 });

    const body = await request.json();

    // 1. Obtém o contexto necessário
    const session = await auth();
    const { organizationId, userRole } = await getAuthContext(session);
    
    // 2. Empacota nome e id_formulario no objeto de input
    const inputData = {
        nome: body.nome,
        id_formulario: body.id_formulario
    };

    // 3. [FIX] Chama o serviço com os 4 argumentos exigidos
    const updatedTipo = await demandasTiposService.updateTipo(
        id, 
        inputData, // Argumento 2: Objeto input
        organizationId, // Argumento 3: ID da organização
        userRole        // Argumento 4: Tipo do plano (para checagem de limites)
    );

    return NextResponse.json(updatedTipo, { status: 200 });

  } catch (error: any) {
    console.error('[API PUT Tipo]', error);
    let status = 500;
    let message = 'Erro interno ao atualizar tipo.';
    
    if (error.message.includes("Não autenticado")) status = 401;
    if (error.message.includes("Sessão inválida") || error.message.includes("plano atual não permite")) status = 403;

    if (error instanceof Error) {
        message = error.message;
        if (message === "Tipo de demanda não encontrado" || message.includes("não tem permissão")) status = 404;
        if (message === "Já existe um tipo de demanda com este nome.") status = 409;
        if (message.includes("obrigatório")) status = 400;
    }
    return NextResponse.json({ message, error: message }, { status });
  }
}

// [FIX 3] Usa RouteContext na assinatura da função
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
       return NextResponse.json({ message: 'ID inválido.' }, { status: 400 });
    }

    const session = await auth();
    const { organizationId, userRole } = await getAuthContext(session);

    // [FIX] Chama o serviço com os 3 argumentos exigidos
    await demandasTiposService.deleteTipo(
        id, 
        organizationId, // Argumento 2: organizationId
        userRole        // Argumento 3: userRole (plano)
    );

    return NextResponse.json({ message: `Tipo ${id} deletado com sucesso.` }, { status: 200 });

  } catch (error: any) {
    console.error('[API DELETE Tipo]', error);
    let status = 500;
    let message = 'Erro interno ao deletar tipo.';

    if (error.message.includes("Não autenticado")) status = 401;
    if (error.message.includes("Sessão inválida") || error.message.includes("plano atual não permite")) status = 403;


    if (error instanceof Error) {
        message = error.message;
        if (message === "Tipo de demanda não encontrado.") status = 404;
        if (message.includes("associado a")) status = 409; 
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}