-- scripts/schema.sql

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS postgis;
-- [CRÍTICO] Necessário para criar UUIDs (ID do usuário)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 
CREATE SEQUENCE IF NOT EXISTS protocolo_seq START 1;

-- ==========================================
-- 2. AUTENTICAÇÃO E USUÁRIOS (GLOBAL)
-- ==========================================

-- Tabela de Usuários (NextAuth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(), 
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    email_verified TIMESTAMPTZ,
    password TEXT NOT NULL, 
    role TEXT NOT NULL DEFAULT 'free_user', 
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Contas (OAuth - NextAuth)
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    UNIQUE(provider, provider_account_id)
);

-- Tabela de Sessões (NextAuth)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL
);

-- ==========================================
-- 3. ORGANIZAÇÕES (MULTI-TENANCY)
-- ==========================================

-- Tabela de Organizações (Ambientes)
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, 
    plan_type TEXT NOT NULL DEFAULT 'free', 
    owner_id TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membros da Organização (Vínculo Usuário <-> Org)
CREATE TABLE IF NOT EXISTS organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', 
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Tabela de Convites (Para ambientes corporativos)
CREATE TABLE IF NOT EXISTS organization_invites (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'member',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. CONFIGURAÇÕES DA ORGANIZAÇÃO
-- ==========================================

-- Status das Demandas (Personalizável por Organização)
CREATE TABLE IF NOT EXISTS demandas_status (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#808080',
    UNIQUE(organization_id, nome)
);

-- Tipos de Demandas (Personalizável por Organização)
CREATE TABLE IF NOT EXISTS demandas_tipos (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    nome TEXT NOT NULL,
    UNIQUE(organization_id, nome)
);

-- Configurações Gerais (Ex: Ponto de início/fim padrão da rota)
CREATE TABLE IF NOT EXISTS configuracoes (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    chave VARCHAR(50) NOT NULL, 
    valor JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, chave)
);

-- Formulários Personalizados
CREATE TABLE IF NOT EXISTS formularios (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    nome TEXT NOT NULL,
    descricao TEXT,
    definicao_campos JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ligação entre Tipos e Formulários
CREATE TABLE IF NOT EXISTS demandas_tipos_formularios (
    -- [CORREÇÃO CRÍTICA] Removido o PRIMARY duplicado
    id_tipo_demanda INT PRIMARY KEY REFERENCES demandas_tipos(id) ON DELETE CASCADE, 
    id_formulario INT NOT NULL REFERENCES formularios(id) ON DELETE CASCADE
);

-- ==========================================
-- 5. DADOS OPERACIONAIS
-- ==========================================

-- Demandas (Agora vinculadas a uma organização)
CREATE TABLE IF NOT EXISTS demandas (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    
    protocolo TEXT NOT NULL, 
    nome_solicitante TEXT, telefone_solicitante TEXT, email_solicitante TEXT,
    cep TEXT, logradouro TEXT, numero TEXT, complemento TEXT, bairro TEXT, cidade TEXT, uf VARCHAR(2),
    
    tipo_demanda TEXT NOT NULL,
    descricao TEXT NOT NULL,
    
    id_status INT REFERENCES demandas_status(id) ON DELETE SET NULL,
    
    geom GEOMETRY(Point, 4326),
    
    prazo DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, protocolo)
);

-- Rotas
CREATE TABLE IF NOT EXISTS rotas (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    
    nome TEXT NOT NULL, responsavel TEXT, status TEXT,
    
    inicio_personalizado_lat DOUBLE PRECISION, inicio_personalizado_lng DOUBLE PRECISION,
    fim_personalizado_lat DOUBLE PRECISION, fim_personalizado_lng DOUBLE PRECISION,
    
    data_rota TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens da Rota (Ligação Rota <-> Demanda)
CREATE TABLE IF NOT EXISTS rotas_demandas (
    rota_id INT NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
    demanda_id INT NOT NULL REFERENCES demandas(id) ON DELETE CASCADE,
    ordem INT,
    
    PRIMARY KEY (rota_id, demanda_id),
    UNIQUE(demanda_id)
);

-- Vistorias Realizadas (Resultado final)
CREATE TABLE IF NOT EXISTS vistorias_realizadas (
    id SERIAL PRIMARY KEY,
    demanda_id INT NOT NULL REFERENCES demandas(id) ON DELETE CASCADE,
    realizado_por_user_id TEXT REFERENCES users(id),
    respostas JSONB NOT NULL,
    data_realizacao TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(demanda_id)
);

-- ==========================================
-- 6. TRIGGERS E UTILITÁRIOS
-- ==========================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicando triggers
CREATE TRIGGER set_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_orgs_timestamp BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_demandas_timestamp BEFORE UPDATE ON demandas FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_formularios_timestamp BEFORE UPDATE ON formularios FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();