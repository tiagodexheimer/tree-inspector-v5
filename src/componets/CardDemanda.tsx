import { Card, CardHeader, CardContent, Link, Box } from "@mui/material";

interface iDemandaProps {
    ID: string;
    endereco: string;
    descricao: string;
    prazo: number;
    status: string;
    responsavel: string;
    contato: {
        nome: string;
        telefone: string;
        email: string;
        endereco: string;
    };
}

export default function CardDemanda({ ID, endereco, descricao, prazo, status, responsavel, contato }: iDemandaProps) {
    return (
        <Card sx={{ display: 'flex' }}>
            <Box>
                <CardHeader title={`Demanda ${ID}`} />
                <CardContent>
                    <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5820.233321484434!2d-51.17342536945289!3d-29.85172567581208!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95196f620f07e6a3%3A0x4dd1278fc2c4a06d!2sR.%20Eng.%20Hener%20de%20Souza%20Nunes%2C%20150%20-%20Centro%2C%20Esteio%20-%20RS%2C%2093260-120!5e0!3m2!1spt-PT!2sbr!4v1757598757116!5m2!1spt-PT!2sbr" width="250" height="200" loading="lazy"></iframe>
                </CardContent>
            </Box>
            <CardContent>
            <p>Endereço: {endereco}</p>
            <p>Descrição: {descricao}</p>
            <p>Prazo: {prazo} dias</p>
            <p>Status: {status}</p>
            <p>Responsável: {responsavel}</p>
            <p>Contato: {contato.nome} - {contato.telefone} - {contato.email} - {contato.endereco}</p>
            <button className="bg-blue-500 text-white px-4 py-2 rounded">Detalhes</button>
            <button className="bg-blue-500 text-white px-4 py-2 rounded">Detalhes</button>
        </CardContent>
        </Card >
    );
}