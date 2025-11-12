// src/components/ui/demandas/CardDemanda.tsx
 'use client';

// Remove Status import if using StatusOption everywhere
// import { DemandaType, GeoJsonPoint, Status } from "@/types/demanda";
import { DemandaType } from "@/types/demanda";
 import { Card, CardHeader, CardContent, Box, Typography, Button, IconButton } from "@mui/material";
 import StatusDemanda from "./StatusDemanda";
 import { useState } from "react";
 import DetalhesDemandaModal from "./DetalhesDemandaModal";
 import DeleteIcon from '@mui/icons-material/Delete';
 import EditIcon from '@mui/icons-material/Edit';
 import dynamic from 'next/dynamic';

 const MiniMap = dynamic(() => import('./MiniMap'), {
     ssr: false,
     loading: () => <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', color: '#777' }}>Carregando mapa...</Box>
 });

 // Interface for the Status type coming from the API (needed here too)
 interface StatusOption {
     id: number;
     nome: string;
     cor: string;
 }

 // Interface for Demanda with id_status
 interface DemandaComIdStatus extends DemandaType {
    id_status?: number | null;
    // [CORREÇÃO APLICADA AQUI]: Adicionado lat/lng para uso seguro
    lat?: number | null; 
    lng?: number | null;
 }


 // Interface updated with new props for status handling
 interface CardDemandaProps extends DemandaComIdStatus { // Use updated Demanda interface
     isSelected: boolean;
     onSelect: (id: number) => void;
     onDelete: (id: number) => void;
     onEdit: (demanda: DemandaComIdStatus) => void; // Use updated Demanda interface
     onStatusChange: (demandaId: number, newStatusId: number) => Promise<void>; // Prop for changing status ID
     availableStatus: StatusOption[]; // <-- Add prop for available statuses
     currentStatusId?: number | null; // <-- Add prop for current status ID (already part of DemandaComIdStatus, but explicit for clarity)
 }


 export default function CardDemanda(props: CardDemandaProps) {
     // Destructure all props, including the new ones
     const { id, logradouro, numero, bairro, cidade, uf, tipo_demanda,
             descricao, prazo, // 'status' (string) might be unused now
             isSelected, onSelect, onDelete, onEdit, onStatusChange, geom,
             id_status, // <-- Destructure id_status
             availableStatus, // <-- Destructure availableStatus
             lat, // <-- Destructure lat
             lng // <-- Destructure lng
           } = props;
     const [modalOpen, setModalOpen] = useState(false);

     const handleOpenModal = (e: React.MouseEvent) => { e.stopPropagation(); setModalOpen(true); };
     const formatPrazo = (date: Date | null | undefined): string => { if (!date) return 'N/A'; if (date instanceof Date && !isNaN(date.getTime())) { try { return date.toLocaleDateString('pt-BR'); } catch (e) { console.error("Error formatting date:", date, e); return 'Data inválida'; } } console.warn("Invalid date value received:", date); return 'Data inválida'; };
     const formatEnderecoCurto = (): string => { const parts = [ logradouro, numero ? `, ${numero}` : '', bairro ? ` - ${bairro}` : '' ]; return parts.filter(Boolean).join('').trim() || 'Endereço não informado'; };

     // Extrai coordenadas - *** LÓGICA CORRIGIDA AQUI ***
     // Usa as propriedades lat/lng que agora são passadas diretamente pela API
     const latitude = lat ?? null;
     const longitude = lng ?? null;

     console.log(`Demanda ID ${id}: Lat=${latitude}, Lon=${longitude}`);

     // Define variáveis antes do return para evitar ReferenceError
     const demandaId = id;
     const currentStatusId = id_status; // <-- Use id_status here

     return (
         <div>
             <Card
                 onClick={() => demandaId !== undefined && onSelect(demandaId)}
                 sx={{
                     width: 400, height: 500, display: 'flex', flexDirection: 'column',
                     justifyContent: 'space-between', border: isSelected ? '2px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
                     cursor: 'pointer', transition: 'border 0.2s', '&:hover': { borderColor: isSelected ? '#1976d2' : 'rgba(0, 0, 0, 0.4)' }, boxSizing: 'border-box'
                 }}
             >
                 <Box>
                     <CardHeader
                        action={
                            // --- INÍCIO DA MODIFICAÇÃO ---
                            // 1. Container principal da action: vertical e alinhado à direita
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: -1 }}>
                                
                                {/* Linha 1: Ícones (horizontal) */}
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    {/* Botão Editar */}
                                    <IconButton
                                        aria-label={`Editar demanda ${id}`}
                                        color="primary"
                                        size="small"
                                        onClick={(e) => { e.stopPropagation(); onEdit(props); }} // Passa props inteiras
                                        title="Editar Demanda"
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    {/* Botão Deletar */}
                                    <IconButton
                                        aria-label={`Excluir demanda ${id}`}
                                        color="error"
                                        size="small"
                                        onClick={(e) => { e.stopPropagation(); if (demandaId !== undefined) onDelete(demandaId); }}
                                        title="Excluir Demanda"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>

                                {/* Linha 2: Status (abaixo dos ícones) */}
                                <Box sx={{ mt: 0.5 }}> {/* Adiciona espaçamento superior */}
                                    {demandaId !== undefined ? ( // Check if demandaId is valid
                                        <StatusDemanda
                                            demandaId={demandaId}
                                            currentStatusId={currentStatusId} // <-- Pass id_status
                                            availableStatus={availableStatus} // <-- Pass availableStatus list
                                            onStatusChange={onStatusChange}
                                        />
                                    ) : null}
                                </Box>
                            </Box>
                            // --- FIM DA MODIFICAÇÃO ---
                         }
                         title={tipo_demanda || `Demanda ${id}`}
                         subheader={formatEnderecoCurto()}
                         sx={{ pb: 0, alignItems: 'flex-start' }}
                         titleTypographyProps={{ textTransform: 'capitalize', fontWeight: 'bold' }}
                         subheaderTypographyProps={{ variant: 'body2', color: 'text.secondary', sx: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', } }}
                     />
                     <CardContent sx={{ flexGrow: 1, minHeight: 150 }}>
                         {/* Renderização Condicional do Mapa */}
                         <Box sx={{
                             position: 'relative', height: 200,
                             width: '100%', borderRadius: '4px', overflow: 'hidden',
                             backgroundColor: '#e0e0e0',
                             display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#757575'
                         }}>
                             {latitude !== null && longitude !== null ? (
                                  <MiniMap
                                    latitude={latitude}
                                    longitude={longitude}
                                    popupText={formatEnderecoCurto()}
                                    />
                             ) : (
                                 <Typography variant="caption">Mapa Indisponível (sem coordenadas)</Typography>
                             )}
                         </Box>
                     </CardContent>
                 </Box>
                 <CardContent sx={{ pt: 1 }}>
                     {/* Descrição, Prazo, Botão Detalhes */}
                     <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         {descricao}
                     </Typography>
                     <Typography variant="body2" sx={{mt:1}}>Prazo: {formatPrazo(prazo)}</Typography>
                     <Typography variant="caption" color="text.secondary" display="block">
                        {cidade && uf ? `${cidade}/${uf}` : (cidade || uf || '')}
                     </Typography>
                     <Button variant="outlined" size="small" onClick={handleOpenModal} sx={{ mt: 1 }}>
                         Detalhes
                     </Button>
                 </CardContent>
             </Card>
             {/* Modal de Detalhes */}
             {/* Passa props inteiras, que já inclui id_status, lat e lng */}
             <DetalhesDemandaModal open={modalOpen} onClose={() => setModalOpen(false)} demanda={props} />
         </div>
     );
 }