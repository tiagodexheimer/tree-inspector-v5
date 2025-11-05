// src/components/ui/rotas/DetalheRotaLista.tsx
'use client';

import React from 'react';
import {
    List, ListItem, ListItemText, Box, Typography, Chip, Paper,
    ListItemIcon, IconButton
} from '@mui/material';
import { DemandaComOrdem } from '@/app/rotas/[id]/page'; 
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { DndContext, DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteIcon from '@mui/icons-material/Delete'; // <-- Importar ícone

// Função auxiliar para formatar endereço curto (mantida)
const formatEnderecoCurto = (demanda: DemandaComOrdem): string => {
    const parts = [
        demanda.logradouro,
        demanda.numero ? `, ${demanda.numero}` : '',
        demanda.bairro ? ` - ${demanda.bairro}` : '',
    ];
    return parts.filter(Boolean).join('').trim() || 'Endereço não informado';
};

// --- 'SortableItem' Atualizado ---
interface SortableItemProps {
    demanda: DemandaComOrdem;
    index: number;
    onRemove: (id: number) => void; // <-- Nova prop
    disabled: boolean; // <-- Nova prop
}

function SortableItem({ demanda, index, onRemove, disabled }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: demanda.id! });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <ListItem ref={setNodeRef} style={style} divider
            // Adiciona um segundo slot de ação no final
            secondaryAction={
                <IconButton 
                    edge="end" 
                    aria-label="remover" 
                    onClick={() => onRemove(demanda.id)}
                    disabled={disabled}
                >
                    <DeleteIcon />
                </IconButton>
            }
        >
            {/* Número da Ordem */}
            <ListItemIcon sx={{ minWidth: 40, fontWeight: 'bold', color: 'primary.main', fontSize: '1.1rem' }}>
               {index + 1}.
            </ListItemIcon>
            
            {/* Ícone para arrastar */}
            <IconButton {...attributes} {...listeners} sx={{ cursor: 'grab', mr: 1 }} aria-label="arrastar ordem" disabled={disabled}>
                <DragIndicatorIcon />
            </IconButton>

            {/* Detalhes da Demanda */}
            <ListItemText
                primary={formatEnderecoCurto(demanda)}
                secondary={demanda.tipo_demanda || 'Sem tipo'}
            />

            {/* Status Atual */}
            <Chip
                label={demanda.status_nome || 'N/D'}
                size="small"
                sx={{
                    backgroundColor: demanda.status_cor || '#bdbdbd',
                    color: '#fff',
                    fontWeight: 'bold',
                    minWidth: '90px',
                    ml: 1,
                    mr: 5 // <-- Adiciona margem para não ficar sobre o botão de deletar
                }}
            />
        </ListItem>
    );
}


// --- Componente Principal Atualizado ---
interface DetalheRotaListaProps {
    demandas: DemandaComOrdem[];
    sensors: SensorDescriptor<SensorOptions>[];
    onDragEnd: (event: DragEndEvent) => void;
    onRemove: (id: number) => void; // <-- Nova prop
    disabled?: boolean;
}

export default function DetalheRotaLista({ demandas, sensors, onDragEnd, onRemove, disabled = false }: DetalheRotaListaProps) {
    
    const sortableItemsIds = demandas.map(d => d.id!);

    return (
        <Paper elevation={1} sx={{ maxHeight: '70vh', overflow: 'auto', opacity: disabled ? 0.7 : 1 }}>
            <DndContext sensors={sensors} onDragEnd={onDragEnd} >
                <SortableContext items={sortableItemsIds} strategy={verticalListSortingStrategy}>
                    <List>
                        {demandas.map((demanda, index) => (
                            <SortableItem 
                                key={demanda.id} 
                                demanda={demanda} 
                                index={index} 
                                onRemove={onRemove} // <-- Passa a função
                                disabled={disabled} // <-- Passa o estado 'disabled'
                            />
                        ))}
                        {demandas.length === 0 && (
                            <ListItem>
                                <ListItemText primary="Nenhuma demanda nesta rota. Arraste para adicionar (ainda não implementado) ou clique em 'Cancelar'." />
                            </ListItem>
                        )}
                    </List>
                </SortableContext>
            </DndContext>
        </Paper>
    );
}