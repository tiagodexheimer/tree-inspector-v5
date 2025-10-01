'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Paper } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

// Props que o item precisa receber
interface SortableItemProps {
    id: any;
    children: React.ReactNode;
}

export function SortableItem(props: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.id });

    // Estilos que aplicam a animação de movimento
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* O "handle" que permite arrastar o item */}
                <span {...listeners} style={{ cursor: 'grab' }}>
                    <DragIndicatorIcon />
                </span>
                {/* O conteúdo real do item */}
                {props.children}
            </Paper>
        </div>
    );
}