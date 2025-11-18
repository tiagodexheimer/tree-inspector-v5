import { NextResponse } from 'next/server';
import { auth } from '@/auth'; // Autenticação v5
import db from '@/lib/db';
import { CampoDef } from '@/types/formularios'; // [CORREÇÃO] A importação que faltava

// Define a estrutura do corpo da requisição POST
interface FormularioRequestBody {
  nome: string;
  descricao?: string;
  definicao_campos: CampoDef[];
  id_tipo_demanda: number;
}

/**
 * POST: Cria um novo formulário e o associa a um tipo de demanda.
 */
export async function POST(req: Request) {
  // 1. Autenticação e Autorização (Admin)
  const session = await auth();

  if (!session) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  if (session.user?.role !== 'admin') {
    return NextResponse.json({ message: 'Acesso negado. Requer privilégios de administrador.' }, { status: 403 });
  }

  let dbClient; // Cliente do DB para transação

  try {
    // 2. Validação do Corpo da Requisição
    const body: FormularioRequestBody = await req.json();
    const { nome, descricao, definicao_campos, id_tipo_demanda } = body;

    if (!nome || !id_tipo_demanda || !definicao_campos || definicao_campos.length === 0) {
      return NextResponse.json({ message: 'Campos "nome", "id_tipo_demanda" e "definicao_campos" (com ao menos um campo) são obrigatórios.' }, { status: 400 });
    }

    // 3. Lógica de Banco de Dados (Transação)
    dbClient = await db.connect(); // Pega um cliente do pool
    await dbClient.query('BEGIN'); // Inicia a transação

    try {
      // Passo 1: Inserir na tabela 'formularios'
      const insertFormQuery = `
        INSERT INTO formularios (nome, descricao, definicao_campos) 
        VALUES ($1, $2, $3) 
        RETURNING id;
      `;
      const formResult = await dbClient.query(insertFormQuery, [
        nome,
        descricao || null,
        JSON.stringify(definicao_campos) // Armazena o array de campos como string JSON
      ]);

      const newFormularioId = formResult.rows[0].id;

      // Passo 2: Ligar o formulário ao tipo de demanda (UPSERT)
      // Se já existir uma ligação para esse tipo de demanda, ela é ATUALIZADA.
      const linkQuery = `
        INSERT INTO demandas_tipos_formularios (id_tipo_demanda, id_formulario)
        VALUES ($1, $2)
        ON CONFLICT (id_tipo_demanda) 
        DO UPDATE SET id_formulario = $2;
      `;
      await dbClient.query(linkQuery, [id_tipo_demanda, newFormularioId]);

      // Passo 3: Finalizar a transação
      await dbClient.query('COMMIT');

      // 4. Resposta de Sucesso
      return NextResponse.json(
        { id: newFormularioId, nome, message: 'Formulário criado e associado com sucesso.' },
        { status: 201 }
      );

    } catch (transactionError) {
      // Se qualquer etapa da transação falhar, reverte
      await dbClient.query('ROLLBACK');
      throw transactionError; // Joga o erro para o catch externo
    }

  } catch (error) {
    // 5. Tratamento de Erro
    console.error('Erro ao salvar formulário:', error);
    return NextResponse.json({ message: 'Erro interno do servidor ao salvar o formulário.' }, { status: 500 });

  } finally {
    // 6. Liberar o Cliente
    if (dbClient) {
      dbClient.release(); // Devolve o cliente ao pool
    }
  }
}

/**
 * GET: Lista todos os formulários e suas associações.
 */
export async function GET() {
  // Autenticação (Admin)
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 });
  }

  try {
    // Query para listar todos os formulários e o tipo de demanda associado (se houver)
    const query = `
      SELECT 
        f.id, 
        f.nome, 
        f.descricao, 
        f.updated_at,
        dt.nome AS tipo_demanda_associada
      FROM 
        formularios f
      LEFT JOIN 
        demandas_tipos_formularios dtf ON f.id = dtf.id_formulario
      LEFT JOIN 
        demandas_tipos dt ON dtf.id_tipo_demanda = dt.id
      ORDER BY
        f.updated_at DESC;
    `;
    
    const result = await db.query(query);

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('Erro ao buscar formulários:', error);
    return NextResponse.json({ message: 'Erro interno do servidor.' }, { status: 500 });
  }
}