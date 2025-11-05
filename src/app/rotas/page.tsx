// src/app/rotas/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, CircularProgress, Alert, Button,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ListaRotas from '@/components/ui/rotas/ListaRotas'; // Importa o novo componente

// Interface (sem alteração)
export interface RotaComContagem {
    id: number;
    nome: string;
    responsavel: string;
    status: string;
    data_rota: string | null;
    created_at: string;
    total_demandas: number;
}

export default function RotasPage() {
    const [rotas, setRotas] = useState<RotaComContagem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // --- ESTADOS DE DELEÇÃO ATUALIZADOS ---
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false);
    const [rotaParaDeletar, setRotaParaDeletar] = useState<RotaComContagem | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    // --- FIM DA ATUALIZAÇÃO ---

    // Função para buscar os dados da API (sem alteração)
    const fetchRotas = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/rotas');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            const data: RotaComContagem[] = await response.json();
            setRotas(data);
        } catch (err) {
            console.error("[PAGE /rotas] Falha ao buscar rotas:", err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar rotas.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRotas();
    }, []);

    // --- INÍCIO DA LÓGICA DE DELEÇÃO ---
    const iniciarDelecao = (id: number) => {
        const rota = rotas.find(r => r.id === id) || null;
        setRotaParaDeletar(rota);
        setDeleteError(null);
        setOpenDeleteConfirm(true); // Abre o modal de confirmação
    };

    const handleCloseDeleteConfirm = () => {
        setOpenDeleteConfirm(false);
        setDeleteError(null);
        setIsDeleting(false); // Garante que o estado de loading seja resetado
        // Reseta o item a ser deletado após a animação de fechar
        setTimeout(() => setRotaParaDeletar(null), 300); 
    };

    const confirmarDelecao = async () => {
        if (!rotaParaDeletar) return;

        setIsDeleting(true);
        setDeleteError(null);

        try {
            const response = await fetch(`/api/rotas/${rotaParaDeletar.id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status}`);
            }

            // Sucesso: remove a rota da lista local
            setRotas(prev => prev.filter(r => r.id !== rotaParaDeletar.id));
            handleCloseDeleteConfirm(); // Fecha o modal

        } catch (err) {
            console.error(`[PAGE /rotas] Falha ao deletar rota ${rotaParaDeletar.id}:`, err);
            setDeleteError(err instanceof Error ? err.message : 'Erro desconhecido.');
            // Mantém o modal aberto para mostrar o erro
        } finally {
            setIsDeleting(false);
        }
    };
    // --- FIM DA LÓGICA DE DELEÇÃO ---


    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>
                Rotas Criadas
            </h1>

            {/* Mensagens de Erro ou Loading (sem alteração) */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>Carregando rotas...</Typography>
                </Box>
            )}

            {!isLoading && error && (
                <Box sx={{ p: 2 }}>
                    <Alert severity="error">
                        Erro ao carregar rotas: {error}
                        <Button color="inherit" size="small" onClick={fetchRotas}>Tentar Novamente</Button>
                    </Alert>
                </Box>
            )}

            {/* Conteúdo Principal (Lista ou "Nenhum item") (sem alteração) */}
            {!isLoading && !error && (
                rotas.length > 0 ? (
                    <Box sx={{ p: 2 }}>
                        <ListaRotas rotas={rotas} onDelete={iniciarDelecao} />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'grey.600', mt: 4 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                        <Typography variant="h6">Nenhuma rota criada ainda.</Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                            Vá para a página de <a href="/demandas" style={{ color: '#1976d2', textDecoration: 'underline' }}>Demandas</a> para criar sua primeira rota.
                        </Typography>
                    </Box>
                )
            )}

            {/* --- NOVO MODAL DE CONFIRMAÇÃO DE DELEÇÃO --- */}
            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Você tem certeza que deseja excluir a rota:
                    </DialogContentText>
                    <Typography variant="h6" sx={{ my: 1, fontWeight: 'bold' }}>
                        {rotaParaDeletar?.nome || 'Rota desconhecida'} (ID: {rotaParaDeletar?.id})
                    </Typography>
                    <DialogContentText>
                        Todas as associações de demandas com esta rota serão perdidas.
                        Esta ação não pode ser desfeita.
                    </DialogContentText>
                    {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} disabled={isDeleting}>Cancelar</Button>
                    <Button onClick={confirmarDelecao} color="error" variant="contained" disabled={isDeleting}>
                        {isDeleting ? <CircularProgress size={24}/> : 'Excluir'}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* --- FIM DO NOVO MODAL --- */}

        </div>
    );
}