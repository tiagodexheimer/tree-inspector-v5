import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { rotasService } from "@/services/rotas-service";

// --- POST: Criar Rota ---
export async function POST(request: NextRequest) {
  console.log("[API /rotas] Recebido POST.");

  // 1. Autenticação e Segurança
  const session = await auth();
  if (!session || !session.user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  
  // Extrai organizationId e planType (role) da sessão
  const user = session.user as any;
  const organizationId = Number(user.organizationId);
  const planType = user.role; // Assumimos que o campo 'role' é o 'planType'

  if (isNaN(organizationId) || organizationId <= 0) {
      return NextResponse.json({ message: "Organização não definida para o usuário." }, { status: 403 });
  }

  try {
    const body = await request.json();

    // 2. Extrai os dados do corpo
    const { nome, responsavel, demandas, inicio_personalizado, fim_personalizado } = body;

    // 3. Chama o serviço (com os campos necessários)
    const newRota = await rotasService.createRota({
        nome,
        responsavel,
        demandas, 
        inicio_personalizado,
        fim_personalizado,
        organizationId, 
        planType,       
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
        
        if (message.includes("obrigatório") || message.includes("pelo menos uma")) {
            status = 400;
        }
        
        if ((error as any).code === "23505") {
             status = 409;
             message = "Erro: Uma ou mais demandas já pertencem a outra rota.";
        }
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}

// --- GET: Listar Rotas (CORRIGIDO) ---
export async function GET() {
  console.log("[API /rotas] Recebido GET.");

  // 1. Autenticação (Necessário para obter organizationId)
  const session = await auth();
  if (!session || !session.user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  
  // Extrai organizationId (assumindo que existe na sessão)
  const organizationId = Number((session.user as any).organizationId);
  
  if (isNaN(organizationId) || organizationId <= 0) {
      return NextResponse.json({ message: "Organização não definida para o usuário." }, { status: 403 });
  }

  try {
    // 2. CORREÇÃO: Passa o organizationId (o argumento esperado)
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