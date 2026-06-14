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
  const [params, setParams] = useState<ForecastParams>({
    growthRate: 8, // 8% monthly faturamento growth
    expenseGrowthRate: 3, // 3% monthly expense growth
    hiringImpact: 8500, // + R$ 8500 fixed cost monthly
    marketingBoost: 1.5 // Multiplier of sales boost
  });

  // Calculate standard monthly average as baseline figures
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
      .reduce((sum, t) => sum + t.value, 0);
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

    // Compound Growth calculations
    const compoundRevenueFactor = Math.pow(1 + (params.growthRate + (params.marketingBoost * 0.5)) / 100, step);
    const compoundOpexFactor = Math.pow(1 + params.expenseGrowthRate / 100, step);

    const projectedRevenue = Math.round(baselineSales * compoundRevenueFactor);
    const projectedDeductions = Math.round(baselineDeductions * compoundRevenueFactor);
    const projectedCosts = Math.round(baselineCosts * compoundRevenueFactor * 0.95); // assume scale efficiency on variables
    const projectedOpex = Math.round(baselineOpex * compoundOpexFactor + (params.hiringImpact * (1 + (step / 12) * 0.1))); // compound hire impact too

    const projectedEbitda = projectedRevenue - projectedDeductions - projectedCosts - projectedOpex;
    const projectedNetProfit = Math.round(projectedEbitda * 0.85); // assume 15% estimated general tax rate

    projectionTimeline.push({
      stepLabel: label,
      'Faturamento Previsto': projectedRevenue,
      'Despesas Previstas': projectedDeductions + projectedCosts + projectedOpex,
      'EBITDA Projetado': projectedEbitda,
      'Lucro Líquido Projetado': projectedNetProfit
    });
  }

  const finalRevenueCompounded = projectionTimeline[horizon - 1]?.['Faturamento Previsto'] || 0;
  const finalEbitdaCompounded = projectionTimeline[horizon - 1]?.['EBITDA Projetado'] || 0;
  const growthMultiple = baselineSales > 0 ? (finalRevenueCompounded / baselineSales) : 1;

  return (
    <div id="forecast-root" className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
      
      {/* Simulation triggers */}
      <div className="lg:col-span-1 bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Sliders className="h-4 w-4 text-indigo-600 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-800">Parâmetros de Simulação</h3>
        </div>

        {/* Horizon selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Horizonte da Projeção</label>
          <div className="grid grid-cols-3 gap-2">
            {[12, 24, 36].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h as any)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  horizon === h
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {h} Meses
              </button>
            ))}
          </div>
        </div>

        {/* Growth Rate Range */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">Crescimento de Receita (a.m.)</span>
            <span className="font-mono font-bold text-indigo-600">+{params.growthRate}%</span>
          </div>
          <input 
            type="range" 
            min="-5" 
            max="30" 
            value={params.growthRate} 
            onChange={(e) => setParams(prev => ({ ...prev, growthRate: parseInt(e.target.value) }))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <span className="text-[9px] text-slate-400 block leading-tight">Taxa de crescimento composto mensal estimado nas frentes de vendas.</span>
        </div>

        {/* Expense Growth Range */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">Aumento de Curva de OPEX (a.m.)</span>
            <span className="font-mono font-bold text-indigo-600">+{params.expenseGrowthRate}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="20" 
            value={params.expenseGrowthRate} 
            onChange={(e) => setParams(prev => ({ ...prev, expenseGrowthRate: parseInt(e.target.value) }))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        {/* Hiring Impact Input */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              Impacto de Contratações (CLT/mês)
            </span>
            <span className="font-mono text-indigo-600 font-bold">R$ {params.hiringImpact.toLocaleString()}</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="50000" 
            step="1000"
            value={params.hiringImpact} 
            onChange={(e) => setParams(prev => ({ ...prev, hiringImpact: parseInt(e.target.value) }))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        {/* Marketing Multiplier input */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">Fator de Alavancagem de Marketing</span>
            <span className="font-mono text-indigo-600 font-bold">{params.marketingBoost}x boost</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="5" 
            step="0.5"
            value={params.marketingBoost} 
            onChange={(e) => setParams(prev => ({ ...prev, marketingBoost: parseFloat(e.target.value) }))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <div className="bg-white border border-slate-200/60 p-3 rounded-lg text-[10px] leading-relaxed text-slate-600 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500 mt-0.5" />
          <span>Os cálculos compõem faturamento sobre custos variáveis proporcionais, mitigando desvios e gerando fidedignidade analítica.</span>
        </div>
      </div>

      {/* Trajectory visualization charts */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Previsão e Modelagem Financeira</span>
              <h4 className="text-xs font-bold text-white">Trajetória Forecast {horizon} Meses</h4>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-950 px-2.5 py-0.5 rounded-full">
              Fator de Impacto: {growthMultiple.toFixed(1)}x de Crescimento
            </span>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProjectedSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProjectedEbitda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="stepLabel" tickLine={false} style={{ fontSize: '9px', fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} itemStyle={{ fontSize: '11px', color: '#cbd5e1' }} labelStyle={{ fontSize: '10px', color: '#94a3b8' }} formatter={(value) => `R$ ${value.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Faturamento Previsto" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProjectedSales)" />
                <Area type="monotone" dataKey="EBITDA Projetado" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProjectedEbitda)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Final indicators row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Mês de Partida (Baseline)</span>
            <span className="text-base font-bold text-slate-800 block mt-1">R$ {baselineSales.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            <span className="text-[9px] text-slate-400">Total vendas faturadas de partida</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Projeção no Mês {horizon}</span>
            <span className="text-base font-bold text-indigo-700 block mt-1">R$ {finalRevenueCompounded.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            <span className="text-[9px] text-slate-400">Receita projetada em {horizon} meses</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-150 bg-indigo-50/35">
            <span className="text-[10px] text-indigo-700 block font-bold uppercase">EBITDA Terminal Projetado</span>
            <span className="text-base font-bold text-emerald-700 block mt-1">R$ {finalEbitdaCompounded.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            <span className="text-[9px] text-slate-400">Ebitda operacional do mês terminal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
