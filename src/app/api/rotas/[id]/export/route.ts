// src/app/api/rotas/[id]/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../../lib/db';
import * as XLSX from 'xlsx'; // Importa a biblioteca para gerar o Excel
import { format } from 'date-fns'; // Para formatar datas

// ***** INÍCIO DA CORREÇÃO 1: Definir o tipo para o Contexto *****
// Define o tipo esperado para o segundo argumento (context)
type ExpectedContext = {
    params: Promise<{ id: string }>;
};
// ***** FIM DA CORREÇÃO 1 *****


// Função para "limpar" o nome do arquivo
function sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9_\- ]/gi, '').trim().replace(/ /g, '_');
}

// ***** INÍCIO DA CORREÇÃO 2: Atualizar a assinatura da função GET *****
export async function GET(request: NextRequest, context: ExpectedContext) {
    // Agora usamos 'await' para obter os parâmetros
    const params = await context.params;
    const { id } = params;
// ***** FIM DA CORREÇÃO 2 *****

    const rotaId = Number(id);
    console.log(`[API /rotas/${id}/export] Recebido GET para exportar rota.`);

    if (isNaN(rotaId)) {
        return NextResponse.json({ message: 'ID da rota inválido.' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
        // 1. Buscar o nome da Rota (para o nome do arquivo)
        const rotaResult = await client.query('SELECT nome FROM rotas WHERE id = $1', [rotaId]);
        if (rotaResult.rowCount === 0) {
            return NextResponse.json({ message: 'Rota não encontrada.' }, { status: 404 });
        }
        const rotaName = sanitizeFilename(rotaResult.rows[0].nome);

        // 2. Buscar as Demandas da rota (com colunas formatadas para o Excel)
        const demandasQuery = `
            SELECT 
                rd.ordem AS "Ordem",
                d.id AS "ID Demanda",
                d.tipo_demanda AS "tipo_demanda",
                d.descricao AS "Descrição",
                d.cep AS "cep",
                d.logradouro AS "Rua",
                d.numero AS "Número",
                d.bairro AS "Bairro",
                d.cidade AS "Cidade",
                d.uf AS "UF",
                d.complemento AS "Complemento",
                d.nome_solicitante AS "Nome do Solicitante",
                d.telefone_solicitante AS "Telefone do Solicitante",
                d.email_solicitante AS "E-mail do Solicitante",
                s.nome AS "Status Atual",
                d.prazo
            FROM 
                demandas d
            JOIN 
                rotas_demandas rd ON d.id = rd.demanda_id
            LEFT JOIN 
                demandas_status s ON d.id_status = s.id
            WHERE 
                rd.rota_id = $1
            ORDER BY 
                rd.ordem ASC; 
        `;
        const demandasResult = await client.query(demandasQuery, [rotaId]);

        // 3. Formatar os dados (especialmente datas)
        const dadosFormatados = demandasResult.rows.map(row => ({
            ...row,
            // Converte a data do prazo para o formato dd/mm/yyyy
            prazo: row.prazo ? format(new Date(row.prazo), 'dd/MM/yyyy') : '',
        }));

        // 4. Criar o arquivo Excel
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
        
        // Opcional: Ajustar a largura das colunas
        const colWidths = [
            { wch: 6 }, // Ordem
            { wch: 10 }, // ID Demanda
            { wch: 15 }, // tipo_demanda
            { wch: 40 }, // Descrição
            { wch: 10 }, // cep
            { wch: 30 }, // Rua
            { wch: 8 }, // Número
            { wch: 20 }, // Bairro
            { wch: 20 }, // Cidade
            { wch: 4 }, // UF
            { wch: 15 }, // Complemento
            { wch: 25 }, // Nome do Solicitante
            { wch: 20 }, // Telefone
            { wch: 25 }, // E-mail
            { wch: 15 }, // Status Atual
            { wch: 12 }, // prazo
        ];
        worksheet['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandas da Rota');

        // 5. Gerar o buffer do arquivo
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // 6. Criar a resposta
        const headers = new Headers();
        headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        headers.append('Content-Disposition', `attachment; filename="Rota_${rotaId}_${rotaName}.xlsx"`);

        return new NextResponse(buffer, {
            status: 200,
            headers: headers
        });

    } catch (error) {
        console.error(`[API /rotas/${id}/export] Erro ao exportar rota:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido.';
        return NextResponse.json({ message: 'Erro interno ao gerar o arquivo.', error: errorMessage }, { status: 500 });
    } finally {
        client.release();
    }
}