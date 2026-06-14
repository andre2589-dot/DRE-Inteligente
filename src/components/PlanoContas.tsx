import React, { useState, useMemo } from 'react';
import { PlanoContasItem, DreCategory } from '../types';
import { 
  Plus, Search, Edit2, Trash2, Power, Check, X, 
  AlertTriangle, Settings2, HelpCircle, Activity,
  Layers, ToggleLeft, ToggleRight, Info
} from 'lucide-react';

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
                  Código da Conta *
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
                  Nome da Conta (Despesa) *
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
                  Agrupador DRE (Classificação) *
                </label>
                <select
                  value={formClassificationId}
                  onChange={(e) => setFormClassificationId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 font-medium"
                >
                  <option value="" disabled>--- Selecione ---</option>
                  {selectableCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Estrutura correspondente no relatório de DRE
                </p>
              </div>

              {/* Subcategoria */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Subcategoria (Descrição) *
                </label>
                <input
                  type="text"
                  required
                  list="suggested-subcategories"
                  placeholder="Selecione ou digite..."
                  value={formSubCategory}
                  onChange={(e) => setFormSubCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 font-medium"
                />
                <datalist id="suggested-subcategories">
                  {autocompleteSubCategories.map(sub => <option key={sub} value={sub} />)}
                </datalist>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Subclassificação (ex: Imposto sobre venda, Insumo, Beneficios)
                </p>
              </div>

              {/* Tipo de Custo */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Tipo de Custo *
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

          {/* Table Area */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold select-none border-b border-slate-150 tracking-wider">
                  <th className="py-2.5 px-3 w-[10%]">Código</th>
                  <th className="py-2.5 px-3 w-[25%]">Nome da Conta</th>
                  <th className="py-2.5 px-3 w-[25%]">Agrupador DRE</th>
                  <th className="py-2.5 px-3 w-[20%]">Subcategoria</th>
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
