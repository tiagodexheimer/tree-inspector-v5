// src/app/api/gerenciar/organizacao/membros/route.ts (Conteúdo movido de /api/admin/users/route.ts)
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { userManagementService } from "@/services/user-management-service";

// --- AUXILIARES ---
// Checa a permissão de LISTAGEM de membros da organização
async function checkOrganizationMembership() {
  const session = await auth();
  
  if (!session || !session.user || !session.user.organizationId) {
    return { 
      authorized: false, 
      status: 401, 
      message: "Não autenticado ou organização não definida." 
    };
  }
  
  // Qualquer membro logado pode listar outros membros da sua própria organização
  return { 
      authorized: true, 
      session, 
      organizationId: Number(session.user.organizationId) 
  };
}

// --- GET: LISTAR MEMBROS DA ORGANIZAÇÃO ---
export async function GET() {
  const permission = await checkOrganizationMembership();
  
  if (!permission.authorized) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    // O service deve buscar todos os usuários vinculados àquela organizationId
    const members = await userManagementService.listOrganizationMembers(permission.organizationId);
    
    return NextResponse.json(members, { status: 200 });

  } catch (error) {
    console.error("[API GET Org Members]", error);
    return NextResponse.json({ message: "Erro ao listar membros da organização" }, { status: 500 });
  }
}

// --- POST: CRIAR USUÁRIO (MANTIDO RESTRITO AO ADMIN GLOBAL, APENAS PARA CRIAR CONTAS DE ADMIN) ---
export async function POST(request: NextRequest) {
  const session = await auth();
  
  // POST é mantido sob permissão estrita de 'admin' global (role do sistema)
  if (!session || session.user.role.toLowerCase() !== 'admin') {
    return NextResponse.json({ message: "Acesso restrito a administradores (Criação Manual)." }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // A rota apenas delega o processamento
    const newUser = await userManagementService.createUser({
        name: body.name,
        email: body.email,
        password: body.password,
        role: body.role // Role do sistema: 'admin' | 'paid_user' | 'free_user'
    });

    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error("[API POST Users]", error);
    let status = 500;
    let message = "Erro interno ao criar usuário";

    if (error instanceof Error) {
      message = error.message;
      if (message === "Email já cadastrado.") status = 409;
      if (message.includes("obrigatórios")) status = 400;
    }

    return NextResponse.json({ message }, { status });
  }
}