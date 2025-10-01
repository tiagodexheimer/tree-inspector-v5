'use client';

import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    List, ListItem, ListItemText, Paper, IconButton
} from "@mui/material";
// 1. Importações do DND Kit que acabamos de instalar
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DemandaType } from "@/types/demanda";

// Props: O que nosso modal precisa receber da página principal
interface CriarRotaModalProps {
    open: boolean;
    onClose: () => void;
    demandasSelecionadas: DemandaType[];
    onRotaCriada: (nomeRota: string) => void;
}

// 2. Um sub-componente para cada item que será arrastável na lista
function SortableItem({ demanda }: { demanda: DemandaType }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: demanda.ID });
    const style = {
        transform: CSS.Transform.toString(transform), // Aplica a transformação de posição (arrastar)
        transition,
    };

    return (
        <ListItem ref={setNodeRef} style={style} {...attributes}>
            {/* O ícone de "arrastar" ativa a funcionalidade */}
            <IconButton {...listeners} sx={{ cursor: 'grab' }}>
                <DragIndicatorIcon />
            </IconButton>
            <ListItemText primary={`ID: ${demanda.ID}`} secondary={demanda.endereco} />
        </ListItem>
    );
}

// --- Componente principal do Modal ---
export default function CriarRotaModal({ open, onClose, demandasSelecionadas, onRotaCriada }: CriarRotaModalProps) {
    // 3. Estados internos do modal
    const [nomeRota, setNomeRota] = useState('');
    const [orderedDemandas, setOrderedDemandas] = useState<DemandaType[]>(demandasSelecionadas);

    // Sensores para detectar o input (mouse ou teclado) para o drag-and-drop
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    // Efeito para atualizar a lista interna sempre que a seleção na página principal mudar
    useEffect(() => { setOrderedDemandas(demandasSelecionadas); }, [demandasSelecionadas]);

    // 4. Função que é chamada quando o usuário solta um item
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setOrderedDemandas((items) => {
                const oldIndex = items.findIndex((item) => item.ID === active.id);
                const newIndex = items.findIndex((item) => item.ID === over.id);
                return arrayMove(items, oldIndex, newIndex); // Move o item no array
            });
        }
    }

    // 5. Lógica do botão "Otimizar Rota"
    const handleOtimizarRota = () => {
        const sorted = [...orderedDemandas].sort((a, b) => a.endereco.localeCompare(b.endereco));
        setOrderedDemandas(sorted);
    };

    // 6. Lógica do botão "Criar Rota"
    const handleCreateRoute = () => {
        if (nomeRota.trim() === '') { return alert('Por favor, dê um nome para a rota.'); }
        onRotaCriada(nomeRota); // Informa a página principal que a rota foi criada
        onClose(); // Fecha o modal
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Criar Nova Rota</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                    {/* Coluna da Esquerda */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField label="Nome da Rota" variant="outlined" fullWidth value={nomeRota} onChange={(e) => setNomeRota(e.target.value)} />
                        <Typography variant="h6">Ordem das Demandas</Typography>

                        {/* 7. O "Contexto" do DND Kit que envolve a lista */}
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={orderedDemandas.map(d => d.ID)} strategy={verticalListSortingStrategy}>
                                <List component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                                    {orderedDemandas.map((demanda) => (
                                        <SortableItem key={demanda.ID} demanda={demanda} />
                                    ))}
                                </List>
                            </SortableContext>
                        </DndContext>
                        <Button onClick={handleOtimizarRota} variant="outlined" sx={{ mt: 'auto' }}>Otimizar Rota (Alfabético)</Button>
                    </Box>
                    {/* Coluna da Direita (Placeholder do Mapa) */}
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