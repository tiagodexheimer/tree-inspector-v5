import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth"; // ou seu caminho de auth
import { demandasService } from "@/services/demandas-service";

type ExpectedContext = { params: Promise<{ id: string }> };

// --- PUT: Atualizar Demanda ---
export async function PUT(request: NextRequest, context: ExpectedContext) {
  const params = await context.params;
  const id = params.id;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ message: "ID da demanda inválido." }, { status: 400 });
  }

  try {
    const body = await request.json();
    
    // Delega para o serviço
    const updatedDemanda = await demandasService.updateDemanda(numericId, body);

    return NextResponse.json({
        message: "Demanda atualizada com sucesso!",
        demanda: updatedDemanda,
    }, { status: 200 });

  } catch (error) {
    console.error(`[API PUT Demanda] Erro:`, error);
    let status = 500;
    let message = "Erro interno ao atualizar demanda.";

    if (error instanceof Error) {
      message = error.message;
      if (message === "Demanda não encontrada.") status = 404;
      if (message.includes("obrigatórios") || message.includes("inválido")) status = 400;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}

// --- DELETE: Deletar Demanda ---
export async function DELETE(request: NextRequest, context: ExpectedContext) {
  const params = await context.params;
  const id = params.id;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ message: "ID da demanda inválido." }, { status: 400 });
  }

  try {
    // Delega para o serviço
    await demandasService.deleteDemanda(numericId);

    return NextResponse.json({ message: `Demanda ${numericId} deletada com sucesso.` }, { status: 200 });

  } catch (error) {
    console.error(`[API DELETE Demanda] Erro:`, error);
    let status = 500;
    let message = "Erro interno ao deletar demanda.";

    if (error instanceof Error) {
      message = error.message;
      if (message === "Demanda não encontrada.") status = 404;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}