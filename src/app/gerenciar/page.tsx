// src/app/gerenciar/page.tsx
import { Card } from "@mui/material";
import Link from "next/link";
import ForestIcon from '@mui/icons-material/Forest';
import DescriptionIcon from '@mui/icons-material/Description';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CategoryIcon from '@mui/icons-material/Category'; 
// [NOVO] Importe um ícone para usuários
import PeopleIcon from '@mui/icons-material/People';

export default function GerenciarPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 p-4">Gerenciamento</h1>

            <div className="flex items-center justify-start p-4 gap-8 flex-wrap">

                {/* ... (Cards de Espécies, Laudos, Demandas, Status, Tipos permanecem iguais) ... */}
                
                {/* Card de Espécies */}
                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link href="/gerenciar/especies" className="flex flex-col items-center gap-2 text-xl font-bold text-[#257e1a] no-underline hover:opacity-80">
                        <ForestIcon sx={{ fontSize: 60, color: '#257e1a' }} />
                        Gerenciar Espécies
                    </Link>
                </Card>

                {/* Card de Laudos/Formulários */}
                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link href="/gerenciar/formularios" className="flex flex-col items-center gap-2 text-xl font-bold text-[#257e1a] no-underline hover:opacity-80">
                        <DescriptionIcon sx={{ fontSize: 60, color: '#257e1a' }} />
                        Gerenciar Laudos
                    </Link>
                </Card>

                 {/* Card de Demandas */}
                 <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                     <Link href="/gerenciar/demandas" className="flex flex-col items-center gap-2 text-xl font-bold text-[#257e1a] no-underline hover:opacity-80">
                         <AssignmentIcon sx={{ fontSize: 60, color: '#257e1a' }} />
                        Gerenciar Demandas
                    </Link>
                 </Card>

                {/* Card de Status */}
                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link href="/gerenciar/status" className="flex flex-col items-center gap-2 text-xl font-bold text-[#257e1a] no-underline hover:opacity-80">
                        <PlaylistAddCheckIcon sx={{ fontSize: 60, color: '#257e1a' }} />
                        Gerenciar Status
                    </Link>
                </Card>

                 {/* Card de Tipos de Demanda */}
                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link href="/gerenciar/tipos-demanda" className="flex flex-col items-center gap-2 text-xl font-bold text-[#257e1a] no-underline hover:opacity-80">
                        <CategoryIcon sx={{ fontSize: 60, color: '#257e1a' }} />
                        Gerenciar Tipos
                    </Link>
                </Card>
                
                {/* +++ INÍCIO DO NOVO CARD DE USUÁRIOS +++ */}
                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link href="/gerenciar/usuarios" className="flex flex-col items-center gap-2 text-xl font-bold text-[#257e1a] no-underline hover:opacity-80">
                        <PeopleIcon sx={{ fontSize: 60, color: '#257e1a' }} />
                        Gerenciar Usuários
                    </Link>
                </Card>
                {/* +++ FIM DO NOVO CARD +++ */}


            </div>
        </div>
    );
}