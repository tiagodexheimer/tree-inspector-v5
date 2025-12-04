import { Dialog, DialogTitle, DialogContent, Typography, DialogActions, Button, List, ListItem, ListItemText, Divider, Box } from "@mui/material";
import { DemandaType } from "@/types/demanda";

// Interface compatível com o que vem do Card
interface DemandaComCoordenadas extends DemandaType {
    lat?: number | null;
    lng?: number | null;
}

interface DetalhesDemandaModalProps {
  open: boolean;
  onClose: () => void;
  demanda: DemandaComCoordenadas | null;
}

export default function DetalhesDemandaModal({ open, onClose, demanda }: DetalhesDemandaModalProps) {
  if (!demanda) return null;

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

     const formatPrazo = (date: Date | string | null | undefined): string => {
        if (!date) return 'Não definido';
        const d = new Date(date);
        return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : 'Data inválida';
    };

    const lat = demanda.lat;
    const lng = demanda.lng;
    const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Detalhes da Demanda #{demanda.id || 'N/A'}</DialogTitle>
      <DialogContent dividers>
        <Typography gutterBottom variant="h6">Descrição</Typography>
        <Typography paragraph>{demanda.descricao || 'N/A'}</Typography>
        <Divider sx={{ my: 2 }} />

         <Typography gutterBottom variant="h6">Endereço</Typography>
         <Typography sx={{ whiteSpace: 'pre-line', mb: 2 }}>
             {formatEnderecoCompleto(demanda)}
         </Typography>
        <Divider sx={{ my: 2 }} />

        <Typography gutterBottom variant="h6">Solicitante</Typography>
        <List dense>
          <ListItem><ListItemText primary="Nome" secondary={demanda.nome_solicitante || 'N/A'} /></ListItem>
          <ListItem><ListItemText primary="Telefone" secondary={demanda.telefone_solicitante || 'N/A'} /></ListItem>
          <ListItem><ListItemText primary="Email" secondary={demanda.email_solicitante || 'N/A'} /></ListItem>
        </List>
        <Divider sx={{ my: 2 }} />

         <Typography gutterBottom variant="h6">Outras Informações</Typography>
         <List dense>
            <ListItem><ListItemText primary="Tipo" secondary={demanda.tipo_demanda || 'N/A'} /></ListItem>
            <ListItem><ListItemText primary="Status" secondary={demanda.status_nome || 'N/A'} /></ListItem>
             <ListItem><ListItemText primary="Prazo" secondary={formatPrazo(demanda.prazo)} /></ListItem>
            <ListItem><ListItemText primary="Responsável" secondary={demanda.responsavel || 'N/A'} /></ListItem>
            {demanda.protocolo && <ListItem><ListItemText primary="Protocolo" secondary={demanda.protocolo} /></ListItem> }
         </List>

         {hasCoordinates && (
             <>
                 <Divider sx={{ my: 2 }} />
                 <Typography gutterBottom variant="h6">Localização</Typography>
                 <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                     <Typography variant="body2">Lat: {lat}, Lon: {lng}</Typography>
                 </Box>
             </>
         )}

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}