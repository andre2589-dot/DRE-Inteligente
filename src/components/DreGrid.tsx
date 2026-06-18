import React, { useState, useEffect } from 'react';
import { Transaction, DreCategory, CategoryGoal, MonthConfig } from '../types';
import { 
  ChevronDown, 
  ChevronRight, 
  Edit2, 
  RotateCcw, 
  AlertTriangle, 
  HelpCircle,
  LayoutGrid,
  ListFilter,
  PieChart,
  Bot,
  Target,
  Calendar,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  CheckCircle2,
  Lock,
  Copy
} from 'lucide-react';

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

interface DreGridProps {
  transactions: Transaction[];
  categories: DreCategory[];
  onUpdateTransactionCategory: (txId: string, newCatId: string) => void;
  onUpdateCategoryName?: (catId: string, newName: string) => void;
  categoryGoals?: CategoryGoal[];
  monthConfigs?: MonthConfig[];
  onSaveCategoryGoal?: (categoryId: string, month: string, targetValue: number) => void;
  onSaveMonthConfig?: (month: string, totalWorkingDays: number, elapsedWorkingDays: number) => void;
}

export default function DreGrid({
  transactions,
  categories,
  onUpdateTransactionCategory,
  onUpdateCategoryName,
  categoryGoals = [],
  monthConfigs = [],
  onSaveCategoryGoal,
  onSaveMonthConfig
}: DreGridProps) {
  const [viewMode, setViewMode] = useState<'category' | 'account' | 'costType'>('category');
  const [showMetas, setShowMetas] = useState<boolean>(true);
  const [isCenterOpen, setIsCenterOpen] = useState<boolean>(true);
  const [activeMonthMetas, setActiveMonthMetas] = useState<string>('');
  const [metasConfigTab, setMetasConfigTab] = useState<'pacing' | 'goals'>('pacing');
  const [activeMetasCategoryTab, setActiveMetasCategoryTab] = useState<'incoming' | 'deduction_costs' | 'opex' | 'taxes'>('incoming');
  
  // Collapsed categories state.
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({
    'deductions': true,
    'costs': false,
    'profit_taxes': true
  });
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState<string>('');

  // 1. Get unique sorted months (e.g. ["2026-01", "2026-02", ...])
  const months = Array.from(
    new Set(
      transactions.map(t => {
        const parts = t.date.split('-');
        return `${parts[0]}-${parts[1]}`; // YYYY-MM
      })
    )
  ).sort();

  // Pick first month as standard active month config initially
  useEffect(() => {
    if (!activeMonthMetas && months.length > 0) {
      setActiveMonthMetas(months[months.length - 1]); // default to latest month
    }
  }, [months, activeMonthMetas]);

  const currentConfigMonth = activeMonthMetas || months[months.length - 1] || '';

  const handleCopyPrevGoals = () => {
    if (months.length <= 1) {
      alert("Nenhum período anterior encontrado para copiar.");
      return;
    }
    const idx = months.indexOf(currentConfigMonth);
    if (idx <= 0) {
      alert("Nenhum período anterior encontrado antes de " + currentConfigMonth);
      return;
    }
    const prevMonth = months[idx - 1];
    const prevMonthGoals = categoryGoals.filter(g => g.month === prevMonth);
    if (prevMonthGoals.length === 0) {
      alert(`Nenhuma meta cadastrada no período anterior (${prevMonth}).`);
      return;
    }
    prevMonthGoals.forEach(g => {
      onSaveCategoryGoal?.(g.categoryId, currentConfigMonth, g.targetValue);
    });
    alert(`Sucesso! ${prevMonthGoals.length} metas copiadas de ${prevMonth} para ${currentConfigMonth}.`);
  };

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 2. Resolve calculation tree
  const calculateResult = (filterFn: (t: Transaction) => boolean, month: string): number => {
    return transactions
      .filter(t => {
        const parts = t.date.split('-');
        const m = `${parts[0]}-${parts[1]}`;
        return m === month && filterFn(t);
      })
      .reduce((sum, t) => sum + t.value, 0);
  };

  const calculateCategoryValue = (catId: string, month: string): number => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 0;

    // Filter transactions for this category and month
    const list = transactions.filter(t => {
      const parts = t.date.split('-');
      const m = `${parts[0]}-${parts[1]}`;
      return t.classification === catId && m === month;
    });

    if (cat.type !== 'formula') {
      // Direct transactions. Sum values. Note that expenses are negative, so we sum absolute values
      // but preserve mathematical negativity for calculations, and format beautifully later.
      return list.reduce((sum, t) => sum + t.value, 0);
    }

    // Formulas resolution
    if (catId === 'total_sales') {
      return calculateCategoryValue('sales_products', month) + calculateCategoryValue('sales_services', month);
    }
    if (catId === 'deductions') {
      return (
        calculateCategoryValue('deduction_icms', month) +
        calculateCategoryValue('deduction_pis', month) +
        calculateCategoryValue('deduction_cofins', month) +
        calculateCategoryValue('deduction_iss', month)
      );
    }
    if (catId === 'net_revenue') {
      return calculateCategoryValue('total_sales', month) + calculateCategoryValue('deductions', month);
    }
    if (catId === 'costs') {
      return (
        calculateCategoryValue('costs_materials', month) +
        calculateCategoryValue('costs_resell', month) +
        calculateCategoryValue('costs_production', month)
      );
    }
    if (catId === 'gross_profit') {
      return calculateCategoryValue('net_revenue', month) + calculateCategoryValue('costs', month);
    }
    if (catId === 'operating_expenses') {
      return (
        calculateCategoryValue('opex_people', month) +
        calculateCategoryValue('opex_marketing', month) +
        calculateCategoryValue('opex_systems', month) +
        calculateCategoryValue('opex_contractors', month) +
        calculateCategoryValue('opex_maintenance', month) +
        calculateCategoryValue('opex_admin', month)
      );
    }
    if (catId === 'ebitda') {
      return calculateCategoryValue('gross_profit', month) + calculateCategoryValue('operating_expenses', month);
    }
    if (catId === 'profit_taxes') {
      return calculateCategoryValue('tax_irpj', month) + calculateCategoryValue('tax_csll', month);
    }
    if (catId === 'net_income') {
      return calculateCategoryValue('ebitda', month) + calculateCategoryValue('profit_taxes', month);
    }

    return 0;
  };

  const getPercentageLine = (catId: string, month: string): string => {
    // Percentage calculated relative to total_sales
    const val = calculateCategoryValue(catId, month);
    const totalSales = calculateCategoryValue('total_sales', month);
    if (!totalSales || catId === 'total_sales') return '-';
    const percent = (Math.abs(val) / totalSales) * 100;
    return `${percent.toFixed(1)}%`;
  };

  // Recurse formulas to calculate dynamic budget / target goal values
  const calculateCategoryGoalValue = (catId: string, month: string): number => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 0;

    if (cat.type !== 'formula') {
      const found = categoryGoals.find(g => g.categoryId === catId && g.month === month);
      // Goals are inputted as positive values by the user, let's keep them positive for incoming,
      // and represent them as mathematically negative for outflows/expenses in formula maths of Net Income/Ebitda!
      const positiveValue = found ? found.targetValue : 0;
      return cat.type === 'incoming' ? positiveValue : -positiveValue;
    }

    if (catId === 'total_sales') {
      return calculateCategoryGoalValue('sales_products', month) + calculateCategoryGoalValue('sales_services', month);
    }
    if (catId === 'deductions') {
      return (
        calculateCategoryGoalValue('deduction_icms', month) +
        calculateCategoryGoalValue('deduction_pis', month) +
        calculateCategoryGoalValue('deduction_cofins', month) +
        calculateCategoryGoalValue('deduction_iss', month)
      );
    }
    if (catId === 'net_revenue') {
      return calculateCategoryGoalValue('total_sales', month) + calculateCategoryGoalValue('deductions', month);
    }
    if (catId === 'costs') {
      return (
        calculateCategoryGoalValue('costs_materials', month) +
        calculateCategoryGoalValue('costs_resell', month) +
        calculateCategoryGoalValue('costs_production', month)
      );
    }
    if (catId === 'gross_profit') {
      return calculateCategoryGoalValue('net_revenue', month) + calculateCategoryGoalValue('costs', month);
    }
    if (catId === 'operating_expenses') {
      return (
        calculateCategoryGoalValue('opex_people', month) +
        calculateCategoryGoalValue('opex_marketing', month) +
        calculateCategoryGoalValue('opex_systems', month) +
        calculateCategoryGoalValue('opex_contractors', month) +
        calculateCategoryGoalValue('opex_maintenance', month) +
        calculateCategoryGoalValue('opex_admin', month)
      );
    }
    if (catId === 'ebitda') {
      return calculateCategoryGoalValue('gross_profit', month) + calculateCategoryGoalValue('operating_expenses', month);
    }
    if (catId === 'profit_taxes') {
      return calculateCategoryGoalValue('tax_irpj', month) + calculateCategoryGoalValue('tax_csll', month);
    }
    if (catId === 'net_income') {
      return calculateCategoryGoalValue('ebitda', month) + calculateCategoryGoalValue('profit_taxes', month);
    }

    return 0;
  };

  // Get Goal Realized Percentage color classes
  const getGoalPercentage = (realVal: number, goalVal: number, catType: string, catId: string): { percentageStr: string; colorClass: string; rawPercent: number } => {
    // absolute values for robust comparison
    const absReal = Math.abs(realVal);
    const absGoal = Math.abs(goalVal);
    
    if (absGoal === 0) return { percentageStr: '-', colorClass: 'text-slate-400 font-mono', rawPercent: 0 };
    
    const ratio = (absReal / absGoal) * 100;
    const percentageStr = `${ratio.toFixed(1)}%`;

    // Is it an incoming or a positive-facing formula (like Gross Profit, Net Income)?
    const isRevenueFacing = catType === 'incoming' || catId === 'net_revenue' || catId === 'gross_profit' || catId === 'ebitda' || catId === 'net_income' || catId === 'total_sales';

    if (isRevenueFacing) {
      if (ratio >= 100) {
        return { percentageStr, colorClass: 'text-emerald-500 font-extrabold font-mono', rawPercent: ratio };
      } else if (ratio >= 80) {
        return { percentageStr, colorClass: 'text-amber-500 font-bold font-mono', rawPercent: ratio };
      } else {
        return { percentageStr, colorClass: 'text-rose-500 font-medium font-mono', rawPercent: ratio };
      }
    } else {
      // Expenses/outflows! Staying UNDER target is good (emerald). Exceeding is bad (rose).
      if (ratio <= 100) {
        return { percentageStr, colorClass: 'text-emerald-500 font-extrabold font-mono', rawPercent: ratio }; // Under budget (Excellent)
      } else if (ratio <= 110) {
        return { percentageStr, colorClass: 'text-amber-500 font-bold font-mono', rawPercent: ratio }; // Slightly exceeded
      } else {
        return { percentageStr, colorClass: 'text-rose-500 font-extrabold font-mono', rawPercent: ratio }; // Exceeded budget
      }
    }
  };

  // Format Helper: show negative numbers inside parentheses e.g. (R$ 1.200,00) as in classic accounting
  const formatFinancialCurrency = (val: number, catType: string, isFormulaHeader = false) => {
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    if (val < 0) {
      return <span className={isFormulaHeader ? "text-rose-700 font-bold" : "text-rose-600 font-medium"}>({formatted})</span>;
    }
    if (val > 0 && (catType === 'incoming' || isFormulaHeader)) {
      return <span className="text-emerald-700 font-bold">{formatted}</span>;
    }
    return <span className={isFormulaHeader ? "text-slate-800 font-bold" : "text-slate-700 font-medium"}>{formatted}</span>;
  };

  // Formatter for goals (always displayed as positive/absolute values in editing, but matched appropriately)
  const formatGoalCurrency = (val: number) => {
    const absVal = Math.abs(val);
    return absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const activeCategoryTxs = selectedCategory 
    ? transactions.filter(t => t.classification === selectedCategory)
    : [];

  // Determine if we should render row based on sibling collapse state
  const shouldRenderRow = (cat: DreCategory): boolean => {
    if (!cat.parentId) return true;
    const parentCollapse = collapsed[cat.parentId];
    return !parentCollapse;
  };

  return (
    <div id="dre-grid-wrapper" className="space-y-6">
      
      {/* PAINEL DE DEFINIÇÃO DE METAS, DIAS ÚTEIS E PROJEÇÃO DE VENDAS */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden transition-all duration-300">
        <div 
          onClick={() => setIsCenterOpen(!isCenterOpen)}
          className="p-4 bg-slate-950 flex justify-between items-center cursor-pointer select-none border-b border-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/25 rounded-lg text-indigo-400">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Definição de Metas & Projeção de Vendas 
                <span className="px-2 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-bold uppercase tracking-wider font-mono">
                  {currentConfigMonth || 'Sem transações'}
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Configure metas para cada categoria e registre os dias úteis para calcular a projeção de faturamento/vendas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowMetas(!showMetas)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-755 rounded-lg text-[9px] font-bold transition-colors"
            >
              Colunas de Metas na DRE: <strong>{showMetas ? 'EXIBINDO' : 'OCULTAS'}</strong>
            </button>
            <button 
              onClick={() => setIsCenterOpen(!isCenterOpen)}
              className="p-1 px-2 hover:bg-slate-800 rounded font-bold text-xs text-indigo-400 transition-colors"
            >
              {isCenterOpen ? 'Recolher [-]' : 'Configurar metas [+]'}
            </button>
          </div>
        </div>

        {isCenterOpen && currentConfigMonth && (
          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/95">
            
            {/* LADO ESQUERDO: DIAS ÚTEIS E PROJEÇÃO */}
            <div className="lg:col-span-5 space-y-4 border-b border-indigo-500/10 lg:border-b-0 lg:border-r border-slate-800 pb-5 lg:pb-0 lg:pr-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-indigo-400 flex items-center gap-1.5 font-mono">
                  <Calendar className="h-4 w-4" /> Dias Úteis & Ritmo de Vendas
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">Mês:</span>
                  <select
                    value={currentConfigMonth}
                    onChange={(e) => setActiveMonthMetas(e.target.value)}
                    className="bg-slate-800 text-xs font-mono font-bold border border-slate-700 rounded py-1 px-1.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {months.map(m => (
                      <option key={m} value={m}>{new Date(m + "-15").toLocaleDateString('pt', {month: 'short', year: 'numeric'})}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const activeConfig = monthConfigs.find(c => c.month === currentConfigMonth) || {
                  month: currentConfigMonth,
                  totalWorkingDays: 22,
                  elapsedWorkingDays: 0
                };
                
                // Real sales calculation
                const realSales = calculateCategoryValue('total_sales', currentConfigMonth);
                
                // Metas of sales
                const metaSales = calculateCategoryGoalValue('total_sales', currentConfigMonth);

                // Sales projection
                let projectedSales = realSales;
                let projectionPercentOfMeta = 0;
                let hasPacing = false;

                if (activeConfig.elapsedWorkingDays > 0 && activeConfig.totalWorkingDays > 0) {
                  hasPacing = true;
                  const dailyVelocity = realSales / activeConfig.elapsedWorkingDays;
                  projectedSales = dailyVelocity * activeConfig.totalWorkingDays;
                }

                if (metaSales > 0) {
                  projectionPercentOfMeta = (projectedSales / metaSales) * 100;
                }

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                          Dias Úteis Totais (Mês)
                        </label>
                        <input 
                          type="number"
                          min="1"
                          max="31"
                          value={activeConfig.totalWorkingDays}
                          onChange={(e) => onSaveMonthConfig?.(currentConfigMonth, Number(e.target.value), activeConfig.elapsedWorkingDays)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1 px-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                          Dias Decorridos / Passados
                        </label>
                        <input 
                          type="number"
                          min="0"
                          max={activeConfig.totalWorkingDays}
                          value={activeConfig.elapsedWorkingDays}
                          onChange={(e) => onSaveMonthConfig?.(currentConfigMonth, activeConfig.totalWorkingDays, Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1 px-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Projections Card */}
                    <div className="bg-indigo-950/40 border border-indigo-500/25 p-4 rounded-xl space-y-3.5 relative overflow-hidden">
                      <div className="absolute right-2 top-2 text-indigo-400 opacity-20">
                        <TrendingUp className="h-16 w-16" />
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Projeção de Vendas</span>
                          <span className="text-xl font-black font-mono text-indigo-200 mt-1 block">
                            R$ {projectedSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-indigo-550/20 text-[9px] text-indigo-300 font-bold uppercase rounded border border-indigo-400/25">
                          {hasPacing ? 'Projeção Ativa' : 'Sem Intervalo'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-indigo-500/10">
                        <div>
                          <span className="text-slate-400">Total Faturado Real:</span>
                          <span className="block font-mono text-white font-bold">R$ {realSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Meta Faturamento:</span>
                          <span className="block font-mono text-indigo-300 font-bold">
                            {metaSales > 0 ? `R$ ${metaSales.toLocaleString('pt-BR')}` : 'Não cadastrada'}
                          </span>
                        </div>
                      </div>

                      {hasPacing && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-350">Progresso do Mês Comercial:</span>
                            <span className="font-mono text-indigo-200">{((activeConfig.elapsedWorkingDays / activeConfig.totalWorkingDays) * 100).toFixed(1)}% ({activeConfig.elapsedWorkingDays}/{activeConfig.totalWorkingDays} dias)</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (activeConfig.elapsedWorkingDays / activeConfig.totalWorkingDays) * 100)}%` }}></div>
                          </div>
                        </div>
                      )}

                      {metaSales > 0 && hasPacing && (
                        <div className="space-y-2 pt-2 border-t border-indigo-500/10">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-300">Ritmo Comercial (Projeção vs Meta):</span>
                            <span className={`font-mono font-extrabold ${projectionPercentOfMeta >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {projectionPercentOfMeta.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full ${projectionPercentOfMeta >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(100, projectionPercentOfMeta)}%` }}
                            ></div>
                          </div>
                          <p className="text-[9px] text-slate-300 leading-relaxed italic flex items-center gap-1.5">
                            {projectionPercentOfMeta >= 100 ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                <span>Rumo à meta! No ritmo diário atual, a meta de vendas será atingida perfeitamente.</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-450 shrink-0" />
                                <span>Abaixo da meta: Necessário acelerar R$ {((metaSales - realSales) / Math.max(1, activeConfig.totalWorkingDays - activeConfig.elapsedWorkingDays)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/dia nos dias úteis restantes.</span>
                              </>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* LADO DIREITO: CADASTRO DE METAS POR CATEGORIA */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="text-[11px] uppercase font-bold text-indigo-400 flex items-center gap-1.5 font-mono">
                  <Target className="h-3.5 w-3.5" /> Cadastro de Metas por Categoria (R$)
                </span>
                <button 
                  onClick={handleCopyPrevGoals}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[9px] font-bold transition-all border border-slate-700"
                >
                  <Copy className="h-3 w-3" /> Copiar metas do mês anterior
                </button>
              </div>

              {/* Subtabs for category groups */}
              <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveMetasCategoryTab('incoming')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    activeMetasCategoryTab === 'incoming' 
                      ? 'bg-indigo-650 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Receitas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetasCategoryTab('deduction_costs')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    activeMetasCategoryTab === 'deduction_costs' 
                      ? 'bg-indigo-650 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Deduções & Custos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetasCategoryTab('opex')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    activeMetasCategoryTab === 'opex' 
                      ? 'bg-indigo-650 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Despesas Operacionais
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetasCategoryTab('taxes')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    activeMetasCategoryTab === 'taxes' 
                      ? 'bg-indigo-650 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Impostos
                </button>
              </div>

              {/* Categories list inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 max-h-[220px] overflow-y-auto pr-2">
                {(() => {
                  const groupCategoriesMap: { [key: string]: string[] } = {
                    incoming: ['sales_products', 'sales_services', 'shareholder_contribution'],
                    deduction_costs: ['deduction_icms', 'deduction_pis', 'deduction_cofins', 'deduction_iss', 'costs_materials', 'costs_resell', 'costs_production'],
                    opex: ['opex_people', 'opex_marketing', 'opex_systems', 'opex_contractors', 'opex_maintenance', 'opex_admin'],
                    taxes: ['tax_irpj', 'tax_csll']
                  };

                  const activeIds = groupCategoriesMap[activeMetasCategoryTab] || [];
                  const activeCats = categories.filter(c => activeIds.includes(c.id));

                  if (activeCats.length === 0) {
                    return <p className="text-[11px] text-slate-550 italic">Nenhuma categoria encontrada neste grupo.</p>;
                  }

                  return activeCats.map(cat => {
                    const currentGoalValue = categoryGoals.find(g => g.categoryId === cat.id && g.month === currentConfigMonth)?.targetValue || 0;
                    const realValue = calculateCategoryValue(cat.id, currentConfigMonth);

                    return (
                      <div key={cat.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-1 pb-1.5 border-b border-slate-900">
                          <span className="text-[11px] font-bold text-slate-300 leading-tight">
                            {cat.name}
                          </span>
                          <span className="text-[9px] font-mono font-medium text-slate-500 text-right">
                            Real: R$ {Math.abs(realValue).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                          </span>
                        </div>
                        
                        <div className="mt-2 relative">
                          <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-500 font-bold">R$</span>
                          <input
                            type="number"
                            placeholder="Definir meta"
                            value={currentGoalValue || ''}
                            onChange={(e) => onSaveCategoryGoal?.(cat.id, currentConfigMonth, Number(e.target.value))}
                            className="w-full pl-7 pr-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Scrollable grid of real columns */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col">
            <h4 className="text-xs uppercase font-extrabold text-slate-500 tracking-widest">DRE Interativa e Comparativa</h4>
            <div className="mt-2 flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit">
              <button 
                onClick={() => setViewMode('category')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'category' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid className="h-3 w-3" /> Classificação
              </button>
              <button 
                onClick={() => setViewMode('account')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'account' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ListFilter className="h-3 w-3" /> Por Conta
              </button>
              <button 
                onClick={() => setViewMode('costType')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'costType' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <PieChart className="h-3 w-3" /> Tipo Custo
              </button>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Receitas
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span> Custos/Outflow
              </span>
            </div>
            <button 
              onClick={() => alert("Contexto enviado para a IA! Agora você pode perguntar sobre estes números na aba do Assistente.")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors"
            >
              <Bot className="h-3.5 w-3.5" /> Analisar com IA
            </button>
          </div>
        </div>

        {months.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-2">
            <span className="text-3xl">🖨️</span>
            <p className="text-slate-600 text-xs font-semibold uppercase">Demonstration is currently empty</p>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
              Carregue transações financeiras na aba "Planilhas & Importação" para preencher automaticamente as linhas verticais.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4 min-w-[260px] text-left" rowSpan={showMetas ? 2 : 1}>Estrutura de Contas</th>
                  {months.map(m => (
                    <th key={m} className="py-3 px-4 text-center border-l border-slate-100" colSpan={showMetas ? 4 : 2}>
                      <span className="block text-slate-850 font-bold">{new Date(m + "-15").toLocaleDateString('pt', {month: 'long', year: 'numeric'})}</span>
                    </th>
                  ))}
                </tr>
                {showMetas && (
                  <tr className="border-b border-slate-200 bg-slate-50 text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                    {months.map(m => (
                      <React.Fragment key={m}>
                        <th className="py-1 px-2 text-right border-l border-slate-100">Realizado</th>
                        <th className="py-1 px-2 text-right">% Fat.</th>
                        <th className="py-1 px-2 text-right bg-indigo-50/40 text-indigo-850 border-l border-indigo-100/30">Meta</th>
                        <th className="py-1 px-2 text-right bg-indigo-50/40 text-indigo-850">% Atingido</th>
                      </React.Fragment>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {viewMode === 'category' && categories.map(cat => {
                  if (!shouldRenderRow(cat)) return null;

                  const isParent = cat.expandable;
                  const isFormulaHead = cat.type === 'formula';
                  const isCollapsed = collapsed[cat.id];
                  const hasParentGroup = cat.parentId !== null;
                  
                  return (
                    <tr 
                      key={cat.id} 
                      onClick={() => !isFormulaHead && setSelectedCategory(cat.id)}
                      className={`group transition-colors ${
                        isFormulaHead 
                          ? 'bg-slate-50/75 border-y border-slate-200/50 hover:bg-slate-100/50 font-bold' 
                          : 'hover:bg-indigo-50/10 cursor-pointer text-slate-600'
                      } ${selectedCategory === cat.id ? 'bg-indigo-50/80' : ''}`}
                    >
                      <td className="py-2.5 px-4 flex items-center gap-1.5 select-none" style={{ paddingLeft: hasParentGroup ? '32px' : '16px' }}>
                        {isParent && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCollapse(cat.id);
                            }}
                            className="p-1 hover:bg-slate-200/50 rounded text-slate-500 transition-colors"
                          >
                            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}
                        {!isParent && hasParentGroup && (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-1.5 mr-1" />
                        )}
                        
                        <div className="flex items-center justify-between w-full group/label">
                          <span className={`leading-relaxed ${isFormulaHead ? 'text-slate-900 font-extrabold uppercase text-[11px]' : 'text-slate-850 font-semibold'}`}>
                            {cat.name}
                          </span>
                        </div>
                      </td>

                      {months.map(m => {
                        const cellVal = calculateCategoryValue(cat.id, m);
                        const percentRatio = getPercentageLine(cat.id, m);
                        const goalVal = calculateCategoryGoalValue(cat.id, m);
                        const { percentageStr, colorClass } = getGoalPercentage(cellVal, goalVal, cat.type, cat.id);

                        return (
                          <React.Fragment key={m}>
                            <td className={`py-2.5 px-3 text-right font-mono border-l border-slate-100 ${isFormulaHead ? 'font-bold' : ''}`}>
                              {formatFinancialCurrency(cellVal, cat.type, isFormulaHead)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-400">
                              {percentRatio}
                            </td>
                            {showMetas && (
                              <>
                                <td className={`py-2.5 px-3 text-right font-mono text-[11px] border-l border-slate-100 bg-slate-50/40 ${isFormulaHead ? 'font-bold' : 'text-slate-550 font-medium'}`}>
                                  {goalVal !== 0 ? `R$ ${formatGoalCurrency(goalVal)}` : <span className="text-slate-300">-</span>}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono text-[11px] bg-slate-50/40 border-r border-slate-100 ${colorClass}`}>
                                  {percentageStr}
                                </td>
                              </>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}

                {viewMode === 'account' && Array.from(new Set(transactions.map(t => t.account))).sort().map(accName => (
                  <tr key={accName} className="hover:bg-slate-50 hover:bg-indigo-50/30 transition-colors cursor-pointer text-slate-600">
                    <td className="py-2.5 px-4 font-bold text-slate-700">{accName}</td>
                    {months.map(m => {
                      const val = calculateResult(t => t.account === accName, m);
                      return (
                        <React.Fragment key={m}>
                          <td className="py-2.5 px-3 text-right font-mono border-l border-slate-100">
                            {formatFinancialCurrency(val, val >= 0 ? 'incoming' : 'outgoing')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-400">
                            -
                          </td>
                          {showMetas && (
                            <>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-300 bg-slate-50/40 border-l border-slate-100">-</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-300 bg-slate-50/40 border-r border-slate-100">-</td>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}

                {viewMode === 'costType' && ['Fixo', 'Variável', 'N/A', 'MEO'].map(ctype => (
                  <tr key={ctype} className="hover:bg-slate-50 hover:bg-indigo-50/30 transition-colors cursor-pointer text-slate-600">
                    <td className="py-2.5 px-4 font-bold text-slate-700">
                      Custo {ctype} {ctype === 'N/A' ? '(Receitas)' : ''}
                    </td>
                    {months.map(m => {
                      const val = calculateResult(t => (t.costType || 'N/A') === ctype, m);
                      return (
                        <React.Fragment key={m}>
                          <td className="py-2.5 px-3 text-right font-mono border-l border-slate-100">
                            {formatFinancialCurrency(val, val >= 0 ? 'incoming' : 'outgoing')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-400">
                            -
                          </td>
                          {showMetas && (
                            <>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-300 bg-slate-50/40 border-l border-slate-100">-</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-300 bg-slate-50/40 border-r border-slate-100">-</td>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auxiliary interactive Transaction classification re-assignment row drawer */}
      {selectedCategory && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Lançamento por Conta Ativa</span>
              <h4 className="text-sm font-bold text-slate-800">
                Lançamentos em: <span className="text-indigo-600">"{categories.find(c => c.id === selectedCategory)?.name}"</span>
              </h4>
            </div>
            <button 
              onClick={() => setSelectedCategory(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
            >
              Fechar Detalhes
            </button>
          </div>

          {activeCategoryTxs.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              Nenhuma transação classificada nesta categoria de forma manual ou automática durante esse período.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
              {activeCategoryTxs.map(tx => (
                <div key={tx.id} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">{tx.description}</span>
                    <span className="font-mono text-slate-500 text-[10px] block mt-0.5">{formatDateBR(tx.date)} • {tx.account}</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">Valor original: R$ {Math.abs(tx.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  
                  {/* Select menu representing instant re-classification rule trigger */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Classificação</span>
                    <select 
                      value={tx.classification}
                      onChange={(e) => onUpdateTransactionCategory(tx.id, e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-[11px] rounded-lg py-1 px-2 text-slate-700 cursor-pointer focus:outline-none"
                    >
                      {categories.filter(c => c.type !== 'formula').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
