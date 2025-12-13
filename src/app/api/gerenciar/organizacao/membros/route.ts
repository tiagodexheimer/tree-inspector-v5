// src/app/api/gerenciar/organizacao/membros/route.ts (Conteúdo movido de /api/admin/users/route.ts)
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { userManagementService } from "@/services/user-management-service";
import { UserRepository } from "@/repositories/user-repository";

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
export async function GET(request: Request) {
  try {
    // 1.2. Proteger o Endpoint: Obtendo a sessão
    const session = await auth();

    // Validação de Segurança Estrita
    if (!session || !session.user || !session.user.organizationId) {
      return NextResponse.json(
        { message: "Não autorizado ou sem organização vinculada." }, 
        { status: 401 }
      );
    }

    const organizationId = Number(session.user.organizationId);

    // 1.3 e 1.4: O Repositório já deve ter o método com WHERE organization_id = $1
    // (Implementamos isso no UserRepository em passos anteriores)
    const members = await UserRepository.findAllByOrganization(organizationId);

    return NextResponse.json(members);

  } catch (error: any) {
    console.error("Erro ao listar membros:", error);
    return NextResponse.json(
      { message: "Erro interno ao buscar membros." }, 
      { status: 500 }
    );
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

// DELETE: Remover membro (Bônus para completar o gerenciamento)
export async function DELETE(request: Request) {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!session?.user?.organizationId || !targetUserId) {
        return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
    }

    const userOrgRole = (session.user as any).organizationRole;
    if (userOrgRole !== 'owner' && userOrgRole !== 'admin') {
        return NextResponse.json({ message: "Permissão negada" }, { status: 403 });
    }

    try {
        // Importante: UserManagementService deve ter o método leaveOrganization ou removeMember
        // Se não tiver, chame o repository diretamente por enquanto:
        const { userManagementService } = await import('@/services/user-management-service');
        await userManagementService.leaveOrganization(targetUserId, Number(session.user.organizationId));
        
        return NextResponse.json({ message: "Membro removido com sucesso" });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}