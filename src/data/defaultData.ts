import { Company, DreCategory, Transaction, Rule, PlanoContasItem } from '../types';

export const DEFAULT_COMPANIES: Company[] = [
  { id: 'c1', name: 'TechVibe Soluções Digitais Ltda', cnpj: '34.567.890/0001-21', sector: 'Tecnologia & SaaS' },
  { id: 'c2', name: 'Mercado do Sabor Alimentos', cnpj: '12.345.678/0001-99', sector: 'Varejo & Distribuição' }
];

export const DRE_CATEGORIES: DreCategory[] = [
  // Total Sales Group
  { id: 'total_sales', name: 'Vendas Totais', parentId: null, type: 'formula', formulaRef: 'sales_products + sales_services', expandable: true },
  { id: 'sales_products', name: 'Vendas de Produtos', parentId: 'total_sales', type: 'incoming', expandable: false },
  { id: 'sales_services', name: 'Prestação de Serviços', parentId: 'total_sales', type: 'incoming', expandable: false },

  // Deductions Group
  { id: 'deductions', name: '(-) Deduções e Impostos S/ Vendas', parentId: null, type: 'formula', formulaRef: 'deduction_icms + deduction_pis + deduction_cofins + deduction_iss', expandable: true },
  { id: 'deduction_icms', name: 'ICMS S/ Vendas', parentId: 'deductions', type: 'deduction', expandable: false },
  { id: 'deduction_pis', name: 'PIS S/ Faturamento', parentId: 'deductions', type: 'deduction', expandable: false },
  { id: 'deduction_cofins', name: 'COFINS S/ Faturamento', parentId: 'deductions', type: 'deduction', expandable: false },
  { id: 'deduction_iss', name: 'ISS S/ Serviços', parentId: 'deductions', type: 'deduction', expandable: false },

  // Net Revenue
  { id: 'net_revenue', name: '(=) Receita Líquida', parentId: null, type: 'formula', formulaRef: 'total_sales - deductions', expandable: false },

  // Costs
  { id: 'costs', name: '(-) Custos dos Bens e Serviços (COGS)', parentId: null, type: 'formula', formulaRef: 'costs_materials + costs_resell + costs_production', expandable: true },
  { id: 'costs_materials', name: 'Insumos e Matérias-Primas', parentId: 'costs', type: 'outgoing', expandable: false },
  { id: 'costs_resell', name: 'Mercadorias para Revenda', parentId: 'costs', type: 'outgoing', expandable: false },
  { id: 'costs_production', name: 'Custos Diretos de Produção', parentId: 'costs', type: 'outgoing', expandable: false },

  // Gross profit
  { id: 'gross_profit', name: '(=) Resultado Bruto', parentId: null, type: 'formula', formulaRef: 'net_revenue - costs', expandable: false },

  // Operating Expenses
  { id: 'operating_expenses', name: '(-) Despesas Operacionais (OPEX)', parentId: null, type: 'formula', formulaRef: 'opex_people + opex_marketing + opex_systems + opex_contractors + opex_maintenance + opex_admin', expandable: true },
  { id: 'opex_people', name: 'Pessoal (Salários, Benefícios e Encargos)', parentId: 'operating_expenses', type: 'outgoing', expandable: false },
  { id: 'opex_marketing', name: 'Marketing & Comercial', parentId: 'operating_expenses', type: 'outgoing', expandable: false },
  { id: 'opex_systems', name: 'Sistemas & Cloud (SaaS, Servidores)', parentId: 'operating_expenses', type: 'outgoing', expandable: false },
  { id: 'opex_contractors', name: 'Prestadores de Serviço & Consultoria', parentId: 'operating_expenses', type: 'outgoing', expandable: false },
  { id: 'opex_maintenance', name: 'Manutenção, Sedes & Infra', parentId: 'operating_expenses', type: 'outgoing', expandable: false },
  { id: 'opex_admin', name: 'Despesas Administrativas & Taxas', parentId: 'operating_expenses', type: 'outgoing', expandable: false },

  // EBITDA
  { id: 'ebitda', name: '(=) EBITDA', parentId: null, type: 'formula', formulaRef: 'gross_profit - operating_expenses', expandable: false },

  // Taxes on Profit
  { id: 'profit_taxes', name: '(-) Impostos sobre Lucro', parentId: null, type: 'formula', formulaRef: 'tax_irpj + tax_csll', expandable: true },
  { id: 'tax_irpj', name: 'IRPJ S/ Lucro', parentId: 'profit_taxes', type: 'outgoing', expandable: false },
  { id: 'tax_csll', name: 'CSLL S/ Lucro', parentId: 'profit_taxes', type: 'outgoing', expandable: false },

  // Net Profit
  { id: 'net_income', name: '(=) Resultado Líquido do Exercício', parentId: null, type: 'formula', formulaRef: 'ebitda - profit_taxes', expandable: false }
];

export const DEFAULT_RULES: Rule[] = [
  { id: 'r1', pattern: 'Google Ads', targetCategoryId: 'opex_marketing' },
  { id: 'r2', pattern: 'Facebook Ads', targetCategoryId: 'opex_marketing' },
  { id: 'r3', pattern: 'Instagram Ads', targetCategoryId: 'opex_marketing' },
  { id: 'r4', pattern: 'Contador', targetCategoryId: 'opex_contractors' },
  { id: 'r5', pattern: 'Honorários Advocatícios', targetCategoryId: 'opex_contractors' },
  { id: 'r6', pattern: 'AWS Cloud', targetCategoryId: 'opex_systems' },
  { id: 'r7', pattern: 'Slack Technologies', targetCategoryId: 'opex_systems' },
  { id: 'r8', pattern: 'Aluguel do Escritório', targetCategoryId: 'opex_maintenance' },
  { id: 'r9', pattern: 'Salário Funcionários', targetCategoryId: 'opex_people' },
  { id: 'r10', pattern: 'Dedução Receita ISS', targetCategoryId: 'deduction_iss' },
  { id: 'r11', pattern: 'Dedução ICMS', targetCategoryId: 'deduction_icms' },
  { id: 'r12', pattern: 'Insumo Produção', targetCategoryId: 'costs_materials' },
  { id: 'r13', pattern: 'Compra de Estoque', targetCategoryId: 'costs_resell' },
  { id: 'r14', pattern: 'Venda de Licenças', targetCategoryId: 'sales_products' },
  { id: 'r15', pattern: 'Mensalidade SaaS', targetCategoryId: 'sales_services' },
  { id: 'r16', pattern: 'Consultoria Mensal', targetCategoryId: 'sales_services' }
];

export const DEFAULT_TRANSACTIONS: { [companyId: string]: Transaction[] } = {
  c1: [],
  c2: []
};

export const DEFAULT_PLANO_CONTAS: PlanoContasItem[] = [
  { id: 'pc1', code: '10101', name: 'FATURAMENTO PRODUTOS', classificationId: 'sales_products', subCategory: 'Venda de Produtos', costType: 'N/A', active: true },
  { id: 'pc2', code: '10102', name: 'FATURAMENTO SERVIÇOS', classificationId: 'sales_services', subCategory: 'Prestação de Serviços', costType: 'N/A', active: true },
  { id: 'pc3', code: '20101', name: 'RECOLHIMENTO ICMS', classificationId: 'deduction_icms', subCategory: 'ICMS S/ Vendas', costType: 'Variável', active: true },
  { id: 'pc4', code: '20102', name: 'RECOLHIMENTO PIS', classificationId: 'deduction_pis', subCategory: 'PIS S/ Faturamento', costType: 'Variável', active: true },
  { id: 'pc5', code: '20103', name: 'RECOLHIMENTO COFINS', classificationId: 'deduction_cofins', subCategory: 'COFINS S/ Faturamento', costType: 'Variável', active: true },
  { id: 'pc6', code: '20104', name: 'RECOLHIMENTO ISS', classificationId: 'deduction_iss', subCategory: 'ISS S/ Serviços', costType: 'Variável', active: true },
  { id: 'pc7', code: '30101', name: 'COMPRA MATERIA-PRIMA', classificationId: 'costs_materials', subCategory: 'Insumos e Matérias-Primas', costType: 'Variável', active: true },
  { id: 'pc8', code: '30102', name: 'MERCADORIAS REVENDA', classificationId: 'costs_resell', subCategory: 'Mercadorias para Revenda', costType: 'Variável', active: true },
  { id: 'pc9', code: '30103', name: 'CUSTOS PRODUÇÃO DIRETO', classificationId: 'costs_production', subCategory: 'Custos Diretos de Produção', costType: 'Variável', active: true },
  { id: 'pc10', code: '40101', name: 'AWS SERVIDORES CLOUD', classificationId: 'opex_systems', subCategory: 'Sistemas & Cloud (SaaS, Servidores)', costType: 'Fixo', active: true },
  { id: 'pc11', code: '40102', name: 'GOOGLE ADS CAMPANHAS', classificationId: 'opex_marketing', subCategory: 'Marketing & Comercial', costType: 'Variável', active: true },
  { id: 'pc12', code: '40103', name: 'FACEBOOK INSTAGRAM ADS', classificationId: 'opex_marketing', subCategory: 'Marketing & Comercial', costType: 'Variável', active: true },
  { id: 'pc13', code: '40104', name: 'ALUGUEL ESCRITORIO', classificationId: 'opex_maintenance', subCategory: 'Manutenção, Sedes & Infra', costType: 'Fixo', active: true },
  { id: 'pc14', code: '40105', name: 'FOLHA DE EXECUTIVOS E ENGENHARIA', classificationId: 'opex_people', subCategory: 'Pessoal (Salários, Benefícios e Encargos)', costType: 'Fixo', active: true },
  { id: 'pc15', code: '40106', name: 'BENEFICIOS SODEXO VALE', classificationId: 'opex_people', subCategory: 'Pessoal (Salários, Benefícios e Encargos)', costType: 'Fixo', active: true },
  { id: 'pc16', code: '40107', name: 'ASSESSORIA CONTABIL HONORARIOS', classificationId: 'opex_contractors', subCategory: 'Prestadores de Serviço & Consultoria', costType: 'Fixo', active: true },
  { id: 'pc17', code: '40108', name: 'ASSESSORIA JURIDICA HONORARIOS', classificationId: 'opex_contractors', subCategory: 'Prestadores de Serviço & Consultoria', costType: 'Fixo', active: true },
  { id: 'pc18', code: '40109', name: 'DESPESAS ADMINISTRATIVAS E CORREIOS', classificationId: 'opex_admin', subCategory: 'Despesas Administrativas & Taxas', costType: 'Fixo', active: true },
  { id: 'pc19', code: '40110', name: 'ENERGIA ELETRICA ENEL', classificationId: 'opex_maintenance', subCategory: 'Manutenção, Sedes & Infra', costType: 'Fixo', active: true },
  { id: 'pc20', code: '40201', name: 'SERVICES HEROKU HOSTING', classificationId: 'opex_systems', subCategory: 'Sistemas & Cloud (SaaS, Servidores)', costType: 'Fixo', active: true },
  { id: 'pc21', code: '50101', name: 'IMPOSTO IRPJ', classificationId: 'tax_irpj', subCategory: 'IRPJ S/ Lucro', costType: 'Variável', active: true },
  { id: 'pc22', code: '50102', name: 'IMPOSTO CSLL', classificationId: 'tax_csll', subCategory: 'CSLL S/ Lucro', costType: 'Variável', active: true }
];

