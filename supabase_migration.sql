-- ==============================================================
-- DRE INTELIGENTE - ESTRUTURA REAL DE BANCO DE DADOS (SUPABASE)
-- CREATE SCHEMAS & TABLES FOR REAL PERSISTENCE & INTEGRATION
-- ==============================================================

-- 0. Limpeza prévia (Opcional, use apenas se quiser recriar tudo)
-- DROP TABLE IF EXISTS public.uploaded_files CASCADE;
-- DROP TABLE IF EXISTS public.ai_conversations CASCADE;
-- DROP TABLE IF EXISTS public.transactions CASCADE;
-- DROP TABLE IF EXISTS public.plano_contas CASCADE;
-- DROP TABLE IF EXISTS public.companies CASCADE;

-- 1. CRIAR TABELA DE EMPRESAS (Multi-Tenant)
CREATE TABLE IF NOT EXISTS public.companies (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    sector VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CRIAR TABELA DE PLANO DE CONTAS (Classificações de Despesas/Receitas)
CREATE TABLE IF NOT EXISTS public.plano_contas (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    classification_id VARCHAR(100),
    sub_category VARCHAR(150),
    cost_type VARCHAR(50) CHECK (cost_type IN ('Fixo', 'Variável', 'MEO', 'N/A')),
    active BOOLEAN DEFAULT TRUE,
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. CRIAR TABELA DE TRANSAÇÕES FINANCEIRAS (Receitas e Despesas consolidadas)
CREATE TABLE IF NOT EXISTS public.transactions (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    account VARCHAR(255) NOT NULL,
    description TEXT,
    document VARCHAR(100),
    classification VARCHAR(100),
    cost_type VARCHAR(50) DEFAULT 'Fixo' CHECK (cost_type IN ('Fixo', 'Variável', 'MEO', 'N/A')),
    value DECIMAL(15, 2) NOT NULL,
    vencimento DATE,
    operacao VARCHAR(50) NOT NULL, -- 'Receita' ou 'Despesa'
    mes VARCHAR(20),
    conta VARCHAR(50),
    descricao_conta VARCHAR(255),
    classificacao_original VARCHAR(100),
    descricao_original TEXT,
    custo_original VARCHAR(50),
    historico TEXT,
    documento_original VARCHAR(100),
    valor_original DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. CRIAR TABELA DE HISTÓRICO DE CONVERSAS COM IA
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id VARCHAR(100),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. CRIAR TABELA DE METADADOS DE ATIVIDADE DE ARQUIVOS UPADOS
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_size INT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR RLS (Row Level Security) - OPCIONAL PARA AMBIENTES DE PRODUÇÃO
-- ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
