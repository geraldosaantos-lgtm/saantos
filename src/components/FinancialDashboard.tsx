import React, { useState, useMemo } from 'react';
import {
  FinancialEntry,
  AccountPlanItem,
  BankAccount,
  ServiceLaunch,
  CompanyProfile,
} from '../types';
import { formatCurrency, parseLaunchDate, getLaunchValue, getWeekRange } from '../utils/storage';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  SlidersHorizontal,
  ArrowRight,
  Layers,
  CreditCard,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  FileText,
  Scale,
  Target,
  Activity,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Percent,
  Sliders,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react';
import {
  buildFinancialAnalysisReport,
  loadAccountCostNatureOverrides,
  saveAccountCostNatureOverrides,
  inferAccountCostNature,
  exportFinancialAnalysisToPDF,
  exportFinancialAnalysisToExcel,
  answerFinancialQuestionLocally,
  CostNature,
  COST_NATURE_LABELS,
  EXPENSE_COST_NATURES,
  REVENUE_COST_NATURES,
} from '../utils/financialAnalyst';

interface FinancialChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  isError?: boolean;
}

interface FinancialDashboardProps {
  company: CompanyProfile;
  entries: FinancialEntry[];
  accountsPlan: AccountPlanItem[];
  bankAccounts?: BankAccount[];
  launches: ServiceLaunch[];
  onOpenFinanceiro: (subTab?: 'movimentacoes' | 'extrato' | 'bancos' | 'plano') => void;
}

type FinPeriod = 'hoje' | 'semana' | 'mes' | 'mes_anterior' | 'ano' | 'todos';

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  company,
  entries,
  accountsPlan,
  bankAccounts = [],
  launches,
  onOpenFinanceiro,
}) => {
  const [period, setPeriod] = useState<FinPeriod>('mes');
  const [dashboardTab, setDashboardTab] = useState<'visao_geral' | 'assistente'>('visao_geral');
  const [chartMode, setChartMode] = useState<'mensal' | 'diario'>('mensal');
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);
  const [costOverrides, setCostOverrides] = useState<Record<string, CostNature>>(() =>
    loadAccountCostNatureOverrides()
  );
  const [insightFilter, setInsightFilter] = useState<'todos' | 'critico' | 'atencao' | 'positivo'>('todos');
  const [showClassificationEditor, setShowClassificationEditor] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [chatMessages, setChatMessages] = useState<FinancialChatMessage[]>([]);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const currentYearPrefix = `${now.getFullYear()}`;
  const { start: weekStart, end: weekEnd } = getWeekRange(now);

  const periodLabel = useMemo(() => {
    switch (period) {
      case 'hoje':
        return `Hoje (${now.toLocaleDateString('pt-BR')})`;
      case 'semana':
        return 'Esta Semana';
      case 'mes':
        return now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      case 'mes_anterior':
        return prevMonthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      case 'ano':
        return `Ano ${now.getFullYear()}`;
      case 'todos':
      default:
        return 'Histórico Completo';
    }
  }, [period]);

  // Filtra lançamentos financeiros pelo período selecionado
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!e.data) return period === 'todos';
      if (period === 'hoje') return e.data === todayStr;
      if (period === 'mes') return e.data.startsWith(currentMonthPrefix);
      if (period === 'mes_anterior') return e.data.startsWith(prevMonthPrefix);
      if (period === 'ano') return e.data.startsWith(currentYearPrefix);
      if (period === 'semana') {
        const d = parseLaunchDate(e.data);
        if (!d) return false;
        const t = d.getTime();
        return t >= weekStart.getTime() && t <= weekEnd.getTime();
      }
      return true;
    });
  }, [entries, period, todayStr, currentMonthPrefix, prevMonthPrefix, currentYearPrefix, weekStart, weekEnd]);

  // Referência de Faturamento de OS do mesmo período (sem misturar com o saldo financeiro)
  const operationalRefRevenue = useMemo(() => {
    return launches.reduce((acc, l) => {
      const d = parseLaunchDate(l.dataHora);
      if (!d) return acc;
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let match = true;
      if (period === 'hoje') match = dStr === todayStr;
      else if (period === 'mes') match = dStr.startsWith(currentMonthPrefix);
      else if (period === 'mes_anterior') match = dStr.startsWith(prevMonthPrefix);
      else if (period === 'ano') match = dStr.startsWith(currentYearPrefix);
      else if (period === 'semana') match = d.getTime() >= weekStart.getTime() && d.getTime() <= weekEnd.getTime();
      return match ? acc + getLaunchValue(l) : acc;
    }, 0);
  }, [launches, period, todayStr, currentMonthPrefix, prevMonthPrefix, currentYearPrefix, weekStart, weekEnd]);

  // KPIs Financeiros (Transferências entre contas NÃO entram como Receita nem Despesa)
  const metrics = useMemo(() => {
    let totalReceitas = 0;
    let qtdReceitas = 0;
    let totalDespesas = 0;
    let qtdDespesas = 0;
    let totalTransferencias = 0;
    let qtdTransferencias = 0;
    let conciliados = 0;
    let pendentes = 0;

    const receitasByConta = new Map<string, { nome: string; grupo: string; total: number; count: number }>();
    const despesasByConta = new Map<string, { nome: string; grupo: string; total: number; count: number }>();
    const bankStats = new Map<string, { banco: string; receitas: number; despesas: number }>();

    filteredEntries.forEach((e) => {
      const val = Math.abs(Number(e.valor) || 0);
      const contaLabel =
        e.contaNome ||
        (e.tipo === 'receita'
          ? 'OUTRAS RECEITAS'
          : e.tipo === 'transferencia'
          ? 'TRANSFERÊNCIA ENTRE CONTAS'
          : 'OUTRAS DESPESAS');
      const grupoLabel = e.grupo || 'GERAL';
      const bancoLabel = e.banco || 'CAIXA';

      if (e.status === 'Pendente') pendentes += 1;
      else conciliados += 1;

      if (e.tipo === 'transferencia') {
        totalTransferencias += val;
        qtdTransferencias += 1;
        return;
      }

      const bCurr = bankStats.get(bancoLabel) || { banco: bancoLabel, receitas: 0, despesas: 0 };

      if (e.tipo === 'receita') {
        totalReceitas += val;
        qtdReceitas += 1;
        bCurr.receitas += val;
        const curr = receitasByConta.get(contaLabel) || { nome: contaLabel, grupo: grupoLabel, total: 0, count: 0 };
        curr.total += val;
        curr.count += 1;
        receitasByConta.set(contaLabel, curr);
      } else {
        totalDespesas += val;
        qtdDespesas += 1;
        bCurr.despesas += val;
        const curr = despesasByConta.get(contaLabel) || { nome: contaLabel, grupo: grupoLabel, total: 0, count: 0 };
        curr.total += val;
        curr.count += 1;
        despesasByConta.set(contaLabel, curr);
      }

      bankStats.set(bancoLabel, bCurr);
    });

    const saldoLiquido = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? Math.round((saldoLiquido / totalReceitas) * 100) : 0;

    return {
      totalReceitas,
      qtdReceitas,
      totalDespesas,
      qtdDespesas,
      totalTransferencias,
      qtdTransferencias,
      saldoLiquido,
      margem,
      conciliados,
      pendentes,
      topReceitas: Array.from(receitasByConta.values()).sort((a, b) => b.total - a.total),
      topDespesas: Array.from(despesasByConta.values()).sort((a, b) => b.total - a.total),
      banks: Array.from(bankStats.values()).sort((a, b) => b.receitas - a.receitas),
    };
  }, [filteredEntries]);

  // Saldos reais consolidados por Conta Bancária cadastrada + movimentação do período (inclui transferências entrada/saída)
  const bankSummaries = useMemo(() => {
    const items = bankAccounts.map((bank) => {
      let allEntradas = 0;
      let allSaidas = 0;
      let periodEntradas = 0;
      let periodSaidas = 0;

      const bankUpper = bank.nome.trim().toUpperCase();
      const matchOrigin = (e: FinancialEntry) =>
        e.bancoId === bank.id ||
        (!e.bancoId && (e.banco || '').trim().toUpperCase() === bankUpper);
      const matchDest = (e: FinancialEntry) =>
        e.tipo === 'transferencia' &&
        (e.bancoDestinoId === bank.id ||
          (!e.bancoDestinoId && (e.bancoDestino || '').trim().toUpperCase() === bankUpper));

      entries.forEach((e) => {
        if (bank.dataSaldoInicial && e.data && e.data < bank.dataSaldoInicial) return;
        if (e.status === 'Pendente') return;
        const val = Math.abs(Number(e.valor) || 0);
        if (e.tipo === 'transferencia') {
          if (matchOrigin(e)) allSaidas += val;
          if (matchDest(e)) allEntradas += val;
          return;
        }
        if (!matchOrigin(e)) return;
        if (e.tipo === 'receita') allEntradas += val;
        else allSaidas += val;
      });

      filteredEntries.forEach((e) => {
        const val = Math.abs(Number(e.valor) || 0);
        if (e.tipo === 'transferencia') {
          if (matchOrigin(e)) periodSaidas += val;
          if (matchDest(e)) periodEntradas += val;
          return;
        }
        if (!matchOrigin(e)) return;
        if (e.tipo === 'receita') periodEntradas += val;
        else periodSaidas += val;
      });

      const saldoAtual = (Number(bank.saldoInicial) || 0) + allEntradas - allSaidas;
      return {
        id: bank.id,
        nome: bank.nome,
        subtitulo: `${bank.banco} · ${bank.tipoConta}`,
        ativo: bank.ativo,
        saldoAtual,
        periodEntradas,
        periodSaidas,
      };
    });

    const registeredNames = new Set(bankAccounts.map((b) => b.nome.trim().toUpperCase()));
    const registeredIds = new Set(bankAccounts.map((b) => b.id));
    const unregistered = metrics.banks.filter((b) => {
      const upper = b.banco.trim().toUpperCase();
      return !registeredNames.has(upper) && !registeredIds.has(b.banco);
    });

    return { items, unregistered };
  }, [bankAccounts, entries, filteredEntries, metrics.banks]);

  // Série do Gráfico de Fluxo de Caixa (Mensal: últimos 6 meses ou Diário: últimos 14 dias — exclui transferências)
  const chartSeries = useMemo(() => {
    if (chartMode === 'mensal') {
      const months: Array<{
        key: string;
        label: string;
        subLabel: string;
        receitas: number;
        despesas: number;
      }> = [];
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({
          key,
          label: monthNames[d.getMonth()],
          subLabel: String(d.getFullYear()),
          receitas: 0,
          despesas: 0,
        });
      }
      entries.forEach((e) => {
        if (e.tipo === 'transferencia') return;
        const prefix = (e.data || '').slice(0, 7);
        const bucket = months.find((m) => m.key === prefix);
        if (bucket) {
          if (e.tipo === 'receita') bucket.receitas += Math.abs(e.valor);
          else bucket.despesas += Math.abs(e.valor);
        }
      });
      return months;
    } else {
      const days: Array<{
        key: string;
        label: string;
        subLabel: string;
        receitas: number;
        despesas: number;
      }> = [];
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        days.push({
          key,
          label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
          subLabel: dayNames[d.getDay()],
          receitas: 0,
          despesas: 0,
        });
      }
      entries.forEach((e) => {
        if (e.tipo === 'transferencia') return;
        const bucket = days.find((d) => d.key === e.data);
        if (bucket) {
          if (e.tipo === 'receita') bucket.receitas += Math.abs(e.valor);
          else bucket.despesas += Math.abs(e.valor);
        }
      });
      return days;
    }
  }, [entries, chartMode]);

  const maxChartVal = Math.max(
    ...chartSeries.flatMap((b) => [b.receitas, b.despesas]),
    100
  );

  const recentEntries = useMemo(() => {
    return [...filteredEntries]
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .slice(0, 8);
  }, [filteredEntries]);

  // Relatório completo do Assistente Financeiro Especialista
  const analysisReport = useMemo(
    () =>
      buildFinancialAnalysisReport({
        filteredEntries,
        allEntries: entries,
        accountsPlan,
        bankAccounts,
        operationalRefRevenue,
        costNatureOverrides: costOverrides,
        periodLabel,
      }),
    [filteredEntries, entries, accountsPlan, bankAccounts, operationalRefRevenue, costOverrides, periodLabel]
  );

  const criticalInsightsCount = useMemo(
    () => analysisReport.insights.filter((i) => i.nivel === 'critico').length,
    [analysisReport.insights]
  );
  const attentionInsightsCount = useMemo(
    () => analysisReport.insights.filter((i) => i.nivel === 'atencao').length,
    [analysisReport.insights]
  );
  const filteredInsights = useMemo(() => {
    if (insightFilter === 'todos') return analysisReport.insights;
    if (insightFilter === 'positivo') {
      return analysisReport.insights.filter((i) => i.nivel === 'positivo' || i.nivel === 'oportunidade');
    }
    return analysisReport.insights.filter((i) => i.nivel === insightFilter);
  }, [analysisReport.insights, insightFilter]);

  const handleCostNatureChange = (accountKey: string, nature: CostNature) => {
    const next = { ...costOverrides, [accountKey]: nature };
    setCostOverrides(next);
    saveAccountCostNatureOverrides(next);
  };

  const handleResetCostOverrides = () => {
    setCostOverrides({});
    saveAccountCostNatureOverrides({});
  };

  const quickQuestions = [
    'Como melhorar meu EBITDA e Margem de Contribuição?',
    'Quanto falta ou qual minha folga no Ponto de Equilíbrio?',
    'Quais despesas mais pesam e onde devo cortar primeiro?',
    'Meu Fluxo de Caixa aguenta os próximos 30 dias?',
    'Quanto preciso faturar para lucrar R$ 5.000?',
  ];

  const handleAskQuestion = (rawQuestion?: string) => {
    const q = (rawQuestion ?? questionInput).trim();
    if (!q) return;

    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: FinancialChatMessage = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      text: q,
      createdAt: nowTime,
    };

    const answer = answerFinancialQuestionLocally({
      question: q,
      report: analysisReport,
      company,
      periodLabel,
      bankAccounts,
      operationalRefRevenue,
    });

    const assistantMsg: FinancialChatMessage = {
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      text: answer,
      createdAt: nowTime,
    };

    setChatMessages((prev) => [...prev, userMsg, assistantMsg]);
    if (!rawQuestion) setQuestionInput('');
  };

  const classificationItems = useMemo(() => {
    const list: Array<{ key: string; nome: string; grupo: string; tipo: 'receita' | 'despesa'; nature: CostNature; hasOverride: boolean }> = [];
    const seen = new Set<string>();

    accountsPlan
      .filter((a) => a.ativo && a.tipo !== 'transferencia')
      .forEach((acc) => {
        const tipoNorm = acc.tipo === 'receita' ? 'receita' : 'despesa';
        seen.add(acc.id);
        const normName = acc.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        seen.add(normName);
        list.push({
          key: acc.id,
          nome: acc.nome,
          grupo: acc.grupo,
          tipo: tipoNorm,
          nature: inferAccountCostNature(
            {
              contaId: acc.id,
              contaNome: acc.nome,
              grupo: acc.grupo,
              tipo: tipoNorm,
              descricao: acc.descricao,
            },
            costOverrides
          ),
          hasOverride: Boolean(costOverrides[acc.id]),
        });
      });

    analysisReport.accountBreakdown.forEach((b) => {
      if (!seen.has(b.key)) {
        seen.add(b.key);
        list.push({
          key: b.key,
          nome: b.nome,
          grupo: b.grupo,
          tipo: b.tipo,
          nature: b.nature,
          hasOverride: Boolean(costOverrides[b.key]),
        });
      }
    });

    return list.sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome));
  }, [accountsPlan, analysisReport.accountBreakdown, costOverrides]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho Financeiro com Filtro de Período */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-700 text-white rounded-xl shadow-xs">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-950 tracking-tight leading-tight">
                Dashboard Financeiro
              </h2>
              <p className="text-xs text-neutral-500 capitalize">
                {company.nomeFantasia || 'AutoLava'} · {periodLabel} · Contas a Pagar/Receber & Extrato Bancário
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center bg-neutral-100 p-1 rounded-xl gap-0.5">
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mês' },
              { id: 'mes_anterior', label: 'Mês Ant.' },
              { id: 'ano', label: 'Ano' },
              { id: 'todos', label: 'Tudo' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPeriod(item.id as FinPeriod)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  period === item.id
                    ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => onOpenFinanceiro('extrato')}
            className="px-3.5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Importar Extrato
          </button>
        </div>
      </div>

      {/* Sub-abas do Dashboard Financeiro */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-neutral-200 rounded-2xl p-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setDashboardTab('visao_geral')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
              dashboardTab === 'visao_geral'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Visão Geral & Caixa
          </button>
          <button
            onClick={() => setDashboardTab('assistente')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
              dashboardTab === 'assistente'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-neutral-700 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/70'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Assistente Financeiro Especialista
            {(criticalInsightsCount > 0 || attentionInsightsCount > 0) && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-md ${
                  dashboardTab === 'assistente'
                    ? 'bg-white/20 text-white'
                    : criticalInsightsCount > 0
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {criticalInsightsCount > 0
                  ? `${criticalInsightsCount} crítico${criticalInsightsCount > 1 ? 's' : ''}`
                  : `${attentionInsightsCount} alerta${attentionInsightsCount > 1 ? 's' : ''}`}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 text-[11px] text-neutral-500">
          <span>Índice de Saúde:</span>
          <span
            className={`font-mono font-extrabold px-2 py-0.5 rounded-md ${
              analysisReport.healthStatus === 'Saudável'
                ? 'bg-emerald-100 text-emerald-800'
                : analysisReport.healthStatus === 'Atenção'
                ? 'bg-amber-100 text-amber-800'
                : analysisReport.healthStatus === 'Crítico'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {analysisReport.healthScore}/100 · {analysisReport.healthStatus}
          </span>
        </div>
      </div>

      {dashboardTab === 'visao_geral' ? (
        <>
          {/* 4 Cards KPI Principais do Financeiro */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Receitas */}
        <div className="bg-white border border-neutral-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
              Receitas ({filteredEntries.length > 0 ? `${metrics.qtdReceitas}x` : '0x'})
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-emerald-700 truncate">
            {formatCurrency(metrics.totalReceitas)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-neutral-500 pt-1 border-t border-neutral-100 flex items-center justify-between gap-1">
            <span className="truncate">OS do pátio (ref.):</span>
            <strong className="font-mono text-neutral-700 shrink-0">{formatCurrency(operationalRefRevenue)}</strong>
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white border border-neutral-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
              Despesas ({metrics.qtdDespesas}x)
            </span>
            <span className="p-1.5 bg-rose-50 text-rose-700 rounded-lg shrink-0">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-rose-700 truncate">
            {formatCurrency(metrics.totalDespesas)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-neutral-500 pt-1 border-t border-neutral-100 flex items-center justify-between">
            <span>Comprometimento:</span>
            <strong className="font-mono text-neutral-800">
              {metrics.totalReceitas > 0
                ? `${Math.round((metrics.totalDespesas / metrics.totalReceitas) * 100)}%`
                : '0%'}
            </strong>
          </div>
        </div>

        {/* Resultado Líquido */}
        <div className="bg-white border border-neutral-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
              Resultado Líquido
            </span>
            <span
              className={`p-1.5 rounded-lg shrink-0 ${
                metrics.saldoLiquido >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {metrics.saldoLiquido >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </span>
          </div>
          <div
            className={`text-lg sm:text-2xl font-black font-mono tabular-nums truncate ${
              metrics.saldoLiquido >= 0 ? 'text-neutral-950' : 'text-rose-700'
            }`}
          >
            {formatCurrency(metrics.saldoLiquido)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-neutral-500 pt-1 border-t border-neutral-100 flex items-center justify-between">
            <span>Margem líquida:</span>
            <strong
              className={`font-mono ${
                metrics.margem >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {metrics.margem}%
            </strong>
          </div>
        </div>

        {/* Conciliação e Plano de Contas */}
        <div className="bg-white border border-neutral-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
              Conciliação & Contas
            </span>
            <span className="p-1.5 bg-neutral-100 text-neutral-700 rounded-lg shrink-0">
              <Landmark className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-neutral-950 truncate">
            {metrics.conciliados} <span className="text-xs font-normal text-neutral-400">conciliados</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-neutral-500 pt-1 border-t border-neutral-100 flex items-center justify-between gap-1">
            <span>
              {metrics.pendentes} pend.
              {metrics.qtdTransferencias > 0 ? ` · ${metrics.qtdTransferencias} transf.` : ''}
            </span>
            <span>{accountsPlan.filter((a) => a.ativo).length} contas</span>
          </div>
        </div>
      </div>

      {/* Estado Vazio Caso Ainda Não Tenha Movimentações */}
      {entries.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center mx-auto">
            <Landmark className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-sm font-bold text-neutral-950">
              Nenhuma movimentação financeira lançada ainda
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Importe seu extrato bancário (OFX, CSV, Excel ou texto), utilize o modelo editável ou cadastre receitas e despesas diretamente na aba Financeiro para acompanhar o fluxo de caixa aqui.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              onClick={() => onOpenFinanceiro('extrato')}
              className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Importar Extrato / Modelo Editável
            </button>
            <button
              onClick={() => onOpenFinanceiro('bancos')}
              className="px-4 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              Contas Bancárias ({bankAccounts.length})
            </button>
            <button
              onClick={() => onOpenFinanceiro('plano')}
              className="px-4 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Plano de Contas ({accountsPlan.length})
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Gráfico Comparativo: Receitas vs Despesas */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-neutral-700" />
                  Fluxo de Caixa: Receitas vs Despesas
                </h3>
                <p className="text-xs text-neutral-500">
                  Comparativo entre entradas e saídas registradas no plano de contas e extrato bancário.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 text-[11px] font-medium">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                    Receitas
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                    Despesas
                  </span>
                </div>

                <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
                  <button
                    onClick={() => {
                      setChartMode('mensal');
                      setHoveredBarIdx(null);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      chartMode === 'mensal'
                        ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    6 Meses
                  </button>
                  <button
                    onClick={() => {
                      setChartMode('diario');
                      setHoveredBarIdx(null);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      chartMode === 'diario'
                        ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    14 Dias
                  </button>
                </div>
              </div>
            </div>

            {/* Painel de detalhe ao passar/tocar na barra */}
            {hoveredBarIdx !== null && chartSeries[hoveredBarIdx] && (
              <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-neutral-900">
                  {chartSeries[hoveredBarIdx].label} · {chartSeries[hoveredBarIdx].subLabel}
                </span>
                <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
                  <span className="text-emerald-700 font-bold">
                    Receitas: {formatCurrency(chartSeries[hoveredBarIdx].receitas)}
                  </span>
                  <span className="text-rose-700 font-bold">
                    Despesas: {formatCurrency(chartSeries[hoveredBarIdx].despesas)}
                  </span>
                  <span
                    className={`font-black ${
                      chartSeries[hoveredBarIdx].receitas - chartSeries[hoveredBarIdx].despesas >= 0
                        ? 'text-neutral-950'
                        : 'text-rose-700'
                    }`}
                  >
                    Saldo: {formatCurrency(chartSeries[hoveredBarIdx].receitas - chartSeries[hoveredBarIdx].despesas)}
                  </span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto pb-2">
              <div
                className={`grid gap-2 sm:gap-3 pt-4 items-end min-h-[200px] ${
                  chartMode === 'mensal' ? 'grid-cols-6 min-w-[420px]' : 'grid-cols-14 min-w-[680px]'
                }`}
              >
                {chartSeries.map((item, idx) => {
                  const recPct = item.receitas > 0 ? Math.max(6, Math.round((item.receitas / maxChartVal) * 100)) : 2;
                  const despPct = item.despesas > 0 ? Math.max(6, Math.round((item.despesas / maxChartVal) * 100)) : 2;
                  return (
                    <div
                      key={item.key}
                      onMouseEnter={() => setHoveredBarIdx(idx)}
                      onClick={() => setHoveredBarIdx(idx)}
                      className="flex flex-col items-center gap-2 cursor-pointer group"
                    >
                      <div className="w-full h-36 bg-neutral-50 border border-neutral-100 rounded-xl p-1.5 flex items-end justify-center gap-1">
                        <div
                          className="w-1/2 bg-emerald-600 group-hover:bg-emerald-500 rounded-t-md transition-all duration-300"
                          style={{ height: `${recPct}%` }}
                          title={`Receitas: ${formatCurrency(item.receitas)}`}
                        />
                        <div
                          className="w-1/2 bg-rose-500 group-hover:bg-rose-400 rounded-t-md transition-all duration-300"
                          style={{ height: `${despPct}%` }}
                          title={`Despesas: ${formatCurrency(item.despesas)}`}
                        />
                      </div>
                      <div className="text-center leading-tight">
                        <span className="text-[11px] font-bold text-neutral-800 block">{item.label}</span>
                        <span className="text-[10px] text-neutral-400 font-mono block">{item.subLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2 Colunas: Plano de Contas (Receitas & Despesas) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Receitas por Conta */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Receitas por Plano de Contas
                </h3>
                <button
                  onClick={() => onOpenFinanceiro('plano')}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
                >
                  Editar Contas <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {metrics.topReceitas.map((acc) => {
                  const pct = metrics.totalReceitas > 0 ? Math.round((acc.total / metrics.totalReceitas) * 100) : 0;
                  return (
                    <div key={acc.nome} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-neutral-900 truncate">{acc.nome}</span>
                        <span className="font-mono font-bold text-emerald-700 shrink-0">
                          {formatCurrency(acc.total)}{' '}
                          <span className="text-[10px] text-neutral-400 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
                {metrics.topReceitas.length === 0 && (
                  <p className="py-6 text-center text-xs text-neutral-400">
                    Nenhuma receita registrada neste período.
                  </p>
                )}
              </div>
            </div>

            {/* Despesas por Conta */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  Despesas por Plano de Contas
                </h3>
                <button
                  onClick={() => onOpenFinanceiro('plano')}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
                >
                  Editar Contas <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {metrics.topDespesas.map((acc) => {
                  const pct = metrics.totalDespesas > 0 ? Math.round((acc.total / metrics.totalDespesas) * 100) : 0;
                  return (
                    <div key={acc.nome} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-neutral-900 truncate">{acc.nome}</span>
                        <span className="font-mono font-bold text-rose-700 shrink-0">
                          {formatCurrency(acc.total)}{' '}
                          <span className="text-[10px] text-neutral-400 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
                {metrics.topDespesas.length === 0 && (
                  <p className="py-6 text-center text-xs text-neutral-400">
                    Nenhuma despesa registrada neste período.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Saldos por Banco / Conta & Últimas Movimentações */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Resumo por Banco / Conta Bancária */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-neutral-700" />
                  Contas Bancárias & Caixas
                </h3>
                <button
                  onClick={() => onOpenFinanceiro('bancos')}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  Gerenciar <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2.5">
                {bankSummaries.items.map((b) => (
                  <div
                    key={b.id}
                    className={`p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1 text-xs ${
                      !b.ativo ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-neutral-900 block truncate">{b.nome}</span>
                        <span className="text-[10px] text-neutral-400 block truncate">{b.subtitulo}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] uppercase text-neutral-400 block">Saldo Atual</span>
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            b.saldoAtual >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {formatCurrency(b.saldoAtual)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-neutral-500 pt-1 border-t border-neutral-200/70">
                      <span className="text-emerald-700">+{formatCurrency(b.periodEntradas)}</span>
                      <span className="text-rose-700">-{formatCurrency(b.periodSaidas)}</span>
                    </div>
                  </div>
                ))}

                {bankSummaries.unregistered.map((b) => {
                  const net = b.receitas - b.despesas;
                  return (
                    <div
                      key={b.banco}
                      className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900">{b.banco}</span>
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            net >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {formatCurrency(net)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-neutral-500">
                        <span>+{formatCurrency(b.receitas)}</span>
                        <span>-{formatCurrency(b.despesas)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Últimas Movimentações Financeiras */}
            <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-neutral-700" />
                  Últimas Movimentações do Período
                </h3>
                <button
                  onClick={() => onOpenFinanceiro('movimentacoes')}
                  className="text-xs font-semibold text-neutral-900 hover:underline flex items-center gap-1"
                >
                  Editar / Ver Tudo ({filteredEntries.length}) <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Celular */}
              <div className="block sm:hidden space-y-2">
                {recentEntries.map((e) => (
                  <div
                    key={e.id}
                    className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-neutral-900 truncate">{e.descricao}</span>
                      <span
                        className={`font-mono font-bold shrink-0 ${
                          e.tipo === 'receita'
                            ? 'text-emerald-700'
                            : e.tipo === 'transferencia'
                            ? 'text-blue-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {e.tipo === 'receita' ? '+' : e.tipo === 'transferencia' ? '⇄ ' : '-'}
                        {formatCurrency(e.valor)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span className="truncate">
                        {e.contaNome} · {e.tipo === 'transferencia' ? `${e.banco} → ${e.bancoDestino || '?'}` : e.banco}
                      </span>
                      <span className="font-mono shrink-0">{e.data.split('-').reverse().join('/')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block border border-neutral-200 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Data</th>
                      <th className="py-2 px-3 font-semibold">Descrição</th>
                      <th className="py-2 px-3 font-semibold">Conta</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                      <th className="py-2 px-3 font-semibold text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {recentEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-neutral-50">
                        <td className="py-2 px-3 font-mono text-neutral-600 whitespace-nowrap">
                          {e.data.split('-').reverse().join('/')}
                        </td>
                        <td className="py-2 px-3 font-medium text-neutral-900 max-w-[200px] truncate">
                          {e.descricao}
                        </td>
                        <td className="py-2 px-3 text-neutral-600 max-w-[180px] truncate">
                          {e.tipo === 'transferencia'
                            ? `${e.banco} → ${e.bancoDestino || '?'}`
                            : e.contaNome}
                        </td>
                        <td className="py-2 px-3">
                          {e.status === 'Conciliado' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Conciliado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                              <Clock className="w-3 h-3" /> Pendente
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            e.tipo === 'receita'
                              ? 'text-emerald-700'
                              : e.tipo === 'transferencia'
                              ? 'text-blue-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {e.tipo === 'receita' ? '+' : e.tipo === 'transferencia' ? '⇄ ' : '-'}
                          {formatCurrency(e.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
        </>
      ) : (
        /* ABA DO ASSISTENTE FINANCEIRO ESPECIALISTA E RELATÓRIOS */
        <div className="space-y-6">
          {/* 1. Parecer Executivo + Exportação PDF / Excel */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-800 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-3 rounded-2xl shrink-0 ${
                    analysisReport.healthStatus === 'Saudável'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : analysisReport.healthStatus === 'Atenção'
                      ? 'bg-amber-500/20 text-amber-300'
                      : analysisReport.healthStatus === 'Crítico'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {analysisReport.healthStatus === 'Saudável' ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : (
                    <ShieldAlert className="w-6 h-6" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Consultoria Financeira & Relatórios Gerenciais
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                        analysisReport.healthStatus === 'Saudável'
                          ? 'bg-emerald-500/25 text-emerald-200'
                          : analysisReport.healthStatus === 'Atenção'
                          ? 'bg-amber-500/25 text-amber-200'
                          : analysisReport.healthStatus === 'Crítico'
                          ? 'bg-rose-500/25 text-rose-200'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Saúde: {analysisReport.healthStatus} ({analysisReport.healthScore}/100)
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                    Diagnóstico Financeiro · {periodLabel}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
                    {analysisReport.resumoExecutivo}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => exportFinancialAnalysisToPDF(analysisReport, company, periodLabel)}
                  className="px-3.5 py-2 bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  Exportar PDF
                </button>
                <button
                  onClick={() => exportFinancialAnalysisToExcel(analysisReport, company, periodLabel)}
                  className="px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Exportar Excel
                </button>
              </div>
            </div>

            {/* Barra de Saúde Financeira */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Termômetro de Saúde Financeira (Margem, EBITDA, Ponto de Equilíbrio e Caixa)</span>
                <span className="font-mono font-bold text-white">{analysisReport.healthScore} / 100 pts</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    analysisReport.healthScore >= 75
                      ? 'bg-emerald-500'
                      : analysisReport.healthScore >= 45
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(4, analysisReport.healthScore)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Caixa de Perguntas Interativa do Assistente Financeiro Especialista */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider">
                    Pergunte ao Assistente Financeiro Especialista
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Tire dúvidas sobre EBITDA, Margem de Contribuição, Ponto de Equilíbrio, cortes de custos ou simulações com base nos seus dados reais de <span className="font-semibold text-neutral-700 capitalize">{periodLabel}</span>.
                  </p>
                </div>
              </div>

              {chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setChatMessages([])}
                  className="px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 hover:text-rose-700 bg-neutral-100 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar conversa
                </button>
              )}
            </div>

            {/* Sugestões rápidas */}
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleAskQuestion(suggestion)}
                  className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Histórico de Perguntas e Respostas */}
            {chatMessages.length > 0 && (
              <div className="space-y-3 max-h-[380px] overflow-y-auto p-3 sm:p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[92%] sm:max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-neutral-900 text-white rounded-br-xs'
                          : 'bg-white border border-neutral-200 text-neutral-800 shadow-2xs rounded-bl-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider ${
                            msg.role === 'user' ? 'text-emerald-300' : 'text-emerald-700'
                          }`}
                        >
                          {msg.role === 'user' ? 'Você' : 'Especialista Financeiro'}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {msg.createdAt}
                        </span>
                      </div>
                      <div>{msg.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário de Pergunta */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                maxLength={2000}
                placeholder="Ex.: Quanto preciso faturar para lucrar R$ 5.000? Ou onde cortar custos?"
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-300 focus:border-emerald-600 focus:bg-white rounded-xl outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!questionInput.trim()}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-neutral-300 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                Perguntar
              </button>
            </form>
          </div>

          {/* 2. Os 9 Indicadores Financeiros Solicitados */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  Indicadores Estratégicos de Performance
                </h3>
                <p className="text-xs text-neutral-500">
                  Transferências entre bancos são isoladas automaticamente para não distorcer receita, margem ou EBITDA.
                </p>
              </div>
              <button
                onClick={() => setShowClassificationEditor((v) => !v)}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                Ajustar Fixo / Variável ({classificationItems.length})
                {showClassificationEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* 1. Receita Líquida */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    1. Receita Líquida
                  </span>
                  <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-700">
                  {formatCurrency(analysisReport.receitaLiquida)}
                </div>
                <div className="text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <span>Bruta: {formatCurrency(analysisReport.receitaBruta)}</span>
                  <span className="text-rose-600 font-mono">
                    -{formatCurrency(analysisReport.deducoesReceita)} ded.
                  </span>
                </div>
              </div>

              {/* 2. Margem de Contribuição */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    2. Margem de Contribuição
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                      analysisReport.margemContribuicaoPct >= 50
                        ? 'bg-emerald-100 text-emerald-800'
                        : analysisReport.margemContribuicaoPct > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {analysisReport.margemContribuicaoPct.toFixed(1)}%
                  </span>
                </div>
                <div
                  className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${
                    analysisReport.margemContribuicaoValor >= 0 ? 'text-neutral-950' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(analysisReport.margemContribuicaoValor)}
                </div>
                <div className="text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100">
                  Receita Líquida − Custos Variáveis ({formatCurrency(analysisReport.custosVariaveis)})
                </div>
              </div>

              {/* 3. Ponto de Equilíbrio */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    3. Ponto de Equilíbrio
                  </span>
                  <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                    <Target className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-neutral-950">
                  {analysisReport.pontoEquilibrioViavel
                    ? formatCurrency(analysisReport.pontoEquilibrioValor)
                    : 'Inviável (MC ≤ 0)'}
                </div>
                <div className="text-[11px] pt-1.5 border-t border-neutral-100 flex items-center justify-between gap-2">
                  {!analysisReport.pontoEquilibrioViavel ? (
                    <span className="text-rose-600 font-semibold">Margem de Contribuição não cobre variáveis</span>
                  ) : analysisReport.faltaParaEquilibrio > 0 ? (
                    <>
                      <span className="text-rose-600 font-semibold">Falta faturar:</span>
                      <strong className="font-mono text-rose-700">
                        {formatCurrency(analysisReport.faltaParaEquilibrio)}
                      </strong>
                    </>
                  ) : (
                    <>
                      <span className="text-emerald-700 font-semibold">Superado (folga):</span>
                      <strong className="font-mono text-emerald-700">
                        +{formatCurrency(analysisReport.margemSegurancaValor)} ({analysisReport.margemSegurancaPct.toFixed(1)}%)
                      </strong>
                    </>
                  )}
                </div>
              </div>

              {/* 4. EBITDA */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    4. EBITDA (LAJIDA)
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                      analysisReport.ebitdaValor > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : analysisReport.ebitdaValor === 0
                        ? 'bg-neutral-100 text-neutral-600'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Margem {analysisReport.ebitdaPct.toFixed(1)}%
                  </span>
                </div>
                <div
                  className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${
                    analysisReport.ebitdaValor >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(analysisReport.ebitdaValor)}
                </div>
                <div className="text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100">
                  Caixa operacional antes de juros, depreciação e CAPEX
                </div>
              </div>

              {/* 5. Resultado Operacional (EBIT) */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    5. Resultado Operacional
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                      analysisReport.resultadoOperacionalValor >= 0
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {analysisReport.resultadoOperacionalPct.toFixed(1)}%
                  </span>
                </div>
                <div
                  className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${
                    analysisReport.resultadoOperacionalValor >= 0 ? 'text-neutral-950' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(analysisReport.resultadoOperacionalValor)}
                </div>
                <div className="text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100 flex items-center justify-between">
                  <span>EBIT (EBITDA − Depreciação)</span>
                  <span className="font-mono">-{formatCurrency(analysisReport.depreciacaoAmortizacao)}</span>
                </div>
              </div>

              {/* 6. Índice de Custos Fixos */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    6. Índice de Custos Fixos
                  </span>
                  <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                    <Scale className="w-4 h-4" />
                  </span>
                </div>
                <div
                  className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${
                    analysisReport.indiceCustosFixos <= 40 ? 'text-neutral-950' : 'text-amber-700'
                  }`}
                >
                  {analysisReport.indiceCustosFixos.toFixed(1)}%
                </div>
                <div className="text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100 flex items-center justify-between">
                  <span>Total Fixos:</span>
                  <strong className="font-mono text-neutral-800">{formatCurrency(analysisReport.custosFixos)}</strong>
                </div>
              </div>

              {/* 7. Índice de Custos Variáveis */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    7. Índice de Custos Variáveis
                  </span>
                  <span className="p-1.5 bg-neutral-100 text-neutral-700 rounded-lg">
                    <Percent className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-neutral-950">
                  {analysisReport.indiceCustosVariaveis.toFixed(1)}%
                </div>
                <div className="text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100 flex items-center justify-between">
                  <span>Total Variáveis:</span>
                  <strong className="font-mono text-neutral-800">{formatCurrency(analysisReport.custosVariaveis)}</strong>
                </div>
              </div>

              {/* 8. % das Despesas sobre Receita */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    8. % Despesas sobre Receita
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                      analysisReport.pctDespesasSobreReceita <= 80
                        ? 'bg-emerald-100 text-emerald-800'
                        : analysisReport.pctDespesasSobreReceita <= 100
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {analysisReport.pctDespesasSobreReceita <= 80
                      ? 'Controlado'
                      : analysisReport.pctDespesasSobreReceita <= 100
                      ? 'Alerta'
                      : 'Déficit'}
                  </span>
                </div>
                <div
                  className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${
                    analysisReport.pctDespesasSobreReceita > 100 ? 'text-rose-700' : 'text-neutral-950'
                  }`}
                >
                  {analysisReport.pctDespesasSobreReceita.toFixed(1)}%
                </div>
                <div className="text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100 flex items-center justify-between">
                  <span>Saídas Totais:</span>
                  <strong className="font-mono text-rose-700">
                    {formatCurrency(analysisReport.totalDespesasGeral)}
                  </strong>
                </div>
              </div>

              {/* 9. Fluxo de Caixa Projetado */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    9. Fluxo de Caixa Projetado (30d)
                  </span>
                  <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                    <Wallet className="w-4 h-4" />
                  </span>
                </div>
                <div
                  className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${
                    analysisReport.fluxoCaixa.projecao30Dias >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(analysisReport.fluxoCaixa.projecao30Dias)}
                </div>
                <div className="text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <span>Saldo atual bancos:</span>
                  <strong className="font-mono text-neutral-800">
                    {formatCurrency(analysisReport.fluxoCaixa.saldoAtualBancos)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Editor Interativo de Classificação Gerencial (Opcional/Expansível) */}
          {showClassificationEditor && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-700" />
                    Classificação Gerencial das Contas (Fixo / Variável / Dedução / Financeira)
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Personalize como cada conta do Plano de Contas entra no cálculo de Margem de Contribuição, Ponto de Equilíbrio e EBITDA.
                  </p>
                </div>
                <button
                  onClick={handleResetCostOverrides}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar Padrão Automático
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {classificationItems.map((item) => {
                  const options = item.tipo === 'receita' ? REVENUE_COST_NATURES : EXPENSE_COST_NATURES;
                  return (
                    <div
                      key={item.key}
                      className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.tipo === 'receita' ? 'bg-emerald-600' : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-bold text-neutral-900 truncate">{item.nome}</span>
                          {item.hasOverride && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                              Editado
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-500 block truncate pl-3.5">{item.grupo}</span>
                      </div>

                      <select
                        value={item.nature}
                        onChange={(e) => handleCostNatureChange(item.key, e.target.value as CostNature)}
                        className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-[11px] font-semibold text-neutral-800 max-w-[190px]"
                      >
                        {options.map((nat) => (
                          <option key={nat} value={nat}>
                            {COST_NATURE_LABELS[nat]}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Pontos a Serem Observados & Dicas de Melhoria / Correção */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Pontos a Serem Observados & Dicas para Melhoria
                </h3>
                <p className="text-xs text-neutral-500">
                  Diagnóstico automático com foco em pontos críticos, redução de desperdícios e aumento de lucratividade.
                </p>
              </div>

              <div className="flex flex-wrap items-center bg-neutral-100 p-1 rounded-xl gap-0.5 text-[11px]">
                {[
                  { id: 'todos', label: `Todos (${analysisReport.insights.length})` },
                  { id: 'critico', label: `Críticos (${criticalInsightsCount})` },
                  { id: 'atencao', label: `Atenção (${attentionInsightsCount})` },
                  {
                    id: 'positivo',
                    label: `Positivos (${
                      analysisReport.insights.filter((i) => i.nivel === 'positivo' || i.nivel === 'oportunidade')
                        .length
                    })`,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setInsightFilter(f.id as typeof insightFilter)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      insightFilter === f.id
                        ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredInsights.map((ins) => {
                const style =
                  ins.nivel === 'critico'
                    ? {
                        border: 'border-rose-200 bg-rose-50/40',
                        badge: 'bg-rose-600 text-white',
                        label: 'PONTO CRÍTICO',
                        icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
                        tipBg: 'bg-white border-rose-200/80',
                        tipTitle: 'text-rose-800',
                      }
                    : ins.nivel === 'atencao'
                    ? {
                        border: 'border-amber-200 bg-amber-50/40',
                        badge: 'bg-amber-500 text-white',
                        label: 'PONTO DE ATENÇÃO',
                        icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
                        tipBg: 'bg-white border-amber-200/80',
                        tipTitle: 'text-amber-800',
                      }
                    : ins.nivel === 'positivo'
                    ? {
                        border: 'border-emerald-200 bg-emerald-50/35',
                        badge: 'bg-emerald-600 text-white',
                        label: 'SAUDÁVEL',
                        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
                        tipBg: 'bg-white border-emerald-200/80',
                        tipTitle: 'text-emerald-800',
                      }
                    : {
                        border: 'border-blue-200 bg-blue-50/35',
                        badge: 'bg-blue-600 text-white',
                        label: 'OPORTUNIDADE',
                        icon: <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />,
                        tipBg: 'bg-white border-blue-200/80',
                        tipTitle: 'text-blue-800',
                      };

                return (
                  <div key={ins.id} className={`border rounded-2xl p-4 space-y-3 ${style.border}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {style.icon}
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                            {ins.categoria}
                          </span>
                          <h4 className="text-sm font-extrabold text-neutral-950 leading-snug">{ins.titulo}</h4>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md shrink-0 ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-700 leading-relaxed">
                      <strong className="text-neutral-900">O que observar:</strong> {ins.observacao}
                    </p>

                    <div className={`p-3 rounded-xl border text-xs leading-relaxed ${style.tipBg}`}>
                      <span className={`font-extrabold uppercase text-[10px] tracking-wider block mb-0.5 ${style.tipTitle}`}>
                        Dica do Especialista para Melhorar / Corrigir
                      </span>
                      <p className="text-neutral-800 font-medium">{ins.acaoRecomendada}</p>
                    </div>
                  </div>
                );
              })}
              {filteredInsights.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-neutral-400">
                  Nenhum apontamento encontrado para este filtro.
                </div>
              )}
            </div>
          </div>

          {/* 5. Detalhamento do Fluxo de Caixa Projetado (30 dias) */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-700" />
                  Composição do Fluxo de Caixa Projetado (30 Dias)
                </h3>
                <p className="text-xs text-neutral-500">
                  Combina saldo real atual das contas bancárias, títulos pendentes a receber/pagar e ritmo médio dos últimos 30 dias.
                </p>
              </div>
              {analysisReport.fluxoCaixa.diasDeCaixa !== null && (
                <span className="px-3 py-1 bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold self-start sm:self-auto">
                  Autonomia atual de caixa: {analysisReport.fluxoCaixa.diasDeCaixa} dia(s)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">1. Saldo Real em Bancos</span>
                <span
                  className={`text-lg font-black font-mono tabular-nums block ${
                    analysisReport.fluxoCaixa.saldoAtualBancos >= 0 ? 'text-neutral-950' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(analysisReport.fluxoCaixa.saldoAtualBancos)}
                </span>
                <span className="text-[11px] text-neutral-500 block">
                  {bankAccounts.filter((b) => b.ativo).length} conta(s) ativa(s) conciliada(s)
                </span>
              </div>

              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                  2. Saldo Pós-Pendências
                </span>
                <span
                  className={`text-lg font-black font-mono tabular-nums block ${
                    analysisReport.fluxoCaixa.saldoAposPendencias >= 0 ? 'text-neutral-950' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(analysisReport.fluxoCaixa.saldoAposPendencias)}
                </span>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-emerald-700">+{formatCurrency(analysisReport.fluxoCaixa.receitasPendentesTotal)}</span>
                  <span className="text-rose-700">-{formatCurrency(analysisReport.fluxoCaixa.despesasPendentesTotal)}</span>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                  3. Ritmo Médio Diário (30d)
                </span>
                <span
                  className={`text-lg font-black font-mono tabular-nums block ${
                    analysisReport.fluxoCaixa.mediaDiariaLiquida30d >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {analysisReport.fluxoCaixa.mediaDiariaLiquida30d >= 0 ? '+' : ''}
                  {formatCurrency(analysisReport.fluxoCaixa.mediaDiariaLiquida30d)}/dia
                </span>
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                  <span>Ent: {formatCurrency(analysisReport.fluxoCaixa.mediaDiariaReceita30d)}</span>
                  <span>Sai: {formatCurrency(analysisReport.fluxoCaixa.mediaDiariaDespesa30d)}</span>
                </div>
              </div>

              <div
                className={`p-3.5 border rounded-xl space-y-1 ${
                  analysisReport.fluxoCaixa.projecao30Dias >= 0
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-neutral-600 block">
                  4. Projeção Final em 30 Dias
                </span>
                <span
                  className={`text-lg font-black font-mono tabular-nums block ${
                    analysisReport.fluxoCaixa.projecao30Dias >= 0 ? 'text-emerald-800' : 'text-rose-800'
                  }`}
                >
                  {formatCurrency(analysisReport.fluxoCaixa.projecao30Dias)}
                </span>
                <span className="text-[11px] text-neutral-600 block">
                  Estimativa mantendo ritmo atual + pendências
                </span>
              </div>
            </div>
          </div>

          {/* 6. DRE Gerencial + Composição por Plano de Contas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* DRE Gerencial */}
            <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-700" />
                    DRE Gerencial do Período
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Demonstração do Resultado da Receita Bruta até o Resultado Líquido e EBITDA.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-neutral-500 capitalize">{periodLabel}</span>
              </div>

              <div className="border border-neutral-200 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Linha da DRE</th>
                      <th className="py-2.5 px-3 font-bold text-right">Valor (R$)</th>
                      <th className="py-2.5 px-3 font-bold text-right">% AV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {analysisReport.dreLines.map((line, idx) => {
                      const isStrong = line.type === 'subtotal' || line.type === 'resultado';
                      return (
                        <tr
                          key={idx}
                          className={
                            line.type === 'resultado'
                              ? 'bg-slate-900 text-white font-extrabold'
                              : isStrong
                              ? 'bg-neutral-50 font-bold text-neutral-950'
                              : 'hover:bg-neutral-50/70 text-neutral-700'
                          }
                        >
                          <td className="py-2.5 px-3">
                            <div>{line.label}</div>
                            {line.hint && (
                              <span
                                className={`text-[10px] font-normal block ${
                                  line.type === 'resultado' ? 'text-slate-300' : 'text-neutral-400'
                                }`}
                              >
                                {line.hint}
                              </span>
                            )}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                              line.type === 'resultado'
                                ? line.valor >= 0
                                  ? 'text-emerald-300'
                                  : 'text-rose-300'
                                : line.valor < 0
                                ? 'text-rose-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {formatCurrency(line.valor)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                              line.type === 'resultado' ? 'text-slate-200' : 'text-neutral-500'
                            }`}
                          >
                            {line.pctReceita !== null ? `${line.pctReceita.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ranking por Conta & Natureza */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-neutral-700" />
                  Peso por Plano de Contas
                </h3>
                <button
                  onClick={() => onOpenFinanceiro('plano')}
                  className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
                >
                  Plano <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {analysisReport.accountBreakdown.map((item) => (
                  <div
                    key={item.key}
                    className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-neutral-900 truncate">{item.nome}</span>
                      <span
                        className={`font-mono font-bold shrink-0 ${
                          item.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {item.tipo === 'receita' ? '+' : '-'}
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 gap-2">
                      <span className="px-1.5 py-0.5 bg-white border border-neutral-200 rounded font-semibold text-neutral-700 truncate">
                        {COST_NATURE_LABELS[item.nature]}
                      </span>
                      <span className="font-mono shrink-0">
                        {item.count}x · {item.pctSobreReceita.toFixed(1)}% rec.
                      </span>
                    </div>
                  </div>
                ))}
                {analysisReport.accountBreakdown.length === 0 && (
                  <p className="py-10 text-center text-xs text-neutral-400">
                    Nenhuma conta movimentada neste período.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
