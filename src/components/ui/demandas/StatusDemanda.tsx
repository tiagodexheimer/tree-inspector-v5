'use client';

import React, { useState } from 'react';
import { Button, CircularProgress, Menu, MenuItem, Typography } from '@mui/material';
import { Status, DemandaType } from '@/types/demanda';

const statusConfig = {
    Pendente: { backgroundColor: '#FFC107', color: '#000' },
    'Em andamento': { backgroundColor: '#2196F3', color: '#fff' },
    Concluído: { backgroundColor: '#4CAF50', color: '#fff' },
};

interface StatusDemandaProps {
    demandaId: number;
    currentStatus: Status;
    onStatusChange: (demandaId: number, newStatus: Status) => Promise<void>;
}

export default function StatusDemanda({ demandaId, currentStatus, onStatusChange }: StatusDemandaProps) {
    // 1. Estado para controlar o menu
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // 2. Funções para abrir e fechar o menu
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isUpdating) return;
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
        setUpdateError(null);
    };

    const handleSelectStatus = async (newStatus: Status) => {
        handleClose(); // Fecha o menu imediatamente
        if (newStatus === currentStatus) return; // Não faz nada se o status for o mesmo

        setIsUpdating(true);
        setUpdateError(null);
        try {
            await onStatusChange(demandaId, newStatus); // Chama o callback passado pelo pai
            // O pai será responsável por atualizar o estado local da demanda
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            setUpdateError(error instanceof Error ? error.message : "Erro desconhecido");
            // Poderia mostrar um Snackbar/Toast aqui também
        } finally {
            setIsUpdating(false);
        }
    };

    // Define os status possíveis para o menu
    const possibleStatus: Status[] = ['Pendente', 'Em andamento', 'Concluído'];

    const style = statusConfig[currentStatus];

    return (
        <div>
            <Button
                variant="contained"
                onClick={handleClick}
                disabled={isUpdating}
                sx={{
                    backgroundColor: style.backgroundColor,
                    color: style.color,
                    '&:hover': { backgroundColor: style.backgroundColor, opacity: 0.9 },
                    borderRadius: '20px',
                    textTransform: 'none',
                    fontWeight: 'bold',
                    minWidth: '120px',
                    position: 'relative',
                }}
            >
                {isUpdating ? <CircularProgress size={20} color="inherit" sx={{ position: 'absolute' }} /> : currentStatus}
            </Button>
            {updateError && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>{updateError}</Typography>}
            {/* 3. O componente do Menu Suspenso */}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
            >
                {possibleStatus.map((statusOption) => (
                    <MenuItem
                        key={statusOption}
                        selected={statusOption === currentStatus}
                        onClick={() => handleSelectStatus(statusOption)}
                        disabled={isUpdating} // Desabilita itens enquanto atualiza
                    >
                        {statusOption}
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
}