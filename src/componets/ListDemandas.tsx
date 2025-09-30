import { Card, CardHeader, CardContent, Link, Box, List, ListItem, ListItemText } from "@mui/material";
import { DemandaType } from "@/types/demanda";

type iDemandaProps = DemandaType
export default function CardDemanda({ ID, endereco, descricao, prazo, status, responsavel, contato }: iDemandaProps) {
    return (
        <Card sx={{ display: 'flex' }}>
            <Box>
               <List>
                <ListItem>
                    <ListItemText primary={`Demanda ${ID}`} />
                </ListItem>
                <ListItem>
                    <ListItemText primary={endereco} />
                </ListItem>
                <ListItem>
                    <ListItemText primary={descricao} />
                </ListItem>
                <ListItem>
                    <ListItemText primary={`Prazo: ${prazo} dias`} />
                </ListItem>
                <ListItem>
                    <ListItemText primary={`Status: ${status}`} />
                </ListItem>
            </List>
            </Box>
            <CardContent>
            <p>Endereço: {endereco}</p>
            <p>Descrição: {descricao}</p>
            <p>Prazo: {prazo} dias</p>
            <p>Status: {status}</p>
            <p>Responsável: {responsavel}</p>
            <p>Contato: {contato.nome} - {contato.telefone} - {contato.email} - {contato.endereco}</p>

        </CardContent>
        </Card >
    );
}