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
  c1: [
    // January 2026
    { id: 't1_1', date: '2026-01-05', account: 'Stripe Gateway', description: 'Assinaturas SaaS Plano Enterprise', value: 145000, classification: 'sales_products', costType: 'N/A' },
    { id: 't1_2', date: '2026-01-10', account: 'Banco Itaú', description: 'Faturamento Consultoria de Implantação', value: 45000, classification: 'sales_services', costType: 'N/A' },
    { id: 't1_3', date: '2026-01-12', account: 'Prefeitura de SP', description: 'Retenção ISS S/ Serviços SP', value: -2250, classification: 'deduction_iss', costType: 'Variável' },
    { id: 't1_4', date: '2026-01-12', account: 'Receita Federal', description: 'PIS S/ Faturamento do mês anterior', value: -1235, classification: 'deduction_pis', costType: 'Variável' },
    { id: 't1_5', date: '2026-01-12', account: 'Receita Federal', description: 'COFINS S/ Faturamento do mês anterior', value: -5690, classification: 'deduction_cofins', costType: 'Variável' },
    { id: 't1_6', date: '2026-01-15', account: 'AWS Cloud Services', description: 'Hospedagem Infraestrutura Kubernetes', value: -32000, classification: 'opex_systems', costType: 'Fixo' },
    { id: 't1_7', date: '2026-01-15', account: 'Google Ireland', description: 'Google Ads Campanha Lead acquisition', value: -18000, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't1_8', date: '2026-01-15', account: 'Facebook Ads', description: 'Instagram Ads Campanha Tráfego', value: -12500, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't1_19', date: '2026-01-18', account: 'Enel Energia Distribuidora', description: 'Conta de Energia do Escritório Central', value: -4500, classification: 'opex_maintenance', costType: 'Fixo' },
    { id: 't1_9', date: '2026-01-20', account: 'Imobiliária Nobre', description: 'Aluguel do Escritório Central SP', value: -15000, classification: 'opex_maintenance', costType: 'Fixo' },
    { id: 't1_10', date: '2026-01-25', account: 'Folha de Pagamentos Itaú', description: 'Salários Engenheiros e Designers', value: -68000, classification: 'opex_people', costType: 'Fixo' },
    { id: 't1_11', date: '2026-01-25', account: 'Sodexo Pass', description: 'Vale Refeição e Alimentação CLT', value: -7500, classification: 'opex_people', costType: 'Fixo' },
    { id: 't1_12', date: '2026-01-28', account: 'Contadores Associados', description: 'Honorários de Assessoria Contábil', value: -3200, classification: 'opex_contractors', costType: 'Fixo' },
    { id: 't1_13', date: '2026-01-28', account: 'Advogados Reunidos', description: 'Assessoria jurídica mensal', value: -5000, classification: 'opex_contractors', costType: 'Fixo' },
    { id: 't1_14', date: '2026-01-28', account: 'Correios', description: 'Envio de documentos físicos e sedex', value: -450, classification: 'opex_admin', costType: 'Fixo' },
    { id: 't1_15', date: '2026-01-30', account: 'Heroku Services', description: 'Databases de staging e testes', value: -1800, classification: 'opex_systems', costType: 'Fixo' },
    { id: 't1_16', date: '2026-01-30', account: 'Receita Federal', description: 'Provisão IRPJ trimestral incidente', value: -2500, classification: 'tax_irpj', costType: 'Variável' },
    { id: 't1_17', date: '2026-01-30', account: 'Receita Federal', description: 'CSLL Provisão trimestral', value: -1450, classification: 'tax_csll', costType: 'Variável' },
    { id: 't1_18', date: '2026-01-31', account: 'Mauri Fretes', description: 'Logística interna de equipamentos', value: -1200, classification: 'costs_production', costType: 'Variável' },

    // February 2026
    { id: 't2_1', date: '2026-02-05', account: 'Stripe Gateway', description: 'Assinaturas SaaS Plano Enterprise', value: 154000, classification: 'sales_products', costType: 'N/A' },
    { id: 't2_2', date: '2026-02-10', account: 'Banco Itaú', description: 'Faturamento Consultoria de Implantação', value: 48000, classification: 'sales_services', costType: 'N/A' },
    { id: 't2_3', date: '2026-02-12', account: 'Prefeitura de SP', description: 'Retenção ISS S/ Serviços SP', value: -2400, classification: 'deduction_iss', costType: 'Variável' },
    { id: 't2_4', date: '2026-02-12', account: 'Receita Federal', description: 'PIS S/ Faturamento do mês anterior', value: -1300, classification: 'deduction_pis', costType: 'Variável' },
    { id: 't2_5', date: '2026-02-12', account: 'Receita Federal', description: 'COFINS S/ Faturamento do mês anterior', value: -6000, classification: 'deduction_cofins', costType: 'Variável' },
    { id: 't2_6', date: '2026-02-15', account: 'AWS Cloud Services', description: 'Hospedagem Infraestrutura Kubernetes', value: -33200, classification: 'opex_systems', costType: 'Fixo' },
    { id: 't2_7', date: '2026-02-15', account: 'Google Ireland', description: 'Google Ads Campanha Lead acquisition', value: -21000, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't2_8', date: '2026-02-15', account: 'Facebook Ads', description: 'Instagram Ads Campanha Tráfego', value: -14000, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't2_9', date: '2026-02-20', account: 'Imobiliária Nobre', description: 'Aluguel do Escritório Central SP', value: -15000, classification: 'opex_maintenance', costType: 'Fixo' },
    { id: 't2_10', date: '2026-02-25', account: 'Folha de Pagamentos Itaú', description: 'Salários Engenheiros e Designers', value: -68000, classification: 'opex_people', costType: 'Fixo' },
    { id: 't2_11', date: '2026-02-25', account: 'Sodexo Pass', description: 'Vale Refeição e Alimentação CLT', value: -7500, classification: 'opex_people', costType: 'Fixo' },
    { id: 't2_12', date: '2026-02-28', account: 'Contadores Associados', description: 'Honorários de Assessoria Contábil', value: -3200, classification: 'opex_contractors', costType: 'Fixo' },
    { id: 't2_13', date: '2026-02-28', account: 'Receita Federal', description: 'Provisão IRPJ trimestral incidente', value: -2800, classification: 'tax_irpj', costType: 'Variável' },
    { id: 't2_14', date: '2026-02-28', account: 'Receita Federal', description: 'CSLL Provisão trimestral', value: -1600, classification: 'tax_csll', costType: 'Variável' },

    // March 2026
    { id: 't3_1', date: '2026-03-05', account: 'Stripe Gateway', description: 'Assinaturas SaaS Plano Enterprise', value: 168000, classification: 'sales_products', costType: 'N/A' },
    { id: 't3_2', date: '2026-03-10', account: 'Banco Itaú', description: 'Faturamento Consultoria de Implantação', value: 52000, classification: 'sales_services', costType: 'N/A' },
    { id: 't3_3', date: '2026-03-12', account: 'Prefeitura de SP', description: 'Retenção ISS S/ Serviços SP', value: -2600, classification: 'deduction_iss', costType: 'Variável' },
    { id: 't3_4', date: '2026-03-12', account: 'Receita Federal', description: 'PIS S/ Faturamento do mês anterior', value: -1450, classification: 'deduction_pis', costType: 'Variável' },
    { id: 't3_5', date: '2026-03-12', account: 'Receita Federal', description: 'COFINS S/ Faturamento do mês anterior', value: -6700, classification: 'deduction_cofins', costType: 'Variável' },
    { id: 't3_6', date: '2026-03-15', account: 'AWS Cloud Services', description: 'Hospedagem Infraestrutura Kubernetes', value: -32000, classification: 'opex_systems', costType: 'Fixo' },
    { id: 't3_7', date: '2026-03-15', account: 'Google Ireland', description: 'Google Ads Campanha Lead acquisition', value: -26000, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't3_8', date: '2026-03-15', account: 'Facebook Ads', description: 'Instagram Ads Campanha Tráfego', value: -18000, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't3_9', date: '2026-03-20', account: 'Imobiliária Nobre', description: 'Aluguel do Escritório Central SP', value: -15000, classification: 'opex_maintenance', costType: 'Fixo' },
    { id: 't3_10', date: '2026-03-25', account: 'Folha de Pagamentos Itaú', description: 'Salários Engenheiros e Designers + 1 Contratação', value: -78000, classification: 'opex_people', costType: 'Fixo' },
    { id: 't3_11', date: '2026-03-25', account: 'Sodexo Pass', description: 'Vale Refeição e Alimentação CLT', value: -8500, classification: 'opex_people', costType: 'Fixo' },
    { id: 't3_12', date: '2026-03-28', account: 'Contadores Associados', description: 'Honorários de Assessoria Contábil', value: -3200, classification: 'opex_contractors', costType: 'Fixo' },
    { id: 't3_13', date: '2026-03-28', account: 'Receita Federal', description: 'Provisão IRPJ trimestral incidente', value: -3200, classification: 'tax_irpj', costType: 'Variável' },
    { id: 't3_14', date: '2026-03-28', account: 'Receita Federal', description: 'CSLL Provisão trimestral', value: -1900, classification: 'tax_csll', costType: 'Variável' },

    // April 2026
    { id: 't4_1', date: '2026-04-05', account: 'Stripe Gateway', description: 'Assinaturas SaaS Plano Enterprise', value: 182000, classification: 'sales_products', costType: 'N/A' },
    { id: 't4_2', date: '2026-04-10', account: 'Banco Itaú', description: 'Faturamento Consultoria de Implantação', value: 39000, classification: 'sales_services', costType: 'N/A' },
    { id: 't4_3', date: '2026-04-12', account: 'Prefeitura de SP', description: 'Retenção ISS S/ Serviços SP', value: -1950, classification: 'deduction_iss', costType: 'Variável' },
    { id: 't4_4', date: '2026-04-12', account: 'Receita Federal', description: 'PIS S/ Faturamento do mês anterior', value: -1500, classification: 'deduction_pis', costType: 'Variável' },
    { id: 't4_5', date: '2026-04-12', account: 'Receita Federal', description: 'COFINS S/ Faturamento do mês anterior', value: -7000, classification: 'deduction_cofins', costType: 'Variável' },
    { id: 't4_6', date: '2026-04-15', account: 'AWS Cloud Services', description: 'Hospedagem Infraestrutura Kubernetes', value: -31000, classification: 'opex_systems', costType: 'Fixo' },
    { id: 't4_7', date: '2026-04-15', account: 'Google Ireland', description: 'Google Ads Campanha Lead acquisition - Orçamento aumentado!', value: -42000, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't4_8', date: '2026-04-15', account: 'Facebook Ads', description: 'Instagram Ads Campanha Tráfego - Orçamento aumentado!', value: -28000, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't4_9', date: '2026-04-20', account: 'Imobiliária Nobre', description: 'Aluguel do Escritório Central SP', value: -15000, classification: 'opex_maintenance', costType: 'Fixo' },
    { id: 't4_10', date: '2026-04-25', account: 'Folha de Pagamentos Itaú', description: 'Salários Engenheiros e Designers', value: -78000, classification: 'opex_people', costType: 'Fixo' },
    { id: 't4_11', date: '2026-04-25', account: 'Sodexo Pass', description: 'Vale Refeição e Alimentação CLT', value: -8500, classification: 'opex_people', costType: 'Fixo' },
    { id: 't4_12', date: '2026-04-28', account: 'Contadores Associados', description: 'Honorários de Assessoria Contábil', value: -3200, classification: 'opex_contractors', costType: 'Fixo' },
    { id: 't4_13', date: '2026-04-28', account: 'Receita Federal', description: 'Provisão IRPJ trimestral incidente', value: -1800, classification: 'tax_irpj', costType: 'Variável' },
    { id: 't4_14', date: '2026-04-28', account: 'Receita Federal', description: 'CSLL Provisão trimestral', value: -1100, classification: 'tax_csll', costType: 'Variável' },

    // May 2026 (Lucro caiu devido ao aumento drástico em Ads sem o correspondente retorno de vendas imediato!)
    { id: 't5_1', date: '2026-05-05', account: 'Stripe Gateway', description: 'Assinaturas SaaS Plano Enterprise', value: 185000, classification: 'sales_products', costType: 'N/A' },
    { id: 't5_2', date: '2026-05-10', account: 'Banco Itaú', description: 'Faturamento Consultoria de Implantação', value: 41000, classification: 'sales_services', costType: 'N/A' },
    { id: 't5_3', date: '2026-05-12', account: 'Prefeitura de SP', description: 'Retenção ISS S/ Serviços SP', value: -2050, classification: 'deduction_iss', costType: 'Variável' },
    { id: 't5_4', date: '2026-05-12', account: 'Receita Federal', description: 'PIS S/ Faturamento do mês anterior', value: -1550, classification: 'deduction_pis', costType: 'Variável' },
    { id: 't5_5', date: '2026-05-12', account: 'Receita Federal', description: 'COFINS S/ Faturamento do mês anterior', value: -7200, classification: 'deduction_cofins', costType: 'Variável' },
    { id: 't5_6', date: '2026-05-15', account: 'AWS Cloud Services', description: 'Hospedagem Infraestrutura Kubernetes', value: -34000, classification: 'opex_systems', costType: 'Fixo' },
    { id: 't5_7', date: '2026-05-15', account: 'Google Ireland', description: 'Google Ads Campanha Elevada Aquisição', value: -55000, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't5_8', date: '2026-05-15', account: 'Facebook Ads', description: 'Instagram Ads Campanha Elevada Aquisição', value: -38000, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't5_9', date: '2026-05-20', account: 'Imobiliária Nobre', description: 'Aluguel do Escritório Central SP', value: -15000, classification: 'opex_maintenance', costType: 'Fixo' },
    { id: 't5_10', date: '2026-05-25', account: 'Folha de Pagamentos Itaú', description: 'Salários Engenheiros, Designers + Nova Contratação Comercial', value: -88000, classification: 'opex_people', costType: 'Fixo' },
    { id: 't5_11', date: '2026-05-25', account: 'Sodexo Pass', description: 'Vale Refeição e Alimentação CLT', value: -9500, classification: 'opex_people', costType: 'Fixo' },
    { id: 't5_12', date: '2026-05-28', account: 'Contadores Associados', description: 'Honorários de Assessoria Contábil', value: -3200, classification: 'opex_contractors', costType: 'Fixo' },
    { id: 't5_13', date: '2026-05-28', account: 'Receita Federal', description: 'Provisão IRPJ trimestral incidente', value: -900, classification: 'tax_irpj', costType: 'Variável' },
    { id: 't5_14', date: '2026-05-28', account: 'Receita Federal', description: 'CSLL Provisão trimestral', value: -500, classification: 'tax_csll', costType: 'Variável' },
  ],
  c2: [
    // January 2026
    { id: 't1_1_c2', date: '2026-01-05', account: 'Faturamento Lojas', description: 'Venda de Produtos alimentícios pdv', value: 245000, classification: 'sales_products', costType: 'N/A' },
    { id: 't1_3_c2', date: '2026-01-12', account: 'Receita Estadual', description: 'Guia de Recolhimento ICMS s/ Vendas', value: -29400, classification: 'deduction_icms', costType: 'Variável' },
    { id: 't1_4_c2', date: '2026-01-12', account: 'Receita Federal', description: 'PIS S/ Faturamento', value: -1592, classification: 'deduction_pis', costType: 'Variável' },
    { id: 't1_5_c2', date: '2026-01-12', account: 'Receita Federal', description: 'COFINS S/ Faturamento', value: -7350, classification: 'deduction_cofins', costType: 'Variável' },
    { id: 't1_6_c2', date: '2026-01-15', account: 'Moinho Real Alimentos', description: 'Compra de Insumos Farinha e Essências', value: -75000, classification: 'costs_materials', costType: 'Variável' },
    { id: 't1_7_c2', date: '2026-01-15', account: 'Nestlé Distribuição', description: 'Compra de chocolates para revenda direta', value: -32000, classification: 'costs_resell', costType: 'Variável' },
    { id: 't1_8_c2', date: '2026-01-15', account: 'Agência Local', description: 'Panfletagem e Impressos de Ofertas', value: -4500, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't1_9_c2', date: '2026-01-20', account: 'Aluguel Galpão', description: 'Aluguel Comercial Loja Estrela', value: -12000, classification: 'opex_maintenance', costType: 'Fixo' },
    { id: 't1_10_c2', date: '2026-01-25', account: 'Itaú Folha', description: 'Folha de salários padeiros e atendentes', value: -45000, classification: 'opex_people', costType: 'Fixo' },
    { id: 't1_11_c2', date: '2026-01-25', account: 'Itaú Benefícios', description: 'Vale transporte e refeição equipe operacional', value: -6500, classification: 'opex_people', costType: 'Fixo' },
    { id: 't1_12_c2', date: '2026-01-28', account: 'Contabilidade Geller', description: 'Mensalidade de inteligência contábil', value: -2200, classification: 'opex_contractors', costType: 'Fixo' },
    { id: 't1_13_c2', date: '2026-01-28', account: 'Receita Federal', description: 'Provisão IRPJ do exercício', value: -4800, classification: 'tax_irpj', costType: 'Variável' },
    { id: 't1_14_c2', date: '2026-01-28', account: 'Receita Federal', description: 'Provisão CSLL do exercício', value: -2900, classification: 'tax_csll', costType: 'Variável' },

    // February 2026
    { id: 't2_1_c2', date: '2026-02-05', account: 'Faturamento Lojas', description: 'Venda de Produtos alimentícios pdv', value: 260000, classification: 'sales_products', costType: 'N/A' },
    { id: 't2_3_c2', date: '2026-02-12', account: 'Receita Estadual', description: 'Guia de Recolhimento ICMS s/ Vendas', value: -31200, classification: 'deduction_icms', costType: 'Variável' },
    { id: 't2_4_c2', date: '2026-02-12', account: 'Receita Federal', description: 'PIS S/ Faturamento', value: -1690, classification: 'deduction_pis', costType: 'Variável' },
    { id: 't2_5_c2', date: '2026-02-12', account: 'Receita Federal', description: 'COFINS S/ Faturamento', value: -7800, classification: 'deduction_cofins', costType: 'Variável' },
    { id: 't2_6_c2', date: '2026-02-15', account: 'Moinho Real Alimentos', description: 'Compra de Insumos Farinha e Essências', value: -78000, classification: 'costs_materials', costType: 'Variável' },
    { id: 't2_7_c2', date: '2026-02-15', account: 'Nestlé Distribuição', description: 'Compra de chocolates para revenda direta', value: -28000, classification: 'costs_resell', costType: 'Variável' },
    { id: 't2_8_c2', date: '2026-02-15', account: 'Agência Local', description: 'Painéis na loja e impressos', value: -5800, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't2_9_c2', date: '2026-02-20', account: 'Aluguel Galpão', description: 'Aluguel Comercial Loja Estrela', value: -12000, classification: 'opex_maintenance', costType: 'Fixo' },
    { id: 't2_10_c2', date: '2026-02-25', account: 'Itaú Folha', description: 'Folha de salários padeiros e atendentes', value: -45000, classification: 'opex_people', costType: 'Fixo' },
    { id: 't2_11_c2', date: '2026-02-25', account: 'Itaú Benefícios', description: 'Vale transporte e refeição CLT', value: -6500, classification: 'opex_people', costType: 'Fixo' },
    { id: 't1_13_c2_feb', date: '2026-02-28', account: 'Receita Federal', description: 'Provisão IRPJ do exercício', value: -5200, classification: 'tax_irpj', costType: 'Variável' },
    { id: 't1_14_c2_feb', date: '2026-02-28', account: 'Receita Federal', description: 'Provisão CSLL do exercício', value: -3100, classification: 'tax_csll', costType: 'Variável' },

    // March 2026
    { id: 't3_1_c2', date: '2026-03-05', account: 'Faturamento Lojas', description: 'Venda de Produtos alimentícios pdv', value: 295000, classification: 'sales_products', costType: 'N/A' },
    { id: 't3_3_c2', date: '2026-03-12', account: 'Receita Estadual', description: 'Guia de Recolhimento ICMS s/ Vendas', value: -35400, classification: 'deduction_icms', costType: 'Variável' },
    { id: 't3_4_c2', date: '2026-03-12', account: 'Receita Federal', description: 'PIS S/ Faturamento', value: -1910, classification: 'deduction_pis', costType: 'Variável' },
    { id: 't3_5_c2', date: '2026-03-12', account: 'Receita Federal', description: 'COFINS S/ Faturamento', value: -8850, classification: 'deduction_cofins', costType: 'Variável' },
    { id: 't3_6_c2', date: '2026-03-15', account: 'Moinho Real Alimentos', description: 'Compra de Insumos Farinha e Essências', value: -89000, classification: 'costs_materials', costType: 'Variável' },
    { id: 't3_7_c2', date: '2026-03-15', account: 'Nestlé Distribuição', description: 'Compra de chocolates para revenda direta', value: -36000, classification: 'costs_resell', costType: 'Variável' },
    { id: 't3_8_c2', date: '2026-03-15', account: 'Agência Local', description: 'Outdoor e propagandas locais', value: -11000, classification: 'opex_marketing', costType: 'Variável' },
    { id: 't3_9_c2', date: '2026-03-20', account: 'Aluguel Galpão', description: 'Aluguel Comercial Loja Estrela', value: -12000, classification: 'opex_maintenance', costType: 'Fixo' },
    { id: 't3_10_c2', date: '2026-03-25', account: 'Itaú Folha', description: 'Folha de salários padeiros e atendentes (+ reajuste anual)', value: -48000, classification: 'opex_people', costType: 'Fixo' },
    { id: 't3_11_c2', date: '2026-03-25', account: 'Itaú Benefícios', description: 'Vale transporte e refeição CLT', value: -6900, classification: 'opex_people', costType: 'Fixo' },
    { id: 't3_13_c2', date: '2026-03-28', account: 'Receita Federal', description: 'Provisão IRPJ', value: -6200, classification: 'tax_irpj', costType: 'Variável' },
    { id: 't3_14_c2', date: '2026-03-28', account: 'Receita Federal', description: 'Provisão CSLL', value: -3700, classification: 'tax_csll', costType: 'Variável' },
  ]
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

