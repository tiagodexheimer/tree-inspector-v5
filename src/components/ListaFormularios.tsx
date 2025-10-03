"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  TextField,
  TableSortLabel,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { LaudoForm } from "@/types/demanda";

// Dados de exemplo
const laudosSalvosExemplo: LaudoForm[] = [
  {
    id: "laudo-001",
    nome: "Laudo de Vistoria Padrão",
    tipoDemandaVinculada: "Avaliação de Risco",
    dataCriacao: "2023-10-26",
    campos: [],
  },
  {
    id: "laudo-002",
    nome: "Relatório Fotográfico Simplificado",
    tipoDemandaVinculada: "Qualquer",
    dataCriacao: "2023-10-25",
    campos: [],
  },
  {
    id: "laudo-003",
    nome: "Laudo de Supressão",
    tipoDemandaVinculada: "Remoção de Árvore",
    dataCriacao: "2023-10-22",
    campos: [],
  },
  {
    id: "laudo-004",
    nome: "Vistoria de Emergência",
    tipoDemandaVinculada: "Avaliação de Risco",
    dataCriacao: "2023-09-15",
    campos: [],
  },
];

type Order = "asc" | "desc";
type OrderableLaudoKey = "nome" | "tipoDemandaVinculada" | "dataCriacao";

export default function ListaFormularios() {
  // 1. ESTADOS para filtro e ordenação
  const [filter, setFilter] = useState("");
  const [orderBy, setOrderBy] = useState<OrderableLaudoKey>("nome");
  const [order, setOrder] = useState<Order>("asc");

  // 2. LÓGICA de filtro e ordenação com useMemo para otimização
  const filteredAndSortedLaudos = useMemo(() => {
    // Primeiro, filtramos
    const filtered = laudosSalvosExemplo.filter(
      (laudo) =>
        laudo.nome.toLowerCase().includes(filter.toLowerCase()) ||
        laudo.tipoDemandaVinculada.toLowerCase().includes(filter.toLowerCase())
    );

    // Depois, ordenamos o resultado do filtro
    return filtered.sort((a, b) => {
      if (a[orderBy] < b[orderBy]) {
        return order === "asc" ? -1 : 1;
      }
      if (a[orderBy] > b[orderBy]) {
        return order === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filter, order, orderBy]); // A lógica só é re-executada se uma dessas variáveis mudar

  // 3. FUNÇÃO para lidar com o clique no cabeçalho da tabela
  const handleSortRequest = (property: OrderableLaudoKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Funções de clique dos botões (inalteradas)
  const handleEdit = (id: string) => {
    alert(`Editar ${id}`);
  };
  const handleDelete = (id: string) => {
    alert(`Apagar ${id}`);
  };
  const handleView = (id: string) => {
    alert(`Visualizar ${id}`);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        {/* 4. INTERFACE do filtro */}
        <TextField
          size="small"
          variant="outlined"
          label="Filtrar laudos..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {/* 5. CABEÇALHOS da tabela agora são clicáveis para ordenar */}
              <TableCell sortDirection={orderBy === "nome" ? order : false}>
                <TableSortLabel
                  active={orderBy === "nome"}
                  direction={orderBy === "nome" ? order : "asc"}
                  onClick={() => handleSortRequest("nome")}
                >
                  Nome do Laudo
                </TableSortLabel>
              </TableCell>
              <TableCell
                sortDirection={
                  orderBy === "tipoDemandaVinculada" ? order : false
                }
              >
                <TableSortLabel
                  active={orderBy === "tipoDemandaVinculada"}
                  direction={orderBy === "tipoDemandaVinculada" ? order : "asc"}
                  onClick={() => handleSortRequest("tipoDemandaVinculada")}
                >
                  Vinculado ao Tipo de Demanda
                </TableSortLabel>
              </TableCell>
              <TableCell
                sortDirection={orderBy === "dataCriacao" ? order : false}
              >
                <TableSortLabel
                  active={orderBy === "dataCriacao"}
                  direction={orderBy === "dataCriacao" ? order : "asc"}
                  onClick={() => handleSortRequest("dataCriacao")}
                >
                  Data de Criação
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 6. CORPO da tabela agora usa a lista filtrada e ordenada */}
            {filteredAndSortedLaudos.map((laudo) => (
              <TableRow key={laudo.id} hover>
                <TableCell component="th" scope="row">
                  {laudo.nome}
                </TableCell>
                <TableCell>{laudo.tipoDemandaVinculada}</TableCell>
                <TableCell>{laudo.dataCriacao}</TableCell>
                <TableCell align="right">
                  <IconButton
                    title="Visualizar"
                    onClick={() => handleView(laudo.id)}
                  >
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton
                    title="Editar"
                    onClick={() => handleEdit(laudo.id)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    title="Apagar"
                    onClick={() => handleDelete(laudo.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
