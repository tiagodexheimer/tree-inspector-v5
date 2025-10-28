// src/app/demandas/page.tsx
'use client';
import ListaCardDemanda from "@/components/ui/demandas/ListaCardDemanda"; //
import ListaListDemanda from "@/components/ui/demandas/ListaListDemanda"; //
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, IconButton, TextField, Typography, CircularProgress, Alert
} from "@mui/material"; // Adicionado CircularProgress, Alert
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useMemo, useState, useEffect } from "react";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteIcon from '@mui/icons-material/Delete'; // Ícone para o botão de deleção
import { DemandaType } from "@/types/demanda"; //
import AddDemandaModal from "@/components/ui/demandas/AddDemandaModal"; //
import CriarRotaModal from "@/components/ui/demandas/CriarRotaModal"; //

// Remover ou Comentar a constante de demandas de exemplo
/*
const demandasExemplo: DemandaType[] = [ ... ];
*/

export default function DemandasPage() {
    // Estados de UI e Modais
    const [viewMode, setViewMode] = useState('card');
    const [filtro, setFiltro] = useState('');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [criarRotaModalOpen, setCriarRotaModalOpen] = useState(false);
    const [confirmacaoRotaOpen, setConfirmacaoRotaOpen] = useState(false); // Renomeado para clareza
    const [nomeNovaRota, setNomeNovaRota] = useState('');

    // Estados de Dados e Seleção
    const [demandas, setDemandas] = useState<DemandaType[]>([]);
    const [selectedDemandas, setSelectedDemandas] = useState<number[]>([]);

    // Estados de Carregamento e Erro
    const [isLoading, setIsLoading] = useState<boolean>(true); // Carregamento inicial da lista
    const [error, setError] = useState<string | null>(null); // Erro geral (principalmente de busca)

    // Estados para Deleção
    const [demandaParaDeletar, setDemandaParaDeletar] = useState<number | null>(null); // ID da demanda a deletar (controla modal)
    const [isDeleting, setIsDeleting] = useState<boolean>(false); // Loading específico da deleção
    const [deleteError, setDeleteError] = useState<string | null>(null); // Erro específico da deleção

    // --- Busca Inicial de Dados ---
    useEffect(() => {
        fetchDemandas(); // Chama a função de busca ao montar
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Array vazio garante que rode apenas uma vez ao montar

    // --- Função para Buscar/Recarregar Demandas ---
    const fetchDemandas = async () => {
        console.log("[PAGE] Iniciando busca de demandas...");
        setIsLoading(true);
        setError(null);
        setDeleteError(null); // Limpa erro de deleção também
        try {
            const response = await fetch('/api/demandas'); // Chama o endpoint GET
            console.log("[PAGE] Resposta fetch GET:", response.status);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Erro ${response.status} ao buscar demandas.` }));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            const data: DemandaType[] = await response.json();
            console.log("[PAGE] Dados recebidos:", data);

            // Converte strings de data para objetos Date
            const demandasComDatas = data.map(d => ({
                ...d,
                prazo: d.prazo ? new Date(d.prazo) : null,
                // created_at: d.created_at ? new Date(d.created_at) : undefined, // Se necessário
            }));

            console.log("[PAGE] Demandas após conversão de data:", demandasComDatas);
            setDemandas(demandasComDatas);

        } catch (err) {
            console.error("[PAGE] Falha ao buscar demandas:", err);
            setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao carregar as demandas.');
        } finally {
            setIsLoading(false);
            console.log("[PAGE] Busca de demandas finalizada.");
        }
    };


    // --- Filtragem (baseada no estado 'demandas') ---
    const demandasFiltradas = useMemo(() => {
        const filtroLowerCase = filtro.toLowerCase();
        if (!filtroLowerCase) {
            return demandas;
        }
        return demandas.filter(demanda =>
            (demanda.logradouro && demanda.logradouro.toLowerCase().includes(filtroLowerCase)) || // Filtra por logradouro
            (demanda.bairro && demanda.bairro.toLowerCase().includes(filtroLowerCase)) || // Filtra por bairro
            (demanda.cidade && demanda.cidade.toLowerCase().includes(filtroLowerCase)) || // Filtra por cidade
            (demanda.cep && demanda.cep.includes(filtroLowerCase)) || // Filtra por cep
            (demanda.nome_solicitante && demanda.nome_solicitante.toLowerCase().includes(filtroLowerCase)) ||
            demanda.descricao.toLowerCase().includes(filtroLowerCase) ||
            (demanda.protocolo && demanda.protocolo.toLowerCase().includes(filtroLowerCase)) // Filtra por protocolo
        );
    }, [filtro, demandas]);

    // --- Handlers de Seleção ---
    const handleSelectDemanda = (id: number) => {
        setSelectedDemandas(prev =>
            prev.includes(id) ? prev.filter(demId => demId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedDemandas.length === demandasFiltradas.length) {
            setSelectedDemandas([]);
        } else {
            setSelectedDemandas(demandasFiltradas.map(d => d.id!));
        }
    };

    // --- Handlers de Rota ---
    const demandasParaRota = demandas.filter(d => d.id !== undefined && selectedDemandas.includes(d.id));

    const handleRotaCriada = (nomeRota: string, responsavel: string) => {
        console.log(`[PAGE] Rota "${nomeRota}" criada com responsável ${responsavel}`);
        setNomeNovaRota(nomeRota);
        setConfirmacaoRotaOpen(true);
        setSelectedDemandas([]);
    };

    // --- Handlers de Deleção ---
    const iniciarDelecao = (id: number) => {
        console.log(`[PAGE] Iniciando deleção para ID: ${id}`);
        setDeleteError(null); // Limpa erro anterior ao abrir modal
        setDemandaParaDeletar(id);
    };

    const confirmarDelecao = async () => {
        if (demandaParaDeletar === null) return;

        setIsDeleting(true);
        setDeleteError(null);
        const idToDelete = demandaParaDeletar;

        try {
            console.log(`[PAGE] Enviando DELETE para /api/demandas/${idToDelete}`);
            const response = await fetch(`/api/demandas/${idToDelete}`, { // Chama API de deleção
                method: 'DELETE',
            });
            console.log(`[PAGE] Resposta DELETE recebida. Status: ${response.status}`);

            const result = await response.json().catch(() => ({})); // Tenta pegar JSON, mesmo em erro 204

            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status} ao deletar demanda.`);
            }

            console.log(`[PAGE] Demanda ${idToDelete} deletada com sucesso.`);
            // Remove a demanda do estado local
            setDemandas(prevDemandas => prevDemandas.filter(d => d.id !== idToDelete));
            setSelectedDemandas(prev => prev.filter(selId => selId !== idToDelete));
            setDemandaParaDeletar(null); // Fecha o modal de confirmação

        } catch (err) {
            console.error("[PAGE] Falha ao deletar demanda:", err);
            setDeleteError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao deletar.');
            // O erro será mostrado dentro do modal de confirmação
        } finally {
            setIsDeleting(false);
            // Não fecha o modal aqui em caso de erro, para o user ver a msg
            // setDemandaParaDeletar(null);
        }
    };

    const cancelarDelecao = () => {
        setDemandaParaDeletar(null);
        setDeleteError(null); // Limpa erro ao cancelar
    };


    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>Demandas</h1>

            {/* Barra de Ações */}
            <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', borderBottom: '1px solid #ddd' }}>
                 <Button variant="contained" sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }} onClick={() => setAddModalOpen(true)}> Adicionar Demanda </Button>
                 <Button variant="contained" sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}>Importar em Massa</Button>
                 <Button variant="contained" sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}>Importar PDF</Button>
                 <TextField label="Filtrar por endereço, solicitante, protocolo..." variant="outlined" size="small" value={filtro} onChange={(e) => setFiltro(e.target.value)} sx={{ marginLeft: 'auto', minWidth: 300, '& label.Mui-focused': { color: '#81C784' }, '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#81C784' }, }, }} />
                 <IconButton onClick={() => setViewMode('card')} sx={{ color: viewMode === 'card' ? '#257e1a' : 'default' }} aria-label="Visualizar em cards"> <ViewModuleIcon /> </IconButton>
                 <IconButton onClick={() => setViewMode('list')} sx={{ color: viewMode === 'list' ? '#257e1a' : 'default' }} aria-label="Visualizar em lista"> <ViewListIcon /> </IconButton>
                 <Button variant="contained" disabled={selectedDemandas.length === 0} onClick={() => setCriarRotaModalOpen(true)} sx={{ backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#115293' } }}> Criar Rota ({selectedDemandas.length}) </Button>
            </Box>

           {/* Renderização Condicional */}
           {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>Carregando demandas...</Typography>
                </Box>
           ) : error ? ( // Mostra erro principal (de busca)
                <Box sx={{ p: 2 }}>
                    <Alert severity="error"> Erro ao carregar demandas: {error} <Button color="inherit" size="small" onClick={fetchDemandas} sx={{ ml: 2}}> Tentar Novamente </Button> </Alert>
                 </Box>
           ) : demandasFiltradas.length > 0 ? ( // Mostra lista/cards se houver dados
                viewMode === 'card' ? (
                    <ListaCardDemanda demandas={demandasFiltradas} selectedDemandas={selectedDemandas} onSelectDemanda={handleSelectDemanda} onDelete={iniciarDelecao} />
                ) : (
                    <ListaListDemanda demandas={demandasFiltradas} selectedDemandas={selectedDemandas} onSelectDemanda={handleSelectDemanda} onSelectAll={handleSelectAll} numSelected={selectedDemandas.length} rowCount={demandasFiltradas.length} onDelete={iniciarDelecao} />
                )
            ) : ( // Mensagem se não houver dados
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'grey.600', mt: 4 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h6"> {filtro ? 'Nenhuma demanda encontrada para o filtro atual.' : 'Nenhuma demanda cadastrada.'} </Typography>
                    {!filtro && <Button variant="contained" onClick={() => setAddModalOpen(true)} sx={{ mt: 2, backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}>Adicionar Primeira Demanda</Button>}
                </Box>
            )}

            {/* Modais */}
            <AddDemandaModal open={addModalOpen} onClose={() => { setAddModalOpen(false); fetchDemandas(); /* Recarrega ao fechar */ }} />
            <CriarRotaModal open={criarRotaModalOpen} onClose={() => setCriarRotaModalOpen(false)} demandasSelecionadas={demandasParaRota} onRotaCriada={handleRotaCriada} />
            <Dialog open={confirmacaoRotaOpen} onClose={() => setConfirmacaoRotaOpen(false)}> {/* Corrigido nome do estado */}
                 <DialogTitle>Sucesso!</DialogTitle>
                 <DialogContent><DialogContentText>A rota &quot;{nomeNovaRota}&quot; foi criada com sucesso!</DialogContentText></DialogContent>
                 <DialogActions><Button onClick={() => setConfirmacaoRotaOpen(false)} autoFocus>Fechar</Button></DialogActions>
            </Dialog>

            {/* Modal de Confirmação de Deleção */}
            <Dialog
                open={demandaParaDeletar !== null}
                onClose={cancelarDelecao} // Permite fechar clicando fora ou ESC
                aria-labelledby="confirm-delete-dialog-title"
                aria-describedby="confirm-delete-dialog-description"
            >
                <DialogTitle id="confirm-delete-dialog-title">Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText id="confirm-delete-dialog-description">
                        Tem a certeza que deseja excluir a demanda ID {demandaParaDeletar}? Esta ação não pode ser desfeita.
                    </DialogContentText>
                     {/* Mostra erro específico da deleção aqui, se houver */}
                     {deleteError && <Alert severity="error" sx={{ mt: 2 }}>Erro ao excluir: {deleteError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelarDelecao} disabled={isDeleting}>Cancelar</Button>
                    <Button onClick={confirmarDelecao} color="error" variant="contained" autoFocus disabled={isDeleting}>
                        {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Excluir'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}