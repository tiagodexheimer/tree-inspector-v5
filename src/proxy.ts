// src/proxy.ts
import { auth } from "@/auth";

export const proxy = auth;

export const config = {
  // Apenas o matcher é necessário. O runtime já é Node.js por padrão.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};