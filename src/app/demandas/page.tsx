// src/app/demandas/page.tsx
'use client';
import ListaCardDemanda from "@/components/ui/demandas/ListaCardDemanda";
import ListaListDemanda from "@/components/ui/demandas/ListaListDemanda";
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, IconButton, TextField, Typography, CircularProgress, Alert,
    // --- Importações para Filtros ---
    FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText, SelectChangeEvent
} from "@mui/material";
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useMemo, useState, useEffect } from "react";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DemandaType } from "@/types/demanda"; // Mantém para props de AddDemandaModal
import AddDemandaModal from "@/components/ui/demandas/AddDemandaModal";
import CriarRotaModal from "@/components/ui/demandas/CriarRotaModal";
// --- NOVAS IMPORTAÇÕES ---
import Link from 'next/link'; // Importa o Link do Next.js
import UploadFileIcon from '@mui/icons-material/UploadFile'; // Ícone para importação
// --- FIM NOVAS IMPORTAÇÕES ---


// Interface para o tipo Status vindo da API
interface StatusOption {
    id: number;
    nome: string;
    cor: string;
}

// Interface para o tipo de Demanda (Tipo) vindo da API
interface TipoDemandaOption {
    id: number;
    nome: string;
}

// Interface atualizada para DemandaType para incluir id_status
interface DemandaComIdStatus extends DemandaType {
    id_status?: number | null;
    // Campos opcionais que podem vir do JOIN na API GET
    status_nome?: string;
    status_cor?: string;
}

// Constantes para o Select múltiplo
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export default function DemandasPage() {
    // --- Estados ---
    const [viewMode, setViewMode] = useState('card');
    const [filtro, setFiltro] = useState(''); // Filtro de texto geral
    const [filtroStatusIds, setFiltroStatusIds] = useState<number[]>([]); // Filtro de Status (IDs)
    const [filtroTipoNomes, setFiltroTipoNomes] = useState<string[]>([]); // Filtro de Tipo (Nomes)

    const [demandas, setDemandas] = useState<DemandaComIdStatus[]>([]); // Lista principal de demandas
    const [selectedDemandas, setSelectedDemandas] = useState<number[]>([]); // IDs das demandas selecionadas

    // Estados de Carregamento e Erro
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null); // Erro ao buscar demandas
    const [availableStatus, setAvailableStatus] = useState<StatusOption[]>([]); // Status disponíveis para filtros/dropdowns
    const [statusError, setStatusError] = useState<string | null>(null); // Erro ao buscar status
    const [availableTipos, setAvailableTipos] = useState<TipoDemandaOption[]>([]); // Tipos disponíveis para filtros/dropdowns
    const [tiposError, setTiposError] = useState<string | null>(null); // Erro ao buscar tipos
    const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null); // Erro ao tentar atualizar status de uma demanda

    // Estados dos Modais e Ações
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [demandaParaEditar, setDemandaParaEditar] = useState<DemandaComIdStatus | null>(null);
    const [demandaParaDeletar, setDemandaParaDeletar] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false); // Adicionado estado para o modal de confirmação de deleção
    const [criarRotaModalOpen, setCriarRotaModalOpen] = useState(false);
    const [confirmacaoRotaOpen, setConfirmacaoRotaOpen] = useState(false);
    const [nomeNovaRota, setNomeNovaRota] = useState('');

    // --- Busca Inicial de Dados ---
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        setError(null);
        setStatusError(null);
        setTiposError(null);
        try {
            // Busca dados em paralelo
            const fetchStatusPromise = fetch('/api/demandas-status').then(res => res.ok ? res.json() : Promise.reject(new Error('Falha ao buscar status.')));
            const fetchTiposPromise = fetch('/api/demandas-tipos').then(res => res.ok ? res.json() : Promise.reject(new Error('Falha ao buscar tipos.')));
            const fetchDemandasPromise = fetch('/api/demandas').then(res => res.ok ? res.json() : Promise.reject(new Error('Falha ao buscar demandas.')));

            const [statusData, tiposData, demandasData] = await Promise.all([
                fetchStatusPromise,
                fetchTiposPromise,
                fetchDemandasPromise
            ]);

            console.log("[PAGE] Status recebidos:", statusData);
            setAvailableStatus(statusData);

            console.log("[PAGE] Tipos recebidos:", tiposData);
            setAvailableTipos(tiposData);

            console.log("[PAGE] Demandas recebidas:", demandasData);
            // Processa as demandas recebidas (converte data, etc.)
            const demandasComDatas = demandasData.map((d: DemandaComIdStatus) => ({
                ...d,
                prazo: d.prazo ? new Date(d.prazo) : null,
            }));
            setDemandas(demandasComDatas);

        } catch (err) {
            console.error("[PAGE] Falha ao buscar dados iniciais:", err);
            // Define o erro específico ou geral
            if (err instanceof Error) {
                if (err.message.includes('status')) setStatusError(err.message);
                else if (err.message.includes('tipos')) setTiposError(err.message);
                else setError(err.message);
            } else {
                 setError('Erro desconhecido ao carregar dados.');
            }
        } finally {
            setIsLoading(false);
        }
    };

     // Função para Recarregar apenas as Demandas (após CRUD)
     const fetchDemandas = async () => {
        // Limpa erros relacionados à lista antes de buscar
        setError(null);
        setDeleteError(null);
        setStatusUpdateError(null);
        console.log("[PAGE] Recarregando demandas...");
        try {
            const response = await fetch('/api/demandas');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            const data: DemandaComIdStatus[] = await response.json();
            const demandasComDatas = data.map(d => ({ ...d, prazo: d.prazo ? new Date(d.prazo) : null }));
            setDemandas(demandasComDatas);
        } catch (err) {
            console.error("[PAGE] Falha ao recarregar demandas:", err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido ao recarregar demandas.');
        } finally {
             console.log("[PAGE] Recarga de demandas finalizada.");
        }
     };

    // --- Lógica de Filtragem (considera todos os filtros) ---
    const demandasFiltradas = useMemo(() => {
        const filtroLowerCase = filtro.toLowerCase().trim();
        // Cria um mapa para buscar nome do status pelo ID rapidamente
        const statusMap = availableStatus.reduce((acc, status) => {
             acc[status.id] = status.nome.toLowerCase();
             return acc;
         }, {} as Record<number, string>);

        return demandas.filter(demanda => {
            // 1. Verifica Filtro de Status (por ID)
            const statusMatch = filtroStatusIds.length === 0 || (demanda.id_status != null && filtroStatusIds.includes(demanda.id_status));

            // 2. Verifica Filtro de Tipo (por Nome)
            const tipoMatch = filtroTipoNomes.length === 0 || (demanda.tipo_demanda && filtroTipoNomes.includes(demanda.tipo_demanda));

            // Se não passar nos filtros de select, já descarta
            if (!statusMatch || !tipoMatch) {
                return false;
            }

            // 3. Se passou nos selects e não há filtro de texto, inclui
            if (!filtroLowerCase) {
                return true;
            }

            // 4. Verifica Filtro de Texto (se passou nos selects)
            const statusNome = demanda.id_status ? statusMap[demanda.id_status] : '';
            return (
                (demanda.logradouro && demanda.logradouro.toLowerCase().includes(filtroLowerCase)) ||
                (demanda.bairro && demanda.bairro.toLowerCase().includes(filtroLowerCase)) ||
                (demanda.cidade && demanda.cidade.toLowerCase().includes(filtroLowerCase)) ||
                (demanda.cep && demanda.cep.includes(filtroLowerCase)) ||
                (demanda.nome_solicitante && demanda.nome_solicitante.toLowerCase().includes(filtroLowerCase)) ||
                demanda.descricao.toLowerCase().includes(filtroLowerCase) ||
                (demanda.protocolo && demanda.protocolo.toLowerCase().includes(filtroLowerCase)) ||
                (statusNome && statusNome.includes(filtroLowerCase)) || // Busca no nome do status
                (demanda.tipo_demanda && demanda.tipo_demanda.toLowerCase().includes(filtroLowerCase)) // Busca no tipo
            );
        });
    }, [filtro, demandas, availableStatus, filtroStatusIds, availableTipos, filtroTipoNomes]); // Inclui todas as dependências


    // --- Handlers ---
    const handleSelectDemanda = (id: number) => {
         setSelectedDemandas(prev =>
            prev.includes(id) ? prev.filter(demId => demId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
         setSelectedDemandas(prev =>
            prev.length === demandasFiltradas.length ? [] : demandasFiltradas.map(d => d.id!)
         );
    };

    const demandasParaRota = useMemo(() =>
        demandas.filter(d => d.id !== undefined && selectedDemandas.includes(d.id)),
        [demandas, selectedDemandas]
    );


    const handleRotaCriada = (nomeRota: string, responsavel: string) => {
        console.log(`[PAGE] Rota "${nomeRota}" criada com responsável ${responsavel}`);
        setNomeNovaRota(nomeRota);
        setConfirmacaoRotaOpen(true);
        setSelectedDemandas([]); // Limpa seleção após criar rota
    };

    const iniciarDelecao = (id: number) => {
        setDeleteError(null);
        setDemandaParaDeletar(id);
        setOpenDeleteConfirm(true); // Abre modal de confirmação
    };

    const confirmarDelecao = async () => {
         if (demandaParaDeletar === null) return;
        setIsDeleting(true);
        setDeleteError(null);
        const idToDelete = demandaParaDeletar;
        try {
            const response = await fetch(`/api/demandas/${idToDelete}`, { method: 'DELETE' });
            const result = await response.json().catch(() => ({})); // Captura JSON mesmo em erro
            if (!response.ok) { throw new Error(result.message || `Erro ${response.status} ao deletar.`); }
            console.log(`[PAGE] Demanda ${idToDelete} deletada.`);
            // Atualiza estado local removendo a demanda
            setDemandas(prevDemandas => prevDemandas.filter(d => d.id !== idToDelete));
            // Remove da seleção se estava selecionada
            setSelectedDemandas(prev => prev.filter(selId => selId !== idToDelete));
            handleCloseDeleteConfirm(); // Fecha modal
        } catch (err) {
            console.error("[PAGE] Falha ao deletar demanda:", err);
            setDeleteError(err instanceof Error ? err.message : 'Erro desconhecido ao deletar.');
            // Mantém modal aberto para mostrar erro
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelarDelecao = () => {
        handleCloseDeleteConfirm(); // Apenas fecha o modal
    };
    // Função para fechar o modal de confirmação de deleção
    const handleCloseDeleteConfirm = () => {
         setOpenDeleteConfirm(false);
         // Atraso leve para limpar o estado e evitar "piscar" do nome no modal
         setTimeout(() => {
             setDemandaParaDeletar(null);
             setDeleteError(null); // Limpa erro ao fechar
             setIsDeleting(false); // Garante reset do loading
         }, 300);
    };


    const iniciarEdicao = (demanda: DemandaComIdStatus) => {
        setDemandaParaEditar(demanda);
        setEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        // Atraso para limpar e evitar "piscar" de dados antigos no modal
        setTimeout(() => setDemandaParaEditar(null), 300);
    };

    const handleDemandaEditada = () => {
        console.log("[PAGE] Edição concluída. Recarregando demandas...");
        handleCloseEditModal();
        fetchDemandas(); // Recarrega a lista de demandas
    };

    const handleStatusChange = async (demandaId: number, newStatusId: number): Promise<void> => {
        console.log(`[PAGE] Tentando atualizar id_status da demanda ${demandaId} para ${newStatusId}`);
        setStatusUpdateError(null);
        const originalDemandas = [...demandas]; // Guarda estado original para reversão
        // Atualização Otimista
        setDemandas(prevDemandas =>
            prevDemandas.map(d =>
                d.id === demandaId ? { ...d, id_status: newStatusId } : d
            )
        );
        try {
            const response = await fetch(`/api/demandas/${demandaId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_status: newStatusId }), // Envia o ID do status
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.message || result.error || `Erro ${response.status} ao atualizar status.`);
            }
            console.log(`[PAGE] Status da demanda ${demandaId} atualizado com sucesso no backend.`);
            // Sucesso - a UI já foi atualizada otimisticamente
        } catch (err) {
            console.error("[PAGE] Falha ao atualizar status:", err);
            setStatusUpdateError(err instanceof Error ? err.message : 'Erro ao atualizar status.');
            // Reverte a mudança otimista em caso de erro
            setDemandas(originalDemandas);
            // Re-lança o erro para o componente StatusDemanda mostrar o erro localmente
            throw err;
        }
    };

    // Handler para mudança no Select de Status
    const handleFiltroStatusChange = (event: SelectChangeEvent<number[]>) => {
        const { target: { value } } = event;
        // Garante que o valor seja sempre um array de números
        const newSelectedIds = typeof value === 'string' ? value.split(',').map(Number) : value;
        setFiltroStatusIds(newSelectedIds);
    };

    // Handler para mudança no Select de Tipo
    const handleFiltroTipoChange = (event: SelectChangeEvent<string[]>) => {
        const { target: { value } } = event;
         // Garante que o valor seja sempre um array de strings
        const newSelectedNames = typeof value === 'string' ? value.split(',') : value;
        setFiltroTipoNomes(newSelectedNames);
    };

    // --- Renderização ---
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>Demandas</h1>

            {/* Barra de Ações */}
            <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', borderBottom: '1px solid #ddd' }}> {/* Ajuste no gap */}
                 {/* Botão Adicionar Demanda */}
                 <Button variant="contained" sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }} onClick={() => setAddModalOpen(true)}> Adicionar Demanda </Button>

                 {/* Botão Importar Planilha - CORRIGIDO */}
                 <Button
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    sx={{ color: '#555', borderColor: '#ccc', '&:hover': { borderColor: '#aaa', backgroundColor: 'rgba(0,0,0,0.04)' } }}
                    component={Link} // Usa o componente Link do Next.js
                    href="/demandas/importar" // Passa o href diretamente
                >
                    Importar Planilha
                </Button>

                 {/* Filtro Status */}
                 <FormControl sx={{ minWidth: 180 }} size="small">
                    <InputLabel id="filtro-status-label">Status</InputLabel>
                    <Select
                        labelId="filtro-status-label"
                        multiple
                        value={filtroStatusIds}
                        onChange={handleFiltroStatusChange}
                        input={<OutlinedInput label="Status" />}
                        renderValue={(selectedIds) => selectedIds.length === 0 ? <em>Todos Status</em> : availableStatus.filter(s => selectedIds.includes(s.id)).map(s => s.nome).join(', ')}
                        MenuProps={MenuProps}
                        disabled={availableStatus.length === 0}
                    >
                         <MenuItem value={-1} onClick={() => setFiltroStatusIds([])}><Checkbox checked={filtroStatusIds.length === 0} readOnly /><ListItemText primary="Todos Status" /></MenuItem>
                         {availableStatus.map((status) => (<MenuItem key={status.id} value={status.id}><Checkbox checked={filtroStatusIds.includes(status.id)} /><Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: status.cor, mr: 1, border: '1px solid #ccc' }} /><ListItemText primary={status.nome} /></MenuItem>))}
                         {statusError && <MenuItem disabled>Erro ao carregar</MenuItem>}
                    </Select>
                 </FormControl>

                 {/* Filtro Tipo */}
                  <FormControl sx={{ minWidth: 180 }} size="small">
                    <InputLabel id="filtro-tipo-label">Tipo</InputLabel>
                    <Select
                        labelId="filtro-tipo-label"
                        multiple
                        value={filtroTipoNomes}
                        onChange={handleFiltroTipoChange}
                        input={<OutlinedInput label="Tipo" />}
                        renderValue={(selectedNames) => selectedNames.length === 0 ? <em>Todos Tipos</em> : selectedNames.join(', ')}
                        MenuProps={MenuProps}
                        disabled={availableTipos.length === 0}
                    >
                         <MenuItem value="" onClick={() => setFiltroTipoNomes([])}><Checkbox checked={filtroTipoNomes.length === 0} readOnly /><ListItemText primary="Todos Tipos" /></MenuItem>
                         {availableTipos.map((tipo) => (<MenuItem key={tipo.id} value={tipo.nome}><Checkbox checked={filtroTipoNomes.includes(tipo.nome)} /><ListItemText primary={tipo.nome} /></MenuItem>))}
                         {tiposError && <MenuItem disabled>Erro ao carregar</MenuItem>}
                    </Select>
                 </FormControl>

                 {/* Filtro Texto e Botões de Visualização/Rota (no final) */}
                 <TextField label="Buscar..." variant="outlined" size="small" value={filtro} onChange={(e) => setFiltro(e.target.value)} sx={{ marginLeft: 'auto', minWidth: 250 }} />
                 <IconButton onClick={() => setViewMode('card')} title="Visualizar em Cards" sx={{ color: viewMode === 'card' ? '#257e1a' : 'default' }}> <ViewModuleIcon /> </IconButton>
                 <IconButton onClick={() => setViewMode('list')} title="Visualizar em Lista" sx={{ color: viewMode === 'list' ? '#257e1a' : 'default' }}> <ViewListIcon /> </IconButton>
                 <Button variant="contained" disabled={selectedDemandas.length === 0} onClick={() => setCriarRotaModalOpen(true)} sx={{ backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#115293' } }}> Criar Rota ({selectedDemandas.length}) </Button>
            </Box>

            {/* Mensagens de Erro Globais */}
             {statusError && <Box sx={{ p: 2 }}><Alert severity="warning">Erro ao carregar opções de status: {statusError}</Alert></Box>}
             {tiposError && <Box sx={{ p: 2 }}><Alert severity="warning">Erro ao carregar opções de tipo: {tiposError}</Alert></Box>}
             {statusUpdateError && <Box sx={{ p: 2 }}><Alert severity="error" onClose={() => setStatusUpdateError(null)}>Erro ao atualizar status: {statusUpdateError}</Alert></Box>}
             {error && <Box sx={{ p: 2 }}><Alert severity="error">Erro ao carregar demandas: {error} <Button color="inherit" size="small" onClick={fetchDemandas}>Tentar Novamente</Button></Alert></Box>}


           {/* Renderização Condicional da Lista/Cards */}
           {isLoading ? (
                 <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                     <CircularProgress /> <Typography sx={{ ml: 2 }}>Carregando demandas...</Typography>
                 </Box>
           ) : !error && demandasFiltradas.length > 0 ? ( // Só renderiza listas se não houver erro E houver demandas filtradas
                viewMode === 'card' ? (
                    <ListaCardDemanda demandas={demandasFiltradas} selectedDemandas={selectedDemandas} onSelectDemanda={handleSelectDemanda} onDelete={iniciarDelecao} onEdit={iniciarEdicao} onStatusChange={handleStatusChange} availableStatus={availableStatus} />
                ) : (
                    <ListaListDemanda demandas={demandasFiltradas} selectedDemandas={selectedDemandas} onSelectDemanda={handleSelectDemanda} onSelectAll={handleSelectAll} numSelected={selectedDemandas.length} rowCount={demandasFiltradas.length} onDelete={iniciarDelecao} onEdit={iniciarEdicao} onStatusChange={handleStatusChange} availableStatus={availableStatus} />
                )
            ) : !error ? ( // Nenhuma demanda encontrada (e sem erro geral)
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'grey.600', mt: 4 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h6">
                        {(filtro || filtroStatusIds.length > 0 || filtroTipoNomes.length > 0)
                            ? 'Nenhuma demanda encontrada para os filtros atuais.'
                            : 'Nenhuma demanda cadastrada.'}
                    </Typography>
                    {/* Botão para adicionar só aparece se não houver filtros aplicados */}
                    {!(filtro || filtroStatusIds.length > 0 || filtroTipoNomes.length > 0) &&
                        <Button variant="contained" onClick={() => setAddModalOpen(true)} sx={{ mt: 2, backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}>
                            Adicionar Primeira Demanda
                        </Button>
                    }
                </Box>
            ) : null /* Não renderiza nada se houver erro geral (já mostrado acima) */ }

            {/* Modais */}
            <AddDemandaModal open={addModalOpen} onClose={() => { setAddModalOpen(false); fetchDemandas(); }} availableTipos={availableTipos} />
            {demandaParaEditar && ( <AddDemandaModal key={demandaParaEditar.id} open={editModalOpen} onClose={handleCloseEditModal} demandaInicial={demandaParaEditar} onSuccess={handleDemandaEditada} availableTipos={availableTipos} /> )}
            <CriarRotaModal open={criarRotaModalOpen} onClose={() => setCriarRotaModalOpen(false)} demandasSelecionadas={demandasParaRota} onRotaCriada={handleRotaCriada} />
            <Dialog open={confirmacaoRotaOpen} onClose={() => setConfirmacaoRotaOpen(false)}><DialogTitle>Sucesso!</DialogTitle><DialogContent><DialogContentText>A rota &quot;{nomeNovaRota}&quot; foi criada!</DialogContentText></DialogContent><DialogActions><Button onClick={() => setConfirmacaoRotaOpen(false)} autoFocus>Fechar</Button></DialogActions></Dialog>
            {/* Modal Confirmação Deleção */}
            <Dialog open={openDeleteConfirm} onClose={cancelarDelecao}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText> Excluir demanda ID {demandaParaDeletar}? Esta ação não pode ser desfeita. </DialogContentText>
                    {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelarDelecao} disabled={isDeleting}>Cancelar</Button>
                    <Button onClick={confirmarDelecao} color="error" variant="contained" disabled={isDeleting}>{isDeleting ? <CircularProgress size={24}/> : 'Excluir'}</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}