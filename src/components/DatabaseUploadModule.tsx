import React, { useState } from 'react';
import { 
  Database, 
  Upload, 
  CheckCircle, 
  Trash2, 
  RefreshCw, 
  Server, 
  Sparkles,
  FileCode,
  ShieldCheck
} from 'lucide-react';

interface DatabaseUploadModuleProps {
  onDatabaseIntegrated: (dbInfo: { systemName: string; fileName: string; size: string; tablesCount: number }) => void;
  onRunQueryInChat: (queryText: string) => void;
}

export interface IntegratedDatabase {
  id: string;
  systemName: string;
  fileName: string;
  fileSize: string;
  integratedAt: string;
  tables: { name: string; description: string; count: number }[];
  status: 'active' | 'syncing';
}

export function DatabaseUploadModule({ onDatabaseIntegrated, onRunQueryInChat }: DatabaseUploadModuleProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [databases, setDatabases] = useState<IntegratedDatabase[]>([
    {
      id: 'db_ibk_default',
      systemName: 'Banco de Dados Firebird/InterBase',
      fileName: 'backup_comercial_producao.ibk',
      fileSize: '18.4 MB',
      integratedAt: '02/07/2026 14:15',
      status: 'active',
      tables: [
        { name: 'TB_PRODUTOS (Itens & Insumos)', description: 'Cadastro geral de matérias-primas e ativos.', count: 1850 },
        { name: 'TB_COMPRAS_ITENS (Faturamento)', description: 'Notas fiscais de entrada e custos praticados.', count: 5490 },
        { name: 'TB_FORNECEDORES (Parceiros)', description: 'Dados cadastrais, CNPJs e prazos acordados.', count: 310 },
        { name: 'TB_ESTOQUE_SALDO (Kardex)', description: 'Saldos físicos atuais e endereços de almoxarifado.', count: 1220 }
      ]
    }
  ]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (fileExt === 'ibk') {
        simulateImport(file.name, file.size);
      } else {
        alert('Apenas arquivos de banco de dados no formato .IBK são permitidos neste módulo!');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (fileExt === 'ibk') {
        simulateImport(file.name, file.size);
      } else {
        alert('Apenas arquivos de banco de dados no formato .IBK são permitidos neste módulo!');
      }
    }
  };

  const simulateImport = (fileName: string, rawSize?: number) => {
    setIsUploading(true);
    const sizeStr = rawSize ? `${(rawSize / (1024 * 1024)).toFixed(2)} MB` : '12.5 MB';
    
    setTimeout(() => {
      // Cria tabelas Firebird/Interbase típicas para realismo técnico e utilidade prática nas consultas futuras
      const tables = [
        { name: 'TB_PRODUTOS (Cadastro de Itens)', description: 'Cadastro geral de insumos e matérias-primas.', count: 940 },
        { name: 'TB_COMPRAS_ITENS (Faturamento de Entrada)', description: 'Detalhes de notas de compras e faturas históricas.', count: 3200 },
        { name: 'TB_FORNECEDORES (Fornecedores Cadastrados)', description: 'Dados de parceiros logísticos e industriais.', count: 180 },
        { name: 'TB_ESTOQUE_SALDO (Inventário Corrente)', description: 'Quantidades de saldos em estoque físico.', count: 850 }
      ];

      const newDb: IntegratedDatabase = {
        id: 'db_' + Date.now(),
        systemName: 'Banco de Dados Firebird/InterBase',
        fileName,
        fileSize: sizeStr,
        integratedAt: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'active',
        tables
      };

      setDatabases(prev => [newDb, ...prev]);
      setIsUploading(false);
      onDatabaseIntegrated({
        systemName: newDb.systemName,
        fileName: newDb.fileName,
        size: newDb.fileSize,
        tablesCount: newDb.tables.length
      });
    }, 1800);
  };

  const deleteDatabase = (id: string) => {
    setDatabases(prev => prev.filter(db => db.id !== id));
  };

  const presetQueries = [
    {
      title: 'Consultar Itens com Estoque Baixo (SQL)',
      prompt: 'Execute uma query SQL no banco de dados .IBK importado para selecionar os itens da tabela TB_PRODUTOS onde o saldo de estoque (TB_ESTOQUE_SALDO) está abaixo do nível mínimo de segurança.'
    },
    {
      title: 'Auditar Custos de Fornecedores por Insumo (SQL)',
      prompt: 'Utilizando queries SQL, agrupe e ordene os preços unitários na tabela TB_COMPRAS_ITENS correlacionando-os com TB_FORNECEDORES para identificar o fornecedor mais competitivo para cada insumo.'
    },
    {
      title: 'Verificar Faturamento Mensal Médio (SQL)',
      prompt: 'Faça uma análise SQL unindo as tabelas TB_COMPRAS_ITENS para extrair o valor total de faturamento de entrada por mês e analisar o comportamento da cadeia de suprimentos.'
    }
  ];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-sm">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              Importação de Banco de Dados (.IBK)
              <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase">Firebird / InterBase</span>
            </h2>
            <p className="text-[11px] text-slate-400">Anexe o backup do seu banco de dados no formato nativo .IBK para que o CFO Virtual IA realize consultas SQL diretas e minuciosas.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Lado esquerdo: Dragzone para o arquivo IBK */}
        <div className="md:col-span-5 bg-white border border-slate-150 rounded-2xl p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-950">
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wider">Diretiva de Conectividade Direta</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Diferente de planilhas manuais isoladas, ao subir o arquivo <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">.IBK</span> de backup, o assistente tem acesso completo ao relacionamento relacional das tabelas corporativas para rodar queries estruturadas em tempo real.
            </p>
          </div>

          <div className="pt-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">Upload do Backup do Banco (.IBK):</label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleFileDrop}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.ibk';
                input.onchange = (e) => handleFileChange(e as any);
                input.click();
              }}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-550 hover:bg-indigo-50/20 transition-all rounded-xl p-8 text-center cursor-pointer group bg-slate-50/50"
            >
              {isUploading ? (
                <div className="space-y-2 py-3">
                  <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-[10px] font-bold text-slate-600 animate-pulse uppercase tracking-wider">Restaurando Tabelas do Backup .IBK...</p>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <Upload className="h-7 w-7 text-indigo-400 group-hover:text-indigo-600 mx-auto transition-colors" />
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-700">Selecione ou arraste arquivo .IBK</p>
                    <p className="text-[9px] text-slate-400 leading-normal mt-1">
                      Aceita apenas backups de banco <span className="font-mono font-bold text-indigo-600">.ibk</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lado direito: Lista de Bancos .IBK conectados & Consultas SQL recomendadas */}
        <div className="md:col-span-7 flex flex-col gap-5">
          <div className="bg-white border border-slate-150 rounded-2xl p-5 flex-1 flex flex-col">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-3.5 flex items-center justify-between">
              <span>Backups (.IBK) Ativos no Assistente</span>
              <span className="text-[9px] font-mono text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Estrutura Pronta para SQL
              </span>
            </h3>

            {databases.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-100 rounded-xl bg-slate-50">
                <Server className="h-7 w-7 text-slate-300 mb-2" />
                <h4 className="text-[11px] font-bold text-slate-700 uppercase">Nenhum backup .ibk integrado</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[280px]">Suba seu arquivo de backup .ibk no painel esquerdo para unificar as consultas inteligíveis.</p>
              </div>
            ) : (
              <div className="space-y-3 flex-grow overflow-y-auto max-h-[220px] pr-1">
                {databases.map((db) => (
                  <div key={db.id} className="border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors p-3.5 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Database className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-[11px] font-extrabold text-slate-950 uppercase">{db.systemName}</h4>
                          <p className="text-[9.5px] text-slate-500 font-mono flex items-center gap-1.5">
                            <span className="truncate max-w-[200px] font-semibold text-indigo-950" title={db.fileName}>{db.fileName}</span>
                            <span>•</span>
                            <span>{db.fileSize}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteDatabase(db.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Desconectar Backup"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Exibição das Tabelas Detectadas */}
                    <div className="bg-white rounded-lg p-2.5 border border-slate-150/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                        <span>Tabelas Relacionais Mapeadas ({db.tables.length})</span>
                        <span>Registros Totais</span>
                      </div>
                      <div className="space-y-1 max-h-[85px] overflow-y-auto pr-1">
                        {db.tables.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[9.5px] leading-relaxed">
                            <span className="font-mono font-bold text-slate-700 flex items-center gap-1">
                              <span className="text-[8px]">📁</span>
                              {t.name}
                            </span>
                            <span className="text-[9px] font-mono font-black text-slate-850 bg-slate-100 px-1 py-0.2 rounded">
                              {t.count.toLocaleString('pt-BR')} rows
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prompt presets para enviar ao Assistente de IA de livre acesso */}
          <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl p-4.5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Consultas SQL Avançadas via Assistente de IA:</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {presetQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onRunQueryInChat(q.prompt)}
                  className="w-full text-left bg-slate-850 hover:bg-slate-800 hover:text-white p-2.5 rounded-xl text-[10px] font-bold border border-slate-750 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="truncate">{q.title}</span>
                  <span className="text-[8.5px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold shrink-0 uppercase tracking-wide">Executar SQL</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
