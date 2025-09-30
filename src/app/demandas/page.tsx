import ListaCardDemanda from "@/componets/ListaCardDemanda";
import ListaListDemanda from "@/componets/ListaListDemanda";
import ListDemanda from "@/componets/ListDemanda";

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
        ID: "5",
        endereco: "Endereço 5",
        descricao: "Descrição 5",
        prazo: 60,
        status: "Pendente",
        responsavel: "Responsável 5",
        contato: {
            nome: "Contato 5",
            telefone: "Telefone 5",
            email: "Email 5",
            endereco: "Endereço 5"
        }
    },
    {
        ID: "6",
        endereco: "Endereço 6",
        descricao: "Descrição 6",
        prazo: 60,
        status: "Pendente",
        responsavel: "Responsável 6",
        contato: {
            nome: "Contato 6",
            telefone: "Telefone 6",
            email: "Email 6",
            endereco: "Endereço 6"
        }
    },
    {
        ID: "7",
        endereco: "Endereço 7",
        descricao: "Descrição 7",
        prazo: 60,
        status: "Pendente",
        responsavel: "Responsável 7",
        contato: {
            nome: "Contato 7",
            telefone: "Telefone 7",
            email: "Email 7",
            endereco: "Endereço 7"
        }
    }
];


export default function DemandasPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>Demandas Page</h1>
            <ListaCardDemanda demandas={demandas} />
            
            {/* <CardDemanda demandas={demandas} /> */}
        </div>
    );
}
