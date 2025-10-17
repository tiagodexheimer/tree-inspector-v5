// Arquivo: CampoFormularios.tsx
import { Checkbox, FormControlLabel, Input, Select, TextareaAutosize, MenuItem, SelectChangeEvent } from '@mui/material';
import React from 'react';

// Define a interface para as props
interface CampoProps {
    type?: 'text' | 'password' | 'email' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';
    label: string;
    name: string;
    value: string | boolean | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void;
    options?: { value: string, label: string }[];
    [key: string]: any; // Para capturar ...rest (placeholder, required, rows, etc.)
}

const CampoFormularios: React.FC<CampoProps> = ({ 
    type = 'text', 
    label, 
    name, 
    value, 
    onChange, 
    options = [], 
    ...rest 
}) => {

    let inputElement = null;

    switch (type) {
        case 'textarea':
            inputElement = (
                <TextareaAutosize
                    id={name}
                    name={name}
                    value={value as string}
                    onChange={onChange as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
                    {...rest}
                    style={{ width: '100%', minHeight: 80, padding: '8px' }}
                />
            );
            break;

        case 'select':
            inputElement = (
                <Select
                    fullWidth
                    id={name}
                    name={name}
                    value={value as string}
                    onChange={onChange as (e: SelectChangeEvent<string>) => void}
                    {...rest}
                >
                    <MenuItem value="" disabled>Selecione uma opção</MenuItem>
                    {options.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
            );
            break;

        case 'checkbox':
            return (
                <FormControlLabel
                    label={label}
                    control={
                        <Checkbox
                            checked={!!value} // Garante que é booleano
                            onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                            name={name}
                            id={name}
                            {...rest}
                        />
                    }
                />
            );

        case 'text':
        case 'password':
        case 'email':
        case 'number':
        case 'date':
        default:
            inputElement = (
                <Input
                    fullWidth
                    type={type}
                    id={name}
                    name={name}
                    value={value as string}
                    onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                    {...rest}
                />
            );
    }

    // Wrapper padrão para text, select, textarea...
    return (
        <div className="form-group" style={{ margin: '16px 0' }}>
            <label htmlFor={name} style={{ display: 'block', marginBottom: '4px' }}>
                {label}
            </label>
            {inputElement}
        </div>
    );
};

export default CampoFormularios;