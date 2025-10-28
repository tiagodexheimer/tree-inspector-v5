// src/components/ui/demandas/CardDemanda.tsx
'use client';

import { DemandaType } from "@/types/demanda";
import { Card, CardHeader, CardContent, Box, Typography, Button, IconButton } from "@mui/material"; // Adicionado IconButton
import StatusDemanda from "./StatusDemanda";
import { useState } from "react";
import DetalhesDemandaModal from "./DetalhesDemandaModal";
import DeleteIcon from '@mui/icons-material/Delete'; // Importa o ícone de lixeira

// Interface atualizada para incluir onDelete
interface CardDemandaProps extends DemandaType {
    isSelected: boolean;
    onSelect: (id: number) => void;
    // Adiciona a prop para a função de deleção
    onDelete: (id: number) => void;
}

export default function CardDemanda(props: CardDemandaProps) {
    // Desestrutura onDelete das props
    const { id, logradouro, numero, bairro, cidade, uf, tipo_demanda,
            descricao, prazo, status, isSelected, onSelect, onDelete } = props;
    const [modalOpen, setModalOpen] = useState(false);

    const handleOpenModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        setModalOpen(true);
    };

    const formatPrazo = (date: Date | null | undefined): string => {
       if (!date) return 'N/A';
        if (date instanceof Date && !isNaN(date.getTime())) {
             try { return date.toLocaleDateString('pt-BR'); }
             catch (e) { console.error("Error formatting date:", date, e); return 'Data inválida'; }
        }
        console.warn("Invalid date value received:", date);
        return 'Data inválida';
    };

    const formatEnderecoCurto = (): string => {
        const parts = [ logradouro, numero ? `, ${numero}` : '', bairro ? ` - ${bairro}` : '' ];
        return parts.filter(Boolean).join('').trim() || 'Endereço não informado';
    };

    return (
        <div>
            <Card
                onClick={() => onSelect(id!)}
                sx={{
                    width: 400,
                    height: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: isSelected ? '2px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
                    cursor: 'pointer',
                    transition: 'border 0.2s',
                    '&:hover': {
                        borderColor: isSelected ? '#1976d2' : 'rgba(0, 0, 0, 0.4)'
                    },
                    boxSizing: 'border-box'
                }}
            >
                <Box>
                    <CardHeader
                        action={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: -1 }}>
                                {status ? <StatusDemanda status={status} /> : null}
                                <IconButton
                                    aria-label={`Excluir demanda ${id}`}
                                    color="error"
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(id!);
                                    }}
                                    title="Excluir Demanda"
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        }
                        title={tipo_demanda || `Demanda ${id}`}
                        subheader={formatEnderecoCurto()}
                        sx={{ pb: 0, alignItems: 'flex-start' }}
                        titleTypographyProps={{ textTransform: 'capitalize', fontWeight: 'bold' }}
                        // FIX: Adjust the sx prop within subheaderTypographyProps
                        subheaderTypographyProps={{
                            variant: 'body2',
                            color: 'text.secondary',
                            sx: { // Apply the line clamp styles within an inner sx prop
                                display: '-webkit-box',
                                WebkitLineClamp: 2, // Keep camelCase here
                                WebkitBoxOrient: 'vertical', // Keep camelCase here
                                overflow: 'hidden',
                                // noWrap: false, // Remove noWrap if using line clamp
                            }
                         }}
                    />
                    <CardContent>
                        <Box sx={{
                             position: 'relative', paddingTop: '50%', width: '100%',
                             borderRadius: '4px', overflow: 'hidden', backgroundColor: '#e0e0e0',
                             display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#757575'
                        }}>
                             <Typography variant="caption">Mapa Indisponível</Typography>
                        </Box>
                    </CardContent>
                </Box>
                <CardContent sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    <Typography variant="body2" color="text.secondary" sx={{
                        mb: 1, display: '-webkit-box', WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis',
                        minHeight: '3.6em'
                        }}>
                        {descricao}
                    </Typography>
                    <Typography variant="body2" sx={{mt:1 /* ajuste espaçamento se necessário */}}>Prazo: {formatPrazo(prazo)}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                       {cidade && uf ? `${cidade}/${uf}` : (cidade || uf || '')}
                    </Typography>
                    <Button variant="outlined" size="small" onClick={handleOpenModal} sx={{ mt: 1 }}>
                        Detalhes
                    </Button>
                </CardContent>
            </Card>
            <DetalhesDemandaModal open={modalOpen} onClose={() => setModalOpen(false)} demanda={props} />
        </div>
    );
}