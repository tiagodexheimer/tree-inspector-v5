type DemandaType = {
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
};
export type { DemandaType };