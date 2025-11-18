import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { statusService } from "@/services/status-service";

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

// --- GET: Listar Status ---
export async function GET() {
  try {
    // Delega para o serviço
    const statusList = await statusService.listAll();
    return NextResponse.json(statusList, { status: 200 });
  } catch (error) {
    console.error('[API GET Status]', error);
    return NextResponse.json({ message: 'Erro interno ao buscar status' }, { status: 500 });
  }
}

// --- POST: Criar Status ---
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
    const newStatus = await statusService.createStatus({
      nome: body.nome,
      cor: body.cor
    });

    return NextResponse.json(newStatus, { status: 201 });

  } catch (error) {
    console.error('[API POST Status]', error);
    
    let status = 500;
    let message = 'Erro interno ao criar status.';

    // Tratamento de erros de domínio lançados pelo Service
    if (error instanceof Error) {
      message = error.message;
      if (message === "Já existe um status com este nome.") status = 409; // Conflict
      if (message.includes("obrigatório") || message.includes("formato")) status = 400; // Bad Request
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}