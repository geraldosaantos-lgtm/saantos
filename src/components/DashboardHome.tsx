import React, { useState } from 'react';
import { CompanyProfile, GoalsConfig, ServiceLaunch, Client, ServiceItem, ActiveTab } from '../types';
import {
  formatCurrency,
  formatDateTime,
  calculateLaunchMetrics,
  getWeekRange,
} from '../utils/storage';
import {
  Car,
  Users,
  Wrench,
  Target,
  FileText,
  Building2,
  Edit,
  ArrowRight,
  PlusCircle,
  Clock,
  Landmark,
  QrCode,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Calendar,
  Sparkles,
  BarChart3,
  Award,
  ShieldCheck,
  Mail,
  ChevronRight
} from 'lucide-react';

interface DashboardHomeProps {
  company: CompanyProfile;
  goals: GoalsConfig;
  launches: ServiceLaunch[];
  clients?: Client[];
  services?: ServiceItem[];
  onOpenLancamento: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenCompanyModal: () => void;
  onSendEmail?: (launch: ServiceLaunch) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  company,
  goals,
  launches,
  clients = [],
  services = [],
  onOpenLancamento,
  onNavigateTab,
  onOpenCompanyModal,
  onSendEmail,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('hoje');

  // Cálculos do motor de métricas em tempo real
  const now = new Date();
  const metrics = calculateLaunchMetrics(launches, goals, now);
  const { start: weekStart, end: weekEnd } = getWeekRange(now);

  const formatShortDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

  const weekRangeLabel = `${formatShortDate(weekStart)} a ${formatShortDate(weekEnd)}`;

  // Valores dinâmicos baseados no período selecionado
  const periodData = (() => {
    switch (selectedPeriod) {
      case 'hoje':
        return {
          title: 'Hoje',
          dateSubtitle: now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }),
          revenue: metrics.totalHoje,
          targetRevenue: goals.metaDiaria,
          pctRevenue: metrics.pctDia,
          count: metrics.qtdHoje,
          targetCount: goals.metaDiariaQtd,
          ticketMedio: metrics.ticketMedioHoje,
        };
      case 'semana':
        return {
          title: 'Esta Semana',
          dateSubtitle: weekRangeLabel,
          revenue: metrics.totalSemana,
          targetRevenue: goals.metaSemanal,
          pctRevenue: metrics.pctSemana,
          count: metrics.qtdSemana,
          targetCount: goals.metaSemanalQtd,
          ticketMedio: metrics.ticketMedioSemana,
        };
      case 'mes':
        return {
          title: 'Este Mês',
          dateSubtitle: now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
          revenue: metrics.totalMes,
          targetRevenue: goals.metaMensal,
          pctRevenue: metrics.pctMes,
          count: metrics.qtdMes,
          targetCount: goals.metaMensalQtd,
          ticketMedio: metrics.ticketMedioMes,
        };
      case 'todos':
      default:
        return {
          title: 'Geral Acumulado',
          dateSubtitle: `${launches.length} ordens de serviço no histórico`,
          revenue: metrics.totalGeral,
          targetRevenue: goals.metaMensal,
          pctRevenue: goals.metaMensal > 0 ? Math.round((metrics.totalGeral / goals.metaMensal) * 100) : 0,
          count: metrics.qtdGeral,
          targetCount: goals.metaMensalQtd,
          ticketMedio: metrics.qtdGeral > 0 ? metrics.totalGeral / metrics.qtdGeral : 0,
        };
    }
  })();

  // Altura máxima para normalizar o gráfico de barras dos últimos 7 dias
  const maxDayValue = Math.max(...metrics.last7Days.map((d) => d.total), 100);

  return (
    <div className="space-y-6">
      {/* 1. TOPO: TÍTULO DO DASHBOARD + FILTRO DE PERÍODO + BOTÃO NOVO LANÇAMENTO */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-neutral-900 text-white rounded-xl shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-neutral-950 tracking-tight leading-tight">
                Dashboard Operacional
              </h1>
              <p className="text-xs text-neutral-500 capitalize">
                {company.nomeFantasia || 'AutoLava'} · {periodData.dateSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Controles: Seletor de Período & Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedPeriod('hoje')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedPeriod === 'hoje'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setSelectedPeriod('semana')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedPeriod === 'semana'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setSelectedPeriod('mes')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedPeriod === 'mes'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setSelectedPeriod('todos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedPeriod === 'todos'
                  ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Geral
            </button>
          </div>

          <button
            onClick={onOpenLancamento}
            className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-98"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* 2. CARDS DE INDICADORES CHAVE (KPIS) EM TEMPO REAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Faturamento do Período */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Faturamento ({periodData.title})
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-neutral-950">
            {formatCurrency(periodData.revenue)}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-100">
            <span className="text-neutral-500">
              Meta: <strong className="font-mono text-neutral-700">{formatCurrency(periodData.targetRevenue)}</strong>
            </span>
            <span
              className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                periodData.pctRevenue >= 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {periodData.pctRevenue}%
            </span>
          </div>
        </div>

        {/* KPI 2: Veículos Atendidos */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Veículos Atendidos
            </span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Car className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-neutral-950">
            {periodData.count} <span className="text-xs font-normal text-neutral-400">veículos</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-100">
            <span className="text-neutral-500">
              Meta: <strong className="font-mono text-neutral-700">{periodData.targetCount} veículos</strong>
            </span>
            <span className="font-mono font-bold text-neutral-700 text-[10px]">
              {periodData.targetCount > 0
                ? `${Math.min(100, Math.round((periodData.count / periodData.targetCount) * 100))}%`
                : '100%'}
            </span>
          </div>
        </div>

        {/* KPI 3: Ticket Médio por Veículo */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Ticket Médio
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-neutral-950">
            {formatCurrency(periodData.ticketMedio)}
          </div>
          <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
            <span>Média cobrada por veículo lavado</span>
          </div>
        </div>

        {/* KPI 4: Taxa de Assinatura Digital */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Conformidade & Assinaturas
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-neutral-950">
            {metrics.taxaAssinatura}%
          </div>
          <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-100 flex items-center justify-between">
            <span>Assinaturas colhidas</span>
            <span className="text-emerald-700 font-semibold">100% Auditável</span>
          </div>
        </div>
      </div>

      {/* 3. GRÁFICO INTERATIVO DE FATURAMENTO DOS ÚLTIMOS 7 DIAS */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-neutral-700" />
              Movimentação e Faturamento dos Últimos 7 Dias
            </h2>
            <p className="text-xs text-neutral-500">
              Acompanhe a curva de evolução diária de atendimentos e receita gerada no pátio.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-neutral-600 font-medium">
              <span className="w-3 h-3 bg-neutral-900 rounded-xs inline-block" /> Dias Anteriores
            </span>
            <span className="flex items-center gap-1.5 text-blue-700 font-bold">
              <span className="w-3 h-3 bg-blue-600 rounded-xs inline-block" /> Hoje
            </span>
          </div>
        </div>

        {/* Barras do Gráfico */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-6 pb-2 items-end min-h-[180px]">
          {metrics.last7Days.map((d) => {
            const heightPercent = maxDayValue > 0 ? Math.max(10, Math.round((d.total / maxDayValue) * 100)) : 10;
            return (
              <div key={d.dateStr} className="flex flex-col items-center gap-2 group">
                {/* Tooltip com Valor no Topo da Barra */}
                <div className="text-[10px] sm:text-xs font-mono font-bold text-neutral-900 text-center truncate max-w-full">
                  {d.total > 0 ? formatCurrency(d.total) : 'R$ 0'}
                </div>

                {/* Coluna da Barra */}
                <div className="w-full bg-neutral-100 rounded-xl h-36 flex items-end p-1">
                  <div
                    className={`w-full rounded-lg transition-all duration-500 relative ${
                      d.isToday
                        ? 'bg-blue-600 group-hover:bg-blue-500 shadow-sm'
                        : d.total > 0
                        ? 'bg-neutral-900 group-hover:bg-neutral-800'
                        : 'bg-neutral-200'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    {d.count > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-neutral-500 group-hover:text-neutral-900 whitespace-nowrap">
                        {d.count}v
                      </span>
                    )}
                  </div>
                </div>

                {/* Legenda do Dia */}
                <div className="text-center">
                  <span
                    className={`text-[11px] sm:text-xs font-bold block ${
                      d.isToday ? 'text-blue-600' : 'text-neutral-700'
                    }`}
                  >
                    {d.isToday ? 'Hoje' : d.dayLabel}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono block">
                    {d.shortDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. VISÃO CONSOLIDADA DE METAS: DIA, SEMANA E MÊS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Meta Dia */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Meta de Hoje
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {metrics.pctDia}%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-neutral-950">
              {formatCurrency(metrics.totalHoje)}
            </span>
            <span className="text-xs text-neutral-500">
              Alvo: <strong className="font-mono text-neutral-800">{formatCurrency(goals.metaDiaria)}</strong>
            </span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                metrics.pctDia >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${metrics.pctDia}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
            <span>{metrics.qtdHoje} veículos hoje</span>
            <span>Meta: {goals.metaDiariaQtd} vcs</span>
          </div>
        </div>

        {/* Meta Semana */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
              Meta da Semana
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
              {metrics.pctSemana}%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-neutral-950">
              {formatCurrency(metrics.totalSemana)}
            </span>
            <span className="text-xs text-neutral-500">
              Alvo: <strong className="font-mono text-neutral-800">{formatCurrency(goals.metaSemanal)}</strong>
            </span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                metrics.pctSemana >= 100 ? 'bg-emerald-500' : 'bg-purple-600'
              }`}
              style={{ width: `${metrics.pctSemana}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
            <span>{metrics.qtdSemana} veículos na semana</span>
            <span>Meta: {goals.metaSemanalQtd} vcs</span>
          </div>
        </div>

        {/* Meta Mês */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5 uppercase tracking-wider">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Meta do Mês
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              {metrics.pctMes}%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-neutral-950">
              {formatCurrency(metrics.totalMes)}
            </span>
            <span className="text-xs text-neutral-500">
              Alvo: <strong className="font-mono text-neutral-800">{formatCurrency(goals.metaMensal)}</strong>
            </span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                metrics.pctMes >= 100 ? 'bg-emerald-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${metrics.pctMes}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
            <span>{metrics.qtdMes} veículos no mês</span>
            <span>Meta: {goals.metaMensalQtd} vcs</span>
          </div>
        </div>
      </div>

      {/* 5. GRID DE 2 COLUNAS: SERVIÇOS MAIS REALIZADOS & TOP CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Serviços Mais Realizados */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-neutral-700" />
              Serviços Mais Demandados no Pátio
            </h3>
            <button
              onClick={() => onNavigateTab('servicos')}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
            >
              Catálogo <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {metrics.topServices.map((srv, idx) => {
              const maxSrvTotal = metrics.topServices[0]?.total || 1;
              const srvPct = Math.max(8, Math.round((srv.total / maxSrvTotal) * 100));
              return (
                <div key={srv.id || idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-900 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 w-4">#{idx + 1}</span>
                      {srv.nome}
                    </span>
                    <div className="text-right">
                      <span className="font-bold font-mono text-neutral-900">{formatCurrency(srv.total)}</span>
                      <span className="text-[10px] text-neutral-400 font-mono ml-1.5">({srv.quantidade}x)</span>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-neutral-900 h-1.5 rounded-full"
                      style={{ width: `${srvPct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {metrics.topServices.length === 0 && (
              <div className="py-6 text-center text-neutral-400 text-xs">
                Nenhum serviço registrado ainda.
              </div>
            )}
          </div>
        </div>

        {/* Top Clientes / Frotas */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-700" />
              Principais Clientes & Frotistas
            </h3>
            <button
              onClick={() => onNavigateTab('clientes')}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
            >
              Ver Todos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics.topClients.map((cli, idx) => (
              <div
                key={cli.nome || idx}
                className="p-2.5 bg-neutral-50 hover:bg-neutral-100/80 rounded-xl border border-neutral-200 flex items-center justify-between transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-neutral-900 line-clamp-1">{cli.nome}</h4>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      {cli.quantidade} {cli.quantidade === 1 ? 'veículo atendido' : 'veículos atendidos'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono text-neutral-950 text-sm">
                    {formatCurrency(cli.total)}
                  </span>
                </div>
              </div>
            ))}

            {metrics.topClients.length === 0 && (
              <div className="py-6 text-center text-neutral-400 text-xs">
                Nenhum cliente registrado nos lançamentos ainda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. ATALHOS RÁPIDOS OPERACIONAIS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={onOpenLancamento}
          className="p-3.5 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-all text-left flex flex-col justify-between shadow-2xs group"
        >
          <Car className="w-5 h-5 text-emerald-400 mb-2" />
          <div>
            <span className="text-xs font-bold block">Novo Atendimento</span>
            <span className="text-[10px] text-neutral-300">Lançar OS com assinatura</span>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('lancamentos')}
          className="p-3.5 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all text-left flex flex-col justify-between shadow-2xs group"
        >
          <Clock className="w-5 h-5 text-blue-600 mb-2" />
          <div>
            <span className="text-xs font-bold text-neutral-900 block">Histórico de OS</span>
            <span className="text-[10px] text-neutral-500">Consultar lançamentos</span>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('metas')}
          className="p-3.5 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all text-left flex flex-col justify-between shadow-2xs group"
        >
          <Target className="w-5 h-5 text-purple-600 mb-2" />
          <div>
            <span className="text-xs font-bold text-neutral-900 block">Gestão de Metas</span>
            <span className="text-[10px] text-neutral-500">Definir objetivos</span>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('relatorios')}
          className="p-3.5 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all text-left flex flex-col justify-between shadow-2xs group"
        >
          <FileText className="w-5 h-5 text-rose-600 mb-2" />
          <div>
            <span className="text-xs font-bold text-neutral-900 block">Relatórios PDF</span>
            <span className="text-[10px] text-neutral-500">Exportar fechamento</span>
          </div>
        </button>
      </div>

      {/* 7. ÚLTIMOS LANÇAMENTOS REGISTRADOS NO SISTEMA */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-700" />
            Últimos Atendimentos Registrados no Pátio
          </h3>
          <button
            onClick={() => onNavigateTab('lancamentos')}
            className="text-xs font-semibold text-neutral-900 hover:underline flex items-center gap-1"
          >
            Ver Histórico Completo ({launches.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold w-24">Data / Hora</th>
                <th className="py-2.5 px-3 font-semibold w-20">Nº OS</th>
                <th className="py-2.5 px-3 font-semibold">Cliente</th>
                <th className="py-2.5 px-3 font-semibold">Veículo / Placa</th>
                <th className="py-2.5 px-3 font-semibold">Condutor</th>
                <th className="py-2.5 px-3 font-semibold text-center w-24">Assinatura</th>
                <th className="py-2.5 px-3 font-semibold text-right w-24">Valor</th>
                {onSendEmail && <th className="py-2.5 px-3 font-semibold text-center w-16">E-mail</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {launches.slice(0, 6).map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-neutral-600 whitespace-nowrap">
                    {formatDateTime(l.dataHora)}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">
                    {l.numeroOS}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-neutral-900">
                    {l.clienteNome}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold font-mono text-neutral-950">{l.placa}</span>
                    <span className="text-neutral-500 block text-[11px] truncate max-w-[140px]">
                      {l.modelo}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-neutral-900 block">{l.nomeCondutor}</span>
                    {l.matriculaCondutor && l.matriculaCondutor !== 'S/N' && (
                      <span className="text-[10px] text-neutral-500 font-mono">
                        Mat: {l.matriculaCondutor}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {l.assinatura ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Assinado
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400">Pendente</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-950">
                    {formatCurrency(l.valorTotal)}
                  </td>
                  {onSendEmail && (
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onSendEmail(l)}
                        title="Enviar comprovante por e-mail"
                        className="p-1 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {launches.length === 0 && (
                <tr>
                  <td colSpan={onSendEmail ? 8 : 7} className="py-8 text-center text-neutral-400">
                    <Car className="w-7 h-7 mx-auto mb-1 text-neutral-300" />
                    <p className="text-xs font-semibold text-neutral-600">Nenhum atendimento registrado ainda.</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Clique em "Novo Lançamento" acima para registrar sua primeira ordem de serviço.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. CARD DA EMPRESA */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {company.logoUrl ? (
              <div className="w-14 h-14 rounded-xl border border-neutral-200 p-1 bg-white flex items-center justify-center shrink-0">
                <img
                  src={company.logoUrl}
                  alt={company.nomeFantasia}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-neutral-900 text-white flex flex-col items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-neutral-200" />
                <span className="text-[8px] font-bold mt-0.5">EMPRESA</span>
              </div>
            )}

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-950">
                  {company.nomeFantasia || company.razaoSocial}
                </h2>
                <span className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-mono">
                  {company.cnpj}
                </span>
              </div>
              <p className="text-xs text-neutral-500 line-clamp-1">
                {company.razaoSocial} · {company.telefone} · {company.email}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-600 pt-0.5">
                <span className="flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-neutral-400" />
                  {company.dadosBancarios.banco} (Ag: {company.dadosBancarios.agencia} / CC: {company.dadosBancarios.conta})
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <QrCode className="w-3 h-3 text-neutral-400" />
                  PIX ({company.dadosBancarios.tipoChavePix}): <strong>{company.dadosBancarios.chavePix}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenCompanyModal}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
          >
            <Edit className="w-3.5 h-3.5" />
            Editar Dados da Empresa
          </button>
        </div>
      </div>
    </div>
  );
};
