import CardDemanda from "@/componets/CardDemanda";
import { Card, CardHeader, CardContent } from "@mui/material";

export default function DemandasPage() {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Demandas Page</h1>
            <div className="flex flex-wrap gap-4">
                <CardDemanda />
                <CardDemanda />
                <CardDemanda />
                <CardDemanda />
            </div>

        </div>
    );
}
