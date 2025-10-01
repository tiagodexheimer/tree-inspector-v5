'use client';

import ListaCardDemanda from "@/componets/ListaCardDemanda";
import ListaListDemanda from "@/componets/ListaListDemanda";
import { 
    Box, 
    Button, 
    IconButton, 
    TextField, 
    Typography, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogContentText, 
    DialogActions 
} from "@mui/material";
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useMemo, useState } from "react";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DemandaType } from "@/types/demanda";
import AddDemandaModal from "@/componets/AddDemandaModal";
import CriarRotaModal from "@/componets/CriarRotaModal";

// Dados de exemplo para a página
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
    { ID: "4", endereco: "Travessa Estrela, 10, Niterói", descricao: "Poda de contenção em sibipiruna.", prazo: 60, status: "Pendente", responsavel: "João Silva", contato: { nome: "Roberto Lima", telefone: "(51) 9999-4444", email: "roberto@email.com", endereco: "Travessa Estrela, 10" }},
    { ID: "5", endereco: "Rua da República, 20, Centro", descricao: "Avaliação de risco de queda de eucalipto.", prazo: 20, status: "Pendente", responsavel: "Mariana Dias", contato: { nome: "Fernanda Rocha", telefone: "(51) 9999-5555", email: "fernanda@email.com", endereco: "Rua da República, 20" }},
    { ID: "6", endereco: "Avenida Getúlio Vargas, 300, Centro", descricao: "Supressão de ligustro invasor.", prazo: 15, status: "Em andamento", responsavel: "Pedro Martins", contato: { nome: "José Santos", telefone: "(51) 9999-6666", email: "jose@email.com", endereco: "Avenida Getúlio Vargas, 300" }},
    { ID: "7", endereco: "Rua Sete de Setembro, 40, Igara", descricao: "Plantio de nova muda em calçada.", prazo: 10, status: "Concluído", responsavel: "Ana Costa", contato: { nome: "Beatriz Mello", telefone: "(51) 9999-7777", email: "beatriz@email.com", endereco: "Rua Sete de Setembro, 40" }}
];


export default function DemandasPage() {
    // Estados para controlar a UI
    const [viewMode, setViewMode] = useState('card');
    const [filtro, setFiltro] = useState('');
    const [addModalOpen, setAddModalOpen] = useState(false);
    
    // Estados para a nova funcionalidade de criação de rotas
    const [criarRotaModalOpen, setCriarRotaModalOpen] = useState(false);
    const [confirmacaoOpen, setConfirmacaoOpen] = useState(false);
    const [nomeNovaRota, setNomeNovaRota] = useState('');
    const [selectedDemandas, setSelectedDemandas] = useState<string[]>([]);

    // Filtra as demandas com base na busca do usuário
    const demandasFiltradas = useMemo(() => {
        const filtroLowerCase = filtro.toLowerCase();
        if (!filtroLowerCase) return demandas;
        return demandas.filter(demanda =>
            demanda.endereco.toLowerCase().includes(filtroLowerCase) ||
            demanda.contato.nome.toLowerCase().includes(filtroLowerCase) ||
            demanda.descricao.toLowerCase().includes(filtroLowerCase)
        );
    }, [filtro]);

    // Adiciona ou remove o ID de uma demanda da lista de selecionados
    const handleSelectDemanda = (id: string) => {
        setSelectedDemandas(prev =>
            prev.includes(id) ? prev.filter(demId => demId !== id) : [...prev, id]
        );
    };

    // Seleciona ou deseleciona todas as demandas visíveis
    const handleSelectAll = () => {
        if (selectedDemandas.length === demandasFiltradas.length) {
            setSelectedDemandas([]);
        } else {
            setSelectedDemandas(demandasFiltradas.map(d => d.ID));
        }
    };
    
    // Pega os objetos completos das demandas que foram selecionadas
    const demandasParaRota = demandas.filter(d => selectedDemandas.includes(d.ID));

    // Ação executada quando o modal de rotas confirma a criação
    const handleRotaCriada = (nomeRota: string) => {
        setNomeNovaRota(nomeRota); // Salva o nome para exibir na confirmação
        setConfirmacaoOpen(true);  // Abre o modal de sucesso
        setSelectedDemandas([]);   // Limpa a seleção de demandas
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>Demandas</h1>
            
            <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                 <Button
                    variant="contained"
                    sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#60b34e' } }}
                    onClick={() => setAddModalOpen(true)}
                >
                    Adicionar
                </Button>
                
                {/* Botão para criar a rota, habilitado apenas quando há demandas selecionadas */}
                <Button
                    variant="contained"
                    disabled={selectedDemandas.length === 0}
                    onClick={() => setCriarRotaModalOpen(true)}
                >
                    Criar Rota ({selectedDemandas.length})
                </Button>

                <TextField
                    label="Filtrar por end, desc ou solicitante"
                    variant="outlined"
                    size="small"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    sx={{ flexGrow: 1, maxWidth: 400 }}
                />
                <IconButton onClick={() => setViewMode('card')} color={viewMode === 'card' ? 'primary' : 'default'}><ViewModuleIcon /></IconButton>
                <IconButton onClick={() => setViewMode('list')} color={viewMode === 'list' ? 'primary' : 'default'}><ViewListIcon /></IconButton>
            </Box>

            {/* Renderização condicional da lista ou do estado vazio */}
            {demandasFiltradas.length > 0 ? (
                viewMode === 'card' ? (
                    <ListaCardDemanda
                        demandas={demandasFiltradas}
                        selectedDemandas={selectedDemandas}
                        onSelectDemanda={handleSelectDemanda}
                    />
                ) : (
                    <ListaListDemanda
                        demandas={demandasFiltradas}
                        selectedDemandas={selectedDemandas}
                        onSelectDemanda={handleSelectDemanda}
                        onSelectAll={handleSelectAll}
                        numSelected={selectedDemandas.length}
                        rowCount={demandasFiltradas.length}
                    />
                )
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'grey.600' }}>
                    <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h6">Nenhuma demanda encontrada</Typography>
                    <Typography variant="body2">{filtro ? "Tente ajustar os termos da sua busca." : "Aguardando novas solicitações."}</Typography>
                </Box>
            )}

            {/* Modais da página */}
            <AddDemandaModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
            
            <CriarRotaModal 
                open={criarRotaModalOpen}
                onClose={() => setCriarRotaModalOpen(false)}
                demandasSelecionadas={demandasParaRota}
                onRotaCriada={handleRotaCriada}
            />

            <Dialog open={confirmacaoOpen} onClose={() => setConfirmacaoOpen(false)}>
                <DialogTitle>Sucesso!</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        A rota &quot;{nomeNovaRota}&quot; foi criada com sucesso!
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmacaoOpen(false)} autoFocus>Fechar</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}