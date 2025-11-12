//src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/ui/layout/Header";
import Sidebar from "@/components/ui/layout/Sidebar";
import ThemeRegistry from "@/components/ThemeRegistry";
import 'leaflet/dist/leaflet.css';

// [NOVO] Importe o AuthProvider
import AuthProvider from "./AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tree Inspector", // Mudei o título
  description: "Gerenciamento de Arborização Urbana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* [NOVO] Envolva o ThemeRegistry com o AuthProvider */}
        <AuthProvider>
          <ThemeRegistry>
              <div className="bg-gray-100">
                <div className="fixed top-0 left-0 w-full z-30">
                  <Header />
                </div>

                <div className="fixed top-12 left-0 h-screen z-20">
                  <Sidebar />
                </div>

                <div className="pt-12 pl-56">
                  <div 
                    className="w-full text-black" 
                    style={{ background: "#F5F5DC", minHeight: 'calc(100vh - 48px)' }}
                  >
                    <main>{children}</main>
                  </div>
                </div>
              </div>
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}