import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, DreCategory, CategoryGoal, MonthConfig } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { 
  Settings, 
  TrendingUp, 
  Users, 
  Sparkles, 
  Sliders, 
  Play, 
  Target, 
  Award, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Percent, 
  Landmark, 
  Info, 
  Zap, 
  TrendingDown, 
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface ForecastModuleProps {
  transactions: Transaction[];
  categories: DreCategory[];
  categoryGoals: CategoryGoal[];
  monthConfigs: MonthConfig[];
  onSaveCategoryGoal: (categoryId: string, month: string, targetValue: number) => void;
  onSaveMonthConfig: (month: string, totalWorkingDays: number, elapsedWorkingDays: number) => void;
  onAddTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onUpdateTransaction?: (tx: Transaction) => void;
}

export default function ForecastModule({ 
  transactions, 
  categories, 
  categoryGoals, 
  monthConfigs, 
  onSaveCategoryGoal, 
  onSaveMonthConfig,
  onAddTransaction,
  onDeleteTransaction,
  onUpdateTransaction
}: ForecastModuleProps) {
  // Top-level module tabs
  const [activeSubTab, setActiveSubTab] = useState<'goals_planner' | 'long_term_forecast'>('goals_planner');

  // Interactive configurations for historical analysis & target month
  const [targetMonth, setTargetMonth] = useState('2026-06');
  
  // Daily Vendas states
  const [logDay, setLogDay] = useState<number>(1);
  const [logValue, setLogValue] = useState<number>(0);
  const [logObservation, setLogObservation] = useState<string>('');

  // Period filter for Histórico Real da Operação
  const [selectedHistoricalMonths, setSelectedHistoricalMonths] = useState<string[]>([]);

  // Marketing & Investments (for target month feasibility analyzer)
  const [targetFaturamento, setTargetFaturamento] = useState<number>(0);
  const [growthPretensionPct, setGrowthPretensionPct] = useState<number>(10);
  const [marketingBudget, setMarketingBudget] = useState<number>(4500);
  const [operationalInvestment, setOperationalInvestment] = useState<number>(3000);
  const [workingDays, setWorkingDays] = useState<number>(22);
  const [successApplyMsg, setSuccessApplyMsg] = useState<string | null>(null);

  // Synchronize dynamic input as selected day, month, or transactions change
  useEffect(() => {
    const dayStr = logDay.toString().padStart(2, '0');
    const txId = `daily-sale-${targetMonth}-${dayStr}`;
    const tx = transactions.find(t => t.id === txId);
    if (tx) {
      setLogValue(Math.abs(tx.value));
      const parts = tx.description.split(' | Obs: ');
      setLogObservation(parts.length > 1 ? parts[1] : '');
    } else {
      setLogValue(0);
      setLogObservation('');
    }
  }, [logDay, targetMonth, transactions]);



  // Existing compound forecast parameters
  const [horizon, setHorizon] = useState<12 | 24 | 36>(12);
  const [scenario, setScenario] = useState<'conservative' | 'normal' | 'aggressive'>('normal');
  const [forecastParams, setForecastParams] = useState({
    growthRate: 8,
    expenseGrowthRate: 3,
    hiringImpact: 8500,
    marketingBoost: 1.5
  });

  // Unique list of months present in transactions history
  const months = useMemo(() => {
    return Array.from(
      new Set(
        transactions.map(t => {
          const parts = t.date.split('-');
          return `${parts[0]}-${parts[1]}`;
        })
      )
    ).sort();
  }, [transactions]);

  // Sidebar toggle state (Default to selected planning month, per user instructions)
  const [leftSidebarMode, setLeftSidebarMode] = useState<'selected_month' | 'historical_averages'>('selected_month');

  // Month label in Portuguese helper
  const getMonthLabel = (monthStr: string): string => {
    const parts = monthStr.split('-');
    if (parts.length === 2) {
      const monthsMap: { [key: string]: string } = {
        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
        '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
        '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
      };
      return `${monthsMap[parts[1]]} de ${parts[0]}`;
    }
    return monthStr;
  };

  // Keep selectedHistoricalMonths initialized to all available months when months list changes
  useEffect(() => {
    if (months.length > 0 && selectedHistoricalMonths.length === 0) {
      setSelectedHistoricalMonths(months);
    }
  }, [months]);

  // Helper inside Forecast to calculate category sums
  const getCatSum = (catId: string, month: string): number => {
    return transactions
      .filter(t => {
        const parts = t.date.split('-');
        return t.classification === catId && `${parts[0]}-${parts[1]}` === month;
      })
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  };

  // Helper to aggregate category groups for any specific month
  const getActualSum = (catId: string, month: string): number => {
    if (catId === 'total_sales') {
      return Math.abs(getCatSum('sales_products', month) + getCatSum('sales_services', month));
    } else if (catId === 'deductions') {
      return Math.abs(
        getCatSum('deduction_icms', month) + getCatSum('deduction_pis', month) + getCatSum('deduction_cofins', month) + getCatSum('deduction_iss', month)
      );
    } else if (catId === 'costs') {
      return Math.abs(
        getCatSum('costs_materials', month) + getCatSum('costs_resell', month) + getCatSum('costs_production', month)
      );
    } else if (catId === 'operating_expenses') {
      return Math.abs(
        getCatSum('opex_people', month) + getCatSum('opex_marketing', month) + getCatSum('opex_systems', month) + getCatSum('opex_contractors', month) + getCatSum('opex_maintenance', month) + getCatSum('opex_admin', month)
      );
    } else {
      return Math.abs(getCatSum(catId, month));
    }
  };

  // Target month real numbers derivations
  const actualMonthSales = useMemo(() => getActualSum('total_sales', targetMonth), [targetMonth, transactions]);
  const actualMonthDeductions = useMemo(() => getActualSum('deductions', targetMonth), [targetMonth, transactions]);
  const actualMonthCosts = useMemo(() => getActualSum('costs', targetMonth), [targetMonth, transactions]);
  const actualMonthOpex = useMemo(() => getActualSum('operating_expenses', targetMonth), [targetMonth, transactions]);
  const actualMonthEbitda = useMemo(() => {
    return actualMonthSales - (actualMonthCosts + actualMonthDeductions + actualMonthOpex);
  }, [actualMonthSales, actualMonthCosts, actualMonthDeductions, actualMonthOpex]);

  const transactionsInSelectedMonth = useMemo(() => {
    return transactions.filter(t => {
      const parts = t.date.split('-');
      return `${parts[0]}-${parts[1]}` === targetMonth;
    });
  }, [targetMonth, transactions]);

  // Helper inside Forecast to calculate historical average (filtering by active selected period)
  const getAverageValue = (catId: string): number => {
    const activeMonths = selectedHistoricalMonths.length > 0 ? selectedHistoricalMonths : months;
    if (activeMonths.length === 0) return 0;
    let sumTotal = 0;
    activeMonths.forEach(m => {
      if (catId === 'total_sales') {
        sumTotal += Math.abs(getCatSum('sales_products', m) + getCatSum('sales_services', m));
      } else if (catId === 'net_revenue') {
        const sales = Math.abs(getCatSum('sales_products', m) + getCatSum('sales_services', m));
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
    return sumTotal / activeMonths.length;
  };

  const baselineSales = useMemo(() => {
    if (leftSidebarMode === 'selected_month') {
      return actualMonthSales > 0 ? actualMonthSales : (getAverageValue('total_sales') || 0);
    }
    return getAverageValue('total_sales') || 0;
  }, [leftSidebarMode, actualMonthSales, months, selectedHistoricalMonths, transactions]);

  const baselineDeductions = useMemo(() => {
    if (leftSidebarMode === 'selected_month') {
      return actualMonthDeductions > 0 ? actualMonthDeductions : (getAverageValue('deductions') || 0);
    }
    return getAverageValue('deductions') || 0;
  }, [leftSidebarMode, actualMonthDeductions, months, selectedHistoricalMonths, transactions]);

  const baselineCosts = useMemo(() => {
    if (leftSidebarMode === 'selected_month') {
      return actualMonthCosts > 0 ? actualMonthCosts : (getAverageValue('costs') || 0);
    }
    return getAverageValue('costs') || 0;
  }, [leftSidebarMode, actualMonthCosts, months, selectedHistoricalMonths, transactions]);

  const baselineOpex = useMemo(() => {
    if (leftSidebarMode === 'selected_month') {
      return actualMonthOpex > 0 ? actualMonthOpex : (getAverageValue('operating_expenses') || 0);
    }
    return getAverageValue('operating_expenses') || 0;
  }, [leftSidebarMode, actualMonthOpex, months, selectedHistoricalMonths, transactions]);

  // Helpers to fetch previous month and calculate historical/comparison values
  const getPreviousMonthStr = (monthStr: string): string => {
    const parts = monthStr.split('-');
    if (parts.length === 2) {
      let year = parseInt(parts[0]);
      let month = parseInt(parts[1]);
      month--;
      if (month === 0) {
        month = 12;
        year--;
      }
      return `${year}-${month.toString().padStart(2, '0')}`;
    }
    return monthStr;
  };

  const previousMonthSales = useMemo(() => {
    const prevMonth = getPreviousMonthStr(targetMonth);
    return Math.abs(getCatSum('sales_products', prevMonth) + getCatSum('sales_services', prevMonth));
  }, [targetMonth, transactions]);

  const referenceSales = useMemo(() => {
    return previousMonthSales > 0 ? previousMonthSales : baselineSales;
  }, [previousMonthSales, baselineSales]);

  // Synchronize interactive inputs to loaded/historical config of the selected Month and active trends
  useEffect(() => {
    const salesGoal = categoryGoals.find(g => g.categoryId === 'total_sales' && g.month === targetMonth);
    if (salesGoal) {
      setTargetFaturamento(salesGoal.targetValue);
      if (referenceSales > 0) {
        const calculatedPct = ((salesGoal.targetValue - referenceSales) / referenceSales) * 100;
        setGrowthPretensionPct(Number(calculatedPct.toFixed(1)));
      }
    } else {
      if (referenceSales > 0) {
        const calculatedInitialValue = Math.round(referenceSales * (1 + growthPretensionPct / 100));
        setTargetFaturamento(calculatedInitialValue);
      }
    }

    const mktGoal = categoryGoals.find(g => g.categoryId === 'opex_marketing' && g.month === targetMonth);
    if (mktGoal) {
      setMarketingBudget(mktGoal.targetValue);
    } else {
      setMarketingBudget(4500);
    }

    const config = monthConfigs.find(c => c.month === targetMonth);
    if (config) {
      setWorkingDays(config.totalWorkingDays);
    } else {
      setWorkingDays(22);
    }
  }, [targetMonth, categoryGoals, monthConfigs, referenceSales]);

  // Sync Growth rate input change with target faturamento
  const handleGrowthPctChange = (pct: number) => {
    setGrowthPretensionPct(pct);
    const calculatedVal = Math.round(referenceSales * (1 + pct / 100));
    setTargetFaturamento(calculatedVal);
  };

  // Sync Target faturamento input change with Growth rate
  const handleTargetFaturamentoChange = (val: number) => {
    setTargetFaturamento(val);
    if (referenceSales > 0) {
      const calculatedPct = ((val - referenceSales) / referenceSales) * 100;
      setGrowthPretensionPct(Number(calculatedPct.toFixed(1)));
    }
  };

  const daysInMonth = useMemo(() => {
    const parts = targetMonth.split('-');
    if (parts.length === 2) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      return new Date(year, month, 0).getDate();
    }
    return 30; // fallback
  }, [targetMonth]);

  const dailyRegisters = useMemo(() => {
    const list = [];
    const dailyTarget = targetFaturamento / (workingDays || 1);

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = d.toString().padStart(2, '0');
      const txId = `daily-sale-${targetMonth}-${dayStr}`;
      const tx = transactions.find(t => t.id === txId);
      
      const value = tx ? Math.abs(tx.value) : 0;
      const exactPct = dailyTarget > 0 ? (value / dailyTarget) * 100 : 0;

      let obs = '';
      if (tx) {
        const parts = tx.description.split(' | Obs: ');
        obs = parts.length > 1 ? parts[1] : '';
      }

      // Day of week calculation
      const parts = targetMonth.split('-');
      const weekdayName = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, d)
        .toLocaleDateString('pt-BR', { weekday: 'short' });

      list.push({
        day: d,
        dayStr,
        weekdayName,
        value,
        exactPct,
        observation: obs,
        exists: !!tx,
      });
    }
    return list;
  }, [daysInMonth, targetMonth, transactions, targetFaturamento, workingDays]);

  const totalRegisteredDaily = useMemo(() => {
    return dailyRegisters.reduce((sum, item) => sum + item.value, 0);
  }, [dailyRegisters]);

  const progressTotalPct = useMemo(() => {
    return targetFaturamento > 0 ? (totalRegisteredDaily / targetFaturamento) * 100 : 0;
  }, [totalRegisteredDaily, targetFaturamento]);

  const registeredDaysCount = useMemo(() => {
    return dailyRegisters.filter(item => item.exists).length;
  }, [dailyRegisters]);

  const handleSaveDailySaleLocal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!onAddTransaction || !onDeleteTransaction || !onUpdateTransaction) {
      alert("Operações de transação não configuradas no componente.");
      return;
    }

    const dayStr = logDay.toString().padStart(2, '0');
    const dateStr = `${targetMonth}-${dayStr}`;
    const txId = `daily-sale-${targetMonth}-${dayStr}`;

    const existingTx = transactions.find(t => t.id === txId);

    if (logValue <= 0) {
      if (existingTx) {
        onDeleteTransaction(existingTx.id);
        setSuccessApplyMsg(`Lançamento do dia ${dayStr} removido.`);
        setTimeout(() => setSuccessApplyMsg(null), 4000);
      }
      return;
    }

    const finalDescription = `Venda Diária - Dia ${dayStr}${logObservation.trim() ? ` | Obs: ${logObservation.trim()}` : ''}`;

    const newTx: Transaction = {
      id: txId,
      date: dateStr,
      account: 'Caixa de Vendas Diárias',
      description: finalDescription,
      classification: 'sales_products',
      costType: 'N/A',
      value: logValue,
      isManual: true,
      batchId: `daily_sales_${targetMonth}`,
      batchName: `Vendas Diárias - ${targetMonth}`
    };

    if (existingTx) {
      onUpdateTransaction(newTx);
    } else {
      onAddTransaction(newTx);
    }

    setSuccessApplyMsg(`Venda do Dia ${dayStr} registrada: R$ ${logValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    setTimeout(() => setSuccessApplyMsg(null), 4500);
  };

  const handleDeleteDailySaleDirect = (dayNum: number) => {
    if (!onDeleteTransaction) return;
    const dayStr = dayNum.toString().padStart(2, '0');
    const txId = `daily-sale-${targetMonth}-${dayStr}`;
    const existingTx = transactions.find(t => t.id === txId);
    if (existingTx) {
      onDeleteTransaction(existingTx.id);
      setSuccessApplyMsg(`Lançamento do dia ${dayStr} removido.`);
      setTimeout(() => setSuccessApplyMsg(null), 4000);
    }
  };

  const handleClearDailySales = () => {
    if (!onDeleteTransaction) {
      alert("Operação de remoção de transações não configurada.");
      return;
    }
    const targetTransactions = transactions.filter(t => t.id.startsWith('daily-sale-') || t.batchId?.startsWith('daily_sales_'));
    if (targetTransactions.length === 0) {
      alert("Nenhum lançamento de faturamento diário encontrado para limpar.");
      return;
    }
    if (window.confirm(`Tem certeza de que deseja apagar permanentemente todos os ${targetTransactions.length} registros de faturamento diário (fictícios) lançados no sistema para começar com dados reais?`)) {
      targetTransactions.forEach(tx => {
        onDeleteTransaction(tx.id);
      });
      setSuccessApplyMsg("Todos os registros de faturamento diário fictício foram apagados com sucesso! Comece a registrar as informações reais.");
      setTimeout(() => setSuccessApplyMsg(null), 5000);
    }
  };

  // Calculate FEASIBILITY ANALYZER output (Chances de atingimento da meta)
  const feasibilityAnalysis = useMemo(() => {
    const requestedGrowth = targetFaturamento - referenceSales;
    
    // Guard for initial business state with no previous sales/data recorded
    if (referenceSales <= 0) {
      return {
        score: 100,
        status: 'Início de Operação Real',
        colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-150',
        progressBarClass: 'bg-indigo-600',
        advice: 'Nenhum faturamento real foi registrado no período anterior para servir de base. Defina sua meta para este mês, e o simulador calculará os recursos recomendados para sua nova operação.',
        marketingStatus: 'N/A (Nova Base)',
        operationalStatus: 'Adequado',
        recommendation: 'Cadastre suas primeiras vendas ou dados históricos retroativos para estabelecer sua linha de base (baseline) operacional real.',
        requestedGrowth,
        growthPercent: 0
      };
    }

    // 1. Meta conservadora (menor ou igual ao faturamento real do mês anterior)
    if (requestedGrowth <= 0) {
      return {
        score: 95,
        status: 'Conservadora & Segura',
        colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        progressBarClass: 'bg-emerald-500',
        advice: 'Sua meta de vendas está no nível ou abaixo do faturamento real do mês anterior. É consideravelmente segura e não exige esforços adicionais significativos de captação.',
        marketingStatus: 'Excelente',
        operationalStatus: 'Adequado',
        recommendation: 'Aproveite este período estável para maximizar margem e construir caixa de segurança comercial.'
      };
    }

    // 2. Crescimento positivo: Calcular viabilidade baseada em investimento comercial versus histórico
    // ROI ideal de Marketing estimado em 6x a 8x para ser de baixo risco (ou seja, custo de aquisição CAC médio de 12.5% a 16.6%)
    // Se investirem pouco marketing para muito crescimento projetado, a chance cai
    const growthPercent = (requestedGrowth / referenceSales) * 100;

    // Marketing Investment Ratio (MIR): O qual investirá em marketing em relação ao delta de receita pretendido
    const mir = requestedGrowth > 0 ? (marketingBudget / requestedGrowth) : 0;
    
    // Operational Investment Ratio (OIR): O quanto investirá em infra e contratação em relação ao delta
    const oir = requestedGrowth > 0 ? (operationalInvestment / requestedGrowth) : 0;

    // Base score start at 100, penalized by high growth rate requirements without matching resources
    let score = 92 - growthPercent; // Mais crescimento pretendido = mais difícil/arriscado

    // Resource boosters
    // Se o orçamento de marketing for pelo menos 13% do delta de receita, adiciona 20 pontos de chance
    const expectedMarketingRatio = 0.13;
    if (mir >= expectedMarketingRatio) {
      score += 25;
    } else if (mir > 0) {
      score += (mir / expectedMarketingRatio) * 20;
    }

    // Se o investimento operacional for pelo menos 8% do delta de receita, adiciona 15 pontos de chance (evita gargalo)
    const expectedOpRatio = 0.08;
    if (oir >= expectedOpRatio) {
      score += 15;
    } else if (oir > 0) {
      score += (oir / expectedOpRatio) * 12;
    }

    // Penalidade por meta excessivamente arrojada (crescimento > 45% em 1 mês é considerado meta imbatível sem investimentos hercúleos)
    if (growthPercent > 45) {
      score -= 22;
    }

    // Ensure score is clamped inside realistic limits
    score = Math.max(15, Math.min(97, Math.round(score)));

    let status = '';
    let colorClass = '';
    let progressBarClass = '';
    let advice = '';
    let marketingStatus = 'Baixo';
    let operationalStatus = 'Baixo';
    let recommendation = '';

    // Classify
    if (score >= 80) {
      status = 'Planejamento Altamente Viável';
      colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      progressBarClass = 'bg-emerald-500';
      advice = `Meta realista fundamentada! O orçamento de marketing (MIR de ${(mir * 100).toFixed(1)}%) e os investimentos operacionais declarados dão pleno suporte e sustentação de caixa estatística para expandir R$ ${requestedGrowth.toLocaleString('pt-BR')} no faturamento em relação ao mês anterior (R$ ${Math.round(referenceSales).toLocaleString('pt-BR')}) de forma controlada.`;
      marketingStatus = 'Excelente (Suficiente)';
      operationalStatus = 'Excelente (Estruturado)';
      recommendation = 'Mantenha a execução comercial conforme planejado. Monitore semanalmente o CAC de cada canal de tráfego.';
    } else if (score >= 50) {
      status = 'Desafiadora / Requer Atenção';
      colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
      progressBarClass = 'bg-amber-500';
      marketingStatus = mir >= 0.08 ? 'Razoável' : 'Abaixo do Recomendado';
      operationalStatus = oir >= 0.05 ? 'Equilibrado' : 'Próximo ao Gargalo';
      advice = `Sua meta é viável para crescimento em relação ao mês anterior (+${growthPercent.toFixed(1)}%), porém impõe pressão. O crescimento almejado exigirá dedicação pesada da equipe. O aporte em publicidade gerará tráfego, mas o orçamento operacional está levemente subdimensionado para a entrega física técnica.`;
      
      const suggestedMkt = requestedGrowth * 0.15;
      const suggestedOp = requestedGrowth * 0.08;
      recommendation = `Para elevar a chance de sucesso para o patamar seguro (verde), recomendamos expandir o orçamento de marketing para cerca de R$ ${Math.round(suggestedMkt).toLocaleString('pt-BR')} ou adicionar R$ ${Math.round(suggestedOp).toLocaleString('pt-BR')} em sistemas/melhorias de processos.`;
    } else {
      status = 'Sob Alto Risco de Não Atingimento';
      colorClass = 'text-red-700 bg-red-50 border-red-200';
      progressBarClass = 'bg-red-500';
      marketingStatus = 'Crítico / Insuficiente';
      operationalStatus = 'Gargalo Operacional Crítico';
      advice = `Atenção: Esta meta possui forte risco de frustração. Exigir um crescimento abrupto de +${growthPercent.toFixed(1)}% em relação ao mês anterior sem suporte suficiente de aquisição comercial paga (Marketing de ${(mir*100).toFixed(1)}% do crescimento) criará gargalos ou sobrecargas.`;
      
      const suggestedMinMkt = requestedGrowth * 0.16;
      recommendation = `Sugerimos recalcular os objetivos comerciais com base no faturamento do mês anterior (R$ ${Math.round(referenceSales).toLocaleString('pt-BR')}). Caso mantenha esse faturamento agressivo, invista ativamente pelo menos R$ ${Math.round(suggestedMinMkt).toLocaleString('pt-BR')} em canais de atração paga ou dilua essa expansão em um plano de 2 a 3 meses.`;
    }

    return {
      score,
      status,
      colorClass,
      progressBarClass,
      advice,
      marketingStatus,
      operationalStatus,
      recommendation,
      requestedGrowth,
      growthPercent
    };
  }, [targetFaturamento, marketingBudget, operationalInvestment, referenceSales]);

  // Action: Apply generated goal values directly into App State
  const handleApplyGoals = () => {
    // 1. Save Total Sales Goal (categoryId: 'total_sales' which drives overall display logic, but also divide proportionately between sales_products and sales_services based on history)
    const histProd = Math.abs(getAverageValue('sales_products'));
    const histServ = Math.abs(getAverageValue('sales_services'));
    const totHist = histProd + histServ || 1;
    const prodRatio = histProd / totHist;
    const servRatio = histServ / totHist;

    const prodGoal = Math.round(targetFaturamento * prodRatio);
    const servGoal = Math.round(targetFaturamento * servRatio);

    onSaveCategoryGoal('sales_products', targetMonth, prodGoal);
    onSaveCategoryGoal('sales_services', targetMonth, servGoal);
    
    // Also store total_sales as a unified goal so DRE columns sync properly
    onSaveCategoryGoal('total_sales', targetMonth, targetFaturamento);

    // 2. Set default proportionate costs targets to keep targets connected to operational realities!
    // Materials & production costs usually grow linearly with sales (Variable costs)
    if (baselineSales > 0) {
      const salesGrowthFactor = targetFaturamento / baselineSales;
      const calculatedCostsProd = Math.round(Math.abs(getAverageValue('costs_production')) * salesGrowthFactor);
      const calculatedCostsResell = Math.round(Math.abs(getAverageValue('costs_resell')) * salesGrowthFactor);
      
      onSaveCategoryGoal('costs_production', targetMonth, calculatedCostsProd);
      onSaveCategoryGoal('costs_resell', targetMonth, calculatedCostsResell);
    }

    // 3. Set marketing opex goal to the planned marketingBudget
    onSaveCategoryGoal('opex_marketing', targetMonth, marketingBudget);

    // 4. Save month working days config
    onSaveMonthConfig(targetMonth, workingDays, 0);

    setSuccessApplyMsg(`Meta de R$ ${targetFaturamento.toLocaleString('pt-BR')} aplicada com sucesso para ${targetMonth}! Distribuímos as metas proporcionais de produtos, serviços e custos variáveis para manter sua DRE perfeitamente coerente.`);
    setTimeout(() => setSuccessApplyMsg(null), 8500);
  };


  // -------------------------------------------------------------
  // SIMULADOR DE LONGO PRAZO ENGINE (Compound Forecast - Existing)
  // -------------------------------------------------------------
  const scenarioMultiplier = {
    conservative: 0.7,
    normal: 1,
    aggressive: 1.4
  };

  const projectionTimeline = useMemo(() => {
    const list = [];
    const latestMonthStr = months[months.length - 1] || '2026-05';
    const lastDate = new Date(latestMonthStr + '-15');

    for (let step = 1; step <= horizon; step++) {
      const futureDate = new Date(lastDate);
      futureDate.setMonth(lastDate.getMonth() + step);
      const label = futureDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

      // Compound calculations with scenario limits
      const effectiveGrowth = forecastParams.growthRate * scenarioMultiplier[scenario];
      const compoundRevenueFactor = Math.pow(1 + (effectiveGrowth + (forecastParams.marketingBoost * 0.5)) / 100, step);
      const compoundOpexFactor = Math.pow(1 + forecastParams.expenseGrowthRate / 100, step);

      const projectedRevenue = Math.round(baselineSales * compoundRevenueFactor);
      const projectedDeductions = Math.round(baselineDeductions * compoundRevenueFactor);
      const projectedCosts = Math.round(baselineCosts * compoundRevenueFactor * 0.95);
      const projectedOpex = Math.round(baselineOpex * compoundOpexFactor + (forecastParams.hiringImpact * (1 + (step / 12) * 0.1)));

      const projectedEbitda = projectedRevenue - (projectedDeductions + projectedCosts + projectedOpex);
      const projectedNetProfit = Math.round(projectedEbitda * 0.85);

      list.push({
        stepLabel: label,
        revenue: projectedRevenue,
        expenses: projectedDeductions + projectedCosts + projectedOpex,
        ebitda: projectedEbitda,
        netProfit: projectedNetProfit,
        margin: projectedRevenue > 0 ? (projectedEbitda / projectedRevenue) * 100 : 0
      });
    }
    return list;
  }, [horizon, scenario, forecastParams, baselineSales, baselineDeductions, baselineCosts, baselineOpex, months]);

  const finalRevenue = projectionTimeline[horizon - 1]?.revenue || 0;
  const finalEbitda = projectionTimeline[horizon - 1]?.ebitda || 0;
  const growthMultiple = baselineSales > 0 ? (finalRevenue / baselineSales) : 1;

  return (
    <div id="forecast-tab-workspace" className="space-y-6">
      
      {/* Page Title Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 text-indigo-650">
            <Target className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              Planejamento de Metas & Projeção Realista
              <span className="bg-indigo-100/60 text-indigo-700 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                Business Intelligence
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Defina metas realistas baseadas nos seus números operacionais históricos e avalie a viabilidade lógica de alcance.
            </p>
          </div>
        </div>

        {/* Master sub tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('goals_planner')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              activeSubTab === 'goals_planner' 
                ? 'bg-white text-indigo-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-850'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Meta Realista & Viabilidade
          </button>
          <button
            onClick={() => setActiveSubTab('long_term_forecast')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              activeSubTab === 'long_term_forecast' 
                ? 'bg-white text-indigo-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-850'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Simulador de Longo Prazo
          </button>
        </div>
      </div>

      {activeSubTab === 'goals_planner' && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* COLUNA ESQUERDA: HISTÓRICO DA OPERAÇÃO (BASE REALÍSTICA) */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-150 pb-3 font-sans">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-700">
                  <Landmark className="h-4.5 w-4.5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">Histórico Real da Operação</h3>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {leftSidebarMode === 'selected_month'
                      ? `Lançamentos reais em ${getMonthLabel(targetMonth)}`
                      : 'Médias derivadas dos seus lançamentos retroativos ativos'}
                  </span>
                </div>
              </div>

              {/* Mês Selecionado vs Média Multi-mês visual tab selectors */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-sans">
                <button
                  type="button"
                  onClick={() => setLeftSidebarMode('selected_month')}
                  className={`flex-1 py-1.5 px-1 rounded-lg font-black uppercase tracking-wider transition-all text-center cursor-pointer ${
                    leftSidebarMode === 'selected_month'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 font-bold'
                  }`}
                >
                  Mês de Planejamento
                </button>
                <button
                  type="button"
                  onClick={() => setLeftSidebarMode('historical_averages')}
                  className={`flex-1 py-1.5 px-1 rounded-lg font-black uppercase tracking-wider transition-all text-center cursor-pointer ${
                    leftSidebarMode === 'historical_averages'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 font-bold'
                  }`}
                >
                  Médias do Período
                </button>
              </div>

              {leftSidebarMode === 'historical_averages' ? (
                /* Filtro de Período Multi-mês */
                <div className="space-y-2 border-b border-slate-150 pb-3">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Filtrar Período de Análise</span>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setSelectedHistoricalMonths(months)}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors uppercase text-[9px] font-black cursor-pointer bg-none border-none p-0"
                    >
                      Todos
                    </button>
                    <span className="text-slate-250 font-normal">|</span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedHistoricalMonths([])}
                      className="text-slate-500 hover:text-slate-800 transition-colors uppercase text-[9px] font-black cursor-pointer bg-none border-none p-0"
                    >
                      Nenhum
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                  {months.map((m) => {
                    const isSelected = selectedHistoricalMonths.includes(m);
                    const label = (() => {
                      const parts = m.split('-');
                      if (parts.length === 2) {
                        const monthsMap: { [key: string]: string } = {
                          '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
                          '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
                          '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
                        };
                        return `${monthsMap[parts[1]]}/${parts[0].substring(2)}`;
                      }
                      return m;
                    })();

                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedHistoricalMonths(prev => prev.filter(x => x !== m));
                          } else {
                            setSelectedHistoricalMonths(prev => [...prev, m].sort());
                          }
                        }}
                        className={`text-[9.5px] font-extrabold px-1.5 py-1 rounded border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs hover:bg-indigo-750'
                            : 'bg-slate-50 text-slate-500 border-slate-205 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {selectedHistoricalMonths.length === 0 && (
                  <p className="text-[10px] text-amber-600 font-bold italic">
                    Nenhum mês selecionado. Utilizando histórico completo por padrão.
                  </p>
                )}
              </div>
              ) : (
                /* Chamada informativa do mês atual selecionado */
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-slate-500 text-[10px] leading-relaxed">
                  Mostrando os resultados consolidados coletados a partir de filtros estritos do planejamento ativo no mês de <strong>{getMonthLabel(targetMonth)}</strong>. Use para auditar de forma granular.
                </div>
              )}

              <div className="space-y-3.5">
                <div className="bg-slate-50 border border-slate-100/75 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400">
                      {leftSidebarMode === 'selected_month' ? 'Total Faturado no Mês' : 'Total Faturado (Médio)'}
                    </span>
                    <span className="block text-sm font-extrabold text-slate-800 font-mono mt-0.5">
                      R$ {(leftSidebarMode === 'selected_month' ? actualMonthSales : baselineSales).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[10px] bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-full font-bold">100.0%</span>
                </div>

                <div className="bg-slate-50 border border-slate-100/75 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400">
                      {leftSidebarMode === 'selected_month' ? 'Custos & Deduções no Mês' : 'Custo de Mercadoria/Deduções'}
                    </span>
                    <span className="block text-sm font-bold text-slate-700 font-mono mt-0.5">
                      R$ {(leftSidebarMode === 'selected_month' ? (actualMonthCosts + actualMonthDeductions) : (baselineCosts + baselineDeductions)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full font-bold">
                    {(() => {
                      const faturamento = leftSidebarMode === 'selected_month' ? actualMonthSales : baselineSales;
                      const custoTotal = leftSidebarMode === 'selected_month' ? (actualMonthCosts + actualMonthDeductions) : (baselineCosts + baselineDeductions);
                      return faturamento > 0 ? `${((custoTotal / faturamento) * 100).toFixed(1)}%` : '0%';
                    })()}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-100/75 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-bold">
                      {leftSidebarMode === 'selected_month' ? 'Despesas Operacionais (OPEX)' : 'Despesas Operacionais (OPEX)'}
                    </span>
                    <span className="block text-sm font-bold text-slate-700 font-mono mt-0.5">
                      R$ {(leftSidebarMode === 'selected_month' ? actualMonthOpex : baselineOpex).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-bold font-mono">
                    {(() => {
                      const faturamento = leftSidebarMode === 'selected_month' ? actualMonthSales : baselineSales;
                      const opex = leftSidebarMode === 'selected_month' ? actualMonthOpex : baselineOpex;
                      return faturamento > 0 ? `${((opex / faturamento) * 100).toFixed(1)}%` : '0%';
                    })()}
                  </span>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl flex justify-between items-center shadow-2xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-indigo-600">
                      {leftSidebarMode === 'selected_month' ? 'Lucro EBITDA no Mês' : 'Lucro EBITDA Médio'}
                    </span>
                    <span className="block text-base font-black text-indigo-750 font-mono mt-0.5">
                      R$ {(leftSidebarMode === 'selected_month' ? actualMonthEbitda : Math.max(0, baselineSales - (baselineCosts + baselineDeductions + baselineOpex))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-black font-mono shadow-sm ${
                    (leftSidebarMode === 'selected_month' ? actualMonthEbitda : baselineSales - (baselineCosts + baselineDeductions + baselineOpex)) >= 0
                      ? 'bg-indigo-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}>
                    {(() => {
                      const faturamento = leftSidebarMode === 'selected_month' ? actualMonthSales : baselineSales;
                      const ebitda = leftSidebarMode === 'selected_month' ? actualMonthEbitda : (baselineSales - (baselineCosts + baselineDeductions + baselineOpex));
                      return faturamento > 0 ? `${((ebitda / faturamento) * 100).toFixed(1)}%` : '0%';
                    })()}
                  </span>
                </div>
              </div>

              {/* Detalhes de Categorias do Período no modo Mês Selecionado (Excepcionalmente Útil para Auditoria do Mês) */}
              {leftSidebarMode === 'selected_month' && (
                <div className="border-t border-slate-100 pt-3.5 mt-3.5 space-y-2 font-sans overflow-hidden">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-indigo-800 tracking-wider">
                    <span>Detalhamento do Período</span>
                    <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[8.5px]">
                      {transactionsInSelectedMonth.length} Lançamentos
                    </span>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 font-sans">
                    {categories.map(cat => {
                      const catSum = Math.abs(getCatSum(cat.id, targetMonth));
                      if (catSum === 0) return null; // Only show categories with activity for cleaner minimalist layout
                      const isIncome = cat.id.startsWith('sales_') || cat.id === 'shareholder_contribution';
                      
                      return (
                        <div key={cat.id} className="flex justify-between items-center text-[10.5px] bg-slate-50 border border-slate-100 p-2 rounded-lg hover:bg-slate-100/70 transition-all">
                          <div className="truncate max-w-[175px]" title={cat.name}>
                            <span className="font-extrabold text-slate-700 block text-[10px] leading-tight shrink-0">{cat.name}</span>
                            <span className="text-[9px] text-slate-400 capitalize">{cat.type === 'incoming' ? 'Receita' : cat.type === 'outgoing' ? 'Despesa' : cat.type === 'deduction' ? 'Dedução' : 'Fórmula'}</span>
                          </div>
                          <span className={`font-mono font-black shrink-0 ${isIncome ? 'text-emerald-600' : 'text-slate-600'}`}>
                            R$ {catSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                    {categories.every(cat => getCatSum(cat.id, targetMonth) === 0) && (
                      <p className="text-[10px] text-slate-400 italic text-center py-4 font-sans">
                        Nenhum faturamento ou despesa registrado nesta competência.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-slate-100/75 p-3 rounded-xl flex gap-2 text-slate-500">
                <Info className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
                <p className="text-[10px] leading-relaxed">
                  As médias mostradas acima representam a base da sua operação real comercial. Metas saudáveis de faturamento devem tentar expandir entre <strong>5% a 25%</strong> por mês, acompanhadas de proporcional reforço de caixa e budget.
                </p>
              </div>
            </div>

          </div>

          {/* COLUNA CENTRAL & DIREITA: DEFINIÇÃO INTERATIVA DE METAS & ANÁLISE DE VIABILIDADE */}
          <div className="xl:col-span-8 flex flex-col gap-6">

            {successApplyMsg && (
              <div className="bg-emerald-55 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl p-4 flex gap-3 shadow-md animate-fade-in">
                <CheckCircle2 className="h-5.5 w-5.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-extrabold block text-sm">Meta Consolidada Aplicada com Sucesso!</span>
                  <span className="mt-1 block leading-relaxed font-medium">{successApplyMsg}</span>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <Sliders className="h-4.5 w-4.5 text-indigo-600" /> Configuração do Planejamento
                </h3>
                
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Mês do Planejamento:</span>
                  <select 
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs font-mono font-bold rounded py-1 px-2.5 text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="2026-01">Janeiro de 2026</option>
                    <option value="2026-02">Fevereiro de 2026</option>
                    <option value="2026-03">Março de 2026</option>
                    <option value="2026-04">Abril de 2026</option>
                    <option value="2026-05">Maio de 2026</option>
                    <option value="2026-06">Junho de 2026</option>
                    <option value="2026-07">Julho de 2026</option>
                    <option value="2026-08">Agosto de 2026</option>
                    <option value="2026-09">Setembro de 2026</option>
                    <option value="2026-10">Outubro de 2026</option>
                    <option value="2026-11">Novembro de 2026</option>
                    <option value="2026-12">Dezembro de 2026</option>
                  </select>
                </div>
              </div>

              {/* INPUT FIELDS WORKSPACE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* METAS FINANCEIRAS */}
                <div className="space-y-4">
                  <span className="text-[10px] uppercase font-black text-indigo-600 tracking-widest block border-b pb-1">Metas Financeiras</span>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-600">Meta Faturamento Bruto (R$)</span>
                      <span className="text-slate-400 text-[10px] font-medium font-mono">
                        Mês Anterior ({(() => {
                          const prevMonth = getPreviousMonthStr(targetMonth);
                          const parts = prevMonth.split('-');
                          const monthsMap: { [key: string]: string } = {
                            '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
                            '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
                            '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
                          };
                          return `${monthsMap[parts[1]] || parts[1]}/${parts[0].substring(2)}`;
                        })()}): R$ {Math.round(referenceSales).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold font-mono">R$</span>
                      <input 
                        type="number"
                        value={targetFaturamento}
                        onChange={(e) => handleTargetFaturamentoChange(Number(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-600">Pretensão de Crescimento (%)</span>
                      <span className={`font-mono font-black ${growthPretensionPct >= 25 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {growthPretensionPct >= 0 ? `+${growthPretensionPct}%` : `${growthPretensionPct}%`}
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="-10"
                      max="60"
                      step="0.5"
                      value={growthPretensionPct}
                      onChange={(e) => handleGrowthPctChange(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none mt-1"
                    />
                    <div className="flex justify-between text-[9px] text-slate-450 font-bold font-mono">
                      <span>-10%</span>
                      <span>Mês Anterior (0%)</span>
                      <span>Desafiadora (+25%)</span>
                      <span>Imbatível (+50%)</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">Dias Úteis Comerciais Estimados (Mês)</label>
                    <input 
                      type="number"
                      min="15"
                      max="31"
                      value={workingDays}
                      onChange={(e) => setWorkingDays(Number(e.target.value) || 22)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Inform required daily sales meta */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 space-y-1 mt-2.5 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-indigo-500 block">Meta Diária Requerida para Vendas</span>
                    <span className="text-base font-black text-indigo-750 font-mono block">
                      R$ {(targetFaturamento / (workingDays || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-indigo-400 block font-medium">
                      Estipulado sobre {workingDays} dias úteis comerciais estimados no período selecionado.
                    </span>
                  </div>
                </div>

                {/* ORÇAMENTO SUPORTE */}
                <div className="space-y-4">
                  <span className="text-[10px] uppercase font-black text-indigo-600 tracking-widest block border-b pb-1">Orçamento de Suporte Comercial</span>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-600 flex items-center gap-1">Orçamento de Tráfego/Marketing (R$)</span>
                      <span className="text-[9px] text-slate-400">Google Ads, Meta, Influencers</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold font-mono">R$</span>
                      <input 
                        type="number"
                        value={marketingBudget}
                        onChange={(e) => setMarketingBudget(Number(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-600">Investimentos Operacionais / Contratações (R$)</span>
                      <span className="text-[9px] text-slate-400">Novos sistemas, ferramentas e comissões</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold font-mono">R$</span>
                      <input 
                        type="number"
                        value={operationalInvestment}
                        onChange={(e) => setOperationalInvestment(Number(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50/75 border border-slate-100 p-3 rounded-xl mt-4">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      💡 <strong>Estatística:</strong> Em cenários de crescimento saudável, o <strong>Custo de Aquisição (CAC)</strong> exige que canais comerciais recebam investimentos correspondentes. Propor metas altas sem orçamento de suporte aumenta vertiginosamente o risco de descumprimento.
                    </p>
                  </div>
                </div>

              </div>

              {/* REALISTIC FEASIBILITY ANALYZER CARD */}
              <div className={`p-5 rounded-2xl border transition-all duration-300 shadow-sm ${feasibilityAnalysis.colorClass}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-indigo-500/10 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white rounded-xl shadow-xs shrink-0">
                      <Sparkles className="h-5 w-5 text-indigo-600 animate-spin-slow" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest block opacity-75">Avaliação de Viabilidade da Meta</span>
                      <h4 className="text-sm font-extrabold uppercase">{feasibilityAnalysis.status}</h4>
                    </div>
                  </div>

                  {/* Chance Output Circle or Big Badge */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold pr-1 block">Sua Chance de Sucesso</span>
                    <span className="text-3xl font-black font-mono tracking-tight leading-none">
                      {feasibilityAnalysis.score}%
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Gauge bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200/50 backdrop-blur-xs rounded-full h-2.5 overflow-hidden border border-slate-300/30">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          feasibilityAnalysis.score >= 80 
                            ? 'bg-emerald-500' 
                            : feasibilityAnalysis.score >= 50 
                              ? 'bg-amber-500' 
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${feasibilityAnalysis.score}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                      <span>Risco Extremo</span>
                      <span>Viável / Desafiadora</span>
                      <span>Consistente / Confortável</span>
                    </div>
                  </div>

                  {/* Feedback Details */}
                  <p className="text-xs leading-relaxed font-medium">
                    {feasibilityAnalysis.advice}
                  </p>

                  {/* Operational indicators comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-y border-indigo-550/10 py-3 font-sans">
                    <div>
                      <span className="text-slate-500 block font-bold">Investimento Comercial (Marketing):</span>
                      <span className="font-bold text-slate-800">{feasibilityAnalysis.marketingStatus}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">MIR Atual: {((marketingBudget / Math.max(1, feasibilityAnalysis.requestedGrowth)) * 100).toFixed(1)}% vs Meta Ideal: 13.0%</p>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-bold">Investimento de Infraestrutura (Vendas):</span>
                      <span className="font-bold text-slate-800">{feasibilityAnalysis.operationalStatus}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">OIR Atual: {((operationalInvestment / Math.max(1, feasibilityAnalysis.requestedGrowth)) * 100).toFixed(1)}% vs Ideal: 8.0%</p>
                    </div>
                  </div>

                  {/* Tactical Action Advice */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-550 block">Recomendação Comercial Recomendada:</span>
                    <p className="text-[11px] leading-relaxed italic text-slate-700">
                      {feasibilityAnalysis.recommendation}
                    </p>
                  </div>
                </div>

                {/* Final Actions to apply the goal */}
                <div className="mt-5 pt-4 border-t border-indigo-500/10 flex justify-end gap-3">
                  <button
                    onClick={handleApplyGoals}
                    style={{ cursor: 'pointer' }}
                    className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    Aplicar Meta na Planejamento da DRE
                  </button>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* --- DYNAMIC DAILY SALES LOG FOR DETAILED TRACKING --- */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wider flex items-center gap-3 font-sans">
                <Target className="h-4.5 w-4.5 text-indigo-600" /> Planejamento de Metas & Projeção Realista
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                Registre as vendas realizadas dia a dia para correlacionar exatamente com as metas e o DRE de faturamento do período de <span className="font-bold text-slate-650">
                  {(() => {
                    const parts = targetMonth.split('-');
                    if (parts.length === 2) {
                      const monthsMap: { [key: string]: string } = {
                        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
                        '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
                        '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
                      };
                      return `${monthsMap[parts[1]]} de ${parts[0]}`;
                    }
                    return targetMonth;
                  })()}
                </span>
              </p>
            </div>
            
            {/* Quick stats badges */}
            <div className="flex flex-wrap gap-2.5 font-sans">
              <div className="bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl text-center shadow-2xs">
                <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Registrado no Mês</span>
                <span className="text-xs font-black text-slate-800 font-mono mt-0.5 block">
                  R$ {totalRegisteredDaily.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-center shadow-2xs">
                <span className="text-[9px] uppercase font-bold text-indigo-500 block font-sans">Atingimento Geral</span>
                <span className="text-xs font-black text-indigo-700 font-mono mt-0.5 block">
                  {progressTotalPct.toFixed(1)}% <span className="text-[9px] font-bold text-indigo-550 shrink-0">({progressTotalPct >= 100 ? 'Meta Atingida! 🎉' : 'do faturamento'})</span>
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl text-center shadow-2xs">
                <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Dias Lançados</span>
                <span className="text-xs font-black text-slate-700 font-mono mt-0.5 block">
                  {registeredDaysCount} de {daysInMonth} dias
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearDailySales}
                className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 font-sans text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs shadow-rose-600/5 flex items-center gap-1 self-center"
              >
                Limpar Faturamento Fictício
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Form Column: 4 cols */}
            <div className="lg:col-span-4 bg-slate-50/50 border border-slate-150 rounded-2xl p-5 space-y-4">
              <span className="text-[10px] uppercase font-black text-indigo-600 tracking-widest block border-b pb-1 font-sans">
                Lançar Nova Venda Diária
              </span>
              
              <form onSubmit={handleSaveDailySaleLocal} className="space-y-4 font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 block uppercase">Escolher o Dia</label>
                  <select
                    value={logDay}
                    onChange={(e) => setLogDay(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono font-bold text-slate-705 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Dia {d.toString().padStart(2, '0')} ({new Date(parseInt(targetMonth.split('-')[0]), parseInt(targetMonth.split('-')[1]) - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' })})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 block uppercase">Valor Vendido no Dia (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono font-bold text-slate-400 select-none">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={logValue || ''}
                      onChange={(e) => setLogValue(Number(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 block uppercase">Observação / Nota do Dia (Livre)</label>
                  <textarea
                    placeholder="Ex: Promoção em itens com prazo de validade curta."
                    value={logObservation}
                    onChange={(e) => setLogObservation(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10"
                >
                  <Check className="h-4 w-4" />
                  {dailyRegisters.find(item => item.day === logDay)?.exists ? 'Atualizar Registro' : 'Salvar Registro de Venda'}
                </button>
              </form>
            </div>

            {/* List Table Column: 8 cols */}
            <div className="lg:col-span-8 flex flex-col gap-3 font-sans">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-1 gap-2">
                <span className="text-[10px] uppercase font-black text-indigo-600 tracking-widest block border-b font-sans">
                  Planilha de Fechamentos Diários
                </span>
                <span className="text-[10px] text-slate-400 font-bold font-mono">
                  Meta Diária Base: R$ {(targetFaturamento / (workingDays || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (com {workingDays} dias úteis)
                </span>
              </div>

              <div className="border border-slate-150 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse bg-white">
                  <thead className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase tracking-wider text-slate-500 font-black font-sans sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3 text-center w-16">Dia</th>
                      <th className="py-2 px-3 text-right w-36">Valor Vendido</th>
                      <th className="py-2 px-3 text-center w-48">% Atingido</th>
                      <th className="py-2 px-3 text-left">Obs do Dia</th>
                      <th className="py-2 px-3 text-center w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {dailyRegisters.map((row) => {
                      const isPassed = row.exactPct >= 100;
                      const hasValue = row.value > 0;
                      return (
                        <tr 
                          key={row.day} 
                          className={`hover:bg-slate-55 transition-colors ${row.exists ? 'bg-indigo-50/15' : ''}`}
                        >
                          <td className="py-1.5 px-3 text-center font-bold font-mono text-slate-700">
                            {row.dayStr} <span className="text-[9px] text-slate-400 block font-sans lowercase font-normal">{row.weekdayName}</span>
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold font-mono text-slate-800">
                            {hasValue ? `R$ ${row.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00'}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            {hasValue ? (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                isPassed 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {row.exactPct.toFixed(0)}% DA META {isPassed ? '(PASSOU)' : ''}
                              </span>
                            ) : (
                              <span className="text-slate-350 font-medium font-mono">-</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-left font-medium text-slate-500 italic max-w-xs truncate" title={row.observation || undefined}>
                            {row.observation || '-'}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <div className="flex justify-center items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setLogDay(row.day);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-extrabold text-[10px] uppercase py-1 px-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Editar lançamento"
                              >
                                Editar
                              </button>
                              {row.exists && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDailySaleDirect(row.day)}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-extrabold text-[10px] uppercase py-1 px-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Remover lançamento"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        </>
      )}

      {activeSubTab === 'long_term_forecast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Simulation triggers */}
          <div className="lg:col-span-1 bg-slate-50 border border-slate-205 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Sliders className="h-4.5 w-4.5 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">Cenário Macroeconômico</h3>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Nível do Cenário</label>
              <div className="grid grid-cols-3 gap-2">
                {(['conservative', 'normal', 'aggressive'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setScenario(s)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border cursor-pointer ${
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
              <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest block">Horizonte de Simulação</label>
              <div className="grid grid-cols-3 gap-2">
                {[12, 24, 36].map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h as any)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                      horizon === h
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
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
                  <span className="font-mono font-bold text-indigo-600">+{forecastParams.growthRate}%</span>
                </div>
                <input 
                  type="range" min="0" max="30" value={forecastParams.growthRate} 
                  onChange={(e) => setForecastParams(prev => ({ ...prev, growthRate: parseInt(e.target.value) }))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Aumento OPEX (a.m.)</span>
                  <span className="font-mono font-bold text-indigo-600">+{forecastParams.expenseGrowthRate}%</span>
                </div>
                <input 
                  type="range" min="0" max="20" value={forecastParams.expenseGrowthRate} 
                  onChange={(e) => setForecastParams(prev => ({ ...prev, expenseGrowthRate: parseInt(e.target.value) }))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Contratações/Novos Custos Fixos</span>
                  <span className="font-mono font-bold text-indigo-600">R$ {forecastParams.hiringImpact.toLocaleString()}</span>
                </div>
                <input 
                  type="range" min="0" max="50000" step="1000" value={forecastParams.hiringImpact} 
                  onChange={(e) => setForecastParams(prev => ({ ...prev, hiringImpact: parseInt(e.target.value) }))}
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
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Trajetória Estimada de {horizon} Meses</h4>
                  <span className="text-[10px] text-slate-400 block font-medium">Modelagem preditiva baseada em taxas compostas</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 font-mono font-extrabold bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/50">
                    Impacto: {growthMultiple.toFixed(1)}x de Crescimento faturamento
                  </span>
                </div>
              </div>

              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProjRecSel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProjEbitSel" x1="0" y1="0" x2="0" y2="1">
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
                    <Area name="Faturamento Projetado" type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorProjRecSel)" />
                    <Area name="EBITDA Projetado" type="monotone" dataKey="ebitda" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProjEbitSel)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Mês Atual (Base)</span>
                <span className="text-sm font-bold text-slate-800 block mt-1">R$ {Math.round(baselineSales).toLocaleString('pt-BR')}</span>
                <p className="text-[9px] text-slate-500 mt-1">Média histórica real de faturamento</p>
              </div>
              <div className="p-4 rounded-xl border border-indigo-150 bg-indigo-50/20">
                <span className="text-[10px] text-indigo-400 block font-bold uppercase tracking-wider">Mês {horizon} (Proj)</span>
                <span className="text-sm font-bold text-indigo-700 block mt-1">R$ {Math.round(finalRevenue).toLocaleString('pt-BR')}</span>
                <p className="text-[9px] text-indigo-500 mt-1">Receita estimada ao final do ciclo</p>
              </div>
              <div className="p-4 rounded-xl border border-emerald-150 bg-emerald-50/20">
                <span className="text-[10px] text-emerald-400 block font-bold uppercase tracking-wider font-sans">EBITDA Terminal (Proj)</span>
                <span className="text-sm font-bold text-emerald-700 block mt-1">R$ {Math.round(finalEbitda).toLocaleString('pt-BR')}</span>
                <p className="text-[9px] text-emerald-500 mt-1">Resultado operacional esperado</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
