
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // Autenticação (Opcional por enquanto, mas recomendado em prod)
                // const session = await auth();
                // if (!session) throw new Error('Unauthorized');

                return {
                    addRandomSuffix: true,
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                    tokenPayload: JSON.stringify({
                        // optional, sent to your server on upload completion
                        // userEmail: session.user.email,
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // Callback após upload concluído (se precisar notificar algo)
                console.log('Upload concluído:', blob.url);
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 }, // The webhook will retry 5 times waiting for a 200
        );
    }
}
