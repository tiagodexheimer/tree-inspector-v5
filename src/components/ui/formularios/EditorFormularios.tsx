// src/components/ui/formularios/EditorFormularios.tsx
import React from 'react';
import { Box, Typography, Card, TextField, Button, IconButton, List, ListItem, ListItemText } from '@mui/material';
import { AddCircleOutline, DeleteOutline, Edit } from '@mui/icons-material';
// CORREÇÃO: Importar do arquivo de tipos centralizado
import { CampoDef, CampoOpcao } from '@/types/formularios'; 

interface EditorProps {
  campos: CampoDef[];
  setCampos: (campos: CampoDef[]) => void; // Simplifiquei a tipagem da função
}

export default function EditorFormularios({ campos, setCampos }: EditorProps) {

  const [editingOption, setEditingOption] = React.useState<{ campoId: string; optionId: string } | null>(null);
  const [tempOptionLabel, setTempOptionLabel] = React.useState('');
  const [tempOptionValue, setTempOptionValue] = React.useState('');

  const handleCampoChange = (id: string, event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    
    // Verifica se é um input numérico para converter corretamente
    const newValue = type === 'number' ? (parseInt(value, 10) || 0) : value;

    setCampos(
      campos.map(campo => campo.id === id ? { ...campo, [name]: newValue } : campo)
    );
  };

  const handleRemoverCampo = (id: string) => {
    setCampos(campos.filter(campo => campo.id !== id));
  };

  // --- Gerenciamento de Opções ---

  const handleAddOption = (campoId: string) => {
    const newOptionId = `opt_${Date.now()}`;
    setCampos(
      campos.map(campo => {
        if (campo.id !== campoId) return campo;
        const currentOptions = campo.options || [];
        const count = currentOptions.length + 1;
        return {
            ...campo,
            options: [...currentOptions, { id: newOptionId, value: `valor_${count}`, label: `Opção ${count}` }]
        };
      })
    );
  };

  const handleRemoveOption = (campoId: string, optionId: string) => {
    setCampos(
      campos.map(campo => 
        campo.id === campoId 
            ? { ...campo, options: campo.options?.filter(opt => opt.id !== optionId) } 
            : campo
      )
    );
  };

  // ... (O restante das funções de edição de opção permanece igual, a lógica está correta) ...
  const handleStartEditOption = (campoId: string, option: CampoOpcao) => {
    setEditingOption({ campoId, optionId: option.id });
    setTempOptionLabel(option.label);
    setTempOptionValue(option.value);
  };

  const handleCancelEditOption = () => {
    setEditingOption(null);
  };

  const handleSaveOption = () => {
    if (!editingOption) return;
    const { campoId, optionId } = editingOption;

    setCampos(
      campos.map(campo =>
        campo.id === campoId
          ? {
              ...campo,
              options: campo.options?.map(opt =>
                opt.id === optionId ? { ...opt, label: tempOptionLabel, value: tempOptionValue } : opt
              )
            }
          : campo
      )
    );
    handleCancelEditOption();
  };

  // Renderizador de opções (extraído para const dentro do componente ou função)
  const renderOptionEditor = (campo: CampoDef) => (
    <Box sx={{ mt: 2, borderTop: '1px dashed #ccc', pt: 1 }}>
      <Typography variant="caption" display="block" gutterBottom>Opções:</Typography>
      <List dense disablePadding>
        {campo.options?.map((option) => (
          <ListItem
            key={option.id}
            disableGutters
            secondaryAction={
              <>
                <IconButton edge="end" size="small" onClick={() => handleStartEditOption(campo.id, option)} disabled={!!editingOption}>
                  <Edit fontSize="inherit" />
                </IconButton>
                <IconButton edge="end" size="small" onClick={() => handleRemoveOption(campo.id, option.id)} disabled={!!editingOption}>
                  <DeleteOutline fontSize="inherit" />
                </IconButton>
              </>
            }
          >
            {editingOption?.campoId === campo.id && editingOption?.optionId === option.id ? (
              <Box sx={{ display: 'flex', gap: 1, width: '100%', mr: 8 }}>
                 <TextField label="Label" size="small" variant="standard" value={tempOptionLabel} onChange={(e) => setTempOptionLabel(e.target.value)} fullWidth />
                 <TextField label="Valor" size="small" variant="standard" value={tempOptionValue} onChange={(e) => setTempOptionValue(e.target.value)} fullWidth />
                <Button size="small" onClick={handleSaveOption}>OK</Button>
              </Box>
            ) : (
              <ListItemText primary={option.label} secondary={`Valor: ${option.value}`} />
            )}
          </ListItem>
        ))}
      </List>
      <Button size="small" startIcon={<AddCircleOutline />} onClick={() => handleAddOption(campo.id)} disabled={!!editingOption}>
        Adicionar Opção
      </Button>
    </Box>
  );

  return (
    <Box sx={{ border: '1px solid #ddd', borderRadius: 2, p: 2, width: '100%', maxHeight: '70vh', overflowY: 'auto', bgcolor: 'background.paper' }}>
      <Typography variant="h6" gutterBottom>Editor de Campos</Typography>

      {campos.length === 0 && (
        <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 4 }}>
          Nenhum campo selecionado.
        </Typography>
      )}

      {campos.map(campo => (
        <Card key={campo.id} variant="outlined" sx={{ mb: 2, p: 2, bgcolor: '#fafafa' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary' }}>
              {campo.type}
            </Typography>
            <Button size="small" color="error" onClick={() => handleRemoverCampo(campo.id)}>Remover</Button>
          </Box>

          <TextField fullWidth label="Rótulo (Label)" variant="outlined" size="small" name="label" value={campo.label} onChange={(e) => handleCampoChange(campo.id, e)} sx={{ mb: 2, bgcolor: 'white' }} />
          
          {(campo.type === 'text' || campo.type === 'textarea') && (
            <TextField fullWidth label="Placeholder" variant="outlined" size="small" name="placeholder" value={campo.placeholder || ''} onChange={(e) => handleCampoChange(campo.id, e)} sx={{ mb: 2, bgcolor: 'white' }} />
          )}

          {campo.type === 'textarea' && (
             <TextField fullWidth label="Linhas" type="number" variant="outlined" size="small" name="rows" value={campo.rows || 3} onChange={(e) => handleCampoChange(campo.id, e)} sx={{ mb: 2, bgcolor: 'white' }} />
          )}

          {(campo.type === 'select' || campo.type === 'radio') && renderOptionEditor(campo)}
        </Card>
      ))}
    </Box>
  );
}