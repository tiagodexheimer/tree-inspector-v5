import CardDemanda from "@/componets/CardDemanda";
import ListaListDemanda from "@/componets/ListaListDemanda";
import { List } from "@mui/material";

const demandas = [
    {
        ID: "1",
        endereco: "Endereço 1",
        descricao: "Descrição 1",
        prazo: 7,
        status: "Pendente",
        responsavel: "Responsável 1",
        contato: {
            nome: "Contato 1",
            telefone: "Telefone 1",
            email: "Email 1",
            endereco: "Endereço 1"
        }
    },
    {
        ID: "2",
        endereco: "Endereço 2",
        descricao: "Descrição 2",
        prazo: 14,
        status: "Em andamento",
        responsavel: "Responsável 2",
        contato: {
            nome: "Contato 2",
            telefone: "Telefone 2",
            email: "Email 2",
            endereco: "Endereço 2"
        }
    },
    {
        ID: "3",
        endereco: "Endereço 3",
        descricao: "Descrição 3",
        prazo: 30,
        status: "Concluído",
        responsavel: "Responsável 3",
        contato: {
            nome: "Contato 3",
            telefone: "Telefone 3",
            email: "Email 3",
            endereco: "Endereço 3"
        }
    },
    {
        ID: "4",
        endereco: "Endereço 4",
        descricao: "Descrição 4",
        prazo: 60,
        status: "Pendente",
        responsavel: "Responsável 4",
        contato: {
            nome: "Contato 4",
            telefone: "Telefone 4",
            email: "Email 4",
            endereco: "Endereço 4"
        }
    },
    {
        ID: "4",
        endereco: "Endereço 4",
        descricao: "Descrição 4",
        prazo: 60,
        status: "Pendente",
        responsavel: "Responsável 4",
        contato: {
            nome: "Contato 4",
            telefone: "Telefone 4",
            email: "Email 4",
            endereco: "Endereço 4"
        }
    },
    {
        ID: "4",
        endereco: "Endereço 4",
        descricao: "Descrição 4",
        prazo: 60,
        status: "Pendente",
        responsavel: "Responsável 4",
        contato: {
            nome: "Contato 4",
            telefone: "Telefone 4",
            email: "Email 4",
            endereco: "Endereço 4"
        }
    },
    {
        ID: "4",
        endereco: "Endereço 4",
        descricao: "Descrição 4",
        prazo: 60,
        status: "Pendente",
        responsavel: "Responsável 4",
        contato: {
            nome: "Contato 4",
            telefone: "Telefone 4",
            email: "Email 4",
            endereco: "Endereço 4"
        }
    }
];


export default function DemandasPage() {
    return (
        <div>
            <ListaListDemanda demandas={demandas} />
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>Demandas Page</h1>
            {/* <CardDemanda demandas={demandas} /> */}
        </div>
    );
}
