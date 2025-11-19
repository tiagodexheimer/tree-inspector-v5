import React from 'react';
import { Box, Card, Typography, Divider } from "@mui/material";
import {
  CheckBox, RadioButtonChecked, ShortText, Subject, 
  ToggleOn, ArrowDropDownCircle
} from "@mui/icons-material";
import { CampoTipo } from '@/types/formularios';

interface FerramentasPainelProps {
    onAddField: (tipo: CampoTipo) => void;
}

const ToolCard = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
    <Card 
        variant="outlined" 
        onClick={onClick} 
        sx={{ 
            p: 1, m: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1,
            '&:hover': { bgcolor: 'action.hover' }
        }}
    >
        <Icon fontSize="small" color="action" /> 
        <Typography variant="body2">{label}</Typography>
    </Card>
);

export const FerramentasPainel: React.FC<FerramentasPainelProps> = ({ onAddField }) => {
    return (
        <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, minWidth: 200, maxWidth: 220 }}>
            <Typography variant="subtitle2" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
                Adicionar Campos
            </Typography>
            <Divider sx={{ mb: 1 }} />
            
            <ToolCard icon={ShortText} label="Texto Curto" onClick={() => onAddField('text')} />
            <ToolCard icon={Subject} label="Texto Longo" onClick={() => onAddField('textarea')} />
            <ToolCard icon={CheckBox} label="Caixa de Seleção" onClick={() => onAddField('checkbox')} />
            <ToolCard icon={ArrowDropDownCircle} label="Lista Suspensa" onClick={() => onAddField('select')} />
            <ToolCard icon={RadioButtonChecked} label="Múltipla Escolha" onClick={() => onAddField('radio')} />
            <ToolCard icon={ToggleOn} label="Interruptor" onClick={() => onAddField('switch')} />
        </Box>
    );
};