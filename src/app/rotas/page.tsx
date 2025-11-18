'use client';

import React, { useState } from 'react';
import {
    Box, Typography, CircularProgress, Alert, Button,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ListaRotas from '@/components/ui/rotas/ListaRotas';

// Hooks
import { useRotasData } from '@/hooks/useRotasData';
import { useRotasOperations } from '@/hooks/useRotasOperations';

// Se você ainda não moveu a interface para um arquivo de tipos, defina-a aqui para exportação
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
    // 1. Estado de Dados (Hook de Leitura)
    const { rotas, isLoading, error, refresh, setRotas } = useRotasData();

    // 2. Estado Local de UI (Modais)
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [rotaParaDeletar, setRotaParaDeletar] = useState<RotaComContagem | null>(null);

    // 3. Estado de Operações (Hook de Escrita)
    const { deleteRota, isProcessing: isDeleting, opError: deleteError, clearError } = useRotasOperations();

    // Handlers de Interface
    const iniciarDelecao = (id: number) => {
        const rota = rotas.find(r => r.id === id) || null;
        if (rota) {
            setRotaParaDeletar(rota);
            clearError();
            setOpenDeleteConfirm(true);
        }
    };

    const handleCloseDeleteConfirm = () => {
        setOpenDeleteConfirm(false);
        setTimeout(() => {
            setRotaParaDeletar(null);
            clearError();
        }, 300);
    };

    const confirmarDelecao = async () => {
        if (!rotaParaDeletar) return;

        try {
            await deleteRota(rotaParaDeletar.id);
            // Atualização otimista ou recarga
            setRotas(prev => prev.filter(r => r.id !== rotaParaDeletar.id));
            handleCloseDeleteConfirm();
        } catch (error) {
            // O erro já está capturado no hook 'deleteError'
            // Mantemos o modal aberto para exibir o erro
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>
                Rotas Criadas
            </h1>

            {/* Estado de Carregamento */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>Carregando rotas...</Typography>
                </Box>
            )}

            {/* Estado de Erro de Carregamento */}
            {!isLoading && error && (
                <Box sx={{ p: 2 }}>
                    <Alert severity="error">
                        Erro ao carregar rotas: {error}
                        <Button color="inherit" size="small" onClick={refresh}>Tentar Novamente</Button>
                    </Alert>
                </Box>
            )}

            {/* Lista de Rotas */}
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

            {/* Modal de Confirmação de Deleção */}
            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Você tem certeza que deseja excluir a rota:
                    </DialogContentText>
                    <Typography variant="h6" sx={{ my: 1, fontWeight: 'bold' }}>
                        {rotaParaDeletar?.nome} (ID: {rotaParaDeletar?.id})
                    </Typography>
                    <DialogContentText>
                        Todas as associações de demandas com esta rota serão perdidas.
                        Esta ação não pode ser desfeita.
                    </DialogContentText>
                    
                    {/* Exibe erro da operação de deleção, se houver */}
                    {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} disabled={isDeleting}>Cancelar</Button>
                    <Button onClick={confirmarDelecao} color="error" variant="contained" disabled={isDeleting}>
                        {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Excluir'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}