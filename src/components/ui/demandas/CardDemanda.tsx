// src/components/ui/demandas/CardDemanda.tsx
'use client';

import { DemandaType } from "@/types/demanda"; // Remove Status import if unused here
import { Card, CardHeader, CardContent, Box, Typography, Button } from "@mui/material";
import StatusDemanda from "./StatusDemanda";
import { useState } from "react";
import DetalhesDemandaModal from "./DetalhesDemandaModal";

// Assuming CardDemandaProps includes DemandaType properties plus isSelected and onSelect
interface CardDemandaProps extends DemandaType {
    isSelected: boolean;
    // FIX: Change prop type to expect only number
    onSelect: (id: number) => void;
}

export default function CardDemanda(props: CardDemandaProps) {

    
    // id is now correctly number | undefined
    const { id, logradouro, numero, bairro, cidade, uf, tipo_demanda, // Campos de endereço
            descricao, prazo, status, isSelected, onSelect } = props;
    const [modalOpen, setModalOpen] = useState(false);

    const handleOpenModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        setModalOpen(true);
    };

    // Helper function (ensure it handles Date | null | undefined)
    const formatPrazo = (date: Date | null | undefined): string => {
       if (!date) return 'N/A';
        if (date instanceof Date && !isNaN(date.getTime())) {
             try {
                return date.toLocaleDateString('pt-BR');
             } catch (e) {
                console.error("Error formatting date:", date, e);
                return 'Data inválida';
            }
        }
        console.warn("Invalid date value received:", date);
        return 'Data inválida';
    };
// Formata um endereço mais curto para o subheader do card
    const formatEnderecoCurto = (): string => {
        const parts = [
            logradouro,
            numero ? `, ${numero}` : '',
            bairro ? ` - ${bairro}` : '',
            // cidade ? `, ${cidade}` : '', // Pode ficar muito longo para o subheader
            // uf ? `/${uf}` : '',
        ];
        return parts.filter(Boolean).join('').trim() || 'Endereço não informado';
    };

    return (
        <div>
            <Card
                // Pass number id, use non-null assertion
                onClick={() => onSelect(id!)}
                sx={{
                    width: 400,
                    height: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: isSelected ? '2px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
                    cursor: 'pointer',
                    transition: 'border 0.2s',
                    '&:hover': {
                        borderColor: isSelected ? '#1976d2' : 'rgba(0, 0, 0, 0.4)'
                    },
                    boxSizing: 'border-box'
                }}
            >
                <Box>
                    <CardHeader
                        action={status ? <StatusDemanda status={status} /> : null}
                        title={tipo_demanda || `Demanda ${id}`} // Uses number id
                        subheader={formatEnderecoCurto()}
                        sx={{ pb: 0, alignItems: 'flex-start' }}
                        // Aumenta o número de linhas para o subheader se necessário
                        subheaderTypographyProps={{ noWrap: false, variant: 'body2', color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    />
                    <CardContent>
                        <Box sx={{
                             position: 'relative', paddingTop: '50%', width: '100%',
                             borderRadius: '4px', overflow: 'hidden', backgroundColor: '#e0e0e0',
                             display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#757575'
                        }}>
                             <Typography variant="caption">Mapa Indisponível</Typography>
                        </Box>
                    </CardContent>
                </Box>
                <CardContent sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    <Typography variant="body2" color="text.secondary" sx={{
                        mb: 1, display: '-webkit-box', WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis',
                        minHeight: '3.6em'
                        }}>
                        {descricao}
                    </Typography>
                    <Typography variant="body2">Prazo: {formatPrazo(prazo)}</Typography>
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