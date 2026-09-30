import React, { useState, useEffect } from 'react';
import { GoalsConfig, ServiceLaunch } from '../types';
import {
  formatCurrency,
  formatDateTime,
  calculateLaunchMetrics,
  getWeekRange,
} from '../utils/storage';
import {
  Target,
  TrendingUp,
  Calendar,
  Check,
  Edit3,
  DollarSign,
  Car,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';

interface MetasViewProps {
  goals: GoalsConfig;
  launches: ServiceLaunch[];
  onSaveGoals: (updated: GoalsConfig) => void;
}

export const MetasView: React.FC<MetasViewProps> = ({
  goals,
  launches,
  onSaveGoals,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formGoals, setFormGoals] = useState<GoalsConfig>({ ...goals });
  const [activeListTab, setActiveListTab] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('hoje');

  // Sincroniza formulário sempre que goals mudar externamente
  useEffect(() => {
    setFormGoals({ ...goals });
  }, [goals]);

  // Motor centralizado de métricas com suporte a fuso horário e tolerância a dados nulos
  const metrics = calculateLaunchMetrics(launches, goals);

  const now = new Date();
  const { start: weekStart, end: weekEnd } = getWeekRange(now);

  const formatShortDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

  const weekRangeLabel = `${formatShortDate(weekStart)} até ${formatShortDate(weekEnd)}`;
  const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGoals(formGoals);
    setIsEditing(false);
  };

  // Filtra lançamentos exibidos na lista inferior
  const displayedLaunches = (() => {
    switch (activeListTab) {
      case 'hoje':
        return metrics.todayLaunches;
      case 'semana':
        return metrics.weekLaunches;
      case 'mes':
        return launches.filter((l) => {
          const d = new Date(l.dataHora);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
      case 'todos':
      default:
        return launches;
    }
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-neutral-900 text-white rounded-lg">
              <Target className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              Planejamento & Acompanhamento de Metas
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Valores atualizados em tempo real para o dia de hoje, a semana atual e o mês.
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
          {isEditing ? 'Fechar Edição' : 'Ajustar Metas (Valores/Qtd)'}
        </button>
      </div>

      {/* Formulário de Edição de Metas */}
      {isEditing && (
        <form
          onSubmit={handleSave}
          className="bg-white border border-neutral-300 rounded-xl p-5 shadow-xs space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
            <Target className="w-4 h-4 text-neutral-900" />
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Definir Metas Financeiras e Quantidade de Veículos
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Meta Diária */}
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
              <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                Meta por Dia
              </span>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Faturamento Diário (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formGoals.metaDiaria}
                  onChange={(e) =>
                    setFormGoals({ ...formGoals, metaDiaria: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-neutral-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Qtd. de Veículos / Dia
                </label>
                <input
                  type="number"
                  min="0"
                  value={formGoals.metaDiariaQtd}
                  onChange={(e) =>
                    setFormGoals({ ...formGoals, metaDiariaQtd: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-neutral-300 rounded bg-white"
                />
              </div>
            </div>

            {/* Meta Semanal */}
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
              <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-neutral-600" />
                Meta por Semana
              </span>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Faturamento Semanal (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formGoals.metaSemanal}
                  onChange={(e) =>
                    setFormGoals({ ...formGoals, metaSemanal: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-neutral-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Qtd. de Veículos / Semana
                </label>
                <input
                  type="number"
                  min="0"
                  value={formGoals.metaSemanalQtd}
                  onChange={(e) =>
                    setFormGoals({ ...formGoals, metaSemanalQtd: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-neutral-300 rounded bg-white"
                />
              </div>
            </div>

            {/* Meta Mensal */}
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
              <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-neutral-600" />
                Meta por Mês
              </span>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Faturamento Mensal (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={formGoals.metaMensal}
                  onChange={(e) =>
                    setFormGoals({ ...formGoals, metaMensal: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-neutral-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Qtd. de Veículos / Mês
                </label>
                <input
                  type="number"
                  min="0"
                  value={formGoals.metaMensalQtd}
                  onChange={(e) =>
                    setFormGoals({ ...formGoals, metaMensalQtd: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-neutral-300 rounded bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar Metas
            </button>
          </div>
        </form>
      )}

      {/* Cards de Acompanhamento do Progresso em Tempo Real */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Meta Diária Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4 hover:border-neutral-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Meta do Dia
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                metrics.pctDia >= 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {metrics.pctDia}% atingido
            </span>
          </div>

          <div>
            <div className="text-3xl font-extrabold font-mono text-neutral-950">
              {formatCurrency(metrics.totalHoje)}
            </div>
            <div className="text-xs text-neutral-500 mt-1 flex items-center justify-between">
              <span>Alvo: <strong className="font-mono text-neutral-800">{formatCurrency(goals.metaDiaria)}</strong></span>
              <span className="text-[11px] text-neutral-400">Hoje: {now.toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* Barra de Progresso Financeiro */}
          <div className="space-y-1.5">
            <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  metrics.pctDia >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${metrics.pctDia}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-neutral-600 font-mono">
              <span className="flex items-center gap-1 font-semibold text-neutral-900">
                <Car className="w-3 h-3 text-neutral-500" />
                {metrics.qtdHoje} atendimentos hoje
              </span>
              <span className="text-neutral-500">Meta: {goals.metaDiariaQtd} veículos</span>
            </div>
          </div>
        </div>

        {/* Meta Semanal Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4 hover:border-neutral-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
              Meta da Semana
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                metrics.pctSemana >= 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-purple-50 text-purple-700'
              }`}
            >
              {metrics.pctSemana}% atingido
            </span>
          </div>

          <div>
            <div className="text-3xl font-extrabold font-mono text-neutral-950">
              {formatCurrency(metrics.totalSemana)}
            </div>
            <div className="text-xs text-neutral-500 mt-1 flex items-center justify-between">
              <span>Alvo: <strong className="font-mono text-neutral-800">{formatCurrency(goals.metaSemanal)}</strong></span>
              <span className="text-[11px] text-neutral-400 font-mono">{weekRangeLabel}</span>
            </div>
          </div>

          {/* Barra de Progresso Financeiro */}
          <div className="space-y-1.5">
            <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  metrics.pctSemana >= 100 ? 'bg-emerald-500' : 'bg-purple-600'
                }`}
                style={{ width: `${metrics.pctSemana}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-neutral-600 font-mono">
              <span className="flex items-center gap-1 font-semibold text-neutral-900">
                <Car className="w-3 h-3 text-neutral-500" />
                {metrics.qtdSemana} atendimentos na semana
              </span>
              <span className="text-neutral-500">Meta: {goals.metaSemanalQtd} veículos</span>
            </div>
          </div>
        </div>

        {/* Meta Mensal Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4 hover:border-neutral-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Meta do Mês
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                metrics.pctMes >= 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {metrics.pctMes}% atingido
            </span>
          </div>

          <div>
            <div className="text-3xl font-extrabold font-mono text-neutral-950">
              {formatCurrency(metrics.totalMes)}
            </div>
            <div className="text-xs text-neutral-500 mt-1 flex items-center justify-between">
              <span>Alvo: <strong className="font-mono text-neutral-800">{formatCurrency(goals.metaMensal)}</strong></span>
              <span className="text-[11px] text-neutral-400 capitalize">{monthName}</span>
            </div>
          </div>

          {/* Barra de Progresso Financeiro */}
          <div className="space-y-1.5">
            <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  metrics.pctMes >= 100 ? 'bg-emerald-500' : 'bg-emerald-600'
                }`}
                style={{ width: `${metrics.pctMes}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-neutral-600 font-mono">
              <span className="flex items-center gap-1 font-semibold text-neutral-900">
                <Car className="w-3 h-3 text-neutral-500" />
                {metrics.qtdMes} atendimentos no mês
              </span>
              <span className="text-neutral-500">Meta: {goals.metaMensalQtd} veículos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Transparência: Lançamentos que Compõem as Metas */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-700" />
              Detalhamento de Atendimentos Contabilizados
            </h3>
            <p className="text-[11px] text-neutral-500">
              Veja exatamente quais ordens de serviço somaram nos totais de hoje, da semana e do mês.
            </p>
          </div>

          {/* Abas de Filtro */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setActiveListTab('hoje')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                activeListTab === 'hoje'
                  ? 'bg-white text-neutral-950 shadow-2xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Hoje ({metrics.qtdHoje})
            </button>
            <button
              onClick={() => setActiveListTab('semana')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                activeListTab === 'semana'
                  ? 'bg-white text-neutral-950 shadow-2xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Semana ({metrics.qtdSemana})
            </button>
            <button
              onClick={() => setActiveListTab('mes')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                activeListTab === 'mes'
                  ? 'bg-white text-neutral-950 shadow-2xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Mês ({metrics.qtdMes})
            </button>
            <button
              onClick={() => setActiveListTab('todos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                activeListTab === 'todos'
                  ? 'bg-white text-neutral-950 shadow-2xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todos ({launches.length})
            </button>
          </div>
        </div>

        {/* Tabela de Ordens */}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {displayedLaunches.map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-2.5 px-3 text-neutral-600 font-mono whitespace-nowrap">
                    {formatDateTime(l.dataHora)}
                  </td>
                  <td className="py-2.5 px-3 font-bold font-mono text-neutral-900">
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
                  <td className="py-2.5 px-3 text-neutral-700">
                    <span className="font-medium text-neutral-900 block">{l.nomeCondutor}</span>
                    {l.matriculaCondutor && l.matriculaCondutor !== 'S/N' && (
                      <span className="text-[10px] text-neutral-500 font-mono">
                        Mat: {l.matriculaCondutor}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {l.assinatura ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
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
                </tr>
              ))}

              {displayedLaunches.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    <Car className="w-7 h-7 mx-auto mb-1 text-neutral-300" />
                    <p className="text-xs font-semibold text-neutral-600">
                      Nenhum atendimento registrado no filtro selecionado (
                      {activeListTab === 'hoje'
                        ? 'Hoje'
                        : activeListTab === 'semana'
                        ? 'Esta Semana'
                        : activeListTab === 'mes'
                        ? 'Este Mês'
                        : 'Todos'}
                      ).
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Ao lançar um serviço com a data deste período, os valores e metas atualizarão automaticamente.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
