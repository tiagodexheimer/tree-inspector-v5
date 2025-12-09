// src/app/api/users/list/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRepository } from "@/repositories/user-repository";

export async function GET() {
  const session = await auth();

  // 1. Verifica autenticação e organização
  if (!session || !session.user || !session.user.organizationId) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  const organizationId = parseInt(session.user.organizationId as any, 10);

  try {
    // 2. [CORREÇÃO] Busca apenas usuários desta organização
    const users = await UserRepository.findAllByOrganization(organizationId);

    // Mapeia para não expor dados sensíveis (embora o repo já selecione poucos campos)
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }));

    return NextResponse.json(sanitizedUsers, { status: 200 });

  } catch (error) {
    console.error("[API GET Users List] Erro:", error);
    return NextResponse.json(
      { message: "Erro ao buscar lista de usuários" },
      { status: 500 }
    );
  }
}