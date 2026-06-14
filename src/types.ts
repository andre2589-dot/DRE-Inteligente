export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  account: string;
  description: string;
  document?: string;
  classification: string; // Category ID
  costType?: 'Fixo' | 'Variável' | 'N/A' | 'MEO';
  value: number; // positive for income, negative for expense

  // Raw columns for 100% spreadsheet fidelity
  vencimento?: string;
  operacao?: string;
  mes?: string;
  conta?: string;
  descricaoConta?: string;
  classificacaoOriginal?: string;
  descricaoOriginal?: string;
  custoOriginal?: string;
  historico?: string;
  documentoOriginal?: string;
  valorOriginal?: number;
}

export interface DreCategory {
  id: string;
  name: string;
  parentId: string | null;
  type: 'incoming' | 'deduction' | 'outgoing' | 'formula';
  formulaRef?: string; // used for custom expressions
  expandable: boolean;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  sector: string;
}

export interface Rule {
  id: string;
  pattern: string;
  targetCategoryId: string;
}

export interface ForecastParams {
  growthRate: number; // percentage, e.g. 10
  expenseGrowthRate: number; // percentage, e.g. 5
  hiringImpact: number; // monthly fixed cost addition
  marketingBoost: number; // percentage growth boost
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface PlanoContasItem {
  id: string; // unique ID
  code: string; // "Conta" - Código único da conta
  name: string; // "Descrição - Conta" - Nome amigável da conta
  classificationId: string; // "Classificação" - Código/Agrupador ID da DRE (ex: opex_marketing, sales_products)
  subCategory: string; // "Descrição" - Subcategoria descritiva livre
  costType: 'Fixo' | 'Variável' | 'N/A' | 'MEO'; // "Custo" (Fixo ou Variável ou N/A ou MEO)
  active?: boolean; // "Ativo" ou "Inativo"
}

export interface AiConversationItem {
  id: string;
  company_id: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
}
