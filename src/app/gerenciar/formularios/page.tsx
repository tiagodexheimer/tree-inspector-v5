'use client';

import { useState } from 'react';
import { 
    Box, Typography, Paper, TextField, Checkbox, FormControlLabel, Select, MenuItem, 
    FormControl, InputLabel, Button, IconButton, Accordion, AccordionSummary, AccordionDetails,
    Tabs, Tab, Table, TableContainer, TableHead, TableBody, TableRow, TableCell
} from '@mui/material';
import { DndContext, closestCenter, DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/componets/dnd/SortableItem';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FormFieldEditor, { FormField, FieldType } from '@/componets/FormFieldEditor';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Dados de exemplo para a nova aba
const laudosSalvosExemplo = [
    { id: 'laudo-001', nome: 'Laudo de Vistoria Padrão', dataCriacao: '2023-10-26' },
    { id: 'laudo-002', nome: 'Relatório Fotográfico Simplificado', dataCriacao: '2023-10-25' },
    { id: 'laudo-003', nome: 'Laudo de Supressão de Indivíduo', dataCriacao: '2023-10-22' },
];

// --- Componente Principal da Página ---
export default function FormBuilderPage() {
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // As funções auxiliares agora estão definidas APENAS UMA VEZ aqui.
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
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
    
    const addField = (type: FieldType) => {
        const newField: FormField = { 
            id: `field-${Date.now()}`, 
            type: type, 
            label: `Novo Campo (${type})`, 
            placeholder: 'Dica de escrita...',
            ...(type === 'checkbox' || type === 'select' ? { options: ['Opção 1'] } : {})
        };
        setFormFields((fields) => [...fields, newField]);
    };

    const updateField = (id: UniqueIdentifier, updatedProps: Partial<FormField>) => {
        setFormFields(fields => fields.map(f => f.id === id ? { ...f, ...updatedProps } : f));
    };

    const deleteField = (id: UniqueIdentifier) => {
        setFormFields(fields => fields.filter(f => f.id !== id));
    };
    
    const renderFormBuilder = () => (
        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <Box sx={{ display: 'flex', flexGrow: 1, p: 2, gap: 2, backgroundColor: '#f4f6f8' }}>
                <Paper sx={{ width: '20%', p: 2, overflowY: 'auto' }}>
                    <Typography variant="h6" gutterBottom>Campos Disponíveis</Typography>
                    <Button variant="outlined" fullWidth sx={{ mb: 1 }} onClick={() => addField('input')}>Adicionar Input</Button>
                    <Button variant="outlined" fullWidth sx={{ mb: 1 }} onClick={() => addField('checkbox')}>Adicionar Checkbox</Button>
                    <Button variant="outlined" fullWidth sx={{ mb: 1 }} onClick={() => addField('select')}>Adicionar Select</Button>
                </Paper>
                
                <Paper sx={{ width: '50%', p: 2, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" gutterBottom>Estrutura do Laudo</Typography>
                    <div style={{ flexGrow: 1, width: '100%' }}>
                        <SortableContext items={formFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            {formFields.length === 0 ? (
                                <Box sx={{ border: '2px dashed #ccc', borderRadius: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#999' }}>
                                    <AddCircleOutlineIcon sx={{ fontSize: 40, mb: 1 }} />
                                    <Typography>Adicione campos para começar</Typography>
                                </Box>
                            ) : (
                                formFields.map(field => (
                                    <SortableItem key={field.id} id={field.id}>
                                        <FormFieldEditor field={field} updateField={updateField} deleteField={deleteField} />
                                    </SortableItem>
                                ))
                            )}
                        </SortableContext>
                    </div>
                </Paper>

                <Box sx={{ width: '30%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                     <Paper elevation={4} sx={{ width: 375, height: '90%', borderRadius: '40px', border: '10px solid black', p: '20px', boxSizing: 'border-box', overflowY: 'auto', backgroundColor: 'white' }}>
                        <Typography variant="h6" align="center" gutterBottom>Pré-visualização</Typography>
                        {formFields.map(field => (
                            <Box key={field.id} sx={{ mb: 2 }}>
                                {field.type === 'input' && (<FormControl fullWidth><Typography variant="subtitle1" sx={{ mb: 0.5 }}>{field.label}</Typography><TextField placeholder={field.placeholder} fullWidth /></FormControl>)}
                                {field.type === 'checkbox' && (<FormControl component="fieldset"><Typography variant="subtitle1">{field.label}</Typography>{field.options?.map(option => <FormControlLabel key={option} control={<Checkbox />} label={option} />)}</FormControl>)}
                                {field.type === 'select' && (<FormControl fullWidth><InputLabel>{field.label}</InputLabel><Select label={field.label} value="">{field.options?.map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}</Select></FormControl>)}
                            </Box>
                        ))}
                    </Paper>
                </Box>
            </Box>
        </DndContext>
    );

    const renderSavedFormsList = () => (
        <Box sx={{ p: 2 }}>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome do Laudo</TableCell>
                            <TableCell>Data de Criação</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {laudosSalvosExemplo.map((laudo) => (
                            <TableRow key={laudo.id} hover>
                                <TableCell>{laudo.nome}</TableCell>
                                <TableCell>{laudo.dataCriacao}</TableCell>
                                <TableCell align="right">
                                    <IconButton title="Editar Laudo"><EditIcon /></IconButton>
                                    <IconButton title="Apagar Laudo"><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    return (
        <Box sx={{ width: '100%', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'white' }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab label="Criar / Editar Laudo" />
                    <Tab label="Laudos Salvos" />
                </Tabs>
            </Box>
            
            {activeTab === 0 && renderFormBuilder()}
            {activeTab === 1 && renderSavedFormsList()}
        </Box>
    );
}