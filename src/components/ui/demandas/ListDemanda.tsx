// src/components/ui/demandas/ListDemanda.tsx
import { TableCell, TableRow } from "@mui/material";
import { DemandaType } from "@/types/demanda"; // Importa o tipo DemandaType
// Remove a importação não utilizada de StatusDemanda
// import StatusDemanda from "./StatusDemanda"; // Importa StatusDemanda para exibir o status

// Usa DemandaType diretamente como tipo das props, já que este componente representa uma demanda
type iDemandaProps = DemandaType;

// Função auxiliar para formatar o endereço curto (pode ser movida para um utils se usada em mais lugares)
const formatEnderecoCurto = (demanda: DemandaType): string => {
    const parts = [
        demanda.logradouro,
        demanda.numero ? `, ${demanda.numero}` : '',
        demanda.bairro ? ` - ${demanda.bairro}` : '',
        // Poderia adicionar cidade/UF se quisesse
    ];
    return parts.filter(Boolean).join('').trim() || 'Endereço não informado';
};

export default function ListDemanda({
    id,
    protocolo,
    // ***** CORREÇÃO AQUI: Remover 'endereco' e adicionar campos individuais *****
    logradouro,
    numero,
    bairro,
    // cidade, // Adicione se precisar
    // uf, // Adicione se precisar
    // cep, // Adicione se precisar
    // ***** FIM DA CORREÇÃO *****
    descricao,
    prazo, // Agora é Date | null | undefined
    status, // Agora é Status | undefined
    responsavel,
    nome_solicitante,
    telefone_solicitante,
    email_solicitante,
}: iDemandaProps) {

    // Função auxiliar para formatar a data do prazo
    const formatPrazo = (date: Date | null | undefined): string => {
        if (date instanceof Date && !isNaN(date.getTime())) {
            try {
                return date.toLocaleDateString('pt-BR');
            } catch (e) {
                console.error("Erro ao formatar data:", date, e);
                return 'Data inválida';
            }
        }
        return 'N/A'; // Retorna N/A se não for uma data válida
    };

    // Função auxiliar para formatar informações do solicitante
    const formatSolicitante = (): string => {
        const parts = [
            nome_solicitante,
            telefone_solicitante,
            email_solicitante,
        ].filter(Boolean);
        return parts.join(' | ') || 'N/A';
    };

    // Este componente foi originalmente desenhado para renderizar uma TableRow.
    // Vamos mantê-lo assim, mas poderia ser adaptado para renderizar um ListItem ou outro elemento.
    return (
        <TableRow hover> {/* Adicionado hover para consistência */}
            <TableCell>{protocolo ?? 'N/A'}</TableCell> {/* Mostra N/A se id for undefined */}
            {/* ***** CORREÇÃO AQUI: Usar os campos de endereço formatados ***** */}
            <TableCell>{formatEnderecoCurto({ logradouro, numero, bairro } as DemandaType)}</TableCell>
            {/* ***** FIM DA CORREÇÃO ***** */}
            {/* Limita a descrição para evitar quebras */}
            <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {descricao}
            </TableCell>
            {/* Formata o prazo */}
            <TableCell>{formatPrazo(prazo)}</TableCell>
            {/* ***** CORREÇÃO AQUI: Apenas exibe o texto do status ***** */}
            <TableCell>
                {status ?? 'N/A'} {/* Exibe o texto do status ou N/A */}
            </TableCell>
            {/* ***** FIM DA CORREÇÃO ***** */}
            <TableCell>{responsavel ?? 'N/A'}</TableCell> {/* Mostra N/A se responsavel for null/undefined */}
            <TableCell>
                {/* Formata as informações do solicitante */}
                {formatSolicitante()}
            </TableCell>
        </TableRow>
    );
}
