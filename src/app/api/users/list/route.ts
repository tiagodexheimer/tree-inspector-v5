import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userManagementService } from "@/services/user-management-service";

export async function GET() {
  // 1. Segurança: Apenas usuários logados podem ver a lista
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  try {
    // 2. Busca todos os usuários do banco
    const users = await userManagementService.listAllUsers();
    
    // 3. Mapeia apenas o necessário para o Dropdown (ID e Nome)
    const simpleUsers = users.map(u => ({
        id: u.id,
        name: u.name && u.name.trim() !== '' ? u.name : u.email // Usa email se não tiver nome
    }));
    
    return NextResponse.json(simpleUsers, { status: 200 });

  } catch (error) {
    console.error("[API Users List]", error);
    return NextResponse.json({ message: "Erro ao listar usuários" }, { status: 500 });
  }
}