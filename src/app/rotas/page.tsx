'use client';

import React, { useState } from 'react';
import {
    Box, Typography, Alert, Button,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
// 1. Importar dynamic
import dynamic from 'next/dynamic';

// 2. Importar o Skeleton
import RotasSkeleton from '@/components/ui/rotas/RotasSkeleton';

// Hooks e Tipos
import { useRotasData } from '@/hooks/useRotasData';
import { useRotasOperations } from '@/hooks/useRotasOperations';
import { RotaComContagem } from '@/services/client/rotas-client';

// 3. Importação Dinâmica do Componente Pesado (DataGrid)
// O loading aqui serve para quando o bundle JS está sendo baixado, não necessariamente os dados
const ListaRotas = dynamic(() => import('@/components/ui/rotas/ListaRotas'), {
    loading: () => <RotasSkeleton />,
    ssr: false // DataGrid geralmente é client-side only
});

export default function RotasPage() {
    // Hooks de Dados e Operações
    const { rotas, isLoading, error, refresh, setRotas } = useRotasData();
    
    // Estado Local de UI (Modais)
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [rotaParaDeletar, setRotaParaDeletar] = useState<RotaComContagem | null>(null);

    // Estado de Operações (Escrita)
    const { deleteRota, isProcessing: isDeleting, opError: deleteError, clearError } = useRotasOperations();

    // Handlers
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
            setRotas(prev => prev.filter(r => r.id !== rotaParaDeletar.id));
            handleCloseDeleteConfirm();
        } catch (error) {
            // Erro capturado no hook
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>
                Rotas Criadas
            </h1>

            {/* Tratamento de Erro */}
            {error && (
                <Box sx={{ p: 2 }}>
                    <Alert severity="error">
                        Erro ao carregar rotas: {error}
                        <Button color="inherit" size="small" onClick={refresh}>Tentar Novamente</Button>
                    </Alert>
                </Box>
            )}

            {/* 4. Renderização Condicional Otimizada:
               Se isLoading -> Skeleton
               Se não tem dados -> Empty State
               Se tem dados -> Lista (Carregada dinamicamente)
            */}
            {isLoading ? (
                <Box sx={{ p: 2 }}>
                    <RotasSkeleton />
                </Box>
            ) : (
                rotas.length > 0 ? (
                    <Box sx={{ p: 2 }}>
                        <ListaRotas rotas={rotas} onDelete={iniciarDelecao} />
                    </Box>
                ) : !error && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'grey.600', mt: 4 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                        <Typography variant="h6">Nenhuma rota criada ainda.</Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                            Vá para a página de <a href="/demandas" style={{ color: '#1976d2', textDecoration: 'underline' }}>Demandas</a> para criar sua primeira rota.
                        </Typography>
                    </Box>
                )
            )}

            {/* Modal de Confirmação */}
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
                    
                    {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} disabled={isDeleting}>Cancelar</Button>
                    <Button onClick={confirmarDelecao} color="error" variant="contained" disabled={isDeleting}>
                        {isDeleting ? <Typography variant="caption">Excluindo...</Typography> : 'Excluir'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}