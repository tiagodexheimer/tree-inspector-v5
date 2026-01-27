// src/app/layout.tsx
"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "@/components/ThemeRegistry";
import Sidebar from "@/components/ui/layout/Sidebar";
import Header from "@/components/ui/layout/Header";
import Body from "@/components/ui/layout/Body";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { Box } from "@mui/material";

const inter = Inter({ subsets: ["latin"] });

// ...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPublicPage = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/convite');

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  return (
    <html lang="pt-BR">
      <head>
        <title>TreeInspector</title>
        <link rel="icon" href="/icone.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeRegistry>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                width: "100%",
                minHeight: "100vh",
                overflowX: "hidden",
              }}
            >
              {/* HEADER FIXO MOBILE - Só exibe se não for página pública */}
              {!isPublicPage && <Header onMenuClick={handleDrawerToggle} />}

              {/* SIDEBAR MOBILE/DESKTOP - Só exibe se não for página pública */}
              {!isPublicPage && (
                <Sidebar
                  mobileOpen={mobileOpen}
                  handleDrawerToggle={handleDrawerToggle}
                />
              )}

              {/* CONTEÚDO PRINCIPAL */}
              <Body>{children}</Body>
            </Box>
          </ThemeRegistry>
        </SessionProvider>
      </body>
    </html>
  );
}

