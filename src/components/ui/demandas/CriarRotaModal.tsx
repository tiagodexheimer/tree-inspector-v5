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
import { DemandaType } from "@/types/demanda"; 
import dynamic from 'next/dynamic';
// ***** INÍCIO DA CORREÇÃO 1: Importar LatLngExpression *****
import { LatLngExpression } from 'leaflet';

// Importar o novo mapa
const RouteMap = dynamic(() => import('./RouteMap'), {
    ssr: false,
    loading: () => <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', color: '#777' }}>Carregando mapa da rota...</Box>
});

// Interface para os dados da rota (vinda da página)
interface OptimizedRouteData {
    optimizedDemands: DemandaType[];
    routePath: [number, number][];
    startPoint: { lat: number, lng: number };
}

// Props atualizadas
interface CriarRotaModalProps {
    open: boolean;
    onClose: () => void;
    routeData: OptimizedRouteData | null; 
    onRotaCriada: (nomeRota: string, responsavel: string) => void;
}

// Lista de exemplo para os responsáveis (mantida)
const responsaveisExemplo = ['João Silva', 'Pedro Martins', 'Ana Costa', 'Mariana Dias'];

// ***** INÍCIO DA CORREÇÃO 2: Definir ponto de partida *****
// Duplicamos a constante aqui para usá-la no cálculo do novo path
const START_END_POINT: LatLngExpression = [-29.8608, -51.1789]; // [lat, lng]

// Função auxiliar para formatar endereço curto (mantida)
const formatEnderecoCurto = (demanda: DemandaType): string => {
    const parts = [
        demanda.logradouro,
        demanda.numero ? `, ${demanda.numero}` : '',
        demanda.bairro ? ` - ${demanda.bairro}` : '',
    ];
    return parts.filter(Boolean).join('').trim() || 'Endereço não informado';
};


// Componente para item arrastável na lista (mantido)
function SortableItem({ demanda }: { demanda: DemandaType }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: demanda.id! });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <ListItem ref={setNodeRef} style={style} {...attributes}>
            <IconButton {...listeners} sx={{ cursor: 'grab' }} aria-label="arrastar ordem">
                <DragIndicatorIcon />
            </IconButton>
            <ListItemText primary={`ID: ${demanda.id}`} secondary={formatEnderecoCurto(demanda)} />
        </ListItem>
    );
}

// Componente principal do Modal
export default function CriarRotaModal({ open, onClose, routeData, onRotaCriada }: CriarRotaModalProps) {
    const [nomeRota, setNomeRota] = useState('');
    const [responsavel, setResponsavel] = useState('');
    const [orderedDemandas, setOrderedDemandas] = useState<DemandaType[]>([]);
    
    // ***** INÍCIO DA CORREÇÃO 3: Criar estado para o caminho do mapa *****
    const [currentRoutePath, setCurrentRoutePath] = useState<[number, number][]>([]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Atualiza a lista e o caminho quando os dados da rota mudam
    useEffect(() => {
        if (open && routeData) {
            setOrderedDemandas(routeData.optimizedDemands || []);
            // Define o caminho inicial otimizado
            setCurrentRoutePath(routeData.routePath || []); 
            // Reseta os campos
            setNomeRota('');
            setResponsavel('');
        } else if (!open) {
             // Limpa ao fechar
             setOrderedDemandas([]);
             setCurrentRoutePath([]);
        }
    }, [routeData, open]);

    // ***** INÍCIO DA CORREÇÃO 4: Atualizar o caminho ao arrastar *****
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            
            // Usamos a forma de callback do setState para garantir os dados mais recentes
            setOrderedDemandas((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                 if (oldIndex === -1 || newIndex === -1) return items;

                // 1. Gera a nova lista ordenada de demandas
                const newOrderedItems = arrayMove(items, oldIndex, newIndex);

                // 2. Recalcula o caminho do mapa (em linha reta)
                const newPath: [number, number][] = [
                    START_END_POINT as [number, number], // Ponto de partida
                    // Mapeia as demandas reordenadas para suas coordenadas [lat, lng]
                    ...newOrderedItems.map(d => 
                        [d.geom!.coordinates[1], d.geom!.coordinates[0]] as [number, number]
                    ),
                    START_END_POINT as [number, number] // Ponto final
                ];
                
                // 3. Atualiza o estado do caminho do mapa
                setCurrentRoutePath(newPath);

                // 4. Retorna a nova lista de demandas
                return newOrderedItems;
            });
        }
    }
    // ***** FIM DA CORREÇÃO 4 *****

    // Função para criar a rota (mantida)
    const handleCreateRoute = () => {
        if (!nomeRota.trim() || !responsavel) {
            alert('Por favor, preencha o nome da rota e selecione um responsável.');
            return;
        }
        onRotaCriada(nomeRota, responsavel /*, orderedDemandas */); 
        onClose(); // Fecha o modal
    };

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

                        <Typography variant="h6" sx={{ mt: 2 }}>Ordem das Demandas (Otimizada)</Typography>
                        <Typography variant="caption" sx={{ mt: -2, color: 'text.secondary' }}>
                            A rota foi pré-otimizada. Você pode reordenar manualmente se necessário.
                        </Typography>


                        {/* Contexto Drag and Drop */}
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={sortableItemsIds} strategy={verticalListSortingStrategy}>
                                <List component={Paper} sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd' }}>
                                    {orderedDemandas.map((demanda, index) => (
                                        <Box key={demanda.id} sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee' }}>
                                            <Typography sx={{ p: 1, minWidth: '35px', textAlign: 'center', fontWeight: 'bold', color: 'primary.main' }}>
                                                {index + 1}.
                                            </Typography>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <SortableItem demanda={demanda} />
                                            </Box>
                                        </Box>
                                    ))}
                                    {orderedDemandas.length === 0 && (
                                        <ListItem>
                                            <ListItemText secondary="Nenhuma demanda selecionada." />
                                        </ListItem>
                                    )}
                                </List>
                            </SortableContext>
                        </DndContext>
                        
                    </Box>

                     {/* Coluna Direita: Mapa da Rota */}
                    <Box sx={{ flex: 1, minHeight: 400, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
                        {/* Garante que o mapa só renderize se tiver dados */}
                        {routeData && (
                            // ***** INÍCIO DA CORREÇÃO 5: Passar o estado do caminho *****
                            <RouteMap
                                demands={orderedDemandas}
                                path={currentRoutePath} // <-- Passa o caminho que é atualizado ao arrastar
                            />
                            // ***** FIM DA CORREÇÃO 5 *****
                        )}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    onClick={handleCreateRoute}
                    variant="contained"
                    disabled={!nomeRota.trim() || !responsavel || orderedDemandas.length === 0}
                >
                    Salvar Rota
                </Button>
            </DialogActions>
        </Dialog>
    );
}