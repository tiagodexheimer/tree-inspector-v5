import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { AuthService } from "@/services/auth-service"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const user = await AuthService.authenticate(body);

    if (!user) {
      return NextResponse.json({ message: "Credenciais inválidas" }, { status: 401 });
    }

    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    
    if (!secret) {
        throw new Error("SECRET não configurada no .env");
    }

    const useSecureCookies = process.env.NODE_ENV === "production";
    const cookiePrefix = useSecureCookies ? "__Secure-" : "";
    const cookieName = `${cookiePrefix}authjs.session-token`;

    const token = await encode({
      token: {
        ...user,
        sub: user.id,
      },
      secret: secret,
      salt: cookieName,
    });

    // --- MUDANÇA AQUI ---
    // Antes: cookies().set(...)
    // Agora: (await cookies()).set(...)
    const cookieStore = await cookies();
    
    cookieStore.set(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: useSecureCookies,
    });
    // --------------------

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error("[Mobile Login Error]", error);
    return NextResponse.json({ message: "Erro interno" }, { status: 500 });
  }
}