import { list, del } from '@vercel/blob';
import { Pool } from 'pg';
import { config } from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

// Resolve __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega as variáveis de ambiente do .env.local (1 nível acima da pasta scripts)
config({ path: path.join(__dirname, '../.env.local') });

async function cleanup() {
  const isDeleteMode = process.argv.includes('--delete');
  
  console.log('\n=========================================');
  console.log('   LIMPEZA DE FOTOS ÓRFÃS (VERCEL BLOB)   ');
  console.log('=========================================');
  console.log(`Modo: ${isDeleteMode ? '🔴 DELETAR' : '🔵 APENAS LISTAR (Dry Run)'}`);
  console.log('-----------------------------------------\n');

  if (!process.env.POSTGRES_URL) {
    console.error('ERRO: POSTGRES_URL não encontrada no .env.local');
    process.exit(1);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('ERRO: BLOB_READ_WRITE_TOKEN não encontrada no .env.local');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

  try {
    // 1. Coleta todas as URLs referenciadas no banco de dados
    console.log('🔍 Buscando referências no banco de dados...');
    
    const demandasRes = await pool.query('SELECT anexos FROM demandas');
    const notificacoesRes = await pool.query('SELECT fotos FROM notificacoes');
    const vistoriasRes = await pool.query('SELECT respostas FROM vistorias_realizadas');

    const referencedUrls = new Set<string>();

    const extractUrls = (data: any) => {
      if (!data) return;
      const str = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Regex para encontrar URLs do Vercel Blob
      // Formato: https://[hash].public.blob.vercel-storage.com/[pathname]
      const regex = /https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[^\s"']+/g;
      const matches = str.match(regex);
      if (matches) {
        matches.forEach(url => referencedUrls.add(url));
      }
    };

    demandasRes.rows.forEach(row => extractUrls(row.anexos));
    notificacoesRes.rows.forEach(row => extractUrls(row.fotos));
    vistoriasRes.rows.forEach(row => extractUrls(row.respostas));

    console.log(`✅ Encontradas ${referencedUrls.size} referências únicas no banco.`);

    // 2. Lista todos os blobs armazenados no Vercel
    console.log('☁️  Listando arquivos no Vercel Blob Storage...');
    const { blobs } = await list();
    console.log(`📦 Total de arquivos no storage: ${blobs.length}`);

    // 3. Identifica arquivos órfãos (existem no storage mas não no banco)
    const orphanedBlobs = blobs.filter(blob => !referencedUrls.has(blob.url));

    if (orphanedBlobs.length === 0) {
      console.log('\n✨ Tudo limpo! Nenhum arquivo órfão encontrado.');
      return;
    }

    console.log(`\n⚠️  Encontrados ${orphanedBlobs.length} arquivos órfãos:`);
    let totalSize = 0;
    orphanedBlobs.forEach(blob => {
      const sizeKB = (blob.size / 1024).toFixed(2);
      console.log(`  - [${sizeKB} KB] ${blob.pathname}`);
      totalSize += blob.size;
    });
    
    console.log(`\nTotal de espaço que pode ser liberado: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    // 4. Deleta se estiver no modo delete
    if (isDeleteMode) {
      console.log(`\n🚀 Iniciando exclusão de ${orphanedBlobs.length} arquivos...`);
      for (const blob of orphanedBlobs) {
        try {
          await del(blob.url);
          console.log(`  ✅ Deletado: ${blob.pathname}`);
        } catch (err) {
          console.error(`  ❌ Falha ao deletar ${blob.pathname}:`, err);
        }
      }
      console.log('\n✅ Limpeza concluída com sucesso!');
    } else {
      console.log('\n💡 Dica: Execute com o parâmetro "--delete" para apagar os arquivos listados.');
    }

  } catch (error) {
    console.error('\n❌ Erro crítico durante a execução:', error);
  } finally {
    await pool.end();
  }
}

cleanup();
