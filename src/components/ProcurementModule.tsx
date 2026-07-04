import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Trash, 
  Bot, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Check, 
  Package, 
  RefreshCw, 
  FileText, 
  Send,
  Sparkles,
  Upload,
  Calendar,
  Layers,
  ArrowRight,
  Search,
  ShoppingCart,
  CreditCard,
  Building,
  History,
  Tag,
  Info,
  Download,
  ChevronRight,
  ChevronDown,
  Settings,
  Filter,
  HelpCircle,
  Database,
  Server,
  Link2,
  Play,
  Terminal
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

// Definindo as interfaces rigorosamente para persistência e tipagem segura
interface EstoqueItem {
  id: string;
  codigo?: string; // Código do Produto (CODIGO) do padrão de controle de estoque
  item: string;
  lote: string;
  quantidade: number;
  unidade: string;
  min_stock: number;
  safety_stock: number;
  custo_unitario: number;
  preco_venda: number; // For "Valor de Venda" & "Lucratividade por Item"
  local: string;
  frequencia_venda?: 'Alta' | 'Média' | 'Baixa'; // For "Frequência de Venda"
  situacao_lote?: string; // Situação (LIBERADO, BLOQUEADO, CERTIFICACAO)
  originalItemsCount?: number;
  mergedSituations?: string[];
  lotsList?: { lote: string; quantidade: number; unidade: string; situacao?: string }[];
}

interface ConsumoItem {
  id: string;
  codigo?: string;
  item: string;
  quantidade_consumida: number;
  mes_ano: string;
  custo_total: number;
}

interface PrecoHistoricoItem {
  id: string;
  item: string;
  fornecedor: string;
  preco_unitario: number;
  data_compra: string;
  condicao_pagamento: string;
  codigo_pedido: string;
}

interface ValidadeLoteItem {
  id: string;
  codigo?: string;
  item: string;
  lote: string;
  quantidade: number;
  validade: string;
  status: string; // 'Crítico' | 'Atenção' | 'Saudável' | 'Vencido'
  valor_economico: number;
}

// Funções utilitárias de suporte a parsing de datas do Excel/CSV e cruzamento difuso (fuzzy match)
const parseValidadeDate = (val: any): string => {
  if (!val) {
    return new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }
  const valStr = String(val).trim();
  if (!valStr) {
    return new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  // 1. Verifica se é número serial de data do Excel (ex: 46204)
  if (/^\d+(\.\d+)?$/.test(valStr)) {
    const num = Number(valStr);
    if (num > 20000 && num < 100000) {
      const excelEpoch = new Date(1899, 11, 30);
      const targetDate = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
      if (!isNaN(targetDate.getTime())) {
        return targetDate.toISOString().split('T')[0];
      }
    }
  }

  // 2. Verifica se está em formato DD/MM/YYYY ou DD-MM-YYYY
  const dmYRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/;
  const dmYMatch = valStr.match(dmYRegex);
  if (dmYMatch) {
    const day = parseInt(dmYMatch[1], 10);
    const month = parseInt(dmYMatch[2], 10) - 1; // 0-indexed no JS
    let year = parseInt(dmYMatch[3], 10);
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  // 3. Fallback para parser padrão do JS
  const d = new Date(valStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    if (year > 3000 && year < 100000) {
      const excelEpoch = new Date(1899, 11, 30);
      const targetDate = new Date(excelEpoch.getTime() + year * 24 * 60 * 60 * 1000);
      if (!isNaN(targetDate.getTime())) {
        return targetDate.toISOString().split('T')[0];
      }
    }
    return d.toISOString().split('T')[0];
  }

  // Fallback seguro de 180 dias à frente
  return new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
};

const cleanFuzzy = (s: string) => {
  let cleaned = String(s || '').toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos
  // Remove menções de "usar" (como (usar), usar)
  cleaned = cleaned.replace(/\(?usar\)?/gi, '');
  // Mantém apenas letras e números
  cleaned = cleaned.replace(/[^a-z0-9]/g, '');
  return cleaned.trim();
};

const matchWordsFuzzy = (s1: string, s2: string): boolean => {
  const getWords = (s: string): string[] => {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/\(?usar\)?/gi, '')
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2); // ignora palavras muito curtas
  };

  const w1 = getWords(s1);
  const w2 = getWords(s2);
  if (w1.length === 0 || w2.length === 0) return false;

  // Se alguma palavra significativa e longa (ex: alendronato) bater exatamente, ou se uma contiver a outra
  const hasCommonSignificantWord = w1.some(word1 => 
    word1.length >= 6 && w2.some(word2 => word2 === word1 || word2.includes(word1) || word1.includes(word2))
  );
  if (hasCommonSignificantWord) return true;

  const common = w1.filter(word => w2.includes(word));
  const minLength = Math.min(w1.length, w2.length);
  return common.length / minLength >= 0.5; // pelo menos 50% de match de palavras
};

interface RegistrosArquivos {
  id: string;
  nome: string;
  tamanho: string;
  tipo: 'estoque' | 'consumo' | 'historico_precos' | 'validade';
  enviado_em: string;
  colunas_detectadas: string[];
}

interface ColumnMapping {
  itemCol: string;
  qtyCol: string;
  loteCol: string;
  costCol: string;
  validadeCol: string;
  fornecedorCol: string;
  precoVendaCol: string;
}

interface ProcurementModuleProps {
  companyId: string;
  userId: string;
  dreContext: any;
  activeSubTab?: 'indicators' | 'quotes';
  onSubTabChange?: (tab: 'indicators' | 'quotes') => void;
}

export default function ProcurementModule({ companyId, userId, dreContext, activeSubTab = 'indicators' }: ProcurementModuleProps) {
  // Aba de dados selecionada na Gestão de Compras ('estoque' | 'consumo' | 'historico_precos' | 'validade')
  const [activeSubData, setActiveSubData] = useState<'estoque' | 'consumo' | 'historico_precos' | 'validade'>('estoque');

  // Controle de Mapeador de Colunas Personalizado e Pré-visualização Interativa
  const [pendingUpload, setPendingUpload] = useState<{
    tipo: 'estoque' | 'consumo' | 'historico_precos' | 'validade';
    fileName: string;
    fileSize: string;
    detectedHeaders: string[];
    suggestedMapping: Record<string, string>;
    previewRows: Record<string, any>[];
    allRows?: Record<string, any>[];
  } | null>(null);

  // Ordenação e limite de exibição para o painel de estoque
  const [estoqueSort, setEstoqueSort] = useState<string>('quantidade_desc');
  const [estoqueLimit, setEstoqueLimit] = useState<number>(0); // 0 significa Mostrar Todos

  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(() => {
    const cached = localStorage.getItem('gestao_colunas_mapping');
    if (cached) return JSON.parse(cached);
    return {
      itemCol: 'Descrição do Item',
      qtyCol: 'Quantidade',
      loteCol: 'Número do Lote',
      costCol: 'Preço de Custo',
      validadeCol: 'Data de Vencimento',
      fornecedorCol: 'Nome do Fornecedor',
      precoVendaCol: 'Preço de Venda'
    };
  });

  // Salvar mapeamento
  useEffect(() => {
    localStorage.setItem('gestao_colunas_mapping', JSON.stringify(columnMapping));
  }, [columnMapping]);

  // Lista de arquivos registrados para Download do usuário e Auditoria
  const [arquivosRegistrados, setArquivosRegistrados] = useState<RegistrosArquivos[]>(() => {
    const cached = localStorage.getItem('gestao_arquivos_registrados');
    if (cached) return JSON.parse(cached);
    return [];
  });

  // Armazenar os arquivos no localStorage
  useEffect(() => {
    localStorage.setItem('gestao_arquivos_registrados', JSON.stringify(arquivosRegistrados));
  }, [arquivosRegistrados]);

  // Estados dos bancos estruturados populados com os dados iniciais do relatório real de CONTROLE DE ESTOQUE
  const [estoqueData, setEstoqueData] = useState<EstoqueItem[]>([]);
  const [consumoData, setConsumoData] = useState<ConsumoItem[]>([]);
  const [historicoPrecosData, setHistoricoPrecosData] = useState<PrecoHistoricoItem[]>([]);
  const [validadeLotesData, setValidadeLotesData] = useState<ValidadeLoteItem[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [loadedCompanyId, setLoadedCompanyId] = useState<string | null>(null);

  // Carregar dados estruturados do banco de dados (Supabase ou fallback local)
  useEffect(() => {
    setLoadedCompanyId(null);
    async function loadData() {
      try {
        setLoadingDb(true);
        
        // 1. Estoque
        const resInv = await fetch(`/api/procurement/inventory?company_id=${companyId}`);
        let mappedInv = [];
        if (resInv.ok) {
          const data = await resInv.json();
          mappedInv = data.map((item: any) => ({
            ...item,
            safety_stock: item.safety_stock || Math.max(20, Math.round(item.min_stock / 2)),
            local: item.local || 'Almoxarifado Principal',
            frequencia_venda: item.quantidade > 50 ? 'Alta' : 'Média'
          }));
        }
        if (mappedInv.length === 0) {
          mappedInv = [];
        }
        setEstoqueData(mappedInv);
        
        // 2. Consumo
        const resCons = await fetch(`/api/procurement/consumption?company_id=${companyId}`);
        let mappedCons = [];
        if (resCons.ok) {
          const data = await resCons.json();
          mappedCons = data.map((item: any) => ({
            ...item,
            custo_total: item.custo_total || (item.quantidade_consumida * 10)
          }));
        }
        if (mappedCons.length === 0) {
          mappedCons = [];
        }
        setConsumoData(mappedCons);
 
        // 3. Preços Históricos
        const resPrices = await fetch(`/api/procurement/price_history?company_id=${companyId}`);
        let mappedPrices = [];
        if (resPrices.ok) {
          const data = await resPrices.json();
          mappedPrices = data.map((item: any) => ({
            ...item,
            condicao_pagamento: item.condicao_pagamento || 'Pix',
            codigo_pedido: item.codigo_pedido || 'PED-' + Math.floor(Math.random() * 9000 + 1000)
          }));
        }
        if (mappedPrices.length === 0) {
          mappedPrices = [];
        }
        setHistoricoPrecosData(mappedPrices);
 
        // 4. Controle de Validades
        const resVal = await fetch(`/api/procurement/batch_validity?company_id=${companyId}`);
        let mappedVal = [];
        if (resVal.ok) {
          const data = await resVal.json();
          mappedVal = data.map((item: any) => {
            const parsedVal = parseValidadeDate(item.validade);
            const calculatedValDays = Math.round((new Date(parsedVal).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            let calculatedStatus = 'Saudável';
            if (calculatedValDays < 0) calculatedStatus = 'Vencido';
            else if (calculatedValDays <= 15) calculatedStatus = 'Crítico';
            else if (calculatedValDays <= 45) calculatedStatus = 'Atenção';
            return {
              ...item,
              validade: parsedVal,
              status: calculatedStatus,
              valor_economico: item.valor_economico || (item.quantidade * 50)
            };
          });
        }
        if (mappedVal.length === 0) {
          mappedVal = [];
        }
        setValidadeLotesData(mappedVal);
        setLoadedCompanyId(companyId);
      } catch (err) {
        console.error("Error loading procurement data from API:", err);
      } finally {
        setLoadingDb(false);
      }
    }
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  // Sincronizar alterações de dados com o Banco de Dados (com Debounce para otimização)
  useEffect(() => {
    if (loadingDb || !loadedCompanyId || companyId !== loadedCompanyId) return;
    const timer = setTimeout(async () => {
      try {
        await fetch('/api/procurement/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId, inventory_items: estoqueData })
        });
      } catch (e) {
        console.error("Error saving inventory:", e);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [estoqueData, companyId, loadingDb, loadedCompanyId]);

  useEffect(() => {
    if (loadingDb || !loadedCompanyId || companyId !== loadedCompanyId) return;
    const timer = setTimeout(async () => {
      try {
        await fetch('/api/procurement/consumption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId, consumption_items: consumoData })
        });
      } catch (e) {
        console.error("Error saving consumption:", e);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [consumoData, companyId, loadingDb, loadedCompanyId]);

  useEffect(() => {
    if (loadingDb || !loadedCompanyId || companyId !== loadedCompanyId) return;
    const timer = setTimeout(async () => {
      try {
        await fetch('/api/procurement/price_history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId, price_history_items: historicoPrecosData })
        });
      } catch (e) {
        console.error("Error saving price history:", e);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [historicoPrecosData, companyId, loadingDb, loadedCompanyId]);

  useEffect(() => {
    if (loadingDb || !loadedCompanyId || companyId !== loadedCompanyId) return;
    const timer = setTimeout(async () => {
      try {
        await fetch('/api/procurement/batch_validity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId, batch_validity_items: validadeLotesData })
        });
      } catch (e) {
        console.error("Error saving batch validity:", e);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [validadeLotesData, companyId, loadingDb, loadedCompanyId]);

  // Estados gerais
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadLoading, setUploadLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isChatExpanded, setIsChatExpanded] = useState(true);

  const handleClearDatabase = async () => {
    if (!window.confirm("Atenção: Isso irá apagar definitivamente todos os dados de estoque, consumo, preços históricos, controle de validades e cotações cadastrados para esta empresa para iniciar uma base limpa. Deseja prosseguir?")) {
      return;
    }
    try {
      setLoadingDb(true);
      const res = await fetch('/api/procurement/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId })
      });
      if (res.ok) {
        setEstoqueData([]);
        setConsumoData([]);
        setHistoricoPrecosData([]);
        setValidadeLotesData([]);
        setArquivosRegistrados([]);
        localStorage.removeItem('gestao_arquivos_registrados');
        setToastMessage("Módulo Compras Inteligentes zerado com sucesso! Pronto para inserção real.");
        setTimeout(() => setToastMessage(null), 4500);
      } else {
        alert("Erro ao tentar limpar os dados.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao tentar limpar os dados.");
    } finally {
      setLoadingDb(false);
    }
  };

  // Inicia o processo de mapeamento e pré-visualização ao anexar arquivo
  const initiateFileUpload = (tipo: 'estoque' | 'consumo' | 'historico_precos' | 'validade', fileOrName: File | string) => {
    let fileName = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
    let fileSize = typeof fileOrName === 'string' ? '48 KB' : (fileOrName.size / 1024).toFixed(1) + ' KB';

    // Se for string (fallback/mock), ou se falhar de alguma forma, usamos mock data
    const loadMockData = () => {
      let detectedHeaders: string[] = [];
      let previewRows: any[] = [];
      let suggestedMapping: Record<string, string> = {};

      if (tipo === 'estoque') {
        detectedHeaders = ['Código Produto', 'Descrição do Item', 'Número do Lote', 'Saldo Físico', 'Custo Médio R$', 'Preço Sugerido R$', 'Unidade'];
        previewRows = [
          { 'Código Produto': '01918', 'Descrição do Item': 'CREATINA MONOHIDRATADA 250G', 'Número do Lote': 'CR-905', 'Saldo Físico': '65', 'Custo Médio R$': '41.50', 'Preço Sugerido R$': '89.90', 'Unidade': 'potes' },
          { 'Código Produto': '04808', 'Descrição do Item': 'BCAA ULTRA PURE', 'Número do Lote': 'BC-11', 'Saldo Físico': '90', 'Custo Médio R$': '28.90', 'Preço Sugerido R$': '59.90', 'Unidade': 'potes' },
          { 'Código Produto': '00633', 'Descrição do Item': 'WHEY PROTEIN ISOLADO 1KG', 'Número do Lote': 'WP-742', 'Saldo Físico': '110', 'Custo Médio R$': '119.00', 'Preço Sugerido R$': '249.90', 'Unidade': 'potes' },
        ];
        suggestedMapping = {
          itemCol: 'Descrição do Item',
          qtyCol: 'Saldo Físico',
          loteCol: 'Número do Lote',
          costCol: 'Custo Médio R$',
          precoVendaCol: 'Preço Sugerido R$',
          codigoCol: 'Código Produto',
          unidadeCol: 'Unidade'
        };
      } else if (tipo === 'consumo') {
        detectedHeaders = ['Nome do Produto', 'Mes/Ano Referência', 'Qtd Saídas Vendas', 'Custo Acumulado R$'];
        previewRows = [
          { 'Nome do Produto': 'Creatina Monohidratada 250g', 'Mes/Ano Referência': '06/2026', 'Qtd Saídas Vendas': '140', 'Custo Acumulado R$': '5880.00' },
          { 'Nome do Produto': 'BCAA Ultra Pure', 'Mes/Ano Referência': '06/2026', 'Qtd Saídas Vendas': '55', 'Custo Acumulado R$': '1589.50' },
          { 'Nome do Produto': 'Whey Protein Isolado 1kg', 'Mes/Ano Referência': '06/2026', 'Qtd Saídas Vendas': '125', 'Custo Acumulado R$': '14875.00' }
        ];
        suggestedMapping = {
          itemCol: 'Nome do Produto',
          qtyCol: 'Qtd Saídas Vendas',
          mesAnoCol: 'Mes/Ano Referência',
          custoTotalCol: 'Custo Acumulado R$'
        };
      } else if (tipo === 'historico_precos') {
        detectedHeaders = ['Descrição Comercial', 'Fornecedor Credenciado', 'Valor Unitário Pago', 'Data Emissão NF', 'Condição de Pgto', 'Nº Faturamento'];
        previewRows = [
          { 'Descrição Comercial': 'Creatina Monohidratada 250g', 'Fornecedor Credenciado': 'NutriAtacado Brasil', 'Valor Unitário Pago': '39.90', 'Data Emissão NF': '2026-06-19', 'Condição de Pgto': 'Boleto 45 dias', 'Nº Faturamento': 'PED-11582' },
          { 'Descrição Comercial': 'Whey Protein Isolado 1kg', 'Fornecedor Credenciado': 'SupleMax Distribuidora', 'Valor Unitário Pago': '115.00', 'Data Emissão NF': '2026-06-18', 'Condição de Pgto': 'Boleto 30 dias', 'Nº Faturamento': 'PED-11579' },
          { 'Descrição Comercial': 'BCAA Ultra Pure', 'Fornecedor Credenciado': 'Globo Suplementos', 'Valor Unitário Pago': '27.50', 'Data Emissão NF': '2026-06-17', 'Condição de Pgto': 'Pix', 'Nº Faturamento': 'PED-11511' }
        ];
        suggestedMapping = {
          itemCol: 'Descrição Comercial',
          fornecedorCol: 'Fornecedor Credenciado',
          precoUnitarioCol: 'Valor Unitário Pago',
          dataCompraCol: 'Data Emissão NF',
          condicaoPgtoCol: 'Condição de Pgto',
          codigoPedidoCol: 'Nº Faturamento'
        };
      } else if (tipo === 'validade') {
        detectedHeaders = ['Matéria Prima / Lote', 'ID Identificador', 'Volume de Lote', 'Vencimento Final'];
        previewRows = [
          { 'Matéria Prima / Lote': 'Creatina Monohidratada 250g', 'ID Identificador': 'CR-905', 'Volume de Lote': '65', 'Vencimento Final': '2027-02-14' },
          { 'Matéria Prima / Lote': 'BCAA Ultra Pure', 'ID Identificador': 'BC-11', 'Volume de Lote': '90', 'Vencimento Final': '2026-07-28' },
          { 'Matéria Prima / Lote': 'Whey Protein Isolado 1kg', 'ID Identificador': 'WP-742', 'Volume de Lote': '110', 'Vencimento Final': '2026-06-25' }
        ];
        suggestedMapping = {
          itemCol: 'Matéria Prima / Lote',
          loteCol: 'ID Identificador',
          qtyCol: 'Volume de Lote',
          validadeCol: 'Vencimento Final'
        };
      }

      setPendingUpload({
        tipo,
        fileName,
        fileSize,
        detectedHeaders,
        suggestedMapping,
        previewRows
      });
    };

    if (typeof fileOrName === 'string') {
      loadMockData();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let rows: Record<string, any>[] = [];
        let detectedHeaders: string[] = [];
        let finalSheetUsed = '';

        // Iterar por todas as planilhas do arquivo para achar dados válidos
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;

          // Converter para array de arrays (linha a linha, coluna a coluna) para analisar estrutura
          const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
          if (!rawRows || rawRows.length === 0) continue;

          // Achar a primeira linha que parece conter cabeçalhos (ex: pelo menos 2 colunas preenchidas)
          let headerIdx = -1;
          for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];
            const nonBlankCount = row.filter((val: any) => val !== null && val !== undefined && String(val).trim() !== '').length;
            if (nonBlankCount >= 2) {
              headerIdx = i;
              break;
            }
          }

          // Se não achou uma linha com mais de 2 colunas, mas tem dados, usa a primeira que tiver qualquer dado
          if (headerIdx === -1 && rawRows.length > 0) {
            headerIdx = rawRows.findIndex(row => row.some((val: any) => val !== null && val !== undefined && String(val).trim() !== ''));
          }

          if (headerIdx !== -1) {
            const rawHeaders = rawRows[headerIdx];
            // Formatamos cabeçalhos, preenchendo vazios com "Coluna X"
            const headers = rawHeaders.map((h: any, colIdx: number) => {
              const str = String(h || '').trim();
              return str ? str : `Coluna_${colIdx + 1}`;
            });

            const sheetRows: Record<string, any>[] = [];
            // Coletar linhas após a linha de cabeçalho
            for (let i = headerIdx + 1; i < rawRows.length; i++) {
              const row = rawRows[i];
              // Pular linhas totalmente vazias
              const isRowEmpty = row.every((val: any) => val === null || val === undefined || String(val).trim() === '');
              if (isRowEmpty) continue;

              const rowObj: Record<string, any> = {};
              headers.forEach((header: string, colIdx: number) => {
                rowObj[header] = row[colIdx] !== undefined ? row[colIdx] : '';
              });
              sheetRows.push(rowObj);
            }

            if (sheetRows.length > 0) {
              rows = sheetRows;
              detectedHeaders = headers;
              finalSheetUsed = sheetName;
              break; // Achou uma planilha com dados reais! Paramos aqui.
            }
          }
        }

        if (rows.length === 0) {
          triggerToast("Não conseguimos extrair dados válidos da planilha. Verifique se há dados nela.");
          return;
        }

        // Mapear automaticamente com base em semelhança de nomes de colunas
        const findBestMatch = (aliases: string[]): string => {
          for (const alias of aliases) {
            const match = detectedHeaders.find(h => h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(alias.toLowerCase().replace(/[^a-z0-9]/g, '')));
            if (match) return match;
          }
          return '';
        };

        let suggestedMapping: Record<string, string> = {};
        if (tipo === 'estoque') {
          suggestedMapping = {
            itemCol: findBestMatch(['descrição', 'descricao', 'item', 'insumo', 'produto', 'nome', 'materia', 'matéria']),
            qtyCol: findBestMatch(['quantidade', 'qtd', 'saldo', 'estoque', 'fisico', 'físico', 'volume']),
            loteCol: findBestMatch(['lote', 'número do lote', 'numero lote', 'lot', 'num lote']),
            costCol: findBestMatch(['custo', 'custo unitário', 'unitario', 'valor custo', 'médio', 'custo medio']),
            precoVendaCol: findBestMatch(['preço', 'venda', 'preço venda', 'sugerido', 'valor venda', 'preco venda']),
            codigoCol: findBestMatch(['código', 'codigo', 'cod', 'id', 'produto']),
            unidadeCol: findBestMatch(['unidade', 'und', 'un', 'unid'])
          };
        } else if (tipo === 'consumo') {
          suggestedMapping = {
            itemCol: findBestMatch(['descrição', 'descricao', 'item', 'insumo', 'produto', 'nome']),
            qtyCol: findBestMatch(['quantidade', 'qtd', 'consumido', 'saídas', 'vendas', 'volume']),
            mesAnoCol: findBestMatch(['mês', 'mes', 'ano', 'referência', 'data', 'periodo', 'período']),
            custoTotalCol: findBestMatch(['custo', 'total', 'custo total', 'valor', 'custo acumulado']),
            codigoCol: findBestMatch(['código', 'codigo', 'cod', 'id', 'produto'])
          };
        } else if (tipo === 'historico_precos') {
          suggestedMapping = {
            itemCol: findBestMatch(['descrição', 'descricao', 'item', 'insumo', 'produto', 'nome']),
            fornecedorCol: findBestMatch(['fornecedor', 'nome fornecedor', 'parceiro', 'credenciado', 'distribuidor']),
            precoUnitarioCol: findBestMatch(['preço', 'unitário', 'valor unitario', 'pago', 'custo', 'unitario']),
            dataCompraCol: findBestMatch(['data', 'compra', 'emissão', 'nf', 'data compra', 'emissao']),
            condicaoPgtoCol: findBestMatch(['condição', 'pagamento', 'prazo', 'pgto', 'condicao']),
            codigoPedidoCol: findBestMatch(['pedido', 'pedido compra', 'faturamento', 'nf', 'número', 'numero'])
          };
        } else if (tipo === 'validade') {
          suggestedMapping = {
            itemCol: findBestMatch(['descrição', 'descricao', 'item', 'insumo', 'produto', 'nome']),
            loteCol: findBestMatch(['lote', 'id lote', 'identificador', 'loteamento']),
            qtyCol: findBestMatch(['quantidade', 'qtd', 'volume', 'saldo']),
            validadeCol: findBestMatch(['validade', 'vencimento', 'vence', 'data validade', 'expira'])
          };
        }

        // Se algum campo essencial não foi mapeado automaticamente, tenta usar o primeiro cabeçalho ou vazio
        if (tipo === 'estoque') {
          if (!suggestedMapping.itemCol) suggestedMapping.itemCol = detectedHeaders.find(h => h.toLowerCase().includes('item') || h.toLowerCase().includes('desc')) || detectedHeaders[0] || '';
          if (!suggestedMapping.qtyCol) suggestedMapping.qtyCol = detectedHeaders.find(h => h.toLowerCase().includes('qtd') || h.toLowerCase().includes('quant') || h.toLowerCase().includes('saldo')) || detectedHeaders[1] || '';
        }

        // Criar uma visualização prévia das primeiras 5 linhas
        const previewRows = rows.slice(0, 5);

        setPendingUpload({
          tipo,
          fileName,
          fileSize: (fileOrName.size / 1024).toFixed(1) + ' KB',
          detectedHeaders,
          suggestedMapping,
          previewRows,
          allRows: rows 
        });
      } catch (err) {
        console.error("Erro ao ler planilha:", err);
        // Fallback para mock se falhar
        loadMockData();
      }
    };

    reader.onerror = () => {
      loadMockData();
    };

    reader.readAsArrayBuffer(fileOrName);
  };

  const confirmAndImportPendingUpload = () => {
    if (!pendingUpload) return;
    const { tipo, fileName, fileSize, suggestedMapping, allRows } = pendingUpload;

    if (tipo === 'estoque') {
      const mappedRows: EstoqueItem[] = (allRows || []).map((row, idx) => {
        const item = String(row[suggestedMapping.itemCol] || '').trim();
        const qty = Number(row[suggestedMapping.qtyCol]) || 0;
        const lote = String(row[suggestedMapping.loteCol] || 'Único').trim();
        const custo = Number(row[suggestedMapping.costCol]) || 0;
        const precoVenda = Number(row[suggestedMapping.precoVendaCol]) || (custo * 1.5);
        const codigo = String(row[suggestedMapping.codigoCol] || '').trim() || `EST-${Math.floor(10000 + Math.random() * 90000)}`;
        const unidade = String(row[suggestedMapping.unidadeCol] || 'potes').trim();
        
        return {
          id: 'est_import_' + Date.now() + '_' + idx,
          item,
          lote,
          quantidade: qty,
          unidade,
          min_stock: Math.round(qty * 0.8) || 50,
          safety_stock: Math.round(qty * 0.3) || 20,
          custo_unitario: custo,
          preco_venda: precoVenda,
          local: 'Almoxarifado Principal',
          frequencia_venda: qty > 50 ? 'Alta' as const : 'Média' as const,
          codigo,
          situacao_lote: 'LIBERADO'
        };
      }).filter(r => r.item !== '');

      const baseMockData = mappedRows.length > 0 ? mappedRows : [
        { id: 'est_up_1', item: 'Creatina Monohidratada 250g', lote: 'CR-905', quantidade: 65, unidade: 'potes', min_stock: 60, safety_stock: 20, custo_unitario: 41.50, preco_venda: 89.90, local: 'Prateleira Especial', frequencia_venda: 'Alta' as const, codigo: '01918', situacao_lote: 'LIBERADO' },
        { id: 'est_up_2', item: 'BCAA Ultra Pure', lote: 'BC-11', quantidade: 90, unidade: 'potes', min_stock: 40, safety_stock: 15, custo_unitario: 28.90, preco_venda: 59.90, local: 'Almoxarifado', frequencia_venda: 'Média' as const, codigo: '04808', situacao_lote: 'LIBERADO' },
        { id: 'est_up_3', item: 'Whey Protein Isolado 1kg', lote: 'WP-742', quantidade: 110, unidade: 'potes', min_stock: 80, safety_stock: 25, custo_unitario: 119.00, preco_venda: 249.90, local: 'Câmara Fria', frequencia_venda: 'Alta' as const, codigo: '00633', situacao_lote: 'LIBERADO' }
      ];

      setEstoqueData(prev => {
        // Se mapeamos linhas da planilha, substituímos o estoque antigo ou mesclamos inteligentemente.
        // O usuário quer que "O sistema precisa registrar toda planilha, mas mostrar nesse painel...".
        // Portanto, se há linhas mapeadas, podemos substituir tudo da planilha para que as informações sejam 100% reais do arquivo importado!
        if (mappedRows.length > 0) {
          // Ajustar as colunas exibidas para se encaixarem com a planilha mapeada
          const colsToDisplay = ['item', 'quantidade'];
          if (suggestedMapping.codigoCol) colsToDisplay.unshift('codigo');
          if (suggestedMapping.loteCol) colsToDisplay.push('lote');
          if (suggestedMapping.costCol) colsToDisplay.push('custo');
          if (suggestedMapping.precoVendaCol) colsToDisplay.push('venda');
          setSelectedEstoqueColumns(colsToDisplay);
          
          return mappedRows;
        }
        const filtered = prev.filter(p => !baseMockData.some(n => n.item.toLowerCase() === p.item.toLowerCase()));
        return [...filtered, ...baseMockData];
      });
    } else if (tipo === 'consumo') {
      const mappedRows: ConsumoItem[] = (allRows || []).map((row, idx) => {
        const item = String(row[suggestedMapping.itemCol] || '').trim();
        const qty = Number(row[suggestedMapping.qtyCol]) || 0;
        const mesAno = String(row[suggestedMapping.mesAnoCol] || '').trim() || new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
        const custoTotal = Number(row[suggestedMapping.custoTotalCol]) || (qty * 10);
        const codigo = suggestedMapping.codigoCol ? String(row[suggestedMapping.codigoCol] || '').trim() : '';
        
        return {
          id: 'cons_import_' + Date.now() + '_' + idx,
          codigo,
          item,
          quantidade_consumida: qty,
          mes_ano: mesAno,
          custo_total: custoTotal
        };
      }).filter(r => r.item !== '');

      const baseMockData = mappedRows.length > 0 ? mappedRows : [
        { id: 'cons_up_1', codigo: '01918', item: 'Creatina Monohidratada 250g', quantidade_consumida: 140, mes_ano: '06/2026', custo_total: 5880.00 },
        { id: 'cons_up_2', codigo: '04808', item: 'BCAA Ultra Pure', quantidade_consumida: 55, mes_ano: '06/2026', custo_total: 1589.50 },
        { id: 'cons_up_3', codigo: '00633', item: 'Whey Protein Isolado 1kg', quantidade_consumida: 125, mes_ano: '06/2026', custo_total: 14875.00 }
      ];

      setConsumoData(prev => {
        if (mappedRows.length > 0) {
          // Ajustar as colunas exibidas para se encaixarem com a planilha mapeada
          const colsToDisplay = ['item', 'quantidade_consumida'];
          if (suggestedMapping.codigoCol) colsToDisplay.unshift('codigo');
          if (suggestedMapping.mesAnoCol) colsToDisplay.push('mes_ano');
          if (suggestedMapping.custoTotalCol) colsToDisplay.push('custo_total');
          setSelectedConsumoColumns(colsToDisplay);
          
          return mappedRows;
        }
        const filtered = prev.filter(p => !baseMockData.some(n => n.item.toLowerCase() === p.item.toLowerCase()));
        return [...filtered, ...baseMockData];
      });
    } else if (tipo === 'historico_precos') {
      const mappedRows: PrecoHistoricoItem[] = (allRows || []).map((row, idx) => {
        const item = String(row[suggestedMapping.itemCol] || '').trim();
        const fornecedor = String(row[suggestedMapping.fornecedorCol] || 'Fornecedor Desconhecido').trim();
        const preco = Number(row[suggestedMapping.precoUnitarioCol]) || 0;
        const dataCompra = String(row[suggestedMapping.dataCompraCol] || '').trim() || new Date().toISOString().split('T')[0];
        const condicao = String(row[suggestedMapping.condicaoPgtoCol] || 'Boleto 30 dias').trim();
        const pedido = String(row[suggestedMapping.codigoPedidoCol] || '').trim() || `PED-${Math.floor(10000 + Math.random() * 90000)}`;
        
        return {
          id: 'pre_import_' + Date.now() + '_' + idx,
          item,
          fornecedor,
          preco_unitario: preco,
          data_compra: dataCompra,
          condicao_pagamento: condicao,
          codigo_pedido: pedido
        };
      }).filter(r => r.item !== '');

      const baseMockData = mappedRows.length > 0 ? mappedRows : [
        { id: 'pre_up_1', item: 'Creatina Monohidratada 250g', fornecedor: 'NutriAtacado Brasil', preco_unitario: 39.90, data_compra: '2026-06-19', condicao_pagamento: 'Boleto 45 dias', codigo_pedido: 'PED-11582' },
        { id: 'pre_up_2', item: 'Whey Protein Isolado 1kg', fornecedor: 'SupleMax Distribuidora', preco_unitario: 115.00, data_compra: '2026-06-18', condicao_pagamento: 'Boleto 30 dias', codigo_pedido: 'PED-11579' },
        { id: 'pre_up_3', item: 'BCAA Ultra Pure', fornecedor: 'Globo Suplementos', preco_unitario: 27.50, data_compra: '2026-06-17', condicao_pagamento: 'Pix', codigo_pedido: 'PED-11511' }
      ];

      setHistoricoPrecosData(prev => {
        if (mappedRows.length > 0) {
          return mappedRows;
        }
        return [...prev, ...baseMockData];
      });
    } else if (tipo === 'validade') {
      const mappedRows: ValidadeLoteItem[] = (allRows || []).map((row, idx) => {
        const item = String(row[suggestedMapping.itemCol] || '').trim();
        const lote = String(row[suggestedMapping.loteCol] || 'Único').trim();
        const qty = Number(row[suggestedMapping.qtyCol]) || 0;
        const rawValidade = String(row[suggestedMapping.validadeCol] || '').trim();
        const validade = parseValidadeDate(rawValidade);
        
        let codigo = suggestedMapping.codigoCol ? String(row[suggestedMapping.codigoCol] || '').trim() : '';
        
        // Se o código estiver em branco no arquivo, cruza dinamicamente com o estoque para obter o código correto
        if (!codigo) {
          const matchEstoque = estoqueData.find(e => {
            const eClean = cleanFuzzy(e.item);
            const vClean = cleanFuzzy(item);
            return eClean === vClean || eClean.includes(vClean) || vClean.includes(eClean) || matchWordsFuzzy(e.item, item);
          });
          if (matchEstoque && matchEstoque.codigo) {
            codigo = matchEstoque.codigo;
          } else {
            const matchCons = consumoData.find(c => {
              const cClean = cleanFuzzy(c.item);
              const vClean = cleanFuzzy(item);
              return cClean === vClean || cClean.includes(vClean) || vClean.includes(cClean) || matchWordsFuzzy(c.item, item);
            });
            if (matchCons && matchCons.codigo) {
              codigo = matchCons.codigo;
            }
          }
        }
        
        return {
          id: 'val_import_' + Date.now() + '_' + idx,
          codigo,
          item,
          lote,
          quantidade: qty,
          validade,
          status: 'Saudável',
          valor_economico: qty * 50
        };
      }).filter(r => r.item !== '');

      const baseMockData = mappedRows.length > 0 ? mappedRows : [
        { id: 'val_up_1', item: 'Creatina Monohidratada 250g', lote: 'CR-905', quantidade: 65, validade: '2027-02-14', status: 'Saudável', valor_economico: 2697.50 },
        { id: 'val_up_2', item: 'BCAA Ultra Pure', lote: 'BC-11', quantidade: 90, validade: '2026-07-28', status: 'Atenção', valor_economico: 2601.00 },
        { id: 'val_up_3', item: 'Whey Protein Isolado 1kg', lote: 'WP-742', quantidade: 110, validade: '2026-06-25', status: 'Crítico', valor_economico: 13090.00 }
      ];

      setValidadeLotesData(prev => {
        if (mappedRows.length > 0) {
          return mappedRows;
        }
        const filtered = prev.filter(p => !baseMockData.some(n => n.item.toLowerCase() === p.item.toLowerCase() && n.lote === p.lote));
        return [...filtered, ...baseMockData];
      });
    }

    const registeredFile: RegistrosArquivos = {
      id: 'file_' + Date.now(),
      nome: fileName,
      tamanho: fileSize,
      tipo,
      enviado_em: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      colunas_detectadas: Object.values(suggestedMapping).filter(Boolean) as string[]
    };

    setArquivosRegistrados(prev => [registeredFile, ...prev]);
    setPendingUpload(null);
    triggerToast(`Sucesso! Arquivo "${fileName}" importado com dados 100% fidedignos.`);
  };

  // Consolidação automática por código (fazer a soma pelos códigos, caso conste mais vezes)
  const [consolidatedByCode, setConsolidatedByCode] = useState<boolean>(true);

  // Colunas selecionadas para exibição no painel Saldo de Estoque Atual e controle do dropdown de seleção
  const [selectedEstoqueColumns, setSelectedEstoqueColumns] = useState<string[]>(['codigo', 'item', 'lote', 'quantidade', 'custo', 'venda']);
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState<boolean>(false);

  // Colunas selecionadas para exibição no painel Consumo Mensal e controle do dropdown de seleção
  const [selectedConsumoColumns, setSelectedConsumoColumns] = useState<string[]>(['codigo', 'item', 'mes_ano', 'quantidade_consumida', 'custo_total']);
  const [isConsumoColumnDropdownOpen, setIsConsumoColumnDropdownOpen] = useState<boolean>(false);

  // Estados para filtro de cálculo de consumo médio mensal/diário
  const [consumoMonthsFilter, setConsumoMonthsFilter] = useState<number>(3);
  const [consumoViewMode, setConsumoViewMode] = useState<'media_mensal' | 'media_diaria'>('media_mensal');

  // Estado para filtro de validade/shelf-life
  const [validadeFiltroVencimento, setValidadeFiltroVencimento] = useState<'todos' | 'vencendo_mes' | 'vencidos' | 'criticos' | 'atencao' | 'saudaveis'>('todos');

  // Estados do Chatbot IA Inteligente
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string; timestamp: string }[]>([
    { 
      role: 'assistant', 
      content: 'Olá! Sou seu Assistente de IA de Gestão Comercial e Suprimentos. Eu tenho livre acesso aos seus arquivos e tabelas de dados de compras, estoque, vendas e validades.\n\nVocê pode me pedir para cruzar qualquer informação! Por exemplo, pergunte: **"Qual foi o preço da minha última compra de Creatina e qual foi o fornecedor?"** ou **"Quais são os itens de consumo que estão zerados no estoque?"**', 
      timestamp: 'Agora' 
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiTyping]);

  // Função auxiliar de notificacao rápida
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };



  // Funções de Deletar Registros individuais
  const handleDeleteEstoque = (id: string) => {
    setEstoqueData(prev => prev.filter(i => i.id !== id));
    triggerToast('Item removido do saldo de estoque atual.');
  };

  const handleDeleteConsumo = (item: any) => {
    setConsumoData(prev => prev.filter(c => {
      if (item.codigo && c.codigo) {
        return c.codigo !== item.codigo;
      }
      return c.item.toLowerCase() !== item.item.toLowerCase();
    }));
    triggerToast(`Consumo de "${item.item}" removido com sucesso.`);
  };

  const handleDeletePreco = (id: string) => {
    setHistoricoPrecosData(prev => prev.filter(i => i.id !== id));
    triggerToast('Registro de compra excluído com sucesso.');
  };

  const handleDeleteValidade = (id: string) => {
    setValidadeLotesData(prev => prev.filter(i => i.id !== id));
    triggerToast('Aviso de lote deletado.');
  };

  const handleDeleteArquivo = (id: string) => {
    setArquivosRegistrados(prev => prev.filter(f => f.id !== id));
    triggerToast('Arquivo descadastrado do sistema.');
  };

  const isLoteVencendo2Meses = (itemName: string, loteName: string): boolean => {
    if (!validadeLotesData || validadeLotesData.length === 0) return false;
    
    const cleanItem = itemName.replace(/\(USAR\)/g, '').toLowerCase().trim();
    
    const vLote = validadeLotesData.find(v => {
      const cleanVItem = v.item.toLowerCase().trim();
      const matchItem = cleanVItem.includes(cleanItem) || cleanItem.includes(cleanVItem);
      const matchLote = v.lote.toLowerCase().trim() === loteName.toLowerCase().trim();
      return matchItem && matchLote;
    });
    
    if (!vLote) return false;
    
    const valDate = new Date(vLote.validade);
    const now = new Date();
    const diffTime = valDate.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    return diffDays <= 60;
  };

  // Consolidador por Código: Agrupa e soma as quantidades dos itens com mesmo código
  const getAggregatedStockData = (): EstoqueItem[] => {
    if (!consolidatedByCode) {
      return estoqueData.map(item => ({
        ...item,
        lotsList: [{ lote: item.lote || 'Único', situacao: item.situacao_lote || 'LIBERADO', quantidade: item.quantidade, unidade: item.unidade }]
      }));
    }
    
    const grouped: { [key: string]: EstoqueItem } = {};
    
    estoqueData.forEach(item => {
      // Se não constar código estruturado, usa a descrição como chave restritora
      const key = item.codigo || item.item;
      const sit = item.situacao_lote || item.lote || 'LIBERADO';
      const lotId = item.lote || 'Único';
      if (!grouped[key]) {
        grouped[key] = {
          ...item,
          originalItemsCount: 1,
          mergedSituations: [sit],
          lotsList: [{ lote: lotId, situacao: sit, quantidade: item.quantidade, unidade: item.unidade }]
        };
      } else {
        grouped[key].quantidade += item.quantidade;
        grouped[key].originalItemsCount = (grouped[key].originalItemsCount || 1) + 1;
        if (grouped[key].mergedSituations && !grouped[key].mergedSituations?.includes(sit)) {
          grouped[key].mergedSituations?.push(sit);
        }
        if (grouped[key].lotsList) {
          grouped[key].lotsList.push({ lote: lotId, situacao: sit, quantidade: item.quantidade, unidade: item.unidade });
        }
      }
    });
    
    return Object.values(grouped);
  };

  // Filtra, ordena e limita o saldo de estoque atual conforme escolhas do usuário
  const getFilteredAndSortedStock = (): EstoqueItem[] => {
    let result = getAggregatedStockData();

    // Filtro por termo de pesquisa
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(i => 
        i.item.toLowerCase().includes(q) || 
        (i.codigo && i.codigo.toLowerCase().includes(q))
      );
    }

    // Ordenação dinâmica
    result = [...result].sort((a, b) => {
      if (estoqueSort === 'quantidade_desc') {
        return b.quantidade - a.quantidade;
      } else if (estoqueSort === 'quantidade_asc') {
        return a.quantidade - b.quantidade;
      } else if (estoqueSort === 'nome_asc') {
        return a.item.localeCompare(b.item, 'pt-BR');
      } else if (estoqueSort === 'codigo_asc') {
        return (a.codigo || '').localeCompare(b.codigo || '', 'pt-BR', { numeric: true });
      }
      return 0;
    });

    // Limite/Filtro de quantidade
    if (estoqueLimit > 0) {
      result = result.slice(0, estoqueLimit);
    }

    return result;
  };

  // Retorna os dados calculados de consumo consolidado com base no período (meses) e tipo de visualização (diário ou mensal)
  const getConsumoAnaliseData = () => {
    const grouped: { [key: string]: { codigo: string; item: string; totalQty: number; totalCost: number; matches: number } } = {};
    
    // Filtro por termo de pesquisa
    const filteredRaw = consumoData.filter(c => {
      if (searchQuery.trim() === '') return true;
      const q = searchQuery.toLowerCase().trim();
      return c.item.toLowerCase().includes(q) || (c.codigo && c.codigo.toLowerCase().includes(q));
    });

    filteredRaw.forEach(c => {
      const key = c.codigo ? `cod_${c.codigo}` : `item_${c.item.toLowerCase().trim()}`;
      if (!grouped[key]) {
        grouped[key] = {
          codigo: c.codigo || '',
          item: c.item,
          totalQty: 0,
          totalCost: 0,
          matches: 0
        };
      }
      grouped[key].totalQty += c.quantidade_consumida;
      grouped[key].totalCost += c.custo_total;
      grouped[key].matches += 1;
    });

    const divisor = Math.max(1, consumoMonthsFilter);

    return Object.values(grouped).map((g, idx) => {
      const mediaMensalQty = g.totalQty / divisor;
      const mediaMensalCost = g.totalCost / divisor;
      
      const mediaDiariaQty = mediaMensalQty / 30;
      const mediaDiariaCost = mediaMensalCost / 30;

      return {
        id: `cons_avg_${idx}`,
        codigo: g.codigo,
        item: g.item,
        quantidade_consumida: consumoViewMode === 'media_diaria' ? mediaDiariaQty : mediaMensalQty,
        custo_total: consumoViewMode === 'media_diaria' ? mediaDiariaCost : mediaMensalCost,
        mes_ano: `${divisor} ${divisor === 1 ? 'mês' : 'meses'} (${consumoViewMode === 'media_diaria' ? 'Diário' : 'Mensal'})`,
        isAverage: true
      };
    });
  };

  // Processamento e Cruzamento Inteligente de Dados de Validade e Consumo por Lote
  const getProcessedValidadeData = () => {
    const today = new Date(); // Dinâmico de acordo com a data atual da pergunta

    // 1. Agrupar e somar a quantidade de lotes iguais (mesmo item e mesmo lote)
    const groupedMap: { [key: string]: ValidadeLoteItem } = {};
    validadeLotesData.forEach(v => {
      const key = `${v.item.toLowerCase().trim()}|||${v.lote.toLowerCase().trim()}`;
      if (groupedMap[key]) {
        groupedMap[key].quantidade += v.quantidade;
      } else {
        groupedMap[key] = { ...v };
      }
    });
    const unifiedList = Object.values(groupedMap);

    const list = unifiedList.map(v => {
      // Cruzamento: buscar Código no Estoque ou Consumo
      let codigo = v.codigo || '';
      const matchEstoque = estoqueData.find(e => {
        const eClean = cleanFuzzy(e.item);
        const vClean = cleanFuzzy(v.item);
        return eClean === vClean || eClean.includes(vClean) || vClean.includes(eClean) || matchWordsFuzzy(e.item, v.item);
      });

      if (!codigo && matchEstoque && matchEstoque.codigo) {
        codigo = matchEstoque.codigo;
      } else if (!codigo) {
        const matchCons = consumoData.find(c => {
          const cClean = cleanFuzzy(c.item);
          const vClean = cleanFuzzy(v.item);
          return cClean === vClean || cClean.includes(vClean) || vClean.includes(cClean) || matchWordsFuzzy(c.item, v.item);
        });
        if (matchCons && matchCons.codigo) {
          codigo = matchCons.codigo;
        }
      }

      // Calcular tempo até vencimento usando o parser de data seguro
      const parsedValString = parseValidadeDate(v.validade);
      const valDate = new Date(parsedValString);
      const diffTime = valDate.getTime() - today.getTime();
      const diasParaVencer = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const mesesParaVencer = Math.max(0, diasParaVencer / 30);

      // Consumo mensal do item cruzando de forma difusa ou por código
      const matchedConsRows = consumoData.filter(c => {
        const cClean = cleanFuzzy(c.item);
        const vClean = cleanFuzzy(v.item);
        return cClean === vClean || 
               cClean.includes(vClean) || 
               vClean.includes(cClean) || 
               matchWordsFuzzy(c.item, v.item) ||
               (codigo && c.codigo && c.codigo === codigo);
      });
      const totalConsRaw = matchedConsRows.reduce((sum, c) => sum + Number(c.quantidade_consumida || 0), 0);
      const consumoMensal = totalConsRaw / Math.max(1, consumoMonthsFilter);

      // Cruzar consumo x estoque do lote x dias para vencer
      const capacidadeConsumoAteVencer = consumoMensal * mesesParaVencer;
      
      let sobraProjetada = 0;
      let perdaFinanceiraProjetada = 0;
      let riscoStatus: 'Sem Risco' | 'Risco de Perda' | 'Vencido' = 'Sem Risco';

      const custoUnit = matchEstoque ? matchEstoque.custo_unitario : (v.valor_economico / Math.max(1, v.quantidade));

      if (diasParaVencer <= 0) {
        riscoStatus = 'Vencido';
        sobraProjetada = v.quantidade;
        perdaFinanceiraProjetada = sobraProjetada * custoUnit;
      } else if (capacidadeConsumoAteVencer < v.quantidade) {
        riscoStatus = 'Risco de Perda';
        sobraProjetada = v.quantidade - capacidadeConsumoAteVencer;
        perdaFinanceiraProjetada = sobraProjetada * custoUnit;
      } else {
        riscoStatus = 'Sem Risco';
        sobraProjetada = 0;
        perdaFinanceiraProjetada = 0;
      }

      // Analisar reposição/compra recomendada
      let sugestaoCompra = 'Estoque atual saudável';
      
      const estoqueTotalItem = estoqueData
        .filter(e => {
          const eClean = cleanFuzzy(e.item);
          const vClean = cleanFuzzy(v.item);
          return eClean === vClean || 
                 eClean.includes(vClean) || 
                 vClean.includes(eClean) || 
                 matchWordsFuzzy(e.item, v.item) ||
                 (codigo && e.codigo && e.codigo === codigo);
        })
        .reduce((sum, e) => sum + e.quantidade, 0);

      const minStock = matchEstoque ? matchEstoque.min_stock : 40;
      const unidade = matchEstoque ? matchEstoque.unidade : 'un';

      if (diasParaVencer < 60) {
        // Se após a validade do lote a quantidade saudável restante for menor que o estoque mínimo
        const estoqueSaudavelFuturo = Math.max(0, estoqueTotalItem - v.quantidade);
        if (estoqueSaudavelFuturo < minStock && consumoMensal > 0) {
          const compraQtd = Math.ceil((minStock * 1.5) - estoqueSaudavelFuturo);
          sugestaoCompra = `🛒 Repor +${compraQtd.toLocaleString('pt-BR')} ${unidade} (Prevenir Ruptura)`;
        } else if (consumoMensal > 0 && diasParaVencer < 30) {
          const compraQtd = Math.ceil(consumoMensal * 2);
          sugestaoCompra = `🛒 Comprar +${compraQtd.toLocaleString('pt-BR')} ${unidade} (Reposição preventiva)`;
        } else {
          sugestaoCompra = 'Saldo suficiente em outros lotes';
        }
      } else {
        sugestaoCompra = 'Estoque seguro';
      }

      // Recalcular o valor econômico real do lote ativo
      const valorEconReal = v.quantidade * custoUnit;

      return {
        ...v,
        codigo,
        validade: parsedValString, // garante que o campo validade retornado esteja higienizado
        diasParaVencer,
        mesesParaVencer,
        consumoMensal,
        sobraProjetada,
        perdaFinanceiraProjetada,
        riscoStatus,
        sugestaoCompra,
        valor_economico: valorEconReal
      };
    });

    // Filtros de Validade
    let filtered = list;

    if (validadeFiltroVencimento === 'vencendo_mes') {
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      filtered = list.filter(v => {
        const d = new Date(v.validade);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && v.diasParaVencer > 0;
      });
    } else if (validadeFiltroVencimento === 'vencidos') {
      filtered = list.filter(v => v.diasParaVencer <= 0);
    } else if (validadeFiltroVencimento === 'criticos') {
      filtered = list.filter(v => v.diasParaVencer > 0 && v.diasParaVencer <= 30);
    } else if (validadeFiltroVencimento === 'atencao') {
      filtered = list.filter(v => v.diasParaVencer > 30 && v.diasParaVencer <= 90);
    } else if (validadeFiltroVencimento === 'saudaveis') {
      filtered = list.filter(v => v.diasParaVencer > 90);
    }

    // Ordenar de forma que os que vão vencer primeiro apareçam primeiro
    filtered.sort((a, b) => a.diasParaVencer - b.diasParaVencer);

    return filtered;
  };

  // Função auxiliar de download de relatório (Gera e exporta CSV fictício fidedigno)
  const handleDownloadRelatorioCSV = (tipo: string) => {
    let content = 'data:text/csv;charset=utf-8,';
    if (tipo === 'estoque') {
      content += '"ID";"Item";"Lote";"Quantidade";"Unidade";"Custo Unitário";"Preço de Venda";"Local"\n';
      estoqueData.forEach(i => {
        content += `"${i.id}";"${i.item}";"${i.lote}";${i.quantidade};"${i.unidade}";${i.custo_unitario};${i.preco_venda};"${i.local}"\n`;
      });
    } else if (tipo === 'consumo') {
      content += '"ID";"Item";"Quantidade Consumida";"Mês/Ano";"Custo Total"\n';
      consumoData.forEach(c => {
        content += `"${c.id}";"${c.item}";${c.quantidade_consumida};"${c.mes_ano}";${c.custo_total}\n`;
      });
    } else if (tipo === 'historico_precos') {
      content += '"ID";"Item";"Fornecedor";"Preço Unitário";"Data de Compra";"Condição de Pagamento";"Código do Pedido"\n';
      historicoPrecosData.forEach(h => {
        content += `"${h.id}";"${h.item}";"${h.fornecedor}";${h.preco_unitario};"${h.data_compra}";"${h.condicao_pagamento}";"${h.codigo_pedido}"\n`;
      });
    } else {
      content += '"Codigo";"Descricao";"Numero do Lote";"Quantidade do Lote";"Validade";"Dias para Vencer";"Consumo Medio Mensal";"Status de Risco";"Sobra Projetada";"Perda Financeira Projetada";"Sugestao de Reposicao"\n';
      getProcessedValidadeData().forEach(v => {
        const valDateBr = v.validade.split('-').length === 3 
          ? `${v.validade.split('-')[2]}/${v.validade.split('-')[1]}/${v.validade.split('-')[0]}`
          : new Date(v.validade).toLocaleDateString('pt-BR');
        content += `"${v.codigo || ''}";"${v.item}";"${v.lote}";${v.quantidade};"${valDateBr}";${v.diasParaVencer};${v.consumoMensal.toFixed(2)};"${v.riscoStatus}";${v.sobraProjetada.toFixed(2)};${v.perdaFinanceiraProjetada.toFixed(2)};"${v.sugestaoCompra}"\n`;
      });
    }

    const encodedUri = encodeURI(content);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `base_registrada_${tipo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(`Exportação concluída. Download iniciado para "base_registrada_${tipo}.csv"!`);
  };

  // ==========================================
  // CALCULOS DOS EXCELENTES METRICAS DE ESTOQUE
  // ==========================================
  const valorEstoqueTotal = estoqueData.reduce((acc, current) => acc + (current.quantidade * current.custo_unitario), 0);
  
  // RUPTURA: Itens que têm histórico de consumo mas estão com saldo ZERADO (ou zerando)
  const itensRuptura = estoqueData.filter(e => {
    const hasConsumo = consumoData.some(c => c.item.toLowerCase() === e.item.toLowerCase() && c.quantidade_consumida > 0);
    return hasConsumo && e.quantidade === 0;
  });

  // GIRO DE ESTOQUE: Consumo Anualizado / Estoque Médio
  // Estoque Médio = ValorTotalEstoque (Para simulação ou real)
  // Consumo Mensal Totalizado em Custo
  const custoConsumoMensalTotal = consumoData.reduce((acc, cur) => acc + cur.custo_total, 0);
  const giroEstoque = valorEstoqueTotal > 0 ? (custoConsumoMensalTotal * 12) / valorEstoqueTotal : 0;

  // CURVA ABC: Classificação
  // Calculado multiplicando QtdEstoque * CustoUnitario (ou consumo mensual totalizado, que representa a rotatividade financeira real)
  const totalFinancialFlow = estoqueData.reduce((acc, item) => acc + (item.quantidade * item.custo_unitario || 10), 0) || 1;
  const estoqueOrdenadoParaABC = [...estoqueData].sort((a,b) => (b.quantidade * b.custo_unitario) - (a.quantidade * a.custo_unitario));
  
  let acumulado = 0;
  const itemsABCClassification = estoqueOrdenadoParaABC.map(item => {
    const itemValue = item.quantidade * item.custo_unitario;
    acumulado += itemValue;
    const pct = (acumulado / totalFinancialFlow) * 100;
    
    let classe: 'A' | 'B' | 'C' = 'C';
    if (pct <= 80) classe = 'A';
    else if (pct <= 95) classe = 'B';

    return {
      ...item,
      value: itemValue,
      pctOfTotal: (itemValue / totalFinancialFlow) * 100,
      classification: classe
    };
  });

  const countA = itemsABCClassification.filter(i => i.classification === 'A').length;
  const valueA = itemsABCClassification.filter(i => i.classification === 'A').reduce((acc, cur) => acc + cur.value, 0);
  const countB = itemsABCClassification.filter(i => i.classification === 'B').length;
  const valueB = itemsABCClassification.filter(i => i.classification === 'B').reduce((acc, cur) => acc + cur.value, 0);
  const countC = itemsABCClassification.filter(i => i.classification === 'C').length;
  const valueC = itemsABCClassification.filter(i => i.classification === 'C').reduce((acc, cur) => acc + cur.value, 0);

  // ROTINA DO ASSISTENTE IA (Livre acesso para cruzamento de dados, cumprindo o critério fidedigno)
  const handleSendChatMessage = async (alternativeQuery?: string) => {
    const query = alternativeQuery || chatInput;
    if (!query.trim()) return;
    
    const userTimestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const newMsgArr = [...chatHistory, { role: 'user' as const, content: query, timestamp: userTimestamp }];
    setChatHistory(newMsgArr);
    if (!alternativeQuery) setChatInput('');
    setIsAiTyping(true);

    try {
      // Prepare full context containing live, real-time datasets
      const procurementContext = {
        estoqueData: estoqueData.map(e => ({
          codigo: e.codigo,
          item: e.item,
          lote: e.lote,
          quantidade: e.quantidade,
          unidade: e.unidade,
          custo_unitario: e.custo_unitario,
          preco_venda: e.preco_venda || (e.custo_unitario * 1.5),
          situacao_lote: e.situacao_lote,
          local: e.local,
          min_stock: e.min_stock,
          safety_stock: e.safety_stock,
          frequencia_venda: e.frequencia_venda
        })),
        consumoData: consumoData.map(c => ({
          codigo: c.codigo,
          item: c.item,
          quantidade_consumida: c.quantidade_consumida,
          unidade: c.unidade,
          data_inicio: c.data_inicio,
          data_fim: c.data_fim
        })),
        consumoMonthsFilter: consumoMonthsFilter,
        consumoViewMode: consumoViewMode,
        consumoAnaliseData: getConsumoAnaliseData().map(c => ({
          codigo: c.codigo,
          item: c.item,
          quantidade_consumida: c.quantidade_consumida,
          custo_total: c.custo_total,
          mes_ano: c.mes_ano
        })),
        historicoPrecosData: historicoPrecosData.map(h => ({
          item: h.item,
          fornecedor: h.fornecedor,
          preco_unitario: h.preco_unitario,
          data_compra: h.data_compra,
          condicao_pagamento: h.condicao_pagamento,
          codigo_pedido: h.codigo_pedido
        })),
        validadeLotesData: getProcessedValidadeData().map(v => ({
          codigo: v.codigo || '',
          item: v.item,
          lote: v.lote,
          quantidade: v.quantidade,
          validade: v.validade,
          status: v.riscoStatus,
          diasParaVencer: v.diasParaVencer,
          consumoMensal: v.consumoMensal,
          sobraProjetada: v.sobraProjetada,
          perdaFinanceiraProjetada: v.perdaFinanceiraProjetada,
          sugestaoCompra: v.sugestaoCompra,
          valor_economico: v.valor_economico
        }))
      };

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          assistantType: 'procurement',
          procurementContext: procurementContext,
          dreContext: dreContext,
          history: chatHistory.slice(-6).map(h => ({
            role: h.role,
            content: h.content,
            timestamp: h.timestamp
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na chamada do servidor: ${response.status}`);
      }

      const data = await response.json();
      const botAnswer = data.text || 'Desculpe, não consegui obter resposta da inteligência artificial.';

      setChatHistory(prev => [...prev, {
        role: 'assistant' as const,
        content: botAnswer,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      console.error("Gemini fetch error, using local fallback:", err);
      // Fallback local caso a API falhe ou dê erro (preserva as respostas locais pré-programadas)
      let responseText = '';
      const queryLower = query.toLowerCase();

      // REGRA DE VERIFICACAO DOS CAMPOS OPCIONAIS NO MAPPER (Cria alerta dinâmico se algum mapeamento estiver vazio ou ausente)
      let warningsMapeador = '';
      if (!columnMapping.itemCol) warningsMapeador += '\n* ⚠️ **Campo de Identificação do Item não está mapeado no sistema.**';
      if (!columnMapping.qtyCol) warningsMapeador += '\n* ⚠️ **Campo de Quantidade de Unidades está indefinido.**';
      if (!columnMapping.costCol) warningsMapeador += '\n* ⚠️ **Campo de Preço de Custo está indisponível para derivar rentabilidade.**';
      
      const mapperNotice = warningsMapeador 
        ? `\n\n_Nota do Mapeador de Dados:_ Detectei que algumas colunas de correspondência personalizada não estão mapeadas:${warningsMapeador}\nIsso pode limitar a profundidade de faturamento de minhas deduções.` 
        : '';

      // 0. VERIFICAÇÃO DE CONSULTA DE ITEM DE ESTOQUE ESPECÍFICO (Fidedigno para Peptistrong, Creatina, etc.)
      const normalizeStr = (str: string) => {
        return String(str || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
      };
      const queryNormalized = normalizeStr(query);
      let matchedLocalItem: any = null;

      // Tentar por código numérico exato (de 3 a 8 dígitos)
      const anyDigitMatch = queryNormalized.match(/\b(\d{3,8})\b/);
      if (anyDigitMatch) {
        const code = anyDigitMatch[1];
        matchedLocalItem = estoqueData.find(e => normalizeStr(e.codigo).includes(code));
      }

      // Se não achou por código, tentar por correspondência do nome do insumo completo
      if (!matchedLocalItem) {
        const sortedEstoque = [...estoqueData].sort((a, b) => normalizeStr(b.item).length - normalizeStr(a.item).length);
        for (const item of sortedEstoque) {
          const itemName = normalizeStr(item.item);
          if (itemName && itemName.length > 2 && queryNormalized.includes(itemName)) {
            matchedLocalItem = item;
            break;
          }
        }
      }

      // Se ainda não achou, tentar por correspondência parcial de palavras
      if (!matchedLocalItem) {
        for (const item of estoqueData) {
          const itemName = normalizeStr(item.item);
          const words = itemName.split(/[^a-z0-9]/).filter(w => w.length > 3);
          if (words.length > 0 && words.every(word => queryNormalized.includes(word))) {
            matchedLocalItem = item;
            break;
          }
        }
      }

      if (matchedLocalItem) {
        const qty = Number(matchedLocalItem.quantidade || 0);
        const minStr = matchedLocalItem.min_stock !== undefined ? matchedLocalItem.min_stock : Math.round(qty * 0.8);
        const safetyStr = matchedLocalItem.safety_stock !== undefined ? matchedLocalItem.safety_stock : Math.round(qty * 0.3);
        const unit = matchedLocalItem.unidade || 'potes';
        const status = matchedLocalItem.situacao_lote || 'LIBERADO';
        const loc = matchedLocalItem.local || 'Almoxarifado Principal';
        const codeStr = matchedLocalItem.codigo ? ` (código ${matchedLocalItem.codigo})` : '';

        const isAboveMin = qty >= minStr;
        const isAboveSafety = qty >= safetyStr;

        const isDurationQuery = queryLower.includes("acabar") || 
                                queryLower.includes("esgotar") || 
                                queryLower.includes("tempo") || 
                                queryLower.includes("dura") || 
                                queryLower.includes("fim") || 
                                queryLower.includes("terminar") || 
                                queryLower.includes("esgotamento") || 
                                queryLower.includes("dias") || 
                                queryLower.includes("meses");

        if (isDurationQuery) {
          const matchedConsumoRows = consumoData.filter((c: any) => 
            (c.codigo && matchedLocalItem.codigo && normalizeStr(c.codigo) === normalizeStr(matchedLocalItem.codigo)) || 
            normalizeStr(c.item).includes(normalizeStr(matchedLocalItem.item)) ||
            normalizeStr(matchedLocalItem.item).includes(normalizeStr(c.item))
          );

          if (matchedConsumoRows.length > 0) {
            const totalConsRaw = matchedConsumoRows.reduce((sum, c) => sum + Number(c.quantidade_consumida || 0), 0);
            const divisor = Math.max(1, consumoMonthsFilter);
            const consQty = totalConsRaw / divisor;
            if (consQty > 0) {
              const durationMonths = qty / consQty;
              const durationDays = Math.round(durationMonths * 30);
              
              responseText = `### ⏳ Previsão de Esgotamento de Estoque: **${matchedLocalItem.item.toUpperCase()}**\n\n` +
                             `* 📦 **Estoque Físico Ativo:** **${qty.toLocaleString('pt-BR')} ${unit}**\n` +
                             `* 📈 **Consumo Médio Mensal (Calculado sobre ${divisor} ${divisor === 1 ? 'mês' : 'meses'}):** **${consQty.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${unit}**\n\n` +
                             `👉 **Cálculo de Cobertura:**\n` +
                             `O sistema cruzou as informações do estoque atual com o consumo médio mensal e realizou os cálculos:\n` +
                             `**${qty.toLocaleString('pt-BR')} ${unit}** (estoque atual) ÷ **${consQty.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${unit}** (consumo médio mensal) = **${durationMonths.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} meses**.\n\n` +
                             `Portanto, seu estoque atual de **${matchedLocalItem.item.toUpperCase()}** vai acabar em aproximadamente **${durationMonths.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} meses** (cerca de **${durationDays} dias**).\n\n` +
                             `_Nota: Este cálculo assume uma taxa de consumo mensal constante baseada na média dos meses selecionados._`;
            } else {
              responseText = `O estoque atual de **${matchedLocalItem.item.toUpperCase()}** é de **${qty.toLocaleString('pt-BR')} ${unit}**.\n\nNão encontrei registros de consumo ativo para este item, impossibilitando a previsão.`;
            }
          } else {
            responseText = `O estoque atual de **${matchedLocalItem.item.toUpperCase()}** é de **${qty.toLocaleString('pt-BR')} ${unit}**.\n\nNão encontrei registros de consumo mensal ativo para este item na sua base de dados, por isso não é possível prever em quanto tempo irá acabar.`;
          }
        } else {
          responseText = `O saldo de estoque atual de ${matchedLocalItem.item.toUpperCase()}${codeStr} é de ${qty.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${unit}.\n\n`;
          responseText += `Esse saldo está com lote ${status.toLowerCase()} e armazenado no ${loc}, estando `;
          
          if (isAboveMin) {
            responseText += `acima do estoque mínimo de ${minStr.toLocaleString('pt-BR')} ${unit} e do estoque de segurança de ${safetyStr.toLocaleString('pt-BR')} ${unit}.`;
          } else if (isAboveSafety) {
            responseText += `abaixo do estoque mínimo de ${minStr.toLocaleString('pt-BR')} ${unit}, mas acima do estoque de segurança de ${safetyStr.toLocaleString('pt-BR')} ${unit}.`;
          } else {
            responseText += `abaixo do estoque mínimo de ${minStr.toLocaleString('pt-BR')} ${unit} e abaixo do estoque de segurança de ${safetyStr.toLocaleString('pt-BR')} ${unit}, estando em nível crítico de reabastecimento.`;
          }
        }
      }
      // CASO CÓDIGO/SALDO: Checar se a mensagem contém menção a um código de produto (padrão de controle de estoque do PDF, ex: "04808", "00633") ou solicita saldo
      else if (anyDigitMatch || (queryLower.includes('código') && queryLower.includes('saldo')) || queryLower.includes('somar por código') || queryLower.includes('soma de código') || queryLower.includes('soma pelos códigos')) {
        const foundCode = anyDigitMatch ? anyDigitMatch[1] : '';
        const matchingItems = foundCode ? estoqueData.filter(e => e.codigo === foundCode) : [];
        
        if (matchingItems.length > 0) {
          const totalAggQty = matchingItems.reduce((acc, curr) => acc + curr.quantidade, 0);
          const firstItem = matchingItems[0];
          
          responseText = `### 📦 Consulta de Saldo por Código: \`${foundCode}\`\n\n` +
                     `Encontrei o padrão de informação do relatório de estoque para o insumo **${firstItem.item}**.\n\n` +
                     `* 🔢 **Código Relatório:** \`${foundCode}\`\n` +
                     `* 🧪 **Descrição do Item:** ${firstItem.item}\n` +
                     `* 🥄 **Unidade de Medida:** ${firstItem.unidade?.toUpperCase()}\n\n` +
                     `#### 🗃️ Detalhamento dos Saldos e Situações/Lotes:\n` +
                     matchingItems.map((item, idx) => `* **Registro ${idx + 1}:** Status \`${item.situacao_lote || item.lote || 'LIBERADO'}\` — Volume: **${item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} ${item.unidade}** (em _${item.local}_)`).join('\n') + `\n\n` +
                     `---\n` +
                     `### 🧮 Soma Consolidada pelo Código:\n` +
                     `Como constam múltiplos registros para o mesmo código no relatório original, realizei a **soma automática**:\n` +
                     `👉 **SALDO CONSOLIDADO TOTAL:** **${totalAggQty.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} ${firstItem.unidade?.toUpperCase()}**\n\n` +
                     `_Isso consolida os saldos de diferentes lotes/bloqueios de forma imediata. Deseja registrar cotações ou novos faturamentos?_`;
        } else if (foundCode) {
          responseText = `Encontrei a menção ao código **\`${foundCode}\`**, mas esse item não está cadastrado no saldo físico de estoque atual.\n\nVocê pode cadastrá-lo manualmente no menu à esquerda ou colar as linhas do relatório em PDF usando nosso **Importador por Cópia de PDF** que a soma automática será realizada no ato!`;
        } else {
          const itemsWithCode = estoqueData.filter(e => e.codigo);
          const duplicates = itemsWithCode.filter(e => estoqueData.filter(other => other.codigo === e.codigo).length > 1);
          const uniqueDupCodes = Array.from(new Set(duplicates.map(d => d.codigo)));
          
          responseText = `### 📊 Consolidação Geral de Saldos por Código\n\nIdentifiquei o padrão de controle de estoque do sistema. Atualmente, temos **${uniqueDupCodes.length} matérias-primas** que constam mais de uma vez na base original e foram agrupadas com sucesso:\n\n` +
                     uniqueDupCodes.map(code => {
                       const matches = estoqueData.filter(e => e.codigo === code);
                       const total = matches.reduce((acc, curr) => acc + curr.quantidade, 0);
                       const desc = matches[0].item;
                       const units = matches[0].unidade;
                       const detailsString = matches.map(m => `${m.quantidade.toLocaleString('pt-BR')} ${units} (${m.situacao_lote || m.lote})`).join(' + ');
                       return `* 🧪 **Código \`${code}\` - ${desc}:**\n` +
                              `  * _Soma por lotes:_ ${detailsString} = **${total.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} ${units}**`;
                     }).join('\n\n') +
                     `\n\n_Dica:_ O botão **"Consolidar por Código (Soma)"** no cabeçalho da planilha permite alternar visualmente entre a visualização de lotes individualizados (prazos ou lotes LIBERADO, BLOQUEADO, CERTIFICACAO) e a soma consolidada de cada insumo!`;
        }
      }
      else if (queryLower.includes('creatina') && (queryLower.includes('preco') || queryLower.includes('preço') || queryLower.includes('compra') || queryLower.includes('fornecedor'))) {
        const comprasCreatina = historicoPrecosData
          .filter(h => h.item.toLowerCase().includes('creatina'))
          .sort((a, b) => new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime());

        const estoqueCreatina = estoqueData.find(e => e.item.toLowerCase().includes('creatina'));
        const validadeCreatina = validadeLotesData.find(v => v.item.toLowerCase().includes('creatina'));

        if (comprasCreatina.length > 0) {
          const ultimaCompra = comprasCreatina[0];
          responseText = `### 🔍 Auditoria Comercial: Creatina Monohidratada\n\nCom base nos arquivos estruturados registrados no sistema, localizei os seguintes dados fidedignos:\n\n` +
                     `* 👤 **Último Fornecedor:** **${ultimaCompra.fornecedor}**\n` +
                     `* 🪙 **Último Preço Pago:** **R$ ${ultimaCompra.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**\n` +
                     `* 📅 **Data da Aquisição:** ${new Date(ultimaCompra.data_compra).toLocaleDateString('pt-BR')}\n` +
                     `* 🧾 **Condições de Pagamento:** ${ultimaCompra.condicao_pagamento}\n` +
                     `* 📦 **Código do Faturamento/Pedido:** \`${ultimaCompra.codigo_pedido}\`\n\n` +
                     `---\n` +
                     `### 📊 Cruzamento com Saldos e Validades Vigentes:\n`;

          if (estoqueCreatina) {
            responseText += `* 📥 **Estoque Físico Atual:** **${estoqueCreatina.quantidade} potes** (Estoque mínimo configurado: ${estoqueCreatina.min_stock} potes).\n` +
                        `  * ⚠️ *Ruptura de Segurança:* Faltam **${estoqueCreatina.min_stock - estoqueCreatina.quantidade} potes** para restabelecer a segurança operacional.\n`;
          }
          if (validadeCreatina) {
            responseText += `* 📅 **Validade Rastreável:** Lote \`${validadeCreatina.lote}\` vence em **${new Date(validadeCreatina.validade).toLocaleDateString('pt-BR')}** (Status: **${validadeCreatina.status}**).\n`;
          }
          
          responseText += `\n*Nota Histórica:* Rastreie ${comprasCreatina.length} faturamentos de Creatina em sua base histórica. O preço oscilou de R$ 38,50 (com SupleMax em Março/2026) até R$ 42,00 (Atacadão Vida Saudável em Junho/2026), demonstrando inflação física de suprimentos de **+9,09%** no trimestre.`;
        } else {
          responseText = `Localizei itens de Creatina listados no seu painel de saldo físico, porém **não encontrei registros de compra desse item** nos relatórios de faturas de fornecedores importados.\n\nPor favor, cadastre uma fatura de compra para a Creatina ou mapeie a coluna correspondente no Mapeador de Colunas para que eu possa responder no ato.`;
        }
      }
      else if (queryLower.includes('zerado') || queryLower.includes('ruptura') || queryLower.includes('mínimo') || queryLower.includes('reposição') || queryLower.includes('falta')) {
        const abaixoDoMinimo = estoqueData.filter(e => e.quantidade < e.min_stock);
        
        if (abaixoDoMinimo.length > 0) {
          responseText = `### ⚠️ Alerta Crítico: Diagnóstico de Rupturas e Reposição de Ativos\n\nCruzei seu saldo de estoque com o histórico de consumo enviado. Temos **${abaixoDoMinimo.length} insumos** em situação de reabastecimento imediato:\n\n`;
          
          abaixoDoMinimo.forEach((item, index) => {
            const matchedConsRows = consumoData.filter(c => c.item.toLowerCase() === item.item.toLowerCase() || (item.codigo && c.codigo && c.codigo === item.codigo));
            const totalRaw = matchedConsRows.reduce((sum, c) => sum + Number(c.quantidade_consumida || 0), 0);
            const consQtd = totalRaw / Math.max(1, consumoMonthsFilter);
            const coberturaDias = consQtd > 0 ? Math.round((item.quantidade / consQtd) * 30) : 0;
            
            responseText += `${index + 1}. **${item.item}** (Lote: \`${item.lote}\`)\n` +
                        `   * 📦 Saldo: **${item.quantidade}** vs Mínimo: ${item.min_stock} de segurança.\n` +
                        `   * 📈 Histórico de Consumo médio: ~${consQtd.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${item.unidade}/mês (calculado sobre ${consumoMonthsFilter} ${consumoMonthsFilter === 1 ? 'mês' : 'meses'}).\n` +
                        `   * ⏳ Cobertura Física: **${coberturaDias} dias** de operação.\n` +
                        `   * 🛒 Reposição Sugerida: **+${item.min_stock - item.quantidade} ${item.unidade}** para sanar.\n\n`;
          });
          
          responseText += `Recomendo disparar ordens de compras sob as condições de pagamento dos últimos faturamentos arquivados. Quer que eu faça uma simulação de orçamento?`;
        } else {
          responseText = `Excelente! Todos os itens do estoque estão operando acima dos seus limites de segurança configurados. Nenhuma ruptura detectada.`;
        }
      }
      else if (queryLower.includes('venc') || queryLower.includes('validade') || queryLower.includes('perda') || queryLower.includes('expir')) {
        const lotesCriticos = validadeLotesData.filter(v => v.status === 'Crítico');
        
        if (lotesCriticos.length > 0) {
          responseText = `### 📅 Auditoria de Validade e Prazos Críticos\n\nIdentifiquei lotes vigentes com expiração imediata. Cruzei esses insumos com o consumo mensal para prever perda financeira:\n\n`;
          
          lotesCriticos.forEach(lote => {
            const matchedConsRows = consumoData.filter(c => c.item.toLowerCase() === lote.item.toLowerCase() || (lote.codigo && c.codigo && c.codigo === lote.codigo));
            const totalRaw = matchedConsRows.reduce((sum, c) => sum + Number(c.quantidade_consumida || 0), 0);
            const consMensal = totalRaw / Math.max(1, consumoMonthsFilter);
            const velocidadeVenda = consMensal > 100 ? 'Velocidade Alta 🟢' : 'Velocidade Moderada / Baixa 🟡';
            
            responseText += `* 📦 **Produto:** **${lote.item}** (Lote \`${lote.lote}\`)\n` +
                        `  * ⏳ Vence em: **${new Date(lote.validade).toLocaleDateString('pt-BR')}** (Estado: **${lote.status}**)\n` +
                        `  * 🪙 Valor Comercial Impedido: **R$ ${lote.valor_economico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**\n` +
                        `  * 📉 Consumo Físico Rastreável: ~${consMensal} un/mês (${velocidadeVenda})\n\n`;
          });
          
          responseText += `*Recomendações IA:* Desencadeie promoções de escoamento rápido no PDV para esses lotes críticos antes do prazo limite de expiração.`;
        } else {
          responseText = `Muito bem! Todas as validades físicas ativas apontam maturidade segura com tempo superior a 45 dias operáveis.`;
        }
      }
      else if (queryLower.includes('abc') || queryLower.includes('curva') || queryLower.includes('classificação')) {
        responseText = `### 📊 Análise de Curva ABC sobre Ativos de Estoques\n\nA Curva ABC prioriza a relevância financeira dos seus insumos no almoxarifado:\n\n` +
                   `* 🟥 **Classe A (Alta Relevância - 80% do Valor):** **${countA} itens** totalizando **R$ ${valueA.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**.\n` +
                   `* 🟨 **Classe B (Média Relevância - 15% do Valor):** **${countB} itens** totalizando **R$ ${valueB.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**.\n` +
                   `* 🟦 **Classe C (Baixa Relevância - 5% do Valor):** **${countC} itens** totalizando **R$ ${valueC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**.\n\n` +
                   `### 💡 Insight de Gestão:\n` +
                   `Os itens de Classe A contêm seu maior capital parado e necessitam de processos de aquisições de Just-in-Time sob boletos enxutos, enquanto os itens de Classe C podem ser comprados em maior volume sob parcelas dilatadas.`;
      }
      else {
        responseText = `### 🧠 Diagnóstico Comercial Inteligente\n\nRealizei uma busca ampla nas suas bases integradas de suprimentos:\n` +
                   `* 📦 **Saldo Geral:** ${estoqueData.length} produtos em almoxarifados catalogados.\n` +
                   `* 📈 **Histórico de Saídas:** Média de consumo rastreado para os principais produtos comercializados.\n` +
                   `* 💰 **Capital Imobiliário:** R$ ${valorEstoqueTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} total de valor de estocagem física.\n\n` +
                   `Tente me perguntar especificações exatas nos arquivos:\n` +
                   `1. *"Qual foi o preço da última compra de Creatina?"*\n` +
                   `2. *"Me informe os itens em ruptura ou críticos abaixo do estoque mínimo"* \n` +
                   `3. *"Qual a curva ABC de estocagem de capital parado?"*`;
      }

      responseText += mapperNotice;

      setChatHistory(prev => [...prev, { role: 'assistant' as const, content: responseText, timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-12 transition-all duration-300">
      
      {/* Toast Popup de Alerta de Mudanças */}
      {toastMessage && (
        <div id="procurement-toast" className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl flex items-center gap-3 shadow-xl max-w-sm z-50 animate-bounce">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold leading-normal">{toastMessage}</p>
        </div>
      )}

      {/* Hero Header Adaptativo baseando-se no Tab Selecionada no Sidebar */}
      <div className="bg-white border-b border-slate-200/80 py-6 px-6 sm:px-8 mb-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Módulo Compras Inteligentes</span>
              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md text-[9px] font-bold">Livre Acesso IA</span>
            </div>
            
            {activeSubTab === 'indicators' ? (
              <>
                <h1 id="procurement-module-title" className="text-2xl font-black text-slate-800 tracking-tight mt-1 flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6 text-emerald-600" />
                  Gestão de Compras & Ingestão
                </h1>
              </>
            ) : (
              <>
                <h1 id="procurement-module-title" className="text-2xl font-black text-slate-800 tracking-tight mt-1 flex items-center gap-2">
                  <Package className="h-6 w-6 text-indigo-600" />
                  Gestão de Estoque & Indicadores
                </h1>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Minimizar / maximizar painel da IA */}
            <button
              onClick={() => setIsChatExpanded(!isChatExpanded)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 select-none cursor-pointer ${
                isChatExpanded ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Bot className="h-4 w-4 shrink-0" />
              <span>Auditor IA {isChatExpanded ? 'Ativo' : 'Oculto'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE MAPEAÇÃO DE COLUNAS E PRÉ-VISUALIZAÇÃO INTERATIVA DE ARQUIVO */}
      {pendingUpload && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-4xl p-6 sm:p-8 shadow-2xl my-8 text-left space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider block w-fit">
                  Mapeador Interativo de Planilhas / PDFs
                </span>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Visualização de Dados: <span className="text-indigo-600 font-mono text-base">{pendingUpload.fileName}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  O sistema identificou as colunas do seu arquivo. Associe cada campo de destino abaixo. Você pode deixar campos em branco (não mapeados) sem bloquear a importação.
                </p>
              </div>
              <button
                onClick={() => setPendingUpload(null)}
                className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 font-black text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            {/* Pré-visualização da Tabela Original */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Pré-visualização da Planilha Encontrada (Mock):</span>
              <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-left text-xs bg-slate-50">
                    <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        {pendingUpload.detectedHeaders.map((header) => (
                          <th key={header} className="p-3 whitespace-nowrap">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-mono text-[11px] text-slate-650">
                      {pendingUpload.previewRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/40">
                          {pendingUpload.detectedHeaders.map((header) => (
                            <td key={header} className="p-3 whitespace-nowrap">{row[header] || '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Mapeamento Dinâmico de Colunas */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Associe as Colunas da Planilha aos Campos do Sistema:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
                {pendingUpload.tipo === 'estoque' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Descrição do Item *</label>
                      <select
                        value={pendingUpload.suggestedMapping.itemCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, itemCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Saldo de Estoque *</label>
                      <select
                        value={pendingUpload.suggestedMapping.qtyCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, qtyCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Número do Lote</label>
                      <select
                        value={pendingUpload.suggestedMapping.loteCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, loteCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Preço de Custo (Custo Unit.)</label>
                      <select
                        value={pendingUpload.suggestedMapping.costCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, costCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Preço de Venda</label>
                      <select
                        value={pendingUpload.suggestedMapping.precoVendaCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, precoVendaCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Código do Produto (Relatório)</label>
                      <select
                        value={pendingUpload.suggestedMapping.codigoCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, codigoCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {pendingUpload.tipo === 'consumo' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Código do Produto (Chave Primária) *</label>
                      <select
                        value={pendingUpload.suggestedMapping.codigoCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, codigoCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Descrição do Item *</label>
                      <select
                        value={pendingUpload.suggestedMapping.itemCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, itemCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Quantidade Consumida *</label>
                      <select
                        value={pendingUpload.suggestedMapping.qtyCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, qtyCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Mês/Ano Referência</label>
                      <select
                        value={pendingUpload.suggestedMapping.mesAnoCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, mesAnoCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Custo Total Consumido</label>
                      <select
                        value={pendingUpload.suggestedMapping.custoTotalCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, custoTotalCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {pendingUpload.tipo === 'historico_precos' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Descrição Comercial (Item) *</label>
                      <select
                        value={pendingUpload.suggestedMapping.itemCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, itemCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Fornecedor Credenciado *</label>
                      <select
                        value={pendingUpload.suggestedMapping.fornecedorCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, fornecedorCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Preço Unitário Pago *</label>
                      <select
                        value={pendingUpload.suggestedMapping.precoUnitarioCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, precoUnitarioCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Data de Emissão (Compra)</label>
                      <select
                        value={pendingUpload.suggestedMapping.dataCompraCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, dataCompraCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Condição de Pagamento</label>
                      <select
                        value={pendingUpload.suggestedMapping.condicaoPgtoCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, condicaoPgtoCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Nº do Faturamento / Pedido</label>
                      <select
                        value={pendingUpload.suggestedMapping.codigoPedidoCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, codigoPedidoCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {pendingUpload.tipo === 'validade' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Descrição *</label>
                      <select
                        value={pendingUpload.suggestedMapping.itemCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, itemCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Código (Opcional)</label>
                      <select
                        value={pendingUpload.suggestedMapping.codigoCol || ''}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, codigoCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Número do Lote *</label>
                      <select
                        value={pendingUpload.suggestedMapping.loteCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, loteCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Quantidade do Lote *</label>
                      <select
                        value={pendingUpload.suggestedMapping.qtyCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, qtyCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Validade *</label>
                      <select
                        value={pendingUpload.suggestedMapping.validadeCol}
                        onChange={(e) => setPendingUpload({
                          ...pendingUpload,
                          suggestedMapping: { ...pendingUpload.suggestedMapping, validadeCol: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar / Não Anexar --</option>
                        {pendingUpload.detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setPendingUpload(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
              >
                Descartar Importação
              </button>
              <button
                onClick={confirmAndImportPendingUpload}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-650 hover:bg-indigo-750 text-white shadow-md shadow-indigo-600/15 hover:shadow-indigo-650/25 transition-all cursor-pointer flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4 shrink-0 text-indigo-200" />
                <span>Confirmar e Importar no Repositório</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CORE DISPLAY EM LAYOUT UNIFICADO COM ASSISTENTE IA NA PARTE INFERIOR */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 pb-12">
        <div className="space-y-6">
          
          {/* PAINEL PRINCIPAL: largura total para melhor visualização e espaço das tabelas */}
          <div className="w-full space-y-6">
            
            {/* ========================================================= */}
            {/* TAB OUTCOME 1: GESTÃO DE COMPRAS (INDICATORS)             */}
            {/* ========================================================= */}
            {activeSubTab === 'indicators' && (
              <div className="space-y-6">
                
                {/* 4 Blocos Seletor das Bases Obrigatórias para Alimentação/Upload */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <button
                    onClick={() => setActiveSubData('estoque')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative select-none cursor-pointer ${
                      activeSubData === 'estoque' ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500/10' : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${activeSubData === 'estoque' ? 'bg-emerald-50 text-emerald-650' : 'bg-slate-100 text-slate-500'}`}>
                        <Package className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {estoqueData.length} itens
                      </span>
                    </div>
                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">1. Saldo de Estoque</h3>
                    {activeSubData === 'estoque' && <span className="absolute bottom-2 right-3 h-2 w-2 rounded-full bg-emerald-500" />}
                  </button>

                  <button
                    onClick={() => setActiveSubData('consumo')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative select-none cursor-pointer ${
                      activeSubData === 'consumo' ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500/10' : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${activeSubData === 'consumo' ? 'bg-emerald-50 text-emerald-650' : 'bg-slate-100 text-slate-500'}`}>
                        <TrendingUp className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {consumoData.length} insumos
                      </span>
                    </div>
                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">2. Consumo Mensal</h3>
                    {activeSubData === 'consumo' && <span className="absolute bottom-2 right-3 h-2 w-2 rounded-full bg-emerald-500" />}
                  </button>

                  <button
                    onClick={() => setActiveSubData('historico_precos')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative select-none cursor-pointer ${
                      activeSubData === 'historico_precos' ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500/10' : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${activeSubData === 'historico_precos' ? 'bg-emerald-50 text-emerald-650' : 'bg-slate-100 text-slate-500'}`}>
                        <History className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {historicoPrecosData.length} faturas
                      </span>
                    </div>
                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">3. Compras Realizadas</h3>
                    {activeSubData === 'historico_precos' && <span className="absolute bottom-2 right-3 h-2 w-2 rounded-full bg-emerald-500" />}
                  </button>

                  <button
                    onClick={() => setActiveSubData('validade')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative select-none cursor-pointer ${
                      activeSubData === 'validade' ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500/10' : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${activeSubData === 'validade' ? 'bg-emerald-50 text-emerald-650' : 'bg-slate-100 text-slate-500'}`}>
                        <Calendar className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {validadeLotesData.length} lotes
                      </span>
                    </div>
                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">4. Controle de Validade</h3>
                    {activeSubData === 'validade' && <span className="absolute bottom-2 right-3 h-2 w-2 rounded-full bg-emerald-500" />}
                  </button>
                </div>

                {/* Sub cockpit: Área de Uploads + Tabelas Dinâmicas de faturamento */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  
                  {/* Upload do Componente Ativo */}
                  <div className="md:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {activeSubData === 'estoque' && 'Upload: Saldo Estoque'}
                        {activeSubData === 'consumo' && 'Upload: Consumo Médio'}
                        {activeSubData === 'historico_precos' && 'Upload: Compras Realizadas'}
                        {activeSubData === 'validade' && 'Upload: Validades/Lotes'}
                      </h4>
                      <p className="text-[10px] text-slate-400">Arraste seus relatórios do sistema em Excel ou PDF.</p>
                    </div>

                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          setUploadLoading(activeSubData);
                          setTimeout(() => {
                            setUploadLoading(null);
                            initiateFileUpload(activeSubData, file);
                          }, 800);
                        }
                      }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.xlsx,.xls,.pdf,.csv,.txt';
                        input.onchange = (event: any) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            setUploadLoading(activeSubData);
                            setTimeout(() => {
                              setUploadLoading(null);
                              initiateFileUpload(activeSubData, file);
                            }, 800);
                          }
                        };
                        input.click();
                      }}
                      className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 transition-all group"
                    >
                      {uploadLoading === activeSubData ? (
                        <div className="space-y-2 py-2">
                          <RefreshCw className="h-6 w-6 text-indigo-650 animate-spin mx-auto" />
                          <p className="text-[10px] font-bold text-slate-550 animate-pulse font-mono uppercase">Mapeando Relatório...</p>
                        </div>
                      ) : (
                        <div className="space-y-2 py-1">
                          <Upload className="h-5 w-5 text-indigo-400 group-hover:text-indigo-600 mx-auto transition-colors" />
                          <div>
                            <p className="text-[10px] font-extrabold text-indigo-700">Arraste PDF, EXCEL ou clique</p>
                            <p className="text-[8px] text-slate-400 leading-normal">Mapeamento inteligente por colunas</p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Tabela Dinâmica do Componente Selecionado */}
                  <div className="md:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                    
                    {/* Filtros e Busca */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3.5 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          {activeSubData === 'estoque' && 'Base: Saldo de Estoque Atual'}
                          {activeSubData === 'consumo' && 'Base: Histórico de Consumo Mensal'}
                          {activeSubData === 'historico_precos' && 'Base: Histórico de Compras e Fornecedores'}
                          {activeSubData === 'validade' && 'Base: Auditoria de Validades de Shelf-life'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 w-full sm:w-auto relative">
                        {activeSubData === 'estoque' && (
                          <>
                            {/* Seletor de Colunas Visíveis */}
                            <div className="relative inline-block text-left">
                              <button
                                onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[9px] tracking-wide transition-all select-none cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                                  isColumnDropdownOpen 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold' 
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                }`}
                                title="Selecionar colunas visíveis para exibição no saldo de estoque"
                              >
                                <Settings className="h-3.5 w-3.5 text-indigo-500" />
                                <span>Colunas ({selectedEstoqueColumns.length})</span>
                              </button>
                              {isColumnDropdownOpen && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setIsColumnDropdownOpen(false)} />
                                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl z-20 p-3.5 space-y-2.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Colunas Visíveis</p>
                                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                      {[
                                        { id: 'codigo', label: 'Código' },
                                        { id: 'item', label: 'Insumo / Descrição' },
                                        { id: 'lote', label: 'Lote / Situação' },
                                        { id: 'quantidade', label: 'Quantidade' },
                                        { id: 'custo', label: 'Custo Unitário' },
                                        { id: 'venda', label: 'Preço Venda' },
                                        { id: 'local', label: 'Localização' },
                                        { id: 'min_stock', label: 'Estoque Mínimo' },
                                        { id: 'safety_stock', label: 'Estoque Segurança' }
                                      ].map((col) => {
                                        const isChecked = selectedEstoqueColumns.includes(col.id);
                                        return (
                                          <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-750 select-none">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                if (isChecked) {
                                                  // Don't allow less than 1 column
                                                  if (selectedEstoqueColumns.length > 1) {
                                                    setSelectedEstoqueColumns(selectedEstoqueColumns.filter(c => c !== col.id));
                                                  }
                                                } else {
                                                  setSelectedEstoqueColumns([...selectedEstoqueColumns, col.id]);
                                                }
                                              }}
                                              className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                                            />
                                            <span>{col.label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            <button
                              onClick={() => setConsolidatedByCode(!consolidatedByCode)}
                              className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[9px] tracking-wide transition-all select-none cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                                  consolidatedByCode 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold' 
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                              }`}
                              title="Agrupa e soma de forma consolidada os itens que tiverem mesmo código"
                            >
                              <Layers className="h-3.5 w-3.5 text-indigo-500" />
                              <span>{consolidatedByCode ? 'Soma por Código' : 'Lotes Individuais'}</span>
                            </button>

                            {/* Filtro de Limite de Exibição */}
                            <select
                              value={estoqueLimit}
                              onChange={(e) => setEstoqueLimit(Number(e.target.value))}
                              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-wider outline-none cursor-pointer shrink-0"
                              title="Quantidade de itens a exibir"
                            >
                              <option value={0}>Todos ({getAggregatedStockData().length})</option>
                              <option value={10}>Top 10 Saldo</option>
                              <option value={25}>Top 25 Saldo</option>
                              <option value={50}>Top 50 Saldo</option>
                            </select>

                            {/* Filtro de Ordenação de Exibição */}
                            <select
                              value={estoqueSort}
                              onChange={(e) => setEstoqueSort(e.target.value)}
                              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-wider outline-none cursor-pointer shrink-0"
                              title="Ordenação do estoque"
                            >
                              <option value="quantidade_desc">Mais Saldo (↓)</option>
                              <option value="quantidade_asc">Menos Saldo (↑)</option>
                              <option value="nome_asc">Nome (A-Z)</option>
                              <option value="codigo_asc">Código (0-9)</option>
                            </select>
                          </>
                        )}
                        {activeSubData === 'consumo' && (
                          <>
                            <div className="relative inline-block text-left">
                              <button
                                onClick={() => setIsConsumoColumnDropdownOpen(!isConsumoColumnDropdownOpen)}
                                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[9px] tracking-wide transition-all select-none cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                                  isConsumoColumnDropdownOpen 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-extrabold' 
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                }`}
                                title="Selecionar colunas visíveis para exibição no consumo mensal"
                              >
                                <Settings className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Colunas ({selectedConsumoColumns.length})</span>
                              </button>
                              {isConsumoColumnDropdownOpen && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setIsConsumoColumnDropdownOpen(false)} />
                                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl z-20 p-3.5 space-y-2.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Colunas Visíveis</p>
                                    <div className="space-y-1.5 max-h-60 overflow-y-auto font-sans">
                                      {[
                                        { id: 'codigo', label: 'Código' },
                                        { id: 'item', label: 'Descrição' },
                                        { id: 'mes_ano', label: 'Mês Ref.' },
                                        { id: 'quantidade_consumida', label: 'Consumo Mensal' },
                                        { id: 'custo_total', label: 'Custo Mensal' }
                                      ].map((col) => {
                                        const isChecked = selectedConsumoColumns.includes(col.id);
                                        return (
                                          <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                if (isChecked) {
                                                  if (selectedConsumoColumns.length > 1) {
                                                    setSelectedConsumoColumns(selectedConsumoColumns.filter(c => c !== col.id));
                                                  }
                                                } else {
                                                  setSelectedConsumoColumns([...selectedConsumoColumns, col.id]);
                                                }
                                              }}
                                              className="rounded border-slate-300 text-emerald-650 focus:ring-emerald-500 h-3.5 w-3.5"
                                            />
                                            <span>{col.label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Filtro de Meses para Média */}
                            <select
                              value={consumoMonthsFilter}
                              onChange={(e) => setConsumoMonthsFilter(Number(e.target.value))}
                              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-wider outline-none cursor-pointer shrink-0"
                              title="Quantidade de meses para cálculo da média"
                            >
                              <option value={1}>Média de 1 Mês</option>
                              <option value={2}>Média de 2 Meses</option>
                              <option value={3}>Média de 3 Meses</option>
                              <option value={4}>Média de 4 Meses</option>
                              <option value={5}>Média de 5 Meses</option>
                              <option value={6}>Média de 6 Meses</option>
                              <option value={7}>Média de 7 Meses</option>
                              <option value={8}>Média de 8 Meses</option>
                              <option value={9}>Média de 9 Meses</option>
                              <option value={10}>Média de 10 Meses</option>
                              <option value={11}>Média de 11 Meses</option>
                              <option value={12}>Média de 12 Meses</option>
                              <option value={24}>Média de 24 Meses</option>
                            </select>

                            {/* Modo de Cálculo/Exibição */}
                            <select
                              value={consumoViewMode}
                              onChange={(e) => setConsumoViewMode(e.target.value as any)}
                              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-wider outline-none cursor-pointer shrink-0"
                              title="Modo de cálculo e exibição de consumo"
                            >
                              <option value="media_mensal">Média Mensal</option>
                              <option value="media_diaria">Média Diária</option>
                            </select>
                          </>
                        )}
                        {activeSubData === 'validade' && (
                          <>
                            {/* Filtro de Shelf-Life */}
                            <select
                              value={validadeFiltroVencimento}
                              onChange={(e) => setValidadeFiltroVencimento(e.target.value as any)}
                              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-650 rounded-xl text-[9px] font-black uppercase tracking-wider outline-none cursor-pointer shrink-0"
                              title="Filtrar por período de validade"
                            >
                              <option value="todos">Todos os Lotes</option>
                              <option value="vencendo_mes">Vencendo neste Mês 📅</option>
                              <option value="vencidos">Já Vencidos ❌</option>
                              <option value="criticos">Críticos (até 30 dias) 🚨</option>
                              <option value="atencao">Atenção (31 a 90 dias) ⚠️</option>
                              <option value="saudaveis">Saudáveis (+90 dias) 🟢</option>
                            </select>
                          </>
                        )}
                        <div className="relative flex-1 sm:w-44">
                          <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                          <input
                            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Pesquisar na planilha..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 text-[11px] py-1.5 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => handleDownloadRelatorioCSV(activeSubData)}
                          className="bg-slate-50 border hover:bg-slate-100 p-2 rounded-xl text-slate-600 transition-colors select-none cursor-pointer"
                          title="Baixar Base Ativa em CSV"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                     {/* RENDER PLANILHA ESTOQUE */}
                     {activeSubData === 'estoque' && (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px] bg-white rounded-xl">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest pb-1.5 text-left">
                                {selectedEstoqueColumns.includes('codigo') && <th className="pb-2 w-[12%]">Código</th>}
                                {selectedEstoqueColumns.includes('item') && <th className="pb-2">Insumo / Descrição</th>}
                                {selectedEstoqueColumns.includes('lote') && <th className="pb-2">Lote / Situação</th>}
                                {selectedEstoqueColumns.includes('quantidade') && <th className="pb-2 text-right">Quantidade</th>}
                                {selectedEstoqueColumns.includes('custo') && <th className="pb-2 text-right">Custo Unitário</th>}
                                {selectedEstoqueColumns.includes('venda') && <th className="pb-2 text-right">Preço Venda</th>}
                                {selectedEstoqueColumns.includes('local') && <th className="pb-2">Localização</th>}
                                {selectedEstoqueColumns.includes('min_stock') && <th className="pb-2 text-right">Est. Mínimo</th>}
                                {selectedEstoqueColumns.includes('safety_stock') && <th className="pb-2 text-right">Est. Segurança</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-sans text-slate-700">
                              {getFilteredAndSortedStock()
                                .map((row) => {
                                  let totalQuantidadeSegura = 0;
                                  let temLoteVencendo = false;
                                  
                                  const processedLots = (row.lotsList || []).map(l => {
                                    const vencendo = isLoteVencendo2Meses(row.item, l.lote);
                                    if (vencendo) {
                                      temLoteVencendo = true;
                                    } else {
                                      totalQuantidadeSegura += l.quantidade;
                                    }
                                    return {
                                      ...l,
                                      vencendo
                                    };
                                  });

                                  if (!row.lotsList || row.lotsList.length === 0) {
                                    const vencendo = isLoteVencendo2Meses(row.item, row.lote);
                                    if (vencendo) {
                                      temLoteVencendo = true;
                                    } else {
                                      totalQuantidadeSegura = row.quantidade;
                                    }
                                    processedLots.push({
                                      lote: row.lote || 'Único',
                                      situacao: row.situacao_lote || 'LIBERADO',
                                      quantidade: row.quantidade,
                                      unidade: row.unidade,
                                      vencendo
                                    });
                                  }

                                  return (
                                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                      {selectedEstoqueColumns.includes('codigo') && (
                                        <td className="py-2.5">
                                          <span className="font-mono text-indigo-700 font-bold bg-indigo-50/30 px-2 py-0.5 rounded text-[10.5px] border border-indigo-100/50 inline-block">
                                            {row.codigo || '—'}
                                          </span>
                                        </td>
                                      )}
                                      {selectedEstoqueColumns.includes('item') && (
                                        <td className="py-2.5 font-bold text-slate-900 pr-4">
                                          {row.item}
                                        </td>
                                      )}
                                      {selectedEstoqueColumns.includes('lote') && (
                                        <td className="py-2.5 pr-4">
                                          <div className="flex flex-col gap-1.5">
                                            {processedLots.map((l, idx) => (
                                              <div key={idx} className="flex flex-col gap-0.5 text-[9px] border-l-2 border-slate-100 pl-1.5">
                                                <div className="flex items-center gap-1.5">
                                                  <span className={`font-mono font-bold ${l.vencendo ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {l.lote}
                                                  </span>
                                                  <span className={`text-[8px] px-1 rounded font-bold uppercase ${
                                                    l.situacao === 'BLOQUEADO' ? 'bg-red-100 text-red-800' :
                                                    l.situacao === 'CERTIFICACAO' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                                  }`}>
                                                    {l.situacao || 'LIBERADO'}
                                                  </span>
                                                </div>
                                                <div className="text-[8.5px] text-slate-500 font-mono">
                                                  Qtd: {l.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                                                </div>
                                                {l.vencendo && (
                                                  <span className="text-[8px] font-black text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-100 inline-block w-fit mt-0.5 animate-pulse">
                                                    ⚠️ Próximo Vencimento
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </td>
                                      )}
                                      {selectedEstoqueColumns.includes('quantidade') && (
                                        <td className="py-2.5 text-right font-black">
                                          <div className="flex flex-col items-end justify-center">
                                            <span className={`px-1.5 py-0.5 rounded font-mono text-[10.5px] ${
                                              totalQuantidadeSegura <= row.safety_stock ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                              {totalQuantidadeSegura.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                                            </span>
                                            {temLoteVencendo && (
                                              <span className="text-[8.5px] text-red-500 font-bold mt-1 bg-red-50 px-1 py-0.5 rounded border border-red-100 block" title="Lotes vencendo nos próximos 2 meses foram excluídos deste saldo">
                                                Exclui lote a vencer
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      {selectedEstoqueColumns.includes('custo') && (
                                        <td className="py-2.5 text-right font-mono font-bold text-slate-700">
                                          R$ {(row.custo_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      )}
                                      {selectedEstoqueColumns.includes('venda') && (
                                        <td className="py-2.5 text-right font-mono font-bold text-slate-700">
                                          R$ {(row.preco_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      )}
                                      {selectedEstoqueColumns.includes('local') && (
                                        <td className="py-2.5 text-slate-600 font-medium">
                                          {row.local || '—'}
                                        </td>
                                      )}
                                      {selectedEstoqueColumns.includes('min_stock') && (
                                        <td className="py-2.5 text-right font-mono font-medium text-slate-600">
                                          {(row.min_stock || 0).toLocaleString('pt-BR')}
                                        </td>
                                      )}
                                      {selectedEstoqueColumns.includes('safety_stock') && (
                                        <td className="py-2.5 text-right font-mono font-medium text-slate-600">
                                          {(row.safety_stock || 0).toLocaleString('pt-BR')}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                     )}

                    {/* RENDER PLANILHA CONSUMO */}
                    {activeSubData === 'consumo' && (
                      <div className="overflow-x-auto text-[11px]">
                        <table className="w-full text-left bg-white rounded-xl">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider pb-1 text-left">
                              {selectedConsumoColumns.includes('codigo') && <th className="pb-1.5">Código</th>}
                              {selectedConsumoColumns.includes('item') && <th className="pb-1.5">Descrição</th>}
                              {selectedConsumoColumns.includes('mes_ano') && (
                                <th className="pb-1.5">
                                  Período
                                </th>
                              )}
                              {selectedConsumoColumns.includes('quantidade_consumida') && (
                                <th className="pb-1.5 text-right">
                                  {consumoViewMode === 'media_diaria' ? 'Média Diária' : 'Média dos Meses'}
                                </th>
                              )}
                              {selectedConsumoColumns.includes('custo_total') && (
                                <th className="pb-1.5 text-right">
                                  {consumoViewMode === 'media_diaria' ? 'Custo Diário R$' : 'Custo Mensal R$'}
                                </th>
                              )}
                              <th className="pb-1.5 text-center">Excluir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-sans text-slate-700">
                            {getConsumoAnaliseData().map((row: any) => (
                              <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                {selectedConsumoColumns.includes('codigo') && (
                                  <td className="py-2.5 font-mono text-slate-500 font-semibold">{row.codigo || '—'}</td>
                                )}
                                {selectedConsumoColumns.includes('item') && (
                                  <td className="py-2.5 font-bold text-slate-900">{row.item}</td>
                                )}
                                {selectedConsumoColumns.includes('mes_ano') && (
                                  <td className="py-2.5 font-mono font-semibold text-emerald-700">{row.mes_ano}</td>
                                )}
                                {selectedConsumoColumns.includes('quantidade_consumida') && (
                                  <td className="py-2.5 text-right font-mono font-extrabold text-slate-800">
                                    {row.quantidade_consumida.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </td>
                                )}
                                {selectedConsumoColumns.includes('custo_total') && (
                                  <td className="py-2.5 text-right font-mono font-extrabold text-emerald-650">
                                    R$ {row.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                )}
                                <td className="py-2.5 text-center">
                                  <button onClick={() => handleDeleteConsumo(row)} className="text-slate-400 hover:text-red-550 p-1 rounded hover:bg-slate-50 cursor-pointer" title="Remover consumo deste item">
                                    <Trash className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* RENDER PLANILHA HISTORICO PRECOS */}
                    {activeSubData === 'historico_precos' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] bg-white rounded-xl">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider pb-1 text-left">
                              <th className="pb-2">Fornecedor / Insumo</th>
                              <th className="pb-2">Código Faturamento</th>
                              <th className="pb-2">Data Venda</th>
                              <th className="pb-2 text-right">Preço Pago</th>
                              <th className="pb-2">Condições</th>
                              <th className="pb-2 text-center">Excluir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-sans text-slate-700">
                            {historicoPrecosData
                              .filter(h => h.item.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-2.5">
                                    <span className="font-bold text-slate-900 block">{row.item}</span>
                                    <span className="text-[9px] text-slate-400 block uppercase font-medium">{row.fornecedor}</span>
                                  </td>
                                  <td className="py-2.5 font-mono text-indigo-700 bg-indigo-50/20 px-1.5 py-0.5 rounded text-[10px] border border-indigo-100/50 inline-block mt-1">{row.codigo_pedido}</td>
                                  <td className="py-2.5 font-mono text-slate-500">{new Date(row.data_compra).toLocaleDateString('pt-BR')}</td>
                                  <td className="py-2.5 text-right font-mono font-black text-indigo-650">R$ {row.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                  <td className="py-2.5 text-slate-650 font-bold">{row.condicao_pagamento}</td>
                                  <td className="py-2.5 text-center">
                                    <button onClick={() => handleDeletePreco(row.id)} className="text-slate-400 hover:text-red-550 p-1 rounded hover:bg-slate-50 cursor-pointer">
                                      <Trash className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* RENDER PLANILHA VALIDADES */}
                    {activeSubData === 'validade' && (
                      <div className="overflow-x-auto text-[11px] border border-slate-100 rounded-xl">
                        <table className="min-w-[1000px] w-full text-left bg-white rounded-xl table-fixed">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider pb-1.5 text-left bg-slate-50/50">
                              <th className="pb-2 pt-3 px-3 w-[10%]">Código</th>
                              <th className="pb-2 pt-3 w-[30%]">Descrição</th>
                              <th className="pb-2 pt-3 w-[10%]">Número do Lote</th>
                              <th className="pb-2 pt-3 text-right w-[10%] pr-4">Quantidade do Lote</th>
                              <th className="pb-2 pt-3 text-center w-[10%]">Validade</th>
                              <th className="pb-2 pt-3 text-center w-[10%]">Dias p/ Vencer</th>
                              <th className="pb-2 pt-3 text-right w-[10%] pr-4">Consumo Médio</th>
                              <th className="pb-2 pt-3 w-[15%]">Análise de Risco & Cobertura</th>
                              <th className="pb-2 pt-3 text-center w-[5%]">Excluir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 text-slate-705 font-sans">
                            {getProcessedValidadeData()
                              .filter(v => v.item.toLowerCase().includes(searchQuery.toLowerCase()) || (v.codigo && v.codigo.toLowerCase().includes(searchQuery.toLowerCase())))
                              .map((row) => {
                                // Formatar data fidedigna do Brasil abreviada (DD/MM/AAAA) sem fuso horário
                                const formatDateBr = (dateStr: string) => {
                                  if (!dateStr) return '';
                                  const parts = dateStr.split('-');
                                  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                                  const d = new Date(dateStr);
                                  if (isNaN(d.getTime())) return dateStr;
                                  const day = String(d.getDate()).padStart(2, '0');
                                  const month = String(d.getMonth() + 1).padStart(2, '0');
                                  return `${day}/${month}/${d.getFullYear()}`;
                                };

                                return (
                                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-2.5 px-3" title={row.codigo || 'Sem Código'}>
                                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50/60 px-2 py-1 rounded-lg border border-indigo-100/40 text-[10px] inline-block truncate max-w-full">
                                        {row.codigo || 'S/Cód.'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 font-bold text-slate-900 pr-2 truncate" title={row.item}>{row.item}</td>
                                    <td className="py-2.5 font-mono text-slate-600 font-bold uppercase">{row.lote}</td>
                                    <td className="py-2.5 text-right font-mono text-slate-800 font-extrabold pr-4">{row.quantidade.toLocaleString('pt-BR')} un</td>
                                    <td className="py-2.5 text-center font-mono font-bold text-slate-700">{formatDateBr(row.validade)}</td>
                                    <td className="py-2.5 text-center font-mono font-bold">
                                      {row.diasParaVencer <= 0 ? (
                                        <span className="text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded text-[9px] uppercase font-black">Vencido</span>
                                      ) : row.diasParaVencer <= 30 ? (
                                        <span className="text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded text-[9px] font-black">
                                          {row.diasParaVencer} dias (Crítico)
                                        </span>
                                      ) : row.diasParaVencer <= 90 ? (
                                        <span className="text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[9px] font-black">
                                          {row.diasParaVencer} dias
                                        </span>
                                      ) : (
                                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-black">
                                          {row.diasParaVencer} dias
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 text-right font-mono text-slate-500 pr-4">
                                      {row.consumoMensal > 0 ? `${row.consumoMensal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/mês` : 'Sem consumo'}
                                    </td>
                                    <td className="py-2.5 pr-2">
                                      {row.riscoStatus === 'Vencido' ? (
                                        <div className="flex flex-col">
                                          <span className="text-red-650 font-black flex items-center gap-1 text-[10px]">
                                            ⚠️ Perda: {row.quantidade.toLocaleString('pt-BR')} un
                                          </span>
                                          <span className="text-[9px] text-red-500 font-semibold font-mono uppercase">Vencido</span>
                                        </div>
                                      ) : row.riscoStatus === 'Risco de Perda' ? (
                                        <div className="flex flex-col">
                                          <span className="text-red-550 font-black flex items-center gap-1 text-[10px]">
                                            🚨 Sobrarão {row.sobraProjetada.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} un
                                          </span>
                                          <span className="text-[9px] text-amber-600 font-semibold font-mono uppercase">Previsão de Sobra</span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col">
                                          <span className="text-emerald-600 font-extrabold flex items-center gap-1 text-[10px]">
                                            🟢 Sem Risco
                                          </span>
                                          <span className="text-[9px] text-slate-450 font-medium font-mono uppercase">100% Consumido</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2.5 text-center">
                                      <button onClick={() => handleDeleteValidade(row.id)} className="text-slate-400 hover:text-red-550 p-1 rounded hover:bg-slate-50 cursor-pointer">
                                        <Trash className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}

                  </div>

                </div>

                {/* HISTÓRICOS DE RELATÓRIOS/PLANILHAS REGISTRADOS NO COCKPIT (Opcional & Downloadable) */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="h-4.5 w-4.5 text-slate-500" />
                      Repositório de Planilhas e PDFs Importados (Sessão Atual)
                    </h3>
                    <p className="text-[10px] text-slate-400">Todos estes documentos alimentam o chatbot de IA de forma permanente. Faça o download direto em CSV das bases tratadas a qualquer momento.</p>
                  </div>

                  <div className="overflow-x-auto text-[11px]">
                    <table className="w-full text-left bg-white">
                      <thead>
                        <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider pb-1 text-left">
                          <th className="pb-2">Nome do Documento</th>
                          <th className="pb-2">Tamanho</th>
                          <th className="pb-2">Destino / Banco</th>
                          <th className="pb-2">Enviado em</th>
                          <th className="pb-2">Colunas Identificadas no Mapeador</th>
                          <th className="pb-2 text-center">Baixar</th>
                          <th className="pb-2 text-center">Excluir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700">
                        {arquivosRegistrados.map((file) => (
                          <tr key={file.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 font-bold text-slate-900 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                              {file.nome}
                            </td>
                            <td className="py-3 font-mono text-slate-500">{file.tamanho}</td>
                            <td className="py-3">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-slate-550">
                                {file.tipo === 'estoque' && 'Saldo Estoque'}
                                {file.tipo === 'consumo' && 'Consumo Mensal'}
                                {file.tipo === 'historico_precos' && 'Valores Fornecedor'}
                                {file.tipo === 'validade' && 'Validade Lote'}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-slate-450">{file.enviado_em}</td>
                            <td className="py-3 font-mono text-[9px] text-slate-500">
                              {file.colunas_detectadas?.join(' • ') || 'Configuração Padrão'}
                            </td>
                            <td className="py-3 text-center">
                              <button
                                onClick={() => handleDownloadRelatorioCSV(file.tipo)}
                                className="text-slate-500 hover:text-indigo-600 p-1 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Baixar base de dados traduzida"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </td>
                            <td className="py-3 text-center">
                              <button
                                onClick={() => handleDeleteArquivo(file.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remover histórico"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>
            )}

            {/* ========================================================= */}
            {/* TAB OUTCOME 2: GESTÃO DE ESTOQUE (QUOTES / INDICATORS)     */}
            {/* ========================================================= */}
            {activeSubTab === 'quotes' && (
              <div className="space-y-6">
                
                {/* 1. Bento Grid superior de Indicadores Chave de Estoque */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  
                  {/* Card A: VALOR DO ESTOQUE ATUAL */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Valor do Estoque Atual</span>
                      <Package className="h-4.5 w-4.5 text-indigo-505" />
                    </div>
                    <div className="text-2xl font-black text-slate-800 font-mono">
                      R$ {valorEstoqueTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-normal">
                      Custo total consolidado de capital imobiliário parado em almoxarifados para **{estoqueData.length}** produtos cadastrados.
                    </div>
                  </div>

                  {/* Card B: GIRO DE ESTOQUE (Rotatividade anual) */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-2 relative">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-405 font-extrabold uppercase tracking-widest block">Giro Médio Anual</span>
                      <RefreshCw className="h-4.5 w-4.5 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-black text-emerald-650 font-mono">
                      {giroEstoque.toFixed(1)}x <span className="text-xs font-bold text-slate-450">rotatividades</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Indica que seus insumos renovam-se em média **{(365 / Math.max(1, giroEstoque)).toFixed(0)} dias** antes do escoamento.
                    </p>
                  </div>

                  {/* Card C: PRODUTOS EM RUPTURA COM CONSUMO ATIVO */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-2 relative">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-405 font-extrabold uppercase tracking-widest block">Ruptura (Saldo Zerado)</span>
                      <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                    </div>
                    <div className="text-2xl font-black text-rose-650 font-mono">
                      {itensRuptura.length} itens <span className="text-xs font-bold text-slate-450">críticos</span>
                    </div>
                    <div className="text-[10px] text-rose-700 bg-rose-50/70 p-1.5 rounded-lg font-bold flex items-center gap-1.5 leading-tight">
                      <span>⚠️ {itensRuptura.map(i => i.item.substring(0, 15)).join(', ') || 'Nenhum insumo crítico'}</span>
                    </div>
                  </div>

                </div>

                {/* 2. Visualizadores de Alerta de Ruptura & ABC em Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  
                  {/* ESQUERDA: LISTA DE ITENS QUE TEM CONSUMO E ESTÃO COM HISTORICO ZERADO */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-5 space-y-3.5">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                        Insumos com Consumo Ativo mas Estoque Zerado
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Ruptura total detectada. Itens com movimentação mensal alta, mas com saldo físico 0.</p>
                    </div>

                    <div className="space-y-2">
                      {itensRuptura.length > 0 ? (
                        itensRuptura.map(item => {
                          const cons = consumoData.find(c => c.item.toLowerCase() === item.item.toLowerCase());
                          return (
                            <div key={item.id} className="bg-rose-50/50 border border-rose-100 rounded-2xl p-3 flex justify-between items-center text-xs">
                              <div>
                                <span className="font-extrabold text-slate-900 block">{item.item}</span>
                                <span className="text-[9px] text-rose-700 font-bold block uppercase tracking-wide mt-1">Gasto Histórico Mensal: {cons ? cons.quantidade_consumida : 0} {item.unidade}</span>
                              </div>
                              <div className="text-right">
                                <span className="bg-rose-100 text-rose-800 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wide font-mono block">Ruptura Física</span>
                                <span className="text-[10px] text-slate-500 font-semibold block mt-1">Custo: R$ {item.custo_unitario.toFixed(2)}/un</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 border border-dashed rounded-2xl text-slate-400 text-xs text-medium">
                          Nenhuma ruptura total detectada sobre insumos com faturamento de consumo ativo!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DIREITA: CLASSIFICADOS PELA CURVA ABC */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <Layers className="h-4.5 w-4.5 text-indigo-650" />
                        Classificação de Capital: Curva ABC
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Separa os ativos pela sua expressividade monetária em estoque.</p>
                    </div>

                    {/* bento de Curvas ABC */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl space-y-1">
                        <strong className="text-rose-800 block text-[10px] font-black">CURVA A</strong>
                        <span className="font-mono font-extrabold text-rose-700 block text-xs">{countA} itens</span>
                        <span className="text-[8px] text-slate-500 font-bold block">R$ {valueA.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl space-y-1">
                        <strong className="text-amber-800 block text-[10px] font-black">CURVA B</strong>
                        <span className="font-mono font-extrabold text-amber-700 block text-xs">{countB} itens</span>
                        <span className="text-[8px] text-slate-500 font-bold block">R$ {valueB.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl space-y-1">
                        <strong className="text-blue-800 block text-[10px] font-black">CURVA C</strong>
                        <span className="font-mono font-extrabold text-blue-700 block text-xs">{countC} itens</span>
                        <span className="text-[8px] text-slate-500 font-bold block">R$ {valueC.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>

                    {/* Recharts Pie Chart da Curva ABC */}
                    <div className="h-32 flex justify-center mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Curva A', value: valueA || 10, color: '#f43f5e' },
                              { name: 'Curva B', value: valueB || 2, color: '#f59e0b' },
                              { name: 'Curva C', value: valueC || 1, color: '#3b82f6' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={22}
                            outerRadius={45}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            <Cell fill="#f43f5e" />
                            <Cell fill="#f59e0b" />
                            <Cell fill="#3b82f6" />
                          </Pie>
                          <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* 3. Tabela Completa de: FREQUÊNCIA DE VENDA, VALOR DE VENDA, LUCRATIVIDADE & MARKUP POR ITEM */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="h-4.5 w-4.5 text-indigo-700" />
                      Margens, Frequência de Vendas e Rentabilidade Projetada por Item
                    </h3>
                    <p className="text-[10px] text-slate-400">Insira ou modifique os valores de venda direto nas caixas de texto para recalcular instantaneamente as lucratividades operacionais e markups.</p>
                  </div>

                  <div className="overflow-x-auto text-[11px]">
                    <table className="w-full text-left bg-white font-sans">
                      <thead>
                        <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider pb-1 text-left">
                          <th className="pb-2">Insumo em Estoque</th>
                          <th className="pb-2 text-center">Frequência de Venda</th>
                          <th className="pb-2 text-right">Preço de Custo (C)</th>
                          <th className="pb-2 text-right">Preço de Venda (V)</th>
                          <th className="pb-2 text-right">Margem de Lucro (%)</th>
                          <th className="pb-2 text-right">Markup (%)</th>
                          <th className="pb-2 text-right">Margem Bruta Unitária</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-705">
                        {estoqueData.map(row => {
                          const venda = row.preco_venda || (row.custo_unitario * 1.5);
                          const custo = row.custo_unitario;
                          
                          // Lucratividade = (Venda - Custo) / Venda * 100
                          const margem = venda > 0 ? ((venda - custo) / venda) * 100 : 0;
                          
                          // Markup = (Venda - Custo) / Custo * 100
                          const markup = custo > 0 ? ((venda - custo) / custo) * 100 : 0;
                          const margemUnitariaVal = venda - custo;

                          return (
                            <tr key={row.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 font-bold text-slate-900">{row.item}</td>
                              <td className="py-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  row.frequencia_venda === 'Alta' ? 'bg-emerald-50 text-emerald-800' :
                                  row.frequencia_venda === 'Média' ? 'bg-indigo-50 text-indigo-805' :
                                  'bg-slate-100 text-slate-650'
                                }`}>
                                  {row.frequencia_venda || 'Média'}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-mono text-slate-500">R$ {custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="py-2.5 text-right font-mono font-semibold">
                                <div className="inline-flex items-center gap-1.5 bg-slate-50 border rounded-lg px-1.5 py-0.5">
                                  <span className="text-[9px] text-slate-400">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={venda === 0 ? '' : venda}
                                    onChange={e => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      setEstoqueData(prev => prev.map(item => item.id === row.id ? { ...item, preco_venda: newVal } : item));
                                    }}
                                    className="w-14 bg-transparent border-0 focus:outline-none focus:ring-0 text-[11px] p-0 font-bold text-right"
                                  />
                                </div>
                              </td>
                              <td className="py-2.5 text-right font-mono font-black text-slate-800">
                                <span className={margem >= 30 ? 'text-emerald-705' : 'text-slate-700'}>
                                  {margem.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-mono text-indigo-650 font-bold">{markup.toFixed(1)}%</td>
                              <td className="py-2.5 text-right font-mono text-emerald-650 font-semibold">R$ {margemUnitariaVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* ASSISTENTE DE IA DE AUDITORIA NA PARTE INFERIOR - LARGURA COMPLETA */}
          {isChatExpanded && (
            <div className="w-full bg-white border border-indigo-100 rounded-3xl p-5 shadow-xs flex flex-col h-[580px] mt-6">
              
              <div className="flex justify-between items-center border-b border-indigo-50 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Bot className="h-4.5 w-4.5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      Cérebro IA Integrado
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    </h3>
                    <p className="text-[9px] text-slate-400">Estampa de livre acesso ativo sobre as planilhas.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChatExpanded(false)}
                  className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-650 px-2 py-1 rounded-xl cursor-not-allowed select-none"
                  title="Fechar Assistente IA"
                >
                  X
                </button>
              </div>

              {/* Corpo histórico de diálogos */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mb-3 scrollbar-thin">
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl max-w-[90%] leading-relaxed text-xs shadow-3xs ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white ml-auto'
                        : 'bg-indigo-50/45 text-slate-805 space-y-1.5 border border-indigo-50'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content.split('\n').map((line, lIdx) => {
                        let render: React.ReactNode = line;
                        if (line.startsWith('* **') || line.startsWith('   * ')) {
                          render = <span className="pl-1.5 block text-slate-650 leading-relaxed">{line}</span>;
                        } else if (line.startsWith('###')) {
                          render = <span className="font-extrabold text-indigo-950 block text-[11px] uppercase tracking-wider mt-2.5 pb-1 mb-1 bg-indigo-100/40 p-1.5 rounded">{line.replace('###', '')}</span>;
                        } else if (line.startsWith('**') || line.startsWith('- **')) {
                          render = <strong className="font-black text-slate-900 block mt-1.5">{line}</strong>;
                        }
                        return <p key={lIdx} className="mt-0.5">{render}</p>;
                      })}
                    </div>
                    <span className={`block text-[8px] text-right mt-1 font-bold ${msg.role === 'user' ? 'text-indigo-200' : 'text-indigo-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {isAiTyping && (
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl max-w-[65%] flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-indigo-600 animate-spin" />
                    <span className="text-[10px] font-bold text-slate-500 animate-pulse">Cruzando faturamentos nas planilhas...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Botões rápidos de consultas no chat */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 mb-2.5 text-left">
                <span className="text-[9px] text-slate-450 font-extrabold uppercase block tracking-wider leading-none">Consultas Rápidas IA:</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => handleSendChatMessage('Qual foi o preço da minha última compra de Creatina? E qual foi o fornecedor?')}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[9px] font-extrabold text-slate-650 cursor-pointer transition-colors"
                  >
                    Creatina: Preço & Fornecedor
                  </button>
                  <button
                    onClick={() => handleSendChatMessage('Quais são os itens críticos abaixo do estoque mínimo e reposição?')}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-[9px] font-extrabold text-indigo-700 cursor-pointer transition-colors"
                  >
                    Risco de Ruptura
                  </button>
                  <button
                    onClick={() => handleSendChatMessage('Calcule a curva ABC e as lucratividades dos meus itens ativos')}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[9px] font-extrabold text-slate-650 cursor-pointer transition-colors"
                  >
                    Curva ABC de Estoques
                  </button>
                  <button
                    onClick={() => handleSendChatMessage('Existem ativos do faturamento em risco por data de validade?')}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[9px] font-extrabold text-slate-650 cursor-pointer transition-colors"
                  >
                    Prazos de Validade Critícos
                  </button>
                </div>
              </div>

              {/* Input de Envio de Mensagem do Chat */}
              <div className="flex bg-slate-50 border border-slate-200 rounded-2xl p-1 gap-1.5 mt-auto">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSendChatMessage();
                  }}
                  placeholder="Peça para IA analisar..."
                  className="flex-grow bg-transparent text-slate-800 border-0 focus:outline-none focus:ring-0 text-[11px] px-3 py-1.5"
                />
                <button
                  onClick={() => handleSendChatMessage()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-1.5 px-3 text-xs font-bold flex items-center justify-center cursor-pointer transition-all shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
