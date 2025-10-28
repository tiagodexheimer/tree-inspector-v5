import { Dialog, DialogTitle, DialogContent, Typography, DialogActions, Button, List, ListItem, ListItemText, Divider } from "@mui/material";
import { DemandaType } from "@/types/demanda";

interface DetalhesDemandaModalProps {
  open: boolean;
  onClose: () => void;
  demanda: DemandaType | null;
}

export default function DetalhesDemandaModal({ open, onClose, demanda }: DetalhesDemandaModalProps) {
  if (!demanda) {
    return null; // Não renderiza nada se nenhuma demanda for fornecida
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Detalhes da Demanda #{demanda.id}</DialogTitle>
      <DialogContent dividers>
        <Typography gutterBottom variant="h6">Descrição Completa</Typography>
        <Typography paragraph>{demanda.descricao}</Typography>

        <Divider sx={{ my: 2 }} />

        <Typography gutterBottom variant="h6">Informações do Solicitante</Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Nome" secondary={demanda.contato?.nome} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Telefone" secondary={demanda.contato?.telefone} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Email" secondary={demanda.contato?.email} />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

         <Typography gutterBottom variant="h6">Outras Informações</Typography>
         <List dense>
            <ListItem>
                <ListItemText primary="Responsável Técnico" secondary={demanda.responsavel} />
            </ListItem>
         </List>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}