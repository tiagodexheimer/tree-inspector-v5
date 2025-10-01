'use client';
import { DemandaType } from "@/types/demanda";
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from "@mui/material";
import StatusDemanda from "./StatusDemanda";

interface ListDemandaProps {
    demandas: DemandaType[];
    selectedDemandas: string[];
    onSelectDemanda: (id: string) => void;
    onSelectAll: () => void; // Mantemos a prop, mas não a usamos no cabeçalho
    numSelected: number;
    rowCount: number;
}

export default function ListaListDemanda({ demandas, selectedDemandas, onSelectDemanda }: ListDemandaProps) {
    return (
        <div className="flex flex-wrap gap-4" style={{ padding: "16px" }}>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {/* Coluna do checkbox removida */}
                            <TableCell>ID</TableCell>
                            <TableCell>Endereço</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {demandas.map((demanda) => {
                            const isSelected = selectedDemandas.includes(demanda.ID);
                            return (
                                <TableRow
                                    key={demanda.ID}
                                    hover
                                    selected={isSelected} // A prop 'selected' colore a linha quando selecionada
                                    onClick={() => onSelectDemanda(demanda.ID)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    {/* Célula do checkbox removida */}
                                    <TableCell>{demanda.ID}</TableCell>
                                    <TableCell>{demanda.endereco}</TableCell>
                                    <TableCell>{demanda.descricao}</TableCell>
                                    <TableCell><StatusDemanda status={demanda.status} /></TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
}