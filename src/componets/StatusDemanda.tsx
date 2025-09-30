'use client';

import React, { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { Status } from '@/types/demanda';

const statusConfig = {
    Pendente: { backgroundColor: '#FFC107', color: '#000' },
    'Em andamento': { backgroundColor: '#2196F3', color: '#fff' },
    Concluído: { backgroundColor: '#4CAF50', color: '#fff' },
};

interface StatusDemandaProps {
    status: Status;
}

export default function StatusDemanda({ status }: StatusDemandaProps) {
    // 1. Estado para controlar o menu
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    // 2. Funções para abrir e fechar o menu
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const style = statusConfig[status];

    return (
        <div>
            <Button
                variant="contained"
                onClick={handleClick} // Chama a função para abrir
                sx={{
                    backgroundColor: style.backgroundColor,
                    color: style.color,
                    '&:hover': { backgroundColor: style.backgroundColor, opacity: 0.9 },
                    borderRadius: '20px',
                    textTransform: 'none',
                    fontWeight: 'bold',
                }}
            >
                {status}
            </Button>
            {/* 3. O componente do Menu Suspenso */}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
            >
                <MenuItem onClick={handleClose}>Pendente</MenuItem>
                <MenuItem onClick={handleClose}>Em andamento</MenuItem>
                <MenuItem onClick={handleClose}>Concluído</MenuItem>
            </Menu>
        </div>
    );
}