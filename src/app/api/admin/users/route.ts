// src/app/api/admin/users/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { userManagementService } from "@/services/user-management-service"; // Requer listOrganizationMembers

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

  // Se não estiver autenticado ou sem organização, retorna 401
  if (!permission.authorized) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    // [NOVO FLUXO MULTI-TENANT] Passa o organizationId para o Service
    // O service deve retornar todos os usuários vinculados àquela organização, 
    // juntamente com o papel (organization_role).
    if (!permission.organizationId) {
      return NextResponse.json({ message: "Organização não identificada." }, { status: 400 });
    }
    const members = await userManagementService.listOrganizationMembers(permission.organizationId);

    // Retornamos os membros da organização
    return NextResponse.json(members, { status: 200 });

  } catch (error) {
    console.error("[API GET Users (Org Members)]", error);
    return NextResponse.json({ message: "Erro ao listar membros da organização" }, { status: 500 });
  }
}

// --- POST: CRIAR USUÁRIO (MANTIDO RESTRITO AO ADMIN GLOBAL) ---
export async function POST(request: NextRequest) {
  // Mantemos a checagem rígida para a criação manual de contas de super-admin
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: "Acesso restrito a administradores (Criação Manual)." }, { status: 403 });
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

    if (error instanceof Error) {
      message = error.message;
      if (message === "Email já cadastrado.") status = 409;
      if (message.includes("obrigatórios")) status = 400;
    }

    return NextResponse.json({ message }, { status });
  }
}