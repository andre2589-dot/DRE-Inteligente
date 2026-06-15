/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Company, Transaction, Rule, DreCategory, PlanoContasItem } from './types';
import { 
  DEFAULT_COMPANIES, 
  DRE_CATEGORIES, 
  DEFAULT_RULES, 
  DEFAULT_TRANSACTIONS 
} from './data/defaultData';

// Modular children components
import TransactionList from './components/TransactionList';
import DreGrid from './components/DreGrid';
import DashboardCharts from './components/DashboardCharts';
import ForecastModule from './components/ForecastModule';
import PlanoContas from './components/PlanoContas';
import AiAssistant from './components/AiAssistant';
import DocsHub from './components/DocsHub';
import SupabaseDiag from './components/SupabaseDiag';

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
  Database
} from 'lucide-react';

export default function App() {
  // Multitenant companies
  const [companies, setCompanies] = useState<Company[]>(DEFAULT_COMPANIES);
  const [activeCompany, setActiveCompany] = useState<Company>(DEFAULT_COMPANIES[0]);
  
  // Security simulation configurations
  const [activeRole, setActiveRole] = useState<'Administrador' | 'Gestor Financeiro' | 'Analista' | 'Visualizador'>('Administrador');

  // Core Financial states
  const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_TRANSACTIONS[DEFAULT_COMPANIES[0].id]);
  const [categories, setCategories] = useState<DreCategory[]>(DRE_CATEGORIES);
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);

  // Plano de Contas State
  const [planoContas, setPlanoContas] = useState<PlanoContasItem[]>([]);

  // Tab control state
  const [activeTab, setActiveTab] = useState<'dre' | 'charts' | 'import' | 'plano' | 'projections' | 'ai' | 'docs' | 'diagnostico'>('dre');

  // Helper to parse responses safely and avoid Unexpected token 'T' or similar errors when server restarts or returns HTML
  const safeFetchJson = async (res: Response) => {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        return await res.json();
      } catch (e) {
        throw new Error("Erro de formatação: A resposta recebida do servidor não é um JSON válido.");
      }
    }
    const text = await res.text();
    if (text.includes("The page") || text.includes("<html") || text.includes("<!DOCTYPE")) {
      throw new Error("O servidor está indisponível ou reiniciando no momento. Por favor, aguarde alguns segundos e tente novamente.");
    }
    throw new Error(text || `Erro de servidor (Código HTTP ${res.status}).`);
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
      const codeToFind = String(t.conta || t.account || '').trim();
      const match = planoContas.find(pc => pc.code === codeToFind);
      
      if (match) {
        const classificationId = match.classificationId;
        const isProductOrService = classificationId === 'sales_products' || classificationId === 'sales_services';
        const rawValue = Math.abs(t.value);
        const mathematicalValue = isProductOrService ? rawValue : -rawValue;
        
        return {
          ...t,
          classification: classificationId,
          costType: match.costType,
          description: t.description || match.name,
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
            value: (updatedCatId === 'sales_products' || updatedCatId === 'sales_services') 
              ? Math.abs(t.value) 
              : -Math.abs(t.value)
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

  const handleSaveManualRevenue = (competency: string, products: number, services: number, other: number) => {
    setTransactions(prev => {
      // Filter out existing manual or other revenues for this competency month
      const filtered = prev.filter(t => {
        const parts = t.date.split('-');
        const currentComp = `${parts[0]}-${parts[1]}`;
        const isRevenue = t.classification === 'sales_products' || t.classification === 'sales_services';
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

      const updated = [...newTxs, ...filtered];
      saveTransactionsToServer(activeCompany.id, updated);
      return updated;
    });
  };

  const handleImportTransactions = (txs: Transaction[]) => {
    // Overwrite to be a 100% faithful mirror of the imported spreadsheet
    setTransactions(txs);
    saveTransactionsToServer(activeCompany.id, txs);
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
    <div className="min-h-screen bg-slate-50/50 font-sans antialiased text-slate-800 flex flex-col">
      
      {/* Premium Header Banner */}
      <header className="bg-white border-b border-slate-100 shadow-xs px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* SaaS Identity */}
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
              DRE Inteligente
              <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest animate-pulse">SaaS BI</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">Plataforma Integrada de Demonstrações Financeiras e CFO Virtual</p>
          </div>
        </div>

        {/* Multitenant Control & Active Role selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Company */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100/80 rounded-xl px-3 py-1.5">
            <Building className="h-4 w-4 text-slate-400" />
            <select
              value={activeCompany.id}
              onChange={(e) => {
                const cmp = companies.find(c => c.id === e.target.value);
                if (cmp) selectActiveCompany(cmp);
              }}
              className="bg-transparent text-xs font-bold text-slate-700 border-none cursor-pointer focus:outline-none focus:ring-0"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Active User Security Role */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100/80 rounded-xl px-3 py-1.5">
            <User className="h-4 w-4 text-slate-400" />
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-700 border-none cursor-pointer focus:outline-none focus:ring-0"
            >
              <option value="Administrador">👑 Administrador</option>
              <option value="Gestor Financeiro">💼 Gestor Financeiro</option>
              <option value="Analista">📊 Analista</option>
              <option value="Visualizador">👁️ Visualizador</option>
            </select>
          </div>

          {/* Dynamic tenant security profile visualization */}
          <div className="hidden xl:flex items-center gap-1 bg-indigo-50/50 border border-indigo-100 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-indigo-800">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
            RLS Ativo • Isolado
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Multi-Tenant Metadata Info Header */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
            <Layers className="h-48 w-48 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-indigo-650 text-indigo-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md">Ativo</span>
              <span className="text-xs text-slate-400 font-mono">CNPJ: {activeCompany.cnpj} • Setor: {activeCompany.sector}</span>
            </div>
            <h2 className="text-xl font-bold mt-1 tracking-tight text-white">{activeCompany.name}</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Consolide sua DRE, gerencie subcategorias do seu plano de contas, e obtenha previsões matemáticas avançadas baseadas em múltiplos de EBITDA.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Lançamentos</span>
              <span className="text-sm font-bold text-emerald-400 block mt-0.5">{enrichedTransactions.length} Lançamentos</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-700" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Permissões</span>
              <span className="text-xs text-indigo-300 font-bold block mt-0.5">Escrita & Leitura</span>
            </div>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200/60 pb-1">
          <button
            onClick={() => setActiveTab('dre')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dre'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 hover:bg-slate-155 hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            DRE Dinâmica
          </button>

          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'charts'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 hover:bg-slate-155 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            BI Dashboards
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 hover:bg-slate-155 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Planilhas & Lançamentos
          </button>

          <button
            onClick={() => setActiveTab('plano')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'plano'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 hover:bg-slate-155 hover:text-slate-900'
            }`}
          >
            <Settings2 className="h-4 w-4" />
            Plano de Contas
          </button>

          <button
            onClick={() => setActiveTab('projections')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'projections'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 hover:bg-slate-155 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Simulador de Projeções
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 hover:bg-slate-155 hover:text-slate-900'
            }`}
          >
            <Bot className="h-4 w-4 text-emerald-500 animate-bounce" />
            Assistente IA
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'docs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 hover:bg-slate-155 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            Arquitetura & SQL SaaS
          </button>

          <button
            onClick={() => setActiveTab('diagnostico')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'diagnostico'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 hover:bg-slate-155 hover:text-slate-900'
            }`}
          >
            <Database className="h-4 w-4 text-indigo-500" />
            Sincronização & Diagnóstico Supabase
          </button>
        </div>

        {/* Tab Body Contents Rendering */}
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
              transactions={transactions}
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
            />
          )}

          {activeTab === 'ai' && (
            <AiAssistant 
              dreContext={computeFinancialContext()} 
              companyId={activeCompany.id}
              userId={activeRole}
            />
          )}

          {activeTab === 'docs' && (
            <DocsHub />
          )}

          {activeTab === 'diagnostico' && (
            <SupabaseDiag />
          )}
        </div>
      </main>

      {/* Aesthetic Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 border-t border-slate-800/50 px-6 py-5 text-center text-xs">
        <p className="font-mono text-[10px] tracking-wider uppercase">DRE Inteligente • Plataforma BI SaaS Financeira Avançada</p>
        <p className="text-slate-500 mt-1">Conforme especificado no escopo MVP - Escrita relacional PostgreSQL e RLS Supabase integrados de ponta-a-ponta.</p>
      </footer>
    </div>
  );
}
