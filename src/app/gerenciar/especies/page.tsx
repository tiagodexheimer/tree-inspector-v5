'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TableSortLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  DialogContentText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

// --- Tipos e Dados de Exemplo ---

type Especie = {
  id: number;
  nomeComum: string;
  nomeCientifico: string;
  familia: string;
  origem: 'Nativa' | 'Exótica';
};

type Order = 'asc' | 'desc';

// Dados de exemplo para a tabela
const initialEspecies: Especie[] = [
  { id: 1, nomeComum: 'Ipê-amarelo', nomeCientifico: 'Handroanthus albus', familia: 'Bignoniaceae', origem: 'Nativa' },
  { id: 2, nomeComum: 'Sibipiruna', nomeCientifico: 'Caesalpinia pluviosa', familia: 'Fabaceae', origem: 'Nativa' },
  { id: 3, nomeComum: 'Jacarandá-mimoso', nomeCientifico: 'Jacaranda mimosifolia', familia: 'Bignoniaceae', origem: 'Exótica' },
  { id: 4, nomeComum: 'Quaresmeira', nomeCientifico: 'Tibouchina granulosa', familia: 'Melastomataceae', origem: 'Nativa' },
  { id: 5, nomeComum: 'Ligustro', nomeCientifico: 'Ligustrum lucidum', familia: 'Oleaceae', origem: 'Exótica' },
];

// Opções para o autocomplete de família
const familiasExemplo = [
  { label: 'Bignoniaceae' },
  { label: 'Fabaceae' },
  { label: 'Melastomataceae' },
  { label: 'Oleaceae' },
  { label: 'Arecaceae' },
];

// --- Componente Principal da Página ---

export default function EspeciesPage() {
  const [especies, setEspecies] = useState<Especie[]>(initialEspecies);
  const [open, setOpen] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [currentEspecie, setCurrentEspecie] = useState<Partial<Especie> | null>(null);
  const [orderBy, setOrderBy] = useState<keyof Especie>('nomeComum');
  const [order, setOrder] = useState<Order>('asc');
  const [searchQuery, setSearchQuery] = useState(''); // 1. Estado para a busca

  // Lógica de filtragem e ordenação da tabela
  const sortedEspecies = useMemo(() => {
    const filtered = especies.filter(especie =>
      especie.nomeComum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      especie.nomeCientifico.toLowerCase().includes(searchQuery.toLowerCase()) ||
      especie.familia.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      if (a[orderBy] < b[orderBy]) {
        return order === 'asc' ? -1 : 1;
      }
      if (a[orderBy] > b[orderBy]) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [especies, searchQuery, order, orderBy]); // 2. Recalcula quando os dados, a busca ou a ordenação mudam

  const handleSortRequest = (property: keyof Especie) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Funções para controlar os modais
  const handleClickOpen = (especie: Partial<Especie> | null = null) => {
    setCurrentEspecie(especie);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentEspecie(null);
  };

  const handleClickOpenDelete = (especie: Especie) => {
    setCurrentEspecie(especie);
    setOpenDelete(true);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
    setCurrentEspecie(null);
  };

  const handleDelete = () => {
    if (currentEspecie && currentEspecie.id) {
      setEspecies(especies.filter(e => e.id !== currentEspecie.id));
    }
    handleCloseDelete();
  };


  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciar Espécies</h1>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {/* 3. Campo de busca (Input) */}
        <TextField
          label="Buscar espécie..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: '40%',
            flexGrow: 1,
            maxWidth: 400,
            // 1. Estilo para o label quando o campo está focado
            '& label.Mui-focused': {
              color: '#81C784',
            },
            // 2. Estilo para a borda do campo quando está focado
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: '#81C784',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            ),
          }}


        />

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleClickOpen()}
          sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
        >
          Adicionar Nova Espécie
        </Button>
      </Box>

      {/* Tabela de Espécies */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {['nomeComum', 'nomeCientifico', 'familia', 'origem'].map((headCell) => (
                <TableCell key={headCell}>
                  <TableSortLabel
                    active={orderBy === headCell}
                    direction={orderBy === headCell ? order : 'asc'}
                    onClick={() => handleSortRequest(headCell as keyof Especie)}
                  >
                    {headCell.charAt(0).toUpperCase() + headCell.slice(1).replace(/([A-Z])/g, ' $1')}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEspecies.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.nomeComum}</TableCell>
                <TableCell>{row.nomeCientifico}</TableCell>
                <TableCell>{row.familia}</TableCell>
                <TableCell>{row.origem}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleClickOpen(row)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleClickOpenDelete(row)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de Adicionar/Editar */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{currentEspecie?.id ? 'Editar Espécie' : 'Adicionar Nova Espécie'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField label="Nome Comum" defaultValue={currentEspecie?.nomeComum || ''} variant="outlined" fullWidth />
            <TextField label="Nome Científico" defaultValue={currentEspecie?.nomeCientifico || ''} variant="outlined" fullWidth />
            <Autocomplete
              freeSolo
              options={familiasExemplo}
              defaultValue={currentEspecie ? { label: currentEspecie.familia || '' } : null}
              renderInput={(params) => (<TextField {...params} label="Família" helperText="Sugestões serão exibidas ao digitar" />)}
            />
            <FormControl fullWidth>
              <InputLabel>Origem</InputLabel>
              <Select label="Origem" defaultValue={currentEspecie?.origem || 'Nativa'}>
                <MenuItem value="Nativa">Nativa</MenuItem>
                <MenuItem value="Exótica">Exótica</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleClose} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação para Deletar */}
      <Dialog open={openDelete} onClose={handleCloseDelete}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            Você tem certeza que deseja deletar a espécie &quot;{currentEspecie?.nomeComum}&quot;?
            <br />
            <br />
            <strong>Essa ação não poderá ser desfeita.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Deletar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}