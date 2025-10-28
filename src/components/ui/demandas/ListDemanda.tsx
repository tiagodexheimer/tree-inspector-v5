// src/components/ui/demandas/ListDemanda.tsx
import { TableCell, TableRow } from "@mui/material";
import { DemandaType } from "@/types/demanda"; // Importa o tipo DemandaType
import StatusDemanda from "./StatusDemanda"; // Importa StatusDemanda para exibir o status

// Usa DemandaType diretamente como tipo das props, já que este componente representa uma demanda
type iDemandaProps = DemandaType;

export default function ListDemanda({
    id,
    endereco,
    descricao,
    prazo, // Agora é Date | null | undefined
    status, // Agora é Status | undefined
    responsavel,
    contato // Agora é opcional
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

    // Função auxiliar para formatar informações de contato
    const formatContato = (contatoData: DemandaType['contato']): string => {
        if (!contatoData) {
            return 'N/A';
        }
        // Monta uma string com os dados de contato disponíveis
        const parts = [
            contatoData.nome,
            contatoData.telefone,
            contatoData.email,
            contatoData.endereco // Pode ser redundante se já houver a coluna endereço
        ].filter(Boolean); // Filtra partes vazias ou nulas
        return parts.join(' | ');
    };

    // Este componente foi originalmente desenhado para renderizar uma TableRow.
    // Vamos mantê-lo assim, mas poderia ser adaptado para renderizar um ListItem ou outro elemento.
    return (
        <TableRow hover> {/* Adicionado hover para consistência */}
            <TableCell>{id ?? 'N/A'}</TableCell> {/* Mostra N/A se id for undefined */}
            <TableCell>{endereco}</TableCell>
            {/* Limita a descrição para evitar quebras */}
            <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {descricao}
            </TableCell>
            {/* Formata o prazo */}
            <TableCell>{formatPrazo(prazo)}</TableCell>
            <TableCell>
                {/* Renderiza StatusDemanda se status existir */}
                {status ? <StatusDemanda status={status} /> : 'N/A'}
            </TableCell>
            <TableCell>{responsavel ?? 'N/A'}</TableCell> {/* Mostra N/A se responsavel for null/undefined */}
            <TableCell>
                {/* Formata as informações de contato */}
                {formatContato(contato)}
                {/* O código original usava List/ListItem, que pode ser complexo numa célula.
                    Simplificado para uma string formatada. Se precisar do formato original:
                {contato ? (
                    <List dense disablePadding>
                        <ListItem disableGutters>
                            <ListItemText
                                primary={contato.nome}
                                secondary={`${contato.telefone || ''} | ${contato.email || ''} | ${contato.endereco || ''}`}
                            />
                        </ListItem>
                    </List>
                ) : (
                    'N/A'
                )}
                */}
            </TableCell>
        </TableRow>
    );
}