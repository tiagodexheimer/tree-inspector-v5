import { DemandaType } from "@/types/demanda";
import { Card, CardHeader, CardContent, Box, Typography, Button } from "@mui/material";
import StatusDemanda from "./StatusDemanda";
import { useState } from "react";
import DetalhesDemandaModal from "./DetalhesDemandaModal";

export default function CardDemanda(props: DemandaType) {
    const { ID, endereco, descricao, prazo, status } = props;

    const [modalOpen, setModalOpen] = useState(false);

    const handleOpenModal = () => setModalOpen(true);
    const handleCloseModal = () => setModalOpen(false);

    return (
        <div>
            <Card sx={{
                width: 400, 
                height: 500,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}>
                <Box>
                    <CardHeader 
                    title={`Demanda ${ID}`} 
                    subheader={endereco}
                    // 1. Adicione a propriedade 'action'
                    action={
                        <StatusDemanda status={status} />
                    }
                    sx={{ 
                        pb: 0,
                        // Alinha o status no topo, caso o título quebre em duas linhas
                        alignItems: 'flex-start'
                    }}
                />

                    <CardContent>
                        <Box sx={{
                            position: 'relative', // Essencial para o posicionamento do filho
                            paddingTop: '50%',   // 4:3 ratio (3 / 4 = 0.75)
                            width: '100%',
                            borderRadius: '4px', // Adiciona bordas arredondadas ao contêiner
                            overflow: 'hidden'   // Garante que o iframe não "vaze"
                        }}>
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.739454848256!2d-51.14700068488354!3d-29.95726398188318!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjnCsDU3JzI2LjIiUyA1McKwMDgnNDkuMiJX!5e0!3m2!1spt-BR!2sbr!4v1633024888123!5m2!1spt-BR!2sbr"
                                loading="lazy"
                                // 2. Posicione o iframe para preencher o contêiner
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    border: 0
                                }}
                            ></iframe>
                        </Box>
                    </CardContent>
                </Box>
                <CardContent>
                    <p>Endereço: {endereco}</p>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: '2',
                            WebkitBoxOrient: 'vertical',
                            minHeight: '40px' // Garante uma altura mínima para 2 linhas
                        }}
                    >
                        {descricao}
                    </Typography>
                    <p>Prazo: {prazo} dias</p>



                    <Button variant="outlined" size="small" onClick={handleOpenModal} sx={{ mt: 1 }}>
                        Detalhes
                    </Button>
                </CardContent>

            </Card >
            <DetalhesDemandaModal
                open={modalOpen}
                onClose={handleCloseModal}
                demanda={ props }
            />
        </div>
    );
}