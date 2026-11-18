import React, { useMemo, useState } from 'react';
import {
  CalendarHolidayItem,
  GoalRedistributeMode,
  GoalsCalendarConfig,
  GoalsConfig,
  HolidayScope,
} from '../types';
import { formatCurrency } from '../utils/storage';
import {
  BRAZIL_UFS,
  MUNICIPAL_HOLIDAY_PRESETS,
  buildMonthCalendarGrid,
  defaultGoalsCalendarConfig,
  formatDateKey,
  getHolidaysForYear,
  makeAutoHolidayKey,
  normalizeCalendarConfig,
  normalizeCityName,
  parseDateKey,
} from '../utils/holidaysCalendar';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  X,
  Briefcase,
  Coffee,
  RefreshCw,
  Info,
  AlertCircle,
} from 'lucide-react';

interface GoalsCalendarSectionProps {
  goals: GoalsConfig;
  onSaveGoals: (updated: GoalsConfig) => void;
}

const WEEKDAY_LABELS = [
  { day: 1, short: 'Seg', full: 'Segunda' },
  { day: 2, short: 'Ter', full: 'Terça' },
  { day: 3, short: 'Qua', full: 'Quarta' },
  { day: 4, short: 'Qui', full: 'Quinta' },
  { day: 5, short: 'Sex', full: 'Sexta' },
  { day: 6, short: 'Sáb', full: 'Sábado' },
  { day: 0, short: 'Dom', full: 'Domingo' },
];

const SCOPE_META: Record<
  HolidayScope,
  { label: string; badgeClass: string }
> = {
  nacional: {
    label: 'Nacional',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  estadual: {
    label: 'Estadual',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  municipal: {
    label: 'Municipal',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  ponto_facultativo: {
    label: 'Ponto Facultativo',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  personalizado: {
    label: 'Personalizado',
    badgeClass: 'bg-neutral-200 text-neutral-800 border-neutral-300',
  },
};

export const GoalsCalendarSection: React.FC<GoalsCalendarSectionProps> = ({
  goals,
  onSaveGoals,
}) => {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-11
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [recessNoteDraft, setRecessNoteDraft] = useState('');
  const [isNewHolidayModalOpen, setIsNewHolidayModalOpen] = useState(false);

  // Formulário para adicionar novo feriado (dentro do modal do dia ou do botão geral)
  const [newHolidayDate, setNewHolidayDate] = useState(() => formatDateKey(now));
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayScope, setNewHolidayScope] = useState<HolidayScope>('municipal');
  const [newHolidayTrabalhado, setNewHolidayTrabalhado] = useState(false);

  const calConfig: GoalsCalendarConfig = useMemo(
    () => normalizeCalendarConfig(goals.calendarConfig),
    [goals.calendarConfig]
  );

  const updateCalendarConfig = (
    updater: (prev: GoalsCalendarConfig) => GoalsCalendarConfig
  ) => {
    const nextConfig = updater(calConfig);
    onSaveGoals({
      ...goals,
      calendarConfig: nextConfig,
    });
  };

  // Constrói a grade mensal e todos os cálculos de redistribuição em tempo real
  const grid = useMemo(
    () => buildMonthCalendarGrid(viewYear, viewMonth, goals),
    [viewYear, viewMonth, goals]
  );

  // Lista todos os feriados do mês visualizado
  const monthHolidays = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
    return getHolidaysForYear(viewYear, calConfig).filter((h) =>
      h.date.startsWith(prefix)
    );
  }, [viewYear, viewMonth, calConfig]);

  // Recessos do mês visualizado
  const monthRecesses = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
    return calConfig.recessoDates
      .filter((d) => d.startsWith(prefix))
      .sort();
  }, [viewYear, viewMonth, calConfig.recessoDates]);

  // Sugestões inteligentes de emenda de feriado prolongado (Terça -> emenda Segunda; Quinta -> emenda Sexta)
  const suggestedBridges = useMemo(() => {
    const suggestions: Array<{
      holidayDate: string;
      holidayName: string;
      bridgeDateKey: string;
      bridgeLabel: string;
    }> = [];

    monthHolidays.forEach((h) => {
      if (h.trabalhado) return;
      const d = parseDateKey(h.date);
      const dow = d.getDay();
      if (dow === 2) {
        // Terça-feira -> sugerir Segunda-feira
        const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12, 0, 0);
        const monKey = formatDateKey(mon);
        if (
          calConfig.workingDaysOfWeek.includes(1) &&
          !calConfig.recessoDates.includes(monKey)
        ) {
          suggestions.push({
            holidayDate: h.date,
            holidayName: h.name,
            bridgeDateKey: monKey,
            bridgeLabel: `Emendar Segunda (${String(mon.getDate()).padStart(2, '0')}/${String(mon.getMonth() + 1).padStart(2, '0')}) antes de "${h.name}"`,
          });
        }
      } else if (dow === 4) {
        // Quinta-feira -> sugerir Sexta-feira
        const fri = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12, 0, 0);
        const friKey = formatDateKey(fri);
        if (
          calConfig.workingDaysOfWeek.includes(5) &&
          !calConfig.recessoDates.includes(friKey)
        ) {
          suggestions.push({
            holidayDate: h.date,
            holidayName: h.name,
            bridgeDateKey: friKey,
            bridgeLabel: `Emendar Sexta (${String(fri.getDate()).padStart(2, '0')}/${String(fri.getMonth() + 1).padStart(2, '0')}) após "${h.name}"`,
          });
        }
      }
    });

    return suggestions;
  }, [monthHolidays, calConfig.workingDaysOfWeek, calConfig.recessoDates]);

  // Cidades disponíveis para sugestão na UF selecionada
  const citySuggestionsForUf = useMemo(() => {
    return MUNICIPAL_HOLIDAY_PRESETS.filter((p) => p.uf === calConfig.uf).map(
      (p) => p.city
    );
  }, [calConfig.uf]);

  const hasMunicipalPreset = useMemo(() => {
    const norm = normalizeCityName(calConfig.cidade);
    return MUNICIPAL_HOLIDAY_PRESETS.some(
      (p) => p.uf === calConfig.uf && normalizeCityName(p.city) === norm
    );
  }, [calConfig.uf, calConfig.cidade]);

  // Navegação de Mês
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
  };

  // Ações de Feriados e Recesso
  const toggleWeekday = (dayNum: number) => {
    updateCalendarConfig((prev) => {
      const exists = prev.workingDaysOfWeek.includes(dayNum);
      if (exists && prev.workingDaysOfWeek.length <= 1) {
        return prev; // Garante pelo menos 1 dia útil na semana
      }
      const nextDays = exists
        ? prev.workingDaysOfWeek.filter((d) => d !== dayNum)
        : [...prev.workingDaysOfWeek, dayNum].sort((a, b) => a - b);
      return { ...prev, workingDaysOfWeek: nextDays };
    });
  };

  const handleToggleHolidayWorked = (holiday: CalendarHolidayItem) => {
    updateCalendarConfig((prev) => {
      const nextWorked = !holiday.trabalhado;
      const existingIdx = prev.holidays.findIndex(
        (h) =>
          h.id === holiday.id ||
          (h.date === holiday.date &&
            normalizeCityName(h.name) === normalizeCityName(holiday.name))
      );
      const updatedItem: CalendarHolidayItem = {
        ...holiday,
        trabalhado: nextWorked,
      };
      const nextHolidays = [...prev.holidays];
      if (existingIdx >= 0) {
        nextHolidays[existingIdx] = updatedItem;
      } else {
        nextHolidays.push(updatedItem);
      }

      // Se marcou o feriado como trabalhado e o dia estava marcado como recesso, remove o recesso desse dia
      const nextRecesso = nextWorked
        ? prev.recessoDates.filter((d) => d !== holiday.date)
        : prev.recessoDates;

      return {
        ...prev,
        holidays: nextHolidays,
        recessoDates: nextRecesso,
      };
    });
  };

  const handleDeleteHoliday = (holiday: CalendarHolidayItem) => {
    updateCalendarConfig((prev) => {
      const nextHolidays = prev.holidays.filter(
        (h) =>
          h.id !== holiday.id &&
          !(
            h.date === holiday.date &&
            normalizeCityName(h.name) === normalizeCityName(holiday.name)
          )
      );
      const nextRemoved = [...(prev.removedHolidayKeys || [])];
      if (!holiday.isCustom) {
        const key = makeAutoHolidayKey(holiday.date, holiday.name);
        if (!nextRemoved.includes(key)) nextRemoved.push(key);
      }
      return {
        ...prev,
        holidays: nextHolidays,
        removedHolidayKeys: nextRemoved,
      };
    });
  };

  const handleToggleRecess = (dateKey: string, customNote?: string) => {
    updateCalendarConfig((prev) => {
      const exists = prev.recessoDates.includes(dateKey);
      const nextRecesso = exists
        ? prev.recessoDates.filter((d) => d !== dateKey)
        : [...prev.recessoDates, dateKey].sort();
      const nextNotes = { ...(prev.recessoNotes || {}) };
      if (exists) {
        delete nextNotes[dateKey];
      } else if (customNote && customNote.trim()) {
        nextNotes[dateKey] = customNote.trim().toUpperCase();
      } else {
        nextNotes[dateKey] = 'RECESSO / FERIADO PROLONGADO';
      }
      // Se marcou recesso, remove de extraWorkingDates se existir
      const nextExtra = exists
        ? prev.extraWorkingDates || []
        : (prev.extraWorkingDates || []).filter((d) => d !== dateKey);

      return {
        ...prev,
        recessoDates: nextRecesso,
        recessoNotes: nextNotes,
        extraWorkingDates: nextExtra,
      };
    });
  };

  const handleSaveRecessNote = (dateKey: string, note: string) => {
    updateCalendarConfig((prev) => ({
      ...prev,
      recessoNotes: {
        ...(prev.recessoNotes || {}),
        [dateKey]: note.trim().toUpperCase() || 'RECESSO / FERIADO PROLONGADO',
      },
    }));
  };

  const handleToggleExtraWorkingDay = (dateKey: string) => {
    updateCalendarConfig((prev) => {
      const current = prev.extraWorkingDates || [];
      const exists = current.includes(dateKey);
      const nextExtra = exists
        ? current.filter((d) => d !== dateKey)
        : [...current, dateKey];
      const nextRecesso = exists
        ? prev.recessoDates
        : prev.recessoDates.filter((d) => d !== dateKey);
      return {
        ...prev,
        extraWorkingDates: nextExtra,
        recessoDates: nextRecesso,
      };
    });
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) return;
    const item: CalendarHolidayItem = {
      id: `hol-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: newHolidayDate,
      name: newHolidayName.trim(),
      scope: newHolidayScope,
      uf: newHolidayScope === 'estadual' || newHolidayScope === 'municipal' ? calConfig.uf : undefined,
      city: newHolidayScope === 'municipal' ? calConfig.cidade : undefined,
      trabalhado: newHolidayTrabalhado,
      isCustom: true,
    };
    updateCalendarConfig((prev) => ({
      ...prev,
      holidays: [...prev.holidays, item],
      recessoDates: newHolidayTrabalhado
        ? prev.recessoDates.filter((d) => d !== newHolidayDate)
        : prev.recessoDates,
    }));
    setNewHolidayName('');
    setNewHolidayTrabalhado(false);
    setIsNewHolidayModalOpen(false);
  };

  const selectedCell = useMemo(() => {
    if (!selectedDateKey) return null;
    for (const w of grid.weeks) {
      const found = w.cells.find((c) => c.dateKey === selectedDateKey);
      if (found) return found;
    }
    return null;
  }, [selectedDateKey, grid]);

  const openDayModal = (dateKey: string, existingNote?: string) => {
    setSelectedDateKey(dateKey);
    setRecessNoteDraft(existingNote || '');
    setNewHolidayDate(dateKey);
    setNewHolidayName('');
    setNewHolidayScope('municipal');
    setNewHolidayTrabalhado(false);
  };

  const diffDailyVsBase =
    grid.avgDailyTargetInWorkingDays - (goals.metaDiaria || 0);

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div className="flex items-start gap-3">
          <span className="p-2 bg-neutral-900 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-neutral-950 tracking-tight leading-tight">
              Calendário de Feriados, Recessos & Redistribuição de Metas
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              Defina feriados <strong>nacionais, estaduais e municipais</strong>, marque quais serão{' '}
              <strong>trabalhados</strong> ou <strong>recesso (feriado prolongado)</strong>. A meta diária, semanal e mensal é recalculada automaticamente.
            </p>
          </div>
        </div>

        {/* Switch Principal: Aplicar Calendário nas Metas */}
        <div className="flex items-center justify-between sm:justify-end gap-3 bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 shrink-0">
          <div className="text-left">
            <span className="text-xs font-bold text-neutral-900 block">
              Recálculo Automático
            </span>
            <span className="text-[10px] text-neutral-500 block">
              {calConfig.applyToGoals
                ? 'Ativo nas metas e gráficos'
                : 'Desativado (usando metas fixas)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              updateCalendarConfig((prev) => ({
                ...prev,
                applyToGoals: !prev.applyToGoals,
              }))
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              calConfig.applyToGoals ? 'bg-emerald-600' : 'bg-neutral-300'
            }`}
            aria-label="Ativar ou desativar recálculo automático"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                calConfig.applyToGoals ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Painel de Configuração Regional, Dias Úteis e Modo de Redistribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 bg-neutral-50/80 border border-neutral-200 rounded-xl p-3.5 sm:p-4">
        {/* Localidade (Estado + Município) */}
        <div className="lg:col-span-4 space-y-2">
          <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-600" />
            Localidade (Feriados Estaduais e Municipais)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={calConfig.uf}
              onChange={(e) => {
                const nextUf = e.target.value;
                const firstPreset = MUNICIPAL_HOLIDAY_PRESETS.find(
                  (p) => p.uf === nextUf
                );
                updateCalendarConfig((prev) => ({
                  ...prev,
                  uf: nextUf,
                  cidade: firstPreset ? firstPreset.city : prev.cidade,
                }));
              }}
              className="col-span-1 px-2.5 py-2 text-xs font-bold bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              {BRAZIL_UFS.map((item) => (
                <option key={item.uf} value={item.uf}>
                  {item.uf}
                </option>
              ))}
            </select>

            <div className="col-span-2 relative">
              <input
                type="text"
                list="municipal-cities-list"
                value={calConfig.cidade}
                onChange={(e) =>
                  updateCalendarConfig((prev) => ({
                    ...prev,
                    cidade: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="Digite o município..."
                className="w-full px-2.5 py-2 text-xs font-semibold bg-white border border-neutral-300 rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <datalist id="municipal-cities-list">
                {citySuggestionsForUf.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <p className="text-[10px] text-neutral-500">
            {hasMunicipalPreset
              ? `Feriados municipais de ${calConfig.cidade}/${calConfig.uf} carregados automaticamente.`
              : `Feriados estaduais de ${calConfig.uf} ativos. Adicione os feriados municipais de ${calConfig.cidade || 'sua cidade'} no botão "+ Adicionar Feriado".`}
          </p>
        </div>

        {/* Dias Úteis da Semana */}
        <div className="lg:col-span-4 space-y-2">
          <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            Dias de Operação na Semana ({calConfig.workingDaysOfWeek.length}d/sem)
          </label>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((w) => {
              const active = calConfig.workingDaysOfWeek.includes(w.day);
              return (
                <button
                  key={w.day}
                  type="button"
                  onClick={() => toggleWeekday(w.day)}
                  title={`${w.full}: clique para alternar dia útil`}
                  className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all border ${
                    active
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                      : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {w.short}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-neutral-500">
            Clique nos dias da semana em que o lava-jato funciona normalmente.
          </p>
        </div>

        {/* Regra de Redistribuição */}
        <div className="lg:col-span-4 space-y-2">
          <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
            Regra de Redistribuição da Meta
          </label>
          <select
            value={calConfig.redistributeMode}
            onChange={(e) =>
              updateCalendarConfig((prev) => ({
                ...prev,
                redistributeMode: e.target.value as GoalRedistributeMode,
              }))
            }
            className="w-full px-2.5 py-2 text-xs font-semibold bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="mensal_para_dias_uteis">
              Redistribuir Meta Mensal nos dias úteis ativos
            </option>
            <option value="semanal_para_dias_uteis">
              Redistribuir Meta Semanal na própria semana
            </option>
            <option value="proporcional_dias_uteis">
              Manter Meta Diária fixa (reduzir semana/mês)
            </option>
          </select>
          <p className="text-[10px] text-neutral-500 leading-snug">
            {calConfig.redistributeMode === 'mensal_para_dias_uteis' &&
              'Preserva a Meta Mensal e divide igualmente entre os dias trabalhados do mês; cada semana recebe conforme seus dias úteis.'}
            {calConfig.redistributeMode === 'semanal_para_dias_uteis' &&
              'Se uma semana tem feriado prolongado/recesso, divide a Meta Semanal entre os dias úteis restantes dessa mesma semana.'}
            {calConfig.redistributeMode === 'proporcional_dias_uteis' &&
              'Zera a meta nos feriados/recessos e reduz proporcionalmente as metas semanal e mensal.'}
          </p>
        </div>
      </div>

      {/* Cards Resumo do Mês Selecionado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="p-3 sm:p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
            Dias Úteis no Mês
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-neutral-950 tabular-nums">
            {grid.workingDaysCount} dias
          </div>
          <span className="text-[10px] text-neutral-500 block">
            {grid.holidaysWorkedCount > 0
              ? `Inclui ${grid.holidaysWorkedCount} feriado(s) trabalhado(s)`
              : 'Conforme escala semanal'}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
            Feriados Folga / Recessos
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-purple-950 tabular-nums">
            {grid.holidaysFolgaCount + grid.recessCount} dias
          </div>
          <span className="text-[10px] text-purple-700 block">
            {grid.holidaysFolgaCount} feriado(s) · {grid.recessCount} recesso(s)
          </span>
        </div>

        <div className="p-3 sm:p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
            Nova Meta / Dia Útil
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-blue-950 tabular-nums">
            {formatCurrency(grid.avgDailyTargetInWorkingDays)}
          </div>
          <span className="text-[10px] text-blue-700 font-mono block">
            Base: {formatCurrency(goals.metaDiaria)}{' '}
            {calConfig.applyToGoals && Math.abs(diffDailyVsBase) >= 1 && (
              <strong className="ml-1">
                ({diffDailyVsBase >= 0 ? '+' : ''}
                {formatCurrency(diffDailyVsBase)})
              </strong>
            )}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
            Meta do Mês Recalculada
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-950 tabular-nums">
            {formatCurrency(grid.monthTargetValue)}
          </div>
          <span className="text-[10px] text-emerald-700 font-mono block">
            ~{Math.round(grid.monthTargetCount)} veículos previstos
          </span>
        </div>
      </div>

      {/* Sugestões de Emenda de Feriado Prolongado */}
      {suggestedBridges.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2 text-xs text-purple-950">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                Sugestão de Feriado Prolongado / Recesso detectada neste mês:
              </span>
              <span className="text-[11px] text-purple-800">
                Clique para marcar a emenda como recesso e recalcular automaticamente a semana.
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedBridges.map((s) => (
              <button
                key={s.bridgeDateKey}
                type="button"
                onClick={() =>
                  handleToggleRecess(
                    s.bridgeDateKey,
                    `EMENDA / RECESSO (${s.holidayName})`
                  )
                }
                className="px-2.5 py-1.5 text-[11px] font-bold text-purple-900 bg-white hover:bg-purple-100 border border-purple-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
              >
                <Coffee className="w-3.5 h-3.5 text-purple-600" />
                {s.bridgeLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Navegação do Mês + Ação Novo Feriado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 rounded-xl p-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-neutral-700 hover:bg-white rounded-lg transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs sm:text-sm font-extrabold text-neutral-950 capitalize min-w-[140px] text-center">
              {grid.monthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-neutral-700 hover:bg-white rounded-lg transition-colors"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleGoToday}
            className="px-2.5 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            Hoje
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNewHolidayDate(
                `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
              );
              setNewHolidayName('');
              setNewHolidayScope('municipal');
              setNewHolidayTrabalhado(false);
              setIsNewHolidayModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Adicionar Feriado (Mun / Est / Nac)
          </button>
        </div>
      </div>

      {/* Legenda de Cores */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-neutral-400 inline-block" />
          Dia Útil
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          Feriado (Folga · R$ 0)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          Feriado Trabalhado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
          Recesso / Feriado Prolongado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 inline-block" />
          Folga Semanal
        </span>
        <span className="text-neutral-400 ml-auto hidden sm:inline">
          Clique em qualquer dia para programar feriado, recesso ou dia trabalhado
        </span>
      </div>

      {/* GRADE MENSAL DO CALENDÁRIO */}
      <div className="space-y-2">
        {/* Cabeçalho dos dias da semana (Seg a Dom + Meta da Semana no Desktop) */}
        <div className="grid grid-cols-7 lg:grid-cols-8 gap-1.5 text-center">
          {WEEKDAY_LABELS.map((w) => (
            <div
              key={w.day}
              className="py-1.5 text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-100 rounded-lg"
            >
              {w.short}
            </div>
          ))}
          <div className="hidden lg:flex items-center justify-center py-1.5 text-[11px] font-bold text-neutral-700 uppercase tracking-wider bg-neutral-200/70 rounded-lg">
            Meta Semana
          </div>
        </div>

        {/* Semanas */}
        <div className="space-y-2">
          {grid.weeks.map((week) => (
            <div key={week.weekIndex} className="space-y-1.5">
              <div className="grid grid-cols-7 lg:grid-cols-8 gap-1 sm:gap-1.5">
                {week.cells.map((cell) => {
                  const st = cell.schedule.status;
                  const holiday = cell.schedule.primaryHoliday;

                  let cardClasses =
                    'bg-white border-neutral-200 hover:border-neutral-400';
                  if (!cell.inCurrentMonth) {
                    cardClasses =
                      'bg-neutral-50/60 border-neutral-100 opacity-55 hover:opacity-90';
                  } else if (st === 'recesso') {
                    cardClasses =
                      'bg-purple-50 border-purple-300 hover:border-purple-500';
                  } else if (st === 'feriado_folga') {
                    cardClasses =
                      'bg-rose-50 border-rose-300 hover:border-rose-500';
                  } else if (st === 'feriado_trabalhado') {
                    cardClasses =
                      'bg-amber-50 border-amber-300 hover:border-amber-500';
                  } else if (st === 'folga_semanal') {
                    cardClasses =
                      'bg-neutral-100/80 border-neutral-200 hover:border-neutral-400';
                  }

                  const ringToday = cell.isToday
                    ? 'ring-2 ring-blue-600 ring-offset-1'
                    : '';

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() =>
                        openDayModal(cell.dateKey, cell.schedule.recessNote)
                      }
                      className={`text-left border rounded-xl p-1.5 sm:p-2 min-h-[68px] sm:min-h-[86px] flex flex-col justify-between transition-all cursor-pointer ${cardClasses} ${ringToday}`}
                    >
                      {/* Linha superior: Nº do dia + Dot/Badge */}
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span
                          className={`text-xs sm:text-sm font-extrabold font-mono leading-none ${
                            cell.isToday
                              ? 'text-blue-700'
                              : st === 'feriado_folga'
                              ? 'text-rose-800'
                              : st === 'recesso'
                              ? 'text-purple-800'
                              : st === 'feriado_trabalhado'
                              ? 'text-amber-800'
                              : 'text-neutral-900'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {st === 'feriado_folga' && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        )}
                        {st === 'feriado_trabalhado' && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                        {st === 'recesso' && (
                          <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                        )}
                        {cell.schedule.isExtraWorking && st === 'dia_util' && (
                          <span className="text-[8px] font-bold bg-emerald-100 text-emerald-800 px-1 rounded">
                            Extra
                          </span>
                        )}
                      </div>

                      {/* Rótulo do Feriado ou Recesso */}
                      <div className="my-0.5 w-full">
                        {holiday ? (
                          <span
                            className={`text-[9px] sm:text-[10px] font-bold leading-tight line-clamp-2 block ${
                              holiday.trabalhado
                                ? 'text-amber-900'
                                : 'text-rose-800'
                            }`}
                          >
                            {holiday.name}
                          </span>
                        ) : st === 'recesso' ? (
                          <span className="text-[9px] sm:text-[10px] font-bold text-purple-800 leading-tight line-clamp-2 block">
                            Recesso
                          </span>
                        ) : st === 'folga_semanal' ? (
                          <span className="text-[9px] text-neutral-400 hidden sm:block">
                            Folga semanal
                          </span>
                        ) : null}
                      </div>

                      {/* Meta Recalculada do Dia */}
                      <div className="w-full pt-0.5 border-t border-black/5">
                        {cell.schedule.isWorkingDay ? (
                          <span
                            className={`text-[9px] sm:text-[10px] font-mono font-bold block truncate tabular-nums ${
                              st === 'feriado_trabalhado'
                                ? 'text-amber-900'
                                : 'text-neutral-800'
                            }`}
                          >
                            {cell.targetValue >= 1000
                              ? `R$${(cell.targetValue / 1000).toFixed(1)}k`
                              : `R$${Math.round(cell.targetValue)}`}
                          </span>
                        ) : (
                          <span
                            className={`text-[9px] font-mono font-semibold block truncate ${
                              st === 'recesso'
                                ? 'text-purple-700'
                                : st === 'feriado_folga'
                                ? 'text-rose-700'
                                : 'text-neutral-400'
                            }`}
                          >
                            {st === 'recesso'
                              ? 'R$ 0'
                              : st === 'feriado_folga'
                              ? 'Folga'
                              : '—'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Coluna 8 (Desktop): Resumo da Meta Recalculada da Semana */}
                <div
                  className={`hidden lg:flex flex-col justify-between rounded-xl p-2 border ${
                    week.hasHolidayOrRecess
                      ? 'bg-purple-50/70 border-purple-200'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-neutral-500 font-mono">
                      {week.dateRangeLabel}
                    </span>
                    {week.hasHolidayOrRecess && (
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-purple-100 text-purple-800">
                        Ajustada
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-black font-mono text-neutral-950 tabular-nums">
                    {formatCurrency(week.weekTargetValue)}
                  </div>
                  <div className="text-[10px] text-neutral-600 font-mono flex items-center justify-between">
                    <span>{week.workingDaysCount}d úteis</span>
                    <span>~{Math.round(week.weekTargetCount)}v</span>
                  </div>
                </div>
              </div>

              {/* Barra Resumo da Semana no Celular / Tablet (< lg) */}
              <div
                className={`lg:hidden flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] border ${
                  week.hasHolidayOrRecess
                    ? 'bg-purple-50/80 border-purple-200 text-purple-950'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                }`}
              >
                <span className="font-mono font-semibold">
                  Semana {week.dateRangeLabel} · {week.workingDaysCount} dias úteis
                  {week.hasHolidayOrRecess && ' (Recalculada)'}
                </span>
                <span className="font-mono font-black tabular-nums">
                  {formatCurrency(week.weekTargetValue)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de Feriados e Recessos do Mês com Alternância Rápida */}
      <div className="border-t border-neutral-100 pt-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-neutral-700" />
            Feriados & Recessos em {grid.monthLabel} ({monthHolidays.length + monthRecesses.length})
          </h3>
          <span className="text-[11px] text-neutral-500">
            Altere com 1 clique se haverá expediente ou folga em cada feriado.
          </span>
        </div>

        {monthHolidays.length === 0 && monthRecesses.length === 0 ? (
          <div className="text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-center">
            Nenhum feriado ou recesso programado para {grid.monthLabel}. Clique em qualquer dia do calendário ou no botão{' '}
            <strong>"Adicionar Feriado"</strong> para programar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {monthHolidays.map((h) => {
              const dObj = parseDateKey(h.date);
              const dowLabel = dObj.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              });
              const scopeStyle = SCOPE_META[h.scope] || SCOPE_META.personalizado;
              return (
                <div
                  key={h.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-colors ${
                    h.trabalhado
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-mono font-bold text-neutral-900 capitalize">
                        {dowLabel}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${scopeStyle.badgeClass}`}
                      >
                        {scopeStyle.label}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      {h.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleHolidayWorked(h)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        h.trabalhado
                          ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
                          : 'bg-white text-rose-800 border-rose-300 hover:bg-rose-100'
                      }`}
                    >
                      {h.trabalhado ? '✓ Trabalhado' : 'Folga (R$ 0)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHoliday(h)}
                      title="Remover este feriado"
                      className="p-1.5 text-neutral-400 hover:text-rose-700 hover:bg-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {monthRecesses.map((dateKey) => {
              const dObj = parseDateKey(dateKey);
              const dowLabel = dObj.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              });
              const note =
                calConfig.recessoNotes?.[dateKey] ||
                'RECESSO / FERIADO PROLONGADO';
              return (
                <div
                  key={`rec-${dateKey}`}
                  className="p-3 rounded-xl border bg-purple-50/70 border-purple-200 flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-mono font-bold text-neutral-900 capitalize">
                        {dowLabel}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-purple-100 text-purple-800 border-purple-200">
                        Recesso / Prolongado
                      </span>
                    </div>
                    <p className="text-xs font-bold text-purple-950 truncate">
                      {note}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleRecess(dateKey)}
                    className="px-2.5 py-1.5 text-[11px] font-bold text-purple-900 bg-white hover:bg-purple-100 border border-purple-300 rounded-lg transition-colors shrink-0"
                  >
                    Remover Recesso
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="flex items-start gap-2 text-[11px] text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-xl p-3">
        <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Como funciona na prática:</strong> ao marcar um feriado como <em>Folga</em> ou um dia útil como <em>Recesso (Feriado Prolongado)</em>, a meta daquele dia vai para <strong>R$ 0,00</strong> e a diferença é redistribuída automaticamente nos dias úteis conforme a regra selecionada acima — atualizando também os gráficos de atingimento e as semanas que tiveram feriado prolongado.
        </p>
      </div>

      {/* MODAL DO DIA SELECIONADO */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Programação do Dia
                </span>
                <h3 className="text-base font-extrabold text-neutral-950 capitalize">
                  {selectedCell.date.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateKey(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Meta Calculada Atual do Dia */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Meta Recalculada deste Dia
                </span>
                <span className="text-xl font-black font-mono text-neutral-950 tabular-nums">
                  {formatCurrency(selectedCell.targetValue)}
                </span>
                <span className="text-[11px] text-neutral-500 ml-2 font-mono">
                  ({Math.round(selectedCell.targetCount)} veículos)
                </span>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  selectedCell.schedule.isWorkingDay
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-neutral-200 text-neutral-700'
                }`}
              >
                {selectedCell.schedule.isWorkingDay ? 'Dia Útil Ativo' : 'Sem Expediente'}
              </span>
            </div>

            {/* 1. Feriados já existentes nesta data */}
            {selectedCell.schedule.holidays.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-800 block">
                  Feriado(s) nesta data:
                </span>
                {selectedCell.schedule.holidays.map((h) => {
                  const scopeStyle = SCOPE_META[h.scope] || SCOPE_META.personalizado;
                  return (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl border border-neutral-200 bg-white space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block mb-1 ${scopeStyle.badgeClass}`}
                          >
                            {scopeStyle.label}
                          </span>
                          <p className="text-xs font-bold text-neutral-950">
                            {h.name}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteHoliday(h)}
                          className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                          title="Excluir feriado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (h.trabalhado) handleToggleHolidayWorked(h);
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                            !h.trabalhado
                              ? 'bg-rose-600 text-white border-rose-700'
                              : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          Folga no Feriado (R$ 0)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!h.trabalhado) handleToggleHolidayWorked(h);
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                            h.trabalhado
                              ? 'bg-amber-600 text-white border-amber-700'
                              : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          Feriado Trabalhado
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Recesso / Feriado Prolongado */}
            <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-purple-600" />
                    Recesso / Feriado Prolongado
                  </span>
                  <span className="text-[11px] text-purple-800 block">
                    Fecha o dia (meta R$ 0) e redistribui a meta nos demais dias úteis.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleToggleRecess(selectedCell.dateKey, recessNoteDraft)
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 transition-colors ${
                    selectedCell.schedule.isRecess
                      ? 'bg-purple-700 text-white border-purple-800 hover:bg-purple-800'
                      : 'bg-white text-purple-900 border-purple-300 hover:bg-purple-100'
                  }`}
                >
                  {selectedCell.schedule.isRecess ? '✓ Recesso Ativo' : 'Marcar Recesso'}
                </button>
              </div>

              {selectedCell.schedule.isRecess && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recessNoteDraft}
                    onChange={(e) => setRecessNoteDraft(e.target.value)}
                    placeholder="Ex: Emenda Corpus Christi"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-purple-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveRecessNote(selectedCell.dateKey, recessNoteDraft)
                    }
                    className="px-3 py-1.5 text-xs font-bold bg-purple-900 text-white rounded-lg hover:bg-purple-800"
                  >
                    Salvar Nota
                  </button>
                </div>
              )}
            </div>

            {/* 3. Dia Extra (caso seja fim de semana/folga semanal sem feriado) */}
            {!selectedCell.schedule.isStandardWorkingWeekday &&
              !selectedCell.schedule.isRecess &&
              selectedCell.schedule.holidays.length === 0 && (
                <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">
                      Expediente Extraordinário (Fim de Semana / Folga)
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Ative caso haja plantão ou operação especial neste dia.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleExtraWorkingDay(selectedCell.dateKey)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 ${
                      selectedCell.schedule.isExtraWorking
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100'
                    }`}
                  >
                    {selectedCell.schedule.isExtraWorking
                      ? '✓ Dia Trabalhado'
                      : 'Trabalhar neste dia'}
                  </button>
                </div>
              )}

            {/* 4. Adicionar Feriado Municipal/Estadual/Nacional rápido neste dia */}
            <form
              onSubmit={(e) => {
                handleAddHoliday(e);
              }}
              className="p-3.5 rounded-xl border border-neutral-200 bg-white space-y-2.5"
            >
              <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-neutral-700" />
                Cadastrar Feriado nesta Data
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="Nome do feriado..."
                  className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg"
                />
                <select
                  value={newHolidayScope}
                  onChange={(e) =>
                    setNewHolidayScope(e.target.value as HolidayScope)
                  }
                  className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="municipal">Municipal ({calConfig.cidade || 'Cidade'})</option>
                  <option value="estadual">Estadual ({calConfig.uf})</option>
                  <option value="nacional">Nacional</option>
                  <option value="ponto_facultativo">Ponto Facultativo</option>
                  <option value="personalizado">Personalizado / Interno</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHolidayTrabalhado}
                    onChange={(e) => setNewHolidayTrabalhado(e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  <span>Feriado será trabalhado</span>
                </label>
                <button
                  type="submit"
                  disabled={!newHolidayName.trim()}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 rounded-lg flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Incluir Feriado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GERAL: ADICIONAR FERIADO */}
      {isNewHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <form
            onSubmit={handleAddHoliday}
            className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-extrabold text-neutral-950 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-800" />
                Adicionar Feriado ao Calendário
              </h3>
              <button
                type="button"
                onClick={() => setIsNewHolidayModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-900 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Nome do Feriado
                </label>
                <input
                  type="text"
                  required
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="Ex: Aniversário da Cidade / Padroeiro"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Esfera / Tipo
                </label>
                <select
                  value={newHolidayScope}
                  onChange={(e) =>
                    setNewHolidayScope(e.target.value as HolidayScope)
                  }
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="municipal">
                    Municipal ({calConfig.cidade || 'Município'})
                  </option>
                  <option value="estadual">Estadual ({calConfig.uf})</option>
                  <option value="nacional">Nacional</option>
                  <option value="ponto_facultativo">Ponto Facultativo</option>
                  <option value="personalizado">Personalizado / Empresa</option>
                </select>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHolidayTrabalhado}
                    onChange={(e) => setNewHolidayTrabalhado(e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  <span>Este feriado será trabalhado normalmente</span>
                </label>
                <p className="text-[10px] text-neutral-500 mt-1 ml-5">
                  Se desmarcado, o dia entra como folga (meta R$ 0) e a meta é redistribuída.
                </p>
              </div>

              {calConfig.removedHolidayKeys && calConfig.removedHolidayKeys.length > 0 && (
                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {calConfig.removedHolidayKeys.length} feriado(s) padrão ocultado(s)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateCalendarConfig((prev) => ({
                        ...prev,
                        removedHolidayKeys: [],
                      }))
                    }
                    className="font-bold text-neutral-800 underline"
                  >
                    Restaurar padrão
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsNewHolidayModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Salvar Feriado
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
