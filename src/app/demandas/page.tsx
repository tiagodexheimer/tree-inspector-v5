'use client';
import ListaCardDemanda from "@/componets/ListaCardDemanda";
import ListaListDemanda from "@/componets/ListaListDemanda";
import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useMemo, useState } from "react";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DemandaType } from "@/types/demanda";
import AddDemandaModal from "@/componets/AddDemandaModal";


const demandas: DemandaType[] = [
    {
        ID: "1",
        endereco: "Rua das Flores, 123, Centro",
        descricao: "Poda de galho que ameaça a fiação. a demanda se extende por mais de duas linhas para testar o corte de texto na descrição do card. Por isto é importante que o texto seja cortado corretamente.",
        prazo: 7,
        status: "Pendente",
        responsavel: "João Silva",
        contato: { nome: "Maria Souza", telefone: "(51) 9999-1111", email: "maria@email.com", endereco: "Rua das Flores, 123" }
    },
    {
        ID: "2",
        endereco: "Avenida Brasil, 456, Igara",
        descricao: "Remoção de árvore caída após temporal.",
        prazo: 14,
        status: "Em andamento",
        responsavel: "Pedro Martins",
        contato: { nome: "Carlos Pereira", telefone: "(51) 9999-2222", email: "carlos@email.com", endereco: "Avenida Brasil, 456" }
    },
    {
        ID: "3",
        endereco: "Rua dos Pinheiros, 789, Marechal Rondon",
        descricao: "Análise de fitossanidade de ipê.",
        prazo: 30,
        status: "Concluído",
        responsavel: "Ana Costa",
        contato: { nome: "Lucia Almeida", telefone: "(51) 9999-3333", email: "lucia@email.com", endereco: "Rua dos Pinheiros, 789" }
    },
    {
        ID: "4", // ID único
        endereco: "Travessa Estrela, 10, Niterói",
        descricao: "Poda de contenção em sibipiruna.",
        prazo: 60,
        status: "Pendente",
        responsavel: "João Silva",
        contato: { nome: "Roberto Lima", telefone: "(51) 9999-4444", email: "roberto@email.com", endereco: "Travessa Estrela, 10" }
    },
    {
        ID: "5", // ID único
        endereco: "Rua da República, 20, Centro",
        descricao: "Avaliação de risco de queda de eucalipto.",
        prazo: 20,
        status: "Pendente",
        responsavel: "Mariana Dias",
        contato: { nome: "Fernanda Rocha", telefone: "(51) 9999-5555", email: "fernanda@email.com", endereco: "Rua da República, 20" }
    },
    {
        ID: "6", // ID único
        endereco: "Avenida Getúlio Vargas, 300, Centro",
        descricao: "Supressão de ligustro invasor.",
        prazo: 15,
        status: "Em andamento",
        responsavel: "Pedro Martins",
        contato: { nome: "José Santos", telefone: "(51) 9999-6666", email: "jose@email.com", endereco: "Avenida Getúlio Vargas, 300" }
    },
    {
        ID: "7", // ID único
        endereco: "Rua Sete de Setembro, 40, Igara",
        descricao: "Plantio de nova muda em calçada.",
        prazo: 10,
        status: "Concluído",
        responsavel: "Ana Costa",
        contato: { nome: "Beatriz Mello", telefone: "(51) 9999-7777", email: "beatriz@email.com", endereco: "Rua Sete de Setembro, 40" }
    }
];


export default function DemandasPage() {
    const [viewMode, setViewMode] = useState('card');
    const [filtro, setFiltro] = useState('');
    const [addModalOpen, setAddModalOpen] = useState(false);

    const demandasFiltradas = useMemo(() => {
        const filtroLowerCase = filtro.toLowerCase();

        if (!filtroLowerCase) {
            return demandas; // Se o filtro estiver vazio, retorna a lista completa
        }

        return demandas.filter(demanda =>
            demanda.endereco.toLowerCase().includes(filtroLowerCase) ||
            demanda.contato.nome.toLowerCase().includes(filtroLowerCase) ||
            demanda.descricao.toLowerCase().includes(filtroLowerCase)
        );
    }, [filtro]); // A lista só será recalculada se 'filtro' ou 'demandas' mudar


    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>Demandas Page</h1>

            <div>
                <Button
                    variant="contained"
                    sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#60b34e' } }}
                    // 3. Adicione o onClick para abrir o modal
                    onClick={() => setAddModalOpen(true)}
                >
                    Adicionar
                </Button>
                <Button
                    variant="contained" // Define o botão com um fundo sólido
                    sx={{
                        backgroundColor: '#257e1a', // Sua cor verde
                        '&:hover': {
                            backgroundColor: '#60b34e' // Uma cor um pouco mais escura para o efeito hover
                        }, mx: 1
                    }}
                >Importar em massa</Button>
                <Button
                    variant="contained"
                    sx={{
                        backgroundColor: '#257e1a',
                        '&:hover': {
                            backgroundColor: '#60b34e'
                        }, mx: 1
                    }}
                >Importar PDF</Button>
                <TextField
                    label="Filtrar por end, desc ou solicitante"
                    variant="outlined"
                    size="small"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    sx={{
                        flexGrow: 1,
                        maxWidth: 400,
                        // 1. Estilo para o label quando o campo está focado
                        '& label.Mui-focused': {
                            color: '#81C784',
                        },
                        // 2. Estilo para a borda do campo quando está focado
                        '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': {
                                borderColor: '#81C784',
                            },
                        },
                    }}
                />
                <IconButton
                    onClick={() => setViewMode('card')}
                    sx={{ color: viewMode === 'card' ? '#81C784' : 'default' }}
                >
                    <ViewModuleIcon />
                </IconButton>

                {/* Botão para visão de Lista */}
                <IconButton
                    onClick={() => setViewMode('list')}
                    sx={{ color: viewMode === 'list' ? '#81C784' : 'default' }}
                >
                    <ViewListIcon />
                </IconButton>
            </div>
            {demandasFiltradas.length > 0 ? (
                // Se houver demandas, mostre a visualização normal
                viewMode === 'card' ? (
                    <ListaCardDemanda demandas={demandasFiltradas} />
                ) : (
                    <ListaListDemanda demandas={demandasFiltradas} />
                )
            ) : (
                // Se NÃO houver demandas, mostre o estado vazio
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '50vh', // Ocupa uma boa parte da altura da tela
                        color: 'grey.600', // Um tom de cinza
                    }}
                >
                    <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h6">
                        Nenhuma demanda encontrada
                    </Typography>
                    <Typography variant="body2">
                        {filtro ? "Tente ajustar os termos da sua busca." : "Aguardando novas solicitações."}
                    </Typography>
                </Box>
            )}
            <AddDemandaModal
                open={addModalOpen}
                onClose={() => setAddModalOpen(false)}
            />
        </div>
    );
}
