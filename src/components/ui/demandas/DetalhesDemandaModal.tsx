// src/components/ui/demandas/DetalhesDemandaModal.tsx
import { Dialog, DialogTitle, DialogContent, Typography, DialogActions, Button, List, ListItem, ListItemText, Divider, Box } from "@mui/material"; // Adicionado Box
import { DemandaType } from "@/types/demanda";

interface DetalhesDemandaModalProps {
  open: boolean;
  onClose: () => void;
  demanda: DemandaType | null; // Tipo já está atualizado aqui
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
           {/* Remover 'contato' se for redundante
           {demanda.contato && (
                <>
                    <ListItem><ListItemText primary="Nome (Contato)" secondary={demanda.contato.nome} /></ListItem>
                    <ListItem><ListItemText primary="Telefone (Contato)" secondary={demanda.contato.telefone} /></ListItem>
                    <ListItem><ListItemText primary="Email (Contato)" secondary={demanda.contato.email} /></ListItem>
                </>
            )}
           */}
        </List>
        <Divider sx={{ my: 2 }} />

         {/* Outras Informações */}
         <Typography gutterBottom variant="h6">Outras Informações</Typography>
         <List dense>
            <ListItem>
                <ListItemText primary="Tipo de Demanda" secondary={demanda.tipo_demanda || 'N/A'} />
            </ListItem>
             <ListItem>
                <ListItemText primary="Status" secondary={demanda.status || 'N/A'} />
            </ListItem>
             <ListItem>
                 <ListItemText primary="Prazo" secondary={formatPrazo(demanda.prazo)} />
            </ListItem>
            <ListItem>
                <ListItemText primary="Responsável Técnico" secondary={demanda.responsavel || 'N/A'} />
            </ListItem>
            {/* Adicionar Protocolo, Data de Criação, etc. se disponíveis e relevantes */}
            {demanda.protocolo && <ListItem><ListItemText primary="Protocolo" secondary={demanda.protocolo} /></ListItem> }
         </List>

         {/* (Opcional) Mostrar Mapa com base na geometria (geom) */}
         {demanda.geom && (
             <>
                 <Divider sx={{ my: 2 }} />
                 <Typography gutterBottom variant="h6">Localização (Aproximada)</Typography>
                 <Box sx={{ height: 200, backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', borderRadius: 1 }}>
                      {/* Aqui poderia integrar um mapa real (Leaflet, Google Maps API) */}
                     <Typography variant="caption">
                         Lat: {demanda.geom.coordinates[1]}, Lon: {demanda.geom.coordinates[0]}
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