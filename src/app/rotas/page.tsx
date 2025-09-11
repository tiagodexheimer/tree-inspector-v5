import { Card, CardHeader, CardContent } from "@mui/material";

export default function RotasPage() {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Demandas Page</h1>
            <div>
                <Card>
                    <CardHeader title="Rota 1" />
                    <CardContent>
                        <p>Detalhes da Rota 1</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
