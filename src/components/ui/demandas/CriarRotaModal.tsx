// src/components/ui/demandas/CriarRotaModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    List, ListItem, ListItemText, Paper, IconButton, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent
} from "@mui/material";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DemandaType } from "@/types/demanda"; // Certifique-se que o caminho está correto

// Props atualizadas: onRotaCriada agora recebe o responsável
interface CriarRotaModalProps {
    open: boolean;
    onClose: () => void;
    demandasSelecionadas: DemandaType[];
    onRotaCriada: (nomeRota: string, responsavel: string) => void;
}

// Lista de exemplo para os responsáveis
const responsaveisExemplo = ['João Silva', 'Pedro Martins', 'Ana Costa', 'Mariana Dias'];

// Função auxiliar para formatar endereço curto (ADICIONADA AQUI ou importada)
const formatEnderecoCurto = (demanda: DemandaType): string => {
    const parts = [
        demanda.logradouro,
        demanda.numero ? `, ${demanda.numero}` : '',
        demanda.bairro ? ` - ${demanda.bairro}` : '',
        // Poderia adicionar cidade/UF se quisesse
    ];
    return parts.filter(Boolean).join('').trim() || 'Endereço não informado';
};


// Componente para item arrastável na lista
function SortableItem({ demanda }: { demanda: DemandaType }) {
    // Correção: Adiciona '!' para garantir que demanda.id não é undefined
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: demanda.id! });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <ListItem ref={setNodeRef} style={style} {...attributes}>
            <IconButton {...listeners} sx={{ cursor: 'grab' }} aria-label="arrastar ordem"> {/* Adicionado aria-label */}
                <DragIndicatorIcon />
            </IconButton>
            {/* ***** CORREÇÃO AQUI ***** */}
            {/* Exibe o id numérico e usa a função para formatar o endereço */}
            <ListItemText primary={`ID: ${demanda.id}`} secondary={formatEnderecoCurto(demanda)} />
        </ListItem>
    );
}

// Componente principal do Modal
export default function CriarRotaModal({ open, onClose, demandasSelecionadas, onRotaCriada }: CriarRotaModalProps) {
    const [nomeRota, setNomeRota] = useState('');
    const [responsavel, setResponsavel] = useState('');
    const [orderedDemandas, setOrderedDemandas] = useState<DemandaType[]>(demandasSelecionadas);

    // Configuração dos sensores para o DndContext
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Atualiza a lista ordenada quando as demandas selecionadas mudam ou o modal abre
    useEffect(() => {
        setOrderedDemandas(demandasSelecionadas);
        // Reseta os campos quando o modal abre
        if (open) {
            setNomeRota('');
            setResponsavel('');
        }
    }, [demandasSelecionadas, open]);

    // Função para lidar com o fim do arraste (reordenar)
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setOrderedDemandas((items) => {
                // Encontra os índices antigo e novo baseados no ID (que é número)
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                 // Verifica se os índices foram encontrados antes de mover
                 if (oldIndex === -1 || newIndex === -1) return items;
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    // Função para otimizar rota (ordem alfabética de endereço - agora usa logradouro)
    const handleOtimizarRota = () => {
        // Cria uma cópia ordenada
        const sorted = [...orderedDemandas].sort((a, b) =>
            (a.logradouro || '').localeCompare(b.logradouro || '') // Comparação de strings (logradouro)
        );
        setOrderedDemandas(sorted);
    };

    // Função para criar a rota
    const handleCreateRoute = () => {
        if (!nomeRota.trim() || !responsavel) {
            alert('Por favor, preencha o nome da rota e selecione um responsável.');
            return;
        }
        // Chama a função passada por props com os dados da rota e a ordem atual das demandas
        onRotaCriada(nomeRota, responsavel /*, orderedDemandas */); // Pode passar orderedDemandas se precisar da ordem
        onClose(); // Fecha o modal
    };

    // Prepara os IDs para o SortableContext (garantindo que não sejam undefined)
    const sortableItemsIds = orderedDemandas.map(d => d.id!);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Criar Nova Rota</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                    {/* Coluna Esquerda: Nome, Responsável, Lista Ordenável */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Nome da Rota"
                            variant="outlined"
                            fullWidth
                            value={nomeRota}
                            onChange={(e) => setNomeRota(e.target.value)}
                            required
                        />

                        <FormControl fullWidth required>
                            <InputLabel id="responsavel-rota-label">Responsável pela Rota</InputLabel>
                            <Select
                                labelId="responsavel-rota-label"
                                value={responsavel}
                                label="Responsável pela Rota"
                                onChange={(e: SelectChangeEvent) => setResponsavel(e.target.value)}
                            >
                                <MenuItem value="" disabled>Selecione...</MenuItem>
                                {responsaveisExemplo.map((nome) => (
                                    <MenuItem key={nome} value={nome}>{nome}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Typography variant="h6" sx={{ mt: 2 }}>Ordem das Demandas</Typography>

                        {/* Contexto Drag and Drop */}
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            {/* Contexto para itens sorteáveis */}
                            <SortableContext items={sortableItemsIds} strategy={verticalListSortingStrategy}>
                                <List component={Paper} sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd' }}>
                                    {orderedDemandas.map((demanda) => (
                                        // Renderiza cada item sorteável
                                        <SortableItem key={demanda.id} demanda={demanda} />
                                    ))}
                                    {orderedDemandas.length === 0 && (
                                        <ListItem>
                                            <ListItemText secondary="Nenhuma demanda selecionada para esta rota." />
                                        </ListItem>
                                    )}
                                </List>
                            </SortableContext>
                        </DndContext>
                        <Button
                            onClick={handleOtimizarRota}
                            variant="outlined"
                            sx={{ mt: 1 }}
                            disabled={orderedDemandas.length < 2} // Desabilita se não houver pelo menos 2 itens para ordenar
                        >
                            Otimizar Rota (Ordem Alfabética de Logradouro) {/* Atualizado texto do botão */}
                        </Button>
                    </Box>

                     {/* Coluna Direita: Placeholder do Mapa */}
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', borderRadius: 1, minHeight: 300, border: '1px dashed #ccc' }}>
                        <Typography color="textSecondary">Área do Mapa (Implementação Futura)</Typography>
                        {/* Aqui entraria um componente de mapa mostrando os pontos ordenados */}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    onClick={handleCreateRoute}
                    variant="contained"
                    // Desabilita se nome ou responsável não estiverem preenchidos ou não houver demandas
                    disabled={!nomeRota.trim() || !responsavel || orderedDemandas.length === 0}
                >
                    Criar Rota
                </Button>
            </DialogActions>
        </Dialog>
    );
}