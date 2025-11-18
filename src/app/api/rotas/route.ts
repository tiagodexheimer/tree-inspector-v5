import { NextRequest, NextResponse } from "next/server";
import { rotasService } from "@/services/rotas-service";

// --- GET: Listar Rotas ---
export async function GET() {
  console.log("[API /rotas] Recebido GET.");

  try {
    const rotas = await rotasService.listRotas();
    return NextResponse.json(rotas, { status: 200 });

  } catch (error) {
    console.error("[API GET Rotas]", error);
    return NextResponse.json(
      { message: "Erro interno ao buscar rotas." },
      { status: 500 }
    );
  }
}

// --- POST: Criar Rota ---
export async function POST(request: NextRequest) {
  console.log("[API /rotas] Recebido POST.");

  try {
    const body = await request.json();

    const newRota = await rotasService.createRota({
        nome: body.nome,
        responsavel: body.responsavel,
        demandas: body.demandas // Espera array de objetos com { id }
    });

    return NextResponse.json({
        message: "Rota criada com sucesso!",
        rota: newRota
    }, { status: 201 });

  } catch (error) {
    console.error("[API POST Rota]", error);
    let status = 500;
    let message = "Erro interno ao criar rota.";

    if (error instanceof Error) {
        message = error.message;
        
        // Erros de validação de negócio
        if (message.includes("obrigatório") || message.includes("pelo menos uma")) {
            status = 400;
        }
        
        // Erro de constraint do banco (ex: demanda já está em outra rota)
        // O código '23505' é "unique_violation" no Postgres
        if ((error as any).code === "23505") {
             status = 409;
             message = "Erro: Uma ou mais demandas já pertencem a outra rota.";
        }
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}