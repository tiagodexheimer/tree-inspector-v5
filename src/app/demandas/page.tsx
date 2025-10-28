// src/app/demandas/page.tsx
'use client';
import ListaCardDemanda from "@/components/ui/demandas/ListaCardDemanda";
import ListaListDemanda from "@/components/ui/demandas/ListaListDemanda";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, TextField, Typography, CircularProgress, Alert } from "@mui/material"; // Adicionado CircularProgress, Alert
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useMemo, useState, useEffect } from "react"; // Adicionado useEffect
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DemandaType } from "@/types/demanda";
import AddDemandaModal from "@/components/ui/demandas/AddDemandaModal";
import CriarRotaModal from "@/components/ui/demandas/CriarRotaModal";

// REMOVER ou Comentar a constante de demandas de exemplo
/*
const demandasExemplo: DemandaType[] = [
    { id: 1, ... },
    { id: 2, ... },
    // ...
];
*/

export default function DemandasPage() {
    const [viewMode, setViewMode] = useState('card');
    const [filtro, setFiltro] = useState('');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [criarRotaModalOpen, setCriarRotaModalOpen] = useState(false);
    const [confirmacaoOpen, setConfirmacaoOpen] = useState(false);
    const [nomeNovaRota, setNomeNovaRota] = useState('');
    const [selectedDemandas, setSelectedDemandas] = useState<number[]>([]);

    // --- Novos Estados ---
    const [demandas, setDemandas] = useState<DemandaType[]>([]); // Estado para armazenar as demandas buscadas
    const [isLoading, setIsLoading] = useState<boolean>(true); // Estado para indicar carregamento inicial
    const [error, setError] = useState<string | null>(null); // Estado para mensagens de erro

    // --- Busca de Dados ---
    useEffect(() => {
        // Função async para buscar as demandas da API
        const fetchDemandas = async () => {
            setIsLoading(true); // Inicia o carregamento
            setError(null); // Limpa erros anteriores
            try {
                const response = await fetch('/api/demandas'); // Chama o endpoint GET
                if (!response.ok) {
                    throw new Error(`Erro ao buscar demandas: ${response.statusText}`);
                }
                const data: DemandaType[] = await response.json();

                // IMPORTANTE: Converter strings de data (se vierem como string da API) para objetos Date
                const demandasComDatas = data.map(d => ({
                    ...d,
                    // Garante que 'prazo' seja um objeto Date ou null
                    prazo: d.prazo ? new Date(d.prazo) : null,
                    // Se 'created_at' ou 'updated_at' forem usados, converta-os também
                    // created_at: d.created_at ? new Date(d.created_at) : undefined,
                    // updated_at: d.updated_at ? new Date(d.updated_at) : undefined,
                }));

                setDemandas(demandasComDatas); // Atualiza o estado com os dados

            } catch (err) {
                console.error("Falha ao buscar demandas:", err);
                setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao carregar as demandas.');
            } finally {
                setIsLoading(false); // Finaliza o carregamento
            }
        };

        fetchDemandas(); // Chama a função de busca ao montar o componente
        // O array vazio [] como segundo argumento garante que o useEffect rode apenas uma vez (ao montar)
    }, []);

    // --- Filtragem (agora usa o estado 'demandas') ---
    const demandasFiltradas = useMemo(() => {
        const filtroLowerCase = filtro.toLowerCase();
        if (!filtroLowerCase) {
            return demandas; // Usa o estado 'demandas'
        }
        return demandas.filter(demanda => // Usa o estado 'demandas'
            demanda.endereco.toLowerCase().includes(filtroLowerCase) ||
            (demanda.contato?.nome && demanda.contato.nome.toLowerCase().includes(filtroLowerCase)) || // Supondo que 'contato' ainda possa existir no tipo
             (demanda.nome_solicitante && demanda.nome_solicitante.toLowerCase().includes(filtroLowerCase)) || // Adiciona filtro por nome do solicitante
            demanda.descricao.toLowerCase().includes(filtroLowerCase)
        );
    }, [filtro, demandas]); // Recalcula quando o filtro OU as demandas mudarem

    // --- Handlers (sem alterações na lógica principal, mas agora operam sobre o estado 'demandas') ---
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

    const demandasParaRota = demandas.filter(d => d.id !== undefined && selectedDemandas.includes(d.id));

    const handleRotaCriada = (nomeRota: string, responsavel: string) => {
        console.log(`Rota "${nomeRota}" criada com responsável ${responsavel}`);
        setNomeNovaRota(nomeRota);
        setConfirmacaoOpen(true);
        setSelectedDemandas([]);
    };

    // --- Função para recarregar demandas (útil após adicionar uma nova) ---
     const recarregarDemandas = async () => {
        // Reutiliza a lógica de busca do useEffect
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/demandas');
            if (!response.ok) {
                throw new Error(`Erro ao recarregar demandas: ${response.statusText}`);
            }
            const data: DemandaType[] = await response.json();
            const demandasComDatas = data.map(d => ({
                ...d,
                prazo: d.prazo ? new Date(d.prazo) : null,
            }));
            setDemandas(demandasComDatas);
        } catch (err) {
            console.error("Falha ao recarregar demandas:", err);
            setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao recarregar.');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>Demandas</h1>

            {/* Barra de Ações */}
            <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', borderBottom: '1px solid #ddd' }}>
                 {/* Botão Adicionar agora abre o modal */}
                <Button
                    variant="contained"
                    sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
                    onClick={() => setAddModalOpen(true)}
                >
                    Adicionar Demanda
                </Button>
                 {/* Outros Botões */}
                <Button variant="contained" sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}>Importar em Massa</Button>
                <Button variant="contained" sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}>Importar PDF</Button>

                <TextField
                    label="Filtrar..."
                    variant="outlined" size="small" value={filtro} onChange={(e) => setFiltro(e.target.value)}
                    sx={{ marginLeft: 'auto', minWidth: 300, '& label.Mui-focused': { color: '#81C784' }, '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#81C784' }, }, }}
                />
                <IconButton onClick={() => setViewMode('card')} sx={{ color: viewMode === 'card' ? '#257e1a' : 'default' }} aria-label="Visualizar em cards"> <ViewModuleIcon /> </IconButton>
                <IconButton onClick={() => setViewMode('list')} sx={{ color: viewMode === 'list' ? '#257e1a' : 'default' }} aria-label="Visualizar em lista"> <ViewListIcon /> </IconButton>
                <Button variant="contained" disabled={selectedDemandas.length === 0} onClick={() => setCriarRotaModalOpen(true)} sx={{ backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#115293' } }}> Criar Rota ({selectedDemandas.length}) </Button>
            </Box>

           {/* Renderização Condicional Baseada no Carregamento e Erro */}
           {isLoading ? (
                // Indicador de Carregamento
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Carregando demandas...</Typography>
                </Box>
           ) : error ? (
                // Mensagem de Erro
                 <Box sx={{ p: 2 }}>
                    <Alert severity="error">
                        Erro ao carregar demandas: {error}
                         {/* Botão para tentar novamente */}
                         <Button color="inherit" size="small" onClick={recarregarDemandas} sx={{ ml: 2}}>
                           Tentar Novamente
                         </Button>
                    </Alert>
                 </Box>
           ) : demandasFiltradas.length > 0 ? (
                // Renderiza Lista ou Cards se houver dados
                viewMode === 'card' ? (
                    <ListaCardDemanda demandas={demandasFiltradas} selectedDemandas={selectedDemandas} onSelectDemanda={handleSelectDemanda} />
                ) : (
                    <ListaListDemanda demandas={demandasFiltradas} selectedDemandas={selectedDemandas} onSelectDemanda={handleSelectDemanda} onSelectAll={handleSelectAll} numSelected={selectedDemandas.length} rowCount={demandasFiltradas.length} />
                )
            ) : (
                // Mensagem de Nenhum Resultado
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'grey.600', mt: 4 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h6">
                        {filtro ? 'Nenhuma demanda encontrada para o filtro atual.' : 'Nenhuma demanda cadastrada.'}
                    </Typography>
                     {/* Botão para adicionar a primeira demanda se a lista estiver vazia */}
                     {!filtro && <Button variant="contained" onClick={() => setAddModalOpen(true)} sx={{ mt: 2, backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}>Adicionar Primeira Demanda</Button>}
                </Box>
            )}

            {/* Modais */}
            {/* Passa a função recarregarDemandas para o AddDemandaModal, se ele precisar atualizar a lista após salvar */}
            <AddDemandaModal open={addModalOpen} onClose={() => { setAddModalOpen(false); recarregarDemandas(); /* Recarrega ao fechar */ }} />
            <CriarRotaModal open={criarRotaModalOpen} onClose={() => setCriarRotaModalOpen(false)} demandasSelecionadas={demandasParaRota} onRotaCriada={handleRotaCriada} />
            <Dialog open={confirmacaoOpen} onClose={() => setConfirmacaoOpen(false)}>
                 <DialogTitle>Sucesso!</DialogTitle>
                 <DialogContent><DialogContentText>A rota &quot;{nomeNovaRota}&quot; foi criada com sucesso!</DialogContentText></DialogContent>
                 <DialogActions><Button onClick={() => setConfirmacaoOpen(false)} autoFocus>Fechar</Button></DialogActions>
            </Dialog>
        </div>
    );
}