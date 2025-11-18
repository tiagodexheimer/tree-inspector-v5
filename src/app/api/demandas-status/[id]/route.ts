import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { statusService } from "@/services/status-service";

type ExpectedContext = { params: Promise<{ id: string }> };

// Helper de Segurança
async function checkAdminAccess() {
  const session = await auth();
  
  if (!session || !session.user) {
    return { 
      authorized: false, 
      response: NextResponse.json({ message: "Não autenticado" }, { status: 401 }) 
    };
  }
  
  if (session.user.role !== 'admin') {
    return { 
      authorized: false, 
      response: NextResponse.json({ message: "Não autorizado" }, { status: 403 }) 
    };
  }

  return { authorized: true, response: null };
}

// --- PUT: Atualizar Status ---
export async function PUT(request: NextRequest, context: ExpectedContext) {
  const access = await checkAdminAccess();
  if (!access.authorized) {
    return access.response ?? NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
       return NextResponse.json({ message: 'ID inválido.' }, { status: 400 });
    }

    const body = await request.json();

    const updatedStatus = await statusService.updateStatus(id, {
      nome: body.nome,
      cor: body.cor
    });

    return NextResponse.json(updatedStatus, { status: 200 });

  } catch (error) {
    console.error('[API PUT Status]', error);
    let status = 500;
    let message = 'Erro interno ao atualizar status.';

    if (error instanceof Error) {
        message = error.message;
        if (message === "Status não encontrado.") status = 404;
        if (message === "Já existe um status com este nome.") status = 409;
        if (message.includes("obrigatório") || message.includes("formato")) status = 400;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}

// --- DELETE: Deletar Status ---
export async function DELETE(request: NextRequest, context: ExpectedContext) {
  const access = await checkAdminAccess();
  if (!access.authorized) {
    return access.response ?? NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
       return NextResponse.json({ message: 'ID inválido.' }, { status: 400 });
    }

    await statusService.deleteStatus(id);

    return NextResponse.json({ message: `Status ${id} deletado com sucesso.` }, { status: 200 });

  } catch (error) {
    console.error('[API DELETE Status]', error);
    let status = 500;
    let message = 'Erro interno ao deletar status.';

    if (error instanceof Error) {
        message = error.message;
        if (message === "Status não encontrado.") status = 404;
        if (message.includes("associado a")) status = 409; // Integridade referencial
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}