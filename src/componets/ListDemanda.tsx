import { List, ListItem, ListItemText, TableContainer, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { DemandaType } from "@/types/demanda";

type iDemandaProps = DemandaType
export default function ListDemanda({ ID, endereco, descricao, prazo, status, responsavel, contato }: iDemandaProps) {
    return (
        <div>            
                        <TableRow>
                            <TableCell>{ID}</TableCell>
                            <TableCell>{endereco}</TableCell>
                            <TableCell>{descricao}</TableCell>
                            <TableCell>{prazo}</TableCell>
                            <TableCell>{status}</TableCell>
                            <TableCell>{responsavel}</TableCell>
                            <TableCell>
                                <List>
                                    <ListItem>
                                        <ListItemText primary={contato.nome} secondary={`${contato.telefone} | ${contato.email} | ${contato.endereco}`} />
                                    </ListItem>
                                </List>
                            </TableCell>
                        </TableRow>

        </div>
    );
}