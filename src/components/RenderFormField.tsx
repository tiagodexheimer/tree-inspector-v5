"use client";

import { FormField } from "@/types/demanda";
import {
  TextField,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  Switch,
  FormControl,
  InputLabel,
  FormLabel,
  FormGroup,
  Typography,
  Box,
} from "@mui/material";

// O componente recebe um 'field' e (opcionalmente) um 'value' e uma função 'onChange'
interface RenderFormFieldProps {
  field: FormField;
  // Estas props seriam usadas em um formulário real para controlar o estado
  // value?: any;
  // onChange?: (event: React.ChangeEvent<any>) => void;
}

export default function RenderFormField({ field }: RenderFormFieldProps) {
  // Usamos um 'switch' para decidir qual componente renderizar
  switch (field.type) {
    case "input":
      return (
        <FormControl fullWidth margin="normal">
          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
            {field.label}
          </Typography>
          <TextField placeholder={field.placeholder} fullWidth />
        </FormControl>
      );

    case "checkbox":
      return (
        <FormControl component="fieldset" fullWidth margin="normal">
          <FormLabel component="legend">{field.label}</FormLabel>
          <FormGroup>
            {field.options?.map((option) => (
              <FormControlLabel
                key={option}
                control={<Checkbox />}
                label={option}
              />
            ))}
          </FormGroup>
        </FormControl>
      );

    case "select":
      return (
        <FormControl fullWidth margin="normal">
          <InputLabel>{field.label}</InputLabel>
          <Select label={field.label} value="">
            {field.options?.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );

    case "switch":
      return (
        <FormControl component="fieldset" fullWidth margin="normal">
          <FormLabel component="legend">{field.label}</FormLabel>
          <FormControlLabel
            control={<Switch />}
            label={field.placeholder || "Ativar/Desativar"}
          />
        </FormControl>
      );

    default:
      return (
        <Typography color="error">
          Tipo de campo desconhecido: {field.type}
        </Typography>
      );
  }
}
