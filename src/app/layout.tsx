// src/app/layout.tsx
"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "@/components/ThemeRegistry";
import Sidebar from "@/components/ui/layout/Sidebar";
import Header from "@/components/ui/layout/Header";
import Body from "@/components/ui/layout/Body";
import { SessionProvider } from "next-auth/react";
import { useState, useCallback } from "react";
import { Box } from "@mui/material";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  return (
    <html lang="pt-BR">
      <head>
        {/* Mobile-first necessário */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>

      <body className={inter.className}>
        <SessionProvider>
          <ThemeRegistry>
            {/*
              MOBILE-FIRST:
              - display flex, coluna no mobile
              - linha no desktop
            */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                width: "100%",
                minHeight: "100vh",
                overflowX: "hidden",
              }}
            >
              {/* HEADER FIXO MOBILE */}
              <Header onMenuClick={handleDrawerToggle} />

              {/* SIDEBAR MOBILE/DESKTOP */}
              <Sidebar
                mobileOpen={mobileOpen}
                handleDrawerToggle={handleDrawerToggle}
              />

              {/* CONTEÚDO PRINCIPAL */}
              <Body>{children}</Body>
            </Box>
          </ThemeRegistry>
        </SessionProvider>
      </body>
    </html>
  );
}
