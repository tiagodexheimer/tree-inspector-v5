// src/components/ui/demandas/CriarRotaModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    List, ListItem, ListItemText, Paper, IconButton, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent,
    CircularProgress, Alert // <-- Adicionar CircularProgress e Alert
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
import { DemandaType, DemandaComIdStatus, OptimizedRouteData } from "@/types/demanda"; // <-- IMPORTS CORRIGIDOS DE INTERFACES COMPARTILHADAS
import _dynamic from 'next/dynamic'; // <-- Renomeado dynamic para _dynamic
import { LatLngExpression } from 'leaflet';
import RouteMap from './RouteMap'; // Importado o tipo de arquivo real

// Importar o novo mapa (usando o dynamic renomeado)
const RouteMapComponent = _dynamic(() => import('./RouteMap'), { // <-- Componente Dinâmico
    ssr: false,
    loading: () => <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', color: '#777' }}>Carregando mapa da rota...</Box>
});

// Props atualizadas
interface CriarRotaModalProps {
    open: boolean;
    onClose: () => void;
    routeData: OptimizedRouteData | null; 
    onRotaCriada: (nomeRota: string, responsavel: string) => void;
}

// Lista de exemplo para os responsáveis (mantida)
const responsaveisExemplo = ['João Silva', 'Pedro Martins', 'Ana Costa', 'Mariana Dias'];

const START_END_POINT: LatLngExpression = [-29.8533191, -51.1789191];

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
function SortableItem({ demanda }: { demanda: DemandaComIdStatus }) { // <-- Tipo atualizado
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
    const [orderedDemandas, setOrderedDemandas] = useState<DemandaComIdStatus[]>([]); // <--- Usa DemandaComIdStatus
    const [currentRoutePath, setCurrentRoutePath] = useState<[number, number][]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Atualiza a lista e o caminho quando os dados da rota mudam
    useEffect(() => {
        if (open && routeData) {
            setOrderedDemandas(routeData.optimizedDemands || []);
            setCurrentRoutePath(routeData.routePath || []); 
            // Reseta os campos e erros
            setNomeRota('');
            setResponsavel('');
            setIsSaving(false);
            setApiError(null);
        } else if (!open) {
             setOrderedDemandas([]);
             setCurrentRoutePath([]);
        }
    }, [routeData, open]);

    // handleDragEnd (mantido como na última correção)
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            // Limpa o erro da API se o usuário reordenar (a rota mudou)
            if (apiError) setApiError(null);
            
            setOrderedDemandas((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                 if (oldIndex === -1 || newIndex === -1) return items;

                const newOrderedItems = arrayMove(items, oldIndex, newIndex);

                // O campo 'geom' da demanda agora pode ser null ou undefined, mas 
                // para fins de compatibilidade com o mapa, usamos a coerção [lat, lng]
                // Se a DemandaComIdStatus não tiver geom, precisamos de lat/lng
                const newPath: [number, number][] = [
                    START_END_POINT as [number, number], 
                    ...newOrderedItems.map(d => 
                        // Assumimos que lat/lng são válidos ou que o mapa os tratará
                        [d.lat!, d.lng!] as [number, number]
                    ),
                    START_END_POINT as [number, number] 
                ];
                
                setCurrentRoutePath(newPath);
                return newOrderedItems;
            });
        }
    }

    const handleCreateRoute = async () => {
        if (!nomeRota.trim() || !responsavel) {
            setApiError('Por favor, preencha o nome da rota e selecione um responsável.');
            return;
        }

        setIsSaving(true);
        setApiError(null);

        try {
            const response = await fetch('/api/rotas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: nomeRota,
                    responsavel: responsavel,
                    demandas: orderedDemandas // Envia a lista de demandas na ordem atual
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || `Erro ${response.status} ao salvar rota.`);
            }

            // Sucesso! Chama a função da página (que fecha o modal e mostra confirmação)
            onRotaCriada(nomeRota, responsavel);
            onClose(); // Fecha este modal

        } catch (err) {
            console.error("[MODAL] Falha ao salvar rota:", err);
            setApiError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
        } finally {
            setIsSaving(false);
        }
    };

    const sortableItemsIds = orderedDemandas.map(d => d.id!);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Criar Nova Rota</DialogTitle>
            <DialogContent dividers>
                {/* Exibe erro da API se houver */}
                {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                    {/* Coluna Esquerda: Nome, Responsável, Lista Ordenável */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Nome da Rota"
                            variant="outlined"
                            fullWidth
                            value={nomeRota}
                            onChange={(e) => {
                                setNomeRota(e.target.value);
                                if (apiError) setApiError(null); // Limpa erro ao digitar
                            }}
                            required
                            disabled={isSaving}
                            error={!!apiError && !nomeRota.trim()}
                        />

                        <FormControl fullWidth required error={!!apiError && !responsavel}>
                            <InputLabel id="responsavel-rota-label">Responsável pela Rota</InputLabel>
                            <Select
                                labelId="responsavel-rota-label"
                                value={responsavel}
                                label="Responsável pela Rota"
                                onChange={(e: SelectChangeEvent) => {
                                    setResponsavel(e.target.value);
                                    if (apiError) setApiError(null); // Limpa erro ao selecionar
                                }}
                                disabled={isSaving}
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
                                <List component={Paper} sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', opacity: isSaving ? 0.7 : 1 }}>
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
                    <Box sx={{ flex: 1, minHeight: 400, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden', opacity: isSaving ? 0.7 : 1 }}>
                        {routeData && (
                            <RouteMapComponent 
                                demandas={orderedDemandas} // <-- Propriedade corrigida de 'demands' para 'demandas'
                                path={currentRoutePath} 
                                modalIsOpen={open} // <-- Passa o estado 'open' para forçar o redraw
                            />
                        )}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button
                    onClick={handleCreateRoute}
                    variant="contained"
                    // Desabilita se salvando ou se campos obrigatórios estão vazios
                    disabled={isSaving || !nomeRota.trim() || !responsavel || orderedDemandas.length === 0}
                >
                    {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Salvar Rota'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}