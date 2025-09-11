import { Card, CardHeader, CardContent } from "@mui/material";

export default function CardDemanda() {
    return (
        <Card>
            <CardHeader title="Demanda 1" />
            <CardContent>
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5820.233321484434!2d-51.17342536945289!3d-29.85172567581208!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95196f620f07e6a3%3A0x4dd1278fc2c4a06d!2sR.%20Eng.%20Hener%20de%20Souza%20Nunes%2C%20150%20-%20Centro%2C%20Esteio%20-%20RS%2C%2093260-120!5e0!3m2!1spt-PT!2sbr!4v1757598757116!5m2!1spt-PT!2sbr" width="250" height="200" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                <p>Detalhes da Demanda 1</p>
            </CardContent>
        </Card>
    );
}