/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Company, Transaction, Rule, DreCategory, PlanoContasItem, CategoryGoal, MonthConfig } from './types';
import { 
  DEFAULT_COMPANIES, 
  DRE_CATEGORIES, 
  DEFAULT_RULES, 
  DEFAULT_TRANSACTIONS 
} from './data/defaultData';
import { safeFetchJson } from './utils/safeFetch';

// Modular children components
import TransactionList from './components/TransactionList';
import DreGrid from './components/DreGrid';
import DashboardCharts from './components/DashboardCharts';
import ForecastModule from './components/ForecastModule';
import PlanoContas from './components/PlanoContas';
import AiAssistant from './components/AiAssistant';
import ProcurementModule from './components/ProcurementModule';
import SupabaseDiag from './components/SupabaseDiag';
import { DatabaseUploadModule } from './components/DatabaseUploadModule';

// Icons
import { 
  Building, 
  User, 
  FileSpreadsheet, 
  TrendingUp, 
  BarChart2, 
  Sparkles, 
  Settings2, 
  Bot, 
  Layers, 
  FileText, 
  LogOut,
  Sliders,
  ShieldAlert,
  Info,
  Database,
  Menu,
  X,
  ShoppingCart,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Multitenant companies
  const [companies, setCompanies] = useState<Company[]>(DEFAULT_COMPANIES);
  const [activeCompany, setActiveCompany] = useState<Company>(DEFAULT_COMPANIES[0]);
  
  // Security simulation configurations
  const [activeRole, setActiveRole] = useState<'Administrador' | 'Gestor Financeiro' | 'Analista' | 'Visualizador'>('Administrador');

  // Sidebar toggle for mobile devices
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Core Financial states
  const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_TRANSACTIONS[DEFAULT_COMPANIES[0].id]);
  const [categories, setCategories] = useState<DreCategory[]>(DRE_CATEGORIES);
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);

  // Plano de Contas State
  const [planoContas, setPlanoContas] = useState<PlanoContasItem[]>([]);

  // Category Goals (Metas) and MonthConfigs (Working days & business pacing)
  const [categoryGoals, setCategoryGoals] = useState<CategoryGoal[]>([]);
  const [monthConfigs, setMonthConfigs] = useState<MonthConfig[]>([]);

  // Tab control state (Unifying financial DRE, BI charts, and procurement-supply chain)
  const [activeTab, setActiveTab] = useState<'dre' | 'charts' | 'import' | 'plano' | 'projections' | 'ai' | 'procurement' | 'database_import' | 'supabase'>('dre');

  // State to hold query passed from DatabaseUploadModule to AiAssistant
  const [pendingAiQuery, setPendingAiQuery] = useState<string | null>(null);

  // Active subtab inside procurement module
  const [procurementSubTab, setProcurementSubTab] = useState<'indicators' | 'quotes'>('indicators');

  // Sidebar expanded / collapsed states
  const [isDreExpanded, setIsDreExpanded] = useState(true);
  const [isCompraExpanded, setIsCompraExpanded] = useState(true);

  // Load category goals and month configs based on active company
  useEffect(() => {
    try {
      const savedGoals = localStorage.getItem(`category_goals_${activeCompany.id}`);
      setCategoryGoals(savedGoals ? JSON.parse(savedGoals) : []);
    } catch {
      setCategoryGoals([]);
    }

    try {
      const savedConfigs = localStorage.getItem(`month_configs_${activeCompany.id}`);
      setMonthConfigs(savedConfigs ? JSON.parse(savedConfigs) : []);
    } catch {
      setMonthConfigs([]);
    }
  }, [activeCompany.id]);

  const handleSaveCategoryGoal = (categoryId: string, month: string, targetValue: number) => {
    setCategoryGoals(prev => {
      const filtered = prev.filter(g => !(g.categoryId === categoryId && g.month === month));
      const newVal = [...filtered, { categoryId, month, targetValue }];
      localStorage.setItem(`category_goals_${activeCompany.id}`, JSON.stringify(newVal));
      return newVal;
    });
  };

  const handleSaveMonthConfig = (month: string, totalWorkingDays: number, elapsedWorkingDays: number) => {
    setMonthConfigs(prev => {
      const filtered = prev.filter(c => c.month !== month);
      const newVal = [...filtered, { month, totalWorkingDays, elapsedWorkingDays }];
      localStorage.setItem(`month_configs_${activeCompany.id}`, JSON.stringify(newVal));
      return newVal;
    });
  };

  // Load companies list from API database
  const loadCompanies = async () => {
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await safeFetchJson(res);
        if (Array.isArray(data) && data.length > 0) {
          setCompanies(data);
          
          // Re-evaluate active company if it changed or wasn't set correctly
          const existingActive = data.find(c => c.id === activeCompany.id);
          if (!existingActive) {
            setActiveCompany(data[0]);
          } else {
            setActiveCompany(existingActive);
          }
        }
      }
    } catch (err) {
      console.error("Error loading companies from API:", err);
    }
  };

  // Load Plano de Contas from Express API database
  const loadPlanoContas = async () => {
    try {
      const res = await fetch('/api/plano_contas');
      if (res.ok) {
        const data = await safeFetchJson(res);
        if (Array.isArray(data)) {
          setPlanoContas(data);
        }
      }
    } catch (err) {
      console.error("Error loading plano de contas:", err);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadPlanoContas();
  }, [activeTab]); // Fetch on mount or tab swap to reflect company modifications right away

  // Map and enrich transactions dynamically so everything relies on Plano de Contas master configurations
  const enrichedTransactions = React.useMemo(() => {
    return transactions.map(t => {
      const codeToFind = String(t.conta || '').trim();
      const nameToFind = String(t.account || t.descricaoConta || '').trim();
      
      const match = planoContas.find(pc => 
        (codeToFind && pc.code.trim() === codeToFind) || 
        (nameToFind && pc.name.trim().toLowerCase() === nameToFind.toLowerCase())
      );
      
      if (match) {
        const classificationId = match.classificationId;
        // ALL ITEMS IN PLANO DE CONTAS ARE EXPENSES (DESPESAS)
        const rawValue = Math.abs(t.value);
        const mathematicalValue = -rawValue;
        
        return {
          ...t,
          classification: classificationId,
          costType: match.costType,
          description: t.description || match.name,
          account: match.name,
          conta: match.code,
          descricaoConta: match.name,
          value: mathematicalValue
        };
      }
      return t;
    });
  }, [transactions, planoContas]);

  // Find unique account codes within active state that are missing from the Plano de Contas
  const pendingUnregisteredAccounts = React.useMemo(() => {
    const unique = new Set<string>();
    transactions.forEach(t => {
      const code = String(t.conta || '').trim();
      if (code) {
        const exists = planoContas.some(pc => pc.code === code);
        if (!exists) {
          unique.add(code);
        }
      }
    });
    return Array.from(unique);
  }, [transactions, planoContas]);

  // Plano de Contas CRUD callback handlers linked to SQLite proxy endpoints
  const handleAddPlanoContasItem = async (newItem: Omit<PlanoContasItem, 'id'>) => {
    try {
      const res = await fetch('/api/plano_contas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          company_id: activeCompany.id
        })
      });
      const data = await safeFetchJson(res);
      if (!res.ok) {
        return { success: false, error: data.error || "Falha ao cadastrar no Plano de Contas (Erro Servidor)." };
      }
      setPlanoContas(prev => [...prev, data]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Erro de conexão." };
    }
  };

  const handleUpdatePlanoContasItem = async (id: string, updatedFields: Partial<PlanoContasItem>) => {
    try {
      const res = await fetch(`/api/plano_contas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      const data = await safeFetchJson(res);
      if (!res.ok) {
        return { success: false, error: data.error || "Falha ao atualizar no Plano de Contas." };
      }
      setPlanoContas(prev => prev.map(item => item.id === id ? data : item));
      
      // RULE: "Ao editar: Atualizar automaticamente os lançamentos futuros relacionados à conta."
      // Let's propagate updates dynamically to transactions state matching this code
      const updatedCode = data.code;
      const updatedCatId = data.classificationId;
      const updatedCostType = data.costType;

      setTransactions(prev => prev.map(t => {
        if (t.conta === updatedCode || t.account === updatedCode) {
          return {
            ...t,
            classification: updatedCatId,
            costType: updatedCostType === 'N/A' ? 'N/A' : updatedCostType,
            // ALL ITEMS IN PLANO DE CONTAS ARE EXPENSES PER NEW INSTRUCTION
            value: -Math.abs(t.value)
          };
        }
        return t;
      }));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Erro de conexão." };
    }
  };

  const handleDeletePlanoContasItem = async (id: string) => {
    try {
      const item = planoContas.find(pc => pc.id === id);
      if (!item) return { success: false, error: "Identificador não localizado." };

      // Determine linked transactions for safety guidelines
      const hasMovements = transactions.some(t => t.conta === item.code || t.account === item.code);
      
      let res;
      if (hasMovements) {
        const confirmInactivate = window.confirm(
          `Atenção: A conta "${item.code} - ${item.name}" possui lançamentos históricos vinculados.\n\nPara segurança do banco de dados, ela não será excluída, mas sim INATIVADA.`
        );
        if (!confirmInactivate) return { success: false, aborted: true };

        res = await fetch(`/api/plano_contas/${id}?hasMovements=true`, { method: 'DELETE' });
      } else {
        const confirmDelete = window.confirm(
          `Deseja realmente EXCLUIR permanentemente a conta "${item.code} - ${item.name}"?`
        );
        if (!confirmDelete) return { success: false, aborted: true };

        res = await fetch(`/api/plano_contas/${id}`, { method: 'DELETE' });
      }

      const data = await safeFetchJson(res);
      if (!res.ok) return { success: false, error: data.error };

      if (hasMovements) {
        setPlanoContas(prev => prev.map(pc => pc.id === id ? { ...pc, active: false } : pc));
      } else {
        setPlanoContas(prev => prev.filter(pc => pc.id !== id));
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Load transactions from SQLite database/file persistence via Express
  const loadTransactionsForCompany = async (companyId: string) => {
    try {
      const res = await fetch(`/api/transactions?company_id=${companyId}`);
      if (res.ok) {
        const data = await safeFetchJson(res);
        if (Array.isArray(data) && data.length > 0) {
          setTransactions(data);
          return;
        }
      }
      // If none found in database, seed default preloads
      const seed = DEFAULT_TRANSACTIONS[companyId] || [];
      setTransactions(seed);
      // Persist defaults immediately to make sure they are stored permanently
      saveTransactionsToServer(companyId, seed);
    } catch (err) {
      console.error("Error loading transactions:", err);
      setTransactions(DEFAULT_TRANSACTIONS[companyId] || []);
    }
  };

  useEffect(() => {
    loadTransactionsForCompany(activeCompany.id);
  }, [activeCompany.id]);

  const saveTransactionsToServer = async (companyId: string, txs: Transaction[]) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          transactions: txs
        })
      });
      if (res.ok) {
        await safeFetchJson(res);
      }
    } catch (err) {
      console.error("Error saving transactions permanently:", err);
    }
  };

  // Trigger reloading transactions when changing simulated Tenant Company
  const selectActiveCompany = (company: Company) => {
    setActiveCompany(company);
  };

  // Transaction Event Handlers
  const handleAddTransaction = (tx: Transaction) => {
    setTransactions(prev => {
      const updated = [tx, ...prev];
      saveTransactionsToServer(activeCompany.id, updated);
      return updated;
    });
  };

  const handleSaveManualRevenue = (competency: string, products: number, services: number, other: number, shareholder: number) => {
    setTransactions(prev => {
      // Filter out existing manual or other revenues for this competency month
      const filtered = prev.filter(t => {
        const parts = t.date.split('-');
        const currentComp = `${parts[0]}-${parts[1]}`;
        const isRevenue = t.classification === 'sales_products' || t.classification === 'sales_services' || t.classification === 'shareholder_contribution';
        const isThisComp = currentComp === competency;
        return !(isRevenue && isThisComp);
      });

      const newTxs: Transaction[] = [];
      const idPrefix = `rev_manual_${competency}_${Date.now()}`;
      
      if (products > 0) {
        newTxs.push({
          id: `${idPrefix}_prod`,
          date: `${competency}-15`,
          account: 'Entradas Manuais',
          description: `Receita de Venda de Produtos - Ref: ${competency}`,
          classification: 'sales_products',
          costType: 'N/A',
          value: products
        });
      }
      
      if (services > 0) {
        newTxs.push({
          id: `${idPrefix}_serv`,
          date: `${competency}-15`,
          account: 'Entradas Manuais',
          description: `Receita de Prestação de Serviços - Ref: ${competency}`,
          classification: 'sales_services',
          costType: 'N/A',
          value: services
        });
      }

      if (other > 0) {
        newTxs.push({
          id: `${idPrefix}_other`,
          date: `${competency}-15`,
          account: 'Entradas Manuais',
          description: `Outras Receitas - Ref: ${competency}`,
          classification: 'sales_products', // Mapped under sales_products for total_sales formula
          costType: 'N/A',
          value: other
        });
      }

      if (shareholder > 0) {
        newTxs.push({
          id: `${idPrefix}_share`,
          date: `${competency}-15`,
          account: 'Aportes de Sócios',
          description: `Aporte de Capital - Ref: ${competency}`,
          classification: 'shareholder_contribution',
          costType: 'N/A',
          value: shareholder
        });
      }

      const updated = [...newTxs, ...filtered];
      saveTransactionsToServer(activeCompany.id, updated);
      return updated;
    });
  };

  const handleImportTransactions = (txs: Transaction[]) => {
    // Append imported transaction records instead of overwriting, ensuring files/batches accumulate together.
    setTransactions(prev => {
      const updated = [...txs, ...prev];
      saveTransactionsToServer(activeCompany.id, updated);
      return updated;
    });
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      saveTransactionsToServer(activeCompany.id, updated);
      return updated;
    });
  };

  const handleClearAllTransactions = () => {
    if(window.confirm('Tem certeza que deseja apagar todos os lançamentos correntes da empresa ativa?')) {
      setTransactions([]);
      saveTransactionsToServer(activeCompany.id, []);
    }
  };

  const handleUpdateTransactionCategory = (txId: string, newCatId: string) => {
    setTransactions(prev => {
      const updated = prev.map(t => t.id === txId ? { ...t, classification: newCatId } : t);
      saveTransactionsToServer(activeCompany.id, updated);
      return updated;
    });
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => {
      const updated = prev.map(t => t.id === updatedTx.id ? updatedTx : t);
      saveTransactionsToServer(activeCompany.id, updated);
      return updated;
    });
  };

  // Plano de Contas Mapping Rules handlers
  const handleAddRule = (rule: Rule) => {
    setRules(prev => [rule, ...prev]);
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateCategoryName = (catId: string, newName: string) => {
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, name: newName } : c));
  };

  const handleResetRulesToDefault = () => {
    setRules(DEFAULT_RULES);
  };

  // Gather current calculated totals for AI analysis
  const computeFinancialContext = () => {
    const months = Array.from(new Set(enrichedTransactions.map(t => {
      const parts = t.date.split('-');
      return `${parts[0]}-${parts[1]}`;
    }))).sort();

    const getSum = (catId: string) => {
      return enrichedTransactions
        .filter(t => t.classification === catId)
        .reduce((sum, t) => sum + t.value, 0);
    };

    const totalNetRevenue = enrichedTransactions
      .filter(t => t.classification === 'sales_products' || t.classification === 'sales_services')
      .reduce((s, t) => s + t.value, 0);

    const totalOpex = enrichedTransactions
      .filter(t => t.classification.startsWith('opex_'))
      .reduce((s, t) => s + Math.abs(t.value), 0);

    const totalEbitda = totalNetRevenue - totalOpex;

    return {
      companyName: activeCompany.name,
      sector: activeCompany.sector,
      months,
      totalNetRevenue,
      totalOpex,
      totalEbitda,
      transactionsCount: enrichedTransactions.length,
      planoContas: planoContas.map(p => ({
        codigo: p.code,
        nome: p.name,
        categoria: p.classificationId,
        subcategoria: p.subCategory,
        tipoCusto: p.costType,
        ativo: p.active
      })),
      regrasMapeamento: rules.map(r => ({
        termo: r.pattern,
        dreGrupoDestino: r.targetCategoryId
      })),
      categoriasDRE: categories.map(c => ({
        id: c.id,
        nome: c.name,
        formula: c.formulaRef
      })),
      breakdown: enrichedTransactions.map(x => ({
        data: x.date,
        conta: x.conta,
        descricao: x.description,
        valor: x.value,
        categoria: x.classification
      }))
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans antialiased text-slate-800">
      
      {/* MOBILE HEADER BAR */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-40 text-slate-350">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-400" />
          <span className="text-sm font-black tracking-widest uppercase text-white">DRE Inteligente</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-slate-200 hover:text-white p-1 hover:bg-slate-800 rounded-lg focus:outline-none"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* DETACHED PERSISTENT SIDEBAR - COLLAPSIBLE ON MOBILE */}
      <aside className={`
        fixed inset-y-0 left-0 bg-slate-900 text-slate-350 z-50 w-64 border-r border-slate-800 flex flex-col transition-transform duration-300 transform shrink-0
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 text-white p-1.5 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-1">
                Gestão Inteligente
              </h1>
              <p className="text-[9px] text-indigo-400 font-extrabold uppercase">Business Suite SaaS</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Tenant Switcher (Multi-Tenant RLS Simulation) */}
        <div className="p-4 border-b border-slate-800 space-y-1.5 bg-slate-950/20">
          <div className="flex justify-between items-center">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Multi-Empresa (Tenant)</span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase px-1.5 py-0.2 rounded font-mono">RLS</span>
          </div>
          <select
            value={activeCompany.id}
            onChange={(e) => {
              const found = companies.find(c => c.id === e.target.value);
              if (found) {
                setActiveCompany(found);
                setTransactions(DEFAULT_TRANSACTIONS[found.id] || []);
              }
            }}
            style={{ cursor: 'pointer' }}
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl py-2 px-3 text-xs font-bold font-sans cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-950 text-slate-200">
                🏢 {c.name}
              </option>
            ))}
          </select>
          <div className="flex justify-between text-[9px] text-slate-400/80 font-mono pl-1">
            <span>CNPJ: {activeCompany.cnpj}</span>
          </div>
        </div>

        {/* Categories / Tabs Sections Group */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          
          {/* Main Module 1: DRE Inteligente Accordion Header */}
          <div className="space-y-1">
            <button
              onClick={() => setIsDreExpanded(!isDreExpanded)}
              style={{ cursor: 'pointer' }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 transition-all border cursor-pointer select-none ${
                activeTab !== 'procurement'
                  ? 'bg-indigo-950/40 border-indigo-500/20 text-white font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/15'
              }`}
            >
              <div className="p-1 rounded bg-indigo-505/10">
                <Layers className={`h-4 w-4 shrink-0 ${activeTab !== 'procurement' ? 'text-indigo-400' : 'text-slate-500'}`} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">DRE Inteligente</span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="bg-indigo-500/15 text-indigo-300 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide font-mono">Controladoria</span>
                {isDreExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Sub-applications nested under DRE Inteligente (Collapsible) */}
            <AnimatePresence initial={false}>
              {isDreExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden pl-3.5 border-l border-slate-800/70 ml-3.5 mt-1 space-y-1"
                >
                  <button
                    onClick={() => { setActiveTab('dre'); setIsSidebarOpen(false); }}
                    style={{ cursor: 'pointer' }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'dre'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${activeTab === 'dre' ? 'bg-white' : 'bg-transparent'}`} />
                    DRE Dinâmica
                  </button>

                  <button
                    onClick={() => { setActiveTab('charts'); setIsSidebarOpen(false); }}
                    style={{ cursor: 'pointer' }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'charts'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${activeTab === 'charts' ? 'bg-white' : 'bg-transparent'}`} />
                    BI Dashboards
                  </button>

                  <button
                    onClick={() => { setActiveTab('import'); setIsSidebarOpen(false); }}
                    style={{ cursor: 'pointer' }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'import'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${activeTab === 'import' ? 'bg-white' : 'bg-transparent'}`} />
                    Lançamentos & CSV
                  </button>

                  <button
                    onClick={() => { setActiveTab('plano'); setIsSidebarOpen(false); }}
                    style={{ cursor: 'pointer' }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'plano'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${activeTab === 'plano' ? 'bg-white' : 'bg-transparent'}`} />
                    Plano de Contas
                  </button>

                  <button
                    onClick={() => { setActiveTab('projections'); setIsSidebarOpen(false); }}
                    style={{ cursor: 'pointer' }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'projections'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${activeTab === 'projections' ? 'bg-white' : 'bg-transparent'}`} />
                    Metas & Simulações
                  </button>

                  <button
                    onClick={() => { setActiveTab('ai'); setIsSidebarOpen(false); }}
                    style={{ cursor: 'pointer' }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'ai'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${activeTab === 'ai' ? 'bg-white' : 'bg-emerald-400'}`} />
                    CFO Virtual IA
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main Module 2: Compra Inteligente Accordion Header */}
          <div className="space-y-1 pt-3 border-t border-slate-850">
            <button
              onClick={() => setIsCompraExpanded(!isCompraExpanded)}
              style={{ cursor: 'pointer' }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 transition-all border cursor-pointer select-none ${
                activeTab === 'procurement' || activeTab === 'database_import'
                  ? 'bg-indigo-950/40 border-indigo-500/20 text-white font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/15'
              }`}
            >
              <div className="p-1 rounded bg-indigo-505/10">
                <ShoppingCart className={`h-4 w-4 shrink-0 ${activeTab === 'procurement' || activeTab === 'database_import' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Compra Inteligente</span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="bg-emerald-500/15 text-emerald-300 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide font-mono">Suprimentos</span>
                {isCompraExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>
            </button>
            
            {/* Sub-applications nested under Compra Inteligente (Collapsible) */}
            <AnimatePresence initial={false}>
              {isCompraExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden pl-3.5 border-l border-slate-800/70 ml-3.5 mt-1 space-y-1"
                >
                  <button
                    onClick={() => { setActiveTab('procurement'); setProcurementSubTab('indicators'); setIsSidebarOpen(false); }}
                    style={{ cursor: 'pointer' }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'procurement' && procurementSubTab === 'indicators'
                        ? 'bg-emerald-650 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${activeTab === 'procurement' && procurementSubTab === 'indicators' ? 'bg-white' : 'bg-transparent'}`} />
                    Gestão de Compras
                  </button>

                  <button
                    onClick={() => { setActiveTab('procurement'); setProcurementSubTab('quotes'); setIsSidebarOpen(false); }}
                    style={{ cursor: 'pointer' }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'procurement' && procurementSubTab === 'quotes'
                        ? 'bg-emerald-650 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${activeTab === 'procurement' && procurementSubTab === 'quotes' ? 'bg-white' : 'bg-transparent'}`} />
                    Gestão de Estoque
                  </button>

                  <button
                    onClick={() => { setActiveTab('database_import'); setIsSidebarOpen(false); }}
                    style={{ cursor: 'pointer' }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'database_import'
                        ? 'bg-emerald-650 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${activeTab === 'database_import' ? 'bg-white' : 'bg-transparent'}`} />
                    Banco de Dados (IBK)
                  </button>

                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/45 space-y-3 shrink-0">
          <button
            onClick={() => { setActiveTab('supabase'); setIsSidebarOpen(false); }}
            style={{ cursor: 'pointer' }}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
              activeTab === 'supabase'
                ? 'bg-indigo-950 border-indigo-500/30 text-white shadow-xs'
                : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className={`h-3.5 w-3.5 ${activeTab === 'supabase' ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span className="text-[10.5px]">Conexão Supabase</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>
          
          <div className="space-y-1">
            <label className="text-[8.5px] uppercase font-black tracking-wider text-slate-500 block pl-1">Perfil de Acesso</label>
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-705 text-slate-300 rounded-xl py-1.5 px-2.5 text-[10.5px] font-bold cursor-pointer focus:outline-none"
            >
              <option value="Administrador">👑 Administrador</option>
              <option value="Gestor Financeiro">💼 Gestor Financeiro</option>
              <option value="Analista">📊 Analista</option>
              <option value="Visualizador">👁️ Visualizador</option>
            </select>
          </div>
        </div>
      </aside>

      {/* OVERLAY FOR OPEN MOBILE SIDEBAR */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* PREMIUM UPPER NAVBAR */}
        <header className="bg-white border-b border-slate-100 shadow-2xs px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 block uppercase tracking-wider">
                {activeTab === 'dre' && 'DRE Inteligente • Consolidação Periódica'}
                {activeTab === 'charts' && 'DRE Inteligente • BI Dashboards • Análise Visual de Balanço'}
                {activeTab === 'import' && 'DRE Inteligente • Planilha & Lançamentos • Gestão Operacional'}
                {activeTab === 'plano' && 'DRE Inteligente • Plano de Contas • Configuração Estrutural'}
                {activeTab === 'projections' && 'DRE Inteligente • Metas & Simulações • Viabilidade e Pacing'}
                {activeTab === 'ai' && 'DRE Inteligente • CFO Virtual • Assistência e Auditoria IA'}
                {activeTab === 'procurement' && 'Compra Inteligente • Gestão de Compras, Estoques e Sourcing'}
                {activeTab === 'database_import' && 'Compra Inteligente • Importação de Banco de Dados (.IBK)'}
              </span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight mt-0.5">
              Workspace Corporativo • {activeCompany.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5 text-[10px] font-black text-indigo-800 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
              Isolamento RLS Ativo
            </div>
          </div>
        </header>

        {/* WORKSPACE AREA BODY CONTAINER */}
        <div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl w-full mx-auto overflow-y-auto">
          
          {/* Header Metadata Info Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
              <Layers className="h-48 w-48 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-indigo-650 text-indigo-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md">Tenant Isolado</span>
                <span className="text-xs text-slate-400 font-mono">CNPJ: {activeCompany.cnpj} • Setor: {activeCompany.sector}</span>
              </div>
              <h3 className="text-lg font-bold mt-1 tracking-tight text-white">{activeCompany.name}</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {activeTab === 'database_import'
                  ? 'Importe o backup do banco de dados relacional (.IBK) da sua empresa para que o Assistente de IA de livre acesso cruze as tabelas em queries SQL complexas.'
                  : activeTab === 'procurement' 
                    ? 'Análise de compras e cotações sob demanda, auditoria de estoque de reposição e integridade da sua cadeia de suprimentos sob tutela de IA Senior.'
                    : 'Consolide sua DRE, gerencie subcategorias do seu plano de contas, e obtenha previsões matemáticas avançadas baseadas em múltiplos de EBITDA.'}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Lançamentos</span>
                <span className="text-sm font-bold text-emerald-400 block mt-0.5">{enrichedTransactions.length} Itens</span>
              </div>
              <div className="h-8 w-[1px] bg-slate-700" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Perfil Atual</span>
                <span className="text-xs text-indigo-300 font-bold block mt-0.5">{activeRole}</span>
              </div>
            </div>
          </div>

          {/* Module Content Rendering Router */}
          <div className="transition-all duration-300">
            {activeTab === 'dre' && (
              <div className="space-y-4">
                {enrichedTransactions.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 flex items-start gap-3 text-amber-800">
                    <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs uppercase tracking-wider">Aviso de Limites de Consolidação</h5>
                      <p className="text-xs mt-0.5">Seu faturamento e custos para esta empresa estão zerados. Acesse a aba <strong>"Planilhas & Lançamentos"</strong> para importar o layout CSV padrão do MVP ou inclua lançamentos demonstrativos com um clique.</p>
                    </div>
                  </div>
                )}
                <DreGrid 
                  transactions={enrichedTransactions} 
                  categories={categories}
                  onUpdateTransactionCategory={handleUpdateTransactionCategory}
                  onUpdateCategoryName={handleUpdateCategoryName}
                  categoryGoals={categoryGoals}
                  monthConfigs={monthConfigs}
                  onSaveCategoryGoal={handleSaveCategoryGoal}
                  onSaveMonthConfig={handleSaveMonthConfig}
                />
              </div>
            )}

            {activeTab === 'charts' && (
              <DashboardCharts 
                transactions={enrichedTransactions} 
                categories={categories} 
              />
            )}

            {activeTab === 'import' && (
              <TransactionList 
                transactions={enrichedTransactions}
                categories={categories}
                rules={rules}
                planoContas={planoContas}
                pendingUnregisteredAccounts={pendingUnregisteredAccounts}
                onAddAccount={handleAddPlanoContasItem}
                onAddTransaction={handleAddTransaction}
                onImportTransactions={handleImportTransactions}
                onDeleteTransaction={handleDeleteTransaction}
                onClearAll={handleClearAllTransactions}
                onSaveManualRevenue={handleSaveManualRevenue}
                onUpdateTransaction={handleUpdateTransaction}
              />
            )}

            {activeTab === 'plano' && (
              <PlanoContas 
                planoContas={planoContas}
                onAddAccount={handleAddPlanoContasItem}
                onUpdateAccount={handleUpdatePlanoContasItem}
                onDeleteAccount={handleDeletePlanoContasItem}
                categories={categories}
              />
            )}

            {activeTab === 'projections' && (
              <ForecastModule 
                transactions={enrichedTransactions}
                categories={categories}
                categoryGoals={categoryGoals}
                monthConfigs={monthConfigs}
                onSaveCategoryGoal={handleSaveCategoryGoal}
                onSaveMonthConfig={handleSaveMonthConfig}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onUpdateTransaction={handleUpdateTransaction}
              />
            )}

            {activeTab === 'ai' && (
              <AiAssistant 
                dreContext={computeFinancialContext()} 
                companyId={activeCompany.id}
                userId={activeRole}
                pendingQuery={pendingAiQuery}
                onClearPendingQuery={() => setPendingAiQuery(null)}
              />
            )}

            {activeTab === 'database_import' && (
              <DatabaseUploadModule 
                onDatabaseIntegrated={(dbInfo) => {
                  console.log('Database integrated:', dbInfo);
                }}
                onRunQueryInChat={(queryText) => {
                  setPendingAiQuery(queryText);
                  setActiveTab('ai');
                }}
              />
            )}

            {activeTab === 'procurement' && (
              <ProcurementModule 
                companyId={activeCompany.id}
                userId={activeRole}
                dreContext={computeFinancialContext()}
                activeSubTab={procurementSubTab}
                onSubTabChange={(tab) => setProcurementSubTab(tab)}
              />
            )}

            {activeTab === 'supabase' && (
              <SupabaseDiag />
            )}
          </div>
        </div>

        {/* Aesthetic Footer */}
        <footer className="mt-auto bg-white border-t border-slate-100 px-6 py-4 text-center text-xs text-slate-400 shrink-0">
          <p className="font-mono text-[10px] tracking-wider uppercase">DRE Inteligente Suite • Plataforma de Gestão Corporativa MVP</p>
          <p className="text-slate-400 mt-0.5">Isolamento multi-empresa nativo da DRE com controlador de suprimentos senior integrado.</p>
        </footer>
      </main>
    </div>
  );
}
