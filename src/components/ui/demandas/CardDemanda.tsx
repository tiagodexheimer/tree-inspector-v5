// src/components/ui/demandas/CardDemanda.tsx
'use client';

import React, { useState, memo, useCallback } from "react";
import { Card, CardHeader, CardContent, Box, Typography, Button, IconButton } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import dynamic from 'next/dynamic';

// Imports locais
import StatusDemanda from "./StatusDemanda";
import DetalhesDemandaModal from "./DetalhesDemandaModal";
import { DemandaType } from "@/types/demanda";

// Dynamic Import mantido para performance inicial
const MiniMap = dynamic(() => import('./MiniMap'), {
    ssr: false,
    loading: () => (
        <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: '#eee', 
            color: '#777' 
        }}>
            Carregando mapa...
        </Box>
    )
});

// --- Definição de Tipos (Segregação) ---
interface StatusOption {
    id: number;
    nome: string;
    cor: string;
}

interface DemandaComIdStatus extends DemandaType { 
    id_status?: number | null;
    lat: number | null; 
    lng: number | null;
}

interface CardDemandaProps extends DemandaComIdStatus {
    isSelected: boolean;
    onSelect: (id: number) => void;
    onDelete: (id: number) => void;
    onEdit: (demanda: DemandaComIdStatus) => void;
    onStatusChange: (demandaId: number, newStatusId: number) => Promise<void>;
    availableStatus: StatusOption[];
    currentStatusId?: number | null;
}

// --- Funções Auxiliares (Puras) - Extraídas para fora do componente ---
// Isso evita a recriação da função a cada render, melhorando a performance e testabilidade.

const formatPrazo = (date: Date | null | undefined): string => { 
    if (!date) return 'N/A'; 
    if (date instanceof Date && !isNaN(date.getTime())) { 
        try { 
            return date.toLocaleDateString('pt-BR'); 
        } catch (e) { 
            console.error("Erro ao formatar data", e); 
            return 'Data inválida'; 
        } 
    } 
    return 'Data inválida'; 
};

const formatEnderecoCurto = (logradouro?: string | null, numero?: string, bairro?: string | null): string => { 
    const parts = [ 
        logradouro, 
        numero ? `, ${numero}` : '', 
        bairro ? ` - ${bairro}` : '' 
    ]; 
    return parts.filter(Boolean).join('').trim() || 'Endereço não informado'; 
};

// --- Componente Principal ---

const CardDemanda = memo((props: CardDemandaProps) => {
    const { 
        id, logradouro, numero, bairro, cidade, uf, tipo_demanda,
        descricao, prazo,
        isSelected, onSelect, onDelete, onEdit, onStatusChange, 
        id_status, 
        availableStatus, 
        lat, lng 
    } = props;

    const [modalOpen, setModalOpen] = useState(false);

    // Handlers memoizados para evitar recriação se props não mudarem
    const handleOpenModal = useCallback((e: React.MouseEvent) => { 
        e.stopPropagation(); 
        setModalOpen(true); 
    }, []);

    const handleEditClick = useCallback((e: React.MouseEvent) => { 
        e.stopPropagation(); 
        onEdit(props); 
    }, [onEdit, props]);

    const handleDeleteClick = useCallback((e: React.MouseEvent) => { 
        e.stopPropagation(); 
        if (id !== undefined) onDelete(id); 
    }, [onDelete, id]);

    const handleCardClick = useCallback(() => {
        if (id !== undefined) onSelect(id);
    }, [onSelect, id]);

    // Dados computados
    const enderecoFormatado = formatEnderecoCurto(logradouro, numero, bairro);
    const prazoFormatado = formatPrazo(prazo);
    const localizacao = (cidade && uf) ? `${cidade}/${uf}` : (cidade || uf || '');
    const hasCoordinates = lat !== null && lng !== null;

    return (
        <>
            <Card
                onClick={handleCardClick}
                sx={{
                    width: 400, 
                    height: 500, 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'space-between', 
                    border: isSelected ? '2px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
                    cursor: 'pointer', 
                    transition: 'border 0.2s', 
                    '&:hover': { borderColor: isSelected ? '#1976d2' : 'rgba(0, 0, 0, 0.4)' }, 
                    boxSizing: 'border-box'
                }}
            >
                <Box>
                    <CardHeader
                       action={
                           <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: -1 }}>
                               <Box sx={{ display: 'flex', gap: 0.5 }}>
                                   <IconButton
                                       aria-label={`Editar demanda ${id}`}
                                       color="primary"
                                       size="small"
                                       onClick={handleEditClick}
                                       title="Editar Demanda"
                                   >
                                       <EditIcon fontSize="small" />
                                   </IconButton>
                                   <IconButton
                                       aria-label={`Excluir demanda ${id}`}
                                       color="error"
                                       size="small"
                                       onClick={handleDeleteClick}
                                       title="Excluir Demanda"
                                   >
                                       <DeleteIcon fontSize="small" />
                                   </IconButton>
                               </Box>

                               <Box sx={{ mt: 0.5 }}>
                                   {id !== undefined && (
                                       <StatusDemanda
                                           demandaId={id}
                                           currentStatusId={id_status}
                                           availableStatus={availableStatus}
                                           onStatusChange={onStatusChange}
                                       />
                                   )}
                               </Box>
                           </Box>
                        }
                        title={tipo_demanda || `Demanda ${id}`}
                        subheader={enderecoFormatado}
                        sx={{ pb: 0, alignItems: 'flex-start' }}
                        titleTypographyProps={{ textTransform: 'capitalize', fontWeight: 'bold' }}
                        subheaderTypographyProps={{ 
                            variant: 'body2', 
                            color: 'text.secondary', 
                            sx: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } 
                        }}
                    />
                    <CardContent sx={{ flexGrow: 1, minHeight: 150 }}>
                        <Box sx={{
                            position: 'relative', 
                            height: 200,
                            width: '100%', 
                            borderRadius: '4px', 
                            overflow: 'hidden',
                            backgroundColor: '#e0e0e0',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: '#757575'
                        }}>
                            {hasCoordinates ? (
                                 <MiniMap
                                   latitude={lat}
                                   longitude={lng}
                                   popupText={enderecoFormatado}
                                   />
                            ) : (
                                <Typography variant="caption">Mapa Indisponível (sem coordenadas)</Typography>
                            )}
                        </Box>
                    </CardContent>
                </Box>
                <CardContent sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {descricao}
                    </Typography>
                    <Typography variant="body2" sx={{mt:1}}>Prazo: {prazoFormatado}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                       {localizacao}
                    </Typography>
                    <Button variant="outlined" size="small" onClick={handleOpenModal} sx={{ mt: 1 }}>
                        Detalhes
                    </Button>
                </CardContent>
            </Card>
            
            {/* Modal carregado condicionalmente - Só monta se estiver aberto, economiza recursos se for pesado */}
            {modalOpen && (
                <DetalhesDemandaModal 
                    open={modalOpen} 
                    onClose={() => setModalOpen(false)} 
                    demanda={props} 
                />
            )}
        </>
    );
});

// Adiciona DisplayName para facilitar debugging no React DevTools
CardDemanda.displayName = "CardDemanda";

export default CardDemanda;