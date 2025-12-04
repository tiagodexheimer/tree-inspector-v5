import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth"; // <--- O ERRO ERA A FALTA DESTA LINHA
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

  // 1. Autenticação (Agora vai funcionar com o import acima)
  const session = await auth();
  if (!session) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // 2. Extrai os dados, incluindo os personalizados opcionais
    const { nome, responsavel, demandas, inicio_personalizado, fim_personalizado } = body;

    const newRota = await rotasService.createRota({
        nome,
        responsavel,
        demandas, // Array de { id }
        inicio_personalizado, // Passa para o serviço
        fim_personalizado     // Passa para o serviço
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
        
        // Erro de constraint do banco
        if ((error as any).code === "23505") {
             status = 409;
             message = "Erro: Uma ou mais demandas já pertencem a outra rota.";
        }
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}