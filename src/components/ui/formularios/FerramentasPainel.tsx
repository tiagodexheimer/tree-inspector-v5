import React from 'react';
import { Box, Card, Typography, Divider } from "@mui/material";
import {
    CheckBox, RadioButtonChecked, ShortText, Subject,
    ToggleOn, ArrowDropDownCircle,
    Title, HorizontalRule, UploadFile, CalendarMonth, Numbers, Checklist, Forest
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
                Campos de Entrada
            </Typography>
            <Divider sx={{ mb: 1 }} />

            <ToolCard icon={ShortText} label="Texto Curto" onClick={() => onAddField('text')} />
            <ToolCard icon={Subject} label="Texto Longo" onClick={() => onAddField('textarea')} />
            <ToolCard icon={Numbers} label="Número" onClick={() => onAddField('number')} />
            <ToolCard icon={CalendarMonth} label="Data" onClick={() => onAddField('date')} />

            <Typography variant="subtitle2" gutterBottom align="center" sx={{ fontWeight: 'bold', mt: 2 }}>
                Seleção
            </Typography>
            <Divider sx={{ mb: 1 }} />

            <ToolCard icon={CheckBox} label="Checkbox Único" onClick={() => onAddField('checkbox')} />
            <ToolCard icon={Checklist} label="Grupo Checkbox" onClick={() => onAddField('checkbox_group')} />
            <ToolCard icon={ArrowDropDownCircle} label="Lista Suspensa" onClick={() => onAddField('select')} />
            <ToolCard icon={Forest} label="Árvore (Autocomplete)" onClick={() => onAddField('tree_species')} />
            <ToolCard icon={RadioButtonChecked} label="Radio Button" onClick={() => onAddField('radio')} />
            <ToolCard icon={ToggleOn} label="Switch / Toggle" onClick={() => onAddField('switch')} />

            <Typography variant="subtitle2" gutterBottom align="center" sx={{ fontWeight: 'bold', mt: 2 }}>
                Layout & Mídia
            </Typography>
            <Divider sx={{ mb: 1 }} />

            <ToolCard icon={Title} label="Título (Header)" onClick={() => onAddField('header')} />
            <ToolCard icon={HorizontalRule} label="Separador" onClick={() => onAddField('separator')} />
            <ToolCard icon={UploadFile} label="Upload Arquivo" onClick={() => onAddField('file')} />
        </Box>
    );
};