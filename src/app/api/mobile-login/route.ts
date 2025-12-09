import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { cookies } from "next/headers";
// [CORREÇÃO] Importe 'authService' (a instância) em vez de apenas a Classe
import { authService } from "@/services/auth-service"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log(`[Mobile Auth] Tentativa de login: ${body.email}`);

    // [CORREÇÃO] Chame o método na instância 'authService'
    const user = await authService.authenticate(body);

    if (!user) {
      console.log("[Mobile Auth] Falha: Credenciais inválidas");
      return NextResponse.json({ message: "Credenciais inválidas" }, { status: 401 });
    }

    // 2. Prepara a Chave Secreta
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        console.error("[Mobile Auth] ERRO: AUTH_SECRET não definida no .env");
        return NextResponse.json({ message: "Erro de configuração" }, { status: 500 });
    }

    // 3. Configuração de Cookies
    const isProduction = process.env.NODE_ENV === "production";
    const cookiePrefix = isProduction ? "__Secure-" : "";
    const cookieNameV5 = `${cookiePrefix}authjs.session-token`;
    const cookieNameV4 = `${cookiePrefix}next-auth.session-token`;

    // 4. Gera o Token JWT
    const token = await encode({
      token: {
        ...user,
        sub: user.id.toString(), // Garante que seja string
      },
      secret: secret,
      salt: cookieNameV5,
    });

    const cookieStore = await cookies();
    
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: isProduction,
    };

    cookieStore.set(cookieNameV5, token, cookieOptions);
    cookieStore.set(cookieNameV4, token, cookieOptions);

    console.log(`[Mobile Auth] Sucesso. Cookies definidos.`);

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error("[Mobile Login Error]", error);
    // Captura a mensagem de erro específica se houver (ex: "Email e senha obrigatórios")
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}