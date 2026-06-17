import React, { useState, useRef, useMemo } from 'react';
import { Transaction, DreCategory, Rule } from '../types';
import { 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  ArrowUpDown, 
  X, 
  Check, 
  Save, 
  HelpCircle, 
  RefreshCw, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Briefcase,
  Layers,
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';

const MAPPING_CONFIG: {
  [key: string]: {
    label: string;
    originalLabel: string;
    normalizedAliases: string[];
  }
} = {
  operacao: {
    label: 'Operação',
    originalLabel: 'Operação',
    normalizedAliases: ['operacao', 'dataoperacao', 'data', 'datalancamentodadespesa']
  },
  conta: {
    label: 'Conta',
    originalLabel: 'Conta',
    normalizedAliases: ['conta', 'codigoconta', 'codigo']
  },
  descricaoConta: {
    label: 'Descrição - Conta',
    originalLabel: 'Descrição - Conta',
    normalizedAliases: ['descricaoconta', 'descricaodeconta', 'nomedaconta', 'nomeconta']
  },
  valor: {
    label: 'Valor',
    originalLabel: 'Valor',
    normalizedAliases: ['valor', 'valorr', 'total']
  }
};

const normalizeHeader = (val: string): string => {
  if (!val) return '';
  return String(val)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

import { PlanoContasItem } from '../types';

interface QuickRegisterRowProps {
  key?: React.Key;
  initialCode: string;
  excelDescription: string;
  initialClassificationId?: string;
  initialSubCategory?: string;
  initialCostType?: 'Fixo' | 'Variável' | 'N/A' | 'MEO';
  categories: DreCategory[];
  planoContas: PlanoContasItem[];
  onAddAccount: (newItem: Omit<PlanoContasItem, 'id'>) => Promise<{ success: boolean; error?: string }>;
}

function QuickRegisterRow({
  initialCode,
  excelDescription,
  initialClassificationId,
  initialSubCategory,
  initialCostType,
  categories,
  planoContas,
  onAddAccount
}: QuickRegisterRowProps) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(excelDescription);
  const [classificationId, setClassificationId] = useState(() => {
    return initialClassificationId || categories.filter(c => c.type !== 'formula')[0]?.id || '';
  });
  const [subCategory, setSubCategory] = useState(initialSubCategory || '');
  const [costType, setCostType] = useState<'Fixo' | 'Variável' | 'N/A' | 'MEO'>(initialCostType || 'Fixo');
  const [active, setActive] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  React.useEffect(() => {
    setName(excelDescription);
  }, [excelDescription]);

  const existingNames = useMemo(() => {
    return Array.from(new Set(planoContas.map(p => p.name).filter(Boolean))).sort();
  }, [planoContas]);

  const existingSubcategories = useMemo(() => {
    return Array.from(new Set(planoContas.map(p => p.subCategory).filter(Boolean))).sort();
  }, [planoContas]);

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setError("Código obrigatório");
      return;
    }
    if (!name.trim()) {
      setError("Nome obrigatório");
      return;
    }
    if (!subCategory.trim()) {
      setError("Subcategoria obrigatória");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await onAddAccount({
        code: code.trim(),
        name: name.trim().toUpperCase(),
        classificationId,
        subCategory: subCategory.trim(),
        costType,
        active
      });
      if (res.success) {
        setDone(true);
      } else {
        setError(res.error || "Erro de cadastro");
      }
    } catch (err: any) {
      setError(err?.message || "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <tr className="bg-emerald-50/50 text-[11px] text-emerald-800 transition-all font-semibold border-b border-slate-100">
        <td colSpan={8} className="py-2.5 px-3">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-mono">Código: {code}</span>
            <span>Conta <strong className="uppercase font-extrabold text-slate-800">{name}</strong> vinculada com sucesso ao Plano de Contas! (Subcategoria: {subCategory}, {costType}, {active ? 'Ativo' : 'Inativo'})</span>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50/80 transition-colors text-xs align-middle border-b border-slate-150">
      {/* 1. Código (digitar manualmente) */}
      <td className="py-2 px-1.5 w-[11%] min-w-[90px]">
        <input 
          type="text" 
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Ex: 10114"
          required
          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white font-mono font-bold text-slate-800"
        />
      </td>

      {/* Origin Excel Description */}
      <td className="py-2 px-1.5 max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap text-slate-500 font-sans italic" title={excelDescription}>
        {excelDescription}
      </td>

      {/* 2. Nome da Conta (relaciona a lista de nomes de contas cadastradas) */}
      <td className="py-2 px-1.5 w-[22%] min-w-[160px]">
        <input 
          type="text" 
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Selecione ou digite..."
          required
          list={`datalist-names-${initialCode}`}
          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white font-semibold uppercase text-slate-800"
        />
        <datalist id={`datalist-names-${initialCode}`}>
          {existingNames.map(n => <option key={n} value={n} />)}
        </datalist>
      </td>

      {/* 3. Agrupador DRE (relaciona a lista de nomes do Agrupador DRE) */}
      <td className="py-2 px-1.5 w-[20%] min-w-[170px]">
        <select 
          value={classificationId} 
          onChange={e => setClassificationId(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white cursor-pointer font-medium text-slate-800"
        >
          {categories.filter(c => c.type !== 'formula').map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </td>

      {/* 4. Subcategoria (relaciona a lista das subcategorias de contas cadastradas) */}
      <td className="py-2 px-1.5 w-[20%] min-w-[150px]">
        <input 
          type="text" 
          value={subCategory}
          onChange={e => setSubCategory(e.target.value)}
          placeholder="Selecione ou digite..."
          required
          list={`datalist-subs-${initialCode}`}
          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white font-medium text-slate-800"
        />
        <datalist id={`datalist-subs-${initialCode}`}>
          {existingSubcategories.map(sub => <option key={sub} value={sub} />)}
        </datalist>
      </td>

      {/* 5. Tipo Custo (Variável, fixo ou MEO) */}
      <td className="py-2 px-1.5 w-[11%] min-w-[90px]">
        <select 
          value={costType} 
          onChange={e => setCostType(e.target.value as any)}
          className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[11px] focus:ring-1 focus:ring-indigo-505 focus:outline-none focus:bg-white cursor-pointer font-semibold text-slate-700"
        >
          <option value="Fixo">Fixo</option>
          <option value="Variável">Variável</option>
          <option value="MEO">MEO</option>
          <option value="N/A">N/A</option>
        </select>
      </td>

      {/* 6. Status (Ativo, Inativo) */}
      <td className="py-2 px-1.5 w-[11%] min-w-[90px]">
        <select 
          value={active ? 'Ativo' : 'Inativo'} 
          onChange={e => setActive(e.target.value === 'Ativo')}
          className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[11px] focus:ring-1 focus:ring-indigo-505 focus:outline-none focus:bg-white cursor-pointer font-semibold text-slate-700"
        >
          <option value="Ativo">Ativo</option>
          <option value="Inativo">Inativo</option>
        </select>
      </td>

      {/* Actions */}
      <td className="py-2 px-2 text-center whitespace-nowrap w-[6%] min-w-[80px]">
        <button 
          type="button"
          onClick={() => handleRegister()}
          disabled={isSubmitting}
          className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[10px] py-1 rounded transition-colors disabled:bg-slate-300 cursor-pointer shadow-2xs uppercase tracking-tight"
        >
          {isSubmitting ? '...' : 'Cadastrar'}
        </button>
        {error && (
          <span className="text-[9px] text-rose-600 font-bold block mt-0.5 max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap" title={error}>
            {error}
          </span>
        )}
      </td>
    </tr>
  );
}

interface TransactionListProps {
  transactions: Transaction[];
  categories: DreCategory[];
  rules: Rule[];
  planoContas: PlanoContasItem[];
  pendingUnregisteredAccounts: string[];
  onAddAccount: (newItem: Omit<PlanoContasItem, 'id'>) => Promise<{ success: boolean; error?: string }>;
  onAddTransaction: (tx: Transaction) => void;
  onImportTransactions: (txs: Transaction[]) => void;
  onDeleteTransaction: (id: string) => void;
  onClearAll: () => void;
  onSaveManualRevenue: (competency: string, products: number, services: number, other: number, shareholder: number) => void;
  onUpdateTransaction: (updatedTx: Transaction) => void;
}

export default function TransactionList({
  transactions,
  categories,
  rules,
  planoContas,
  pendingUnregisteredAccounts,
  onAddAccount,
  onAddTransaction,
  onImportTransactions,
  onDeleteTransaction,
  onClearAll,
  onSaveManualRevenue,
  onUpdateTransaction
}: TransactionListProps) {
  // Drag & Drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Messages and errors
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Competency manual revenues state
  const [competency, setCompetency] = useState('2026-05');
  const [revProducts, setRevProducts] = useState<number>(0);
  const [revServices, setRevServices] = useState<number>(0);
  const [revOther, setRevOther] = useState<number>(0);
  const [revShareholder, setRevShareholder] = useState<number>(0);

  // Column mapping modal state
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [colMapping, setColMapping] = useState<{
    success: boolean;
    detected: { [key: string]: string | null };
    missing: string[];
  } | null>(null);

  // Temporary sheet state (for previewing columns)
  const [tempFile, setTempFile] = useState<{
    name: string;
    importDate: string;
    records: any[];
    totalValue: number;
  } | null>(null);

  // Raw mode Audit Log and Integrity Errors
  const [auditLog, setAuditLog] = useState<{
    excelRowsCount: number;
    importedRowsCount: number;
    excelTotalSum: number;
    importedTotalSum: number;
    diff: number;
    status: 'SUCCESS' | 'FAILED';
  } | null>(null);

  const [importErrors, setImportErrors] = useState<string[] | null>(null);

  // View interactions state
  const [searchText, setSearchText] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterCostType, setFilterCostType] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'value'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [realTimePeriod, setRealTimePeriod] = useState<string>('all');
  const [summaryLayer, setSummaryLayer] = useState<'kpi' | 'account' | 'class' | 'type'>('kpi');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  // Editing state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Helper: map spreadsheet classification to official DRE category
  const mapClassificacaoToCategory = (rawVal: string): string => {
    if (!rawVal) return 'opex_admin';
    const norm = normalizeHeader(rawVal);
    
    // Exact mapping for the user's official classifications
    if (norm === 'despesascompessoas' || norm === 'despesaspessoas' || norm === 'pessoas' || norm === 'pessoal' || norm === 'rh' || norm === 'clt') {
      return 'opex_people';
    }
    if (norm === 'marketing' || norm === 'comercial' || norm === 'marketingecomercial' || norm === 'vendas' || norm === 'comunicacao') {
      return 'opex_marketing';
    }
    if (norm === 'manutencao' || norm === 'manutencaosedeseinfra' || norm === 'sede' || norm === 'infra' || norm === 'infraestrutura' || norm === 'aluguel') {
      return 'opex_maintenance';
    }
    if (norm === 'servicos' || norm === 'servico' || norm === 'prestadoresdeservicoeconsultoria' || norm === 'prestadores' || norm === 'prestacao' || norm === 'consultoria') {
      return 'opex_contractors';
    }
    if (norm === 'tecnologia' || norm === 'sistemasecloudsaasservidores' || norm === 'sistemas' || norm === 'cloud' || norm === 'saas' || norm === 'ti' || norm === 'software') {
      return 'opex_systems';
    }
    if (norm === 'impostosetaxas' || norm === 'impostos' || norm === 'taxas' || norm === 'imposto' || norm === 'taxa' || norm === 'tributo' || norm === 'despesasadministrativasetaxas') {
      return 'opex_admin';
    }
    if (norm === 'financeiro' || norm === 'juros' || norm === 'tarifas' || norm === 'tarifabancaria') {
      return 'opex_admin';
    }
    if (norm === 'administrativo' || norm === 'administracao' || norm === 'admin' || norm === 'geral') {
      return 'opex_admin';
    }

    // Checking original category names
    let bestMatch = 'opex_admin';
    categories.forEach(c => {
      const catNorm = normalizeHeader(c.name);
      const catIdNorm = normalizeHeader(c.id);
      if (catNorm === norm || catIdNorm === norm) {
        bestMatch = c.id;
      }
    });

    // Substring contains
    if (bestMatch === 'opex_admin') {
      categories.forEach(c => {
        const catNorm = normalizeHeader(c.name);
        if (catNorm.includes(norm) || norm.includes(catNorm)) {
          bestMatch = c.id;
        }
      });
    }

    return bestMatch;
  };

  // Convert Date from Excel or Text
  const parseExcelDate = (dateVal: any): string => {
    if (!dateVal) return '2026-05-15';
    
    // 1. If it is already a JS Date object
    if (dateVal instanceof Date) {
      if (!isNaN(dateVal.getTime())) {
        const y = dateVal.getUTCFullYear();
        const m = String(dateVal.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dateVal.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    // 2. If it is a number (Excel Serial Date)
    if (typeof dateVal === 'number') {
      if (dateVal > 10000 && dateVal < 100000) {
        const utcDays = Math.floor(dateVal - 25569);
        const utcValue = utcDays * 86400;
        const dateInfo = new Date(utcValue * 1000);
        return dateInfo.toISOString().split('T')[0];
      }
    }

    // 3. If it is a string
    const cleanDateStr = String(dateVal).trim();
    if (!cleanDateStr) return '2026-05-15';

    // 3a. If the string consists entirely of digits (serial key as text)
    if (/^\d+(\.\d+)?$/.test(cleanDateStr)) {
      const num = parseFloat(cleanDateStr);
      if (num > 10000 && num < 100000) {
        const utcDays = Math.floor(num - 25569);
        const utcValue = utcDays * 86400;
        const dateInfo = new Date(utcValue * 1000);
        return dateInfo.toISOString().split('T')[0];
      }
    }

    // 3b. If the string is formatted with date separators
    const parts = cleanDateStr.split(/[-/]/);
    if (parts.length === 3) {
      const p0 = parts[0].trim();
      const p1 = parts[1].trim();
      const p2 = parts[2].trim();
      if (p0.length === 4) {
        return `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
      } else if (p2.length === 4) {
        return `${p2}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
      } else if (p2.length === 2) {
        return `20${p2}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
      }
    }

    // Fallback to JS standard Date parsing (e.g. ISO format)
    const parsed = new Date(cleanDateStr);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return '2026-05-15';
  };

  const isValidDateString = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

    // Strict reasonable business year range check (safeguards calendar entries)
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;

    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;

    return true;
  };

  const getRawDateComponents = (val: any): { day: number; month: number; year: number } | null => {
    if (!val) return null;

    if (val instanceof Date) {
      if (!isNaN(val.getTime())) {
        return {
          day: val.getUTCDate(),
          month: val.getUTCMonth() + 1,
          year: val.getUTCFullYear()
        };
      }
    }

    if (typeof val === 'number') {
      if (val > 10000 && val < 100000) {
        const utcDays = Math.floor(val - 25569);
        const utcValue = utcDays * 86400;
        const d = new Date(utcValue * 1000);
        return {
          day: d.getUTCDate(),
          month: d.getUTCMonth() + 1,
          year: d.getUTCFullYear()
        };
      }
    }

    const s = String(val).trim();
    if (!s) return null;

    if (/^\d+(\.\d+)?$/.test(s)) {
      const num = parseFloat(s);
      if (num > 10000 && num < 100000) {
        const utcDays = Math.floor(num - 25569);
        const utcValue = utcDays * 86400;
        const d = new Date(utcValue * 1000);
        return {
          day: d.getUTCDate(),
          month: d.getUTCMonth() + 1,
          year: d.getUTCFullYear()
        };
      }
    }

    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        if (parts[0].length === 4) {
          return { year: p0, month: p1, day: p2 };
        } else {
          const yr = parts[2].length === 2 ? 2000 + p2 : p2;
          return { year: yr, month: p1, day: p0 };
        }
      }
    }

    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return {
        day: parsed.getDate(),
        month: parsed.getMonth() + 1,
        year: parsed.getFullYear()
      };
    }

    return null;
  };

  // 1. Process Excel supporting full 11 columns or simplified 4 columns
  const handleExcelUpload = (file: File) => {
    setValidationError(null);
    setImportErrors(null);
    setAuditLog(null);
    setTempFile(null);
    setColMapping(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Extract headers first to perform physical column checks
        const headersLineAndMore = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (headersLineAndMore.length === 0) {
          setValidationError("Arquivo inválido. Utilize o modelo de importação.");
          return;
        }

        const rawHeaders = (headersLineAndMore[0] as any[]) || [];
        const fileHeaders = rawHeaders.map(h => String(h).trim()).filter(Boolean);

        const REQUIRED_HEADERS_11 = [
          'Vencimento',
          'Operação',
          'Mês',
          'Conta',
          'Descrição - Conta',
          'Classificação',
          'Descrição',
          'Custo',
          'Histórico',
          'Documento',
          'Valor'
        ];

        const is11Columns = REQUIRED_HEADERS_11.every(h => fileHeaders.includes(h)) && fileHeaders.filter(h => !REQUIRED_HEADERS_11.includes(h)).length === 0;
        
        let isSimplified4 = false;
        let dateHeaderName = 'Operação';

        if (!is11Columns) {
          const simplifiedRequired = ['Conta', 'Descrição - Conta', 'Valor'];
          const hasSimplifiedRequired = simplifiedRequired.every(h => fileHeaders.includes(h));
          const hasDateHeader = fileHeaders.includes('Data Operação') || fileHeaders.includes('Operação');
          
          if (hasSimplifiedRequired && hasDateHeader) {
            isSimplified4 = true;
            dateHeaderName = fileHeaders.includes('Data Operação') ? 'Data Operação' : 'Operação';
          }
        }

        if (!is11Columns && !isSimplified4) {
          let errorMsg = "A estrutura do arquivo não atende ao padrão de importação. ";
          const missing = REQUIRED_HEADERS_11.filter(h => !fileHeaders.includes(h));
          const extra = fileHeaders.filter(h => !REQUIRED_HEADERS_11.includes(h));
          if (missing.length > 0) {
            errorMsg += `Faltando colunas: ${missing.join(', ')}. `;
          }
          if (extra.length > 0) {
            errorMsg += `Colunas não permitidas encontradas: ${extra.join(', ')}.`;
          }
          setValidationError(errorMsg + " Para formato simplificado, use as colunas: 'Data Operação' (ou 'Operação'), 'Conta', 'Descrição - Conta' e 'Valor'.");
          return;
        }

        const excelRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];
        if (excelRows.length === 0) {
          setValidationError("A planilha de despesas está vazia ou sem dados válidos.");
          return;
        }

        const lineErrorsList: string[] = [];
        let totalExcelValueSum = 0;

        excelRows.forEach((row, idx) => {
          const rowNum = idx + 2;

          const valorVal = row['Valor'];
          if (valorVal === undefined || valorVal === null || String(valorVal).trim() === '') {
            lineErrorsList.push(`Erro na Linha ${rowNum}: O campo 'Valor' é obrigatório e está vazio.`);
          } else {
            let parsedNum = NaN;
            if (typeof valorVal === 'number') {
              parsedNum = valorVal;
            } else {
              const cleaned = String(valorVal).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
              parsedNum = parseFloat(cleaned);
            }
            if (isNaN(parsedNum)) {
              lineErrorsList.push(`Erro na Linha ${rowNum}: O campo 'Valor' ("${valorVal}") possui formato numérico inválido.`);
            } else {
              totalExcelValueSum += parsedNum;
            }
          }

          const dateVal = row[dateHeaderName];
          if (dateVal === undefined || dateVal === null || String(dateVal).trim() === '') {
            lineErrorsList.push(`Erro na Linha ${rowNum}: O campo '${dateHeaderName}' é obrigatório e está vazio.`);
          } else {
            const parsedDateStr = parseExcelDate(dateVal);
            if (!isValidDateString(parsedDateStr)) {
              lineErrorsList.push(`Erro na Linha ${rowNum}: A data de '${dateHeaderName}' ("${dateVal}") obtida foi inválida ou fora do padrão real do calendário.`);
            } else {
              const origComp = getRawDateComponents(dateVal);
              const parts = parsedDateStr.split('-');
              const importedYr = parseInt(parts[0], 10);
              const importedMn = parseInt(parts[1], 10);
              const importedDy = parseInt(parts[2], 10);
              
              if (origComp) {
                if (origComp.day !== importedDy || origComp.month !== importedMn || origComp.year !== importedYr) {
                  lineErrorsList.push(`Erro na Linha ${rowNum}: Divergência de auditoria de data em '${dateHeaderName}'. Original Excel: ${origComp.day}/${origComp.month}/${origComp.year} | Importado: ${importedDy}/${importedMn}/${importedYr}`);
                }
              }
            }
          }

          if (!isSimplified4) {
            const vencVal = row['Vencimento'];
            if (vencVal !== undefined && vencVal !== null && String(vencVal).trim() !== '') {
              const parsedVencStr = parseExcelDate(vencVal);
              if (!isValidDateString(parsedVencStr)) {
                lineErrorsList.push(`Erro na Linha ${rowNum}: A data de 'Vencimento' ("${vencVal}") obtida foi inválida ou fora do padrão real do calendário.`);
              } else {
                const origComp = getRawDateComponents(vencVal);
                const parts = parsedVencStr.split('-');
                const importedYr = parseInt(parts[0], 10);
                const importedMn = parseInt(parts[1], 10);
                const importedDy = parseInt(parts[2], 10);
                
                if (origComp) {
                  if (origComp.day !== importedDy || origComp.month !== importedMn || origComp.year !== importedYr) {
                    lineErrorsList.push(`Erro na Linha ${rowNum}: Divergência de auditoria de data no 'Vencimento'. Original Excel: ${origComp.day}/${origComp.month}/${origComp.year} | Importado: ${importedDy}/${importedMn}/${importedYr}`);
                  }
                }
              }
            }
          }

          const contaVal = row['Conta'];
          if (contaVal === undefined || contaVal === null || String(contaVal).trim() === '') {
            lineErrorsList.push(`Erro na Linha ${rowNum}: O campo 'Conta' é obrigatório e está vazio.`);
          }

          const descContaVal = row['Descrição - Conta'];
          if (descContaVal === undefined || descContaVal === null || String(descContaVal).trim() === '') {
            lineErrorsList.push(`Erro na Linha ${rowNum}: O campo 'Descrição - Conta' é obrigatório e está vazio.`);
          }
        });

        if (lineErrorsList.length > 0) {
          setImportErrors(lineErrorsList);
          setValidationError(`A importação foi bloqueada devido a erros de validação nas linhas da planilha. Registramos ${lineErrorsList.length} inconsistência(s).`);
          return;
        }

        const formattedRecords = excelRows.map((row, idx) => {
          const rawOperVal = row[dateHeaderName];
          const parsedDateForQuery = parseExcelDate(rawOperVal);

          let rawOper = '';
          if (rawOperVal !== undefined && rawOperVal !== null) {
            if (rawOperVal instanceof Date) {
              rawOper = formatDateBR(parsedDateForQuery);
            } else {
              rawOper = String(rawOperVal).trim();
            }
          }

          const rawConta = row['Conta'] !== undefined ? String(row['Conta']).trim() : '';
          const rawDescConta = row['Descrição - Conta'] !== undefined ? String(row['Descrição - Conta']).trim() : '';
          const rawVal = row['Valor'];

          let numericVal = 0;
          if (typeof rawVal === 'number') {
            numericVal = rawVal;
          } else {
            const cleaned = String(rawVal).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
            numericVal = parseFloat(cleaned) || 0;
          }

          let matchedPc = planoContas.find(pc => pc.code.trim() === String(rawConta).trim());
          if (!matchedPc && rawDescConta) {
            matchedPc = planoContas.find(pc => pc.name.trim().toLowerCase() === String(rawDescConta).trim().toLowerCase());
          }

          let derivedMes = '';
          if (parsedDateForQuery && parsedDateForQuery.includes('-')) {
            const [y, m] = parsedDateForQuery.split('-');
            derivedMes = `${m}/${y}`;
          }

          const rawClassValue = isSimplified4 ? "" : String(row['Classificação'] || '').trim();
          const foundCat = categories.find(c => 
            c.name.trim().toLowerCase() === rawClassValue.toLowerCase() ||
            c.id.trim().toLowerCase() === rawClassValue.toLowerCase()
          );

          const mappedClassification = matchedPc ? matchedPc.classificationId : (foundCat ? foundCat.id : 'opex_admin');
          const isIncome = matchedPc 
            ? (matchedPc.classificationId === 'sales_products' || matchedPc.classificationId === 'sales_services')
            : (foundCat ? (foundCat.type === 'incoming') : false);
          
          const mathematicalValue = isIncome ? Math.abs(numericVal) : -Math.abs(numericVal);

          const costTypeVal: 'Fixo' | 'Variável' | 'N/A' | 'MEO' = matchedPc 
            ? matchedPc.costType 
            : (['Fixo', 'Variável', 'N/A', 'MEO'].includes(String(row['Custo'] || '').trim()) ? String(row['Custo'] || '').trim() as any : 'Fixo');
            
          const subCategoryVal = matchedPc ? matchedPc.subCategory : String(row['Descrição'] || '').trim();

          const rawVencVal = isSimplified4 ? undefined : row['Vencimento'];
          const parsedVencForQuery = rawVencVal !== undefined && rawVencVal !== null && String(rawVencVal).trim() !== ''
            ? parseExcelDate(rawVencVal)
            : undefined;

          return {
            id: `temp_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            date: parsedDateForQuery,
            vencimento: parsedVencForQuery,
            account: matchedPc ? matchedPc.name : rawDescConta || `CONTA ${rawConta}`,
            description: subCategoryVal,
            document: isSimplified4 ? "" : String(row['Documento'] || '').trim() || undefined,
            classification: mappedClassification,
            costType: costTypeVal,
            value: mathematicalValue,

            operacao: rawOper,
            conta: rawConta,
            descricaoConta: rawDescConta,
            classificacaoOriginal: isSimplified4 ? (matchedPc ? matchedPc.classificationId : 'opex_admin') : String(row['Classificação'] || '').trim(),
            descricaoOriginal: isSimplified4 ? (matchedPc ? matchedPc.subCategory : '') : String(row['Descrição'] || '').trim(),
            custoOriginal: isSimplified4 ? (matchedPc ? matchedPc.costType : 'Fixo') : String(row['Custo'] || '').trim(),
            historico: isSimplified4 ? "" : String(row['Histórico'] || '').trim(),
            documentoOriginal: isSimplified4 ? "" : String(row['Documento'] || '').trim(),
            valorOriginal: numericVal
          } as Transaction;
        });

        const totalImportedRows = formattedRecords.length;
        const totalImportedValueSum = formattedRecords.reduce((sum, r) => sum + r.valorOriginal!, 0);
        const differenceCalculated = Math.abs(totalExcelValueSum - totalImportedValueSum);

        const auditStatus = (totalImportedRows === excelRows.length && differenceCalculated < 0.0001) ? 'SUCCESS' : 'FAILED';

        const completedAuditLog = {
          excelRowsCount: excelRows.length,
          importedRowsCount: totalImportedRows,
          excelTotalSum: totalExcelValueSum,
          importedTotalSum: totalImportedValueSum,
          diff: differenceCalculated,
          status: auditStatus
        };

        setAuditLog(completedAuditLog);

        if (auditStatus === 'FAILED') {
          setValidationError(`Falha na validação de auditoria estrita. Divergência de valores ou registros. Lançamento bloqueado.`);
          return;
        }

        setTempFile({
          name: file.name,
          importDate: new Date().toLocaleString('pt-BR'),
          records: formattedRecords,
          totalValue: formattedRecords.reduce((sum, r) => sum + Math.abs(r.value), 0)
        });

        setSuccessMsg("Planilha lida com sucesso! Auditoria de consistência aprovada (0 divergências).");
        setTimeout(() => setSuccessMsg(null), 5000);

      } catch (err) {
        console.error(err);
        setValidationError("Falha ao abrir planilha excel. Verifique se o arquivo não está corrompido ou fora do formato.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.endsWith('.xlsx')) {
        setValidationError("Tipo de arquivo não permitido. Apenas arquivos Excel (.xlsx) são aceitos para despesas.");
        return;
      }
      handleExcelUpload(file);
    }
  };

  // Detect unregistered accounts directly within the uploaded excel sheet rows (prior to final submit)
  const tempUnregisteredAccounts = useMemo(() => {
    if (!tempFile || !tempFile.records) return [];
    
    // Key: code, Value: { name, classificationId, subCategory, costType }
    const uniqueMap = new Map<string, { 
      name: string; 
      classificationId: string; 
      subCategory: string; 
      costType: 'Fixo' | 'Variável' | 'N/A' | 'MEO' 
    }>();

    tempFile.records.forEach(r => {
      const code = String(r.conta || '').trim();
      if (code) {
        const found = planoContas.some(pc => pc.code === code);
        if (!found) {
          if (!uniqueMap.has(code)) {
            const spreadsheetClassStr = String(r.classificacaoOriginal || '').trim();
            const foundCat = categories.find(c => 
              c.name.trim().toLowerCase() === spreadsheetClassStr.toLowerCase() ||
              c.id.trim().toLowerCase() === spreadsheetClassStr.toLowerCase()
            );

            let matchedCst: 'Fixo' | 'Variável' | 'N/A' | 'MEO' = 'Fixo';
            const rawCst = String(r.custoOriginal || '').trim();
            if (['Fixo', 'Variável', 'N/A', 'MEO'].includes(rawCst)) {
              matchedCst = rawCst as any;
            } else if (rawCst.toLowerCase().includes('fix')) {
              matchedCst = 'Fixo';
            } else if (rawCst.toLowerCase().includes('var')) {
              matchedCst = 'Variável';
            }

            uniqueMap.set(code, {
              name: String(r.descricaoConta || r.account || '').trim(),
              classificationId: foundCat ? foundCat.id : 'opex_admin',
              subCategory: String(r.descricaoOriginal || '').trim(),
              costType: matchedCst
            });
          }
        }
      }
    });

    const list: { 
      code: string; 
      name: string; 
      classificationId: string; 
      subCategory: string; 
      costType: 'Fixo' | 'Variável' | 'N/A' | 'MEO' 
    }[] = [];
    uniqueMap.forEach((info, code) => {
      list.push({ code, ...info });
    });
    return list;
  }, [tempFile, planoContas]);

  // 2. Definitive processing confirmation
  const handleProcessImport = () => {
    if (!tempFile || tempFile.records.length === 0) return;
    
    // Safety check on audit log
    if (auditLog && auditLog.status !== 'SUCCESS') {
      setValidationError("A importação está bloqueada devido a divergências auditadas. Corrija o arquivo antes de submeter.");
      return;
    }

    // Safety check on Plano de Contas registration
    if (tempUnregisteredAccounts.length > 0) {
      setValidationError(`A importação está bloqueada. Existem ${tempUnregisteredAccounts.length} conta(s) pendentes de cadastro no Plano de Contas Oficial. Por favor, cadastre-as abaixo para prosseguir.`);
      return;
    }

    const currentBatchId = `batch_${Date.now()}`;
    const currentBatchName = tempFile.name;

    // Solve latest relationships against current planoContas before sending to parent
    const finalRecordsResolved = tempFile.records.map(record => {
      const rawConta = record.conta || '';
      const rawDescConta = record.descricaoConta || '';
      
      let matchedPc = planoContas.find(pc => pc.code.trim() === String(rawConta).trim());
      if (!matchedPc && rawDescConta) {
        matchedPc = planoContas.find(pc => pc.name.trim().toLowerCase() === String(rawDescConta).trim().toLowerCase());
      }

      if (matchedPc) {
        const mappedClassification = matchedPc.classificationId;
        const isIncome = mappedClassification === 'sales_products' || 
                         mappedClassification === 'sales_services' || 
                         mappedClassification === 'shareholder_contribution' ||
                         matchedPc.name.toLowerCase().includes('venda') || 
                         matchedPc.name.toLowerCase().includes('receita') || 
                         matchedPc.name.toLowerCase().includes('faturamento') || 
                         matchedPc.name.toLowerCase().includes('entrada') ||
                         matchedPc.name.toLowerCase().includes('aporte');
                         
        const rawVal = record.valorOriginal !== undefined ? record.valorOriginal : Math.abs(record.value);
        const mathematicalValue = isIncome ? Math.abs(rawVal) : -Math.abs(rawVal);

        return {
          ...record,
          batchId: currentBatchId,
          batchName: currentBatchName,
          account: matchedPc.name,
          classification: matchedPc.classificationId,
          description: matchedPc.subCategory,
          costType: matchedPc.costType,
          value: mathematicalValue
        };
      }
      return {
        ...record,
        batchId: currentBatchId,
        batchName: currentBatchName
      };
    });

    onImportTransactions(finalRecordsResolved);
    setSuccessMsg(`Sucesso de integridade! Todas as ${tempFile.records.length} linhas do Excel foram importadas com mapeamento dinâmico.`);
    setTempFile(null); // Clear preview state
    setAuditLog(null);
    setImportErrors(null);
    setTimeout(() => setSuccessMsg(null), 5500);
  };

  // 3. Manual Revenue submit action
  const handleSaveRevenue = () => {
    if (!competency) {
      setValidationError("A competência é um campo obrigatório.");
      return;
    }
    onSaveManualRevenue(competency, revProducts, revServices, revOther, revShareholder);
    setSuccessMsg(`Receitas e Aportes consolidados com sucesso para a competência ${competency}!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Re-evaluated Sum total for manual revenue block
  const totalManualRevenue = useMemo(() => {
    return revProducts + revServices + revOther + revShareholder;
  }, [revProducts, revServices, revOther, revShareholder]);

  // Extract monthly periods dynamically from transactions
  const availableMonths = useMemo(() => {
    const list = Array.from(new Set(transactions.map(t => {
      const parts = t.date.split('-');
      return `${parts[0]}-${parts[1]}`; // YYYY-MM
    })))
    .filter(Boolean)
    .sort();
    return list;
  }, [transactions]);

  const formatMonthBR = (monthYm: string): string => {
    const parts = monthYm.split('-');
    if (parts.length === 2) {
      return `${parts[1]}/${parts[0]}`;
    }
    return monthYm;
  };

  const formatDateBR = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  // Real-time calculation dashboard sidecar
  const realTimeKpi = useMemo(() => {
    let recBruta = 0; // Faturamento e aportes
    let custVarias = 0;
    let custFixos = 0;
    let despOpex = 0;
    let activeTxsCount = 0;

    const breakdown = {
      accounts: {} as Record<string, number>,
      categories: {} as Record<string, number>,
      costTypes: {} as Record<string, number>
    };

    transactions.forEach(t => {
      if (realTimePeriod !== 'all') {
        const parts = t.date.split('-');
        const monthYm = `${parts[0]}-${parts[1]}`;
        if (monthYm !== realTimePeriod) return;
      }

      activeTxsCount++;

      const isRevenue = t.classification === 'sales_products' || 
                        t.classification === 'sales_services' || 
                        t.classification === 'shareholder_contribution';
      
      const val = Number(t.value) || 0;
      const valAbs = Math.abs(val);

      if (isRevenue) {
        recBruta += valAbs;
      } else {
        if (t.costType === 'Fixo') {
          custFixos += valAbs;
        } else if (t.costType === 'Variável') {
          custVarias += valAbs;
        }

        if (t.classification.startsWith('opex_')) {
          despOpex += valAbs;
        }
      }

      // Fill interactive breakdown layers
      breakdown.accounts[t.account] = (breakdown.accounts[t.account] || 0) + val;
      breakdown.categories[t.classification] = (breakdown.categories[t.classification] || 0) + val;
      if (t.costType) {
        breakdown.costTypes[t.costType] = (breakdown.costTypes[t.costType] || 0) + val;
      }
    });

    const resultadoParcialValue = recBruta - (custFixos + custVarias);

    return {
      receitaTotal: recBruta,
      custosVariaveis: custVarias,
      custosFixos: custFixos,
      despesasOpex: despOpex,
      resultadoParcial: resultadoParcialValue,
      totalCount: activeTxsCount,
      breakdown
    };
  }, [transactions, realTimePeriod]);

  // Handle edit transaction dialog saving
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    
    onUpdateTransaction(editingTx);
    setEditingTx(null);
    setSuccessMsg("Lançamento atualizado com sucesso!");
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Final filtering, sorting and paging of main transactions log
  const resolvedTxs = useMemo(() => {
    let result = [...transactions];

    // Search query
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter(
        t => t.description.toLowerCase().includes(query) || 
             t.account.toLowerCase().includes(query) ||
             (t.document && t.document.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (filterClass !== 'all') {
      result = result.filter(t => t.classification === filterClass);
    }

    // Cost type filter
    if (filterCostType !== 'all') {
      result = result.filter(t => t.costType === filterCostType);
    }

    // Date filter
    if (dateFilter) {
      result = result.filter(t => t.date.includes(dateFilter));
    }

    // Sort order
    result.sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        const valA = Math.abs(a.value);
        const valB = Math.abs(b.value);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });

    return result;
  }, [transactions, searchText, filterClass, filterCostType, sortField, sortOrder, dateFilter]);

  const groupedByBatch = useMemo(() => {
    const groups: { [key: string]: { name: string; date: string; txs: Transaction[]; total: number } } = {};
    
    // Transactions without batchId go to "Manual/Outros"
    resolvedTxs.forEach(tx => {
      const bId = tx.batchId || 'manual';
      const isBlock1 = tx.classification === 'sales_products' || tx.classification === 'sales_services' || tx.classification === 'shareholder_contribution';
      const bName = tx.batchName || (isBlock1 ? 'Faturamento e Aportes (Bloco 1)' : 'Lançamentos Avulsos');
      
      if (!groups[bId]) {
        groups[bId] = { name: bName, date: tx.date, txs: [], total: 0 };
      }
      groups[bId].txs.push(tx);
      groups[bId].total += tx.value;
    });

    return Object.entries(groups).sort((a, b) => {
      // Sort batches by latest transaction date in each batch (approx)
      const dateA = a[1].txs[0]?.date || '';
      const dateB = b[1].txs[0]?.date || '';
      return dateB.localeCompare(dateA);
    });
  }, [resolvedTxs]);

  const toggleBatch = (id: string) => {
    const next = new Set(expandedBatches);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedBatches(next);
  };

  return (
    <div id="transaction-list-workspace" className="space-y-6">

      {/* Quick register block for unregistered accounts */}
      {tempUnregisteredAccounts.length > 0 && (
        <div id="unregistered-alert-block" className="bg-amber-50/70 border-l-4 border-amber-500 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5.5 w-5.5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs">
              <span className="font-bold block text-sm text-amber-950">
                Atenção: Encontramos {tempUnregisteredAccounts.length} conta{tempUnregisteredAccounts.length === 1 ? '' : 's'} sem cadastro no Plano de Contas
              </span>
              <span className="mt-1 block font-medium text-amber-900 leading-relaxed font-sans">
                Para liberar a importação, correlacione ou cadastre rapidamente cada código com suas classificações correspondentes:
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-amber-200/80 bg-white shadow-xs max-h-[350px] overflow-y-auto">
            <table className="min-w-full table-auto border-collapse text-left">
              <thead className="bg-slate-100 border-b border-slate-205 text-slate-700 uppercase font-bold text-[10px] tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Conta *</th>
                  <th className="py-2.5 px-3">Origem Planilha</th>
                  <th className="py-2.5 px-3">Descrição - Conta *</th>
                  <th className="py-2.5 px-3">Classificação *</th>
                  <th className="py-2.5 px-3 font-sans font-bold">Descrição *</th>
                  <th className="py-2.5 px-3 text-left">Custo *</th>
                  <th className="py-2.5 px-3 text-left">Status *</th>
                  <th className="py-2.5 px-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {tempUnregisteredAccounts.map(({ code, name, classificationId, subCategory, costType }) => (
                  <QuickRegisterRow 
                    key={code} 
                    initialCode={code} 
                    excelDescription={name}
                    initialClassificationId={classificationId}
                    initialSubCategory={subCategory}
                    initialCostType={costType}
                    categories={categories}
                    planoContas={planoContas}
                    onAddAccount={onAddAccount} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Global alert block */}
      {validationError && (
        <div className="bg-rose-50 border-l-4 border-rose-500 rounded-xl p-4 flex flex-col gap-3 text-rose-800 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold block text-[13px]">Falha de Validação de Integridade</span>
              <span className="mt-0.5 block font-medium">{validationError}</span>
            </div>
          </div>
          
          {importErrors && importErrors.length > 0 && (
            <div className="border-t border-rose-200/55 pt-3">
              <span className="text-[11px] font-black uppercase text-rose-950 tracking-wider block mb-1.5">
                🚨 Detalhes do Relatório de Erros:
              </span>
              <div className="bg-white rounded-lg p-3 max-h-[180px] overflow-y-auto font-mono text-[10px] text-rose-700 space-y-1 border border-rose-100">
                {importErrors.map((err, i) => (
                  <div key={i} className="flex gap-1.5 py-0.5 border-b border-rose-50/50 last:border-0">
                    <span className="opacity-50 select-none">#</span>
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-xl p-4 flex items-center gap-3 text-emerald-800 shadow-2xs">
          <Check className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-bold leading-none">{successMsg}</span>
        </div>
      )}

      {/* Grid: 3 columns workspace. Left: manual revenues, Center: drag-drop excel, Right: real-time summary indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BLOCO 1 - RECEITAS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Bloco 1 - Receitas Manuais</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Preenchimento direto de faturamento por competência</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Competência (Mês/Ano)</label>
              <input 
                type="month"
                required
                value={competency}
                onChange={(e) => setCompetency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-150 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Receita de Produtos (R$)</label>
              <input 
                type="number"
                min="0"
                placeholder="0,00"
                value={revProducts || ''}
                onChange={(e) => setRevProducts(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-150 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Receita de Serviços (R$)</label>
              <input 
                type="number"
                min="0"
                placeholder="0,00"
                value={revServices || ''}
                onChange={(e) => setRevServices(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-150 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Outras Receitas Operacionais (R$)</label>
              <input 
                type="number"
                min="0"
                placeholder="0,00"
                value={revOther || ''}
                onChange={(e) => setRevOther(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-150 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Aportes dos Sócios (R$)</label>
              <input 
                type="number"
                min="0"
                placeholder="0,00"
                value={revShareholder || ''}
                onChange={(e) => setRevShareholder(Number(e.target.value) || 0)}
                className="w-full bg-white border border-indigo-200 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-indigo-900 shadow-sm focus:outline-none font-mono font-bold"
              />
            </div>

            <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-900">Receita Total Calculada</span>
              <span className="font-mono font-black text-indigo-700 text-sm">
                R$ {totalManualRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <button 
              type="button"
              onClick={handleSaveRevenue}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/10"
            >
              <Save className="h-4 w-4" />
              Salvar Receita
            </button>
          </div>
        </div>

        {/* BLOCO 2 - IMPORTAÇÃO DE DESPESAS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <FileSpreadsheet className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Bloco 2 - Despesas via Excel</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Importação estrita de despesas corporativas (.xlsx)</p>
            </div>
          </div>

          {/* Drag and Drop Container */}
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
              dragActive 
                ? 'border-indigo-550 bg-indigo-50/60' 
                : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const file = e.target.files[0];
                  if (!file.name.endsWith('.xlsx')) {
                    setValidationError("Tipo de arquivo não permitido. Apenas arquivos Excel (.xlsx) são aceitos para despesas.");
                    return;
                  }
                  handleExcelUpload(file);
                }
              }}
              accept=".xlsx" 
              className="hidden" 
            />
            <div className="bg-indigo-100/50 p-2.5 rounded-full mb-2 text-indigo-600">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">Arraste ou selecione a planilha Excel</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] mx-auto">
              Selecione o arquivo Excel do MVP de despesas (formato .xlsx rígido)
            </p>
          </div>

          {/* Excel current sheet metadata presentation & strictly compliant Audit Log */}
          {tempFile ? (
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-3.5 shadow-2xs">
              <span className="text-[10px] uppercase font-black text-indigo-700 block tracking-wider">📁 Planilha Carregada</span>
              <div className="text-xs space-y-1 text-slate-600 border-b border-slate-200/50 pb-2">
                <div className="flex justify-between truncate">
                  <span className="font-semibold text-slate-500">Arquivo:</span>
                  <span className="font-mono font-bold text-slate-800 truncate max-w-[140px]" title={tempFile.name}>{tempFile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Importação:</span>
                  <span className="font-medium text-slate-700">{tempFile.importDate}</span>
                </div>
              </div>

              {/* Strict Audit Log Section */}
              {auditLog && (
                <div className={`rounded-lg border p-3 space-y-2.5 ${
                  auditLog.status === 'SUCCESS' 
                    ? 'bg-emerald-50/50 border-emerald-150 text-emerald-950' 
                    : 'bg-rose-50/50 border-rose-150 text-rose-950'
                }`}>
                  <div className="flex items-center justify-between border-b pb-1.5 border-emerald-250/20">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                      📋 LOG DE AUDITORIA
                    </span>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                      {auditLog.status === 'SUCCESS' ? 'APROVADO' : 'BLOQUEADO'}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-500 font-medium">Linhas Excel:</span>
                      <span className="font-mono font-bold text-slate-700">{auditLog.excelRowsCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-500 font-medium">Linhas Importadas:</span>
                      <span className="font-mono font-bold text-slate-700">{auditLog.importedRowsCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-t border-slate-200/30 pt-1">
                      <span className="text-slate-500 font-medium">Total Excel:</span>
                      <span className="font-mono font-bold text-slate-700">
                        R$ {auditLog.excelTotalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-500 font-medium">Total Importado:</span>
                      <span className="font-mono font-bold text-slate-700">
                        R$ {auditLog.importedTotalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-emerald-450/20 pt-1 text-emerald-900">
                      <span className="font-bold">Divergência:</span>
                      <span className="font-mono font-extrabold text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded text-[11px]">
                        R$ {auditLog.diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={handleProcessImport}
                  disabled={auditLog?.status !== 'SUCCESS'}
                  className={`flex-1 font-bold py-2 px-3 rounded-lg text-xs transition-all cursor-pointer text-center ${
                    auditLog?.status === 'SUCCESS'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/10'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Confirmar Importação
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempFile(null);
                    setAuditLog(null);
                    setImportErrors(null);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg p-2 transition-colors cursor-pointer"
                  title="Remover arquivo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center text-[10px] text-slate-400">
              Nenhuma planilha carregada para processamento no momento.
            </div>
          )}
        </div>

        {/* RESUMO LATERAL */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <div className="bg-slate-800 p-2 rounded-lg text-emerald-400">
              <TrendingUp className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs uppercase font-extrabold text-slate-200 tracking-wider">Painel - Resumo em Tempo Real</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Indicadores consolidados do período</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-slate-500">Período de Análise</label>
              <select
                value={realTimePeriod}
                onChange={(e) => setRealTimePeriod(e.target.value)}
                style={{ backgroundColor: '#1e293b' }}
                className="border border-slate-700 text-xs rounded-lg py-1.5 px-2.5 text-slate-100 cursor-pointer focus:ring-1 focus:ring-emerald-500 focus:outline-none font-bold"
              >
                <option value="all">Visão Consolidada (Total)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthBR(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Interactive Tabs */}
            <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-800">
              {(['kpi', 'account', 'class', 'type'] as const).map((layer) => (
                <button
                  key={layer}
                  onClick={() => setSummaryLayer(layer)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    summaryLayer === layer 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {layer === 'kpi' ? 'Geral' : layer === 'account' ? 'Contas' : layer === 'class' ? 'Categorias' : 'Tipo'}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[220px] max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {summaryLayer === 'kpi' && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Receita Total
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    R$ {realTimeKpi.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-indigo-400"></span> Custos Fixos
                  </span>
                  <span className="font-mono font-semibold text-slate-200">
                    R$ {realTimeKpi.custosFixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400"></span> Custos Variáveis
                  </span>
                  <span className="font-mono font-semibold text-slate-200">
                    R$ {realTimeKpi.custosVariaveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-violet-400"></span> Despesas Operacionais
                  </span>
                  <span className="font-mono font-semibold text-slate-200">
                    R$ {realTimeKpi.despesasOpex.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-500 uppercase text-[9px] font-black tracking-widest">Resultado Parcial</span>
                    <span className={`font-mono font-black text-sm ${realTimeKpi.resultadoParcial >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      R$ {realTimeKpi.resultadoParcial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${realTimeKpi.resultadoParcial >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ 
                        width: `${Math.min(100, Math.max(10, (Math.abs(realTimeKpi.resultadoParcial) / (realTimeKpi.receitaTotal || 1)) * 100))}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {summaryLayer === 'account' && (
              <div className="space-y-1.5">
                {Object.entries(realTimeKpi.breakdown.accounts)
                  .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])))
                  .slice(0, 15)
                  .map(([name, val], idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 text-[10px] border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 px-1 rounded transition-colors">
                      <span className="text-slate-400 font-medium truncate max-w-[120px]" title={name}>{name}</span>
                      <span className={`font-mono font-bold ${Number(val) >= 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {Number(val) >= 0 ? '+' : ''}R$ {Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {summaryLayer === 'class' && (
              <div className="space-y-1.5">
                {Object.entries(realTimeKpi.breakdown.categories)
                  .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])))
                  .map(([catId, val], idx) => {
                    const catName = categories.find(c => c.id === catId)?.name || catId;
                    return (
                      <div key={idx} className="flex justify-between items-center py-1.5 text-[10px] border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 px-1 rounded transition-colors">
                        <span className="text-slate-400 font-medium truncate max-w-[120px]" title={catName}>{catName}</span>
                        <span className={`font-mono font-bold ${Number(val) >= 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {Number(val) >= 0 ? '+' : ''}R$ {Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}

            {summaryLayer === 'type' && (
              <div className="space-y-1.5">
                {Object.entries(realTimeKpi.breakdown.costTypes)
                  .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])))
                  .map(([type, val], idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 text-[10px] border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 px-1 rounded transition-colors">
                      <span className="text-slate-400 font-medium">{type}</span>
                      <span className={`font-mono font-bold ${Number(val) >= 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {Number(val) >= 0 ? '+' : ''}R$ {Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">Total Lançamentos</span>
            <span className="font-mono font-black text-xs text-slate-100 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {realTimeKpi.totalCount} un.
            </span>
          </div>
        </div>

      </div>

      {/* Temp Preview Excel records row (Render block if XLSX loaded but waitmsbeforeasync not confirmed yet) */}
      {tempFile && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Prévia da Planilha Solicitada</span>
              <h4 className="text-sm font-bold text-slate-700">Primeiros registros encontrados no Excel carregado</h4>
            </div>
            <button 
              type="button" 
              onClick={handleProcessImport}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs flex items-center gap-1"
            >
              <Check className="h-3.5 w-3.5" /> Confirmar Lançamento de {tempFile.records.length} Linhas
            </button>
          </div>

          <div className="overflow-x-auto max-h-[220px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-250 text-[10px] font-bold uppercase text-slate-500 bg-slate-100">
                  <th className="py-2 px-3">Data</th>
                  <th className="py-2 px-3">Conta</th>
                  <th className="py-2 px-3">Descrição</th>
                  <th className="py-2 px-3">Classificação</th>
                  <th className="py-2 px-3 font-medium text-right">Valor bruto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-medium text-slate-600 bg-white">
                {tempFile.records.slice(0, 15).map((row, index) => {
                  const catName = categories.find(c => c.id === row.classification)?.name || 'Outras Despesas';
                  return (
                    <tr key={index} className="hover:bg-slate-55/40 text-[11px]">
                      <td className="py-1.5 px-3 font-mono">{formatDateBR(row.date)}</td>
                      <td className="py-1.5 px-3 truncate max-w-[120px]">{row.account}</td>
                      <td className="py-1.5 px-3 truncate max-w-[200px] font-bold text-slate-800">{row.description}</td>
                      <td className="py-1.5 px-3">
                        <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded text-[9px] font-semibold">{catName}</span>
                      </td>
                      <td className="py-1.5 px-3 text-right text-rose-600 font-mono font-bold">R$ {Math.abs(row.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {tempFile.records.length > 15 && (
            <p className="text-[10px] text-slate-400 italic text-right">+ {tempFile.records.length - 15} outras linhas adicionais serão importadas.</p>
          )}
        </div>
      )}

      {/* VISUALIZAÇÃO DOS DADOS / TABELA FINANCEIRA DE LANÇAMENTOS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 flex flex-col h-[650px] overflow-hidden">
        
        {/* Header toolbar including search index, layout filter types and clean buttons */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 p-2 rounded-xl text-slate-500 border border-slate-100">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Lançamentos Financeiros Ativos
                <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {resolvedTxs.length} filtrados
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Pesquise, filtre e classifique lançamentos na mesma página</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClearAll}
            className="text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 hover:bg-rose-100 py-2 px-3 rounded-xl border border-rose-100/50 transition-colors cursor-pointer ml-auto md:ml-0"
          >
            Limpar DRE
          </button>
        </div>

        {/* Toolbar Search indices + layout filter combinations */}
        <div className="bg-slate-50 rounded-xl p-3 flex flex-col md:flex-row gap-3">
          {/* Query search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input 
              type="text"
              placeholder="Pesquisar por descrição, conta ou documento..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* DRE Categories filter */}
          <div className="min-w-[180px] flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer flex-1"
            >
              <option value="all">Filtro: Categorias</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Cost Types filter */}
          <div className="min-w-[140px] flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterCostType}
              onChange={(e) => setFilterCostType(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer flex-1"
            >
              <option value="all">Filtro: Tipo Custo</option>
              <option value="Fixo">Fixo</option>
              <option value="Variável">Variável</option>
              <option value="N/A">N/A (Receitas)</option>
              <option value="MEO">MEO</option>
            </select>
          </div>

          {/* Date filter */}
          <div className="min-w-[180px] flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Filtrar Data (Ex: 2026-05)"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer flex-1"
            />
          </div>
        </div>

        {/* Core data table list */}
        <div className="flex-1 overflow-y-auto">
          {groupedByBatch.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-2">
              <span className="text-3xl">📂</span>
              <p className="text-xs text-slate-500 font-extrabold uppercase">Nenhum lançamento ativo para os filtros</p>
              <p className="text-[11px] text-slate-400 max-w-[280px]">
                Preencha as receitas acima no Bloco 1 ou importe as despesas pelo formato Excel para alimentar a DRE.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByBatch.map(([bId, group]) => (
                <div key={bId} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-xs">
                  {/* Batch Header Row */}
                  <div 
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleBatch(bId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${expandedBatches.has(bId) ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{group.name}</h4>
                        <p className="text-[10px] text-slate-500">{group.txs.length} lançamentos encontrados neste lote</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-tight">Subtotal do Lote</span>
                        <span className={`text-[11px] font-mono font-bold ${group.total >= 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                          R$ {Math.abs(group.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        {expandedBatches.has(bId) ? <ArrowUpDown className="h-4 w-4 rotate-180 transition-transform" /> : <ArrowUpDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Batch Details Table (Expanded Only) */}
                  {expandedBatches.has(bId) && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <thead>
                          <tr className="border-b border-slate-105 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider bg-slate-50/50">
                            <th className="py-2.5 px-4">Data</th>
                            <th className="py-2.5 px-4">Conta</th>
                            <th className="py-2.5 px-4">Descrição</th>
                            <th className="py-2.5 px-4">Classificação</th>
                            <th className="py-2.5 px-4 text-right">Valor</th>
                            <th className="py-2.5 px-4 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                          {group.txs.map((tx) => {
                            const cat = categories.find(c => c.id === tx.classification);
                            const catName = cat ? cat.name : 'Outros custos';
                            const isRevenue = tx.classification === 'sales_products' || tx.classification === 'sales_services' || tx.classification === 'shareholder_contribution';
                            const numericVal = Number(tx.value);

                            return (
                              <tr key={tx.id} className="hover:bg-indigo-50/30 transition-colors text-[11px] group">
                                <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">{formatDateBR(tx.date)}</td>
                                <td className="py-2.5 px-4 whitespace-nowrap font-semibold text-slate-800">{tx.account}</td>
                                <td className="py-2.5 px-4 font-medium text-slate-700">{tx.description}</td>
                                <td className="py-2.5 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    isRevenue 
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                                      : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                                  }`}>
                                    {catName}
                                  </span>
                                </td>
                                <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                                  isRevenue ? 'text-emerald-600' : 'text-slate-700'
                                }`}>
                                  {isRevenue ? '+' : '-'} R$ {Math.abs(numericVal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => setEditingTx(tx)} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Editar">
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => onDeleteTransaction(tx.id)} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-rose-600" title="Excluir">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DIALOG EDIT MODAL */}
      {editingTx && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 relative flex flex-col space-y-4">
            <button 
              onClick={() => setEditingTx(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-slate-950 block uppercase tracking-wider">Editar Lançamento</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Id: {editingTx.id}</p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Data</label>
                <input 
                  type="date"
                  required
                  value={editingTx.date}
                  onChange={(e) => setEditingTx(prev => prev ? { ...prev, date: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Conta</label>
                <input 
                  type="text"
                  required
                  value={editingTx.account}
                  onChange={(e) => setEditingTx(prev => prev ? { ...prev, account: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Descrição</label>
                <input 
                  type="text"
                  required
                  value={editingTx.description}
                  onChange={(e) => setEditingTx(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Valor (R$)</label>
                  <input 
                    type="number"
                    step="any"
                    required
                    value={editingTx.value}
                    onChange={(e) => setEditingTx(prev => prev ? { ...prev, value: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Tipo de Custo</label>
                  <select 
                    value={editingTx.costType || 'Fixo'}
                    onChange={(e) => setEditingTx(prev => prev ? { ...prev, costType: e.target.value as any } : null)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="Fixo">Fixo</option>
                    <option value="Variável">Variável</option>
                    <option value="N/A">N/A (Receitas)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Classificação Contábil</label>
                <select 
                  value={editingTx.classification}
                  onChange={(e) => setEditingTx(prev => prev ? { ...prev, classification: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 focus:outline-none cursor-pointer text-[11px]"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex gap-2">
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Salvar
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLUMNS MAPPING MODAL */}
      {showMappingModal && colMapping && (
        <div id="col-mapping-modal" className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 relative flex flex-col space-y-4">
            <button 
              onClick={() => setShowMappingModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className={`p-2 rounded-lg ${colMapping.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">
                  {colMapping.success ? '✓ Mapeamento Inteligente' : '✗ Falha de Mapeamento'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Resultado da verificação do layout da sua planilha</p>
              </div>
            </div>

            {colMapping.success ? (
              <div className="bg-emerald-50 text-emerald-800 text-[11px] font-medium p-3 rounded-lg flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-650 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Layout compatível encontrado!</span> Todas as colunas obrigatórias foram mapeadas com sucesso de forma dinâmica.
                </div>
              </div>
            ) : (
              <div className="bg-rose-50 text-rose-800 text-[11px] font-medium p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-650 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Colunas obrigatórias ausentes!</span> A planilha fornecida não possui todas as colunas necessárias. Veja a lista abaixo para corrigir seu arquivo.
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest mb-1">Mapeamento de Atributos</span>
              
              {Object.entries(MAPPING_CONFIG).map(([key, config]) => {
                const matchedFileColumn = colMapping.detected[key];
                return (
                  <div key={key} className="flex justify-between items-center bg-slate-50 border border-slate-150 py-1.5 px-3 rounded-lg text-xs">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      {matchedFileColumn ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-rose-500" />
                      )}
                      {config.label}
                    </span>
                    
                    <span className={`font-mono text-[11px] font-extrabold truncate max-w-[150px] ${matchedFileColumn ? 'text-indigo-600' : 'text-rose-500 italic font-bold'}`}>
                      {matchedFileColumn ? `→ ${matchedFileColumn}` : 'não encontrada'}
                    </span>
                  </div>
                );
              })}
            </div>

            {colMapping.success ? (
              <div className="pt-2 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowMappingModal(false)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Ver Prévia dos Dados
                </button>
              </div>
            ) : (
              <div className="pt-2 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowMappingModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Fechar e Corrigir
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
