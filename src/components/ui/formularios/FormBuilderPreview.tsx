// src/components/ui/formularios/FormBuilderPreview.tsx
"use client";

import { Box, Typography } from "@mui/material";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import { FormField } from "@/types/demanda";
import RenderFormField from "@/components/ui/formularios/RenderFormField";
import React from "react";
import { Paper, IconButton } from "@mui/material";

interface FormBuilderPreviewProps {
  droppedFields: FormField[];
}

export function FormBuilderPreview({ droppedFields }: FormBuilderPreviewProps) {
  return (
    <Paper
      sx={{
        width: "30%", // Ajuste da largura da coluna
        p: 2,
        position: "sticky",
        top: 20,
        height: "calc(100vh - 120px)",
        overflowY: "auto",
      }}
    >
      <Typography variant="h6">Pré-visualização</Typography>
      <Box
        sx={{
          width: 375,
          height: 667,
          borderRadius: 5,
          border: "10px solid #333",
          boxShadow: 3,
          mx: "auto",
          mt: 2,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "white",
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            p: 2,
          }}
        >
          {droppedFields.length > 0 ? (
            droppedFields.map((field) => (
              <RenderFormField key={field.id} field={field} />
            ))
          ) : (
            <Typography
              color="text.secondary"
              align="center"
              sx={{
                p: 2,
                mt: 4,
              }}
            >
              Os campos do formulário aparecerão aqui.
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            py: 0.5,
            backgroundColor: "#212121",
            color: "white",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            borderBottomLeftRadius: "5px",
            borderBottomRightRadius: "5px",
          }}
        >
          <IconButton color="inherit" size="small">
            <ChangeHistoryIcon fontSize="small" />
          </IconButton>
          <IconButton color="inherit" size="small">
            <RadioButtonUncheckedIcon fontSize="small" />
          </IconButton>
          <IconButton color="inherit" size="small">
            <CropSquareIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}