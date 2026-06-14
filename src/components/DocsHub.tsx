import React, { useState } from 'react';
import { 
  ARCHITECTURE_FLUXOGRAM, 
  ARCHITECTURE_MARKDOWN, 
  DATABASE_SCHEMA_SQL, 
  RLS_POLICIES_SQL, 
  ROADMAP_MVP, 
  ROADMAP_V2, 
  ROADMAP_V3 
} from '../data/saasArchitecture';
import { Copy, Check, ShieldCheck, Database, Award, GitMerge, FileText } from 'lucide-react';

export default function DocsHub() {
  const [activeSubTab, setActiveSubTab] = useState<'architecture' | 'database' | 'rls' | 'roadmap'>('architecture');
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopied(identifier);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div id="docs-hub-root" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Arquitetura & Engenharia SaaS (SRE Hub)
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Blueprints de infraestrutura, modelagem relacional Supabase e regras estritas de Row Level Security (RLS).
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <button
            onClick={() => setActiveSubTab('architecture')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'architecture'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <GitMerge className="h-3.5 w-3.5" />
            Arquitetura & Fluxo
          </button>
          <button
            onClick={() => setActiveSubTab('database')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'database'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            Modelagem PG SQL
          </button>
          <button
            onClick={() => setActiveSubTab('rls')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'rls'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            Políticas RLS
          </button>
          <button
            onClick={() => setActiveSubTab('roadmap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'roadmap'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Roadmap SaaS
          </button>
        </div>
      </div>

      {activeSubTab === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Diagrama de Fluxo Físico</h3>
            <pre className="font-mono text-xs text-slate-800 leading-relaxed bg-slate-100 rounded-lg p-4 overflow-x-auto border border-slate-200">
              {ARCHITECTURE_FLUXOGRAM}
            </pre>
          </div>
          <div className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed space-y-4">
            <div className="bg-white rounded-lg p-5 border border-slate-100 shadow-xs">
              <h4 className="text-base font-bold text-slate-800 mb-2">Visão Geral da Autenticação e Multitenancy</h4>
              <p>
                O sistema é estruturado como um SaaS multitenant. Cada empresa cadastrada representa um isolamento de dados independente. 
                Isso significa que quando um arquivo é importado, ele é associado de forma direta ao ID único do UUID da empresa do usuário na tabela <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">financial_transactions</code>.
              </p>
              <p className="mt-2">
                A IA Gemini é integrada simulando esse multitenancy passando unicamente as informações em memórias locais carregadas do respectivo Tenant ativo no frontend, garantindo que nenhum vazamento de segredos corporativos ocorra entre diferentes empresas instaladas no mesmo cluster do PostgreSQL.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'database' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Script DDL PostgreSQL Completo para Produção</h3>
            <button
              onClick={() => handleCopy(DATABASE_SCHEMA_SQL, 'db_sql')}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded flex items-center gap-1 font-medium transition-all"
            >
              {copied === 'db_sql' ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copiar Código SQL
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 overflow-hidden border border-slate-800">
            <pre className="font-mono text-[11px] text-slate-300 leading-relaxed overflow-y-auto max-h-[420px] p-2">
              {DATABASE_SCHEMA_SQL}
            </pre>
          </div>
        </div>
      )}

      {activeSubTab === 'rls' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Políticas RLS (Row Level Security) - Supabase</h3>
            <button
              onClick={() => handleCopy(RLS_POLICIES_SQL, 'rls_sql')}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded flex items-center gap-1 font-medium transition-all"
            >
              {copied === 'rls_sql' ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copiar Políticas SQL
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 overflow-hidden border border-slate-800">
            <pre className="font-mono text-[11px] text-indigo-300 leading-relaxed overflow-y-auto max-h-[380px] p-2">
              {RLS_POLICIES_SQL}
            </pre>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 text-amber-800 text-xs leading-relaxed">
            <strong>⚠️ Atenção em RLS de Produção:</strong> Ao habilitar RLS com <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">ALTER TABLE ENABLE ROW LEVEL SECURITY</code>, lembre-se de configurar políticas explícitas também para deleção e inserção de dados, integrando-as com o token JWT retornado pelo Supabase Client através de <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">auth.uid()</code>.
          </div>
        </div>
      )}

      {activeSubTab === 'roadmap' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MVP */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-extrabold text-indigo-600 tracking-wider">Ciclo 1.0</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full">MVP Ativo</span>
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-3">Escopo MVP (DRE Inteligente)</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              {ROADMAP_MVP.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className="mt-0.5 min-w-[14px] h-[14px] rounded-full bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-800 font-bold">✓</div>
                  <span>{item.item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* V2 */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">Ciclo 2.0</span>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full">Próximo</span>
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-3">Funcionalidades V2.0</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              {ROADMAP_V2.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className="mt-1 min-w-[6px] h-[6px] rounded-full bg-indigo-400"></div>
                  <span>{item.item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* V3 */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">Ciclo 3.0</span>
              <span className="bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Longo Prazo</span>
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-3">Inteligência Preditiva V3.0</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              {ROADMAP_V3.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className="mt-1 min-w-[6px] h-[6px] rounded-full bg-slate-300"></div>
                  <span>{item.item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
