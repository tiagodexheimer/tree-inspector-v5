
import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

const adminRoutes = [
    "/api/admin",
    "/api/admin/users",
];

const publicRoutes = [
    "/login",
    "/signup",
    "/api/auth/signup",
    "/api/mobile-login",
    "/convite",
];

export const authConfig = {
    session: {
        strategy: "jwt",
    },
    trustHost: true,
    pages: {
        signIn: "/login",
    },
    providers: [], // Providers (e.g. Credentials) are added in auth.ts
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const pathname = nextUrl.pathname;

            if (pathname === "/") {
                if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", nextUrl));
                return NextResponse.redirect(new URL("/login", nextUrl));
            }

            const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

            // Allow access to public routes
            if (isPublicRoute) {
                // But if logged in and trying to access login/signup, redirect to dashboard
                if (isLoggedIn && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
                    return NextResponse.redirect(new URL("/dashboard", nextUrl));
                }
                return true;
            }

            const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
            if (isAdminRoute) {
                if (auth?.user?.role !== "admin") {
                    return NextResponse.redirect(new URL("/dashboard", nextUrl));
                }
            }

            if (!isLoggedIn) {
                return false; // Redirect to login
            }

            return true;
        },
        // JWT and Session callbacks will be in auth.ts (as they might use DB) 
        // OR if they are edge safe, they can be here.
        // Our JWT callback uses UserRepository (DB), so it MUST stay in auth.ts
        // or be guarded. Middleware usually doesn't need the full session hydration.
    },
} satisfies NextAuthConfig;
