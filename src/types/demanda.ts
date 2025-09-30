
export type Status = 'Pendente' | 'Em andamento' | 'Concluído';

export type DemandaType = {
    ID: string;
    endereco: string;
    descricao: string;
    prazo: number;
    status: Status;
    responsavel: string;
    contato: {
        nome: string;
        telefone: string;
        email: string;
        endereco: string;
    };
};