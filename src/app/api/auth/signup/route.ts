// src/app/api/auth/signup/route.ts
import { NextResponse, NextRequest } from "next/server";
import { userManagementService } from "@/services/user-management-service";

// --- POST: AUTO-CADASTRO (Público) ---
export async function POST(request: NextRequest) {
  try {
    let body;

    // 1. [CORREÇÃO CRÍTICA] Ler o corpo da requisição de forma robusta
    try {
        // Tenta ler o corpo como texto
        const text = await request.text();
        // Se houver texto, tenta fazer o parsing, senão usa um objeto vazio
        body = text ? JSON.parse(text) : {};
    } catch (e) {
        // Se o parsing falhar (ex: Unexpected token), o body é tratado como vazio
        console.error("[API SIGNUP] Erro ao ler JSON do corpo da requisição:", e);
        body = {}; 
    }
    
    const { name, email, password } = body;

    // 2. Validação de Entrada (Controller Level)
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email e senha são obrigatórios." }, 
        { status: 400 }
      );
    }

    // 3. Chamada ao Serviço (Business Logic)
    const newUser = await userManagementService.registerUser({
        name,
        email,
        password
    });

    // 4. Resposta
    return NextResponse.json(newUser, { status: 201 });

  } catch (error) { 
    console.error("[API SIGNUP] Erro no Serviço ou Repositório:", error);
    
    let status = 500;
    let errorMessage = "Erro ao criar conta.";
    
    if (error instanceof Error) {
        errorMessage = error.message;
        
        // Mapeamento de erros de domínio para HTTP
        if (errorMessage === "Email já cadastrado.") status = 409; // Conflict
        if (errorMessage.includes("obrigatórios")) status = 400;   // Bad Request
        // Tratamento para erro de criação da organização
        if (errorMessage.includes("Falha ao configurar o ambiente")) status = 503; 
    }
    
    return NextResponse.json({ message: errorMessage }, { status });
  }
}