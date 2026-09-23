export interface BankDetails {
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: string;
  chavePix: string;
  tipoChavePix: 'CNPJ' | 'Email' | 'Telefone' | 'Aleatória';
}

export interface CompanyProfile {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  email: string;
  telefone: string;
  endereco: string;
  dadosBancarios: BankDetails;
  logoUrl: string;
  isConfigured: boolean;
}

export interface ServiceItem {
  id: string;
  codigo: string;
  nome: string;
  categoria: 'Passeio / Leve' | 'SUV / Caminhonete' | 'Van / Utilitário' | 'Caminhão / Pesado' | 'Geral';
  precoPadrao: number;
  descricao?: string;
  ativo: boolean;
}

export interface Client {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  email: string;
  telefone: string;
  endereco?: string;
  // Preços personalizados de cada serviço para este cliente específico
  tabelaPrecos: Record<string, number>;
  ativo: boolean;
  criadoEm: string;
}

export interface ServiceItemLaunch {
  serviceId: string;
  nome: string;
  preco: number;
  quantidade: number;
  subtotal: number;
}

export interface ServiceLaunch {
  id: string;
  numeroOS: string;
  dataHora: string; // ISO format: 2026-09-23T10:30:00
  clienteId: string;
  clienteNome: string;
  clienteCnpj: string;
  placa: string;
  modelo: string;
  km: number | string;
  responsavel: string;
  nomeCondutor: string;
  matriculaCondutor: string;
  servicos: ServiceItemLaunch[];
  valorTotal: number;
  assinatura: string; // Base64 dataURL PNG
  observacoes?: string;
  status: 'Concluído' | 'Em Andamento';
}

export interface GoalsConfig {
  metaDiaria: number; // R$
  metaSemanal: number; // R$
  metaMensal: number; // R$
  metaDiariaQtd: number; // Qtd veículos
  metaSemanalQtd: number;
  metaMensalQtd: number;
}

export type ActiveTab = 'inicio' | 'lancamentos' | 'clientes' | 'servicos' | 'metas' | 'relatorios';
