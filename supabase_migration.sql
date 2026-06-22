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

-- 6. CRIAR TABELA DE CONTATOS DE FORNECEDORES NO WHATSAPP
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    representative VARCHAR(255),
    phone VARCHAR(30) NOT NULL,
    description TEXT,
    category VARCHAR(150),
    initials VARCHAR(10),
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. CRIAR TABELA DE CONVERSAS DE FORNECEDORES NO WHATSAPP
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id VARCHAR(100) PRIMARY KEY REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
    contact_id VARCHAR(100) REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    unread_count INT DEFAULT 0 NOT NULL,
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. CRIAR TABELA DE MENSAGENS INDIVIDUAIS DO WHATSAPP
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id VARCHAR(100) PRIMARY KEY,
    conversation_id VARCHAR(100) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
    sender VARCHAR(50) CHECK (sender IN ('me', 'supplier')) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('sent', 'delivered', 'read')) DEFAULT 'sent' NOT NULL,
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR RLS (Row Level Security) - OPCIONAL PARA AMBIENTES DE PRODUÇÃO
-- ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;


-- ==============================================================
-- 9. COMPRA INTELIGENTE - ESTRUTURAS ADICIONAIS DE SUPRIMENTOS
-- ==============================================================

-- 9.1 TABELA DE SALDO DE ESTOQUE (Itens de Estoque Físico)
CREATE TABLE IF NOT EXISTS public.procurement_inventory (
    id VARCHAR(100) PRIMARY KEY,
    codigo VARCHAR(50),
    item VARCHAR(255) NOT NULL,
    unidade VARCHAR(50) DEFAULT 'unidades',
    quantidade DECIMAL(15, 3) DEFAULT 0 NOT NULL,
    lote VARCHAR(100),
    situacao_lote VARCHAR(50) DEFAULT 'LIBERADO', -- 'LIBERADO', 'BLOQUEADO', 'CERTIFICACAO'
    custo_unitario DECIMAL(15, 2) DEFAULT 0 NOT NULL,
    preco_venda DECIMAL(15, 2) DEFAULT 0 NOT NULL,
    min_stock DECIMAL(15, 3) DEFAULT 0 NOT NULL,
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9.2 TABELA DE CONSUMO HISTÓRICO DE INSUMOS
CREATE TABLE IF NOT EXISTS public.procurement_consumption (
    id VARCHAR(100) PRIMARY KEY,
    item VARCHAR(255) NOT NULL,
    mes_ano VARCHAR(20) NOT NULL, -- Formato '06/2026'
    quantidade_consumida DECIMAL(15, 3) DEFAULT 0 NOT NULL,
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9.3 TABELA DE HISTÓRICO DE COMPRAS E PREÇOS EFETIVOS (Preço de faturamento pago)
CREATE TABLE IF NOT EXISTS public.procurement_price_history (
    id VARCHAR(100) PRIMARY KEY,
    item VARCHAR(255) NOT NULL,
    fornecedor VARCHAR(255),
    preco_unitario DECIMAL(15, 2) DEFAULT 0 NOT NULL,
    data_compra DATE DEFAULT CURRENT_DATE NOT NULL,
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9.4 TABELA DE VALIDADE E RASTREABILIDADE DE LOTES CRÍTICOS
CREATE TABLE IF NOT EXISTS public.procurement_batch_validity (
    id VARCHAR(100) PRIMARY KEY,
    item VARCHAR(255) NOT NULL,
    lote VARCHAR(100),
    quantidade DECIMAL(15, 3) DEFAULT 0 NOT NULL,
    validade DATE NOT NULL,
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9.5 TABELA DE COTAÇÕES E INTEGRABILIDADE DE SUPRIMENTOS
CREATE TABLE IF NOT EXISTS public.procurement_quotes (
    id VARCHAR(100) PRIMARY KEY,
    item VARCHAR(255) NOT NULL,
    quantidade DECIMAL(15, 3) DEFAULT 0 NOT NULL,
    fornecedor VARCHAR(255),
    preco_cotado DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'Pendente' NOT NULL, -- 'Pendente', 'Enviado', 'Aprovado', 'Rejeitado'
    link_whatsapp TEXT,
    company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- OPÇÃO PARA ATIVAR RLS NAS NOVAS TABELAS DE SUPRIMENTOS (OPCIONAL)
-- ALTER TABLE public.procurement_inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.procurement_consumption ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.procurement_price_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.procurement_batch_validity ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.procurement_quotes ENABLE ROW LEVEL SECURITY;

