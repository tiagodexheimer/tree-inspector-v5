// src/app/rotas/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, CircularProgress, Alert, Button,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ListaRotas from '@/components/ui/rotas/ListaRotas'; // Importa o novo componente

// Interface para os dados da rota vindo da API GET
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

    // Estados para o modal de deleção (a ser implementado)
    const [rotaParaDeletar, setRotaParaDeletar] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Função para buscar os dados da API
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

    // Busca os dados ao carregar a página
    useEffect(() => {
        fetchRotas();
    }, []);

    // --- Lógica de Deleção (Ainda não implementada no backend de deleção de rota) ---
    const iniciarDelecao = (id: number) => {
        setRotaParaDeletar(id);
        setDeleteError(null);
        // setOpenDeleteConfirm(true); // TODO: Criar modal de confirmação
        alert(`Deletar rota ${id}? (Implementação de deleção pendente)`);
        // Por enquanto, apenas removemos da lista para teste
        // setRotas(prev => prev.filter(r => r.id !== id));
    };


    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>
                Rotas Criadas
            </h1>

            {/* Mensagens de Erro ou Loading */}
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

            {/* Conteúdo Principal (Lista ou "Nenhum item") */}
            {!isLoading && !error && (
                rotas.length > 0 ? (
                    // Se temos rotas, exibe a tabela
                    <Box sx={{ p: 2 }}>
                        <ListaRotas rotas={rotas} onDelete={iniciarDelecao} />
                    </Box>
                ) : (
                    // Se não temos rotas, exibe mensagem
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'grey.600', mt: 4 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                        <Typography variant="h6">Nenhuma rota criada ainda.</Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                            Vá para a página de <a href="/demandas" style={{ color: '#1976d2', textDecoration: 'underline' }}>Demandas</a> para criar sua primeira rota.
                        </Typography>
                    </Box>
                )
            )}

            {/* TODO: Adicionar Modal de Confirmação de Deleção de Rota */}
        </div>
    );
}