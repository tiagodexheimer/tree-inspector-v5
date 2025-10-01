import { Card } from "@mui/material";
import Link from "next/link";
import ForestIcon from '@mui/icons-material/Forest';
import DescriptionIcon from '@mui/icons-material/Description'; // Ícone para formulários

export default function GerenciarPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 p-4">Gerenciamento</h1>

            <div className="flex items-center justify-start p-4 gap-8 flex-wrap">

                {/* Card de Espécies (existente) */}
                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link 
                        href="/gerenciar/especies" 
                        className="flex flex-col items-center gap-2 text-xl font-bold text-[#257e1a] no-underline hover:opacity-80"
                    >
                        <ForestIcon sx={{ fontSize: 60, color: '#257e1a' }} />
                        Gerenciar Espécies
                    </Link>
                </Card>

                {/* NOVO Card de Formulários */}
                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link 
                        href="/gerenciar/formularios" 
                        className="flex flex-col items-center gap-2 text-xl font-bold text-[#257e1a] no-underline hover:opacity-80"
                    >
                        <DescriptionIcon sx={{ fontSize: 60, color: '#257e1a' }} />
                        Gerenciar Laudos
                    </Link>
                </Card>

                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link href="/gerenciar/demandas" className="text-lg font-medium text-blue-600 hover:underline">
                        Gerenciar Demandas
                    </Link>
                </Card>

            </div>
        </div>
    );
}