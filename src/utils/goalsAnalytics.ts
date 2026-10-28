import { ServiceLaunch, GoalsConfig } from '../types';
import { parseLaunchDate, getLaunchValue, formatCurrency } from './storage';

export type MetricType = 'valor' | 'quantidade';
export type ChartViewMode = 'dias' | 'semanas' | 'meses' | 'medias';

export interface DailyGoalItem {
  date: Date;
  dateStr: string;
  dayLabel: string;
  shortDate: string;
  actualValue: number;
  actualCount: number;
  targetValue: number;
  targetCount: number;
  isAchieved: boolean;
  pct: number;
  difference: number;
  isToday: boolean;
}

export interface WeeklyGoalItem {
  weekKey: string;
  weekLabel: string;
  startDate: Date;
  endDate: Date;
  dateRangeLabel: string;
  actualValue: number;
  actualCount: number;
  dailyAverageValue: number;
  dailyAverageCount: number;
  targetValue: number;
  targetCount: number;
  isAchieved: boolean;
  pct: number;
  difference: number;
  isCurrentWeek: boolean;
}

export interface MonthlyGoalItem {
  monthKey: string;
  monthLabel: string;
  shortLabel: string;
  year: number;
  monthIndex: number;
  daysInMonth: number;
  daysPassed: number;
  actualValue: number;
  actualCount: number;
  dailyAverageValue: number;
  dailyAverageCount: number;
  weeklyAverageValue: number;
  weeklyAverageCount: number;
  targetValue: number;
  targetCount: number;
  isAchieved: boolean;
  pct: number;
  isCurrentMonth: boolean;
}

export interface GoalsAnalyticsSummary {
  // Médias
  mediaDiariaMesAtual: number;
  mediaDiariaMesAtualQtd: number;
  mediaSemanalMesAtual: number;
  mediaSemanalMesAtualQtd: number;
  mediaDiariaGeral: number;
  mediaSemanalGeral: number;
  // Desempenho de Metas Atingidas
  diasAtingidosCount: number;
  totalDiasAvaliados: number;
  taxaAtingimentoDias: number;
  semanasAtingidasCount: number;
  totalSemanasAvaliadas: number;
  taxaAtingimentoSemanas: number;
  mesesAtingidosCount: number;
  totalMesesAvaliados: number;
}

export interface GoalsAnalyticsResult {
  dailyItems: DailyGoalItem[];
  weeklyItems: WeeklyGoalItem[];
  monthlyItems: MonthlyGoalItem[];
  summary: GoalsAnalyticsSummary;
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Retorna os dados analíticos completos para o gráfico de metas e médias
 */
export function computeGoalsAnalytics(
  launches: ServiceLaunch[],
  goals: GoalsConfig,
  options: {
    daysRange?: number; // 7, 14, 30
    weeksRange?: number; // 4, 8, 12
    monthsRange?: number; // 6, 12
    referenceDate?: Date;
  } = {}
): GoalsAnalyticsResult {
  const refDate = options.referenceDate || new Date();
  const daysRange = options.daysRange || 14;
  const weeksRange = options.weeksRange || 6;
  const monthsRange = options.monthsRange || 6;

  // Normaliza data de referência para meia-noite
  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0);

  // 1. DIAS: Mapeamento de cada dia no intervalo
  const dailyMap = new Map<string, {
    date: Date;
    actualValue: number;
    actualCount: number;
    isToday: boolean;
  }>();

  for (let i = daysRange - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dailyMap.set(key, {
      date: d,
      actualValue: 0,
      actualCount: 0,
      isToday: i === 0,
    });
  }

  // 2. SEMANAS: Mapeamento das últimas N semanas (Segunda a Domingo)
  // Encontra a segunda-feira da semana de referência
  const refDayOfWeek = refDate.getDay();
  const diffToMonday = refDayOfWeek === 0 ? -6 : 1 - refDayOfWeek;
  const currentWeekMonday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + diffToMonday, 0, 0, 0);

  const weeklyMap = new Map<string, {
    startDate: Date;
    endDate: Date;
    weekLabel: string;
    actualValue: number;
    actualCount: number;
    isCurrentWeek: boolean;
  }>();

  for (let w = weeksRange - 1; w >= 0; w--) {
    const start = new Date(currentWeekMonday);
    start.setDate(currentWeekMonday.getDate() - w * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const weekKey = `${start.getFullYear()}-W${getWeekNumber(start)}`;
    const startStr = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
    const endStr = `${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}`;
    
    weeklyMap.set(weekKey, {
      startDate: start,
      endDate: end,
      weekLabel: w === 0 ? 'Semana Atual' : `Semana ${getWeekNumber(start)}`,
      actualValue: 0,
      actualCount: 0,
      isCurrentWeek: w === 0,
    });
  }

  // 3. MESES: Mapeamento dos últimos N meses
  const monthlyMap = new Map<string, {
    year: number;
    monthIndex: number;
    actualValue: number;
    actualCount: number;
    isCurrentMonth: boolean;
  }>();

  for (let m = monthsRange - 1; m >= 0; m--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - m, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(monthKey, {
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      actualValue: 0,
      actualCount: 0,
      isCurrentMonth: m === 0,
    });
  }

  // Agrega todos os lançamentos
  launches.forEach((l) => {
    const lDate = parseLaunchDate(l.dataHora);
    if (!lDate) return;
    const val = getLaunchValue(l);

    // Diário
    const dayKey = `${lDate.getFullYear()}-${String(lDate.getMonth() + 1).padStart(2, '0')}-${String(lDate.getDate()).padStart(2, '0')}`;
    if (dailyMap.has(dayKey)) {
      const item = dailyMap.get(dayKey)!;
      item.actualValue += val;
      item.actualCount += 1;
    }

    // Semanal
    const lTime = lDate.getTime();
    for (const [, wItem] of weeklyMap.entries()) {
      if (lTime >= wItem.startDate.getTime() && lTime <= wItem.endDate.getTime()) {
        wItem.actualValue += val;
        wItem.actualCount += 1;
        break;
      }
    }

    // Mensal
    const mKey = `${lDate.getFullYear()}-${String(lDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyMap.has(mKey)) {
      const mItem = monthlyMap.get(mKey)!;
      mItem.actualValue += val;
      mItem.actualCount += 1;
    }
  });

  // Constrói DailyGoalItem[]
  let daysAchieved = 0;
  let evaluatedDays = 0;
  const dailyItems: DailyGoalItem[] = Array.from(dailyMap.entries()).map(([key, item]) => {
    const targetVal = goals.metaDiaria || 0;
    const targetQtd = goals.metaDiariaQtd || 0;
    // Considera atingida se bateu meta de valor (ou meta de veículos se valor for 0)
    const isAchieved = targetVal > 0 ? item.actualValue >= targetVal : item.actualCount >= targetQtd;
    const pct = targetVal > 0 ? Math.round((item.actualValue / targetVal) * 100) : 0;
    
    // Contabiliza para estatística se o dia já passou ou se teve lançamento
    if (item.actualValue > 0 || !item.isToday) {
      evaluatedDays++;
      if (isAchieved && (item.actualValue > 0 || targetVal === 0)) {
        daysAchieved++;
      }
    }

    const dayOfWeek = item.date.getDay();
    const dayLabel = DAY_NAMES[dayOfWeek];
    const shortDate = `${String(item.date.getDate()).padStart(2, '0')}/${String(item.date.getMonth() + 1).padStart(2, '0')}`;

    return {
      date: item.date,
      dateStr: key,
      dayLabel,
      shortDate,
      actualValue: item.actualValue,
      actualCount: item.actualCount,
      targetValue: targetVal,
      targetCount: targetQtd,
      isAchieved,
      pct,
      difference: item.actualValue - targetVal,
      isToday: item.isToday,
    };
  });

  // Constrói WeeklyGoalItem[]
  let weeksAchieved = 0;
  let evaluatedWeeks = 0;
  const weeklyItems: WeeklyGoalItem[] = Array.from(weeklyMap.entries()).map(([key, item]) => {
    const targetVal = goals.metaSemanal || 0;
    const targetQtd = goals.metaSemanalQtd || 0;
    const isAchieved = targetVal > 0 ? item.actualValue >= targetVal : item.actualCount >= targetQtd;
    const pct = targetVal > 0 ? Math.round((item.actualValue / targetVal) * 100) : 0;

    // Dias decorridos na semana
    let daysInWeek = 7;
    if (item.isCurrentWeek) {
      const currentDay = refDate.getDay();
      daysInWeek = currentDay === 0 ? 7 : currentDay;
    }
    const dailyAvg = daysInWeek > 0 ? item.actualValue / daysInWeek : 0;
    const dailyAvgQtd = daysInWeek > 0 ? item.actualCount / daysInWeek : 0;

    if (item.actualValue > 0 || !item.isCurrentWeek) {
      evaluatedWeeks++;
      if (isAchieved && (item.actualValue > 0 || targetVal === 0)) {
        weeksAchieved++;
      }
    }

    const startStr = `${String(item.startDate.getDate()).padStart(2, '0')}/${String(item.startDate.getMonth() + 1).padStart(2, '0')}`;
    const endStr = `${String(item.endDate.getDate()).padStart(2, '0')}/${String(item.endDate.getMonth() + 1).padStart(2, '0')}`;

    return {
      weekKey: key,
      weekLabel: item.weekLabel,
      startDate: item.startDate,
      endDate: item.endDate,
      dateRangeLabel: `${startStr} a ${endStr}`,
      actualValue: item.actualValue,
      actualCount: item.actualCount,
      dailyAverageValue: dailyAvg,
      dailyAverageCount: dailyAvgQtd,
      targetValue: targetVal,
      targetCount: targetQtd,
      isAchieved,
      pct,
      difference: item.actualValue - targetVal,
      isCurrentWeek: item.isCurrentWeek,
    };
  });

  // Constrói MonthlyGoalItem[]
  let monthsAchieved = 0;
  const monthlyItems: MonthlyGoalItem[] = Array.from(monthlyMap.entries()).map(([key, item]) => {
    const targetVal = goals.metaMensal || 0;
    const targetQtd = goals.metaMensalQtd || 0;
    const isAchieved = targetVal > 0 ? item.actualValue >= targetVal : item.actualCount >= targetQtd;
    const pct = targetVal > 0 ? Math.round((item.actualValue / targetVal) * 100) : 0;

    const daysInMonth = new Date(item.year, item.monthIndex + 1, 0).getDate();
    const daysPassed = item.isCurrentMonth ? Math.max(1, refDate.getDate()) : daysInMonth;

    const dailyAvgVal = daysPassed > 0 ? item.actualValue / daysPassed : 0;
    const dailyAvgCount = daysPassed > 0 ? item.actualCount / daysPassed : 0;

    const weeksInPeriod = daysPassed / 7;
    const weeklyAvgVal = weeksInPeriod > 0 ? item.actualValue / weeksInPeriod : 0;
    const weeklyAvgCount = weeksInPeriod > 0 ? item.actualCount / weeksInPeriod : 0;

    if (isAchieved && (item.actualValue > 0 || targetVal === 0)) {
      monthsAchieved++;
    }

    return {
      monthKey: key,
      monthLabel: `${MONTH_NAMES[item.monthIndex]} ${item.year}`,
      shortLabel: `${MONTH_SHORT[item.monthIndex]}/${String(item.year).slice(-2)}`,
      year: item.year,
      monthIndex: item.monthIndex,
      daysInMonth,
      daysPassed,
      actualValue: item.actualValue,
      actualCount: item.actualCount,
      dailyAverageValue: dailyAvgVal,
      dailyAverageCount: dailyAvgCount,
      weeklyAverageValue: weeklyAvgVal,
      weeklyAverageCount: weeklyAvgCount,
      targetValue: targetVal,
      targetCount: targetQtd,
      isAchieved,
      pct,
      isCurrentMonth: item.isCurrentMonth,
    };
  });

  // Mês atual
  const currentMonthItem = monthlyItems.find((m) => m.isCurrentMonth) || monthlyItems[monthlyItems.length - 1];
  const mediaDiariaMesAtual = currentMonthItem ? currentMonthItem.dailyAverageValue : 0;
  const mediaDiariaMesAtualQtd = currentMonthItem ? currentMonthItem.dailyAverageCount : 0;
  const mediaSemanalMesAtual = currentMonthItem ? currentMonthItem.weeklyAverageValue : 0;
  const mediaSemanalMesAtualQtd = currentMonthItem ? currentMonthItem.weeklyAverageCount : 0;

  // Média semanal geral dos últimos meses
  const totalMonthsVal = monthlyItems.reduce((acc, m) => acc + m.actualValue, 0);
  const totalMonthsWeeks = monthlyItems.reduce((acc, m) => acc + (m.daysPassed / 7), 0);
  const mediaSemanalGeral = totalMonthsWeeks > 0 ? totalMonthsVal / totalMonthsWeeks : 0;

  const totalDaysPassed = monthlyItems.reduce((acc, m) => acc + m.daysPassed, 0);
  const mediaDiariaGeral = totalDaysPassed > 0 ? totalMonthsVal / totalDaysPassed : 0;

  const summary: GoalsAnalyticsSummary = {
    mediaDiariaMesAtual,
    mediaDiariaMesAtualQtd,
    mediaSemanalMesAtual,
    mediaSemanalMesAtualQtd,
    mediaDiariaGeral,
    mediaSemanalGeral,
    diasAtingidosCount: daysAchieved,
    totalDiasAvaliados: Math.max(1, evaluatedDays),
    taxaAtingimentoDias: evaluatedDays > 0 ? Math.round((daysAchieved / evaluatedDays) * 100) : 0,
    semanasAtingidasCount: weeksAchieved,
    totalSemanasAvaliadas: Math.max(1, evaluatedWeeks),
    taxaAtingimentoSemanas: evaluatedWeeks > 0 ? Math.round((weeksAchieved / evaluatedWeeks) * 100) : 0,
    mesesAtingidosCount: monthsAchieved,
    totalMesesAvaliados: monthlyItems.length,
  };

  return {
    dailyItems,
    weeklyItems,
    monthlyItems,
    summary,
  };
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
