export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  account: string;
  description: string;
  document?: string;
  classification: string; // Category ID
  costType?: 'Fixo' | 'Variável' | 'N/A' | 'MEO';
  value: number; // positive for income, negative for expense
  batchId?: string;
  batchName?: string;
  isManual?: boolean;

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

export interface CategoryGoal {
  categoryId: string;
  month: string; // YYYY-MM
  targetValue: number;
}

export interface MonthConfig {
  month: string;
  totalWorkingDays: number;
  elapsedWorkingDays: number;
}

export interface FormulaFechadaItem {
  id: string;
  company_id?: string;
  codigo_formula: string;    // Código Formulas Fechada
  descricao_formula: string; // Descrição Fórmula Fechada
  codigo_item: string;       // Códido Item
  descricao_item: string;    // Descrição Item
  quantidade: number;        // Quantidade
  unidade: string;           // unidade (strictly g or ml)
  created_at?: string;
}

export interface EquivalenciaSemiAcabadoItem {
  id: string;
  company_id?: string;
  codigo_materia_prima: string;    // Código da Matéria-Prima Original (Fornecedor)
  descricao_materia_prima: string; // Descrição da Matéria-Prima Original
  codigo_semi_acabado: string;     // Código do Semi-Acabado (Processo de transformação / diluição)
  descricao_semi_acabado: string;  // Descrição do Semi-Acabado
  fator_equivalencia: number;      // Fator de Diluição/Proporção (ex: 100 para 1:100, onde 1g semi-acabado = 0.01g do concentrado)
  proporcao_texto: string;         // Ex: "1:100", "1:10", "1:1", "Tratado"
  observacao?: string;
  created_at?: string;
}

