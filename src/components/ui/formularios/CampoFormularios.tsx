// src/components/ui/formularios/CampoFormularios.tsx
import {
    Checkbox, FormControlLabel, Select,
    MenuItem, SelectChangeEvent, RadioGroup, Radio, Switch as MuiSwitch, FormControl, FormLabel,
    TextField, // Adicionado TextField
    InputLabel // Adicionado InputLabel
} from '@mui/material';
import React from 'react';
// Certifique-se que está a importar do local correto
import { CampoOpcao, CampoTipo } from '@/types/formularios';

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
    [key: string]: unknown; // Para capturar ...rest (placeholder, required, etc.)
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
            // Usar TextField multiline em vez de MuiTextareaAutosize para consistência
            inputElement = (
                 <TextField
                    fullWidth
                    variant="outlined"
                    label={label}
                    id={name}
                    name={name}
                    value={value as string || ''}
                    onChange={onChange as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
                    multiline // Habilita múltiplas linhas
                    rows={rows || 3} // Usa a prop rows
                    {...rest}
                    // O estilo pode ser removido, TextField lida com isso
                 />
            );
            break;

        case 'select':
             inputElement = (
                 <FormControl fullWidth variant="outlined">
                   <InputLabel id={`${name}-label`}>{label}</InputLabel>
                   <Select
                     labelId={`${name}-label`}
                     label={label}
                     id={name}
                     name={name}
                     value={value as string || ''}
                     onChange={onChange as (e: SelectChangeEvent<string>) => void}
                     displayEmpty
                     {...rest}
                    >
                     <MenuItem value="" disabled>Selecione uma opção</MenuItem>
                     {options.map((option) => (
                         <MenuItem key={option.id} value={option.value}>
                             {option.label}
                         </MenuItem>
                     ))}
                   </Select>
                 </FormControl>
             );
            // Retorna diretamente pois já inclui o label no FormControl
            return <div className="form-group" style={{ margin: '16px 0' }}>{inputElement}</div>;

        case 'checkbox':
            // Checkbox não precisa de wrapper extra, FormControlLabel já lida com isso
            return (
                <FormControlLabel
                    label={label}
                    control={
                        <Checkbox checked={!!value} onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void} name={name} id={name} {...rest} />
                    }
                    sx={{ display: 'flex', alignItems: 'center', mb: 1, width: '100%' }} // Ocupa largura total
                />
            );

        case 'radio':
             inputElement = (
                <FormControl component="fieldset" fullWidth>
                    <FormLabel component="legend">{label}</FormLabel>
                    <RadioGroup
                        aria-label={label}
                        name={name}
                        value={value as string || ''}
                        onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                        row // Alinha horizontalmente
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

        case 'switch':
            // Switch não precisa de wrapper extra
             return (
                 <FormControlLabel
                    label={label}
                    control={
                        <MuiSwitch
                            checked={!!value}
                            onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                            name={name}
                            id={name}
                            defaultChecked={!!defaultValue}
                            {...rest}
                        />
                    }
                    // Justifica o conteúdo para alinhar o label à esquerda e o switch à direita
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, mr: 0, width: '100%' }}
                />
            );

        // --- Blocos `case` separados para cada tipo de input ---
        case 'text':
            inputElement = (
               <TextField
                 fullWidth
                 variant="outlined"
                 label={label}
                 type="text"
                 id={name}
                 name={name}
                 value={value as string || ''}
                 onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                 {...rest}
               />
             );
            break;
        case 'password':
            inputElement = (
               <TextField
                 fullWidth
                 variant="outlined"
                 label={label}
                 type="password"
                 id={name}
                 name={name}
                 value={value as string || ''}
                 onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                 {...rest}
               />
             );
            break;
        case 'email':
            inputElement = (
               <TextField
                 fullWidth
                 variant="outlined"
                 label={label}
                 type="email"
                 id={name}
                 name={name}
                 value={value as string || ''}
                 onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                 {...rest}
               />
             );
            break;
        case 'number':
            inputElement = (
               <TextField
                 fullWidth
                 variant="outlined"
                 label={label}
                 type="number"
                 id={name}
                 name={name}
                 // Lidar com valor numérico ou string vazia
                 value={value === '' ? '' : Number(value)}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    // Passa o valor como string ou número, dependendo se está vazio
                    const newValue = e.target.value === '' ? '' : Number(e.target.value);
                    // Cria um evento sintético se necessário para compatibilidade com onChange
                    const syntheticEvent = {
                        ...e,
                        target: {
                            ...e.target,
                            value: newValue, // Garante que o valor no evento corresponda ao que o estado espera
                            name: name
                        }
                    } as React.ChangeEvent<HTMLInputElement>; // Ajusta o tipo do evento sintético
                     onChange(syntheticEvent);
                 }}
                 {...rest}
               />
             );
            break;
        case 'date':
             inputElement = (
               <TextField
                 fullWidth
                 variant="outlined"
                 label={label}
                 type="date"
                 id={name}
                 name={name}
                 value={value as string || ''} // Datas são geralmente strings no formato YYYY-MM-DD
                 onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
                 InputLabelProps={{ shrink: true }} // Garante que o label não sobreponha a data
                 {...rest}
               />
             );
            break;

        // O default agora pode ficar vazio ou lançar um erro se um tipo inválido for passado
        default:
            console.warn(`Tipo de campo não reconhecido: ${type}`);
            inputElement = null; // Ou um placeholder indicando erro
    }

    // Wrapper padrão para os TextField (text, password, email, number, date, textarea)
    // Os outros tipos (checkbox, switch, radio, select) retornam antes
    if (inputElement) {
        return (
            <div className="form-group" style={{ margin: '16px 0' }}>
                {/* O label já está dentro do TextField, não precisa mais aqui */}
                {inputElement}
            </div>
        );
    }

    return null; // Caso nenhum elemento seja renderizado
};

export default CampoFormularios;