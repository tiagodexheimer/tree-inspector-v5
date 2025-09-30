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
    <div className="flex flex-col h-screen-full">
      <div className="flex fixed top-0 w-full">
        <Header />
      </div>
      <div className="flex  h-full">
        <div className="flex">
          <Sidebar onNavigate={handleNavigate} />
        </div>
        <div className="flex w-full text-black" style={{ background: "#F5F5DC" }}>
          {pageContent[currentPage]}
        </div>
      </div>
    </div>
  );
}
