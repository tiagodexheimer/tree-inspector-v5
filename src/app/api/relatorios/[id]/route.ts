// src/app/api/relatorios/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { RelatoriosService } from "@/services/relatorios-service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Não autenticado" }, { status: 401 });

  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const relatorio = await RelatoriosService.obterDetalhesRelatorio(id);
    return NextResponse.json(relatorio, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao buscar relatório" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Não autenticado" }, { status: 401 });

  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const user = session.user as any;
    const organizationId = parseInt(user.organizationId || "0", 10);

    if (isNaN(organizationId) || organizationId === 0) {
      return NextResponse.json({ message: "Sessão inválida" }, { status: 403 });
    }

    await RelatoriosService.deleteRelatorio(id, organizationId);
    return NextResponse.json({ message: "Relatório deletado com sucesso" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao deletar relatório" }, { status: 500 });
  }
}