// src/components/ui/formularios/FieldConfigurator.tsx
import { 
    Box, Typography, TextField,
    Button, IconButton, 
    FormControl, InputLabel, Select, MenuItem, CardContent
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { FormField } from '@/types/demanda';
import React from 'react';

interface FieldConfiguratorProps {
    field: FormField;
    updateField: (id: string | number, updatedField: Partial<FormField>) => void;
    deleteField: (id: string | number) => void;
    onClose: () => void;
}

export function FieldConfigurator({ field, updateField, deleteField, onClose }: FieldConfiguratorProps) {
    
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...(field.options || [])];
        newOptions[index] = value;
        updateField(field.id, { options: newOptions });
    };

    const addOption = () => {
        const currentOptions = field.options || [];
        const newOptionName = `Nova Opção ${currentOptions.length + 1}`;
        const newOptions = [...currentOptions, newOptionName];
        updateField(field.id, { options: newOptions });
    };

    const removeOption = (index: number) => {
        const newOptions = [...(field.options || [])];
        newOptions.splice(index, 1);
        updateField(field.id, { options: newOptions });
    };

    return (
        // Removido o Box desnecessário do CardContent do passo anterior, ajustado para ser um painel simples
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" gutterBottom>
                    Configurar Campo
                </Typography>
                {/* O botão de fechar agora usa a função onClose que volta para a aba Preview */}
                <Button onClick={onClose} size="small" color="inherit">
                    Visualizar
                </Button>
            </Box>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                Tipo: **{field.type.toUpperCase()}**
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                
                {/* Título/Label do Campo (Comum a todos) */}
                <TextField
                    label="Título do Campo"
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    fullWidth
                    size="small"
                    margin="normal"
                />

                {/* Dica de Escrita / Placeholder (Aplica-se a Input e Switch) */}
                {(field.type === 'input' || field.type === 'switch') && (
                    <TextField
                        label={field.type === 'input' ? "Dica de Escrita (Placeholder)" : "Label do Switch (On/Off)"}
                        value={field.placeholder}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        fullWidth
                        size="small"
                    />
                )}

                {/* Edição de Opções (Aplica-se a Checkbox e Select) */}
                {(field.type === 'checkbox' || field.type === 'select') && (
                    <Box sx={{ mt: 2, border: '1px solid #ccc', p: 2, borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>Opções de Seleção/Marcação</Typography>
                        {field.options?.map((option, index) => (
                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <TextField
                                    label={`Opção ${index + 1}`}
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    fullWidth
                                    size="small"
                                />
                                <IconButton onClick={() => removeOption(index)} size="small" color="error">
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                        <Button onClick={addOption} size="small" variant="outlined" fullWidth>
                            Adicionar Opção
                        </Button>
                    </Box>
                )}

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                        color="error" 
                        size="small" 
                        variant="contained"
                        onClick={() => deleteField(field.id)} 
                    >
                        Deletar Campo
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}