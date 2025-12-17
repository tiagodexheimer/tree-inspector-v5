// src/components/ui/formularios/CampoFormularios.tsx
import React from 'react';
import {
    Checkbox, FormControlLabel, Select, MenuItem, SelectChangeEvent,
    RadioGroup, Radio, Switch as MuiSwitch, FormControl, FormLabel,
    TextField, InputLabel, Box
} from '@mui/material';
import { CampoDef } from '@/types/formularios';
import AsyncSpeciesSelect from './AsyncSpeciesSelect';

interface CampoProps {
    campo: CampoDef;
    value: string | boolean | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void;
}

const CampoFormularios: React.FC<CampoProps> = ({ campo, value, onChange }) => {
    const { label, name, type, placeholder } = campo;

    // Estilo padrão para espaçamento
    const spacing = { mb: 2, width: '100%' };

    switch (type) {
        case 'textarea':
            const rows = 'rows' in campo ? campo.rows : 3;
            return (
                <TextField
                    sx={spacing}
                    fullWidth
                    variant="outlined"
                    label={label}
                    id={name}
                    name={name}
                    value={value as string}
                    onChange={onChange as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
                    multiline
                    rows={rows}
                    placeholder={placeholder}
                    InputLabelProps={{ shrink: true }} // Garante que o label não sobreponha o placeholder
                />
            );

        case 'select':
            return (
                <FormControl fullWidth variant="outlined" sx={spacing}>
                    <InputLabel id={`${name}-label`} shrink={true}>{label}</InputLabel> {/* Adicionado shrink={true} aqui */}
                    <Select
                        labelId={`${name}-label`}
                        id={name}
                        name={name}
                        value={value as string}
                        onChange={onChange as (e: SelectChangeEvent<string>) => void}
                        displayEmpty
                        label={label} // Isso conecta o label ao Select para o recorte da borda
                        notched={true} // Força o recorte na borda do input
                    >
                        <MenuItem value="" disabled>
                            <em style={{ color: '#aaa', fontStyle: 'normal' }}>Selecione...</em>
                        </MenuItem>
                        {campo.options.map((option) => (
                            <MenuItem key={option.id} value={option.value}>{option.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            );

        case 'radio':
            return (
                <FormControl component="fieldset" fullWidth sx={spacing}>
                    <FormLabel component="legend">{label}</FormLabel>
                    <RadioGroup
                        aria-label={label} name={name} row
                        value={value as string}
                        onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                    >
                        {campo.options.map((option) => (
                            <FormControlLabel key={option.id} value={option.value} control={<Radio />} label={option.label} />
                        ))}
                    </RadioGroup>
                </FormControl>
            );

        case 'checkbox':
            return (
                <FormControlLabel
                    sx={spacing}
                    label={label}
                    control={
                        <Checkbox checked={!!value} onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void} name={name} id={name} />
                    }
                />
            );

        case 'switch':
            return (
                <FormControlLabel
                    sx={{ ...spacing, justifyContent: 'space-between', ml: 0 }}
                    label={label}
                    labelPlacement="start"
                    control={
                        <MuiSwitch checked={!!value} onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void} name={name} id={name} />
                    }
                />
            );

        case 'checkbox_group':
            // value aqui esperamos que seja um array de strings ou string JSON/CSV.
            // Para simplificar neste MVP, vamos tratar como visual apenas ou mock.
            // O correto seria mudar o tipo de value para aceitar array.
            return (
                <FormControl component="fieldset" fullWidth sx={spacing}>
                    <FormLabel component="legend">{label}</FormLabel>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                        {campo.options?.map((option) => (
                            <FormControlLabel
                                key={option.id}
                                control={<Checkbox name={name} value={option.value} />}
                                label={option.label}
                            />
                        ))}
                    </Box>
                </FormControl>
            );

        case 'header':
            return (
                <Box sx={{ ...spacing, mt: 2, mb: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>{label}</h3>
                </Box>
            );

        case 'separator':
            return <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '24px 0', width: '100%' }} />;

        case 'file':
            return (
                <div style={{ marginBottom: 16, width: '100%' }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: 'rgba(0, 0, 0, 0.6)' }}>{label}</label>
                    <input type="file" style={{ display: 'block', width: '100%' }} />
                </div>
            );

        case 'tree_species':
            return (
                <Box sx={spacing}>
                    <AsyncSpeciesSelect
                        name={name}
                        label={label}
                        value={value as string}
                        onChange={(newValue) => {
                            // Mock event object to satisfy the interface
                            const event = {
                                target: {
                                    name: name,
                                    value: newValue,
                                    type: 'text'
                                }
                            } as React.ChangeEvent<HTMLInputElement>;
                            onChange(event);
                        }}
                    />
                </Box>
            );

        default:
            // Trata text, password, email, number, date
            return (
                <TextField
                    sx={spacing}
                    fullWidth
                    variant="outlined"
                    label={label}
                    type={type}
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                    placeholder={placeholder}
                    // Garante que o label flutue se houver valor ou placeholder
                    InputLabelProps={{ shrink: true }}
                />
            );
    }
};

export default CampoFormularios;