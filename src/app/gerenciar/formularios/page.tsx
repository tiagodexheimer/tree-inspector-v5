"use client";
import ListaFormularios from "@/components/ListaFormularios";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Fade,
  Paper,
  IconButton,
  Button,
} from "@mui/material";
import { useState } from "react";

import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory"; // Ícone de triângulo (Voltar)
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked"; // Ícone de círculo (Home)
import CropSquareIcon from "@mui/icons-material/CropSquare"; // Ícone de quadrado (Apps Recentes)
import RenderFormField from "@/components/RenderFormField";
import { FormField } from "@/types/demanda";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const camposDeExemplo: FormField[] = [
  {
    id: "ex1",
    type: "input",
    label: "Nome do Vistoriador",
    placeholder: "Digite seu nome completo",
  },
  {
    id: "ex2",
    type: "select",
    label: "Condição da Árvore",
    placeholder: "",
    options: ["Saudável", "Com Pragas", "Morta"],
  },
  {
    id: "ex3",
    type: "checkbox",
    label: "Documentos Anexados",
    placeholder: "",
    options: ["ART", "Laudo Antigo", "Fotos"],
  },
  { id: "ex4", type: "switch", label: "Requer Ação Urgente?", placeholder: "" },
];

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;

  return (
    <div hidden={value !== index}>
      {value === index && (
        <Fade in={value === index}>
          <Box sx={{ p: 3 }}>{children}</Box>
        </Fade>
      )}
    </div>
  );
}

export default function FormulariosPage() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <div className="p-4">
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            backgroundColor: "#F5F5F5",
          }}
        >
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Listar Formulários" />
            <Tab label="Criar Novo Formulário" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Typography variant="h5">Laudos Salvos</Typography>
          <ListaFormularios />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Typography variant="h5">Construtor de Formulários</Typography>
          <Box
            sx={{
              display: "flex",
              height: "100%",
              p: 2,
              gap: 2,
              backgroundColor: "#f4f6f8",
            }}
          >
            {/* Coluna 1: Ferramentas */}
            <Paper sx={{ width: "20%", p: 2, overflowY: "auto" }}>
              <Typography variant="h6" gutterBottom>
                Campos Disponíveis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <Box component="form">
                  <h1>Supressão</h1>

                  {camposDeExemplo.map((campo) => (
                    <RenderFormField key={campo.id} field={campo} />
                  ))}

                  <Button>Salvar Laudo</Button>
                </Box>
              </Typography>
            </Paper>

            {/* Coluna 2: Montador */}
            <Paper sx={{ width: "50%", p: 2, overflowY: "auto" }}>
              <Typography variant="h6" gutterBottom>
                Estrutura do Laudo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                (Esta é a área principal onde os campos serão soltos para montar
                o formulário.)
              </Typography>
            </Paper>

            {/* Coluna 3: Pré-visualização no Celular */}
            <Box
              sx={{
                width: "30%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Paper
                elevation={4}
                sx={{
                  width: 310,
                  height: 700,
                  borderRadius: "40px",
                  border: "10px solid black",
                  p: "20px",
                  boxSizing: "border-box",
                  overflowY: "auto",
                  backgroundColor: "white",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    py: 1.5,
                    px: 2,
                    backgroundColor: "#257e1a", // Cor escura para a barra
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="h6" component="div">
                    Pré-visualização
                  </Typography>
                </Box>

                {/* 2. A Área de Conteúdo (Body) */}
                <Box
                  sx={{
                    flexGrow: 1, // Faz esta área ocupar todo o espaço vertical restante
                    overflowY: "auto", // Torna apenas esta área rolável
                    p: 2,
                  }}
                >
                  {/* O conteúdo do formulário (que virá depois) ficará aqui */}
                  <Typography
                    color="text.secondary"
                    align="center"
                    sx={{
                      flexGrow: 1,
                      verflowY: "auto",
                      p: 2,
                    }}
                  >
                    Os campos do formulário aparecerão aqui.
                  </Typography>
                </Box>
                <Box
                  sx={{
                    py: 0.5,
                    backgroundColor: "#212121", // Mesma cor da barra de título
                    color: "white",
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                  }}
                >
                  <IconButton color="inherit">
                    <ChangeHistoryIcon />
                  </IconButton>
                  <IconButton color="inherit">
                    <RadioButtonUncheckedIcon />
                  </IconButton>
                  <IconButton color="inherit">
                    <CropSquareIcon />
                  </IconButton>
                </Box>
              </Paper>
            </Box>
          </Box>
        </TabPanel>
      </Box>
    </div>
  );
}
