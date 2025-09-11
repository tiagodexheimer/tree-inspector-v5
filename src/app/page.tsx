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

export default function Home() {
  const [currentPage, setCurrentPage] = useState('home');

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col h-screen w-screen">
      <div className="flex w-full justify-center " style={{         position: 'fixed', // Define a posição como fixa
        top: 0,            // Posiciona no topo da tela
        left: 0,           // Posiciona na esquerda da tela
        width: '100%',     // Ocupa toda a largura da tela
        backgroundColor: 'lightblue', // Cor de fundo para visualização
        zIndex: 1000       // Garante que ele fique sobre outros elementos 
        }}>
        <Header  />
      </div> 
      <div className="flex ">
        <Sidebar onNavigate={handleNavigate} />
        <div className="flex w-full text-black" style={{ background: "#F5F5DC" }}>
          {pageContent[currentPage]}
        </div>
      </div>
    </div>
  );
}