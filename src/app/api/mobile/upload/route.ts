import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  // Garante que o nome do arquivo tenha uma extensão, caso o Android não envie
  const queryFilename = searchParams.get('filename');
  const filename = queryFilename || `mobile-upload-${Date.now()}.jpg`;

  try {
    // CORREÇÃO CRÍTICA:
    // O Android envia um Multipart Form. O 'request.body' contém o formulário inteiro (com boundaries).
    // Precisamos extrair apenas o arquivo do campo "file".
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { message: 'Nenhum arquivo enviado no campo "file".' }, 
        { status: 400 }
      );
    }

    // Agora enviamos o ARQUIVO limpo (File object), não o stream bruto da requisição
    const blob = await put(filename, file, {
      access: 'public',
    });

    return NextResponse.json({ url: blob.url });

  } catch (error) {
    console.error("Erro ao processar upload:", error);
    return NextResponse.json(
      { message: 'Erro interno no servidor de upload.' }, 
      { status: 500 }
    );
  }
}