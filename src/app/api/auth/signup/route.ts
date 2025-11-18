import { NextResponse, NextRequest } from "next/server";
import { userManagementService } from "@/services/user-management-service";

// --- POST: AUTO-CADASTRO (Público) ---
export async function POST(request: NextRequest) {
  try {
    // 1. Ler o corpo da requisição
    const body = await request.json();
    const { name, email, password } = body;

    // 2. Validação de Entrada (Controller Level)
    // Verificamos se os campos essenciais para a requisição existem
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email e senha são obrigatórios." }, 
        { status: 400 }
      );
    }

    // 3. Chamada ao Serviço (Business Logic)
    // Não passamos 'role' aqui. O serviço sabe que 'registerUser' implica 'free_user'.
    const newUser = await userManagementService.registerUser({
        name,
        email,
        password
    });

    // 4. Resposta
    return NextResponse.json(newUser, { status: 201 });

  } catch (error) { 
    console.error("[API SIGNUP]", error);
    
    let status = 500;
    let errorMessage = "Erro ao criar conta.";
    
    if (error instanceof Error) {
        errorMessage = error.message;
        
        // Mapeamento de erros de domínio para HTTP
        if (errorMessage === "Email já cadastrado.") status = 409; // Conflict
        if (errorMessage.includes("obrigatórios")) status = 400;   // Bad Request
    }
    
    return NextResponse.json({ message: errorMessage }, { status });
  }
}