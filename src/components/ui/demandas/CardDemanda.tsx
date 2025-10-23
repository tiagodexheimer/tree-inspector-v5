'use client';

import { DemandaType } from "@/types/demanda";
import { Card, CardHeader, CardContent, Box, Typography, Button } from "@mui/material";
import StatusDemanda from "./StatusDemanda";
import { useState } from "react";
import DetalhesDemandaModal from "./DetalhesDemandaModal";

interface CardDemandaProps extends DemandaType {
    isSelected: boolean;
    onSelect: (id: string) => void;
}
function countPrazo(prazo: Date) {
    const today = new Date();
    const timeDiff = prazo.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
}

export default function CardDemanda(props: CardDemandaProps) {
    const { ID, endereco, descricao, prazo, status, isSelected, onSelect } = props;
    const [modalOpen, setModalOpen] = useState(false);

    // Função para abrir o modal de detalhes, parando a propagação do clique
    const handleOpenModal = (e: React.MouseEvent) => {
        e.stopPropagation(); // Impede que o clique chegue ao Card
        setModalOpen(true);
    };

    return (
        <div>
            {/* O onClick agora chama a seleção diretamente */}
            <Card
                onClick={() => onSelect(ID)}
                sx={{
                    width: 400,
                    height: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    // A borda azul agora é o único indicador de seleção
                    border: isSelected ? '2px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
                    cursor: 'pointer',
                    transition: 'border 0.2s',
                    '&:hover': {
                        borderColor: isSelected ? '#1976d2' : 'rgba(0, 0, 0, 0.4)'
                    }
                }}
            >
                <Box>
                    <CardHeader
                        action={<StatusDemanda status={status} />}
                        title={`Demanda ${ID}`}
                        subheader={endereco}
                        sx={{ pb: 0, alignItems: 'flex-start' }}
                    />
                    <CardContent>
                        <Box sx={{ position: 'relative', paddingTop: '50%', width: '100%', borderRadius: '4px', overflow: 'hidden' }}>
                            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.739454848256!2d-51.14700068488354!3d-29.95726398188318!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjnCsDU3JzI2LjIiUyA1McKwMDgnNDkuMiJX!5e0!3m2!1spt-BR!2sbr!4v1633024888123!5m2!1spt-BR!2sbr" loading="lazy" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}></iframe>
                        </Box>
                    </CardContent>
                </Box>
                <CardContent>
                    <p>Endereço: {endereco}</p>
                    <Typography variant="body2" color="text.secondary">{descricao}</Typography>
                    <p>Prazo: {countPrazo(prazo)} dias</p>
                    {/* O botão "Detalhes" agora tem sua própria função de clique que para a propagação */}
                    <Button variant="outlined" size="small" onClick={handleOpenModal} sx={{ mt: 1 }}>
                        Detalhes
                    </Button>
                </CardContent>
            </Card>
            <DetalhesDemandaModal open={modalOpen} onClose={() => setModalOpen(false)} demanda={props} />
        </div>
    );
}