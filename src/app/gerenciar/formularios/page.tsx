'use client';

import { useState } from 'react';
import { Box, Typography, Paper, TextField, Checkbox, FormControlLabel, Select, MenuItem, Button, FormControl, InputLabel } from '@mui/material';
import { DndContext, useDraggable, useDroppable, closestCenter, DragEndEvent, DragStartEvent, DragOverlay, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// --- Tipos e Dados ---
type FieldType = 'input' | 'checkbox' | 'select';
type FormField = { id: UniqueIdentifier; type: FieldType; label: string; placeholder: string; };

const toolList: { type: FieldType, component: React.ReactNode }[] = [
    { type: 'input', component: <TextField size="small" label="Input" disabled fullWidth /> },
    { type: 'checkbox', component: <FormControlLabel control={<Checkbox disabled />} label="Checkbox" /> },
    { type: 'select', component: <Select size="small" value="" disabled displayEmpty sx={{ width: '100%' }}><MenuItem>Dropdown</MenuItem></Select> }
];

// --- Componentes Reutilizáveis ---

function DraggableTool({ type, children }: { type: FieldType, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: `tool-${type}` });
    return (
        <Paper ref={setNodeRef} {...listeners} {...attributes} suppressHydrationWarning={true} sx={{ p: 2, mb: 2, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 1 }}>
            {children}
        </Paper>
    );
}

function SortableField({ field }: { field: FormField }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return <Paper ref={setNodeRef} style={style} sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}><span {...listeners} {...attributes} style={{ cursor: 'grab' }}><DragIndicatorIcon /></span><Box><Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{field.label}</Typography><Typography variant="body2" color="text.secondary">Tipo: {field.type} | Dica: {field.placeholder}</Typography></Box></Paper>;
}

function DroppableArea({ children }: { children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: 'droppable-area' });
    return (
        <div ref={setNodeRef} style={{ flexGrow: 1, width: '100%', backgroundColor: isOver ? '#e3f2fd' : 'transparent', borderRadius: '4px', transition: 'background-color 0.2s' }}>
            {children}
        </div>
    );
}

// --- Componente Principal da Página ---
export default function FormBuilderPage() {
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

    const handleDragStart = (event: DragStartEvent) => { setActiveId(event.active.id); };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;
        const isTool = active.id.toString().startsWith('tool-');
        if (isTool && over.id === 'droppable-area') {
            const fieldType = active.id.toString().replace('tool-', '') as FieldType;
            const newField: FormField = { id: `field-${Date.now()}`, type: fieldType, label: `Novo Campo (${fieldType})`, placeholder: 'Clique para editar' };
            setFormFields((fields) => [...fields, newField]);
        }
        else if (!isTool && active.id !== over.id) {
            setFormFields((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                if (oldIndex > -1 && newIndex > -1) {
                    return arrayMove(items, oldIndex, newIndex);
                }
                return items;
            });
        }
    };
    
    function getActiveComponent() {
        if (!activeId) return null;
        const activeStrId = activeId.toString();
        if (activeStrId.startsWith('tool-')) {
            const toolType = activeStrId.replace('tool-', '');
            const tool = toolList.find(t => t.type === toolType);
            return <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>{tool?.component}</Paper>;
        }
        const field = formFields.find(f => f.id === activeId);
        if (field) return <SortableField field={field} />;
        return null;
    }

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)', p: 2, gap: 2, backgroundColor: '#f4f6f8' }}>
                <Paper sx={{ width: '20%', p: 2, overflowY: 'auto' }}>
                    <Typography variant="h6" gutterBottom>Campos Disponíveis</Typography>
                    {toolList.map(tool => ( <DraggableTool key={tool.type} type={tool.type}>{tool.component}</DraggableTool> ))}
                </Paper>
                <Paper sx={{ width: '50%', p: 2, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" gutterBottom>Estrutura do Laudo</Typography>
                    <DroppableArea>
                        <SortableContext items={formFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            {formFields.length === 0 ? (
                                <Box sx={{ border: '2px dashed #ccc', borderRadius: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#999' }}>
                                    <AddCircleOutlineIcon sx={{ fontSize: 40, mb: 1 }} /><Typography>Arraste os campos aqui para começar</Typography>
                                </Box>
                            ) : (
                                formFields.map(field => <SortableField key={field.id} field={field} />)
                            )}
                        </SortableContext>
                    </DroppableArea>
                </Paper>
                <Box sx={{ width: '30%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                     <Paper elevation={4} sx={{ width: 375, height: '90%', borderRadius: '40px', border: '10px solid black', p: '20px', boxSizing: 'border-box', overflowY: 'auto', backgroundColor: 'white' }}>
                        <Typography variant="h6" align="center" gutterBottom>Pré-visualização</Typography>
                        {formFields.map(field => (
                            <Box key={field.id} sx={{ mb: 2 }}>
                                {field.type === 'input' && <TextField label={field.label} placeholder={field.placeholder} fullWidth />}
                                {field.type === 'checkbox' && <FormControlLabel control={<Checkbox />} label={field.label} />}
                                {/* A CORREÇÃO ESTÁ AQUI: Adicionado value="" */}
                                {field.type === 'select' && (<FormControl fullWidth><InputLabel>{field.label}</InputLabel><Select label={field.label} value=""><MenuItem value="">Opção 1</MenuItem></Select></FormControl>)}
                            </Box>
                        ))}
                    </Paper>
                </Box>
            </Box>
            <DragOverlay>{getActiveComponent()}</DragOverlay>
        </DndContext>
    );
}