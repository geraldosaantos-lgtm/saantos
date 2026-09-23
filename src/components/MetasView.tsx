import React, { useState } from 'react';
import { GoalsConfig, ServiceLaunch } from '../types';
import { formatCurrency, getLocalDateString } from '../utils/storage';
import { Target, TrendingUp, Calendar, Check, Edit3, DollarSign, Car } from 'lucide-react';

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

  // Calcula faturamento e atendimentos atuais
  const now = new Date();
  const todayStr = getLocalDateString(now);

  // Início da semana (domingo ou segunda)
  const currentDayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  // Início do mês
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalHoje = 0;
  let qtdHoje = 0;
  let totalSemana = 0;
  let qtdSemana = 0;
  let totalMes = 0;
  let qtdMes = 0;

  launches.forEach((l) => {
    const launchDate = new Date(l.dataHora);
    const dateStr = getLocalDateString(l.dataHora);

    if (dateStr === todayStr) {
      totalHoje += l.valorTotal;
      qtdHoje += 1;
    }

    if (launchDate >= startOfWeek) {
      totalSemana += l.valorTotal;
      qtdSemana += 1;
    }

    if (launchDate >= startOfMonth) {
      totalMes += l.valorTotal;
      qtdMes += 1;
    }
  });

  const getPercent = (actual: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((actual / target) * 100));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGoals(formGoals);
    setIsEditing(false);
  };

  const pctDia = getPercent(totalHoje, goals.metaDiaria);
  const pctSemana = getPercent(totalSemana, goals.metaSemanal);
  const pctMes = getPercent(totalMes, goals.metaMensal);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Planejamento de Metas</h1>
          <p className="text-xs text-neutral-500">
            Defina e acompanhe suas metas operacionais e financeiras por Dia, Semana e Mês.
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
          {isEditing ? 'Fechar Edição' : 'Ajustar Valores das Metas'}
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
              Configurar Objetivos Financeiros e Volume de Serviços
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
                    setFormGoals({ ...formGoals, metaDiariaQtd: parseInt(e.target.value) || 0 })
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
                    setFormGoals({ ...formGoals, metaSemanalQtd: parseInt(e.target.value) || 0 })
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
                    setFormGoals({ ...formGoals, metaMensalQtd: parseInt(e.target.value) || 0 })
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
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Hoje ({new Date().toLocaleDateString('pt-BR')})
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
              {pctDia}% da meta
            </span>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono text-neutral-900">
              {formatCurrency(totalHoje)}
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Meta do dia: <span className="font-mono text-neutral-700">{formatCurrency(goals.metaDiaria)}</span>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-1">
            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-neutral-900 h-2 rounded-full transition-all duration-500"
                style={{ width: `${pctDia}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
              <span>{qtdHoje} veículos atendidos</span>
              <span>Alvo: {goals.metaDiariaQtd} vcs</span>
            </div>
          </div>
        </div>

        {/* Meta Semanal Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Esta Semana
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
              {pctSemana}% da meta
            </span>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono text-neutral-900">
              {formatCurrency(totalSemana)}
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Meta da semana: <span className="font-mono text-neutral-700">{formatCurrency(goals.metaSemanal)}</span>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-1">
            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-neutral-900 h-2 rounded-full transition-all duration-500"
                style={{ width: `${pctSemana}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
              <span>{qtdSemana} veículos atendidos</span>
              <span>Alvo: {goals.metaSemanalQtd} vcs</span>
            </div>
          </div>
        </div>

        {/* Meta Mensal Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Este Mês
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
              {pctMes}% da meta
            </span>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono text-neutral-900">
              {formatCurrency(totalMes)}
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Meta do mês: <span className="font-mono text-neutral-700">{formatCurrency(goals.metaMensal)}</span>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-1">
            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-neutral-900 h-2 rounded-full transition-all duration-500"
                style={{ width: `${pctMes}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
              <span>{qtdMes} veículos atendidos</span>
              <span>Alvo: {goals.metaMensalQtd} vcs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Produtividade Recente */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
          <Car className="w-4 h-4 text-neutral-700" />
          Últimos Veículos Atendidos na Base de Metas
        </h3>

        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
              <tr>
                <th className="py-2 px-3 font-semibold">Data / Hora</th>
                <th className="py-2 px-3 font-semibold">OS</th>
                <th className="py-2 px-3 font-semibold">Cliente</th>
                <th className="py-2 px-3 font-semibold">Placa / Modelo</th>
                <th className="py-2 px-3 font-semibold">Responsável</th>
                <th className="py-2 px-3 font-semibold text-right">Valor Gerado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {launches.slice(0, 5).map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50">
                  <td className="py-2 px-3 text-neutral-600 font-mono">
                    {new Date(l.dataHora).toLocaleDateString('pt-BR')} {new Date(l.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2 px-3 font-bold font-mono text-neutral-800">{l.numeroOS}</td>
                  <td className="py-2 px-3 font-medium text-neutral-900">{l.clienteNome}</td>
                  <td className="py-2 px-3">
                    <span className="font-bold font-mono">{l.placa}</span> · {l.modelo}
                  </td>
                  <td className="py-2 px-3 text-neutral-600">{l.responsavel}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900">
                    {formatCurrency(l.valorTotal)}
                  </td>
                </tr>
              ))}
              {launches.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-neutral-400">
                    Nenhum serviço lançado ainda para contabilizar metas.
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
