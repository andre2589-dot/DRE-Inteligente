import React, { useState } from 'react';
import { Transaction, DreCategory } from '../types';
import { ChevronDown, ChevronRight, Edit2, RotateCcw, AlertTriangle, HelpCircle } from 'lucide-react';

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
}

export default function DreGrid({
  transactions,
  categories,
  onUpdateTransactionCategory,
  onUpdateCategoryName
}: DreGridProps) {
  // Collapsed categories state. Collapsed by default? Let's keep them expanded for instant inspection
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

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 2. Resolve calculation tree for a single month
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
      // Sum deductions (represented as negative values, so we sum them)
      return (
        calculateCategoryValue('deduction_icms', month) +
        calculateCategoryValue('deduction_pis', month) +
        calculateCategoryValue('deduction_cofins', month) +
        calculateCategoryValue('deduction_iss', month)
      );
    }
    if (catId === 'net_revenue') {
      // Vendas Totais (positive) + Deduções (negative)
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
      // Net Revenue (positive) + Costs (negative)
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
      // Gross Profit (positive) + Operating Expenses (negative)
      return calculateCategoryValue('gross_profit', month) + calculateCategoryValue('operating_expenses', month);
    }
    if (catId === 'profit_taxes') {
      return calculateCategoryValue('tax_irpj', month) + calculateCategoryValue('tax_csll', month);
    }
    if (catId === 'net_income') {
      // EBITDA (positive) + Taxes (negative)
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

  // Format Helper: show negative numbers inside parentheses e.g. (R$ 1.200,00) as in classic accounting
  const formatFinancialCurrency = (val: number, catType: string, isFormulaHeader = false) => {
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    if (val < 0) {
      return <span className={isFormulaHeader ? "text-rose-700 font-bold" : "text-rose-600 font-medium"}>({formatted})</span>;
    }
    if (val > 0 && catType === 'incoming') {
      return <span className="text-emerald-700 font-bold">{formatted}</span>;
    }
    return <span className={isFormulaHeader ? "text-slate-800 font-bold" : "text-slate-700 font-medium"}>{formatted}</span>;
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
      
      {/* Scrollable grid of real columns */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="text-xs uppercase font-extrabold text-slate-500 tracking-widest">DRE Interativa e Comparativa</h4>
            <p className="text-slate-600 text-xs mt-0.5">Clique em uma linha para listar e reclassificar seus lançamentos subjacentes.</p>
          </div>
          <div className="flex gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Receitas
            </span>
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span> Custos/Outflow
            </span>
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
                  <th className="py-3 px-4 min-w-[260px] text-left">Estrutura de Contas</th>
                  {months.map(m => (
                    <th key={m} className="py-3 px-4 text-right min-w-[130px]" colSpan={2}>
                      <span className="block text-slate-800">{new Date(m + "-15").toLocaleDateString('pt', {month: 'long', year: 'numeric'})}</span>
                      <span className="text-[9px] text-slate-400 block font-normal">% Faturamento</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {categories.map(cat => {
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
                          ? 'bg-slate-50/75 border-y border-slate-250/20 hover:bg-slate-100/50 font-bold' 
                          : 'hover:bg-indigo-50/40 cursor-pointer text-slate-600'
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
                        
                        {editingCatId === cat.id ? (
                          <div className="flex items-center gap-1.5 w-full mr-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (editingCatName.trim() && onUpdateCategoryName) {
                                    onUpdateCategoryName(cat.id, editingCatName.trim());
                                  }
                                  setEditingCatId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingCatId(null);
                                }
                              }}
                              className="bg-white border border-indigo-400 rounded px-2 py-0.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none w-full"
                              autoFocus
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (editingCatName.trim() && onUpdateCategoryName) {
                                  onUpdateCategoryName(cat.id, editingCatName.trim());
                                }
                                setEditingCatId(null);
                              }}
                              className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                              title="Salvar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCatId(null);
                              }}
                              className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400 transition-colors"
                              title="Cancelar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full group/label">
                            <span className={`leading-relaxed ${isFormulaHead ? 'text-slate-900 font-extrabold uppercase text-[11px]' : 'text-slate-800 font-medium'}`}>
                              {cat.name}
                            </span>
                            
                            {onUpdateCategoryName && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCatId(cat.id);
                                  setEditingCatName(cat.name);
                                }}
                                className="opacity-0 group-hover/label:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 ml-1.5 transition-all"
                                title="Editar classificação"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {months.map(m => {
                        const cellVal = calculateCategoryValue(cat.id, m);
                        const percentRatio = getPercentageLine(cat.id, m);

                        return (
                          <React.Fragment key={m}>
                            {/* Value col */}
                            <td className={`py-2.5 px-4 text-right font-mono ${isFormulaHead ? 'font-bold' : ''}`}>
                              {formatFinancialCurrency(cellVal, cat.type, isFormulaHead)}
                            </td>
                            {/* % Ratio col */}
                            <td className="py-2.5 px-4 text-right font-mono text-[10px] text-slate-400 border-r border-slate-100/50">
                              {percentRatio}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
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
