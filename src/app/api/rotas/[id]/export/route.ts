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

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
        return NextResponse.json({ message: 'ID da rota inválido.' }, { status: 400 });
    }

    // 2. Chamada ao Serviço
    const { buffer, filename } = await rotasService.generateExport(id);

    // 3. Retorno do Arquivo
    const headers = new Headers();
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.append('Content-Disposition', `attachment; filename="${filename}"`);

    // CORREÇÃO: Adicionamos 'as any' para resolver o conflito de tipos entre Node.js Buffer e Web Blob.
    // Em tempo de execução, o Buffer é aceito pelo construtor do Blob.
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
        if (message === "Rota não encontrada para exportação.") status = 404;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}