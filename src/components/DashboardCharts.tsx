import React from 'react';
import { Transaction, DreCategory } from '../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { TrendingUp, BarChart2, DollarSign, Percent, Shield, ArrowDown, Activity } from 'lucide-react';

interface DashboardChartsProps {
  transactions: Transaction[];
  categories: DreCategory[];
}

export default function DashboardCharts({ transactions, categories }: DashboardChartsProps) {
  // 1. Deducing unique sorted months
  const months = Array.from(
    new Set(
      transactions.map(t => {
        const parts = t.date.split('-');
        return `${parts[0]}-${parts[1]}`; // YYYY-MM
      })
    )
  ).sort();

  // 2. Helpers for dynamic tree summation inside dashboard calculations
  const getCatSum = (catId: string, month: string): number => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 0;
    if (cat.type !== 'formula') {
      return transactions
        .filter(t => {
          const parts = t.date.split('-');
          return t.classification === catId && `${parts[0]}-${parts[1]}` === month;
        })
        .reduce((sum, t) => sum + t.value, 0);
    }
    // Formula evaluation
    if (catId === 'total_sales') {
      return getCatSum('sales_products', month) + getCatSum('sales_services', month);
    }
    if (catId === 'deductions') {
      return (
        getCatSum('deduction_icms', month) +
        getCatSum('deduction_pis', month) +
        getCatSum('deduction_cofins', month) +
        getCatSum('deduction_iss', month)
      );
    }
    if (catId === 'net_revenue') {
      return getCatSum('total_sales', month) + getCatSum('deductions', month);
    }
    if (catId === 'costs') {
      return (
        getCatSum('costs_materials', month) +
        getCatSum('costs_resell', month) +
        getCatSum('costs_production', month)
      );
    }
    if (catId === 'gross_profit') {
      return getCatSum('net_revenue', month) + getCatSum('costs', month);
    }
    if (catId === 'operating_expenses') {
      return (
        getCatSum('opex_people', month) +
        getCatSum('opex_marketing', month) +
        getCatSum('opex_systems', month) +
        getCatSum('opex_contractors', month) +
        getCatSum('opex_maintenance', month) +
        getCatSum('opex_admin', month)
      );
    }
    if (catId === 'ebitda') {
      return getCatSum('gross_profit', month) + getCatSum('operating_expenses', month);
    }
    if (catId === 'profit_taxes') {
      return getCatSum('tax_irpj', month) + getCatSum('tax_csll', month);
    }
    if (catId === 'net_income') {
      return getCatSum('ebitda', month) + getCatSum('profit_taxes', month);
    }
    return 0;
  };

  // Convert month-by-month values into Recharts friendly structures
  const chartData = months.map(m => {
    const totalSales = getCatSum('total_sales', m);
    const netRevenue = getCatSum('net_revenue', m);
    const grossProfit = getCatSum('gross_profit', m);
    const ebitda = getCatSum('ebitda', m);
    const netIncome = getCatSum('net_income', m);

    // Margins logic
    const ebitdaMargin = totalSales > 0 ? (ebitda / totalSales) * 100 : 0;
    const netMargin = totalSales > 0 ? (netIncome / totalSales) * 100 : 0;

    return {
      monthLabel: new Date(m + "-15").toLocaleDateString('pt', {month: 'short', year: 'numeric'}),
      monthRaw: m,
      'Faturamento Bruto': Math.round(totalSales),
      'Receita Líquida': Math.round(netRevenue),
      'Resultado Bruto': Math.round(grossProfit),
      'EBITDA': Math.round(ebitda),
      'Resultado Líquido': Math.round(netIncome),
      'Margem EBITDA (%)': parseFloat(ebitdaMargin.toFixed(1)),
      'Margem Líquida (%)': parseFloat(netMargin.toFixed(1)),
    };
  });

  // Calculate cumulative figures across full period
  const totalFaturamento = chartData.reduce((sum, d) => sum + d['Faturamento Bruto'], 0);
  const totalReceitaLiquida = chartData.reduce((sum, d) => sum + d['Receita Líquida'], 0);
  const totalEbitda = chartData.reduce((sum, d) => sum + d['EBITDA'], 0);
  const totalLucroLiquido = chartData.reduce((sum, d) => sum + d['Resultado Líquido'], 0);

  // Consolidated Margins ratios
  const avgMargemBrutaPercent = totalReceitaLiquida > 0 
    ? (chartData.reduce((sum, d) => sum + d['Resultado Bruto'], 0) / totalReceitaLiquida) * 100 
    : 0;
  const avgMargemLiquidaPercent = totalReceitaLiquida > 0 
    ? (totalLucroLiquido / totalReceitaLiquida) * 100 
    : 0;

  // 3. Segment expense categories totals for pie charts
  const expenseSummary = [
    { name: 'Pessoal', value: 0, color: '#3b82f6' },
    { name: 'Marketing', value: 0, color: '#f59e0b' },
    { name: 'Sistemas & Cloud', value: 0, color: '#8b5cf6' },
    { name: 'Prestadores & Consultoria', value: 0, color: '#ec4899' },
    { name: 'Manutenção & Sedes', value: 0, color: '#10b981' },
    { name: 'Administrativas', value: 0, color: '#64748b' }
  ];

  months.forEach(m => {
    expenseSummary[0].value += Math.abs(getCatSum('opex_people', m));
    expenseSummary[1].value += Math.abs(getCatSum('opex_marketing', m));
    expenseSummary[2].value += Math.abs(getCatSum('opex_systems', m));
    expenseSummary[3].value += Math.abs(getCatSum('opex_contractors', m));
    expenseSummary[4].value += Math.abs(getCatSum('opex_maintenance', m));
    expenseSummary[5].value += Math.abs(getCatSum('opex_admin', m));
  });

  const formattedTxsSum = expenseSummary.filter(e => e.value > 0);

  return (
    <div className="space-y-6">
      
      {/* Visual KPI Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Faturamento Total</span>
            <span className="text-lg font-bold text-slate-800">
              R$ {totalFaturamento.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">EBITDA Acumulado</span>
            <span className="text-lg font-bold text-slate-800">
              R$ {totalEbitda.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Lucro Líquido Acumulado</span>
            <span className="text-lg font-bold text-slate-800">
              R$ {totalLucroLiquido.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Margem Líquida Média</span>
            <span className="text-lg font-bold text-slate-800">
              {avgMargemLiquidaPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {months.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
          <p className="text-slate-400 text-sm italic">Adicione dados de planilhas para gerar gráficos de inteligência financeira.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area graph */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs uppercase font-extrabold text-slate-700 tracking-wider">Evolução Mensal Corporativa</h4>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">Consolidado DRE</span>
            </div>
            
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEbitda" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthLabel" tickLine={false} style={{ fontSize: '10px', fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#94a3b8' }} />
                  <Tooltip formatter={(value) => `R$ ${value.toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Faturamento Bruto" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="EBITDA" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorEbitda)" />
                  <Area type="monotone" dataKey="Resultado Líquido" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side distribution graph */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs uppercase font-extrabold text-slate-700 tracking-wider">Distribuição de Despesas</h4>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">Acumulado OPEX</span>
            </div>

            {formattedTxsSum.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">Lançamentos sem despesas associadas.</p>
            ) : (
              <div className="space-y-4">
                <div className="h-[180px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formattedTxsSum}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {formattedTxsSum.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `R$ ${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {formattedTxsSum.map((entry, index) => {
                    const ratio = totalFaturamento > 0 ? (entry.value / totalFaturamento) * 100 : 0;
                    return (
                      <div key={index} className="flex items-center gap-1.5 p-1 rounded hover:bg-slate-50">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <div className="truncate flex-1">
                          <span className="font-semibold text-slate-700 block truncate">{entry.name}</span>
                          <span className="text-slate-400 font-mono text-[9px] block">R$ {entry.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} • {ratio.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs uppercase font-extrabold text-slate-700 tracking-wider">Margens Operacionais comparativa</h4>
              <span className="text-[10px] text-slate-400">Medida de eficiência operacional (ebitda/vendas e lucro/vendas)</span>
            </div>

            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthLabel" tickLine={false} style={{ fontSize: '10px', fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} max={100} style={{ fontSize: '10px', fill: '#94a3b8' }} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Margem EBITDA (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Margem Líquida (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
