"use client";
import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CriarFormularios from '@/components/ui/formularios/CriarFormularios';
import VisualizarFormularios from '@/components/ui/formularios/VisualizarFormularios';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`vertical-tabpanel-${index}`}
            aria-labelledby={`vertical-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {/* CORREÇÃO AQUI: Adicionado component="div" para evitar erro de hidratação */}
                    <Typography component="div">{children}</Typography>
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `vertical-tab-${index}`,
        'aria-controls': `vertical-tabpanel-${index}`,
    };
}

export default function FormulariosPage() {
    const [value, setValue] = React.useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <div className='p-4'>
            <Box
                sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', height: '100vh', padding: 2}}
            >
                <Tabs
                    orientation="vertical"
                    variant="scrollable"
                    value={value}
                    onChange={handleChange}
                    aria-label="Vertical tabs example"
                    sx={{ borderRight: 1, borderColor: 'divider' }}
                >
                    <Tab label="Listar formulários" {...a11yProps(0)} />
                    <Tab label="Criar formulário" {...a11yProps(1)} />
                    <Tab label="Configurações" {...a11yProps(2)} />
                </Tabs>
                <TabPanel value={value} index={0}>
                    <VisualizarFormularios />
                </TabPanel>
                <TabPanel value={value} index={1}>
                    <CriarFormularios />
                </TabPanel>
                <TabPanel value={value} index={2}>
                    TODO
                </TabPanel>

            </Box>
        </div>
    );
}