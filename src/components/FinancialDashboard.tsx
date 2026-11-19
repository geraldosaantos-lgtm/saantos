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
} from 'lucide-react';

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
  const [chartMode, setChartMode] = useState<'mensal' | 'diario'>('mensal');
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);

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

  // KPIs Financeiros
  const metrics = useMemo(() => {
    let totalReceitas = 0;
    let qtdReceitas = 0;
    let totalDespesas = 0;
    let qtdDespesas = 0;
    let conciliados = 0;
    let pendentes = 0;

    const receitasByConta = new Map<string, { nome: string; grupo: string; total: number; count: number }>();
    const despesasByConta = new Map<string, { nome: string; grupo: string; total: number; count: number }>();
    const bankStats = new Map<string, { banco: string; receitas: number; despesas: number }>();

    filteredEntries.forEach((e) => {
      const val = Math.abs(Number(e.valor) || 0);
      const contaLabel = e.contaNome || (e.tipo === 'receita' ? 'OUTRAS RECEITAS' : 'OUTRAS DESPESAS');
      const grupoLabel = e.grupo || 'GERAL';
      const bancoLabel = e.banco || 'CAIXA';

      if (e.status === 'Pendente') pendentes += 1;
      else conciliados += 1;

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
      saldoLiquido,
      margem,
      conciliados,
      pendentes,
      topReceitas: Array.from(receitasByConta.values()).sort((a, b) => b.total - a.total),
      topDespesas: Array.from(despesasByConta.values()).sort((a, b) => b.total - a.total),
      banks: Array.from(bankStats.values()).sort((a, b) => b.receitas - a.receitas),
    };
  }, [filteredEntries]);

  // Saldos reais consolidados por Conta Bancária cadastrada + movimentação do período
  const bankSummaries = useMemo(() => {
    const items = bankAccounts.map((bank) => {
      let allEntradas = 0;
      let allSaidas = 0;
      let periodEntradas = 0;
      let periodSaidas = 0;

      const matchEntry = (e: FinancialEntry) =>
        e.bancoId === bank.id ||
        (!e.bancoId && (e.banco || '').trim().toUpperCase() === bank.nome.trim().toUpperCase());

      entries.forEach((e) => {
        if (!matchEntry(e)) return;
        if (bank.dataSaldoInicial && e.data && e.data < bank.dataSaldoInicial) return;
        if (e.status === 'Pendente') return;
        const val = Math.abs(Number(e.valor) || 0);
        if (e.tipo === 'receita') allEntradas += val;
        else allSaidas += val;
      });

      filteredEntries.forEach((e) => {
        if (!matchEntry(e)) return;
        const val = Math.abs(Number(e.valor) || 0);
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

  // Série do Gráfico de Fluxo de Caixa (Mensal: últimos 6 meses ou Diário: últimos 14 dias)
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
          <div className="text-[10px] sm:text-[11px] text-neutral-500 pt-1 border-t border-neutral-100 flex items-center justify-between">
            <span>{metrics.pendentes} pendentes</span>
            <span>{accountsPlan.filter((a) => a.ativo).length} contas ativas</span>
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
                          e.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {e.tipo === 'receita' ? '+' : '-'}
                        {formatCurrency(e.valor)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span className="truncate">{e.contaNome} · {e.banco}</span>
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
                        <td className="py-2 px-3 text-neutral-600 max-w-[160px] truncate">
                          {e.contaNome}
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
                            e.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {e.tipo === 'receita' ? '+' : '-'}
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
    </div>
  );
};
