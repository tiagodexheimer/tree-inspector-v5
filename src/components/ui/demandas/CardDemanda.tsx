// src/components/ui/demandas/CardDemanda.tsx
'use client';

import React, { useState, memo, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  Typography,
  Button,
  IconButton,
  useTheme,
  useMediaQuery
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import dynamic from 'next/dynamic';

import StatusDemanda from "./StatusDemanda";
import DetalhesDemandaModal from "./DetalhesDemandaModal";
import { DemandaType } from "@/types/demanda";

const MiniMap = dynamic(() => import('./MiniMap'), {
  ssr: false,
  loading: () => (
    <Box sx={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#eee',
      color: '#777'
    }}>
      Carregando mapa...
    </Box>
  )
});

interface StatusOption {
  id: number;
  nome: string;
  cor: string;
}

interface DemandaComIdStatus extends DemandaType {
  id_status?: number | null;
  lat: number | null;
  lng: number | null;
}

interface CardDemandaProps extends DemandaComIdStatus {
  isSelected: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (demanda: DemandaComIdStatus) => void;
  onStatusChange: (demandaId: number, newStatusId: number) => Promise<void>;
  availableStatus: StatusOption[];
  currentStatusId?: number | null;
}

const formatEnderecoCurto = (logradouro?: string | null, numero?: string, bairro?: string | null): string => {
  const parts = [
    logradouro || '',
    numero ? `, ${numero}` : '',
    bairro ? ` - ${bairro}` : ''
  ];
  return parts.join('').trim();
};

const CardDemanda = memo((props: CardDemandaProps) => {
  const {
    id, logradouro, numero, bairro, cidade, uf, tipo_demanda,
    descricao, prazo,
    isSelected, onSelect, onDelete, onEdit, onStatusChange,
    id_status, availableStatus,
    lat, lng
  } = props;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [modalOpen, setModalOpen] = useState(false);

  const handleCardClick = () => id && onSelect(id);

  const enderecoFormatado = formatEnderecoCurto(logradouro, numero, bairro);
  const prazoTexto = prazo ? prazo.toLocaleDateString('pt-BR') : 'N/A';
  const localizacao = cidade && uf ? `${cidade}/${uf}` : '';

  const openModal = (e: any) => {
    e.stopPropagation();
    setModalOpen(true);
  };

  return (
    <>
      <Card
        onClick={handleCardClick}
        sx={{
          width: { xs: '100%', sm: 300, md: 360 },
          height: { xs: 420, sm: 460 },
          display: 'flex',
          flexDirection: 'column',
          border: isSelected ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(0,0,0,0.12)',
          cursor: 'pointer',
          transition: '0.2s',
          boxSizing: 'border-box',
          '&:hover': { boxShadow: 4 }
        }}
      >
        <CardHeader
          title={tipo_demanda || `Demanda ${id}`}
          subheader={enderecoFormatado}
          action={
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(props); }}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(id!); }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              <StatusDemanda
                demandaId={id!}
                currentStatusId={id_status}
                availableStatus={availableStatus}
                onStatusChange={onStatusChange}
              />
            </Box>
          }
          titleTypographyProps={{
            fontWeight: "bold",
            fontSize: isMobile ? "0.95rem" : "1rem",
            noWrap: true
          }}
          subheaderTypographyProps={{
            variant: "caption",
            color: "text.secondary",
            noWrap: true
          }}
          sx={{ pb: 0 }}
        />

        <CardContent sx={{ flexGrow: 1 }}>
          {/* MAPA RESPONSIVO PEQUENO */}
          <Box
            sx={{
              height: { xs: 120, sm: 150 },
              width: "100%",
              borderRadius: 2,
              overflow: "hidden",
              mb: 1,
              backgroundColor: "#eee"
            }}
          >
            {lat && lng ? (
              <MiniMap latitude={lat} longitude={lng} popupText={enderecoFormatado} />
            ) : (
              <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#777" }}>
                <Typography variant="caption">Sem localização</Typography>
              </Box>
            )}
          </Box>

          {/* DESCRIÇÃO CURTA */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxHeight: "44px",
            }}
          >
            {descricao}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            Prazo: {prazoTexto}
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" noWrap>
            {localizacao}
          </Typography>

          <Button
            variant="outlined"
            size="small"
            onClick={openModal}
            sx={{ mt: 1 }}
          >
            Detalhes
          </Button>
        </CardContent>
      </Card>

      {modalOpen && (
        <DetalhesDemandaModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          demanda={props}
        />
      )}
    </>
  );
});

CardDemanda.displayName = "CardDemanda";
export default CardDemanda;
