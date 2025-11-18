import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import db from '@/lib/db';
import { CampoDef } from '@/types/formularios';

// Define a estrutura do corpo da requisição POST
interface FormularioRequestBody {
  nome: string;
  descricao?: string;
  definicao_campos: CampoDef[];
  id_tipo_demanda: number;
}

/**
 * @swagger
 * /api/gerenciar/formularios:
 * post:
 * summary: Cria um novo formulário e o associa a um tipo de demanda.
 * description: Rota protegida para administradores. Cria um formulário e usa ON CONFLICT para associá-lo a um tipo de demanda, substituindo qualquer associação anterior.
 * tags: [Formulários]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * nome:
 * type: string
 * descricao:
 * type: string
 * id_tipo_demanda:
 * type: integer
 * definicao_campos:
 * type: array
 * items:
 * $ref: '#/components/schemas/CampoDef'
 * responses:
 * 201:
 * description: Formulário criado e associado com sucesso.
 * 400:
 * description: Dados inválidos.
 * 401:
 * description: Não autorizado.
 * 403:
 * description: Acesso negado (requer admin).
 * 500:
 * description: Erro interno do servidor.
 */
export async function POST(req: Request) {
  // 1. Autenticação e Autorização (Admin)
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
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
 * @swagger
 * /api/gerenciar/formularios:
 * get:
 * summary: Lista todos os formulários e suas associações.
 * description: Rota protegida para administradores. Retorna uma lista de todos os formulários e o tipo de demanda ao qual estão associados (se houver).
 * tags: [Formulários]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Lista de formulários.
 * 401:
 * description: Não autorizado.
 * 403:
 * description: Acesso negado (requer admin).
 * 500:
 * description: Erro interno do servidor.
 */
export async function GET() {
  // Autenticação (Admin)
  const session = await getServerSession(authOptions);
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