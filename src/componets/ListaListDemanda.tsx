'use client';
import { DemandaType } from "@/types/demanda";
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, Checkbox } from "@mui/material";
import StatusDemanda from "./StatusDemanda";

interface ListDemandaProps {
    demandas: DemandaType[];
    selectedDemandas: string[];
    onSelectDemanda: (id: string) => void;
    onSelectAll: () => void;
    numSelected: number;
    rowCount: number;
}

export default function ListaListDemanda({ demandas, selectedDemandas, onSelectDemanda, onSelectAll, numSelected, rowCount }: ListDemandaProps) {
    return (
        <div className="flex flex-wrap gap-4" style={{ padding: "16px" }}>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={numSelected > 0 && numSelected < rowCount}
                                    checked={rowCount > 0 && numSelected === rowCount}
                                    onChange={onSelectAll}
                                />
                            </TableCell>
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
                                <TableRow key={demanda.ID} hover selected={isSelected}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => onSelectDemanda(demanda.ID)}
                                        />
                                    </TableCell>
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