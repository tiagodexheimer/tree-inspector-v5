'use client';

import { useState } from "react";
import Body from "@/componets/Body";
import Header from "@/componets/Header";
import Sidebar from "@/componets/Sidebar";
import DemandasPage from "./demandas/page";
import RotasPage from "./rotas/page";
import GerenciarPage from "./gerenciar/page";
import RelatoriosPage from "./relatorios/page";

const pageContent = {
  home: <Body />,
  demandas: <DemandasPage />,
  rotas: <RotasPage />,
  gerenciar: <GerenciarPage />,
  relatorios: <RelatoriosPage />
};

type Page = keyof typeof pageContent;

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  return (
    // 1. Um contêiner simples, sem controle de altura ou overflow.
    <div className="bg-gray-100">
      {/* 2. Header continua fixo no topo, com z-index alto. */}
      <div className="fixed top-0 left-0 w-full z-30">
        <Header />
      </div>

      {/* 3. Sidebar continua fixa, abaixo do header. */}
      <div className="fixed top-12 left-0 h-screen z-20">
        <Sidebar onNavigate={handleNavigate} />
      </div>

      {/* 4. Conteúdo com padding para criar o espaço necessário. */}
      <div className="pt-12 pl-56">
        <div 
          className="w-full text-black" 
          style={{ background: "#F5F5DC", minHeight: 'calc(100vh - 48px)' }}
        >
          {pageContent[currentPage]}
        </div>
      </div>
    </div>
  );
}