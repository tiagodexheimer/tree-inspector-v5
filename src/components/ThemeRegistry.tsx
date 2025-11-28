// src/components/ThemeRegistry.tsx
'use client';
import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// 1. Definição das cores customizadas
const THEME_COLORS = {
    // Definimos o verde e o marrom como cores primárias e secundárias,
    // ou usamos um nome customizado. Vamos usar a paleta principal:
    greenHeader: '#4CAF50',    // Verde (para o Header)
    brownSidebar: '#795548',  // Marrom (para o Sidebar)
    backgroundBody: '#F5F5DC', // Bege (Beige, para o fundo)
};

const theme = createTheme({
  palette: {
    // Definindo a cor principal/secundária, o que afeta muitos componentes padrão.
    primary: {
      main: THEME_COLORS.greenHeader, // Verde como Primary (cor padrão do AppBar)
    },
    secondary: {
      main: THEME_COLORS.brownSidebar, // Marrom como Secondary
    },
    background: {
      default: THEME_COLORS.backgroundBody, // Fundo Bege-Madeira
    },
    // Adicionando cores customizadas, se necessário
    custom: {
        header: THEME_COLORS.greenHeader,
        sidebar: THEME_COLORS.brownSidebar,
        body: THEME_COLORS.backgroundBody,
    },
  } as any, // Usamos 'as any' para aceitar a propriedade custom
  // ... (outras configurações de tipografia, se houver)
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}