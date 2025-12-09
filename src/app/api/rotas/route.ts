import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { rotasService } from "@/services/rotas-service";

// --- GET: Listar Rotas ---
export async function GET() {
  console.log("[API /rotas] Recebido GET.");

  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  // Recupera o ID da organização da sessão
  const organizationId = parseInt((session.user as any).organizationId || "1", 10);

  try {
    const rotas = await rotasService.listRotas(organizationId);
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

  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  // [CORREÇÃO] Recupera organizationId e planType da sessão
  const organizationId = parseInt((session.user as any).organizationId || "1", 10);
  const planType = (session.user as any).planType || 'Free'; // Fallback para 'Free' se não definido

  try {
    const body = await request.json();
    const {
      nome,
      responsavel,
      demandas,
      inicio_personalizado,
      fim_personalizado,
    } = body;

    const newRota = await rotasService.createRota({
      nome,
      responsavel,
      demandas,
      inicio_personalizado,
      fim_personalizado,
      organizationId,
      planType, // [CORREÇÃO] Passa o plano para o serviço fazer a validação
    });

    return NextResponse.json(
      {
        message: "Rota criada com sucesso!",
        rota: newRota,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API POST Rota]", error);
    
    let status = 500;
    let message = "Erro interno ao criar rota.";

    if (error instanceof Error) {
      message = error.message;

      // Erros de validação e regras de negócio (incluindo limites do plano)
      if (
        message.includes("obrigatório") ||
        message.includes("pelo menos uma") ||
        message.includes("Limite de") // Tratamento para o erro de limite
      ) {
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