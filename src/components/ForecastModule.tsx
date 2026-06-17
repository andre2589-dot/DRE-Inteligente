import React, { useState } from 'react';
import { Transaction, DreCategory, ForecastParams } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Settings, TrendingUp, Users, Sparkles, Sliders, Play } from 'lucide-react';

interface ForecastModuleProps {
  transactions: Transaction[];
  categories: DreCategory[];
}

export default function ForecastModule({ transactions, categories }: ForecastModuleProps) {
  const [horizon, setHorizon] = useState<12 | 24 | 36>(12);
  const [scenario, setScenario] = useState<'conservative' | 'normal' | 'aggressive'>('normal');
  const [params, setParams] = useState<ForecastParams>({
    growthRate: 8,
    expenseGrowthRate: 3,
    hiringImpact: 8500,
    marketingBoost: 1.5
  });

  // Scenario multipliers
  const scenarioMultiplier = {
    conservative: 0.7,
    normal: 1,
    aggressive: 1.4
  };

  const months = Array.from(
    new Set(
      transactions.map(t => {
        const parts = t.date.split('-');
        return `${parts[0]}-${parts[1]}`;
      })
    )
  ).sort();

  const getCatSum = (catId: string, month: string): number => {
    return transactions
      .filter(t => {
        const parts = t.date.split('-');
        return t.classification === catId && `${parts[0]}-${parts[1]}` === month;
      })
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  };

  // Compile baseline (average month)
  const getAverageValue = (catId: string): number => {
    if (months.length === 0) return 0;
    let sumTotal = 0;
    months.forEach(m => {
      // For formula resolution
      if (catId === 'total_sales') {
        sumTotal += getCatSum('sales_products', m) + getCatSum('sales_services', m);
      } else if (catId === 'net_revenue') {
        const sales = getCatSum('sales_products', m) + getCatSum('sales_services', m);
        const deductions = Math.abs(
          getCatSum('deduction_icms', m) + getCatSum('deduction_pis', m) + getCatSum('deduction_cofins', m) + getCatSum('deduction_iss', m)
        );
        sumTotal += (sales - deductions);
      } else if (catId === 'operating_expenses') {
        sumTotal += Math.abs(
          getCatSum('opex_people', m) + getCatSum('opex_marketing', m) + getCatSum('opex_systems', m) + getCatSum('opex_contractors', m) + getCatSum('opex_maintenance', m) + getCatSum('opex_admin', m)
        );
      } else if (catId === 'costs') {
        sumTotal += Math.abs(
          getCatSum('costs_materials', m) + getCatSum('costs_resell', m) + getCatSum('costs_production', m)
        );
      } else if (catId === 'deductions') {
        sumTotal += Math.abs(
          getCatSum('deduction_icms', m) + getCatSum('deduction_pis', m) + getCatSum('deduction_cofins', m) + getCatSum('deduction_iss', m)
        );
      } else {
        sumTotal += Math.abs(getCatSum(catId, m));
      }
    });
    return sumTotal / months.length;
  };

  const baselineSales = getAverageValue('total_sales') || 150000;
  const baselineDeductions = getAverageValue('deductions') || 10000;
  const baselineCosts = getAverageValue('costs') || 40000;
  const baselineOpex = getAverageValue('operating_expenses') || 60000;

  // Generate future simulation coordinates
  const projectionTimeline = [];
  const latestMonthStr = months[months.length - 1] || '2026-05';
  const lastDate = new Date(latestMonthStr + '-15');

  for (let step = 1; step <= horizon; step++) {
    const futureDate = new Date(lastDate);
    futureDate.setMonth(lastDate.getMonth() + step);
    const label = futureDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

    // Compound Growth calculations with scenario multiplier
    const effectiveGrowth = params.growthRate * scenarioMultiplier[scenario];
    const compoundRevenueFactor = Math.pow(1 + (effectiveGrowth + (params.marketingBoost * 0.5)) / 100, step);
    const compoundOpexFactor = Math.pow(1 + params.expenseGrowthRate / 100, step);

    const projectedRevenue = Math.round(baselineSales * compoundRevenueFactor);
    const projectedDeductions = Math.round(baselineDeductions * compoundRevenueFactor);
    const projectedCosts = Math.round(baselineCosts * compoundRevenueFactor * 0.95);
    const projectedOpex = Math.round(baselineOpex * compoundOpexFactor + (params.hiringImpact * (1 + (step / 12) * 0.1)));

    const projectedEbitda = projectedRevenue - (projectedDeductions + projectedCosts + projectedOpex);
    const projectedNetProfit = Math.round(projectedEbitda * 0.85);

    projectionTimeline.push({
      stepLabel: label,
      revenue: projectedRevenue,
      expenses: projectedDeductions + projectedCosts + projectedOpex,
      ebitda: projectedEbitda,
      netProfit: projectedNetProfit,
      margin: projectedRevenue > 0 ? (projectedEbitda / projectedRevenue) * 100 : 0
    });
  }

  const finalRevenue = projectionTimeline[horizon - 1]?.revenue || 0;
  const finalEbitda = projectionTimeline[horizon - 1]?.ebitda || 0;
  const growthMultiple = baselineSales > 0 ? (finalRevenue / baselineSales) : 1;

  return (
    <div id="forecast-root" className="flex flex-col gap-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulation triggers */}
        <div className="lg:col-span-1 bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Sliders className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Cenário Forecast</h3>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Intensidade do Cenário</label>
            <div className="grid grid-cols-3 gap-2">
              {(['conservative', 'normal', 'aggressive'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScenario(s)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                    scenario === s 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {s === 'conservative' ? 'Pessimista' : s === 'normal' ? 'Normal' : 'Otimista'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Horizonte</label>
            <div className="grid grid-cols-3 gap-2">
              {[12, 24, 36].map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h as any)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                    horizon === h
                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {h} Meses
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Crescimento Faturamento (a.m.)</span>
                <span className="font-mono font-bold text-indigo-600">+{params.growthRate}%</span>
              </div>
              <input 
                type="range" min="0" max="30" value={params.growthRate} 
                onChange={(e) => setParams(prev => ({ ...prev, growthRate: parseInt(e.target.value) }))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Aumento OPEX (a.m.)</span>
                <span className="font-mono font-bold text-indigo-600">+{params.expenseGrowthRate}%</span>
              </div>
              <input 
                type="range" min="0" max="20" value={params.expenseGrowthRate} 
                onChange={(e) => setParams(prev => ({ ...prev, expenseGrowthRate: parseInt(e.target.value) }))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Contratações/mês</span>
                <span className="font-mono font-bold text-indigo-600">R$ {params.hiringImpact.toLocaleString()}</span>
              </div>
              <input 
                type="range" min="0" max="50000" step="1000" value={params.hiringImpact} 
                onChange={(e) => setParams(prev => ({ ...prev, hiringImpact: parseInt(e.target.value) }))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Trajectory visualization charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Trajetória Forecast {horizon} Meses</h4>
                <span className="text-[10px] text-slate-400 block font-medium">Modelagem preditiva baseada em taxas compostas</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/50">
                  Impacto: {growthMultiple.toFixed(1)}x de Crescimento
                </span>
              </div>
            </div>

            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProjRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProjEbit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="stepLabel" tickLine={false} style={{ fontSize: '9px', fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', border: '1px solid #1e293b' }} 
                    itemStyle={{ fontSize: '11px' }}
                    labelStyle={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}
                    formatter={(value) => `R$ ${Number(value).toLocaleString()}`} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '15px' }} />
                  <Area name="Faturamento Projetado" type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorProjRec)" />
                  <Area name="EBITDA Projetado" type="monotone" dataKey="ebitda" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProjEbit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Mês Atual (Base)</span>
              <span className="text-lg font-bold text-slate-800 block mt-1">R$ {baselineSales.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              <p className="text-[9px] text-slate-500 mt-1">Média histórica de faturamento</p>
            </div>
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/20">
              <span className="text-[10px] text-indigo-400 block font-bold uppercase tracking-wider">Mês {horizon} (Proj)</span>
              <span className="text-lg font-bold text-indigo-700 block mt-1">R$ {finalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              <p className="text-[9px] text-indigo-500 mt-1">Receita estimada ao final do ciclo</p>
            </div>
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20">
              <span className="text-[10px] text-emerald-400 block font-bold uppercase tracking-wider">Ebitda Final</span>
              <span className="text-lg font-bold text-emerald-700 block mt-1">R$ {finalEbitda.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              <p className="text-[9px] text-emerald-500 mt-1">Resultado operacional terminal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Play className="h-4 w-4 text-slate-400" />
          <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Detalhamento Mensal do Forecast</h4>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 font-bold uppercase text-slate-500">
                <th className="py-3 px-4">Mês Proj.</th>
                <th className="py-3 px-4">Receita (R$)</th>
                <th className="py-3 px-4">Despesas (R$)</th>
                <th className="py-3 px-4">EBITDA (R$)</th>
                <th className="py-3 px-4">Margem (%)</th>
                <th className="py-3 px-4">Lucro Líq. (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectionTimeline.filter((_, i) => i % (horizon / 6) === 0 || i === horizon - 1).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-700">{row.stepLabel}</td>
                  <td className="py-2.5 px-4 font-mono font-medium">R$ {row.revenue.toLocaleString()}</td>
                  <td className="py-2.5 px-4 font-mono text-rose-500">R$ {row.expenses.toLocaleString()}</td>
                  <td className={`py-2.5 px-4 font-mono font-bold ${row.ebitda >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>R$ {row.ebitda.toLocaleString()}</td>
                  <td className="py-2.5 px-4 font-mono">{row.margin.toFixed(1)}%</td>
                  <td className="py-2.5 px-4 font-mono text-indigo-600">R$ {row.netProfit.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
