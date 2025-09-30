import { DemandaType } from "@/types/demanda";
import CardDemanda from "./CardDemanda";
import ListDemanda from "./ListDemanda";
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, List, ListItem, ListItemText } from "@mui/material";

interface ListDemandaProps {
    demandas: DemandaType[];
}

export default function ListaListDemanda({ demandas }: ListDemandaProps) {
    return (
        <div className="flex flex-wrap gap-4" style={{ padding: "16px" }}>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Endereço</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Prazo</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Responsável</TableCell>
                            <TableCell>Contato</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                    {demandas.map((demanda) => (
                        <TableRow key={demanda.ID}>
                            <TableCell size="small">{demanda.ID}</TableCell>
                            <TableCell size="small">{demanda.endereco}</TableCell>
                            <TableCell size="small">{demanda.descricao}</TableCell>
                            <TableCell size="small">{demanda.prazo}</TableCell>
                            <TableCell size="small">{demanda.status}</TableCell>
                            <TableCell size="small">{demanda.responsavel}</TableCell>
                             <TableCell>{demanda.contato.telefone}</TableCell>
                             <TableCell>{demanda.contato.nome}</TableCell>
                             <TableCell>{demanda.contato.email}</TableCell>
                             <TableCell>{demanda.contato.endereco}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
        </div>

    );
}
