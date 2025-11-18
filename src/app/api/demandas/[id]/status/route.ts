import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demandasService } from "@/services/demandas-service";

type ExpectedContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: ExpectedContext) {
  // 1. Autenticação
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  try {
    // 2. Extração de Parâmetros
    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ message: "ID da demanda inválido." }, { status: 400 });
    }

    const body = await request.json();
    const { id_status } = body;

    if (typeof id_status !== 'number') {
         return NextResponse.json({ message: "ID do status inválido ou ausente." }, { status: 400 });
    }

    // 3. Delegação para o Serviço
    await demandasService.updateDemandaStatus(id, id_status);

    return NextResponse.json({ 
        message: "Status atualizado com sucesso!" 
    }, { status: 200 });

  } catch (error) {
    console.error("[API PATCH Demanda Status] Erro:", error);
    
    let status = 500;
    let message = "Erro interno ao atualizar status.";

    if (error instanceof Error) {
      message = error.message;
      if (message.includes("não encontrado")) status = 404; // Demanda ou Status não achado
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}