// src/components/ui/rotas/DetalheRotaLista.tsx
'use client';

import React, { memo } from 'react';
import {
    List,
    ListItem,
    ListItemText,
    Chip,
    Paper,
    ListItemIcon,
    IconButton,
    Box,
    Typography
} from '@mui/material';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { DndContext, DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteIcon from '@mui/icons-material/Delete';

// Importação da Interface
import { DemandaComOrdem } from '@/services/client/rota-detalhes-client';

// --- 1. Utilitários (Extração de Lógica Pura) ---
// Idealmente, isso estaria em src/utils/address-formatter.ts
const formatEnderecoCurto = (demanda: DemandaComOrdem): string => {
    const parts = [
        demanda.logradouro,
        demanda.numero ? `, ${demanda.numero}` : '',
        demanda.bairro ? ` - ${demanda.bairro}` : '',
    ];
    return parts.filter(Boolean).join('').trim() || 'Endereço não informado';
};

// --- 2. Componentes de Apresentação (Stateless / UI Pura) ---

interface StatusBadgeProps {
    label?: string;
    color?: string;
}

const StatusBadge = ({ label = 'N/D', color = '#bdbdbd' }: StatusBadgeProps) => (
    <Chip
        label={label}
        size="small"
        sx={{
            backgroundColor: color,
            color: '#fff',
            fontWeight: 'bold',
            minWidth: '90px',
            ml: 1,
            mr: { xs: 0, sm: 5 } // Responsividade no layout
        }}
    />
);

interface ActionButtonsProps {
    onRemove: () => void;
    dragAttributes: any;
    dragListeners: any;
    disabled: boolean;
}

// --- 3. Componente de Item da Lista (Lógica de Renderização da Linha) ---

interface DemandaRowProps {
    demanda: DemandaComOrdem;
    index: number;
    onRemove: (id: number) => void;
    disabled: boolean;
    // Props injetadas pelo dnd-kit
    setNodeRef?: (node: HTMLElement | null) => void;
    style?: React.CSSProperties;
    attributes?: any;
    listeners?: any;
    isDragging?: boolean;
}

const DemandaRow = memo(({ 
    demanda, 
    index, 
    onRemove, 
    disabled,
    setNodeRef,
    style,
    attributes,
    listeners
}: DemandaRowProps) => {
    
    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (demanda.id !== undefined) onRemove(demanda.id);
    };

    return (
        <ListItem
            ref={setNodeRef}
            style={style}
            divider
            secondaryAction={
                <IconButton 
                    edge="end" 
                    aria-label="remover da rota" 
                    onClick={handleRemove}
                    disabled={disabled}
                    color="error"
                >
                    <DeleteIcon />
                </IconButton>
            }
            sx={{
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' }
            }}
        >
            {/* Área de Drag & Index */}
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 80 }}>
                <ListItemIcon sx={{ minWidth: 30, fontWeight: 'bold', color: 'primary.main' }}>
                    {index + 1}.
                </ListItemIcon>
                <IconButton 
                    {...attributes} 
                    {...listeners} 
                    disabled={disabled}
                    sx={{ cursor: disabled ? 'not-allowed' : 'grab', mr: 1 }}
                    aria-label="reordenar"
                >
                    <DragIndicatorIcon color={disabled ? 'disabled' : 'action'} />
                </IconButton>
            </Box>

            {/* Conteúdo Principal */}
            <ListItemText
                primary={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatEnderecoCurto(demanda)}
                    </Typography>
                }
                secondary={demanda.tipo_demanda || 'Sem tipo'}
            />

            {/* Status (Visualização apenas em telas maiores ou adaptada) */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <StatusBadge 
                    label={demanda.status_nome} 
                    color={demanda.status_cor} 
                />
            </Box>
        </ListItem>
    );
});

DemandaRow.displayName = 'DemandaRow';

// --- 4. Componente Sortable Wrapper (Lógica do DND-Kit) ---

interface SortableDemandaItemProps {
    demanda: DemandaComOrdem;
    index: number;
    onRemove: (id: number) => void;
    disabled: boolean;
}

const SortableDemandaItem = ({ demanda, index, onRemove, disabled }: SortableDemandaItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: demanda.id! });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        zIndex: isDragging ? 999 : 'auto',
    };

    return (
        <DemandaRow
            demanda={demanda}
            index={index}
            onRemove={onRemove}
            disabled={disabled}
            setNodeRef={setNodeRef}
            style={style}
            attributes={attributes}
            listeners={listeners}
        />
    );
};

// --- 5. Componente Principal (Orquestrador) ---

interface DetalheRotaListaProps {
    demandas: DemandaComOrdem[];
    sensors: SensorDescriptor<SensorOptions>[];
    onDragEnd: (event: DragEndEvent) => void;
    onRemove: (id: number) => void;
    disabled?: boolean;
}

export default function DetalheRotaLista({ 
    demandas, 
    sensors, 
    onDragEnd, 
    onRemove, 
    disabled = false 
}: DetalheRotaListaProps) {
    
    // Otimização: useMemo para evitar recriação do array em cada render
    const sortableItemsIds = React.useMemo(
        () => demandas.map(d => d.id!), 
        [demandas]
    );

    if (demandas.length === 0) {
        return (
            <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: '#f9f9f9' }}>
                <Typography color="text.secondary">
                    Nenhuma demanda nesta rota. Adicione demandas ou cancele as alterações.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={1} sx={{ maxHeight: '70vh', overflow: 'auto', opacity: disabled ? 0.7 : 1 }}>
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                <SortableContext items={sortableItemsIds} strategy={verticalListSortingStrategy}>
                    <List disablePadding>
                        {demandas.map((demanda, index) => (
                            <SortableDemandaItem 
                                key={demanda.id} 
                                demanda={demanda} 
                                index={index} 
                                onRemove={onRemove} 
                                disabled={disabled} 
                            />
                        ))}
                    </List>
                </SortableContext>
            </DndContext>
        </Paper>
    );
}