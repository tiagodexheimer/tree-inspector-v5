// src/app/api/rotas/[id]/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { rotasService } from "@/services/rotas-service";

type ExpectedContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: ExpectedContext) {
  // 1. Autenticação
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  // ⚠️ Extrai e valida o organizationId da sessão (assumindo que ele está no token)
  // Usamos 'as any' porque a definição de tipo padrão do NextAuth pode não incluir organizationId.
  const organizationId = Number((session.user as any).organizationId);

  if (isNaN(organizationId) || organizationId <= 0) {
    // Bloqueia se o usuário não tiver um ID de organização válido
    return NextResponse.json({ message: "Organização não definida para o usuário." }, { status: 403 });
  }

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ message: 'ID da rota inválido.' }, { status: 400 });
    }

    // 2. Chamada ao Serviço: CORRIGIDO. Passa a Rota ID e a Organização ID.
    const { buffer, filename } = await rotasService.generateExport(id, organizationId);

    // 3. Retorno do Arquivo
    const headers = new Headers();
    headers.append('Content-Type', 'application/pdf');
    headers.append('Content-Disposition', `attachment; filename="${filename}"`);

    // Converte o Node.js Buffer para o Web Blob esperado pela API do Next.js
    return new NextResponse(new Blob([buffer as any]), {
      status: 200,
      headers: headers
    });

  } catch (error) {
    console.error(`[API Export Rota] Erro:`, error);
    let status = 500;
    let message = 'Erro interno ao exportar rota.';

    if (error instanceof Error) {
      message = error.message;
      // Erro 404 é retornado se a rota não for encontrada ou se o ID de organização não for correspondente.
      if (message.includes("Rota não encontrada")) status = 404;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}