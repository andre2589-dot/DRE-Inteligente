import React, { useState, useMemo } from 'react';
import { PlanoContasItem, DreCategory } from '../types';
import { 
  Plus, Search, Edit2, Trash2, Power, Check, X, 
  AlertTriangle, Settings2, HelpCircle, Activity,
  Layers, ToggleLeft, ToggleRight, Info, Upload, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

const STANDARD_CLASSIFICATION_MAPPING: { 
  [key: string]: { subCategory: string; costType: 'Fixo' | 'Variável' | 'N/A' | 'MEO' } 
} = {
  'sales_products': { subCategory: 'Venda de Produtos', costType: 'N/A' },
  'sales_services': { subCategory: 'Prestação de Serviços', costType: 'N/A' },
  'deduction_icms': { subCategory: 'ICMS S/ Vendas', costType: 'Variável' },
  'deduction_pis': { subCategory: 'PIS S/ Faturamento', costType: 'Variável' },
  'deduction_cofins': { subCategory: 'COFINS S/ Faturamento', costType: 'Variável' },
  'deduction_iss': { subCategory: 'ISS S/ Serviços', costType: 'Variável' },
  'costs_materials': { subCategory: 'Insumos e Matérias-Primas', costType: 'Variável' },
  'costs_resell': { subCategory: 'Mercadorias para Revenda', costType: 'Variável' },
  'costs_production': { subCategory: 'Custos Diretos de Produção', costType: 'Variável' },
  'opex_people': { subCategory: 'Pessoal (Salários, Benefícios e Encargos)', costType: 'Fixo' },
  'opex_marketing': { subCategory: 'Marketing & Comercial', costType: 'Variável' },
  'opex_systems': { subCategory: 'Sistemas & Cloud (SaaS, Servidores)', costType: 'Fixo' },
  'opex_contractors': { subCategory: 'Prestadores de Serviço & Consultoria', costType: 'Fixo' },
  'opex_maintenance': { subCategory: 'Manutenção, Sedes & Infra', costType: 'Fixo' },
  'opex_admin': { subCategory: 'Despesas Administrativas & Taxas', costType: 'Fixo' },
  'tax_irpj': { subCategory: 'IRPJ S/ Lucro', costType: 'Variável' },
  'tax_csll': { subCategory: 'CSLL S/ Lucro', costType: 'Variável' }
};

const STANDARD_SUBCATEGORIES = [
  'Venda de Produtos',
  'Prestação de Serviços',
  'ICMS S/ Vendas',
  'PIS S/ Faturamento',
  'COFINS S/ Faturamento',
  'ISS S/ Serviços',
  'Insumos e Matérias-Primas',
  'Mercadorias para Revenda',
  'Custos Diretos de Produção',
  'Pessoal (Salários, Benefícios e Encargos)',
  'Marketing & Comercial',
  'Sistemas & Cloud (SaaS, Servidores)',
  'Prestadores de Serviço & Consultoria',
  'Manutenção, Sedes & Infra',
  'Despesas Administrativas & Taxas',
  'IRPJ S/ Lucro',
  'CSLL S/ Lucro'
];

const matchClassificationId = (val: string, categories: DreCategory[]): string => {
  const str = String(val || '').trim().toLowerCase();
  if (!str) return 'opex_admin';
  
  const found = categories.find(c => 
    c.id.toLowerCase() === str || 
    c.name.toLowerCase() === str || 
    c.name.toLowerCase().includes(str) ||
    str.includes(c.name.toLowerCase())
  );
  if (found) return found.id;

  if (str.includes('produto') || str.includes('venda')) return 'sales_products';
  if (str.includes('serviço') || str.includes('prestacao')) return 'sales_services';
  if (str.includes('icms')) return 'deduction_icms';
  if (str.includes('pis')) return 'deduction_pis';
  if (str.includes('cofins')) return 'deduction_cofins';
  if (str.includes('iss')) return 'deduction_iss';
  if (str.includes('insumo') || str.includes('materia')) return 'costs_materials';
  if (str.includes('revenda') || str.includes('mercadoria')) return 'costs_resell';
  if (str.includes('direto') || str.includes('producao')) return 'costs_production';
  if (str.includes('pessoal') || str.includes('salario') || str.includes('folha') || str.includes('encargo')) return 'opex_people';
  if (str.includes('marketing') || str.includes('comercial') || str.includes('anuncio') || str.includes('propaganda')) return 'opex_marketing';
  if (str.includes('cloud') || str.includes('sistema') || str.includes('server') || str.includes('hosting')) return 'opex_systems';
  if (str.includes('prestador') || str.includes('consultoria') || str.includes('contador') || str.includes('honorario')) return 'opex_contractors';
  if (str.includes('manutencao') || str.includes('sede') || str.includes('aluguel') || str.includes('infra')) return 'opex_maintenance';
  if (str.includes('admin') || str.includes('adm') || str.includes('taxa') || str.includes('correio')) return 'opex_admin';
  if (str.includes('irpj')) return 'tax_irpj';
  if (str.includes('csll')) return 'tax_csll';

  return 'opex_admin';
};

interface PlanoContasProps {
  planoContas: PlanoContasItem[];
  onAddAccount: (newItem: Omit<PlanoContasItem, 'id'>) => Promise<{ success: boolean; error?: string }>;
  onUpdateAccount: (id: string, updatedFields: Partial<PlanoContasItem>) => Promise<{ success: boolean; error?: string }>;
  onDeleteAccount: (id: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  categories: DreCategory[];
}

export default function PlanoContas({
  planoContas,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  categories
}: PlanoContasProps) {
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('all');
  
  // Create / Edit Form states
  const [editingItem, setEditingItem] = useState<PlanoContasItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(true); // Default open side bar for excellent UX
  
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formClassificationId, setFormClassificationId] = useState('');
  const [formSubCategory, setFormSubCategory] = useState('');
  const [formCostType, setFormCostType] = useState<'Fixo' | 'Variável' | 'N/A' | 'MEO'>('Fixo');
  const [formActive, setFormActive] = useState<boolean>(true);
  
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Excel Import states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFileError, setImportFileError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [excelPreview, setExcelPreview] = useState<Omit<PlanoContasItem, 'id'>[] | null>(null);

  // Pagination or list limit to keep render light or extremely fast
  const [listLimit, setListLimit] = useState(25);

  // Filter list of eligible categories that are selectable (not formulas)
  const selectableCategories = useMemo(() => {
    return categories.filter(c => c.type !== 'formula');
  }, [categories]);

  // Autocomplete dynamic suggestions
  const autocompleteNames = useMemo(() => {
    return Array.from(new Set(planoContas.map(p => p.name).filter(Boolean))).sort();
  }, [planoContas]);

  const autocompleteSubCategories = useMemo(() => {
    return Array.from(new Set(planoContas.map(p => p.subCategory).filter(Boolean))).sort();
  }, [planoContas]);

  // Statistics
  const stats = useMemo(() => {
    const total = planoContas.length;
    const active = planoContas.filter(a => a.active !== false).length;
    const inactive = total - active;
    const uniqueGroups = new Set(planoContas.map(a => a.classificationId)).size;
    return { total, active, inactive, uniqueGroups };
  }, [planoContas]);

  // Handle double-direction autocomplete & auto-fill state changes
  const handleClassificationChange = (val: string) => {
    setFormClassificationId(val);
    const mapped = STANDARD_CLASSIFICATION_MAPPING[val];
    if (mapped) {
      setFormSubCategory(mapped.subCategory);
      setFormCostType(mapped.costType);
    }
  };

  // Import Excel Parser and normalizer
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportFileError(null);
    setExcelPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setImportFileError("Apenas arquivos do Excel (.xlsx, .xls) são suportados.");
      return;
    }

    setImportLoading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];
        if (rows.length === 0) {
          setImportFileError("O arquivo carregado está vazio.");
          setImportLoading(false);
          return;
        }

        const parsedItems: Omit<PlanoContasItem, 'id'>[] = [];
        let errors = 0;

        rows.forEach((row: any) => {
          const codeRaw = row['Código'] || row['Codigo'] || row['Conta'] || row['Cd'] || row['CÓDIGO'] || row['CODIGO'];
          const nameRaw = row['Nome'] || row['Nome da Conta'] || row['Descrição da Conta'] || row['Descricao'] || row['Descrição'] || row['DESCRIÇÃO'] || row['NOME'] || row['DESCRICAO'];
          const classRaw = row['Classificação'] || row['Classificacao'] || row['Agrupador'] || row['Grupo'] || row['Classification'] || row['CLASSIFICAÇÃO'] || row['CLASSIFICACAO'] || row['CLASSIFICATION'];
          const subCatRaw = row['Subcategoria'] || row['Sub-categoria'] || row['Descrição - Subcategoria'] || row['SubCategory'] || row['SUBCATEGORIA'] || row['SUBCATEGORY'] || row['DESCRIÇÃO_SUBCATEGORIA'];
          const costTypeRaw = row['Custo'] || row['Tipo de Custo'] || row['Tipo'] || row['CostType'] || row['CUSTO'] || row['TIPO_CUSTO'];

          const code = String(codeRaw || '').trim();
          const name = String(nameRaw || '').trim().toUpperCase();
          
          if (!code || !name) {
            errors++;
            return;
          }

          const matchedClassificationId = matchClassificationId(String(classRaw || ''), categories);
          
          let subCategory = String(subCatRaw || '').trim();
          if (!subCategory) {
            subCategory = STANDARD_CLASSIFICATION_MAPPING[matchedClassificationId]?.subCategory || 'Geral';
          }

          let costType: 'Fixo' | 'Variável' | 'N/A' | 'MEO' = 'Fixo';
          const cstStr = String(costTypeRaw || '').trim().toLowerCase();
          if (cstStr.includes('fix')) {
            costType = 'Fixo';
          } else if (cstStr.includes('var') || cstStr.includes('vári')) {
            costType = 'Variável';
          } else if (cstStr.includes('meo')) {
            costType = 'MEO';
          } else if (cstStr.includes('n/a') || cstStr.includes('na')) {
            costType = 'N/A';
          } else {
            costType = STANDARD_CLASSIFICATION_MAPPING[matchedClassificationId]?.costType || 'Fixo';
          }

          parsedItems.push({
            code,
            name,
            classificationId: matchedClassificationId,
            subCategory,
            costType,
            active: true
          });
        });

        if (parsedItems.length === 0) {
          setImportFileError("Nenhum item válido pôde ser extraído. Verifique as colunas (Código, Nome, Classificação, Subcategoria, Custo).");
        } else {
          setExcelPreview(parsedItems);
        }
      } catch (err: any) {
        setImportFileError(`Erro ao ler células do Excel: ${err.message || err}`);
      } finally {
        setImportLoading(false);
      }
    };

    reader.onerror = () => {
      setImportFileError("Falha física de leitura.");
      setImportLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const confirmExcelImport = async () => {
    if (!excelPreview) return;
    setImportLoading(true);

    let successCount = 0;
    let failCount = 0;

    for (const item of excelPreview) {
      const res = await onAddAccount(item);
      if (res.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setSuccessMsg(`Importação Concluída! ${successCount} contas adicionadas com sucesso. ${failCount > 0 ? `${failCount} falhas.` : ''}`);
    setExcelPreview(null);
    setIsImportOpen(false);
    setTimeout(() => setSuccessMsg(null), 5000);
    setImportLoading(false);
  };

  // Open form for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormCode('');
    setFormName('');
    setFormClassificationId(selectableCategories[0]?.id || '');
    setFormSubCategory('');
    setFormCostType('Fixo');
    setFormActive(true);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open form for Edit
  const handleOpenEdit = (item: PlanoContasItem) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormClassificationId(item.classificationId);
    setFormSubCategory(item.subCategory);
    setFormCostType((item.costType as any) || 'Fixo');
    setFormActive(item.active !== false);
    setFormError(null);
    setIsFormOpen(true);
    // Scroll to form smoothly on narrow viewports
    document.getElementById('plan-contas-form-container')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic Validation
    if (!formCode.trim()) {
      setFormError("O Código da conta é obrigatório.");
      return;
    }
    if (!formName.trim()) {
      setFormError("O Nome da Conta é obrigatório.");
      return;
    }
    if (!formClassificationId) {
      setFormError("Selecione o agrupador correspondente na DRE.");
      return;
    }
    if (!formSubCategory.trim()) {
      setFormError("Especifique a subcategoria.");
      return;
    }

    try {
      if (editingItem) {
        // Edit Action
        const res = await onUpdateAccount(editingItem.id, {
          code: formCode.trim(),
          name: formName.trim().toUpperCase(),
          classificationId: formClassificationId,
          subCategory: formSubCategory.trim(),
          costType: formCostType,
          active: formActive
        });
        
        if (res.success) {
          setSuccessMsg(`Conta "${formCode}" atualizada com sucesso!`);
          setEditingItem(null);
          // clear fields
          setFormCode('');
          setFormName('');
          setFormSubCategory('');
          setTimeout(() => setSuccessMsg(null), 3500);
        } else {
          setFormError(res.error || "Erro desconhecido ao editar.");
        }
      } else {
        // Create Action
        const res = await onAddAccount({
          code: formCode.trim(),
          name: formName.trim().toUpperCase(),
          classificationId: formClassificationId,
          subCategory: formSubCategory.trim(),
          costType: formCostType,
          active: formActive
        });

        if (res.success) {
          setSuccessMsg(`Conta "${formCode}" cadastrada com sucesso!`);
          setFormCode('');
          setFormName('');
          setFormSubCategory('');
          setTimeout(() => setSuccessMsg(null), 3500);
        } else {
          setFormError(res.error || "Erro desconhecido ao cadastrar.");
        }
      }
    } catch (err: any) {
      setFormError(err.message || "Erro ao submeter os dados.");
    }
  };

  // Switch Active Status Toggle
  const handleToggleActive = async (item: PlanoContasItem) => {
    try {
      const newStatus = item.active === false ? true : false;
      const res = await onUpdateAccount(item.id, { active: newStatus });
      if (res.success) {
        setSuccessMsg(`Conta "${item.code}" marcada como ${newStatus ? 'Ativa' : 'Inativa'}.`);
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Action
  const handleDelete = async (item: PlanoContasItem) => {
    if (confirm(`Tem certeza que deseja remover a conta ${item.code} - ${item.name}?`)) {
      const res = await onDeleteAccount(item.id);
      if (res.success) {
        setSuccessMsg(res.message || "Conta removida com sucesso do Plano de Contas.");
        setTimeout(() => setSuccessMsg(null), 3500);
      } else if (res.error) {
        alert(`Erro ao remover: ${res.error}`);
      }
    }
  };

  // Filtered List
  const filteredAccounts = useMemo(() => {
    return planoContas.filter(item => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        item.code.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        item.subCategory.toLowerCase().includes(term);
      
      const matchesCategory = selectedFilterCategory === 'all' || item.classificationId === selectedFilterCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [planoContas, searchTerm, selectedFilterCategory]);

  return (
    <div id="plano-contas-root" className="space-y-5">
      
      {/* Mini Dashboard Metrics Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total de Contas</span>
            <span className="text-xl font-extrabold font-mono text-indigo-300 block">{stats.total}</span>
          </div>
          <Activity className="h-7 w-7 text-indigo-400 opacity-60" />
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Contas Ativas</span>
            <span className="text-xl font-extrabold font-mono text-emerald-600 block">{stats.active}</span>
          </div>
          <Check className="h-7 w-7 text-emerald-500 opacity-60" />
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Inativas na Base</span>
            <span className="text-xl font-extrabold font-mono text-slate-500 block">{stats.inactive}</span>
          </div>
          <X className="h-7 w-7 text-slate-400 opacity-60" />
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Agrupadores DRE</span>
            <span className="text-xl font-extrabold font-mono text-indigo-600 block">{stats.uniqueGroups}</span>
          </div>
          <Layers className="h-7 w-7 text-indigo-500 opacity-60" />
        </div>
      </div>

      {/* Alert Messaging */}
      {successMsg && (
        <div className="bg-emerald-55 border bg-emerald-50 border-emerald-100 rounded-xl p-3.5 flex items-center gap-3 text-emerald-900 shadow-2xs animate-fade-in">
          <Check className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-bold">{successMsg}</span>
        </div>
      )}

      {/* Responsive Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Side: Modern Interactive Form (35% area) */}
        {isFormOpen && (
          <div id="plan-contas-form-container" className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-md">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  {editingItem ? 'Editar Conta' : 'Cadastrar Conta'}
                </h3>
              </div>
              <div className="flex gap-1.5">
                {editingItem && (
                  <button 
                    onClick={handleOpenCreate}
                    className="text-[10px] font-bold text-indigo-600 hover:underline px-1.5 py-0.5"
                    title="Mudar para cadastrar nova conta"
                  >
                    Mudar p/ Novo
                  </button>
                )}
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                  title="Fechar painel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {formError && (
                <div className="bg-rose-50 border-l-3 border-rose-500 text-rose-800 text-[11px] p-2.5 rounded-lg flex items-start gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0" />
                  <span className="leading-snug">{formError}</span>
                </div>
              )}

              {/* Código */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Conta * (Código)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 10115 ou 10402"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  disabled={!!editingItem}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono font-bold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed uppercase"
                />
                <p className="text-[9px] text-slate-400 mt-0.5 font-sans">
                  Código exclusivo correspondente (ex: 10114)
                </p>
              </div>

              {/* Nome da Conta */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição - Conta *
                </label>
                <input
                  type="text"
                  required
                  list="suggested-account-names"
                  placeholder="Selecione ou digite o nome..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 uppercase font-semibold"
                />
                <datalist id="suggested-account-names">
                  {autocompleteNames.map(n => <option key={n} value={n} />)}
                </datalist>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Designação unificada (ex: TAXAS BANCARIAS, ALUGUEL)
                </p>
              </div>

              {/* Agrupador DRE */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Classificação * (Agrupador DRE)
                </label>
                <select
                  value={formClassificationId}
                  onChange={(e) => handleClassificationChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 font-medium"
                >
                  <option value="" disabled>--- Selecione ---</option>
                  {selectableCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Filtro inteligente: preencherá por padrão a descrição e custo do plano.
                </p>
              </div>

              {/* Subcategoria */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição * (Subcategoria)
                </label>
                <select
                  value={formSubCategory}
                  onChange={(e) => setFormSubCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 font-medium"
                >
                  <option value="" disabled>--- Selecione a Descrição ---</option>
                  {STANDARD_SUBCATEGORIES.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                  {formSubCategory && !STANDARD_SUBCATEGORIES.includes(formSubCategory) && (
                    <option value={formSubCategory}>{formSubCategory} (Customizada)</option>
                  )}
                </select>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Selecione entre descrições correspondentes à classificação.
                </p>
              </div>

              {/* Tipo de Custo */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Custo *
                </label>
                <select
                  value={formCostType}
                  onChange={(e) => setFormCostType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 font-medium"
                >
                  <option value="Fixo">Fixo</option>
                  <option value="Variável">Variável</option>
                  <option value="MEO">MEO</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Status *
                </label>
                <select
                  value={formActive ? 'Ativo' : 'Inativo'}
                  onChange={(e) => setFormActive(e.target.value === 'Ativo')}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 font-medium"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCreate();
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 text-[11px] transition-all cursor-pointer font-semibold"
                >
                  Limpar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
                >
                  {editingItem ? 'Salvar Edição' : 'Cadastrar Conta'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Right Side: List and filters (65% or 100% area) */}
        <div className={`bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden ${
          isFormOpen ? 'lg:col-span-8' : 'lg:col-span-12'
        }`}>
          
          {/* Filters Panel Header */}
          <div className="bg-slate-50/50 border-b border-slate-150 p-3.5 flex flex-col sm:flex-row gap-3 justify-between items-center">
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isFormOpen && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Abrir Cadastro
                </button>
              )}
              
              <div className="relative w-full sm:w-[220px]">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar código, nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-8 pr-2.5 py-1 text-[11px] rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-[11px]">
              <button
                onClick={() => setIsImportOpen(!isImportOpen)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors mr-2 select-none"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Importar Excel
              </button>

              <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap hidden md:inline">Filtro:</span>
              <select
                value={selectedFilterCategory}
                onChange={(e) => {
                  setSelectedFilterCategory(e.target.value);
                  setListLimit(25); // reset list viewing bounds on category changes
                }}
                className="bg-white border border-slate-200 text-[11px] rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 w-full sm:w-auto font-medium"
              >
                <option value="all">Todos os Agrupadores DRE</option>
                {selectableCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Excel Import Panel Overlay */}
          {isImportOpen && (
            <div className="bg-slate-50 p-4 border-b border-slate-150 space-y-4 animate-fade-in text-xs">
              <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Upload className="h-4 w-4 text-emerald-600" />
                    Upload de Plano de Contas (.xlsx)
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Arraste ou selecione o arquivo correspondente. O sistema mapeia dinamicamente as colunas: 
                    <strong className="text-slate-700 ml-1">Código, Nome, Classificação (Agrupador DRE), Subcategoria (Descrição) e Custo</strong>.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsImportOpen(false);
                    setExcelPreview(null);
                    setImportFileError(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!excelPreview ? (
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-8 text-center transition-all relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileSpreadsheet className="h-10 w-10 text-slate-400 hover:text-emerald-600 transition-colors" />
                    <span className="text-xs font-bold text-slate-700">Selecione ou solte a planilha .xlsx aqui</span>
                    <span className="text-[10px] text-slate-400">Padrão da colunagem no cabeçalho do Excel</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="p-3 bg-emerald-50 border-b border-slate-150 flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-600" />
                      Pronto para importar {excelPreview.length} conta(s) encontradas na planilha!
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExcelPreview(null)}
                        className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 bg-white text-slate-600 rounded hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={confirmExcelImport}
                        disabled={importLoading}
                        className="px-3 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {importLoading ? 'Importando...' : 'Confirmar Importação'}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-[11px] text-slate-700 font-medium">
                      <thead className="bg-slate-100 text-slate-600 uppercase text-[9px] font-bold tracking-wider sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2 pl-3">Código</th>
                          <th className="p-2">Nome</th>
                          <th className="p-2">Classificação</th>
                          <th className="p-2">Descrição</th>
                          <th className="p-2 pr-3">Custo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {excelPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 text-[10px]">
                            <td className="p-2 pl-3 font-mono font-bold text-slate-900">{item.code}</td>
                            <td className="p-2 font-bold uppercase">{item.name}</td>
                            <td className="p-2">
                              {categories.find(c => c.id === item.classificationId)?.name || item.classificationId}
                            </td>
                            <td className="p-2 text-slate-500">{item.subCategory}</td>
                            <td className="p-2 pr-3">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                                {item.costType}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importFileError && (
                <div className="bg-rose-50 border-l-3 border-rose-500 text-rose-800 text-[11px] p-3 rounded-lg flex items-start gap-2.5 font-medium">
                  <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span className="leading-snug">{importFileError}</span>
                </div>
              )}
            </div>
          )}

          {/* Table Area */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold select-none border-b border-slate-150 tracking-wider">
                  <th className="py-2.5 px-3 w-[10%]">Conta</th>
                  <th className="py-2.5 px-3 w-[25%]">Descrição - Conta</th>
                  <th className="py-2.5 px-3 w-[25%]">Classificação</th>
                  <th className="py-2.5 px-3 w-[20%]">Descrição</th>
                  <th className="py-2.5 px-1 w-[10%] text-center">Custo</th>
                  <th className="py-2.5 px-2 w-[10%] text-center">Status</th>
                  <th className="py-2.5 px-3 w-[10%] text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <Settings2 className="mx-auto h-8 w-8 opacity-30 mb-2" />
                      <span className="text-[11px]">Nenhuma conta localizada para esta busca ou filtro.</span>
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.slice(0, listLimit).map(item => {
                    const catMatch = categories.find(c => c.id === item.classificationId);
                    
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-50/50 transition-colors text-[11px] align-middle ${
                          item.active === false ? 'opacity-50 bg-slate-50/30' : ''
                        }`}
                      >
                        {/* Code */}
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900 border-b border-slate-100">
                          {item.code}
                        </td>
                        
                        {/* Name */}
                        <td className="py-1.5 px-3 font-bold uppercase text-slate-800 border-b border-slate-100 truncate max-w-[160px]" title={item.name}>
                          {item.name}
                        </td>
                        
                        {/* Category */}
                        <td className="py-1.5 px-3 border-b border-slate-100 truncate max-w-[150px]" title={catMatch?.name || item.classificationId}>
                          <span className="bg-slate-100 text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
                            {catMatch?.name || item.classificationId}
                          </span>
                        </td>
                        
                        {/* Subcategory */}
                        <td className="py-1.5 px-3 text-slate-600 border-b border-slate-100 font-medium truncate max-w-[130px]" title={item.subCategory}>
                          {item.subCategory}
                        </td>
                        
                        {/* Cost type */}
                        <td className="py-1.5 px-1 text-center border-b border-slate-100">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            item.costType === 'Fixo' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                              : item.costType === 'Variável'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : item.costType === 'MEO'
                              ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.costType || 'N/A'}
                          </span>
                        </td>
                        
                        {/* Active toggle */}
                        <td className="py-1.5 px-2 text-center border-b border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            title="Clique para alternar o status"
                            className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                              item.active !== false 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100' 
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-100'
                            }`}
                          >
                            <Power className="h-2.5 w-2.5" />
                            {item.active !== false ? 'Ativo' : 'Inativo'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-1.5 px-3 text-right border-b border-slate-100">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              title="Editar especificações"
                              className="text-slate-500 hover:text-indigo-600 p-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              title="Remover conta"
                              className="text-slate-500 hover:text-rose-600 p-1 bg-slate-50 hover:bg-rose-50 border border-slate-200 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table pagination & View bounds controller */}
          {filteredAccounts.length > listLimit && (
            <div className="bg-slate-50/50 p-2 border-t border-slate-100 text-center">
              <button
                onClick={() => setListLimit(prev => prev + 25)}
                className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] underline tracking-tight cursor-pointer"
              >
                Carregar mais 25 contas (+ {filteredAccounts.length - listLimit} restantes)
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Informative guidelines */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 flex items-start gap-3.5 text-blue-900 shadow-3xs">
        <Info className="h-4.5 w-4.5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] space-y-1">
          <h4 className="font-bold text-blue-950 uppercase tracking-wider text-[10px]">Manual Operacional do Plano de Contas</h4>
          <p className="text-slate-700">
            • O plano é sincronizado em tempo real. As alterações realizadas nesta página impactam o processador inteligente de faturamento e o relatório da DRE imediatamente.
          </p>
          <p className="text-slate-700">
            • <strong>Preenchimento inteligente</strong>: Ao digitar o Nome da Conta ou Subcategoria no formulário de cadastro, o sistema oferece sugestões com autocompletes com base no histórico para evitar cadastros duplicados ou digitados incorretamente.
          </p>
        </div>
      </div>

    </div>
  );
}
