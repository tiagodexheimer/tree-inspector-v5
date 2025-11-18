import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
// CORREÇÃO: Importar o SERVIÇO (letra minúscula), não o Repositório
import { demandasTiposService } from "@/services/demandas-tipos-service";

// Definição do contexto do Next.js
type ExpectedContext = {
    params: Promise<{ id: string }>;
};

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

// --- PUT: Atualizar Tipo ---
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

    // Chamada correta ao serviço
    const updatedTipo = await demandasTiposService.updateTipo(id, body.nome);

    return NextResponse.json(updatedTipo, { status: 200 });

  } catch (error) {
    console.error('[API PUT Tipo]', error);
    let status = 500;
    let message = 'Erro interno ao atualizar tipo.';

    if (error instanceof Error) {
        message = error.message;
        if (message === "Tipo de demanda não encontrado.") status = 404;
        if (message === "Já existe um tipo de demanda com este nome.") status = 409;
        if (message.includes("obrigatório")) status = 400;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}

// --- DELETE: Deletar Tipo ---
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

    // Chamada correta ao serviço
    await demandasTiposService.deleteTipo(id);

    return NextResponse.json({ message: `Tipo ${id} deletado com sucesso.` }, { status: 200 });

  } catch (error) {
    console.error('[API DELETE Tipo]', error);
    let status = 500;
    let message = 'Erro interno ao deletar tipo.';

    if (error instanceof Error) {
        message = error.message;
        if (message === "Tipo de demanda não encontrado.") status = 404;
        if (message.includes("associado a")) status = 409; 
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}