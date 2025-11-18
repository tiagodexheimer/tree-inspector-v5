import { NextRequest, NextResponse } from 'next/server';
import { geocodingService } from '@/services/geocoding-service';

interface GeocodeRequestBody {
    logradouro?: string;
    numero?: string;
    cidade?: string;
    uf?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: GeocodeRequestBody = await request.json();

        // O serviço já valida se a chave de API existe e se os dados são suficientes
        const coordinates = await geocodingService.getCoordinates({
            logradouro: body.logradouro,
            numero: body.numero,
            cidade: body.cidade,
            uf: body.uf
        });

        if (!coordinates) {
            return NextResponse.json({ message: 'Endereço não encontrado pela API.' }, { status: 404 });
        }

        return NextResponse.json({ coordinates }, { status: 200 });

    } catch (error) {
        console.error('[API /geocode]', error);
        
        let status = 500;
        let message = 'Erro interno ao processar geocodificação.';

        if (error instanceof Error) {
            message = error.message;
            // Se for erro de validação (campos faltantes)
            if (message.includes("Endereço incompleto")) status = 400;
            // Se for erro de configuração
            if (message.includes("GOOGLE_MAPS_API_KEY")) status = 500;
        }

        return NextResponse.json({ message, error: message }, { status });
    }
}

// Handler GET para health check (opcional, mantido do original)
export async function GET() {
    return NextResponse.json({ message: 'Endpoint de Geocodificação ativo.' });
}