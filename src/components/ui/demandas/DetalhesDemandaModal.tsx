// src/components/ui/demandas/DetalhesDemandaModal.tsx
import { Dialog, DialogTitle, DialogContent, Typography, DialogActions, Button, List, ListItem, ListItemText, Divider, Box } from "@mui/material"; // Adicionado Box
import { DemandaType } from "@/types/demanda";

// [CORREÇÃO 1: Estender a interface para reconhecer lat e lng]
interface DemandaComCoordenadas extends DemandaType {
    lat?: number | null; // Inclui os novos campos lat/lng
    lng?: number | null;
}

interface DetalhesDemandaModalProps {
  open: boolean;
  onClose: () => void;
  // [CORREÇÃO 2: Usar a nova interface]
  demanda: DemandaComCoordenadas | null; 
}

export default function DetalhesDemandaModal({ open, onClose, demanda }: DetalhesDemandaModalProps) {
  if (!demanda) {
    return null;
  }

  // Função para formatar o endereço completo no modal
   const formatEnderecoCompleto = (d: DemandaType): string => {
        const parts = [
            d.logradouro,
            d.numero ? `, ${d.numero}` : '',
            d.complemento ? ` - ${d.complemento}` : '',
            d.bairro ? `\nBairro: ${d.bairro}` : '', // Quebra de linha para clareza
            d.cidade && d.uf ? `\n${d.cidade}/${d.uf}` : (d.cidade || d.uf || ''),
            d.cep ? `\nCEP: ${d.cep}` : ''
        ];
        // Usar whiteSpace: 'pre-line' no sx para respeitar as quebras de linha (\n)
        return parts.filter(Boolean).join('').trim();
    };

    // Função para formatar o prazo
     const formatPrazo = (date: Date | null | undefined): string => {
        if (date instanceof Date && !isNaN(date.getTime())) {
             try { return date.toLocaleDateString('pt-BR'); }
             catch { return 'Data inválida'; }
        }
        return 'Não definido';
    };

    // Variáveis de coordenadas para uso mais limpo
    const lat = demanda.lat;
    const lng = demanda.lng;
    const hasCoordinates = typeof lat === 'number' && typeof lng === 'number' && lat !== null && lng !== null;


  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Detalhes da Demanda #{demanda.id || 'N/A'}</DialogTitle>
      <DialogContent dividers>
        {/* Descrição */}
        <Typography gutterBottom variant="h6">Descrição</Typography>
        <Typography paragraph>{demanda.descricao || 'N/A'}</Typography>
        <Divider sx={{ my: 2 }} />

         {/* Endereço Detalhado */}
         <Typography gutterBottom variant="h6">Endereço</Typography>
         <Typography sx={{ whiteSpace: 'pre-line', mb: 2 }}> {/* Respeita as quebras de linha */}
             {formatEnderecoCompleto(demanda)}
         </Typography>
        <Divider sx={{ my: 2 }} />


        {/* Informações do Solicitante (usando campos individuais) */}
        <Typography gutterBottom variant="h6">Informações do Solicitante</Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Nome" secondary={demanda.nome_solicitante || 'N/A'} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Telefone" secondary={demanda.telefone_solicitante || 'N/A'} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Email" secondary={demanda.email_solicitante || 'N/A'} />
          </ListItem>
        </List>
        <Divider sx={{ my: 2 }} />

         {/* Outras Informações */}
         <Typography gutterBottom variant="h6">Outras Informações</Typography>
         <List dense>
            <ListItem>
                <ListItemText primary="Tipo de Demanda" secondary={demanda.tipo_demanda || 'N/A'} />
            </ListItem>
             <ListItem>
                <ListItemText primary="Status" secondary={(demanda as any).status_nome || 'N/A'} />
            </ListItem>
             <ListItem>
                 <ListItemText primary="Prazo" secondary={formatPrazo(demanda.prazo)} />
            </ListItem>
            <ListItem>
                <ListItemText primary="Responsável Técnico" secondary={demanda.responsavel || 'N/A'} />
            </ListItem>
            {demanda.protocolo && <ListItem><ListItemText primary="Protocolo" secondary={demanda.protocolo} /></ListItem> }
         </List>

         {/* [CORREÇÃO 3: Usar lat e lng, e remover a dependência de demanda.geom] */}
         {hasCoordinates && (
             <>
                 <Divider sx={{ my: 2 }} />
                 <Typography gutterBottom variant="h6">Localização (Aproximada)</Typography>
                 <Box sx={{ height: 200, backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', borderRadius: 1 }}>
                      {/* Aqui poderia integrar um mapa real (Leaflet, Google Maps API) */}
                     <Typography variant="caption">
                         Lat: {lat.toFixed(6)}, Lon: {lng.toFixed(6)}
                     </Typography>
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