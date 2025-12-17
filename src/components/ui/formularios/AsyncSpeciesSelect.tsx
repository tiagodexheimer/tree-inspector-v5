
import React, { useState, useEffect, useMemo } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { debounce } from '@mui/material/utils';

interface Species {
    id: number;
    nome_comum: string;
    nome_cientifico: string;
}

interface AsyncSpeciesSelectProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    name: string;
}

export default function AsyncSpeciesSelect({ value, onChange, label, name }: AsyncSpeciesSelectProps) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<Species[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const fetchSpecies = useMemo(
        () =>
            debounce(async (input: string, callback: (results: Species[]) => void) => {
                try {
                    const res = await fetch(`/api/especies?q=${input}`);
                    const data = await res.json();
                    callback(data.results || []);
                } catch (err) {
                    console.error(err);
                    callback([]);
                }
            }, 400),
        [],
    );

    useEffect(() => {
        let active = true;

        if (inputValue === '') {
            setOptions(value ? [] : []);
            return undefined;
        }

        setLoading(true);

        fetchSpecies(inputValue, (results) => {
            if (active) {
                setOptions(results);
                setLoading(false);
            }
        });

        return () => {
            active = false;
        };
    }, [inputValue, fetchSpecies, value]);

    // Handle initialization of "value" if it was already selected (logic simplifies here)
    // For now simple text value

    return (
        <Autocomplete
            id={name}
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            isOptionEqualToValue={(option, value) => option.nome_comum === value.nome_comum}
            getOptionLabel={(option) => `${option.nome_comum} (${option.nome_cientifico})`}
            options={options}
            loading={loading}
            onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
            }}
            onChange={(event, newValue: Species | null) => {
                onChange(newValue ? newValue.nome_comum : '');
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    name={name}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <React.Fragment>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    }}
                />
            )}
        />
    );
}
