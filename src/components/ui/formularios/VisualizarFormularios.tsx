import { Button } from '@mui/material';
import { DataGrid, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CreateIcon from '@mui/icons-material/Create';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';


const rows: GridRowsProp = [
    { id: 1, name: 'Autorização de poda', description: 'utilizado quando é realizada vistoria de autorização de poda', demanda: 'Poda', status: 'Em andamento' },
    { id: 2, name: 'Autorização de supressão', description: 'utilizado quando é realizada vistoria de autorização de supressão', demanda: 'Supressão', status: 'Pendente' },
    { id: 3, name: 'Ficha de fiscalização', description: 'utilizado quando é realizada vistoria de fiscalização', demanda: 'Fiscalização', status: 'Concluida' },
];
const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nome', width: 200 },
    { field: 'description', headerName: 'Descrição', width: 300 },
    { field: 'demanda', headerName: 'Tipo demanda', width: 300 },
    { field: 'status', headerName: 'Status', width: 150 },
    {
        field: 'visualizar',
        headerName: 'Visualizar',
        width: 90,
        renderCell: (params) => {
            const onClick = (e: { stopPropagation: () => void; }) => {
                e.stopPropagation(); // para não acionar eventos da linha

                // params.row contém todos os dados da linha atual
                const rowData = params.row;
                alert(`Você clicou no produto: ${rowData.name}`);
                console.log(rowData);
            };

            return <Button variant="contained" color="primary" onClick={onClick} sx={{ padding: 1, borderRadius: 5 }}><VisibilityIcon /></Button>;
        }
    },
    {
        field: 'editar',
        headerName: 'Editar',
        width: 90,
        renderCell: (params) => {
            const onClick = (e: { stopPropagation: () => void; }) => {
                e.stopPropagation(); // para não acionar eventos da linha

                // params.row contém todos os dados da linha atual
                const rowData = params.row;
                alert(`Você clicou no produto: ${rowData.name}`);
                console.log(rowData);
            };

            return <Button variant="contained" color="primary" onClick={onClick} sx={{ padding: 1, borderRadius: 5 }}><CreateIcon /></Button>;
        }
    },
    {
        field: 'deletar',
        headerName: 'deletar',
        width: 90,
        renderCell: (params) => {
            const onClick = (e: { stopPropagation: () => void; }) => {
                e.stopPropagation(); // para não acionar eventos da linha

                // params.row contém todos os dados da linha atual
                const rowData = params.row;
                alert(`Você clicou no produto: ${rowData.name}`);
                console.log(rowData);
            };

            return <Button variant="contained" color="primary" onClick={onClick} sx={{ padding: 1, borderRadius: 5, backgroundColor: 'red' }}><DeleteForeverIcon /></Button>;
        }
    },
];


export default function VisualizarFormularios() {
    return (
        <div>
            <DataGrid rows={rows} columns={columns} getRowHeight={() => 'auto'}
                sx={{
                    '&.MuiDataGrid-root--densityCompact .MuiDataGrid-cell': { py: '8px' },
                    '&.MuiDataGrid-root--densityStandard .MuiDataGrid-cell': { py: '15px' },
                    '&.MuiDataGrid-root--densityComfortable .MuiDataGrid-cell': { py: '22px' },
                }} />
        </div>
    );
}