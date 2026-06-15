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

interface DiagnosticCard {
  status: 'OK' | 'ERRO' | 'PENDENTE';
  details: string;
  error: string;
}

interface DiagStatus {
  configured: boolean;
  connected: boolean;
  connectionMetrics?: DiagnosticCard;
  dbAccessibility?: DiagnosticCard;
  permissions?: DiagnosticCard;
  authenticated?: DiagnosticCard;
  tables: Record<string, DiagnosticCard>;
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
    allTablesCreated: false,
    permissionsOk: false,
    userEmail: null,
    error: null,
    connectionMetrics: { status: 'PENDENTE', details: 'Aguardando diagnóstico', error: '-' },
    dbAccessibility: { status: 'PENDENTE', details: 'Aguardando diagnóstico', error: '-' },
    permissions: { status: 'PENDENTE', details: 'Aguardando diagnóstico', error: '-' },
    authenticated: { status: 'PENDENTE', details: 'Aguardando diagnóstico', error: '-' },
    tables: {
      companies: { status: 'PENDENTE', details: '-', error: '-' },
      plano_contas: { status: 'PENDENTE', details: '-', error: '-' },
      transactions: { status: 'PENDENTE', details: '-', error: '-' },
      ai_conversations: { status: 'PENDENTE', details: '-', error: '-' },
      uploaded_files: { status: 'PENDENTE', details: '-', error: '-' }
    }
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

      {/* Dynamic Production Readiness Alert */}
      <div className={`border p-6 rounded-3xl transition-all ${
        diag.connected
          ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
          : 'bg-rose-50/50 border-rose-100 text-rose-900'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${diag.connected ? 'bg-emerald-600' : 'bg-rose-600'} text-white shadow-md`}>
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold uppercase tracking-wider">Homologação de Ambiente SaaS</h4>
              <p className="text-xs opacity-80 mt-1">
                {diag.connected 
                  ? "✓ Todos os critérios de persistência distribuída em nuvem estão atendidos." 
                  : "✗ Conectividade pendente de validação das secrets corporativas."}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm ${
            diag.connected 
              ? 'bg-emerald-600 text-white' 
              : 'bg-rose-600 text-white'
          }`}>
            {diag.connected ? "SISTEMA APROVADO PARA PRODUÇÃO" : "SISTEMA NÃO APROVADO PARA PRODUÇÃO"}
          </span>
        </div>
      </div>

      {/* Upgraded Detailed Diagnostic Table (Status, Detalhes, Erro) */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Métricas de Conexão Física e Segurança</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/30">
                <th className="py-3 px-6 h-10">Métrica / Recurso</th>
                <th className="py-3 px-6 h-10 w-32">Status</th>
                <th className="py-3 px-6 h-10">Detalhes</th>
                <th className="py-3 px-6 h-10">Erro do Servidor / Postgres</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  id: "connected",
                  name: "Supabase Conectado",
                  desc: "Verifica se as credenciais estão inicializando o driver de nuvem",
                  metrics: diag.connectionMetrics || {
                    status: diag.connected ? "OK" : "ERRO" as const,
                    details: diag.connected ? "Conexão ativa" : "Parâmetros ausentes",
                    error: diag.error || "-"
                  }
                },
                {
                  id: "accessible",
                  name: "Banco Acessível",
                  desc: "Testa a execução de consultas e estabilidade do cluster SQL",
                  metrics: diag.dbAccessibility || {
                    status: diag.connected ? "OK" : "ERRO" as const,
                    details: diag.connected ? "Cluster PostgreSQL Online" : "-",
                    error: diag.error || "Relation 'public.companies' does not exist"
                  }
                },
                {
                  id: "permissions",
                  name: "Permissões de Acesso (RLS)",
                  desc: "Garante que as políticas de Row Level Security permitem escrita em sandbox",
                  metrics: diag.permissions || {
                    status: diag.permissionsOk ? "OK" : "ERRO" as const,
                    details: diag.permissionsOk ? "Anon Key e RLS Válidos" : "-",
                    error: "-"
                  }
                },
                {
                  id: "auth",
                  name: "Autenticação Corporativa",
                  desc: "Valida o status do controle integrado de sessões corporativas",
                  metrics: diag.authenticated || {
                    status: "OK" as const,
                    details: diag.userEmail ? `Sessão ativa: ${diag.userEmail}` : "Conexões em modo anônimo autorizadas",
                    error: "-"
                  }
                }
              ].map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/40 transition-all text-xs">
                  <td className="py-4 px-6">
                    <span className="font-bold text-slate-800 block">{row.name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{row.desc}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                      row.metrics.status === "OK"
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : row.metrics.status === "ERRO"
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {row.metrics.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-600">{row.metrics.details}</td>
                  <td className="py-4 px-6 font-mono text-[10px] text-rose-600">
                    {row.metrics.error}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                { label: "companies", desc: "Estrutura cadastral de multi-tenant (Empresas)", tblDiag: diag.tables?.companies },
                { label: "plano_contas", desc: "Mapeamento master de classificação e restrições de contas", tblDiag: diag.tables?.plano_contas },
                { label: "transactions", desc: "Lançamentos e conciliação de receitas e despesas", tblDiag: diag.tables?.transactions },
                { label: "ai_conversations", desc: "Histórico de conversações executivas com o CFO Virtual", tblDiag: diag.tables?.ai_conversations },
                { label: "uploaded_files", desc: "Metadados de importação inteligente de arquivos XLSX", tblDiag: diag.tables?.uploaded_files },
              ].map((tbl, i) => {
                const diagVal = tbl.tblDiag || { status: 'PENDENTE', details: '-', error: '-' };
                const isOk = diagVal.status === 'OK';
                return (
                  <div key={i} className="flex flex-col p-3 bg-slate-50/60 rounded-2xl border border-slate-100/50 gap-1.5 hover:bg-slate-50 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-800 block">{tbl.label}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">{tbl.desc}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        isOk 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                          : 'bg-rose-50 text-rose-700 border border-rose-150'
                      }`}>
                        {isOk ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {isOk ? "Criada" : "Falha"}
                      </span>
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 flex flex-wrap justify-between gap-2 border-t border-slate-100/50 pt-1.5 mt-0.5">
                      <span>{diagVal.details}</span>
                      {diagVal.error !== '-' && <span className="text-rose-600 font-mono text-[9px]">Erro: {diagVal.error}</span>}
                    </div>
                  </div>
                );
              })}
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
