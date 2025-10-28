// src/app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Interface para a resposta da API do Google Geocoding (pode ser movida para /types se preferir)
interface GoogleGeocodeResult {
    results: {
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
        formatted_address: string;
    }[];
    status: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
    error_message?: string;
}

// Tipagem para o corpo da requisição que esperamos do frontend
interface GeocodeRequestBody {
    logradouro?: string | null;
    numero?: string | null;
    cidade?: string | null;
    uf?: string | null;
}

export async function POST(request: NextRequest) {
    console.log('[API /geocode] Recebido POST');
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.error('[API /geocode] Erro: GOOGLE_MAPS_API_KEY não configurada no backend.');
            return NextResponse.json({ message: 'Erro interno do servidor: Chave de API não configurada.' }, { status: 500 });
        }

        // Extrai os dados do corpo da requisição
        const body: GeocodeRequestBody = await request.json();
        const { logradouro, numero, cidade, uf } = body;

        // Validação mínima dos dados recebidos
        if (!logradouro || !numero || !cidade || !uf) {
            console.log('[API /geocode] Erro 400: Dados de endereço insuficientes recebidos.');
            return NextResponse.json({ message: 'Dados de endereço insuficientes fornecidos.' }, { status: 400 });
        }

        // Monta o endereço para a API do Google
        const addressParts = [numero, logradouro, cidade, uf, 'Brasil'].filter(Boolean);
        const addressString = addressParts.join(', ');

        // Monta a URL da API do Google Maps
        const queryParams = new URLSearchParams({
            address: addressString,
            key: apiKey,
            language: 'pt-BR' // Opcional: para resultados em português
        });
        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?${queryParams.toString()}`;

        console.log(`[API /geocode] Chamando Google API para endereço: ${addressString}`);
        const googleResponse = await fetch(apiUrl);
        const data: GoogleGeocodeResult = await googleResponse.json();

        console.log('[API /geocode] Resposta da Google API:', data.status);

        // Processa a resposta do Google
        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            const coordinates: [number, number] = [location.lat, location.lng]; // [latitude, longitude]
            console.log('[API /geocode] Coordenadas encontradas:', coordinates);
            return NextResponse.json({ coordinates }, { status: 200 });
        } else if (data.status === 'ZERO_RESULTS') {
            console.log('[API /geocode] Google API retornou ZERO_RESULTS');
            return NextResponse.json({ message: 'Endereço não encontrado pela API.' }, { status: 404 }); // Not Found
        } else {
            // Outros erros da API do Google
            console.error('[API /geocode] Erro da Google API:', data.status, data.error_message);
            return NextResponse.json({ message: `Erro da API de Geocodificação: ${data.status}`, error: data.error_message }, { status: 502 }); // Bad Gateway ou outro erro 5xx
        }

    } catch (error) {
        console.error('[API /geocode] Erro inesperado no handler:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ message: 'Erro interno do servidor ao processar geocodificação.', error: errorMessage }, { status: 500 });
    }
}

// Opcional: Adicionar um handler GET para testar se a rota está funcionando (sem lógica real)
export async function GET() {
    return NextResponse.json({ message: 'Endpoint de Geocodificação pronto para receber POST.' });
}