// src/app/api/auth/signup/route.ts
import { NextResponse, NextRequest } from "next/server";
import { userManagementService } from "@/services/user-management-service";

// --- POST: AUTO-CADASTRO (Público) ---
export async function POST(request: NextRequest) {
  try {
    let body;

    try {
        const text = await request.text();
        body = text ? JSON.parse(text) : {};
    } catch (e) {
        console.error("[API SIGNUP] Erro ao ler JSON do corpo da requisição:", e);
        body = {}; 
    }
    
    // [CORREÇÃO] Recebe planType e isMonthly (isMonthly não é usado no service, mas é bom receber)
    const { name, email, password, planType, isMonthly } = body; 

    // 2. Validação de Entrada
    if (!email || !password || !planType) {
      return NextResponse.json(
        { message: "Email, senha e plano são obrigatórios." }, 
        { status: 400 }
      );
    }
    
    // Garante que o plano é um dos tipos esperados
    const validPlans = ['free', 'basic', 'pro', 'premium'];
    if (!validPlans.includes(planType)) {
        return NextResponse.json(
            { message: "Plano selecionado inválido." }, 
            { status: 400 }
        );
    }

    // 3. Chamada ao Serviço (Passando planType)
    const newUser = await userManagementService.registerUser({
        name,
        email,
        password,
        planType // Passa o plano selecionado
    });

    // 4. Resposta
    return NextResponse.json(newUser, { status: 201 });

  } catch (error) { 
    console.error("[API SIGNUP] Erro no Serviço ou Repositório:", error);
    
    let status = 500;
    let errorMessage = "Erro ao criar conta.";
    
    if (error instanceof Error) {
        errorMessage = error.message;
        
        if (errorMessage === "Email já cadastrado.") status = 409; 
        if (errorMessage.includes("obrigatórios") || errorMessage.includes("inválido")) status = 400;   
        if (errorMessage.includes("Falha ao configurar o ambiente")) status = 503; 
    }
    
    return NextResponse.json({ message: errorMessage }, { status });
  }
}