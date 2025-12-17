-- ============================================================================
-- ARQUIVO: src/scripts/schema.sql
-- DESCRIÇÃO: Schema Multi-tenant Otimizado para Tree Inspector V5
-- ============================================================================

-- 1. EXTENSÕES E UTILITÁRIOS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 

-- Sequência global para protocolos
CREATE SEQUENCE IF NOT EXISTS protocolo_seq START 1;


-- 2. ORGANIZAÇÕES (TENANTS)
-- ==========================================
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE, -- Útil para URLs (ex: app.com/empresa-x)
    plan_type TEXT NOT NULL DEFAULT 'Free', -- 'Free', 'Basic', 'Pro', 'Enterprise'
    
    -- Referência ao dono (pode ser NULL inicialmente, preenchido após criar o user)
    owner_id TEXT, 

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. AUTENTICAÇÃO E USUÁRIOS
-- ==========================================

-- Tabela de Usuários (Global)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(), 
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    email_verified TIMESTAMPTZ,
    password TEXT NOT NULL, 
    role TEXT NOT NULL DEFAULT 'free', -- Role do Sistema: 'admin' (dev), 'free', 'basic', 'pro'
    image TEXT,
    
    -- Organização ativa/principal do usuário
    organization_id INT REFERENCES organizations(id) ON DELETE SET NULL, 
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona a FK de owner_id em organizations (agora que users existe)
ALTER TABLE organizations 
ADD CONSTRAINT fk_organizations_owner 
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;


-- Tabela de Contas (NextAuth)
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

-- Membros da Organização (RBAC por Organização)
CREATE TABLE IF NOT EXISTS organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, user_id),
    
    -- [NOVO] Garante integridade dos papéis
    CONSTRAINT check_organization_role 
    CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);

-- Convites
CREATE TABLE IF NOT EXISTS organization_invites (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'member',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 4. CONFIGURAÇÕES DA ORGANIZAÇÃO
-- ==========================================

-- Status das Demandas
CREATE TABLE IF NOT EXISTS demandas_status (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE, 
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#808080',
    is_custom BOOLEAN NOT NULL DEFAULT FALSE, 
    is_default_global BOOLEAN NOT NULL DEFAULT FALSE, 
    UNIQUE(organization_id, nome)
);

-- Tipos de Demandas
CREATE TABLE IF NOT EXISTS demandas_tipos (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE, 
    nome TEXT NOT NULL,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE, 
    is_default_global BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(organization_id, nome)
);

-- Configurações Gerais (JSON)
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
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE, 
    nome TEXT NOT NULL,
    descricao TEXT,
    definicao_campos JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ligação: Tipo <-> Formulário
CREATE TABLE IF NOT EXISTS demandas_tipos_formularios (
    id_tipo_demanda INT PRIMARY KEY REFERENCES demandas_tipos(id) ON DELETE CASCADE, 
    id_formulario INT NOT NULL REFERENCES formularios(id) ON DELETE CASCADE
);


-- 5. DADOS OPERACIONAIS (CORE)
-- ==========================================

-- Demandas
CREATE TABLE IF NOT EXISTS demandas (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, 
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
    tipo_demanda TEXT NOT NULL, 
    descricao TEXT NOT NULL,
    id_status INT REFERENCES demandas_status(id) ON DELETE SET NULL,
    
    -- Geolocalização
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
    nome TEXT NOT NULL, 
    responsavel TEXT, 
    status TEXT, 
    
    inicio_personalizado_lat DOUBLE PRECISION, 
    inicio_personalizado_lng DOUBLE PRECISION,
    fim_personalizado_lat DOUBLE PRECISION, 
    fim_personalizado_lng DOUBLE PRECISION,
    
    data_rota TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens da Rota
CREATE TABLE IF NOT EXISTS rotas_demandas (
    rota_id INT NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
    demanda_id INT NOT NULL REFERENCES demandas(id) ON DELETE CASCADE,
    ordem INT,
    
    PRIMARY KEY (rota_id, demanda_id),
    UNIQUE(demanda_id) 
);

-- Vistorias
CREATE TABLE IF NOT EXISTS vistorias_realizadas (
    id SERIAL PRIMARY KEY,
    demanda_id INT NOT NULL REFERENCES demandas(id) ON DELETE CASCADE,
    realizado_por_user_id TEXT REFERENCES users(id),
    respostas JSONB NOT NULL,
    data_realizacao TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(demanda_id)
);


-- 6. ÍNDICES DE PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_demandas_org ON demandas(organization_id);
CREATE INDEX IF NOT EXISTS idx_rotas_org ON rotas(organization_id);
CREATE INDEX IF NOT EXISTS idx_status_org ON demandas_status(organization_id);
CREATE INDEX IF NOT EXISTS idx_tipos_org ON demandas_tipos(organization_id);
CREATE INDEX IF NOT EXISTS idx_config_org ON configuracoes(organization_id);
CREATE INDEX IF NOT EXISTS idx_forms_org ON formularios(organization_id);
CREATE INDEX IF NOT EXISTS idx_demandas_geom ON demandas USING GIST (geom);


-- 7. TRIGGERS GERAIS
-- ==========================================

-- Função Timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função Setup Nova Organização
CREATE OR REPLACE FUNCTION trigger_setup_new_organization()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserir Configuração Padrão
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

DROP TRIGGER IF EXISTS setup_new_organization ON organizations;
CREATE TRIGGER setup_new_organization 
AFTER INSERT ON organizations 
FOR EACH ROW 
EXECUTE FUNCTION trigger_setup_new_organization();


-- 8. [NOVO] TRIGGER DE CONSISTÊNCIA DO DONO (CRÍTICO)
-- ===================================================
-- Este trigger garante que o owner definido na tabela organizations
-- seja automaticamente adicionado/atualizado como 'owner' na tabela de membros.

CREATE OR REPLACE FUNCTION trigger_sync_org_owner_member()
RETURNS TRIGGER AS $$
BEGIN
    -- Se um owner_id foi definido ou alterado
    IF NEW.owner_id IS NOT NULL THEN
        -- Insere ou atualiza na tabela de membros
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES (NEW.id, NEW.owner_id, 'owner')
        ON CONFLICT (organization_id, user_id) 
        DO UPDATE SET role = 'owner';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_org_owner_member ON organizations;

CREATE TRIGGER sync_org_owner_member
AFTER INSERT OR UPDATE OF owner_id ON organizations
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_org_owner_member();



-- 9. CATÁLOGO DE ESPÉCIES
-- ==========================================
CREATE TABLE IF NOT EXISTS especies (
    id SERIAL PRIMARY KEY,
    nome_comum VARCHAR(255) NOT NULL,
    nome_cientifico VARCHAR(255) NOT NULL,
    familia VARCHAR(255),
    origem VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_especies_nome_comum ON especies(nome_comum);
CREATE INDEX IF NOT EXISTS idx_especies_nome_cientifico ON especies(nome_cientifico);


-- 10. SEEDING INICIAL DE DADOS GLOBAIS
-- ==========================================

DO $$
DECLARE
    fixed_form_campos JSONB := '[
        {
            "id": "obs",
            "name": "observacoes",
            "label": "Observações/Relatório Detalhado",
            "type": "textarea",
            "required": true,
            "placeholder": "Descreva o escopo da visita e as observações..."
        }
    ]';
BEGIN
    -- Status Globais
    IF NOT EXISTS (SELECT 1 FROM demandas_status WHERE organization_id IS NULL LIMIT 1) THEN
        INSERT INTO demandas_status (organization_id, nome, cor, is_custom, is_default_global) VALUES
        (NULL, 'Pendente', '#FFA500', FALSE, TRUE),
        (NULL, 'Vistoria Agendada', '#1976D2', FALSE, TRUE),
        (NULL, 'Em Rota', '#9c27b0', FALSE, TRUE),
        (NULL, 'Concluído', '#2E7D32', FALSE, TRUE);
    END IF;

    -- Tipos Globais
    IF NOT EXISTS (SELECT 1 FROM demandas_tipos WHERE organization_id IS NULL LIMIT 1) THEN
        INSERT INTO demandas_tipos (organization_id, nome, is_custom, is_default_global) VALUES
        (NULL, 'Avaliação', FALSE, TRUE),
        (NULL, 'Poda', FALSE, TRUE),
        (NULL, 'Supressão', FALSE, TRUE),
        (NULL, 'Fiscalização', FALSE, TRUE);
    END IF;
    
    -- Formulários Globais
    IF NOT EXISTS (SELECT 1 FROM formularios WHERE organization_id IS NULL LIMIT 1) THEN
        INSERT INTO formularios (organization_id, nome, descricao, definicao_campos)
        VALUES (
            NULL, 
            'Relatório Simples (Padrão)', 
            'Formulário fixo e obrigatório para Planos Free e Basic, contendo apenas um campo de observações.', 
            fixed_form_campos 
        );
    END IF;

END $$;