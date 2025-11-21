import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { AuthService } from "@/services/auth-service"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log(`[Mobile Auth] Tentativa de login: ${body.email}`);

    // 1. Autenticação (Reusa lógica do site)
    const user = await AuthService.authenticate(body);

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

    // 3. Configuração de Cookies Híbrida (V4 + V5)
    // Isso garante que funciona tanto em localhost (HTTP) quanto em Prod (HTTPS)
    const isProduction = process.env.NODE_ENV === "production";
    
    // Em Dev (HTTP), NÃO podemos usar o prefixo __Secure- nem a flag secure: true
    const cookiePrefix = isProduction ? "__Secure-" : "";
    
    // Nomes dos cookies para Auth.js (v5) e NextAuth (v4/compatibilidade)
    const cookieNameV5 = `${cookiePrefix}authjs.session-token`;
    const cookieNameV4 = `${cookiePrefix}next-auth.session-token`;

    // 4. Gera o Token JWT
    const token = await encode({
      token: {
        ...user,
        sub: user.id, // Obrigatório
      },
      secret: secret,
      salt: cookieNameV5, // Usamos o salt da V5 como base
    });

    const cookieStore = await cookies();
    
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: isProduction, // False em dev para evitar rejeição no Android
    };

    // 5. Define os cookies (Setamos os dois para garantir que o Middleware ache um deles)
    cookieStore.set(cookieNameV5, token, cookieOptions);
    cookieStore.set(cookieNameV4, token, cookieOptions);

    console.log(`[Mobile Auth] Sucesso. Cookies definidos: ${cookieNameV5}, ${cookieNameV4}`);

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error("[Mobile Login Error]", error);
    return NextResponse.json({ message: "Erro interno" }, { status: 500 });
  }
}