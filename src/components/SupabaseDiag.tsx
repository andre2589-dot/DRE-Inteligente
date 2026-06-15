import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../utils/safeFetch';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Database, 
  UserCheck, 
  Server, 
  RefreshCw, 
  Play, 
  Building, 
  LogIn, 
  UserPlus, 
  Lock, 
  Check, 
  Mail,
  Shield,
  FileCheck
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface TableDiag {
  companies: boolean;
  plano_contas: boolean;
  transactions: boolean;
  ai_conversations: boolean;
  uploaded_files: boolean;
}

interface DiagStatus {
  configured: boolean;
  connected: boolean;
  authenticated: boolean;
  dbAccessible: boolean;
  tables: TableDiag;
  allTablesCreated: boolean;
  permissionsOk: boolean;
  userEmail: string | null;
  error: string | null;
}

export default function SupabaseDiag() {
  const [loading, setLoading] = useState<boolean>(true);
  const [seedLoading, setSeedLoading] = useState<boolean>(false);
  const [diag, setDiag] = useState<DiagStatus>({
    configured: false,
    connected: false,
    authenticated: false,
    dbAccessible: false,
    tables: {
      companies: false,
      plano_contas: false,
      transactions: false,
      ai_conversations: false,
      uploaded_files: false
    },
    allTablesCreated: false,
    permissionsOk: false,
    userEmail: null,
    error: null
  });

  // Client side credentials for direct auth interactions
  const [supabaseConfig, setSupabaseConfig] = useState<{ url: string; anonKey: string; isConfigured: boolean } | null>(null);
  const [supabaseClientInstance, setSupabaseClientInstance] = useState<any>(null);

  // Auth fields
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authMsg, setAuthMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Company management fields
  const [companyName, setCompanyName] = useState<string>('');
  const [companyCnpj, setCompanyCnpj] = useState<string>('');
  const [companySector, setCompanySector] = useState<string>('Tecnologia & SaaS');
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [savingCompany, setSavingCompany] = useState<boolean>(false);

  // Load diagnostics stats
  const runDiagnostics = async () => {
    setLoading(true);
    try {
      // 1. Fetch server config
      const configRes = await fetch('/api/supabase/config');
      if (configRes.ok) {
        const conf = await safeFetchJson(configRes);
        setSupabaseConfig(conf);
        if (conf.isConfigured && !supabaseClientInstance) {
          const client = createClient(conf.url, conf.anonKey);
          setSupabaseClientInstance(client);
        }
      }

      // 2. Fetch server-side live diagnostics report
      const reportRes = await fetch('/api/supabase/diagnose');
      if (reportRes.ok) {
        const data = await safeFetchJson(reportRes);
        setDiag(data);
      }

      // 3. Fetch companies directory
      const compRes = await fetch('/api/companies');
      if (compRes.ok) {
        const companies = await safeFetchJson(compRes);
        setCompaniesList(companies);
      }
    } catch (err: any) {
      console.error("Failed to collect diagnostics:", err);
      setDiag(prev => ({
        ...prev,
        error: "Falha ao se conectar com a API de diagnósticos do servidor express."
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  // Handle Seeding of Default Demo Data
  const handleSeedDatabase = async () => {
    setSeedLoading(true);
    setAuthMsg(null);
    try {
      const res = await fetch('/api/supabase/seed', {
        method: 'POST'
      });
      const data = await safeFetchJson(res);
      if (res.ok) {
        setAuthMsg({ type: 'success', text: data.message || "Tabelas e dados básicos semeados!" });
        runDiagnostics();
      } else {
        setAuthMsg({ type: 'error', text: data.error || "Erro de seeding do servidor." });
      }
    } catch (err: any) {
      setAuthMsg({ type: 'error', text: err.message || "Falha de comunicação de rede no seeding." });
    } finally {
      setSeedLoading(false);
    }
  };

  // Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg(null);
    if (!authEmail || !authPassword) {
      setAuthMsg({ type: 'error', text: 'Preencha o e-mail e senha!' });
      return;
    }

    if (supabaseClientInstance) {
      // Real Supabase Auth is configured! Let's call the actual Supabase SDK
      try {
        if (authMode === 'signup') {
          const { data, error } = await supabaseClientInstance.auth.signUp({
            email: authEmail,
            password: authPassword
          });
          if (error) throw error;
          setAuthMsg({ type: 'success', text: 'Cadastro realizado com sucesso! Verifique sua caixa de entrada se houver confirmação ativa.' });
        } else {
          const { data, error } = await supabaseClientInstance.auth.signInWithPassword({
            email: authEmail,
            password: authPassword
          });
          if (error) throw error;
          setAuthMsg({ type: 'success', text: `Autenticado com sucesso como ${data.user?.email}!` });
        }
        // Force refresh diagnostics
        runDiagnostics();
      } catch (err: any) {
        setAuthMsg({ type: 'error', text: err.message || 'Falha na autenticação do Supabase.' });
      }
    } else {
      // Offline/Simulation Mode fallback auth (Satisfies user tour gracefully)
      setAuthMsg({ 
        type: 'success', 
        text: `【MODO SIMULAÇÃO】Login efetuado com sucesso para a sessão de demonstração local!` 
      });
      // Patch local diagnostics authenticated status
      setDiag(prev => ({
        ...prev,
        authenticated: true,
        userEmail: authEmail
      }));
    }
  };

  // Sign out
  const handleSignOut = async () => {
    if (supabaseClientInstance) {
      try {
        await supabaseClientInstance.auth.signOut();
        setAuthMsg({ type: 'success', text: 'Desconectado com sucesso.' });
        runDiagnostics();
      } catch (err: any) {
        setAuthMsg({ type: 'error', text: err.message });
      }
    } else {
      setDiag(prev => ({
        ...prev,
        authenticated: false,
        userEmail: null
      }));
      setAuthMsg({ type: 'success', text: 'Sessão simulada encerrada.' });
    }
  };

  // Register enterprise company
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !companyCnpj) {
      alert("Por favor, preencha o Nome e o CNPJ da empresa.");
      return;
    }

    setSavingCompany(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          cnpj: companyCnpj,
          sector: companySector
        })
      });
      if (res.ok) {
        setCompanyName('');
        setCompanyCnpj('');
        await runDiagnostics();
        alert("Empresa cadastrada com sucesso!");
      } else {
        const errorData = await safeFetchJson(res);
        alert(`Erro: ${errorData.error || "Falha ao registrar a empresa."}`);
      }
    } catch (err: any) {
      alert(`Erro de conexão: ${err.message}`);
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Status Overview */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              Painel de Integração & Diagnóstico do Supabase
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Verifique a integridade operacional do seu banco de dados na nuvem SQL e administre as credenciais do ambiente SaaS.
            </p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Status
          </button>
        </div>
      </div>

      {/* Grid of 5 Mandatory Diagnostics metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Supabase Connected */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Supabase Conectado</span>
            <Server className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 ${
              diag.connected 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {diag.connected ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
              {diag.connected ? "SIM (Conectado)" : "NÃO"}
            </span>
          </div>
        </div>

        {/* Metric 2: Authenticated status */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Usuário Autenticado</span>
            <UserCheck className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 ${
              diag.authenticated 
                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' 
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {diag.authenticated ? <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
              {diag.authenticated ? "SIM (Autenticado)" : "NÃO"}
            </span>
          </div>
        </div>

        {/* Metric 3: Database accessible */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Banco Acessível</span>
            <Database className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 ${
              diag.connected
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {diag.connected ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
              {diag.connected ? "SIM (Online)" : "NÃO"}
            </span>
          </div>
        </div>

        {/* Metric 4: Schema Tables Created */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Tabelas Criadas</span>
            <FileCheck className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 ${
              diag.allTablesCreated 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {diag.allTablesCreated ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
              {diag.allTablesCreated ? "SIM (5/5 OK)" : "PENDENTE / PARCIAL"}
            </span>
          </div>
        </div>

        {/* Metric 5: Permissions Security OK */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Permissões RLS OK</span>
            <Shield className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 ${
              diag.permissionsOk 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {diag.permissionsOk ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
              {diag.permissionsOk ? "SIM (Permissões OK)" : "FALHA / INCOMPLETO"}
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Auth and Schema details */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* User Sign In and Registration Module */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4 text-indigo-600" />
              Supabase Auth - Identificação Corporativa
            </h4>

            {diag.authenticated ? (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 text-white p-2 rounded-xl">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Logado como:</span>
                    <strong className="text-slate-800 text-sm font-mono">{diag.userEmail || "Sessão Simulada (Guest)"}</strong>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200/50 pt-4">
                  <span className="text-xs text-slate-500">Acesso certificado relacional.</span>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-xs font-bold bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer"
                  >
                    Encerrar Sessão
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {/* Mode Selector */}
                <div className="flex border border-slate-100 rounded-xl p-1 bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                      authMode === 'signin' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Efetuar Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                      authMode === 'signup' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Cadastrar Usuário
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">E-mail Corporativo</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="nome@empresa.com"
                        className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/20 focus:outline-indigo-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Senha Secreta</label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/20 focus:outline-indigo-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-2"
                >
                  {authMode === 'signup' ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                  {authMode === 'signup' ? "Cadastrar Organização" : "Entrar com Credenciais"}
                </button>
              </form>
            )}

            {/* Response Alerts */}
            {authMsg && (
              <div className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed ${
                authMsg.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {authMsg.text}
              </div>
            )}
          </div>

          {/* Database Physical Schema Tables Diagnostic checklist */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Server className="h-4 w-4 text-indigo-600" />
              Mapeamento de Tabelas Requeridas (Padrão DRE)
            </h4>

            <div className="space-y-3">
              {[
                { label: "companies", desc: "Estrutura cadastral de multi-tenant (Empresas)", status: diag.tables.companies },
                { label: "plano_contas", desc: "Mapeamento master de classificação e restrições de contas", status: diag.tables.plano_contas },
                { label: "transactions", desc: "Lançamentos e conciliação de receitas e despesas", status: diag.tables.transactions },
                { label: "ai_conversations", desc: "Histórico de conversações executivas com o CFO Virtual", status: diag.tables.ai_conversations },
                { label: "uploaded_files", desc: "Metadados de importação inteligente de arquivos XLSX", status: diag.tables.uploaded_files },
              ].map((tbl, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50/60 rounded-2xl border border-slate-100/50">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-800 block">{tbl.label}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">{tbl.desc}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    tbl.status 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                      : 'bg-rose-50 text-rose-700 border border-rose-150'
                  }`}>
                    {tbl.status ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {tbl.status ? "Criada" : "Faltando"}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Actions Bar */}
            <div className="mt-5 border-t border-slate-150 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-extrabold text-slate-800 block">Semeador de Dados Master</h5>
                <p className="text-[10px] text-slate-500 mt-0.5">Se as tabelas forem criadas recentemente, clique no botão para popular as duas empresas demo.</p>
              </div>
              <button
                type="button"
                onClick={handleSeedDatabase}
                disabled={seedLoading || !diag.connected}
                className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {seedLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-indigo-400Fill" />}
                Semear Tabelas Demo
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Companies master administration directory */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Create Company admin registration form */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Building className="h-4 w-4 text-indigo-600" />
              Cadastrar Nova Empresa (Multi-Tenant)
            </h4>

            <form onSubmit={handleAddCompany} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Razão Social / Nome Fantasia</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Alfa Transportes Ltda"
                  required
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/20 focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">CNPJ</label>
                  <input
                    type="text"
                    value={companyCnpj}
                    onChange={(e) => setCompanyCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    required
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/20 focus:outline-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Setor Comercial</label>
                  <select
                    value={companySector}
                    onChange={(e) => setCompanySector(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 border-none focus:outline-indigo-600"
                  >
                    <option value="Tecnologia & SaaS">Tecnologia & SaaS</option>
                    <option value="Serviços Médicos">Serviços Médicos</option>
                    <option value="Varejo & E-commerce">Varejo & E-commerce</option>
                    <option value="Indústria & Manufatura">Indústria & Manufatura</option>
                    <option value="Alimentos & Sabores">Alimentos & Sabores</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingCompany}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
              >
                {savingCompany ? "Cadastrando..." : "Confirmar Cadastro Comercial"}
              </button>
            </form>
          </div>

          {/* Directory of Registered companies */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Building className="h-4 w-4 text-indigo-600" />
              Diretório Cadastral Ativo ({companiesList.length})
            </h4>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {companiesList.map((comp, idx) => (
                <div key={idx} className="p-3 border border-slate-100 rounded-2xl bg-slate-50/30 flex items-start gap-2.5">
                  <div className="bg-white p-2 rounded-xl border border-slate-100 flex-shrink-0">
                    <Building className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800 leading-snug">{comp.name}</h5>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{comp.sector} • CNPJ: {comp.cnpj}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
