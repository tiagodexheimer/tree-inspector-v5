"use client";
import { useState } from "react";
import { Box, Tabs, Tab, Typography, Card } from "@mui/material";

// Dnd-kit imports - apenas os componentes e métodos necessários para o contexto central
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

// Componentes da página Formulários
import ListaFormularios from "@/components/ui/formularios/ListaFormularios"; // Para a aba 1
import RenderFormField from "@/components/ui/formularios/RenderFormField"; // Para o DragOverlay

// Novos Componentes de Coluna
import { FormBuilderSidebar } from "@/components/ui/formularios/FormBuilderSidebar";
import { FormBuilderCanvas } from "@/components/ui/formularios/FormBuilderCanvas";
import { FormBuilderPreview } from "@/components/ui/formularios/FormBuilderPreview";

// Tipos e dados
import { FormField } from "@/types/demanda";

// --- DADOS DE EXEMPLO ---
const camposDeExemplo: FormField[] = [
  {
    id: "input-vistoriador",
    type: "input",
    label: "Nome do Vistoriador",
    placeholder: "Digite seu nome completo",
  },
  {
    id: "select-condicao",
    type: "select",
    label: "Condição da Árvore",
    placeholder: "",
    options: ["Saudável", "Com Pragas", "Morta"],
  },
  {
    id: "checkbox-documentos",
    type: "checkbox",
    label: "Documentos Anexados",
    placeholder: "",
    options: ["ART", "Laudo Antigo", "Fotos"],
  },
  {
    id: "switch-urgente",
    type: "switch",
    label: "Requer Ação Urgente?",
    placeholder: "",
  },
];

export default function FormulariosPage() {
  const [activeTab, setActiveTab] = useState(0);

  // --- 1. GERENCIAMENTO DE ESTADO ---
  const [droppedFields, setDroppedFields] = useState<FormField[]>([]);
  const [activeField, setActiveField] = useState<FormField | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // --- 2. LÓGICA DO DRAG-AND-DROP (Permanece centralizada) ---

  // Quando um item começa a ser arrastado
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    // Encontra o objeto do campo completo (tanto da lista de origem quanto da de destino)
    const field =
      camposDeExemplo.find((f) => f.id === active.id) ||
      droppedFields.find((f) => f.id === active.id);
    if (field) {
      setActiveField(field);
    }
  }

  // Quando um item é solto
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    // Se não soltou sobre uma área válida, verifica se é para apagar
    if (!over) {
      // Verifica se o item arrastado era da lista de destino
      const isFromDroppedList = droppedFields.some((f) => f.id === active.id);
      if (isFromDroppedList) {
        // Apaga o item
        setDroppedFields((fields) =>
          fields.filter((field) => field.id !== active.id)
        );
      }
      setActiveField(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Lógica de REORDENAÇÃO (dentro da área de destino)
    // Verifica se o over é um item já na lista (não o container pai)
    const isOverSortableItem = droppedFields.some((f) => f.id === overId) && activeId !== overId;
    if (isOverSortableItem) {
      const oldIndex = droppedFields.findIndex(
        (field) => field.id === activeId
      );
      const newIndex = droppedFields.findIndex((field) => field.id === overId);
      // Garante que o item ativo era um item existente para reordenar
      if (oldIndex > -1) { 
        setDroppedFields((fields) => arrayMove(fields, oldIndex, newIndex));
      }
    }

    // Lógica para ADICIONAR um novo item da origem para o destino
    const isOverDroppableContainer = over.id === "droppable-area";
    const isFromSourceList = camposDeExemplo.some((f) => f.id === activeId);

    if (isOverDroppableContainer && isFromSourceList) {
      const fieldToAdd = camposDeExemplo.find((f) => f.id === activeId);
      if (fieldToAdd) {
        // Opção: Clonar o item para que o original possa ser arrastado novamente
        const newField = { ...fieldToAdd, id: `field-${Date.now()}` }; 
        setDroppedFields((fields) => [...fields, newField]);
      }
    }

    setActiveField(null); // Limpa o estado ativo
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="p-4">
        <Box sx={{ width: "100%" }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Listar Formulários" />
            <Tab label="Criar Novo Formulário" />
          </Tabs>

          {/* TabPanel de Listar Formulários */}
          <TabPanel value={activeTab} index={0}>
            <ListaFormularios />
          </TabPanel>

          {/* TabPanel de Criar Novo Formulário */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h5" gutterBottom>
              Construtor de Formulários
            </Typography>
            <Box
              sx={{ display: "flex", gap: 2, p: 2, backgroundColor: "#f4f6f8" }}
            >
              {/* Coluna 1: Ferramentas (Origem) */}
              <FormBuilderSidebar camposDisponiveis={camposDeExemplo} />

              {/* Coluna 2: Montador (Destino) */}
              <FormBuilderCanvas droppedFields={droppedFields} />

              {/* Coluna 3: Pré-visualização (Celular) */}
              <FormBuilderPreview droppedFields={droppedFields} />
            </Box>
          </TabPanel>
        </Box>
      </div>

      {/* --- CAMADA DE OVERLAY PARA O CLONE --- */}
      <DragOverlay>
        {activeField ? (
          <Card variant="outlined" className="p-2" elevation={3}>
            <RenderFormField field={activeField} />
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// --- Componente Auxiliar TabPanel (mantido na página) ---
function TabPanel(props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) {
  const { children, value, index } = props;
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}