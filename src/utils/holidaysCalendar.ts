import {
  CalendarHolidayItem,
  GoalRedistributeMode,
  GoalsCalendarConfig,
  GoalsConfig,
  HolidayScope,
} from '../types';

export const BRAZIL_UFS: Array<{ uf: string; name: string }> = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
];

export const STATE_HOLIDAYS_BY_UF: Record<
  string,
  Array<{ month: number; day: number; name: string }>
> = {
  AC: [
    { month: 1, day: 23, name: 'Dia do Evangélico (AC)' },
    { month: 3, day: 8, name: 'Dia Internacional da Mulher (AC)' },
    { month: 6, day: 15, name: 'Aniversário do Acre' },
    { month: 9, day: 5, name: 'Dia da Amazônia (AC)' },
    { month: 11, day: 17, name: 'Assinatura do Tratado de Petrópolis (AC)' },
  ],
  AL: [
    { month: 6, day: 24, name: 'São João (AL)' },
    { month: 6, day: 29, name: 'São Pedro (AL)' },
    { month: 9, day: 16, name: 'Emancipação Política de Alagoas' },
  ],
  AP: [
    { month: 3, day: 19, name: 'Dia de São José (AP)' },
    { month: 9, day: 13, name: 'Criação do Território Federal (AP)' },
  ],
  AM: [
    { month: 9, day: 5, name: 'Elevação do Amazonas à Categoria de Província' },
    { month: 12, day: 8, name: 'Nossa Senhora da Conceição (AM)' },
  ],
  BA: [{ month: 7, day: 2, name: 'Independência da Bahia' }],
  CE: [
    { month: 3, day: 19, name: 'Dia de São José (CE)' },
    { month: 3, day: 25, name: 'Data Magna do Ceará (Abolição)' },
  ],
  DF: [{ month: 11, day: 30, name: 'Dia do Evangélico (DF)' }],
  ES: [{ month: 5, day: 23, name: 'Colonização do Solo Espírito-Santense' }],
  GO: [{ month: 10, day: 24, name: 'Pedra Fundamental de Goiânia (GO)' }],
  MA: [{ month: 7, day: 28, name: 'Adesão do Maranhão à Independência' }],
  MT: [{ month: 11, day: 20, name: 'Dia da Consciência Negra (MT)' }],
  MS: [{ month: 10, day: 11, name: 'Criação do Estado de Mato Grosso do Sul' }],
  MG: [{ month: 4, day: 21, name: 'Data Magna de Minas Gerais (Tiradentes)' }],
  PA: [{ month: 8, day: 15, name: 'Adesão do Grão-Pará à Independência' }],
  PB: [{ month: 8, day: 5, name: 'Fundação do Estado da Paraíba' }],
  PR: [{ month: 12, day: 19, name: 'Emancipação Política do Paraná' }],
  PE: [
    { month: 3, day: 6, name: 'Revolução Pernambucana de 1817' },
    { month: 6, day: 24, name: 'Dia de São João (PE)' },
  ],
  PI: [{ month: 10, day: 19, name: 'Dia do Piauí' }],
  RJ: [{ month: 4, day: 23, name: 'Dia de São Jorge (RJ)' }],
  RN: [{ month: 10, day: 3, name: 'Mártires de Cunhaú e Uruaçu (RN)' }],
  RS: [{ month: 9, day: 20, name: 'Revolução Farroupilha / Dia do Gaúcho' }],
  RO: [
    { month: 1, day: 4, name: 'Criação do Estado de Rondônia' },
    { month: 6, day: 18, name: 'Dia do Evangélico (RO)' },
  ],
  RR: [{ month: 10, day: 5, name: 'Criação de Roraima' }],
  SC: [
    { month: 8, day: 11, name: 'Criação da Capitania de Santa Catarina' },
    { month: 11, day: 25, name: 'Dia de Santa Catarina de Alexandria' },
  ],
  SP: [{ month: 7, day: 9, name: 'Revolução Constitucionalista de 1932 (SP)' }],
  SE: [{ month: 7, day: 8, name: 'Emancipação Política de Sergipe' }],
  TO: [
    { month: 9, day: 8, name: 'Padroeira do Tocantins (N. Sra. Natividade)' },
    { month: 10, day: 5, name: 'Criação do Estado do Tocantins' },
  ],
};

export interface MunicipalPreset {
  uf: string;
  city: string;
  holidays: Array<{ month: number; day: number; name: string }>;
}

export const MUNICIPAL_HOLIDAY_PRESETS: MunicipalPreset[] = [
  {
    uf: 'MG',
    city: 'CONGONHAS',
    holidays: [
      { month: 9, day: 14, name: 'Jubileu do Senhor Bom Jesus de Matosinhos' },
      { month: 12, day: 8, name: 'Imaculada Conceição (Padroeira)' },
      { month: 12, day: 17, name: 'Aniversário de Emancipação de Congonhas' },
    ],
  },
  {
    uf: 'MG',
    city: 'BELO HORIZONTE',
    holidays: [
      { month: 8, day: 15, name: 'Assunção de Nossa Senhora (BH)' },
      { month: 12, day: 8, name: 'Imaculada Conceição (BH)' },
      { month: 12, day: 12, name: 'Aniversário de Belo Horizonte' },
    ],
  },
  {
    uf: 'MG',
    city: 'OURO PRETO',
    holidays: [
      { month: 7, day: 8, name: 'Aniversário de Ouro Preto' },
      { month: 8, day: 15, name: 'Nossa Senhora do Pilar / Assunção' },
      { month: 12, day: 8, name: 'Imaculada Conceição (Ouro Preto)' },
    ],
  },
  {
    uf: 'MG',
    city: 'CONSELHEIRO LAFAIETE',
    holidays: [
      { month: 9, day: 19, name: 'Aniversário de Conselheiro Lafaiete' },
      { month: 12, day: 8, name: 'Imaculada Conceição' },
    ],
  },
  {
    uf: 'MG',
    city: 'CONTAGEM',
    holidays: [
      { month: 8, day: 30, name: 'Aniversário de Contagem' },
      { month: 12, day: 8, name: 'Imaculada Conceição (Contagem)' },
    ],
  },
  {
    uf: 'MG',
    city: 'NOVA LIMA',
    holidays: [
      { month: 2, day: 5, name: 'Aniversário de Nova Lima' },
      { month: 8, day: 15, name: 'Nossa Senhora do Pilar (Nova Lima)' },
      { month: 12, day: 8, name: 'Imaculada Conceição' },
    ],
  },
  {
    uf: 'MG',
    city: 'ITABIRITO',
    holidays: [
      { month: 9, day: 7, name: 'Emancipação de Itabirito' },
      { month: 12, day: 8, name: 'Imaculada Conceição' },
    ],
  },
  {
    uf: 'SP',
    city: 'SAO PAULO',
    holidays: [{ month: 1, day: 25, name: 'Aniversário de São Paulo' }],
  },
  {
    uf: 'SP',
    city: 'CAMPINAS',
    holidays: [
      { month: 7, day: 14, name: 'Aniversário de Campinas' },
      { month: 12, day: 8, name: 'Nossa Senhora da Conceição (Campinas)' },
    ],
  },
  {
    uf: 'RJ',
    city: 'RIO DE JANEIRO',
    holidays: [
      { month: 1, day: 20, name: 'Dia de São Sebastião (Padroeiro RJ)' },
      { month: 3, day: 1, name: 'Aniversário da Cidade do Rio de Janeiro' },
    ],
  },
  {
    uf: 'PR',
    city: 'CURITIBA',
    holidays: [
      { month: 3, day: 29, name: 'Aniversário de Curitiba' },
      { month: 9, day: 8, name: 'Nossa Senhora da Luz dos Pinhais' },
    ],
  },
  {
    uf: 'RS',
    city: 'PORTO ALEGRE',
    holidays: [{ month: 2, day: 2, name: 'Nossa Senhora dos Navegantes (POA)' }],
  },
  {
    uf: 'BA',
    city: 'SALVADOR',
    holidays: [
      { month: 3, day: 29, name: 'Aniversário de Salvador' },
      { month: 6, day: 24, name: 'São João (Salvador)' },
      { month: 12, day: 8, name: 'Nossa Senhora da Conceição da Praia' },
    ],
  },
  {
    uf: 'DF',
    city: 'BRASILIA',
    holidays: [{ month: 4, day: 21, name: 'Fundação de Brasília' }],
  },
  {
    uf: 'CE',
    city: 'FORTALEZA',
    holidays: [
      { month: 4, day: 13, name: 'Aniversário de Fortaleza' },
      { month: 8, day: 15, name: 'Nossa Senhora da Assunção (Fortaleza)' },
    ],
  },
  {
    uf: 'PE',
    city: 'RECIFE',
    holidays: [
      { month: 3, day: 12, name: 'Aniversário do Recife' },
      { month: 7, day: 16, name: 'Nossa Senhora do Carmo (Recife)' },
      { month: 12, day: 8, name: 'Nossa Senhora da Conceição (Recife)' },
    ],
  },
  {
    uf: 'GO',
    city: 'GOIANIA',
    holidays: [
      { month: 5, day: 24, name: 'Nossa Senhora Auxiliadora (Goiânia)' },
      { month: 10, day: 24, name: 'Aniversário de Goiânia' },
    ],
  },
  {
    uf: 'ES',
    city: 'VITORIA',
    holidays: [
      { month: 9, day: 8, name: 'Nossa Senhora da Vitória / Aniversário' },
    ],
  },
];

export const defaultGoalsCalendarConfig: GoalsCalendarConfig = {
  applyToGoals: true,
  uf: 'MG',
  cidade: 'CONGONHAS',
  workingDaysOfWeek: [1, 2, 3, 4, 5], // Segunda a Sexta padrão (editável com 1 clique)
  redistributeMode: 'mensal_para_dias_uteis',
  holidays: [],
  removedHolidayKeys: [],
  recessoDates: [],
  recessoNotes: {},
  extraWorkingDates: [],
};

export function normalizeCityName(city?: string): string {
  return (city || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

/**
 * Calcula o Domingo de Páscoa usando o algoritmo de Meeus/Jones/Butcher
 */
export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Março, 4=Abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0);
}

function addDays(base: Date, delta: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta, 12, 0, 0);
  return d;
}

export function makeAutoHolidayKey(date: string, name: string): string {
  return `${date}__${normalizeCityName(name)}`;
}

/**
 * Gera todos os feriados (Nacionais, Estaduais, Municipais e Personalizados) de um ano civil
 */
export function getHolidaysForYear(
  year: number,
  config: GoalsCalendarConfig = defaultGoalsCalendarConfig
): CalendarHolidayItem[] {
  const uf = (config.uf || 'MG').toUpperCase();
  const normCity = normalizeCityName(config.cidade);
  const removedSet = new Set(config.removedHolidayKeys || []);

  const autoList: CalendarHolidayItem[] = [];
  const pushAuto = (
    date: string,
    name: string,
    scope: HolidayScope,
    extra?: { uf?: string; city?: string }
  ) => {
    const key = makeAutoHolidayKey(date, name);
    if (removedSet.has(key)) return;
    autoList.push({
      id: `auto-${scope}-${date}-${normalizeCityName(name).slice(0, 14)}`,
      date,
      name,
      scope,
      uf: extra?.uf,
      city: extra?.city,
      trabalhado: false,
      isCustom: false,
    });
  };

  // 1. Feriados Nacionais Fixos
  const fixedNational = [
    { month: 1, day: 1, name: 'Confraternização Universal' },
    { month: 4, day: 21, name: 'Tiradentes' },
    { month: 5, day: 1, name: 'Dia Mundial do Trabalho' },
    { month: 9, day: 7, name: 'Independência do Brasil' },
    { month: 10, day: 12, name: 'Nossa Senhora Aparecida' },
    { month: 11, day: 2, name: 'Finados' },
    { month: 11, day: 15, name: 'Proclamação da República' },
    { month: 11, day: 20, name: 'Dia da Consciência Negra' },
    { month: 12, day: 25, name: 'Natal' },
  ];

  fixedNational.forEach((h) => {
    const dateStr = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
    pushAuto(dateStr, h.name, 'nacional');
  });

  // 2. Feriados Móveis (baseados na Páscoa)
  const easter = getEasterDate(year);
  const carnivalMon = addDays(easter, -48);
  const carnivalTue = addDays(easter, -47);
  const goodFriday = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  pushAuto(formatDateKey(carnivalMon), 'Carnaval (Segunda-feira)', 'ponto_facultativo');
  pushAuto(formatDateKey(carnivalTue), 'Carnaval (Terça-feira)', 'ponto_facultativo');
  pushAuto(formatDateKey(goodFriday), 'Sexta-feira Santa (Paixão de Cristo)', 'nacional');
  pushAuto(formatDateKey(corpusChristi), 'Corpus Christi', 'ponto_facultativo');

  // 3. Feriados Estaduais da UF selecionada
  const stateList = STATE_HOLIDAYS_BY_UF[uf] || [];
  stateList.forEach((h) => {
    const dateStr = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
    // Evita duplicar 21/04 Tiradentes se já for Data Magna de MG no mesmo dia
    if (uf === 'MG' && h.month === 4 && h.day === 21) return;
    pushAuto(dateStr, h.name, 'estadual', { uf });
  });

  // 4. Feriados Municipais da cidade selecionada (presets conhecidos)
  if (normCity) {
    const preset = MUNICIPAL_HOLIDAY_PRESETS.find(
      (p) => p.uf === uf && normalizeCityName(p.city) === normCity
    );
    if (preset) {
      preset.holidays.forEach((h) => {
        const dateStr = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
        pushAuto(dateStr, h.name, 'municipal', { uf, city: preset.city });
      });
    }
  }

  // 5. Mescla com overrides e feriados personalizados salvos pelo usuário
  const userHolidaysThisYear = (config.holidays || []).filter((h) =>
    h.date.startsWith(`${year}-`)
  );
  const mergedMap = new Map<string, CalendarHolidayItem>();

  autoList.forEach((item) => {
    mergedMap.set(item.id, item);
  });

  userHolidaysThisYear.forEach((userItem) => {
    // Se já existe um auto com mesmo id ou mesma data + nome parecido, sobrescreve
    const matchingAuto = Array.from(mergedMap.values()).find(
      (a) =>
        a.id === userItem.id ||
        (a.date === userItem.date &&
          normalizeCityName(a.name) === normalizeCityName(userItem.name))
    );
    if (matchingAuto) {
      mergedMap.set(matchingAuto.id, {
        ...matchingAuto,
        ...userItem,
        id: matchingAuto.id,
      });
    } else {
      mergedMap.set(userItem.id, userItem);
    }
  });

  return Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export type DayScheduleStatus =
  | 'dia_util'
  | 'feriado_trabalhado'
  | 'feriado_folga'
  | 'recesso'
  | 'folga_semanal';

export interface DayScheduleInfo {
  dateKey: string;
  date: Date;
  dayOfWeek: number;
  status: DayScheduleStatus;
  isWorkingDay: boolean;
  isStandardWorkingWeekday: boolean;
  isRecess: boolean;
  recessNote?: string;
  isExtraWorking: boolean;
  holidays: CalendarHolidayItem[];
  primaryHoliday?: CalendarHolidayItem;
}

export function normalizeCalendarConfig(
  raw?: GoalsCalendarConfig
): GoalsCalendarConfig {
  if (!raw) return defaultGoalsCalendarConfig;
  return {
    applyToGoals: raw.applyToGoals !== false,
    uf: (raw.uf || 'MG').toUpperCase(),
    cidade: (raw.cidade || 'CONGONHAS').toUpperCase(),
    workingDaysOfWeek:
      Array.isArray(raw.workingDaysOfWeek) && raw.workingDaysOfWeek.length > 0
        ? raw.workingDaysOfWeek
        : [1, 2, 3, 4, 5],
    redistributeMode: raw.redistributeMode || 'mensal_para_dias_uteis',
    holidays: Array.isArray(raw.holidays) ? raw.holidays : [],
    removedHolidayKeys: Array.isArray(raw.removedHolidayKeys) ? raw.removedHolidayKeys : [],
    recessoDates: Array.isArray(raw.recessoDates) ? raw.recessoDates : [],
    recessoNotes: raw.recessoNotes || {},
    extraWorkingDates: Array.isArray(raw.extraWorkingDates) ? raw.extraWorkingDates : [],
  };
}

export function getDayScheduleInfo(
  dateInput: Date | string,
  configRaw?: GoalsCalendarConfig,
  holidaysCache?: Map<number, CalendarHolidayItem[]>
): DayScheduleInfo {
  const config = normalizeCalendarConfig(configRaw);
  const date = typeof dateInput === 'string' ? parseDateKey(dateInput) : dateInput;
  const dateKey = formatDateKey(date);
  const year = date.getFullYear();
  const dayOfWeek = date.getDay();

  let yearHolidays: CalendarHolidayItem[];
  if (holidaysCache && holidaysCache.has(year)) {
    yearHolidays = holidaysCache.get(year)!;
  } else {
    yearHolidays = getHolidaysForYear(year, config);
    if (holidaysCache) holidaysCache.set(year, yearHolidays);
  }

  const dayHolidays = yearHolidays.filter((h) => h.date === dateKey);
  const primaryHoliday = dayHolidays[0];
  const isRecess = config.recessoDates.includes(dateKey);
  const recessNote = config.recessoNotes?.[dateKey];
  const isExtraWorking = (config.extraWorkingDates || []).includes(dateKey);
  const isStandardWorkingWeekday = config.workingDaysOfWeek.includes(dayOfWeek);

  let status: DayScheduleStatus = 'dia_util';
  let isWorkingDay = isStandardWorkingWeekday || isExtraWorking;

  if (isRecess) {
    status = 'recesso';
    isWorkingDay = false;
  } else if (dayHolidays.length > 0) {
    // Se pelo menos um feriado no dia estiver marcado como trabalhado, trabalha no feriado
    const hasWorkedHoliday = dayHolidays.some((h) => h.trabalhado);
    if (hasWorkedHoliday) {
      status = 'feriado_trabalhado';
      isWorkingDay = true;
    } else {
      status = 'feriado_folga';
      isWorkingDay = false;
    }
  } else if (!isStandardWorkingWeekday && !isExtraWorking) {
    status = 'folga_semanal';
    isWorkingDay = false;
  }

  return {
    dateKey,
    date,
    dayOfWeek,
    status,
    isWorkingDay,
    isStandardWorkingWeekday,
    isRecess,
    recessNote,
    isExtraWorking,
    holidays: dayHolidays,
    primaryHoliday,
  };
}

/**
 * Calcula a meta diária recalculada para um dia específico, considerando feriados, recessos e regra de redistribuição.
 */
export function getEffectiveDayTarget(
  dateInput: Date | string,
  goals: GoalsConfig,
  holidaysCache: Map<number, CalendarHolidayItem[]> = new Map()
): {
  value: number;
  count: number;
  schedule: DayScheduleInfo;
  monthWorkingDays: number;
  weekWorkingDays: number;
} {
  const config = normalizeCalendarConfig(goals.calendarConfig);
  const date = typeof dateInput === 'string' ? parseDateKey(dateInput) : dateInput;
  const schedule = getDayScheduleInfo(date, config, holidaysCache);

  // Conta dias úteis do mês
  const year = date.getFullYear();
  const monthIdx = date.getMonth();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  let monthWorkingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const cur = new Date(year, monthIdx, d, 12, 0, 0);
    if (getDayScheduleInfo(cur, config, holidaysCache).isWorkingDay) {
      monthWorkingDays++;
    }
  }

  // Conta dias úteis da semana (Segunda a Domingo)
  const dow = date.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const weekMon = new Date(year, monthIdx, date.getDate() + diffToMon, 12, 0, 0);
  let weekWorkingDays = 0;
  for (let i = 0; i < 7; i++) {
    const cur = addDays(weekMon, i);
    if (getDayScheduleInfo(cur, config, holidaysCache).isWorkingDay) {
      weekWorkingDays++;
    }
  }

  // Se a programação do calendário estiver desativada pelo usuário, usa metas fixas base
  if (!config.applyToGoals) {
    return {
      value: goals.metaDiaria || 0,
      count: goals.metaDiariaQtd || 0,
      schedule,
      monthWorkingDays,
      weekWorkingDays,
    };
  }

  // Dia não trabalhado (feriado de folga, recesso/feriado prolongado ou fim de semana de folga) -> Meta R$ 0
  if (!schedule.isWorkingDay) {
    return {
      value: 0,
      count: 0,
      schedule,
      monthWorkingDays,
      weekWorkingDays,
    };
  }

  const mode: GoalRedistributeMode = config.redistributeMode || 'mensal_para_dias_uteis';

  if (mode === 'mensal_para_dias_uteis') {
    const divisor = Math.max(1, monthWorkingDays);
    return {
      value: (goals.metaMensal || 0) / divisor,
      count: (goals.metaMensalQtd || 0) / divisor,
      schedule,
      monthWorkingDays,
      weekWorkingDays,
    };
  }

  if (mode === 'semanal_para_dias_uteis') {
    const divisor = Math.max(1, weekWorkingDays);
    return {
      value: (goals.metaSemanal || 0) / divisor,
      count: (goals.metaSemanalQtd || 0) / divisor,
      schedule,
      monthWorkingDays,
      weekWorkingDays,
    };
  }

  // proporcional_dias_uteis: usa a meta diária base apenas nos dias trabalhados
  return {
    value: goals.metaDiaria || 0,
    count: goals.metaDiariaQtd || 0,
    schedule,
    monthWorkingDays,
    weekWorkingDays,
  };
}

/**
 * Calcula a meta recalculada de uma semana (Segunda a Domingo) a partir da segunda-feira inicial (ou qualquer dia da semana).
 */
export function getEffectiveWeekTarget(
  anyDateInWeek: Date | string,
  goals: GoalsConfig,
  holidaysCache: Map<number, CalendarHolidayItem[]> = new Map()
): {
  value: number;
  count: number;
  workingDaysCount: number;
  holidaysFolgaCount: number;
  holidaysWorkedCount: number;
  recessCount: number;
  hasHolidayOrRecess: boolean;
} {
  const config = normalizeCalendarConfig(goals.calendarConfig);
  const d = typeof anyDateInWeek === 'string' ? parseDateKey(anyDateInWeek) : anyDateInWeek;
  const dow = d.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMon, 12, 0, 0);

  let value = 0;
  let count = 0;
  let workingDaysCount = 0;
  let holidaysFolgaCount = 0;
  let holidaysWorkedCount = 0;
  let recessCount = 0;

  for (let i = 0; i < 7; i++) {
    const cur = addDays(monday, i);
    const res = getEffectiveDayTarget(cur, goals, holidaysCache);
    value += res.value;
    count += res.count;
    if (res.schedule.isWorkingDay) workingDaysCount++;
    if (res.schedule.status === 'feriado_folga') holidaysFolgaCount++;
    if (res.schedule.status === 'feriado_trabalhado') holidaysWorkedCount++;
    if (res.schedule.status === 'recesso') recessCount++;
  }

  if (!config.applyToGoals) {
    return {
      value: goals.metaSemanal || 0,
      count: goals.metaSemanalQtd || 0,
      workingDaysCount,
      holidaysFolgaCount,
      holidaysWorkedCount,
      recessCount,
      hasHolidayOrRecess: holidaysFolgaCount > 0 || holidaysWorkedCount > 0 || recessCount > 0,
    };
  }

  return {
    value,
    count,
    workingDaysCount,
    holidaysFolgaCount,
    holidaysWorkedCount,
    recessCount,
    hasHolidayOrRecess: holidaysFolgaCount > 0 || holidaysWorkedCount > 0 || recessCount > 0,
  };
}

/**
 * Calcula a meta recalculada de um mês inteiro.
 */
export function getEffectiveMonthTarget(
  year: number,
  monthIndex: number,
  goals: GoalsConfig,
  holidaysCache: Map<number, CalendarHolidayItem[]> = new Map()
): {
  value: number;
  count: number;
  workingDaysCount: number;
  holidaysFolgaCount: number;
  holidaysWorkedCount: number;
  recessCount: number;
} {
  const config = normalizeCalendarConfig(goals.calendarConfig);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  let value = 0;
  let count = 0;
  let workingDaysCount = 0;
  let holidaysFolgaCount = 0;
  let holidaysWorkedCount = 0;
  let recessCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const cur = new Date(year, monthIndex, d, 12, 0, 0);
    const res = getEffectiveDayTarget(cur, goals, holidaysCache);
    value += res.value;
    count += res.count;
    if (res.schedule.isWorkingDay) workingDaysCount++;
    if (res.schedule.status === 'feriado_folga') holidaysFolgaCount++;
    if (res.schedule.status === 'feriado_trabalhado') holidaysWorkedCount++;
    if (res.schedule.status === 'recesso') recessCount++;
  }

  if (!config.applyToGoals) {
    return {
      value: goals.metaMensal || 0,
      count: goals.metaMensalQtd || 0,
      workingDaysCount,
      holidaysFolgaCount,
      holidaysWorkedCount,
      recessCount,
    };
  }

  return {
    value,
    count,
    workingDaysCount,
    holidaysFolgaCount,
    holidaysWorkedCount,
    recessCount,
  };
}

export interface EffectiveGoalsSnapshot {
  metaDiaria: number;
  metaSemanal: number;
  metaMensal: number;
  metaDiariaQtd: number;
  metaSemanalQtd: number;
  metaMensalQtd: number;
  calendarApplied: boolean;
  todaySchedule: DayScheduleInfo;
  weekWorkingDays: number;
  weekHasHolidayOrRecess: boolean;
  weekHolidaysOrRecessCount: number;
  monthWorkingDays: number;
  monthHolidaysFolgaCount: number;
  monthHolidaysWorkedCount: number;
  monthRecessCount: number;
}

/**
 * Snapshot consolidado das metas efetivas para uma data de referência (hoje).
 */
export function getEffectiveGoalsForDate(
  goals: GoalsConfig,
  referenceDate: Date = new Date()
): EffectiveGoalsSnapshot {
  const config = normalizeCalendarConfig(goals.calendarConfig);
  const cache = new Map<number, CalendarHolidayItem[]>();

  const dayTarget = getEffectiveDayTarget(referenceDate, goals, cache);
  const weekTarget = getEffectiveWeekTarget(referenceDate, goals, cache);
  const monthTarget = getEffectiveMonthTarget(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    goals,
    cache
  );

  return {
    metaDiaria: dayTarget.value,
    metaSemanal: weekTarget.value,
    metaMensal: monthTarget.value,
    metaDiariaQtd: Math.round(dayTarget.count * 10) / 10,
    metaSemanalQtd: Math.round(weekTarget.count * 10) / 10,
    metaMensalQtd: Math.round(monthTarget.count * 10) / 10,
    calendarApplied: config.applyToGoals,
    todaySchedule: dayTarget.schedule,
    weekWorkingDays: weekTarget.workingDaysCount,
    weekHasHolidayOrRecess: weekTarget.hasHolidayOrRecess,
    weekHolidaysOrRecessCount:
      weekTarget.holidaysFolgaCount + weekTarget.recessCount,
    monthWorkingDays: monthTarget.workingDaysCount,
    monthHolidaysFolgaCount: monthTarget.holidaysFolgaCount,
    monthHolidaysWorkedCount: monthTarget.holidaysWorkedCount,
    monthRecessCount: monthTarget.recessCount,
  };
}

export interface CalendarGridCell {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  schedule: DayScheduleInfo;
  targetValue: number;
  targetCount: number;
}

export interface CalendarGridWeek {
  weekIndex: number;
  startDate: Date;
  endDate: Date;
  dateRangeLabel: string;
  cells: CalendarGridCell[];
  weekTargetValue: number;
  weekTargetCount: number;
  workingDaysCount: number;
  hasHolidayOrRecess: boolean;
  holidaysFolgaCount: number;
  holidaysWorkedCount: number;
  recessCount: number;
}

export interface MonthCalendarGridResult {
  year: number;
  monthIndex: number;
  monthLabel: string;
  weeks: CalendarGridWeek[];
  monthTargetValue: number;
  monthTargetCount: number;
  workingDaysCount: number;
  holidaysFolgaCount: number;
  holidaysWorkedCount: number;
  recessCount: number;
  avgDailyTargetInWorkingDays: number;
}

/**
 * Constrói a grade mensal completa (Segunda a Domingo) com recálculo por dia e por semana.
 */
export function buildMonthCalendarGrid(
  year: number,
  monthIndex: number,
  goals: GoalsConfig
): MonthCalendarGridResult {
  const cache = new Map<number, CalendarHolidayItem[]>();
  const todayKey = formatDateKey(new Date());

  const firstOfMonth = new Date(year, monthIndex, 1, 12, 0, 0);
  const lastOfMonth = new Date(year, monthIndex + 1, 0, 12, 0, 0);

  // Segunda-feira da primeira semana visível
  const firstDow = firstOfMonth.getDay();
  const diffToMon = firstDow === 0 ? -6 : 1 - firstDow;
  const gridStart = addDays(firstOfMonth, diffToMon);

  // Domingo da última semana visível
  const lastDow = lastOfMonth.getDay();
  const diffToSun = lastDow === 0 ? 0 : 7 - lastDow;
  const gridEnd = addDays(lastOfMonth, diffToSun);

  const weeks: CalendarGridWeek[] = [];
  let cursor = new Date(gridStart);
  let weekIndex = 0;

  while (cursor <= gridEnd) {
    const weekStart = new Date(cursor);
    const weekEnd = addDays(weekStart, 6);
    const cells: CalendarGridCell[] = [];

    for (let i = 0; i < 7; i++) {
      const cellDate = addDays(weekStart, i);
      const cellKey = formatDateKey(cellDate);
      const dayRes = getEffectiveDayTarget(cellDate, goals, cache);
      cells.push({
        date: cellDate,
        dateKey: cellKey,
        dayNumber: cellDate.getDate(),
        inCurrentMonth: cellDate.getMonth() === monthIndex,
        isToday: cellKey === todayKey,
        schedule: dayRes.schedule,
        targetValue: dayRes.value,
        targetCount: dayRes.count,
      });
    }

    const weekStats = getEffectiveWeekTarget(weekStart, goals, cache);
    const sStr = `${String(weekStart.getDate()).padStart(2, '0')}/${String(
      weekStart.getMonth() + 1
    ).padStart(2, '0')}`;
    const eStr = `${String(weekEnd.getDate()).padStart(2, '0')}/${String(
      weekEnd.getMonth() + 1
    ).padStart(2, '0')}`;

    weeks.push({
      weekIndex: weekIndex++,
      startDate: weekStart,
      endDate: weekEnd,
      dateRangeLabel: `${sStr} a ${eStr}`,
      cells,
      weekTargetValue: weekStats.value,
      weekTargetCount: weekStats.count,
      workingDaysCount: weekStats.workingDaysCount,
      hasHolidayOrRecess: weekStats.hasHolidayOrRecess,
      holidaysFolgaCount: weekStats.holidaysFolgaCount,
      holidaysWorkedCount: weekStats.holidaysWorkedCount,
      recessCount: weekStats.recessCount,
    });

    cursor = addDays(weekStart, 7);
  }

  const monthStats = getEffectiveMonthTarget(year, monthIndex, goals, cache);
  const monthLabel = new Date(year, monthIndex, 1).toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return {
    year,
    monthIndex,
    monthLabel,
    weeks,
    monthTargetValue: monthStats.value,
    monthTargetCount: monthStats.count,
    workingDaysCount: monthStats.workingDaysCount,
    holidaysFolgaCount: monthStats.holidaysFolgaCount,
    holidaysWorkedCount: monthStats.holidaysWorkedCount,
    recessCount: monthStats.recessCount,
    avgDailyTargetInWorkingDays:
      monthStats.workingDaysCount > 0
        ? monthStats.value / monthStats.workingDaysCount
        : 0,
  };
}
