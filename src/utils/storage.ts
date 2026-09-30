import { CompanyProfile, Client, ServiceItem, ServiceLaunch, GoalsConfig } from '../types';

const STORAGE_KEY = 'autolava_sistema_v1';

// Gerador de assinatura SVG/PNG simples para dados iniciais de demonstração
export const createSampleSignature = (text: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 300, 100);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Traçado simulando assinatura cursiva
    ctx.beginPath();
    ctx.moveTo(30, 60);
    ctx.bezierCurveTo(60, 20, 80, 70, 110, 45);
    ctx.bezierCurveTo(130, 25, 140, 80, 170, 50);
    ctx.bezierCurveTo(190, 30, 210, 65, 240, 40);
    ctx.lineTo(270, 75);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText(text, 35, 88);
  }
  return canvas.toDataURL('image/png');
};

export const defaultCompanyProfile: CompanyProfile = {
  cnpj: '12.345.678/0001-90',
  razaoSocial: 'Auto Brilho Serviços Automotivos e Estética Ltda',
  nomeFantasia: 'Auto Brilho Lava Jato & Frotas',
  email: 'contato@autobrilholavajato.com.br',
  telefone: '(11) 98765-4321',
  endereco: 'Av. Industrial das Américas, 1450 - Galpão 02, São Paulo - SP, CEP: 04567-000',
  dadosBancarios: {
    banco: 'Banco Santander (033)',
    agencia: '1234',
    conta: '987654-3',
    tipoConta: 'Conta Corrente',
    chavePix: '12.345.678/0001-90',
    tipoChavePix: 'CNPJ',
  },
  logoUrl: '',
  isConfigured: false, // Inicia como false para o primeiro acesso solicitar dados da empresa
};

export const defaultServices: ServiceItem[] = [
  {
    id: 'srv-1',
    codigo: 'SRV-01',
    nome: 'Lavagem Simples (Ducha + Secagem)',
    categoria: 'Passeio / Leve',
    precoPadrao: 45.0,
    descricao: 'Ducha externa com shampoo neutro, secagem e pretinho nos pneus',
    ativo: true,
  },
  {
    id: 'srv-2',
    codigo: 'SRV-02',
    nome: 'Lavagem Completa (Externa + Aspiração)',
    categoria: 'Passeio / Leve',
    precoPadrao: 75.0,
    descricao: 'Lavagem externa com cera líquida, aspiração interna e limpeza do painel',
    ativo: true,
  },
  {
    id: 'srv-3',
    codigo: 'SRV-03',
    nome: 'Lavagem Completa Utilitários / SUV',
    categoria: 'SUV / Caminhonete',
    precoPadrao: 95.0,
    descricao: 'Higienização de SUV, caminhonetes ou furgões leves com aspiração',
    ativo: true,
  },
  {
    id: 'srv-4',
    codigo: 'SRV-04',
    nome: 'Lavagem de Motor e Chassi',
    categoria: 'Geral',
    precoPadrao: 110.0,
    descricao: 'Desengraxe e limpeza técnica inferior e compartimento do motor',
    ativo: true,
  },
  {
    id: 'srv-5',
    codigo: 'SRV-05',
    nome: 'Higienização Interna Completa',
    categoria: 'Geral',
    precoPadrao: 190.0,
    descricao: 'Limpeza e desinfecção profunda dos bancos, teto, carpetes e painéis',
    ativo: true,
  },
  {
    id: 'srv-6',
    codigo: 'SRV-06',
    nome: 'Lavagem Técnica Caminhão / Baú',
    categoria: 'Caminhão / Pesado',
    precoPadrao: 160.0,
    descricao: 'Lavagem geral de cavalo mecânico ou caminhão 3/4',
    ativo: true,
  },
];

export const defaultClients: Client[] = [
  {
    id: 'cli-1',
    cnpj: '45.123.789/0001-12',
    razaoSocial: 'Expresso Logística e Transportes Rodoviários S/A',
    nomeFantasia: 'Expresso Logística',
    email: 'frotas@expressologistica.com.br',
    telefone: '(11) 3210-9000',
    endereco: 'Rodovia Anhanguera, km 18, São Paulo - SP',
    tabelaPrecos: {
      'srv-1': 38.0, // Preço contratual diferenciado para frota
      'srv-2': 65.0,
      'srv-3': 85.0,
      'srv-4': 95.0,
      'srv-5': 160.0,
      'srv-6': 140.0,
    },
    veiculos: [
      { placa: 'BRA-2E19', modelo: 'Mercedes-Benz Accelo 1016' },
      { placa: 'RYS-8A45', modelo: 'Volkswagen Delivery 9.170' },
      { placa: 'PXK-5040', modelo: 'Volvo FH 540' },
    ],
    ativo: true,
    criadoEm: '2026-09-01',
  },
  {
    id: 'cli-2',
    cnpj: '18.990.456/0001-34',
    razaoSocial: 'Locadora Metropolitana de Veículos Ltda',
    nomeFantasia: 'Metropolitana Locações',
    email: 'operacoes@metropolitanaloc.com.br',
    telefone: '(11) 4500-1122',
    endereco: 'Rua Bela Cintra, 780, Consolação, São Paulo - SP',
    tabelaPrecos: {
      'srv-1': 40.0,
      'srv-2': 70.0,
      'srv-3': 88.0,
      'srv-4': 100.0,
    },
    veiculos: [
      { placa: 'GAF-3920', modelo: 'Fiat Strada Freedom 1.3' },
      { placa: 'FGT-9921', modelo: 'Renault Kwid Zen' },
      { placa: 'BDV-1029', modelo: 'Chevrolet Onix Plus' },
    ],
    ativo: true,
    criadoEm: '2026-09-05',
  },
  {
    id: 'cli-3',
    cnpj: '23.888.777/0001-55',
    razaoSocial: 'Distribuidora São Paulo de Alimentos Eireli',
    nomeFantasia: 'SP Alimentos',
    email: 'manutencao@spalimentos.com.br',
    telefone: '(11) 2990-8800',
    endereco: 'Av. do Estado, 3200, Mooca, São Paulo - SP',
    tabelaPrecos: {
      'srv-1': 42.0,
      'srv-2': 72.0,
      'srv-6': 145.0,
    },
    veiculos: [
      { placa: 'KMN-4812', modelo: 'Hyundai HR 2.5' },
      { placa: 'DRX-9014', modelo: 'Iveco Daily 35S14' },
    ],
    ativo: true,
    criadoEm: '2026-09-10',
  },
];

export const defaultGoals: GoalsConfig = {
  metaDiaria: 800.0,
  metaSemanal: 4800.0,
  metaMensal: 22000.0,
  metaDiariaQtd: 12,
  metaSemanalQtd: 70,
  metaMensalQtd: 300,
};

export const defaultLaunches: ServiceLaunch[] = [];

export const DEMO_LAUNCH_IDS = ['lnc-1', 'lnc-2', 'lnc-3'];
export const DEMO_LAUNCH_OS = ['OS-00101', 'OS-00102', 'OS-00103'];

export interface AppState {
  company: CompanyProfile;
  services: ServiceItem[];
  clients: Client[];
  launches: ServiceLaunch[];
  goals: GoalsConfig;
}

export const loadStoredData = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Remove quaisquer lançamentos residuais de demonstração da base local
      const rawLaunches: any[] = Array.isArray(parsed.launches) ? parsed.launches : [];
      const cleanLaunches = rawLaunches.filter(
        (l) => !DEMO_LAUNCH_IDS.includes(l?.id) && !DEMO_LAUNCH_OS.includes(l?.numeroOS)
      );

      const state: AppState = {
        company: parsed.company || defaultCompanyProfile,
        services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : defaultServices,
        clients: Array.isArray(parsed.clients)
          ? parsed.clients.map((c: any) => ({
              ...c,
              veiculos: Array.isArray(c.veiculos) ? c.veiculos : [],
            }))
          : defaultClients,
        launches: cleanLaunches,
        goals: parsed.goals || defaultGoals,
      };

      // Se havia lançamentos de exemplo salvos, limpa o localStorage imediatamente
      if (rawLaunches.length !== cleanLaunches.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }

      return state;
    }
  } catch (e) {
    console.error('Erro ao ler localStorage', e);
  }

  return {
    company: defaultCompanyProfile,
    services: defaultServices,
    clients: defaultClients,
    launches: [],
    goals: defaultGoals,
  };
};

export const saveStoredData = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Erro ao salvar localStorage', e);
  }
};

// Formatadores auxiliares
export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
};

export const formatDate = (isoStr: string): string => {
  if (!isoStr) return '-';
  try {
    const date = new Date(isoStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return isoStr;
  }
};

export const formatDateTime = (isoStr: string): string => {
  if (!isoStr) return '-';
  try {
    const date = new Date(isoStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
};

export const normalizePlate = (val: string): string => {
  return (val || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const formatPlate = (val: string): string => {
  const clean = normalizePlate(val);
  if (clean.length === 7) {
    // Padrão antigo ABC-1234 ou mercosul ABC1D23
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
};

export interface PlateConflictInfo {
  client: Client | { id: string; nomeFantasia: string; razaoSocial?: string; cnpj?: string };
  vehicle?: { placa: string; modelo: string };
  origem: 'frota' | 'lancamento';
}

/**
 * Localiza se uma determinada placa já pertence a algum cliente cadastrado ou se já foi lançada em outro cliente.
 * Se currentClientId for fornecido, desconsidera o próprio cliente na checagem.
 */
export const findPlateOwner = (
  plate: string,
  clients: Client[],
  currentClientId?: string,
  launches?: ServiceLaunch[]
): PlateConflictInfo | null => {
  const norm = normalizePlate(plate);
  if (!norm || norm.length < 4) return null;

  // 1. Checa se a placa está cadastrada na frota de outro cliente
  for (const c of clients) {
    if (currentClientId && c.id === currentClientId) continue;
    if (Array.isArray(c.veiculos)) {
      const v = c.veiculos.find((veh) => normalizePlate(veh.placa) === norm);
      if (v) {
        return { client: c, vehicle: v, origem: 'frota' };
      }
    }
  }

  // 2. Checa se a placa já foi lançada anteriormente em outro cliente
  if (Array.isArray(launches)) {
    const launchConflict = launches.find(
      (l) => normalizePlate(l.placa) === norm && l.clienteId && l.clienteId !== currentClientId
    );
    if (launchConflict) {
      const ownerClient = clients.find((c) => c.id === launchConflict.clienteId);
      return {
        client: ownerClient || {
          id: launchConflict.clienteId,
          nomeFantasia: launchConflict.clienteNome || 'Outro Cliente',
          cnpj: launchConflict.clienteCnpj || '',
        },
        vehicle: {
          placa: launchConflict.placa,
          modelo: launchConflict.modelo,
        },
        origem: 'lancamento',
      };
    }
  }

  return null;
};

export interface FlatVehicleItem {
  placa: string;
  modelo: string;
  cadastradoEm?: string;
  clientId: string;
  clientNome: string;
  clientCnpj: string;
}

/**
 * Extrai todos os veículos de todos os clientes em uma lista plana para consulta e gestão centralizada.
 */
export const getAllRegisteredVehicles = (clients: Client[]): FlatVehicleItem[] => {
  const list: FlatVehicleItem[] = [];
  clients.forEach((c) => {
    if (Array.isArray(c.veiculos)) {
      c.veiculos.forEach((v) => {
        list.push({
          placa: v.placa,
          modelo: v.modelo,
          cadastradoEm: v.cadastradoEm,
          clientId: c.id,
          clientNome: c.nomeFantasia || c.razaoSocial || 'Cliente',
          clientCnpj: c.cnpj || '',
        });
      });
    }
  });
  return list;
};

// Retorna YYYY-MM-DD com base no horário local (evita bug de fuso horário UTC em viradas de dia)
export const getLocalDateString = (d: Date | string = new Date()): string => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Retorna HH:mm com base no horário local (ex: "14:30")
export const getLocalTimeString = (d: Date | string = new Date()): string => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Combina data (YYYY-MM-DD) e hora (HH:mm) locais em formato ISO preservando a hora exata
export const combineDateTimeToIso = (dateStr: string, timeStr: string): string => {
  if (!dateStr) return new Date().toISOString();
  const time = timeStr && timeStr.trim() ? timeStr.trim() : '00:00';
  const parts = dateStr.split('-');
  const timeParts = time.split(':');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const hour = parseInt(timeParts[0] || '0', 10);
  const minute = parseInt(timeParts[1] || '0', 10);
  const now = new Date();
  const second = now.getSeconds();
  const dateObj = new Date(year, month, day, hour, minute, second);
  return dateObj.toISOString();
};

/**
 * Converte qualquer formato de data de lançamento (ISO, YYYY-MM-DD, DD/MM/YYYY)
 * em um objeto Date seguro no fuso local, evitando que vire o dia por UTC
 */
export const parseLaunchDate = (val: string | Date | undefined | null): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim();
  if (!str) return null;

  // Formato ISO ou YYYY-MM-DD (ex: 2026-09-30 ou 2026-09-30T10:00:00...)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 12;
    const minute = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    const second = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
    return new Date(year, month, day, hour, minute, second);
  }

  // Formato Brasileiro DD/MM/YYYY (ex: 30/09/2026)
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 12;
    const minute = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
    return new Date(year, month, day, hour, minute, 0);
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Garante que o valor total de um lançamento seja sempre um número válido,
 * prevenindo NaN por dados vindos como string ou vazios
 */
export const getLaunchValue = (l: ServiceLaunch): number => {
  if (typeof l.valorTotal === 'number' && !isNaN(l.valorTotal)) {
    return l.valorTotal;
  }
  if (typeof l.valorTotal === 'string') {
    const cleanStr = String(l.valorTotal).replace('R$', '').replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleanStr);
    if (!isNaN(parsed)) return parsed;
  }
  if (Array.isArray(l.servicos) && l.servicos.length > 0) {
    return l.servicos.reduce((acc, s) => {
      const sub = Number(s.subtotal) || (Number(s.preco) || 0) * (Number(s.quantidade) || 1);
      return acc + (isNaN(sub) ? 0 : sub);
    }, 0);
  }
  return 0;
};

/**
 * Verifica se duas datas correspondem ao mesmo dia civil (ano, mês e dia)
 */
export const isSameDay = (d1: Date, d2: Date = new Date()): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Retorna o intervalo da semana (Segunda-feira 00:00 até Domingo 23:59)
 */
export const getWeekRange = (baseDate: Date = new Date()) => {
  const day = baseDate.getDay(); // 0 = Domingo, 1 = Segunda...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + diffToMonday, 0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  return { start, end };
};

/**
 * Verifica se a data pertence à mesma semana civil
 */
export const isSameWeek = (d: Date, baseDate: Date = new Date()): boolean => {
  const { start, end } = getWeekRange(baseDate);
  const time = d.getTime();
  return time >= start.getTime() && time <= end.getTime();
};

/**
 * Verifica se a data pertence ao mesmo mês civil
 */
export const isSameMonth = (d1: Date, d2: Date = new Date()): boolean => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
};

export interface LaunchMetrics {
  totalHoje: number;
  qtdHoje: number;
  pctDia: number;
  totalSemana: number;
  qtdSemana: number;
  pctSemana: number;
  totalMes: number;
  qtdMes: number;
  pctMes: number;
  totalGeral: number;
  qtdGeral: number;
  ticketMedioHoje: number;
  ticketMedioSemana: number;
  ticketMedioMes: number;
  taxaAssinatura: number;
  last7Days: Array<{
    dateStr: string;
    dayLabel: string;
    shortDate: string;
    total: number;
    count: number;
    isToday: boolean;
  }>;
  topServices: Array<{
    id: string;
    nome: string;
    quantidade: number;
    total: number;
  }>;
  topClients: Array<{
    nome: string;
    quantidade: number;
    total: number;
  }>;
  todayLaunches: ServiceLaunch[];
  weekLaunches: ServiceLaunch[];
}

/**
 * Motor centralizado e à prova de falhas para cálculo de metas e métricas do Dashboard
 */
export const calculateLaunchMetrics = (
  launches: ServiceLaunch[],
  goals: GoalsConfig,
  referenceDate: Date = new Date()
): LaunchMetrics => {
  const now = referenceDate;
  const { start: weekStart, end: weekEnd } = getWeekRange(now);

  let totalHoje = 0;
  let qtdHoje = 0;
  let totalSemana = 0;
  let qtdSemana = 0;
  let totalMes = 0;
  let qtdMes = 0;
  let totalGeral = 0;
  let qtdGeral = 0;
  let assinados = 0;

  const todayLaunches: ServiceLaunch[] = [];
  const weekLaunches: ServiceLaunch[] = [];

  // Mapeamento dos últimos 7 dias (do 6º dia atrás até hoje)
  const daysMap = new Map<string, { date: Date; total: number; count: number; isToday: boolean }>();
  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12, 0, 0);
    const key = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
    daysMap.set(key, {
      date: dayDate,
      total: 0,
      count: 0,
      isToday: i === 0,
    });
  }

  // Agrupamentos de serviços e clientes
  const serviceStats = new Map<string, { id: string; nome: string; quantidade: number; total: number }>();
  const clientStats = new Map<string, { nome: string; quantidade: number; total: number }>();

  launches.forEach((l) => {
    const val = getLaunchValue(l);
    totalGeral += val;
    qtdGeral += 1;

    if (l.assinatura && l.assinatura.trim().length > 10) {
      assinados += 1;
    }

    const lDate = parseLaunchDate(l.dataHora);
    if (!lDate) return;

    // Acumula estatísticas por cliente
    const cName = l.clienteNome || 'Cliente Geral';
    const cCurr = clientStats.get(cName) || { nome: cName, quantidade: 0, total: 0 };
    cCurr.quantidade += 1;
    cCurr.total += val;
    clientStats.set(cName, cCurr);

    // Acumula estatísticas por serviço
    if (Array.isArray(l.servicos)) {
      l.servicos.forEach((s) => {
        const sId = s.serviceId || s.nome;
        const sCurr = serviceStats.get(sId) || {
          id: sId,
          nome: s.nome,
          quantidade: 0,
          total: 0,
        };
        const sSub = Number(s.subtotal) || (Number(s.preco) || 0) * (Number(s.quantidade) || 1);
        sCurr.quantidade += Number(s.quantidade) || 1;
        sCurr.total += isNaN(sSub) ? 0 : sSub;
        serviceStats.set(sId, sCurr);
      });
    }

    // HOJE
    if (isSameDay(lDate, now)) {
      totalHoje += val;
      qtdHoje += 1;
      todayLaunches.push(l);
    }

    // ESTA SEMANA (Segunda a Domingo)
    const lTime = lDate.getTime();
    if (lTime >= weekStart.getTime() && lTime <= weekEnd.getTime()) {
      totalSemana += val;
      qtdSemana += 1;
      weekLaunches.push(l);
    }

    // ESTE MÊS
    if (isSameMonth(lDate, now)) {
      totalMes += val;
      qtdMes += 1;
    }

    // Últimos 7 dias
    const dayKey = `${lDate.getFullYear()}-${String(lDate.getMonth() + 1).padStart(2, '0')}-${String(lDate.getDate()).padStart(2, '0')}`;
    if (daysMap.has(dayKey)) {
      const entry = daysMap.get(dayKey)!;
      entry.total += val;
      entry.count += 1;
    }
  });

  const getPct = (actual: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((actual / target) * 100));
  };

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const last7Days = Array.from(daysMap.entries()).map(([key, item]) => {
    const dayOfWeek = item.date.getDay();
    const dayLabel = dayNames[dayOfWeek];
    const shortDate = `${String(item.date.getDate()).padStart(2, '0')}/${String(item.date.getMonth() + 1).padStart(2, '0')}`;
    return {
      dateStr: key,
      dayLabel,
      shortDate,
      total: item.total,
      count: item.count,
      isToday: item.isToday,
    };
  });

  const topServices = Array.from(serviceStats.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const topClients = Array.from(clientStats.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    totalHoje,
    qtdHoje,
    pctDia: getPct(totalHoje, goals.metaDiaria),
    totalSemana,
    qtdSemana,
    pctSemana: getPct(totalSemana, goals.metaSemanal),
    totalMes,
    qtdMes,
    pctMes: getPct(totalMes, goals.metaMensal),
    totalGeral,
    qtdGeral,
    ticketMedioHoje: qtdHoje > 0 ? totalHoje / qtdHoje : 0,
    ticketMedioSemana: qtdSemana > 0 ? totalSemana / qtdSemana : 0,
    ticketMedioMes: qtdMes > 0 ? totalMes / qtdMes : 0,
    taxaAssinatura: qtdGeral > 0 ? Math.round((assinados / qtdGeral) * 100) : 100,
    last7Days,
    topServices,
    topClients,
    todayLaunches,
    weekLaunches,
  };
};


