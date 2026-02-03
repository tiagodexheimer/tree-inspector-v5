import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const queryFilename = searchParams.get('filename');

  // 1. Detecta o ambiente (Development ou Production)
  // Se for 'production', usa a pasta 'prod'. Se for qualquer outra coisa, usa 'dev'.
  const folder = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

  // 2. Garante um nome de arquivo seguro
  const timestamp = Date.now();
  const cleanName = queryFilename ? queryFilename.replace(/[^a-zA-Z0-9.-]/g, '') : `imagem-${timestamp}.jpg`;

  // 3. Monta o caminho final: "dev/nomedafoto.jpg" ou "prod/nomedafoto.jpg"
  const filepath = `${folder}/${cleanName}`;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'Arquivo não encontrado.' }, { status: 400 });
    }

    // 4. Envia para o Blob com o caminho contendo a pasta
    const blob = await put(filepath, file, {
      access: 'public',
      addRandomSuffix: false, // Mantém o nome original se possível
      token: process.env.BLOB_READ_WRITE_TOKEN, // Opcional se já estiver no env global, mas bom garantir
      allowOverwrite: true // Permite sobrescrever se já existir (essencial para syncs repetidos)
    });

    return NextResponse.json({ url: blob.url });

  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json({ message: 'Erro interno.' }, { status: 500 });
  }
}