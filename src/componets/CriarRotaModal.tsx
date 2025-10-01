'use client';

import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    List, ListItem, ListItemText, Paper, IconButton, FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DemandaType } from "@/types/demanda";

// Props atualizadas: onRotaCriada agora recebe o responsável
interface CriarRotaModalProps {
    open: boolean;
    onClose: () => void;
    demandasSelecionadas: DemandaType[];
    onRotaCriada: (nomeRota: string, responsavel: string) => void;
}

// 1. Criamos uma lista de exemplo para os responsáveis
const responsaveisExemplo = ['João Silva', 'Pedro Martins', 'Ana Costa', 'Mariana Dias'];

function SortableItem({ demanda }: { demanda: DemandaType }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: demanda.ID });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <ListItem ref={setNodeRef} style={style} {...attributes}>
            <IconButton {...listeners} sx={{ cursor: 'grab' }}><DragIndicatorIcon /></IconButton>
            <ListItemText primary={`ID: ${demanda.ID}`} secondary={demanda.endereco} />
        </ListItem>
    );
}

export default function CriarRotaModal({ open, onClose, demandasSelecionadas, onRotaCriada }: CriarRotaModalProps) {
    const [nomeRota, setNomeRota] = useState('');
    const [responsavel, setResponsavel] = useState(''); // 2. Novo estado para o responsável
    const [orderedDemandas, setOrderedDemandas] = useState<DemandaType[]>(demandasSelecionadas);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    useEffect(() => {
        setOrderedDemandas(demandasSelecionadas);
        // Reseta os campos quando o modal abre
        if (open) {
            setNomeRota('');
            setResponsavel('');
        }
    }, [demandasSelecionadas, open]);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setOrderedDemandas((items) => {
                const oldIndex = items.findIndex((item) => item.ID === active.id);
                const newIndex = items.findIndex((item) => item.ID === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    const handleOtimizarRota = () => {
        const sorted = [...orderedDemandas].sort((a, b) => a.endereco.localeCompare(b.endereco));
        setOrderedDemandas(sorted);
    };

    const handleCreateRoute = () => {
        if (!nomeRota.trim() || !responsavel) {
            alert('Por favor, preencha o nome da rota e selecione um responsável.');
            return;
        }
        onRotaCriada(nomeRota, responsavel); // 3. Passa o responsável ao criar a rota
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Criar Nova Rota</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField label="Nome da Rota" variant="outlined" fullWidth value={nomeRota} onChange={(e) => setNomeRota(e.target.value)} />
                        
                        {/* 4. Novo campo de seleção para o responsável */}
                        <FormControl fullWidth>
                            <InputLabel>Responsável pela Rota</InputLabel>
                            <Select
                                value={responsavel}
                                label="Responsável pela Rota"
                                onChange={(e) => setResponsavel(e.target.value)}
                            >
                                {responsaveisExemplo.map((nome) => (
                                    <MenuItem key={nome} value={nome}>{nome}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Typography variant="h6" sx={{ mt: 2 }}>Ordem das Demandas</Typography>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={orderedDemandas.map(d => d.ID)} strategy={verticalListSortingStrategy}>
                                <List component={Paper} sx={{ maxHeight: 300, overflow: 'auto' }}>
                                    {orderedDemandas.map((demanda) => (
                                        <SortableItem key={demanda.ID} demanda={demanda} />
                                    ))}
                                </List>
                            </SortableContext>
                        </DndContext>
                        <Button onClick={handleOtimizarRota} variant="outlined" sx={{ mt: 'auto' }}>Otimizar Rota (Alfabético)</Button>
                    </Box>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', borderRadius: 1, minHeight: 300 }}>
                        <Typography color="textSecondary">Área do Mapa (Implementação Futura)</Typography>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleCreateRoute} variant="contained">Criar Rota</Button>
            </DialogActions>
        </Dialog>
    );
}