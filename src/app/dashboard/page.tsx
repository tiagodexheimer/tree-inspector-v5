import { Card } from "@mui/material";
import Link from "next/link";

export default function GerenciarPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">DashBoard</h1>

            <div className="flex items-center justify-start p-4 gap-8 flex-wrap">


                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link href="/gerenciar/Demandas" className="text-lg font-medium text-blue-600 hover:underline">
                        Gerenciar Demandas
                    </Link>
                </Card>

                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link href="/gerenciar/rotas" className="text-lg font-medium text-blue-600 hover:underline">
                        Gerenciar Rotas
                    </Link>
                </Card>
                <Card sx={{ width: 250, height: 150 }} className="p-4 mb-4 flex items-center justify-center hover:shadow-lg transition-shadow">
                    <Link href="/gerenciar/relatorios" className="text-lg font-medium text-blue-600 hover:underline">
                        Gerenciar Relatórios
                    </Link>
                </Card>
            </div>
        </div>
    );
}
