import { Card } from "@mui/material";
import ForestIcon from '@mui/icons-material/Forest';
import Link from "next/link";

export default function GerenciarPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Gerenciamento</h1>

            <div className="flex items-center justify-start p-4 gap-8 flex-wrap">

                <Link href="/gerenciar/especies" className="text-xl font-bold text-[#257e1a] no-underline hover:opacity-80">
                    <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">

                        <div className="flex flex-col items-center justify-center">
                            <p>Gerenciar Espécies</p>
                            <p><ForestIcon sx={{ fontSize: 60, color: '#257e1a' }} /></p>
                        </div>

                    </Card>
                </Link>

                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link href="/gerenciar/demandas" className="text-lg font-medium text-blue-600 hover:underline">
                        Gerenciar Demandas
                    </Link>
                </Card>

            </div>
        </div>
    );
}
