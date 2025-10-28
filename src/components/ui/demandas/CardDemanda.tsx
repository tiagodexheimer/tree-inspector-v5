// src/components/ui/demandas/CardDemanda.tsx
 'use client';

 import { DemandaType, GeoJsonPoint } from "@/types/demanda"; // Importe GeoJsonPoint
 import { Card, CardHeader, CardContent, Box, Typography, Button, IconButton } from "@mui/material";
 import StatusDemanda from "./StatusDemanda";
 import { useState } from "react";
 import DetalhesDemandaModal from "./DetalhesDemandaModal";
 import DeleteIcon from '@mui/icons-material/Delete'; 
 import dynamic from 'next/dynamic'; // Importe dynamic

 // Carrega o MiniMap dinamicamente, apenas no lado do cliente
 const MiniMap = dynamic(() => import('./MiniMap'), {
     ssr: false, // Desabilita a renderização no lado do servidor
     loading: () => <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', color: '#777' }}>Carregando mapa...</Box> // Placeholder enquanto carrega
 });


 interface CardDemandaProps extends DemandaType {
     isSelected: boolean;
     onSelect: (id: number) => void;
     onDelete: (id: number) => void;
 }

 export default function CardDemanda(props: CardDemandaProps) {
     const { id, logradouro, numero, bairro, cidade, uf, tipo_demanda,
             descricao, prazo, status, isSelected, onSelect, onDelete, geom } = props; // Adicione geom aqui
     const [modalOpen, setModalOpen] = useState(false);

     const handleOpenModal = (e: React.MouseEvent) => { /* ... */ e.stopPropagation(); setModalOpen(true); };
     const formatPrazo = (date: Date | null | undefined): string => { /* ... */ if (!date) return 'N/A'; if (date instanceof Date && !isNaN(date.getTime())) { try { return date.toLocaleDateString('pt-BR'); } catch (e) { console.error("Error formatting date:", date, e); return 'Data inválida'; } } console.warn("Invalid date value received:", date); return 'Data inválida'; };
     const formatEnderecoCurto = (): string => { /* ... */ const parts = [ logradouro, numero ? `, ${numero}` : '', bairro ? ` - ${bairro}` : '' ]; return parts.filter(Boolean).join('').trim() || 'Endereço não informado'; };

     // *** Extrai coordenadas do geom ***
     // Lembre-se que o banco retorna [longitude, latitude]
     const coordinates = geom?.type === 'Point' ? geom.coordinates : null;
     const latitude = coordinates ? coordinates[1] : null; // Pega a latitude (segundo elemento)
     const longitude = coordinates ? coordinates[0] : null; // Pega a longitude (primeiro elemento)
     // **********************************


console.log(`Demanda ID ${id}: Lat=${latitude}, Lon=${longitude}`);


     return (
         <div>
             <Card
                 onClick={() => onSelect(id!)}
                 sx={{ /* ... estilos do card ... */
                     width: 400, height: 500, display: 'flex', flexDirection: 'column',
                     justifyContent: 'space-between', border: isSelected ? '2px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
                     cursor: 'pointer', transition: 'border 0.2s', '&:hover': { borderColor: isSelected ? '#1976d2' : 'rgba(0, 0, 0, 0.4)' }, boxSizing: 'border-box'
                 }}
             >
                 <Box>
                     <CardHeader
                        action={ /* ... actions com status e delete ... */
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: -1 }}>
                                {status ? <StatusDemanda status={status} /> : null}
                                <IconButton aria-label={`Excluir demanda ${id}`} color="error" size="small" onClick={(e) => { e.stopPropagation(); onDelete(id!); }} title="Excluir Demanda" >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                         }
                         title={tipo_demanda || `Demanda ${id}`}
                         subheader={formatEnderecoCurto()}
                         sx={{ pb: 0, alignItems: 'flex-start' }}
                         titleTypographyProps={{ textTransform: 'capitalize', fontWeight: 'bold' }}
                         subheaderTypographyProps={{ variant: 'body2', color: 'text.secondary', sx: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', } }}
                     />
                     <CardContent sx={{ flexGrow: 1, minHeight: 150 /* Ajuste a altura mínima se necessário */ }}>
                         {/* *** Renderização Condicional do Mapa *** */}
                         <Box sx={{
                             position: 'relative', height: '100%', /* Ocupa altura do CardContent */
                             width: '100%', borderRadius: '4px', overflow: 'hidden',
                             backgroundColor: '#e0e0e0', // Fundo para caso de erro/loading
                             display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#757575'
                         }}>
                             {latitude !== null && longitude !== null ? (
                                  // Renderiza o mapa dinâmico se tiver coordenadas
                                  <MiniMap
                                    latitude={latitude}
                                    longitude={longitude}
                                    popupText={formatEnderecoCurto()} // Mostra endereço no popup
                                    />
                             ) : (
                                 // Placeholder se não houver coordenadas
                                 <Typography variant="caption">Mapa Indisponível (sem coordenadas)</Typography>
                             )}
                         </Box>
                         {/* *************************************** */}
                     </CardContent>
                 </Box>
                 <CardContent sx={{ pt: 1 /* Reduz padding se necessário */ }}>
                     <Typography variant="body2" color="text.secondary" sx={{ /* ... estilos descrição ... */ mb: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: '3.6em' }}>
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
             <DetalhesDemandaModal open={modalOpen} onClose={() => setModalOpen(false)} demanda={props} />
         </div>
     );
 }