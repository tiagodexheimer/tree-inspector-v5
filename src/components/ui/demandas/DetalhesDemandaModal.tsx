import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, Typography, DialogActions,
  Button, List, ListItem, ListItemText, Divider, Box, CircularProgress,
  Tabs, Tab
} from "@mui/material";
import dynamic from 'next/dynamic';

// [CORREÇÃO] Importamos o tipo completo
import { DemandaType, DemandaComIdStatus } from "@/types/demanda";
import NotificacoesTab from "./NotificacoesTab";
import StatusDemanda from "./StatusDemanda";

interface DetalhesDemandaModalProps {
  open: boolean;
  onClose: () => void;
  // [CORREÇÃO] Usamos o tipo que garante a propriedade status_nome
  demanda: DemandaComIdStatus | null;
  availableStatus: any[]; // [NOVO]
  onStatusChange: (demandaId: number, newStatusId: number) => Promise<void>; // [NOVO]
}

const MiniMap = dynamic(() => import("./MiniMap"), {
  ssr: false,
  loading: () => (
    <Box sx={{ height: 250, bgcolor: '#eee', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={24} />
    </Box>
  )
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function DetalhesDemandaModal({ open, onClose, demanda, availableStatus, onStatusChange }: DetalhesDemandaModalProps) {
  const [tabIndex, setTabIndex] = useState(0);

  if (!demanda) {
    return null;
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  // Função para formatar o endereço completo
  const formatEnderecoCompleto = (d: DemandaType): string => {
    const parts = [
      d.logradouro,
      d.numero ? `, ${d.numero}` : '',
      d.complemento ? ` - ${d.complemento}` : '',
      d.bairro ? `\nBairro: ${d.bairro}` : '',
      d.cidade && d.uf ? `\n${d.cidade}/${d.uf}` : (d.cidade || d.uf || ''),
      d.cep ? `\nCEP: ${d.cep}` : ''
    ];
    return parts.filter(Boolean).join('').trim();
  };

  // Função para formatar o prazo
  const formatPrazo = (date: Date | string | null | undefined): string => {
    if (!date) return 'Não definido';
    const d = new Date(date);
    return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : 'Data inválida';
  };

  // Variáveis de coordenadas
  const lat = demanda.lat;
  const lng = demanda.lng;
  const hasCoordinates = typeof lat === 'number' && typeof lng === 'number' && lat !== null && lng !== null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div" fontWeight="bold">
          Detalhes da Demanda #{demanda.id || 'N/A'}
        </Typography>
        <StatusDemanda
          demandaId={demanda.id!}
          currentStatusId={demanda.id_status}
          availableStatus={availableStatus}
          onStatusChange={onStatusChange}
          fallbackName={demanda.status_nome || undefined}
          fallbackColor={demanda.status_cor || undefined}
        />
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tabIndex} onChange={handleTabChange}>
          <Tab label="Informações" />
          <Tab label="Fiscalização / Prazos" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {/* ABA 0: INFORMAÇÕES GERAIS */}
        <CustomTabPanel value={tabIndex} index={0}>
          {/* Descrição */}
          <Typography gutterBottom variant="h6">Descrição</Typography>
          <Typography paragraph>{demanda.descricao || 'N/A'}</Typography>
          <Divider sx={{ my: 2 }} />

          {/* Endereço Detalhado */}
          <Typography gutterBottom variant="h6">Endereço</Typography>
          <Typography sx={{ whiteSpace: 'pre-line', mb: 2 }}>
            {formatEnderecoCompleto(demanda)}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Informações do Solicitante */}
          <Typography gutterBottom variant="h6">Informações do Solicitante</Typography>
          <List dense>
            <ListItem><ListItemText primary="Nome" secondary={demanda.nome_solicitante || 'N/A'} /></ListItem>
            <ListItem><ListItemText primary="Telefone" secondary={demanda.telefone_solicitante || 'N/A'} /></ListItem>
            <ListItem><ListItemText primary="Email" secondary={demanda.email_solicitante || 'N/A'} /></ListItem>
          </List>
          <Divider sx={{ my: 2 }} />

          {/* Outras Informações */}
          <Typography gutterBottom variant="h6">Outras Informações</Typography>
          <List dense>
            <ListItem><ListItemText primary="Tipo de Demanda" secondary={demanda.tipo_demanda || 'N/A'} /></ListItem>
            <ListItem><ListItemText primary="Prazo" secondary={formatPrazo(demanda.prazo)} /></ListItem>
            <ListItem><ListItemText primary="Responsável Técnico" secondary={demanda.responsavel || 'N/A'} /></ListItem>
            {demanda.protocolo && <ListItem><ListItemText primary="Protocolo" secondary={demanda.protocolo} /></ListItem>}
          </List>

          {/* Anexos */}
          {demanda.anexos && demanda.anexos.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography gutterBottom variant="h6">Anexos</Typography>
              <List dense>
                {demanda.anexos.map((anexo, index) => (
                  <ListItem key={index}>
                    <Button
                      component="a" href={anexo.url} target="_blank" rel="noopener noreferrer"
                      variant="outlined" size="small"
                      sx={{ textTransform: 'none', justifyContent: 'flex-start', width: '100%' }}
                    >
                      {anexo.nome} ({anexo.type && anexo.type.split('/')[1]?.toUpperCase() || 'ARQUIVO'})
                    </Button>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {/* Localização */}
          {hasCoordinates && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography gutterBottom variant="h6">Localização (Aproximada)</Typography>
              <Box sx={{ height: 250, borderRadius: 1, overflow: 'hidden', border: '1px solid #eee' }}>
                <MiniMap latitude={lat!} longitude={lng!} popupText={demanda.descricao || 'Local da Demanda'} />
              </Box>
            </>
          )}
        </CustomTabPanel>

        {/* ABA 1: FISCALIZAÇÃO */}
        <CustomTabPanel value={tabIndex} index={1}>
          <NotificacoesTab demanda={demanda} />
        </CustomTabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
