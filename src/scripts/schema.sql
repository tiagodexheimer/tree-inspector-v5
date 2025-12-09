-- ============================================================================
-- ARQUIVO: src/scripts/schema.sql
-- DESCRIÇÃO: Schema Multi-tenant para Tree Inspector V5
-- ============================================================================

-- 1. EXTENSÕES E UTILITÁRIOS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 

-- Sequência global para protocolos (pode ser personalizada por org futuramente se necessário)
CREATE SEQUENCE IF NOT EXISTS protocolo_seq START 1;


-- 2. AUTENTICAÇÃO E USUÁRIOS
-- ==========================================

-- Tabela de Usuários (Global)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(), 
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    email_verified TIMESTAMPTZ,
    password TEXT NOT NULL, 
    role TEXT NOT NULL DEFAULT 'free_user', -- 'admin', 'paid_user', 'free_user'
    image TEXT,
    
    -- Cache do ID da organização atual/principal para acesso rápido
    organization_id INT, 
    
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


-- 3. ORGANIZAÇÕES (MULTI-TENANCY)
-- ==========================================

-- Tabela de Organizações (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT, -- Identificador único opcional para URL (ex: app.com/minha-empresa)
    plan_type TEXT NOT NULL DEFAULT 'Free', -- 'Free', 'Pro', 'Enterprise'
    
    -- Quem criou a organização
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL, 
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agora que a tabela organizations existe, podemos adicionar a FK em users
ALTER TABLE users 
ADD CONSTRAINT fk_users_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Membros da Organização (Tabela de Junção para Múltiplos Membros)
CREATE TABLE IF NOT EXISTS organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, user_id)
);

-- Convites por Email
CREATE TABLE IF NOT EXISTS organization_invites (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'member',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 4. CONFIGURAÇÕES DA ORGANIZAÇÃO (DADOS PARAMETRIZÁVEIS)
-- ==========================================

-- Status das Demandas (Ex: Pendente, Concluído)
-- Cada organização tem seus próprios status.
CREATE TABLE IF NOT EXISTS demandas_status (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#808080',
    
    -- O nome do status deve ser único APENAS dentro da organização
    UNIQUE(organization_id, nome)
);

-- Tipos de Demandas (Ex: Poda, Supressão)
CREATE TABLE IF NOT EXISTS demandas_tipos (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    nome TEXT NOT NULL,
    
    UNIQUE(organization_id, nome)
);

-- Configurações Gerais (JSON para flexibilidade)
-- Ex: { "padrao_rota": { "inicio": { lat: -30, lng: -51 } } }
CREATE TABLE IF NOT EXISTS configuracoes (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    chave VARCHAR(50) NOT NULL, 
    valor JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, chave)
);

-- Formulários Dinâmicos
CREATE TABLE IF NOT EXISTS formularios (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    nome TEXT NOT NULL,
    descricao TEXT,
    definicao_campos JSONB NOT NULL, -- Array de campos do formulário
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ligação: Tipo de Demanda <-> Formulário
CREATE TABLE IF NOT EXISTS demandas_tipos_formularios (
    id_tipo_demanda INT PRIMARY KEY REFERENCES demandas_tipos(id) ON DELETE CASCADE, 
    id_formulario INT NOT NULL REFERENCES formularios(id) ON DELETE CASCADE
);


-- 5. DADOS OPERACIONAIS (O CORE DO SISTEMA)
-- ==========================================

-- Demandas (Obrigatoriamente vinculadas a uma organização)
CREATE TABLE IF NOT EXISTS demandas (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    
    -- Auditoria
    created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    
    protocolo TEXT NOT NULL, 
    
    -- Dados do Solicitante
    nome_solicitante TEXT, 
    telefone_solicitante TEXT, 
    email_solicitante TEXT,
    
    -- Endereço
    cep TEXT, 
    logradouro TEXT, 
    numero TEXT, 
    complemento TEXT, 
    bairro TEXT, 
    cidade TEXT, 
    uf VARCHAR(2),
    
    -- Dados da Demanda
    tipo_demanda TEXT NOT NULL, -- Nome do tipo (legado/display)
    descricao TEXT NOT NULL,
    
    -- Status (FK)
    id_status INT REFERENCES demandas_status(id) ON DELETE SET NULL,
    
    -- Geolocalização
    geom GEOMETRY(Point, 4326),
    
    prazo DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Protocolo único dentro da organização (ou global, dependendo da regra de negócio)
    UNIQUE(organization_id, protocolo)
);

-- Rotas
CREATE TABLE IF NOT EXISTS rotas (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
    
    nome TEXT NOT NULL, 
    responsavel TEXT, -- Nome do usuário responsável (texto ou FK)
    status TEXT, -- 'Pendente', 'Em Andamento', 'Concluída'
    
    -- Personalização de início/fim específica desta rota
    inicio_personalizado_lat DOUBLE PRECISION, 
    inicio_personalizado_lng DOUBLE PRECISION,
    fim_personalizado_lat DOUBLE PRECISION, 
    fim_personalizado_lng DOUBLE PRECISION,
    
    data_rota TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens da Rota (N:M entre Rotas e Demandas)
CREATE TABLE IF NOT EXISTS rotas_demandas (
    rota_id INT NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
    demanda_id INT NOT NULL REFERENCES demandas(id) ON DELETE CASCADE,
    ordem INT,
    
    PRIMARY KEY (rota_id, demanda_id),
    -- Garante que uma demanda só esteja em UMA rota por vez
    UNIQUE(demanda_id) 
);

-- Vistorias / Laudos
CREATE TABLE IF NOT EXISTS vistorias_realizadas (
    id SERIAL PRIMARY KEY,
    demanda_id INT NOT NULL REFERENCES demandas(id) ON DELETE CASCADE,
    realizado_por_user_id TEXT REFERENCES users(id),
    
    respostas JSONB NOT NULL, -- Dados preenchidos no app móvel
    data_realizacao TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(demanda_id)
);


-- 6. TRIGGERS E AUTOMAÇÃO
-- ==========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para popular dados padrão ao criar uma nova organização
CREATE OR REPLACE FUNCTION trigger_setup_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Inserir Status Padrão
  INSERT INTO demandas_status (organization_id, nome, cor) VALUES
  (NEW.id, 'Pendente', '#FFA500'),
  (NEW.id, 'Vistoria Agendada', '#1976D2'),
  (NEW.id, 'Em Rota', '#9c27b0'),
  (NEW.id, 'Concluído', '#2E7D32');

  -- 2. Inserir Tipos Padrão
  INSERT INTO demandas_tipos (organization_id, nome) VALUES
  (NEW.id, 'Avaliação'),
  (NEW.id, 'Poda'),
  (NEW.id, 'Supressão'),
  (NEW.id, 'Fiscalização');

  -- 3. Inserir Configuração Padrão de Rota (Coordenadas de Exemplo - Esteio)
  INSERT INTO configuracoes (organization_id, chave, valor) VALUES
  (NEW.id, 'padrao_rota', '{"inicio": {"lat": -29.8533191, "lng": -51.1789191}, "fim": {"lat": -29.8533191, "lng": -51.1789191}}');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicação dos Triggers
DROP TRIGGER IF EXISTS set_users_timestamp ON users;
CREATE TRIGGER set_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_orgs_timestamp ON organizations;
CREATE TRIGGER set_orgs_timestamp BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_demandas_timestamp ON demandas;
CREATE TRIGGER set_demandas_timestamp BEFORE UPDATE ON demandas FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_formularios_timestamp ON formularios;
CREATE TRIGGER set_formularios_timestamp BEFORE UPDATE ON formularios FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger que roda APÓS criar uma organização para popular os dados
DROP TRIGGER IF EXISTS setup_new_organization ON organizations;
CREATE TRIGGER setup_new_organization 
AFTER INSERT ON organizations 
FOR EACH ROW 
EXECUTE FUNCTION trigger_setup_new_organization();