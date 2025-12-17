
'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Data Type matching API
interface Especie {
  id: number;
  nome_comum: string;
  nome_cientifico: string;
  familia: string | null;
  origem: string | null;
}

export default function EspeciesPage() {
  const [rows, setRows] = useState<Especie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State for Server-Side (Optional, but let's do it right)
  // For now, let's just fetch ALL for simplicity (300 rows is fine)
  // But our API defaults to 10. Let's ask for 1000.

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/especies?limit=1000');
      if (!res.ok) throw new Error('Falha ao carregar espécies');
      const data = await res.json();
      setRows(data.results || []);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const res = await fetch('/api/especies/import', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        setError(null);
        alert(`Sucesso! ${result.count} espécies importadas.`);
        fetchData();
      } else {
        setError(result.error || 'Erro na importação.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao enviar arquivo.');
    } finally {
      setLoading(false);
      // Reset input
      event.target.value = '';
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'nome_comum', headerName: 'Nome Comum', flex: 1, minWidth: 150 },
    { field: 'nome_cientifico', headerName: 'Nome Científico', flex: 1, minWidth: 150, renderCell: (params) => <i>{params.value}</i> },
    { field: 'familia', headerName: 'Família', width: 150 },
    { field: 'origem', headerName: 'Origem', width: 120 },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          {/* Placeholder actions - Functionality can be added later as per user request scope */}
          <IconButton size="small" disabled>
            <EditIcon />
          </IconButton>
          <IconButton size="small" color="error" disabled>
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <div className="p-4" style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <h1 className="text-2xl font-bold">Gerenciar Espécies</h1>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            component="label"
            disabled={loading}
          >
            Importar Excel
            <input
              type="file"
              hidden
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled
            sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
          >
            Nova Espécie
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ flexGrow: 1, width: '100%', overflow: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          sx={{ border: 0 }}
        />
      </Paper>
    </div>
  );
}