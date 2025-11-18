import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { userManagementService } from "@/services/user-management-service";

// --- AUXILIARES ---
// Clean Code: Extrair verificação de permissão para função auxiliar
async function checkAdminPermission() {
  const session = await auth();
  
  if (!session || !session.user) {
    return { authorized: false, status: 401, message: "Não autenticado" };
  }
  
  if (session.user.role !== 'admin') {
    return { authorized: false, status: 403, message: "Acesso restrito a administradores." };
  }

  return { authorized: true, session };
}

// --- GET: LISTAR USUÁRIOS ---
export async function GET() {
  const permission = await checkAdminPermission();
  if (!permission.authorized) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    // Clean Architecture: A rota chama o serviço, não o banco de dados.
    const users = await userManagementService.listAllUsers();
    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error("[API GET Users]", error);
    return NextResponse.json({ message: "Erro ao listar usuários" }, { status: 500 });
  }
}

// --- POST: CRIAR USUÁRIO ---
export async function POST(request: NextRequest) {
  const permission = await checkAdminPermission();
  if (!permission.authorized) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    const body = await request.json();
    
    // A rota apenas delega o processamento
    const newUser = await userManagementService.createUser({
        name: body.name,
        email: body.email,
        password: body.password,
        role: body.role
    });

    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error("[API POST Users]", error);
    let status = 500;
    let message = "Erro interno ao criar usuário";

    // Tratamento de erros de domínio (lançados pelo service)
    if (error instanceof Error) {
      message = error.message;
      // Mapeamento simples de erro de negócio para HTTP Code
      if (message === "Email já cadastrado.") status = 409;
      if (message.includes("obrigatórios")) status = 400;
    }

    return NextResponse.json({ message }, { status });
  }
}