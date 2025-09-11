import { Card, CardHeader, CardContent } from "@mui/material";

export default function DemandasPage() {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Demandas Page</h1>
            <div>
                <Card>
                    <CardHeader title="Demanda 1" />
                    <CardContent>
                        <p>Detalhes da Demanda 1</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
