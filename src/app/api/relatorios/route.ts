// src/app/api/relatorios/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RelatoriosService } from "@/services/relatorios-service";

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);

  const filters = {
    rua: searchParams.get('rua') || undefined,
    bairro: searchParams.get('bairro') || undefined,
    numero: searchParams.get('numero') || undefined,
  };

  // Verifica sessão e organização
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  // Casting para garantir acesso ao organizationId (dependendo da tipagem do next-auth)
  const user = session.user as any;
  const organizationId = Number(user.organizationId);

  if (!organizationId) {
    return NextResponse.json({ message: "Organização não definida." }, { status: 403 });
  }

  try {
    // Passa o ID da organização e filtros para o serviço
    const relatorios = await RelatoriosService.listarRelatorios(organizationId, filters);
    return NextResponse.json(relatorios, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao buscar relatórios" }, { status: 500 });
  }
}