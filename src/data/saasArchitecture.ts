export const ARCHITECTURE_FLUXOGRAM = `
+--------------------------------------------------------------------------+
|                            DRE INTELIGENTE SYSTEM                        |
+--------------------------------------------------------------------------+
                                     |
                                     v
+------------------+       +-------------------+       +-------------------+
|   Client UI      | ----> |  Express Server   | ----> |   Google Gemini   |
|   (React 19,     | <---- |  (Vite Proxy,     | <---- |   3.5-flash AI    |
|   Tailwind v4)   |       |  REST Endpoints)  |       |   Financial Bot   |
+------------------+       +-------------------+       +-------------------+
       |                             |
       v                             v
+------------------+       +-------------------+
|  File Upload     |       |   Supabase / PG   |
|  (XLSX / CSV     |       |   Database (SQL)  |
|  Local Engine)   |       |   w/ RLS Security |
+------------------+       +-------------------+
`;

export const ARCHITECTURE_MARKDOWN = `### 🏢 Arquitetura DRE Inteligente SaaS
O **DRE Inteligente** é desenhado sob os mais rígidos preceitos de arquitetura full-stack corporativa, focando em escalabilidade, segurança e IA de alta performance financeira.

#### 🏗️ Pilares Corporativos
1. **Frontend (SPA com Alta Densidade Visual)**: Interface baseada em React e Tailwind CSS v4, proporcionando transições nativas super fluidas com \`motion\` e renderização de dados interativos em tempo de execução sem flickering.
2. **Backend Services & Proxy Server (Express & ESM)**: Camada que expõe o middleware de desenvolvimento do Vite e encapsula com as devidas chaves de API secretas os serviços cognitivos do Google Gemini AI, garantindo que nenhum segredo atinja os navegadores dos usuários finais.
3. **Persistência de Dados & Infraestrutura Serverless (PostgreSQL & Supabase)**: Banco de dados relacional hospedado na arquitetura do Supabase para garantir integridade referencial nas consolidações complexas de lançamentos financeiros, regido por políticas estritas de segurança em nível de linha (Row Level Security - RLS).
4. **Mecanismo de Inteligência Artificial Financeira**: Conector com o SDK avançado \`@google/genai\` atuando no modelo \`gemini-3.5-flash\` para fornecer diagnósticos em tempo real baseados nas transações ativas e parâmetros de forecast da DRE.

#### 🔐 Segurança da Informação & RLS
- Toda e qualquer tabela possui \`Row Level Security (RLS)\` ativo.
- Usuários apenas visualizam registros cuja empresa associada esteja vinculada ao seu respectivo perfil (\`tenant_id\` multiempresa de isolamento triplo).
- O backend de IA utiliza um perfil analítico de somente leitura para emitir pareceres confiáveis baseados unicamente em fatos consumados históricos.
`;

export const DATABASE_SCHEMA_SQL = `-- ==========================================
-- DRE INTELIGENTE - BLUEPRINT DE POSTGRESQL & SUPABASE
-- ==========================================

-- 1. Habilitar UUID-OSSP para identificadores seguros
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Usuário (Integrado com Supabase Auth)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'Analista' CHECK (role IN ('Administrador', 'Gestor Financeiro', 'Analista', 'Visualizador')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Empresas (Multi-Empresa)
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    sector VARCHAR(100),
    owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Vinculação Usuário-Empresa (Acesso Compartilhado)
CREATE TABLE public.company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) NOT NULL, -- Pode ser herdada ou específica por empresa
    UNIQUE(company_id, user_id)
);

-- 5. Categorias Dinâmicas da DRE (Árvore Hierárquica Expandível)
CREATE TABLE public.dre_categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(100) REFERENCES public.dre_categories(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('incoming', 'deduction', 'outgoing', 'formula')),
    formula_ref VARCHAR(255),
    expandable BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0
);

-- 6. Transações Financeiras (Lançamentos Importados de CSV / Excel)
CREATE TABLE public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    account VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    document VARCHAR(100),
    classification VARCHAR(100) REFERENCES public.dre_categories(id) NOT NULL,
    cost_type VARCHAR(50) DEFAULT 'N/A' CHECK (cost_type IN ('Fixo', 'Variável', 'N/A')),
    value DECIMAL(15, 2) NOT NULL, -- Valores positivos: Receita, Valores negativos: Despesas/Custos
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Regras do Plano de Contas e Inteligência de Mapeamento Automático
CREATE TABLE public.dre_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    pattern VARCHAR(255) NOT NULL, -- Palavra-chave ou Expressão para identificar na importação
    target_category_id VARCHAR(100) REFERENCES public.dre_categories(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Projeções e Parâmetros de Forecast Salvados
CREATE TABLE public.forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    growth_rate DECIMAL(5, 2) NOT NULL,
    expense_ratio DECIMAL(5, 2) NOT NULL,
    hiring_impact DECIMAL(15, 2) DEFAULT 0,
    marketing_boost DECIMAL(5, 2) DEFAULT 0,
    months_horizon INT DEFAULT 12,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Logs de Auditoria para Conformidade Regulatória (LGPD/Financeiro)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id),
    user_id UUID REFERENCES public.users(id),
    action VARCHAR(100) NOT NULL,
    notes TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
`;

export const RLS_POLICIES_SQL = `-- ==========================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Habilitar RLS em todas as tabelas críticas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dre_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para a tabela de Empresas
CREATE POLICY "Users can view companies they belong to"
ON public.companies
FOR SELECT
USING (
    id IN (
        SELECT company_id 
        FROM public.company_users 
        WHERE user_id = auth.uid()
    ) OR owner_id = auth.uid()
);

CREATE POLICY "Owners can edit their companies"
ON public.companies
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 2. Políticas para a tabela de Transações (Isolamento Financeiro)
CREATE POLICY "Users can CRUD transactions of their active companies"
ON public.financial_transactions
FOR ALL
USING (
    company_id IN (
        SELECT company_id 
        FROM public.company_users 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    company_id IN (
        SELECT company_id 
        FROM public.company_users 
        WHERE user_id = auth.uid()
    )
);

-- 3. Políticas para Regras do Plano de Contas
CREATE POLICY "Users can manage rules for their companies"
ON public.dre_rules
FOR ALL
USING (
    company_id IN (
        SELECT company_id 
        FROM public.company_users 
        WHERE user_id = auth.uid()
    )
);

-- 4. Políticas para Projeções Futuras (Forecasts)
CREATE POLICY "Users can select and write forecasts"
ON public.forecasts
FOR ALL
USING (
    company_id IN (
        SELECT company_id 
        FROM public.company_users 
        WHERE user_id = auth.uid()
    )
);
`;

export const ROADMAP_MVP = [
  { item: "Setup da estrutura e banco PostgreSQL com Supabase Auth", status: "Concluído" },
  { item: "Hierarquia estrita da DRE em árvore interativa com recolhimento", status: "Concluído" },
  { item: "Importador inteligente local com suporte para XLSX (Excel) e CSV", status: "Concluído" },
  { item: "Simulador de Projeções (Forecast de 12, 24 e 36 meses)", status: "Concluído" },
  { item: "Dashboard com indicadores de margens (EBITDA, Margem Bruta, etc.)", status: "Concluído" },
  { item: "Assistente Financeiro de IA com Google Gemini integrado aos dados reais", status: "Concluído" },
  { item: "Isolamento multi-empresa simulado e Blueprint RLS", status: "Concluído" }
];

export const ROADMAP_V2 = [
  { item: "Integração via Open Finance com APIs dos principais bancos (Itaú, Bradesco, PJBank)", status: "Próximo Ciclo" },
  { item: "Automatização de regras de classificação via IA rodando em background (Cron Job)", status: "Planejado" },
  { item: "Permissões granulares de usuários adicionais (Gestor, Analista, Visualizador)", status: "Fase de Design" },
  { item: "Exportador de PDFs assinados e certificados com layout oficial auditável", status: "Planejado" }
];

export const ROADMAP_V3 = [
  { item: "Cálculo inteligente e preditivo de Valuation de M&A baseado em múltiplos de EBITDA", status: "Futuro" },
  { item: "Benchmarking setorial anônimo alimentado por Big Data corporativo", status: "Futuro" },
  { item: "Detecção de anomalias tributárias e inconsistências fiscais em notas emitidas", status: "Futuro" }
];
