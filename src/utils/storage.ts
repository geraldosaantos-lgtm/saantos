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
        clients: Array.isArray(parsed.clients) ? parsed.clients : defaultClients,
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

export const formatPlate = (val: string): string => {
  const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length === 7) {
    // Padrão antigo ABC-1234 ou mercosul ABC1D23
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
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

