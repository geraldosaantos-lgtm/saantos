import React, { useState } from 'react';
import { ServiceLaunch, GoalsConfig } from '../types';
import { formatCurrency } from '../utils/storage';
import {
  computeGoalsAnalytics,
  MetricType,
  ChartViewMode,
  DailyGoalItem,
  WeeklyGoalItem,
  MonthlyGoalItem,
} from '../utils/goalsAnalytics';
import {
  BarChart3,
  Calendar,
  TrendingUp,
  DollarSign,
  Car,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

interface GoalsAnalyticsChartProps {
  launches: ServiceLaunch[];
  goals: GoalsConfig;
  defaultViewMode?: ChartViewMode;
  title?: string;
  subtitle?: string;
}

export const GoalsAnalyticsChart: React.FC<GoalsAnalyticsChartProps> = ({
  launches,
  goals,
  defaultViewMode = 'dias',
  title = 'Acompanhamento Gráfico de Metas & Médias',
  subtitle = 'Análise de dias e semanas que atingiram metas, médias diárias e semanais consolidadas.',
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>(defaultViewMode);
  const [metric, setMetric] = useState<MetricType>('valor');
  const [daysRange, setDaysRange] = useState<number>(14);
  const [weeksRange, setWeeksRange] = useState<number>(6);
  const [monthsRange, setMonthsRange] = useState<number>(6);
  const [hoveredItem, setHoveredItem] = useState<{
    title: string;
    actual: string;
    target: string;
    pct: number;
    isAchieved: boolean;
    diff: string;
    extra?: string;
  } | null>(null);

  // Computa métricas em tempo real
  const analytics = computeGoalsAnalytics(launches, goals, {
    daysRange,
    weeksRange,
    monthsRange,
  });

  const { dailyItems, weeklyItems, monthlyItems, summary } = analytics;

  // Valor da meta de acordo com a métrica selecionada
  const targetDaily = metric === 'valor' ? goals.metaDiaria : goals.metaDiariaQtd;
  const targetWeekly = metric === 'valor' ? goals.metaSemanal : goals.metaSemanalQtd;
  const targetMonthly = metric === 'valor' ? goals.metaMensal : goals.metaMensalQtd;

  const formatMetricVal = (val: number) => {
    return metric === 'valor' ? formatCurrency(val) : `${Math.round(val)} veículos`;
  };

  const formatShortMetricVal = (val: number) => {
    if (metric === 'valor') {
      if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`;
      return `R$ ${Math.round(val)}`;
    }
    return `${Math.round(val)}v`;
  };

  // Cálculo da altura máxima das barras para normalização gráfica
  const maxDailyVal = Math.max(
    ...dailyItems.map((d) => (metric === 'valor' ? d.actualValue : d.actualCount)),
    targetDaily,
    10
  );

  const maxWeeklyVal = Math.max(
    ...weeklyItems.map((w) => (metric === 'valor' ? w.actualValue : w.actualCount)),
    targetWeekly,
    10
  );

  const maxMonthlyVal = Math.max(
    ...monthlyItems.map((m) => (metric === 'valor' ? m.actualValue : m.actualCount)),
    targetMonthly,
    10
  );

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
      {/* 1. CABEÇALHO DO GRÁFICO & CONTROLES INTERATIVOS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 sm:p-2 bg-neutral-900 text-white rounded-xl shadow-xs">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-neutral-950 tracking-tight leading-tight">
                {title}
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-500">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros: Modo de Visão e Métrica */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Tipo de Métrica (R$ vs Qtd Veículos) */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMetric('valor')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                metric === 'valor'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Faturamento</span>
            </button>
            <button
              type="button"
              onClick={() => setMetric('quantidade')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                metric === 'quantidade'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Car className="w-3.5 h-3.5 text-blue-600" />
              <span>Veículos</span>
            </button>
          </div>

          {/* Seletor de Visão do Gráfico */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('dias')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'dias'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Dias
            </button>
            <button
              type="button"
              onClick={() => setViewMode('semanas')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'semanas'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Semanas
            </button>
            <button
              type="button"
              onClick={() => setViewMode('meses')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'meses'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Média/Mês
            </button>
            <button
              type="button"
              onClick={() => setViewMode('medias')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'medias'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Médias
            </button>
          </div>
        </div>
      </div>

      {/* 2. CARDS RESUMO DE MÉDIAS E METAS ATINGIDAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Card 1: Dias com Meta Atingida */}
        <div className="p-3 sm:p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              Dias com Meta Batida
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-2xl font-black font-mono text-neutral-950">
              {summary.diasAtingidosCount}
            </span>
            <span className="text-xs text-neutral-500 font-medium">
              de {summary.totalDiasAvaliados} dias ({summary.taxaAtingimentoDias}%)
            </span>
          </div>
          <p className="text-[10px] text-neutral-500 truncate">
            Meta diária: {formatMetricVal(targetDaily)}
          </p>
        </div>

        {/* Card 2: Semanas com Meta Atingida */}
        <div className="p-3 sm:p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              Semanas com Meta Batida
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-2xl font-black font-mono text-neutral-950">
              {summary.semanasAtingidasCount}
            </span>
            <span className="text-xs text-neutral-500 font-medium">
              de {summary.totalSemanasAvaliadas} semanas ({summary.taxaAtingimentoSemanas}%)
            </span>
          </div>
          <p className="text-[10px] text-neutral-500 truncate">
            Meta semanal: {formatMetricVal(targetWeekly)}
          </p>
        </div>

        {/* Card 3: Média Diária por Mês */}
        <div className="p-3 sm:p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              Média Diária no Mês
            </span>
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-blue-950 truncate">
            {metric === 'valor'
              ? formatCurrency(summary.mediaDiariaMesAtual)
              : `${summary.mediaDiariaMesAtualQtd.toFixed(1)} vcs/dia`}
          </div>
          <div className="flex items-center justify-between text-[10px] text-blue-700">
            <span>Mês Atual</span>
            <span className="font-semibold font-mono">
              {targetDaily > 0
                ? `${Math.round(((metric === 'valor' ? summary.mediaDiariaMesAtual : summary.mediaDiariaMesAtualQtd) / targetDaily) * 100)}% da meta`
                : '100%'}
            </span>
          </div>
        </div>

        {/* Card 4: Média por Semana */}
        <div className="p-3 sm:p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              Média por Semana
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-emerald-950 truncate">
            {metric === 'valor'
              ? formatCurrency(summary.mediaSemanalMesAtual)
              : `${summary.mediaSemanalMesAtualQtd.toFixed(1)} vcs/sem`}
          </div>
          <div className="flex items-center justify-between text-[10px] text-emerald-700">
            <span>Ritmo Semanal</span>
            <span className="font-semibold font-mono">
              {targetWeekly > 0
                ? `${Math.round(((metric === 'valor' ? summary.mediaSemanalMesAtual : summary.mediaSemanalMesAtualQtd) / targetWeekly) * 100)}% da meta`
                : '100%'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. VISUALIZAÇÃO GRÁFICA PRINCIPAL */}

      {/* VISTA 1: DIAS E META DIÁRIA */}
      {viewMode === 'dias' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-800">
                Evolução Diária vs Meta Diária ({formatMetricVal(targetDaily)}):
              </span>
              <span className="text-neutral-500 hidden sm:inline">
                Barras verdes indicam dias que bateram a meta.
              </span>
            </div>
            {/* Seletor de Amplitude de Dias */}
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-neutral-400">Ver:</span>
              <button
                type="button"
                onClick={() => setDaysRange(7)}
                className={`px-2 py-0.5 rounded ${daysRange === 7 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 text-neutral-600'}`}
              >
                7 dias
              </button>
              <button
                type="button"
                onClick={() => setDaysRange(14)}
                className={`px-2 py-0.5 rounded ${daysRange === 14 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 text-neutral-600'}`}
              >
                14 dias
              </button>
              <button
                type="button"
                onClick={() => setDaysRange(30)}
                className={`px-2 py-0.5 rounded ${daysRange === 30 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 text-neutral-600'}`}
              >
                30 dias
              </button>
            </div>
          </div>

          {/* Gráfico de Barras com Linha de Meta */}
          <div className="relative border border-neutral-200 rounded-xl p-3 sm:p-4 bg-neutral-50/50 overflow-x-auto">
            {/* Linha de Meta Indicativa */}
            {targetDaily > 0 && maxDailyVal > 0 && (
              <div
                className="absolute left-3 right-3 sm:left-4 sm:right-4 border-b-2 border-dashed border-rose-500/80 pointer-events-none z-10 flex items-center justify-between"
                style={{
                  bottom: `${Math.min(92, Math.max(12, Math.round((targetDaily / maxDailyVal) * 160) + 40))}px`,
                }}
              >
                <span className="bg-rose-500 text-white text-[9px] font-bold font-mono px-1.5 py-0.2 rounded shadow-2xs">
                  META: {formatMetricVal(targetDaily)}
                </span>
                <span className="text-[9px] font-mono text-rose-600 bg-white/80 px-1 rounded">
                  Alvo por Dia
                </span>
              </div>
            )}

            <div
              className="flex items-end gap-1.5 sm:gap-2.5 min-h-[220px] pt-8 pb-1"
              style={{ minWidth: dailyItems.length > 14 ? '680px' : 'auto' }}
            >
              {dailyItems.map((item) => {
                const val = metric === 'valor' ? item.actualValue : item.actualCount;
                const heightPercent = maxDailyVal > 0 ? Math.max(6, Math.round((val / maxDailyVal) * 100)) : 6;
                const isAchieved = item.isAchieved && (val > 0 || targetDaily === 0);

                return (
                  <div
                    key={item.dateStr}
                    className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredItem({
                        title: `${item.dayLabel}, ${item.shortDate}`,
                        actual: formatMetricVal(val),
                        target: formatMetricVal(targetDaily),
                        pct: item.pct,
                        isAchieved,
                        diff: item.difference >= 0 ? `+${formatMetricVal(item.difference)}` : formatMetricVal(item.difference),
                        extra: `${item.actualCount} veículo(s) atendido(s)`,
                      })
                    }
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {/* Badge de Meta Atingida no Topo da Barra */}
                    <div className="h-4 flex items-center justify-center">
                      {isAchieved ? (
                        <span className="text-[8px] sm:text-[9px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1 py-0.2 rounded-full whitespace-nowrap">
                          ✓ Bateu
                        </span>
                      ) : val > 0 ? (
                        <span className="text-[8px] font-mono text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.pct}%
                        </span>
                      ) : null}
                    </div>

                    {/* Valor da barra */}
                    <div className="text-[9px] sm:text-[10px] font-mono font-bold text-neutral-800 truncate max-w-full">
                      {val > 0 ? formatShortMetricVal(val) : '-'}
                    </div>

                    {/* Barra */}
                    <div className="w-full bg-neutral-200/80 rounded-lg h-36 flex items-end p-0.5">
                      <div
                        className={`w-full rounded-md transition-all duration-300 relative ${
                          isAchieved
                            ? 'bg-emerald-600 group-hover:bg-emerald-500 shadow-xs'
                            : item.isToday
                            ? 'bg-blue-600 group-hover:bg-blue-500'
                            : val > 0
                            ? 'bg-neutral-800 group-hover:bg-neutral-700'
                            : 'bg-neutral-300/60'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* Legenda do Dia */}
                    <div className="text-center leading-tight">
                      <span
                        className={`text-[10px] sm:text-[11px] font-bold block ${
                          item.isToday
                            ? 'text-blue-600'
                            : isAchieved
                            ? 'text-emerald-700 font-extrabold'
                            : 'text-neutral-700'
                        }`}
                      >
                        {item.isToday ? 'Hoje' : item.dayLabel}
                      </span>
                      <span className="text-[9px] text-neutral-400 font-mono block">
                        {item.shortDate}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: SEMANAS E META SEMANAL */}
      {viewMode === 'semanas' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-800">
                Atingimento por Semana vs Meta Semanal ({formatMetricVal(targetWeekly)}):
              </span>
              <span className="text-neutral-500 hidden sm:inline">
                Acompanhe o faturamento consolidado de cada semana.
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-neutral-400">Intervalo:</span>
              <button
                type="button"
                onClick={() => setWeeksRange(4)}
                className={`px-2 py-0.5 rounded ${weeksRange === 4 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 text-neutral-600'}`}
              >
                4 semanas
              </button>
              <button
                type="button"
                onClick={() => setWeeksRange(6)}
                className={`px-2 py-0.5 rounded ${weeksRange === 6 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 text-neutral-600'}`}
              >
                6 semanas
              </button>
              <button
                type="button"
                onClick={() => setWeeksRange(8)}
                className={`px-2 py-0.5 rounded ${weeksRange === 8 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 text-neutral-600'}`}
              >
                8 semanas
              </button>
            </div>
          </div>

          <div className="relative border border-neutral-200 rounded-xl p-3 sm:p-5 bg-neutral-50/50 overflow-x-auto">
            {targetWeekly > 0 && maxWeeklyVal > 0 && (
              <div
                className="absolute left-3 right-3 sm:left-5 sm:right-5 border-b-2 border-dashed border-purple-500/80 pointer-events-none z-10 flex items-center justify-between"
                style={{
                  bottom: `${Math.min(92, Math.max(12, Math.round((targetWeekly / maxWeeklyVal) * 160) + 40))}px`,
                }}
              >
                <span className="bg-purple-600 text-white text-[9px] font-bold font-mono px-1.5 py-0.2 rounded shadow-2xs">
                  META SEMANAL: {formatMetricVal(targetWeekly)}
                </span>
                <span className="text-[9px] font-mono text-purple-700 bg-white/80 px-1 rounded">
                  Alvo da Semana
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 min-h-[220px] pt-8 pb-1">
              {weeklyItems.map((w) => {
                const val = metric === 'valor' ? w.actualValue : w.actualCount;
                const heightPercent = maxWeeklyVal > 0 ? Math.max(8, Math.round((val / maxWeeklyVal) * 100)) : 8;
                const isAchieved = w.isAchieved && (val > 0 || targetWeekly === 0);

                return (
                  <div
                    key={w.weekKey}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredItem({
                        title: `${w.weekLabel} (${w.dateRangeLabel})`,
                        actual: formatMetricVal(val),
                        target: formatMetricVal(targetWeekly),
                        pct: w.pct,
                        isAchieved,
                        diff: w.difference >= 0 ? `+${formatMetricVal(w.difference)}` : formatMetricVal(w.difference),
                        extra: `Média diária nesta semana: ${formatMetricVal(metric === 'valor' ? w.dailyAverageValue : w.dailyAverageCount)}`,
                      })
                    }
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="h-4 flex items-center justify-center">
                      {isAchieved ? (
                        <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-full whitespace-nowrap">
                          ✓ Meta Batida
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-neutral-500 font-bold">
                          {w.pct}%
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] sm:text-xs font-mono font-bold text-neutral-900 text-center truncate max-w-full">
                      {val > 0 ? formatMetricVal(val) : 'R$ 0'}
                    </div>

                    <div className="w-full bg-neutral-200/80 rounded-xl h-36 flex items-end p-1">
                      <div
                        className={`w-full rounded-lg transition-all duration-300 relative ${
                          isAchieved
                            ? 'bg-emerald-600 group-hover:bg-emerald-500 shadow-sm'
                            : w.isCurrentWeek
                            ? 'bg-purple-600 group-hover:bg-purple-500'
                            : val > 0
                            ? 'bg-neutral-800 group-hover:bg-neutral-700'
                            : 'bg-neutral-300'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        {w.actualCount > 0 && (
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-neutral-500 group-hover:text-neutral-900 whitespace-nowrap">
                            {w.actualCount}v
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-center leading-tight">
                      <span className={`text-[11px] font-bold block ${w.isCurrentWeek ? 'text-purple-700' : 'text-neutral-800'}`}>
                        {w.weekLabel}
                      </span>
                      <span className="text-[9px] text-neutral-400 font-mono block">
                        {w.dateRangeLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: MÉDIAS DIÁRIAS POR MÊS */}
      {viewMode === 'meses' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-neutral-800">
              Média Diária Faturada em Cada Mês vs Meta Diária ({formatMetricVal(targetDaily)}/dia):
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-neutral-400">Meses:</span>
              <button
                type="button"
                onClick={() => setMonthsRange(6)}
                className={`px-2 py-0.5 rounded ${monthsRange === 6 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 text-neutral-600'}`}
              >
                6 meses
              </button>
              <button
                type="button"
                onClick={() => setMonthsRange(12)}
                className={`px-2 py-0.5 rounded ${monthsRange === 12 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 text-neutral-600'}`}
              >
                12 meses
              </button>
            </div>
          </div>

          <div className="border border-neutral-200 rounded-xl p-3 sm:p-5 bg-neutral-50/50 overflow-x-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 min-h-[210px] items-end pt-4 pb-1">
              {monthlyItems.map((m) => {
                const dailyAvg = metric === 'valor' ? m.dailyAverageValue : m.dailyAverageCount;
                const totalVal = metric === 'valor' ? m.actualValue : m.actualCount;
                const heightPercent = targetDaily > 0 ? Math.min(100, Math.max(10, Math.round((dailyAvg / (targetDaily * 1.5)) * 100))) : 15;
                const isAboveDailyTarget = targetDaily > 0 ? dailyAvg >= targetDaily : false;

                return (
                  <div
                    key={m.monthKey}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredItem({
                        title: m.monthLabel,
                        actual: `Média: ${formatMetricVal(dailyAvg)}/dia`,
                        target: `Meta diária: ${formatMetricVal(targetDaily)}/dia`,
                        pct: targetDaily > 0 ? Math.round((dailyAvg / targetDaily) * 100) : 0,
                        isAchieved: isAboveDailyTarget,
                        diff: `Faturamento total: ${formatMetricVal(totalVal)} (${m.actualCount} veículos)`,
                        extra: `Média semanal no mês: ${formatMetricVal(metric === 'valor' ? m.weeklyAverageValue : m.weeklyAverageCount)}/semana`,
                      })
                    }
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="text-center">
                      <span className="text-[10px] font-bold font-mono text-neutral-950 block">
                        {dailyAvg > 0 ? formatMetricVal(dailyAvg) : 'R$ 0'}
                      </span>
                      <span className="text-[9px] text-neutral-400 block font-mono">
                        /dia ({m.daysPassed}d)
                      </span>
                    </div>

                    <div className="w-full bg-neutral-200/80 rounded-xl h-36 flex items-end p-1">
                      <div
                        className={`w-full rounded-lg transition-all duration-300 relative ${
                          isAboveDailyTarget
                            ? 'bg-emerald-600 group-hover:bg-emerald-500 shadow-sm'
                            : m.isCurrentMonth
                            ? 'bg-blue-600 group-hover:bg-blue-500'
                            : dailyAvg > 0
                            ? 'bg-neutral-800 group-hover:bg-neutral-700'
                            : 'bg-neutral-300'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        {isAboveDailyTarget && (
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-emerald-800 bg-emerald-100 px-1 rounded whitespace-nowrap">
                            ✓ Meta
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-center leading-tight">
                      <span className={`text-[11px] font-bold block ${m.isCurrentMonth ? 'text-blue-700' : 'text-neutral-800'}`}>
                        {m.shortLabel}
                      </span>
                      <span className="text-[9px] text-neutral-500 font-mono block">
                        Total: {formatShortMetricVal(totalVal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 4: PAINEL COMPARATIVO DE MÉDIAS DIÁRIAS E SEMANAIS */}
      {viewMode === 'medias' && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-neutral-800">
            Comparativo de Médias Realizadas vs Metas Estipuladas:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Comparativo Média Diária */}
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Média Diária no Mês vs Meta Diária
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {targetDaily > 0
                    ? `${Math.round(((metric === 'valor' ? summary.mediaDiariaMesAtual : summary.mediaDiariaMesAtualQtd) / targetDaily) * 100)}%`
                    : '100%'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Média Diária Realizada</span>
                  <span className="text-xl font-black font-mono text-neutral-950">
                    {metric === 'valor'
                      ? formatCurrency(summary.mediaDiariaMesAtual)
                      : `${summary.mediaDiariaMesAtualQtd.toFixed(1)} vcs`}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">por dia corrido no mês</span>
                </div>

                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Meta Diária Fixada</span>
                  <span className="text-xl font-black font-mono text-neutral-700">
                    {formatMetricVal(targetDaily)}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">alvo por dia</span>
                </div>
              </div>

              <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    (metric === 'valor' ? summary.mediaDiariaMesAtual : summary.mediaDiariaMesAtualQtd) >= targetDaily
                      ? 'bg-emerald-500'
                      : 'bg-blue-600'
                  }`}
                  style={{
                    width: `${targetDaily > 0 ? Math.min(100, Math.round(((metric === 'valor' ? summary.mediaDiariaMesAtual : summary.mediaDiariaMesAtualQtd) / targetDaily) * 100)) : 100}%`,
                  }}
                />
              </div>

              <div className="text-[11px] text-neutral-600 flex items-center justify-between pt-1 border-t border-neutral-200">
                <span>Média diária geral dos últimos meses:</span>
                <strong className="font-mono text-neutral-900">{formatCurrency(summary.mediaDiariaGeral)}/dia</strong>
              </div>
            </div>

            {/* Comparativo Média Semanal */}
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Média Semanal no Mês vs Meta Semanal
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {targetWeekly > 0
                    ? `${Math.round(((metric === 'valor' ? summary.mediaSemanalMesAtual : summary.mediaSemanalMesAtualQtd) / targetWeekly) * 100)}%`
                    : '100%'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Média Semanal Realizada</span>
                  <span className="text-xl font-black font-mono text-neutral-950">
                    {metric === 'valor'
                      ? formatCurrency(summary.mediaSemanalMesAtual)
                      : `${summary.mediaSemanalMesAtualQtd.toFixed(1)} vcs`}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">por semana do mês</span>
                </div>

                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Meta Semanal Fixada</span>
                  <span className="text-xl font-black font-mono text-neutral-700">
                    {formatMetricVal(targetWeekly)}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">alvo por semana</span>
                </div>
              </div>

              <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    (metric === 'valor' ? summary.mediaSemanalMesAtual : summary.mediaSemanalMesAtualQtd) >= targetWeekly
                      ? 'bg-emerald-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{
                    width: `${targetWeekly > 0 ? Math.min(100, Math.round(((metric === 'valor' ? summary.mediaSemanalMesAtual : summary.mediaSemanalMesAtualQtd) / targetWeekly) * 100)) : 100}%`,
                  }}
                />
              </div>

              <div className="text-[11px] text-neutral-600 flex items-center justify-between pt-1 border-t border-neutral-200">
                <span>Média semanal geral dos últimos meses:</span>
                <strong className="font-mono text-neutral-900">{formatCurrency(summary.mediaSemanalGeral)}/semana</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. CARD INTERATIVO DE DETALHE FLUTUANTE / HOVER */}
      {hoveredItem ? (
        <div className="p-3 bg-neutral-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                hoveredItem.isAchieved ? 'bg-emerald-400' : 'bg-neutral-500'
              }`}
            />
            <div>
              <span className="font-bold">{hoveredItem.title}:</span>{' '}
              <span className="font-mono font-bold text-emerald-300">{hoveredItem.actual}</span>{' '}
              <span className="text-neutral-400">(Meta: {hoveredItem.target} · {hoveredItem.pct}%)</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-neutral-300">
            {hoveredItem.extra && <span>{hoveredItem.extra}</span>}
            <span
              className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                hoveredItem.isAchieved ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {hoveredItem.diff}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-100">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            Passe o mouse ou toque nas barras para inspecionar os detalhes e desvios de cada período.
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Meta Atingida
            </span>
            <span className="flex items-center gap-1 text-neutral-600">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 inline-block" /> Abaixo da Meta
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
