// src/app/api/rotas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { rotasService } from "@/services/rotas-service";
import { UserRole } from "@/types/auth-types"; 

// --- POST: Criar Rota (CORRIGIDO PARA SOLID) ---
export async function POST(request: NextRequest) {
  console.log("[API /rotas] Recebido POST.");

  // 1. Autenticação e Segurança
  const session = await auth();
  if (!session || !session.user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  
  // Extrai organizationId e userRole da sessão
  const user = session.user as any;
  const organizationId = Number(user.organizationId);
  const userRole = user.role as UserRole; 

  if (isNaN(organizationId) || organizationId <= 0) {
      return NextResponse.json({ message: "Organização não definida para o usuário." }, { status: 403 });
  }

  try {
    const body = await request.json();

    // 2. Extrai os dados puros do corpo (DTO)
    const { nome, responsavel, demandas, inicio_personalizado, fim_personalizado } = body;

    // 3. Validação de dados de entrada da rota
    if (!nome || !responsavel || !demandas || demandas.length === 0) {
        throw new Error("O nome, responsável e demandas são obrigatórios.");
    }
    
    // 4. Chama o serviço, injetando o contexto (organizationId, userRole)
    const newRota = await rotasService.createRota(
        {
            nome,
            responsavel,
            demandas, 
            inicio_personalizado,
            fim_personalizado,
        },
        organizationId, // Contexto injetado 1
        userRole        // Contexto injetado 2 (usado para checar o limite)
    );

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
        
        if (message.includes("obrigatório") || message.includes("pelo menos uma") || message.includes("Limite de")) {
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

// --- GET: Listar Rotas (Mantido e Corrigido) ---
export async function GET(request: NextRequest) {
  console.log("[API /rotas] Recebido GET.");

  const session = await auth();
  if (!session || !session.user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  
  const organizationId = Number((session.user as any).organizationId);
  
  if (isNaN(organizationId) || organizationId <= 0) {
      return NextResponse.json({ message: "Organização não definida para o usuário." }, { status: 403 });
  }

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

// --- DELETE: DELETAR ROTA (RESTAURADO E CORRIGIDO) ---
export async function DELETE(request: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const organizationId = parseInt((session.user as any).organizationId || "0", 10);

    if (isNaN(organizationId) || organizationId === 0) {
        return NextResponse.json({ message: "Sessão inválida: ID da organização ausente." }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const rotaId = parseInt(searchParams.get("id") || "0", 10);
        
        if (isNaN(rotaId) || rotaId === 0) {
            return NextResponse.json({ message: "ID da rota inválido ou ausente." }, { status: 400 });
        }

        // 1. Chama o serviço para deletar, passando o ID da rota E o ID da organização (segurança)
        await rotasService.deleteRota(rotaId, organizationId);

        return NextResponse.json({ message: "Rota deletada com sucesso." }, { status: 200 });

    } catch (error) {
        console.error("[API DELETE Rota]", error);

        let status = 500;
        let message = "Erro ao deletar rota.";

        if (error instanceof Error) {
            message = error.message;
            if (message.includes("não encontrada")) {
                status = 404;
            }
        }

        return NextResponse.json({ message, error: message }, { status });
    }
}