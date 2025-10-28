// src/components/ui/demandas/CardDemanda.tsx
 'use client';

 import { DemandaType, GeoJsonPoint, Status } from "@/types/demanda"; //
 import { Card, CardHeader, CardContent, Box, Typography, Button, IconButton } from "@mui/material";
 //
 import StatusDemanda from "./StatusDemanda";
 import { useState } from "react";
 //
 import DetalhesDemandaModal from "./DetalhesDemandaModal";
 import DeleteIcon from '@mui/icons-material/Delete';
 import EditIcon from '@mui/icons-material/Edit'; // Importa EditIcon
 import dynamic from 'next/dynamic'; // Importe dynamic

 // Carrega o MiniMap dinamicamente, apenas no lado do cliente
 //
 const MiniMap = dynamic(() => import('./MiniMap'), {
     ssr: false, // Desabilita a renderização no lado do servidor
     loading: () => <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', color: '#777' }}>Carregando mapa...</Box> // Placeholder enquanto carrega
 });


 // Interface atualizada com onEdit e onStatusChange
 interface CardDemandaProps extends DemandaType {
     isSelected: boolean;
     onSelect: (id: number) => void;
     onDelete: (id: number) => void;
     onEdit: (demanda: DemandaType) => void; // Prop para iniciar edição
     onStatusChange: (demandaId: number, newStatus: Status) => Promise<void>; // Prop para mudar status
 }

 export default function CardDemanda(props: CardDemandaProps) {
     // Desestrutura todas as props, incluindo as novas onEdit e onStatusChange
     const { id, logradouro, numero, bairro, cidade, uf, tipo_demanda,
             descricao, prazo, status, isSelected, onSelect, onDelete, onEdit, onStatusChange, geom } = props; //
     const [modalOpen, setModalOpen] = useState(false);

     const handleOpenModal = (e: React.MouseEvent) => { e.stopPropagation(); setModalOpen(true); }; //
     const formatPrazo = (date: Date | null | undefined): string => { /* ... (função mantida) ... */ if (!date) return 'N/A'; if (date instanceof Date && !isNaN(date.getTime())) { try { return date.toLocaleDateString('pt-BR'); } catch (e) { console.error("Error formatting date:", date, e); return 'Data inválida'; } } console.warn("Invalid date value received:", date); return 'Data inválida'; }; //
     const formatEnderecoCurto = (): string => { /* ... (função mantida) ... */ const parts = [ logradouro, numero ? `, ${numero}` : '', bairro ? ` - ${bairro}` : '' ]; return parts.filter(Boolean).join('').trim() || 'Endereço não informado'; }; //

     // Extrai coordenadas
     const coordinates = geom?.type === 'Point' ? geom.coordinates : null;
     const latitude = coordinates ? coordinates[1] : null;
     const longitude = coordinates ? coordinates[0] : null;

     console.log(`Demanda ID ${id}: Lat=${latitude}, Lon=${longitude}`); //

     // Define variáveis antes do return para evitar ReferenceError
     const demandaId = id;
     const currentStatus = status;

     return (
         <div>
             <Card
                 onClick={() => demandaId !== undefined && onSelect(demandaId)} // Garante que id existe
                 sx={{
                     width: 400, height: 500, display: 'flex', flexDirection: 'column',
                     justifyContent: 'space-between', border: isSelected ? '2px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
                     cursor: 'pointer', transition: 'border 0.2s', '&:hover': { borderColor: isSelected ? '#1976d2' : 'rgba(0, 0, 0, 0.4)' }, boxSizing: 'border-box'
                 }} //
             >
                 <Box>
                     <CardHeader
                        action={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: -1 }}>
                                {/* Renderiza StatusDemanda passando as props necessárias */}
                                {currentStatus && demandaId !== undefined ? (
                                    <StatusDemanda
                                        demandaId={demandaId}
                                        currentStatus={currentStatus}
                                        onStatusChange={onStatusChange} // Passa a função recebida
                                    />
                                ) : null} {/* */}
                                {/* Botão Editar */}
                                <IconButton
                                    aria-label={`Editar demanda ${id}`}
                                    color="primary"
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); onEdit(props); }} // Chama onEdit com todos os dados da demanda (props)
                                    title="Editar Demanda"
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                                {/* Botão Deletar */}
                                <IconButton
                                    aria-label={`Excluir demanda ${id}`}
                                    color="error"
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); if (demandaId !== undefined) onDelete(demandaId); }} // Garante que id existe
                                    title="Excluir Demanda"
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton> {/* */}
                            </Box>
                         }
                         title={tipo_demanda || `Demanda ${id}`} //
                         subheader={formatEnderecoCurto()} //
                         sx={{ pb: 0, alignItems: 'flex-start' }} //
                         titleTypographyProps={{ textTransform: 'capitalize', fontWeight: 'bold' }} //
                         subheaderTypographyProps={{ variant: 'body2', color: 'text.secondary', sx: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', } }} //
                     />
                     <CardContent sx={{ flexGrow: 1, minHeight: 150 /* Altura mínima para o mapa */ }}>
                         {/* Renderização Condicional do Mapa */}
                         <Box sx={{
                             position: 'relative', height: 200, /* Ocupa altura do CardContent */
                             width: '100%', borderRadius: '4px', overflow: 'hidden',
                             backgroundColor: '#e0e0e0',
                             display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#757575'
                         }}> {/* */}
                             {latitude !== null && longitude !== null ? (
                                  <MiniMap
                                    latitude={latitude}
                                    longitude={longitude}
                                    popupText={formatEnderecoCurto()} // Mostra endereço no popup
                                    /> //
                             ) : (
                                 <Typography variant="caption">Mapa Indisponível (sem coordenadas)</Typography> //
                             )}
                         </Box>
                     </CardContent>
                 </Box>
                 <CardContent sx={{ pt: 1 }}>
                     {/* Descrição, Prazo, Botão Detalhes */}
                     <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: '3.6em' }}>
                         {descricao}
                     </Typography> {/* */}
                     <Typography variant="body2" sx={{mt:1}}>Prazo: {formatPrazo(prazo)}</Typography> {/* */}
                     <Typography variant="caption" color="text.secondary" display="block">
                        {cidade && uf ? `${cidade}/${uf}` : (cidade || uf || '')}
                     </Typography> {/* */}
                     <Button variant="outlined" size="small" onClick={handleOpenModal} sx={{ mt: 1 }}>
                         Detalhes
                     </Button> {/* */}
                 </CardContent>
             </Card>
             {/* Modal de Detalhes */}
             <DetalhesDemandaModal open={modalOpen} onClose={() => setModalOpen(false)} demanda={props} /> {/* */}
         </div>
     );
 }