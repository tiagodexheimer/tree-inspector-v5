import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { demandasTiposService } from "@/services/demandas-tipos-service";

// --- HELPER DE SEGURANÇA ---
async function checkAdminPermission() {
  const session = await auth();
  if (!session?.user) {
    return { authorized: false, status: 401, message: "Não autenticado" };
  }
  if (session.user.role !== 'admin') {
    return { authorized: false, status: 403, message: "Não autorizado" };
  }
  return { authorized: true };
}

// --- GET: Listar Tipos ---
export async function GET() {
  try {
    const tipos = await demandasTiposService.listAll();
    return NextResponse.json(tipos, { status: 200 });
  } catch (error) {
    console.error('[API GET Tipos]', error);
    return NextResponse.json({ message: 'Erro interno ao buscar tipos de demanda' }, { status: 500 });
  }
}

// --- POST: Criar Tipo ---
export async function POST(request: NextRequest) {
  // 1. Verificação de Permissão
  const permission = await checkAdminPermission();
  if (!permission.authorized) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    // 2. Obter corpo da requisição
    const body = await request.json();

    // 3. Delegar regra de negócio para o serviço
    const newTipo = await demandasTiposService.createTipo({
      nome: body.nome
    });

    return NextResponse.json(newTipo, { status: 201 });

  } catch (error) {
    console.error('[API POST Tipos]', error);
    
    let status = 500;
    let message = 'Erro interno ao criar tipo de demanda.';

    // Tratamento de erros de domínio lançados pelo Service
    if (error instanceof Error) {
      message = error.message;
      if (message === "Já existe um tipo de demanda com este nome.") status = 409; // Conflict
      if (message.includes("obrigatório")) status = 400; // Bad Request
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}