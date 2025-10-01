'use client';

import { useState } from 'react';
import { Box, Typography, Paper, TextField, Checkbox, FormControlLabel, Select, MenuItem, Button, FormControl, InputLabel } from '@mui/material';
import { DndContext, useDraggable, useDroppable, closestCenter, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// --- Tipos de Dados ---
type FieldType = 'input' | 'checkbox' | 'select';
type FormField = {
    id: string;
    type: FieldType;
    label: string;
    placeholder: string;
};

// --- Componentes Reutilizáveis ---

// Componente para a barra de ferramentas (coluna da esquerda)
function DraggableTool({ type, children }: { type: FieldType, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: `tool-${type}` });
    return (
        <Paper ref={setNodeRef} {...listeners} {...attributes} sx={{ p: 2, mb: 2, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 1 }}>
            {children}
        </Paper>
    );
}

// Componente para cada campo já solto no formulário (coluna central)
function SortableField({ field }: { field: FormField }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <Paper ref={setNodeRef} style={style} sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <span {...listeners} {...attributes} style={{ cursor: 'grab' }}><DragIndicatorIcon /></span>
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{field.label}</Typography>
                <Typography variant="body2" color="text.secondary">Tipo: {field.type} | Dica: {field.placeholder}</Typography>
            </Box>
        </Paper>
    );
}

// --- Componente Principal da Página ---

export default function FormBuilderPage() {
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const { isOver, setNodeRef } = useDroppable({ id: 'droppable-area' });

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        // Se soltou na área central
        if (over && over.id === 'droppable-area' && active.id.toString().startsWith('tool-')) {
            const fieldType = active.id.toString().replace('tool-', '') as FieldType;
            const newField: FormField = {
                id: `field-${Date.now()}`,
                type: fieldType,
                label: `Novo Campo (${fieldType})`,
                placeholder: 'Clique para editar'
            };
            setFormFields((fields) => [...fields, newField]);
        }
        // Se reordenou um item que já estava na lista
        else if (over && active.id !== over.id) {
            setFormFields((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)', p: 2, gap: 2, backgroundColor: '#f4f6f8' }}>

                {/* Coluna 1: Ferramentas Arrastáveis */}
                <Paper sx={{ width: '20%', p: 2, overflowY: 'auto' }}>
                    <Typography variant="h6" gutterBottom>Campos Disponíveis</Typography>
                    <DraggableTool type="input"><TextField size="small" label="Input" disabled /></DraggableTool>
                    <DraggableTool type="checkbox"><FormControlLabel control={<Checkbox disabled />} label="Checkbox" /></DraggableTool>
                    <DraggableTool type="select"><Select size="small" value="" disabled displayEmpty sx={{ width: '100%' }}><MenuItem>Dropdown</MenuItem></Select></DraggableTool>
                </Paper>

                {/* Coluna 2: Área de Construção do Formulário */}
                <Paper
                    ref={setNodeRef}
                    sx={{
                        width: '50%',
                        p: 2,
                        overflowY: 'auto',
                        backgroundColor: isOver ? '#e3f2fd' : 'white',
                        transition: 'background-color 0.2s'
                    }}
                >
                    <Typography variant="h6" gutterBottom>Estrutura do Laudo</Typography>
                    {formFields.length === 0 ? (
                         <Box sx={{
                            border: '2px dashed #ccc', borderRadius: 1, height: '80%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#999'
                        }}>
                            <AddCircleOutlineIcon sx={{ fontSize: 40, mb: 1 }} />
                            <Typography>Arraste os campos aqui para começar</Typography>
                        </Box>
                    ) : (
                        <SortableContext items={formFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            {formFields.map(field => <SortableField key={field.id} field={field} />)}
                        </SortableContext>
                    )}
                </Paper>

                {/* Coluna 3: Pré-visualização no Celular */}
                <Box sx={{ width: '30%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Paper
                        elevation={4}
                        sx={{
                            width: 375, height: '90%', borderRadius: '40px', border: '10px solid black',
                            p: '20px', boxSizing: 'border-box', overflowY: 'auto', backgroundColor: 'white'
                        }}
                    >
                        <Typography variant="h6" align="center" gutterBottom>Pré-visualização</Typography>
                        {formFields.map(field => (
                            <Box key={field.id} sx={{ mb: 2 }}>
                                {field.type === 'input' && <TextField label={field.label} placeholder={field.placeholder} fullWidth />}
                                {field.type === 'checkbox' && <FormControlLabel control={<Checkbox />} label={field.label} />}
                                {field.type === 'select' && (
                                    <FormControl fullWidth>
                                        <InputLabel>{field.label}</InputLabel>
                                        <Select label={field.label}><MenuItem value="">Opção 1</MenuItem></Select>
                                    </FormControl>
                                )}
                            </Box>
                        ))}
                    </Paper>
                </Box>

            </Box>
        </DndContext>
    );
}