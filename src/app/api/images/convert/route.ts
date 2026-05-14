import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'URL da imagem é obrigatória' }, { status: 400 });
    }

    try {
        // 1. Busca a imagem original
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Falha ao buscar imagem original');

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Converte para JPG usando Sharp
        // Definimos o formato para jpeg e uma qualidade alta (90)
        const convertedBuffer = await sharp(buffer)
            .jpeg({ quality: 90 })
            .toBuffer();

        // 3. Retorna a imagem convertida
        const filename = imageUrl.split('/').pop()?.split('?')[0].replace('.webp', '.jpg') || 'imagem.jpg';
        const isDownload = searchParams.get('download') === '1';

        return new NextResponse(convertedBuffer, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`,
                'Cache-Control': 'public, max-age=31536000, immutable', 
            },
        });
    } catch (error) {
        console.error('[ImageConvert API] Erro:', error);
        return NextResponse.json(
            { error: 'Erro ao converter imagem: ' + (error as Error).message },
            { status: 500 }
        );
    }
}
