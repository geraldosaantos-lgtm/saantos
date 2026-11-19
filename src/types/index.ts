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

export type ServiceCategory =
  | 'CARRO PEQUENO / PASSEIO'
  | 'SUV / CAMINHONETE'
  | 'VAN / UTILITÁRIO'
  | 'CAMINHÃO / PESADO'
  | 'MOTO / OUTROS'
  | 'GERAL'
  | string;

export interface ServiceItem {
  id: string;
  codigo: string;
  nome: string;
  categoria: ServiceCategory;
  precoPadrao: number;
  descricao?: string;
  ativo: boolean;
}

export interface ClientVehicle {
  placa: string;
  modelo: string;
  cadastradoEm?: string;
}

export interface Client {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  email: string;
  enviarEmail?: boolean; // Habilita ou desabilita o envio de e-mail para este cliente
  telefone: string;
  endereco?: string;
  // Preços personalizados de cada serviço para este cliente específico
  tabelaPrecos: Record<string, number>;
  // Veículos vinculados a este cliente
  veiculos?: ClientVehicle[];
  ativo: boolean;
  criadoEm: string;
}

export interface ServiceItemLaunch {
  serviceId: string;
  nome: string;
  categoria?: string; // Classe do serviço (ex: Passeio / Leve, SUV / Caminhonete, etc.)
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
  contratoCentroCusto?: string; // Contrato ou Centro de Custo para controle de frotas e relatórios
  servicos: ServiceItemLaunch[];
  valorTotal: number;
  assinatura: string; // Base64 dataURL PNG
  observacoes?: string;
  status: 'Concluído' | 'Em Andamento';
}

export type HolidayScope =
  | 'nacional'
  | 'estadual'
  | 'municipal'
  | 'ponto_facultativo'
  | 'personalizado';

export type GoalRedistributeMode =
  | 'mensal_para_dias_uteis'
  | 'semanal_para_dias_uteis'
  | 'proporcional_dias_uteis';

export interface CalendarHolidayItem {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  scope: HolidayScope;
  uf?: string;
  city?: string;
  trabalhado: boolean; // true = feriado será trabalhado; false = folga
  isCustom?: boolean;
}

export interface GoalsCalendarConfig {
  applyToGoals: boolean;
  uf: string;
  cidade: string;
  workingDaysOfWeek: number[]; // 0=Dom, 1=Seg ... 6=Sáb
  redistributeMode: GoalRedistributeMode;
  holidays: CalendarHolidayItem[]; // Feriados personalizados ou overrides (trabalhado/folga)
  removedHolidayKeys?: string[]; // Chaves `${date}__${name}` de feriados automáticos ocultados pelo usuário
  recessoDates: string[]; // Datas YYYY-MM-DD marcadas como recesso / feriado prolongado
  recessoNotes?: Record<string, string>; // Descrição opcional por data de recesso
  extraWorkingDates?: string[]; // Datas fora do padrão (ex: sábado/domingo) marcadas como dia trabalhado
}

export interface GoalsConfig {
  metaDiaria: number; // R$
  metaSemanal: number; // R$
  metaMensal: number; // R$
  metaDiariaQtd: number; // Qtd veículos
  metaSemanalQtd: number;
  metaMensalQtd: number;
  calendarConfig?: GoalsCalendarConfig;
}

export type AccountPlanType = 'receita' | 'despesa' | 'transferencia';

export interface AccountPlanItem {
  id: string;
  codigo: string;
  nome: string;
  tipo: AccountPlanType;
  grupo: string;
  descricao?: string;
  ativo: boolean;
}

export type CustomFieldInputType = 'texto' | 'numero' | 'data' | 'selecao';

export interface FinancialCustomField {
  id: string;
  nome: string;
  tipo: CustomFieldInputType;
  opcoes?: string[];
  ativo: boolean;
}

export type BankAccountType =
  | 'Conta Corrente'
  | 'Poupança'
  | 'Caixa Físico'
  | 'Carteira Digital'
  | 'Investimento';

export interface BankAccount {
  id: string;
  nome: string; // Apelido curto exibido nos lançamentos (ex: SICREDI, CAIXA INTERNO)
  banco: string; // Instituição (ex: SICREDI / 748, ITAÚ / 341)
  agencia: string;
  numeroConta: string;
  tipoConta: BankAccountType;
  saldoInicial: number;
  dataSaldoInicial: string; // YYYY-MM-DD
  chavePix?: string;
  observacoes?: string;
  ativo: boolean;
}

export interface FinancialEntry {
  id: string;
  data: string; // YYYY-MM-DD
  descricao: string;
  tipo: AccountPlanType;
  contaId: string;
  contaNome: string;
  grupo: string;
  valor: number;
  banco: string;
  bancoId?: string;
  bancoDestino?: string;
  bancoDestinoId?: string;
  formaPagamento?: string;
  documento?: string;
  status: 'Conciliado' | 'Pendente';
  origem: 'manual' | 'extrato' | 'modelo';
  observacoes?: string;
  camposExtras?: Record<string, string>;
  criadoEm?: string;
}

export type ActiveTab =
  | 'inicio'
  | 'lancamentos'
  | 'clientes'
  | 'servicos'
  | 'metas'
  | 'financeiro'
  | 'relatorios';
