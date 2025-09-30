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
    <div className="flex flex-col min-h-screen">
      <div className="fixed top-0 left-0 w-full z-30">
        <Header />
      </div>
      <div className="relative z-0 flex flex-grow mt-12">
        <div className="fixed top-12 left-0 h-screen z-20">
          <Sidebar onNavigate={handleNavigate} />
        </div>

          <div className="w-full text-black" style={{ background: "#F5F5DC"  }}>
            {pageContent[currentPage]}
          </div>
      </div>
    </div>
  );
}
