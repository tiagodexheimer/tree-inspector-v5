import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { userManagementService } from "@/services/user-management-service";

// Definição do contexto do Next.js (App Router)
type ExpectedContext = {
    params: Promise<{ id: string }>;
};

// Função auxiliar de segurança
async function checkAdminAccess() {
  const session = await auth();
  
  if (!session || !session.user) {
    return { 
      authorized: false, 
      session: null,
      // Garante o tipo NextResponse explicitamente
      response: NextResponse.json({ message: "Não autenticado" }, { status: 401 }) 
    };
  }
  
  if (session.user.role !== 'admin') {
    return { 
      authorized: false, 
      session: null,
      response: NextResponse.json({ message: "Não autorizado" }, { status: 403 }) 
    };
  }

  return { authorized: true, session, response: null };
}

// --- DELETE: APAGAR USUÁRIO ---
export async function DELETE(request: NextRequest, context: ExpectedContext) {
  // 1. Verificação de Acesso
  const access = await checkAdminAccess();
  
  if (!access.authorized || !access.session) {
    // CORREÇÃO: O operador ?? garante que nunca retornamos null, satisfazendo o TypeScript
    return access.response ?? NextResponse.json({ message: "Acesso negado" }, { status: 403 });
  }

  try {
    // 2. Extração de Parâmetros
    const params = await context.params;
    const idToDelete = params.id;
    
    if (!idToDelete) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    // 3. Delegação para o Serviço
    await userManagementService.deleteUser(idToDelete, access.session.user.id);

    return NextResponse.json({ message: `Usuário ${idToDelete} deletado com sucesso.` }, { status: 200 });

  } catch (error) {
    console.error("[API DELETE User]", error);
    
    let status = 500;
    let message = "Erro ao deletar usuário";

    // Tratamento de erros de negócio vindos do serviço
    if (error instanceof Error) {
      message = error.message;
      if (message === "Usuário não encontrado.") status = 404;
      if (message === "Você não pode apagar a si mesmo.") status = 400;
    }
    
    return NextResponse.json({ message }, { status });
  }
}