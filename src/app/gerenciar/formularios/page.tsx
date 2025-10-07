// src/app/gerenciar/formularios/page.tsx
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

    // A. Lógica para REMOÇÃO/DESCARTE (Melhoria na condição de "drop fora" ou na lixeira)
    // Verifica se o item veio da lista do canvas.
    const isFromDroppedList = droppedFields.some((f) => f.id === active.id);
    
    // O item é descartado se: 1) for jogado fora OU 2) for jogado na área da lixeira.
    const droppedOutside = !over;
    const droppedOnTrashCan = over?.id === "trash-can-area";
    
    if (isFromDroppedList && (droppedOutside || droppedOnTrashCan)) {
      setDroppedFields((fields) =>
        fields.filter((field) => field.id !== active.id)
      );
      setActiveField(null);
      return;
    }
    
    // Se não houver 'over' e não for um descarte válido (ou seja, veio da barra lateral e soltou fora), 
    // apenas limpamos o campo ativo e saímos.
    if (!over) {
      setActiveField(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // B. Lógica de REORDENAÇÃO (dentro da área de destino)
    const isOverSortableItem = droppedFields.some((f) => f.id === overId) && activeId !== overId;
    if (isOverSortableItem) {
      const oldIndex = droppedFields.findIndex(
        (field) => field.id === activeId
      );
      const newIndex = droppedFields.findIndex((field) => field.id === overId);
      if (oldIndex > -1) { 
        setDroppedFields((fields) => arrayMove(fields, oldIndex, newIndex));
      }
    }

    // C. Lógica para ADICIONAR um novo item (da barra lateral para o canvas principal OU para a lixeira/área extra)
    const isOverDroppableContainer = over.id === "droppable-area" || over.id === "trash-can-area";
    const isFromSourceList = camposDeExemplo.some((f) => f.id === activeId);

    if (isOverDroppableContainer && isFromSourceList) {
      const fieldToAdd = camposDeExemplo.find((f) => f.id === activeId);
      if (fieldToAdd) {
        // Clonar o item para que o original possa ser arrastado novamente e para dar um ID único.
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

              {/* Coluna 2: Montador (Destino/Canvas) */}
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