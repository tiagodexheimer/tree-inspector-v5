// src/components/ui/formularios/CampoFormularios.tsx
import {
  Checkbox, FormControlLabel, Input, Select, TextareaAutosize as MuiTextareaAutosize,
  MenuItem, SelectChangeEvent, RadioGroup, Radio, Switch as MuiSwitch, FormControl, FormLabel // Adicionados RadioGroup, Radio, Switch, FormControl, FormLabel
} from '@mui/material';
import React from 'react';
import { CampoOpcao, CampoTipo } from './CriarFormularios'; // Importa tipos

// Define a interface para as props
interface CampoProps {
    type?: CampoTipo; // Usa o tipo exportado
    label: string;
    name: string;
    value: string | boolean | number; // boolean para checkbox/switch
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void;
    options?: CampoOpcao[]; // Usa o tipo exportado
    defaultValue?: string | boolean; // Adicionado para switch
    rows?: number; // Adicionado para textarea
    [key: string]: any; // Para capturar ...rest (placeholder, required, etc.)
}

const CampoFormularios: React.FC<CampoProps> = ({
    type = 'text',
    label,
    name,
    value,
    onChange,
    options = [],
    defaultValue,
    rows,
    ...rest
}) => {

    let inputElement = null;

    switch (type) {
        case 'textarea':
            inputElement = (
                <MuiTextareaAutosize
                    id={name}
                    name={name}
                    value={value as string}
                    onChange={onChange as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
                    minRows={rows || 3} // Usa a prop rows
                    {...rest}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'inherit' }} // Estilo básico
                />
            );
            break;

        case 'select':
            inputElement = (
                <Select
                    fullWidth
                    id={name}
                    name={name}
                    value={value as string || ''} // Garante que value não seja undefined/null
                    onChange={onChange as (e: SelectChangeEvent<string>) => void}
                    displayEmpty // Permite mostrar o placeholder
                    {...rest}
                >
                    {/* Placeholder */}
                    <MenuItem value="" disabled>Selecione uma opção</MenuItem>
                    {options.map((option) => (
                        <MenuItem key={option.id} value={option.value}> {/* Usa option.id como key */}
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
            );
            break;

        case 'checkbox':
            // Checkbox individual continua o mesmo
            return (
                <FormControlLabel
                    label={label}
                    control={
                        <Checkbox checked={!!value} onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void} name={name} id={name} {...rest} />
                    }
                    sx={{ display: 'flex', alignItems: 'center', mb: 1 }} // Ajuste de layout
                />
            );

        // --- NOVO: Radio Group ---
        case 'radio':
             // Usa FormControl para agrupar Label e RadioGroup
             inputElement = (
                <FormControl component="fieldset" fullWidth>
                    {/* Usa FormLabel como o <label> principal */}
                    <FormLabel component="legend">{label}</FormLabel>
                    <RadioGroup
                        aria-label={label}
                        name={name}
                        value={value as string || ''}
                        onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                        row // Opcional: para alinhar horizontalmente
                    >
                        {options.map((option) => (
                            <FormControlLabel
                                key={option.id}
                                value={option.value}
                                control={<Radio />}
                                label={option.label}
                            />
                        ))}
                    </RadioGroup>
                </FormControl>
            );
            // Retorna diretamente pois já inclui o label no FormControl
            return <div className="form-group" style={{ margin: '16px 0' }}>{inputElement}</div>;

        // --- NOVO: Switch ---
        case 'switch':
            // Similar ao Checkbox, usa FormControlLabel
             return (
                 <FormControlLabel
                    label={label}
                    control={
                        <MuiSwitch
                            checked={!!value}
                            onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                            name={name}
                            id={name}
                            defaultChecked={!!defaultValue} // Usa defaultValue se fornecido
                            {...rest}
                        />
                    }
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, mr: 0 }} // Layout para switch
                />
            );


        // --- Default (Input Text, Number, etc.) ---
        case 'text':
        case 'password':
        case 'email':
        case 'number':
        case 'date':
        default:
            inputElement = (
                <Input fullWidth type={type} id={name} name={name} value={value as string || ''} onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void} {...rest} />
            );
    }

    // Wrapper padrão para text, select, textarea... (Radio e Switch retornam antes)
    return (
        <div className="form-group" style={{ margin: '16px 0' }}>
            <label htmlFor={name} style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                {label}
            </label>
            {inputElement}
        </div>
    );
};

export default CampoFormularios;