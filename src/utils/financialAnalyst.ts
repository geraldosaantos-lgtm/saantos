import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  FinancialEntry,
  AccountPlanItem,
  BankAccount,
  CompanyProfile,
} from '../types';
import { formatCurrency } from './storage';

export type CostNature =
  | 'receita_operacional'
  | 'receita_financeira'
  | 'deducao'
  | 'variavel'
  | 'fixo'
  | 'financeira'
  | 'depreciacao'
  | 'investimento';

export const COST_NATURE_LABELS: Record<CostNature, string> = {
  receita_operacional: 'Receita Operacional',
  receita_financeira: 'Receita Financeira / Outras',
  deducao: 'Dedução / Imposto s/ Receita',
  variavel: 'Custo / Despesa Variável',
  fixo: 'Custo / Despesa Fixa',
  financeira: 'Despesa Financeira / Juros / Tarifa',
  depreciacao: 'Depreciação / Amortização',
  investimento: 'Investimento / CAPEX',
};

export const EXPENSE_COST_NATURES: CostNature[] = [
  'variavel',
  'fixo',
  'deducao',
  'financeira',
  'depreciacao',
  'investimento',
];

export const REVENUE_COST_NATURES: CostNature[] = [
  'receita_operacional',
  'receita_financeira',
];

const ANALYST_OVERRIDES_KEY = 'autolava_analyst_cost_map_v1';

export const loadAccountCostNatureOverrides = (): Record<string, CostNature> => {
  try {
    const raw = localStorage.getItem(ANALYST_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const saveAccountCostNatureOverrides = (map: Record<string, CostNature>) => {
  try {
    localStorage.setItem(ANALYST_OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    // Ignora falha de armazenamento em modo privado
  }
};

const normalizeText = (val: string) =>
  (val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

export const inferAccountCostNature = (
  entryOrAccount: {
    contaId?: string;
    contaNome?: string;
    nome?: string;
    grupo?: string;
    tipo: string;
    descricao?: string;
  },
  overrides: Record<string, CostNature> = {}
): CostNature => {
  const key = entryOrAccount.contaId || normalizeText(entryOrAccount.contaNome || entryOrAccount.nome || '');
  if (key && overrides[key]) {
    const override = overrides[key];
    if (entryOrAccount.tipo === 'receita' && REVENUE_COST_NATURES.includes(override)) {
      return override;
    }
    if (entryOrAccount.tipo === 'despesa' && EXPENSE_COST_NATURES.includes(override)) {
      return override;
    }
  }

  const text = normalizeText(
    `${entryOrAccount.contaNome || entryOrAccount.nome || ''} ${entryOrAccount.grupo || ''} ${entryOrAccount.descricao || ''}`
  );

  if (entryOrAccount.tipo === 'receita') {
    if (
      text.includes('FINANCEIR') ||
      text.includes('RENDIMENT') ||
      text.includes('JUROS RECEB') ||
      text.includes('REEMBOLSO') ||
      text.includes('OUTRAS RECEITAS')
    ) {
      return 'receita_financeira';
    }
    return 'receita_operacional';
  }

  // Classificação inteligente para despesas
  if (text.includes('DEPRECIAC') || text.includes('AMORTIZAC')) {
    return 'depreciacao';
  }
  if (
    text.includes('INVESTIMENT') ||
    text.includes('CAPEX') ||
    text.includes('COMPRA DE MAQUINA') ||
    text.includes('IMOBILIZADO') ||
    text.includes('REFORMA ESTRUTURAL')
  ) {
    return 'investimento';
  }
  if (
    text.includes('DAS') ||
    text.includes('SIMPLES') ||
    text.includes('IMPOSTO') ||
    text.includes('ISS') ||
    text.includes('PIS') ||
    text.includes('COFINS') ||
    text.includes('ICMS') ||
    text.includes('DEDUCAO') ||
    text.includes('ESTORNO') ||
    text.includes('TAXA MAQUININHA') ||
    text.includes('CARTAO')
  ) {
    return 'deducao';
  }
  if (
    text.includes('TARIFA') ||
    text.includes('FINANCEIR') ||
    text.includes('JUROS') ||
    text.includes('IOF') ||
    text.includes('EMPRESTIM') ||
    text.includes('MULTA') ||
    text.includes('BOLETO')
  ) {
    return 'financeira';
  }
  if (
    text.includes('VARIAV') ||
    text.includes('INSUMO') ||
    text.includes('QUIMIC') ||
    text.includes('SHAMPOO') ||
    text.includes('CERA') ||
    text.includes('COMISS') ||
    text.includes('COMBUST') ||
    text.includes('FRETE') ||
    text.includes('MATERIAL') ||
    text.includes('EPI') ||
    text.includes('DESENGRAX')
  ) {
    return 'variavel';
  }
  // Folha, aluguel, água, energia, manutenção, despesas fixas ou gerais por padrão
  return 'fixo';
};

export type InsightLevel = 'critico' | 'atencao' | 'positivo' | 'oportunidade';

export interface AnalystInsight {
  id: string;
  nivel: InsightLevel;
  categoria: string;
  titulo: string;
  observacao: string;
  acaoRecomendada: string;
}

export interface DreLine {
  label: string;
  valor: number;
  pctReceita: number | null;
  type: 'receita' | 'deducao' | 'subtotal' | 'despesa' | 'resultado';
  hint?: string;
}

export interface AccountBreakdownItem {
  key: string;
  nome: string;
  grupo: string;
  tipo: 'receita' | 'despesa';
  nature: CostNature;
  total: number;
  count: number;
  pctSobreReceita: number;
}

export interface CashFlowProjection {
  saldoAtualBancos: number;
  receitasPendentesPeriodo: number;
  despesasPendentesPeriodo: number;
  receitasPendentesTotal: number;
  despesasPendentesTotal: number;
  saldoAposPendencias: number;
  mediaDiariaLiquida30d: number;
  mediaDiariaReceita30d: number;
  mediaDiariaDespesa30d: number;
  projecao30Dias: number;
  diasDeCaixa: number | null;
}

export interface FinancialAnalysisReport {
  healthScore: number;
  healthStatus: 'Saudável' | 'Atenção' | 'Crítico' | 'Sem Dados';
  resumoExecutivo: string;

  // 9 indicadores solicitados + apoio
  receitaBruta: number;
  deducoesReceita: number;
  receitaLiquida: number;
  receitasFinanceiras: number;
  totalReceitasGeral: number;

  custosVariaveis: number;
  indiceCustosVariaveis: number;
  custosFixos: number;
  indiceCustosFixos: number;

  margemContribuicaoValor: number;
  margemContribuicaoPct: number;

  pontoEquilibrioValor: number;
  pontoEquilibrioViavel: boolean;
  margemSegurancaValor: number;
  margemSegurancaPct: number;
  faltaParaEquilibrio: number;

  resultadoOperacionalValor: number;
  resultadoOperacionalPct: number;
  depreciacaoAmortizacao: number;
  ebitdaValor: number;
  ebitdaPct: number;

  despesasFinanceiras: number;
  investimentos: number;
  totalDespesasGeral: number;
  pctDespesasSobreReceita: number;
  saldoLiquidoFinal: number;

  qtdReceitas: number;
  qtdDespesas: number;
  qtdPendentesPeriodo: number;
  qtdSemPlano: number;

  fluxoCaixa: CashFlowProjection;
  dreLines: DreLine[];
  accountBreakdown: AccountBreakdownItem[];
  insights: AnalystInsight[];
}

export const buildFinancialAnalysisReport = (params: {
  filteredEntries: FinancialEntry[];
  allEntries: FinancialEntry[];
  accountsPlan: AccountPlanItem[];
  bankAccounts: BankAccount[];
  operationalRefRevenue: number;
  costNatureOverrides?: Record<string, CostNature>;
  periodLabel: string;
}): FinancialAnalysisReport => {
  const {
    filteredEntries,
    allEntries,
    accountsPlan,
    bankAccounts,
    operationalRefRevenue,
    costNatureOverrides = {},
    periodLabel,
  } = params;

  const accountById = new Map<string, AccountPlanItem>();
  accountsPlan.forEach((a) => accountById.set(a.id, a));

  let receitaBruta = 0;
  let receitasFinanceiras = 0;
  let deducoesReceita = 0;
  let custosVariaveis = 0;
  let custosFixos = 0;
  let despesasFinanceiras = 0;
  let depreciacaoAmortizacao = 0;
  let investimentos = 0;

  let qtdReceitas = 0;
  let qtdDespesas = 0;
  let qtdPendentesPeriodo = 0;
  let qtdSemPlano = 0;
  let receitasPendentesPeriodo = 0;
  let despesasPendentesPeriodo = 0;

  const breakdownMap = new Map<string, AccountBreakdownItem>();

  filteredEntries.forEach((e) => {
    if (e.tipo === 'transferencia') return;
    const val = Math.abs(Number(e.valor) || 0);
    const planAcc = e.contaId ? accountById.get(e.contaId) : undefined;
    const nome = (planAcc?.nome || e.contaNome || (e.tipo === 'receita' ? 'OUTRAS RECEITAS' : 'OUTRAS DESPESAS')).toUpperCase();
    const grupo = (planAcc?.grupo || e.grupo || 'GERAL').toUpperCase();
    const key = e.contaId || normalizeText(nome);

    if (!e.contaId) qtdSemPlano += 1;

    if (e.status === 'Pendente') {
      qtdPendentesPeriodo += 1;
      if (e.tipo === 'receita') receitasPendentesPeriodo += val;
      else despesasPendentesPeriodo += val;
    }

    const nature = inferAccountCostNature(
      {
        contaId: e.contaId,
        contaNome: nome,
        grupo,
        tipo: e.tipo,
        descricao: planAcc?.descricao || e.descricao,
      },
      costNatureOverrides
    );

    if (e.tipo === 'receita') {
      qtdReceitas += 1;
      if (nature === 'receita_financeira') receitasFinanceiras += val;
      else receitaBruta += val;
    } else {
      qtdDespesas += 1;
      if (nature === 'deducao') deducoesReceita += val;
      else if (nature === 'variavel') custosVariaveis += val;
      else if (nature === 'financeira') despesasFinanceiras += val;
      else if (nature === 'depreciacao') depreciacaoAmortizacao += val;
      else if (nature === 'investimento') investimentos += val;
      else custosFixos += val;
    }

    const existing = breakdownMap.get(key) || {
      key,
      nome,
      grupo,
      tipo: e.tipo === 'receita' ? 'receita' : 'despesa',
      nature,
      total: 0,
      count: 0,
      pctSobreReceita: 0,
    };
    existing.total += val;
    existing.count += 1;
    breakdownMap.set(key, existing);
  });

  const receitaLiquida = Math.max(0, receitaBruta - deducoesReceita);
  const baseReceita = receitaLiquida > 0 ? receitaLiquida : receitaBruta;
  const totalReceitasGeral = receitaBruta + receitasFinanceiras;
  const totalDespesasGeral =
    deducoesReceita +
    custosVariaveis +
    custosFixos +
    despesasFinanceiras +
    depreciacaoAmortizacao +
    investimentos;

  const indiceCustosVariaveis = baseReceita > 0 ? (custosVariaveis / baseReceita) * 100 : 0;
  const indiceCustosFixos = baseReceita > 0 ? (custosFixos / baseReceita) * 100 : 0;

  const margemContribuicaoValor = receitaLiquida - custosVariaveis;
  const margemContribuicaoPct = baseReceita > 0 ? (margemContribuicaoValor / baseReceita) * 100 : 0;

  // Ponto de equilíbrio = Custos Fixos / (MC%)
  const pontoEquilibrioViavel = margemContribuicaoPct > 0;
  const pontoEquilibrioValor = pontoEquilibrioViavel
    ? custosFixos / (margemContribuicaoPct / 100)
    : 0;
  const margemSegurancaValor = pontoEquilibrioViavel ? receitaLiquida - pontoEquilibrioValor : 0;
  const margemSegurancaPct =
    pontoEquilibrioViavel && receitaLiquida > 0
      ? (margemSegurancaValor / receitaLiquida) * 100
      : 0;
  const faltaParaEquilibrio =
    pontoEquilibrioViavel && receitaLiquida < pontoEquilibrioValor
      ? pontoEquilibrioValor - receitaLiquida
      : 0;

  // EBITDA = Receita Líquida - Custos Variáveis - Custos Fixos
  // Resultado Operacional (EBIT) = EBITDA - Depreciação/Amortização
  const ebitdaValor = margemContribuicaoValor - custosFixos;
  const ebitdaPct = baseReceita > 0 ? (ebitdaValor / baseReceita) * 100 : 0;
  const resultadoOperacionalValor = ebitdaValor - depreciacaoAmortizacao;
  const resultadoOperacionalPct = baseReceita > 0 ? (resultadoOperacionalValor / baseReceita) * 100 : 0;

  const pctDespesasSobreReceita =
    totalReceitasGeral > 0 ? (totalDespesasGeral / totalReceitasGeral) * 100 : totalDespesasGeral > 0 ? 100 : 0;

  const saldoLiquidoFinal = totalReceitasGeral - totalDespesasGeral;

  const accountBreakdown = Array.from(breakdownMap.values())
    .map((item) => ({
      ...item,
      pctSobreReceita:
        totalReceitasGeral > 0 ? (item.total / totalReceitasGeral) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Projeção de Fluxo de Caixa com base nos Saldos Bancários + Pendências + Ritmo dos últimos 30 dias
  let saldoAtualBancos = 0;
  bankAccounts.forEach((bank) => {
    if (!bank.ativo) return;
    const bankUpper = bank.nome.trim().toUpperCase();
    const matchOrigin = (e: FinancialEntry) =>
      e.bancoId === bank.id || (!e.bancoId && (e.banco || '').trim().toUpperCase() === bankUpper);
    const matchDest = (e: FinancialEntry) =>
      e.tipo === 'transferencia' &&
      (e.bancoDestinoId === bank.id ||
        (!e.bancoDestinoId && (e.bancoDestino || '').trim().toUpperCase() === bankUpper));

    let ent = 0;
    let sai = 0;
    allEntries.forEach((e) => {
      if (bank.dataSaldoInicial && e.data && e.data < bank.dataSaldoInicial) return;
      if (e.status === 'Pendente') return;
      const val = Math.abs(Number(e.valor) || 0);
      if (e.tipo === 'transferencia') {
        if (matchOrigin(e)) sai += val;
        if (matchDest(e)) ent += val;
        return;
      }
      if (!matchOrigin(e)) return;
      if (e.tipo === 'receita') ent += val;
      else sai += val;
    });
    saldoAtualBancos += (Number(bank.saldoInicial) || 0) + ent - sai;
  });

  // Fallback se não houver contas bancárias cadastradas
  if (bankAccounts.length === 0) {
    allEntries.forEach((e) => {
      if (e.tipo === 'transferencia' || e.status === 'Pendente') return;
      const val = Math.abs(Number(e.valor) || 0);
      if (e.tipo === 'receita') saldoAtualBancos += val;
      else saldoAtualBancos -= val;
    });
  }

  let receitasPendentesTotal = 0;
  let despesasPendentesTotal = 0;
  const now = new Date();
  const cutoff30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const cutoff30Str = `${cutoff30.getFullYear()}-${String(cutoff30.getMonth() + 1).padStart(2, '0')}-${String(cutoff30.getDate()).padStart(2, '0')}`;
  let rec30d = 0;
  let desp30d = 0;

  allEntries.forEach((e) => {
    if (e.tipo === 'transferencia') return;
    const val = Math.abs(Number(e.valor) || 0);
    if (e.status === 'Pendente') {
      if (e.tipo === 'receita') receitasPendentesTotal += val;
      else despesasPendentesTotal += val;
    } else if (e.data && e.data >= cutoff30Str) {
      if (e.tipo === 'receita') rec30d += val;
      else desp30d += val;
    }
  });

  const mediaDiariaReceita30d = rec30d / 30;
  const mediaDiariaDespesa30d = desp30d / 30;
  const mediaDiariaLiquida30d = mediaDiariaReceita30d - mediaDiariaDespesa30d;

  const saldoAposPendencias = saldoAtualBancos + receitasPendentesTotal - despesasPendentesTotal;
  const projecao30Dias = saldoAposPendencias + mediaDiariaLiquida30d * 30;
  const diasDeCaixa =
    mediaDiariaDespesa30d > 0
      ? Math.max(0, Math.round(saldoAtualBancos / mediaDiariaDespesa30d))
      : null;

  const fluxoCaixa: CashFlowProjection = {
    saldoAtualBancos,
    receitasPendentesPeriodo,
    despesasPendentesPeriodo,
    receitasPendentesTotal,
    despesasPendentesTotal,
    saldoAposPendencias,
    mediaDiariaLiquida30d,
    mediaDiariaReceita30d,
    mediaDiariaDespesa30d,
    projecao30Dias,
    diasDeCaixa,
  };

  // DRE Gerencial Estruturada
  const pct = (v: number) => (baseReceita > 0 ? (v / baseReceita) * 100 : null);
  const dreLines: DreLine[] = [
    {
      label: '(+) Receita Operacional Bruta',
      valor: receitaBruta,
      pctReceita: receitaBruta > 0 ? 100 : null,
      type: 'receita',
    },
    {
      label: '(-) Deduções e Impostos sobre Receita',
      valor: -deducoesReceita,
      pctReceita: receitaBruta > 0 ? -(deducoesReceita / receitaBruta) * 100 : null,
      type: 'deducao',
    },
    {
      label: '(=) Receita Líquida',
      valor: receitaLiquida,
      pctReceita: baseReceita > 0 ? 100 : null,
      type: 'subtotal',
    },
    {
      label: '(-) Custos e Despesas Variáveis',
      valor: -custosVariaveis,
      pctReceita: pct(-custosVariaveis),
      type: 'despesa',
      hint: 'Insumos, comissões, combustíveis e custos ligados à operação direta',
    },
    {
      label: '(=) Margem de Contribuição',
      valor: margemContribuicaoValor,
      pctReceita: pct(margemContribuicaoValor),
      type: 'subtotal',
      hint: 'Quanto sobra da receita para pagar a estrutura fixa e gerar lucro',
    },
    {
      label: '(-) Custos e Despesas Fixas',
      valor: -custosFixos,
      pctReceita: pct(-custosFixos),
      type: 'despesa',
      hint: 'Folha, aluguel, água, energia, manutenção e estrutura fixa',
    },
    {
      label: '(=) EBITDA (LAJIDA)',
      valor: ebitdaValor,
      pctReceita: pct(ebitdaValor),
      type: 'subtotal',
      hint: 'Geração de caixa operacional antes de juros, impostos s/ lucro e depreciação',
    },
    {
      label: '(-) Depreciação / Amortização',
      valor: -depreciacaoAmortizacao,
      pctReceita: pct(-depreciacaoAmortizacao),
      type: 'deducao',
    },
    {
      label: '(=) Resultado Operacional (EBIT)',
      valor: resultadoOperacionalValor,
      pctReceita: pct(resultadoOperacionalValor),
      type: 'subtotal',
    },
    {
      label: '(+/-) Resultado Financeiro e Investimentos',
      valor: receitasFinanceiras - despesasFinanceiras - investimentos,
      pctReceita: pct(receitasFinanceiras - despesasFinanceiras - investimentos),
      type: 'deducao',
      hint: `Rec. Financ. (${formatCurrency(receitasFinanceiras)}) - Tarifas/Juros (${formatCurrency(despesasFinanceiras)}) - Investimentos (${formatCurrency(investimentos)})`,
    },
    {
      label: '(=) Resultado Líquido do Período',
      valor: saldoLiquidoFinal,
      pctReceita: pct(saldoLiquidoFinal),
      type: 'resultado',
    },
  ];

  // Motor de Diagnóstico Especialista: Pontos a Observar + Dicas de Melhoria
  const insights: AnalystInsight[] = [];
  const expenseItems = accountBreakdown.filter((i) => i.tipo === 'despesa');
  const topExpense = expenseItems[0];
  const secondExpense = expenseItems[1];
  const topVariableExpense = expenseItems.find((i) => i.nature === 'variavel');
  const topFixedExpense = expenseItems.find((i) => i.nature === 'fixo');

  const hasData = totalReceitasGeral > 0 || totalDespesasGeral > 0;

  if (!hasData) {
    insights.push({
      id: 'sem-dados',
      nivel: 'atencao',
      categoria: 'Base de Análise',
      titulo: `Sem movimentações financeiras em "${periodLabel}"`,
      observacao:
        operationalRefRevenue > 0
          ? `Não há receitas nem despesas lançadas no Financeiro para este período, porém o pátio já registrou ${formatCurrency(operationalRefRevenue)} em Ordens de Serviço.`
          : 'Nenhuma receita ou despesa foi registrada no período selecionado.',
      acaoRecomendada:
        'Importe seu extrato bancário na aba Financeiro ou lance suas receitas e despesas fixas/variáveis para liberar o cálculo de Margem de Contribuição, EBITDA e Ponto de Equilíbrio.',
    });
  } else {
    // 1. Comprometimento / Resultado Geral
    if (totalReceitasGeral === 0 && totalDespesasGeral > 0) {
      insights.push({
        id: 'sem-receita',
        nivel: 'critico',
        categoria: 'Receita vs Despesa',
        titulo: 'Despesas lançadas sem nenhuma receita registrada no período',
        observacao: `Foram registradas despesas de ${formatCurrency(totalDespesasGeral)}, mas nenhuma entrada de receita financeira foi contabilizada em "${periodLabel}".${
          operationalRefRevenue > 0
            ? ` (O pátio possui ${formatCurrency(operationalRefRevenue)} em OS emitidas).`
            : ''
        }`,
        acaoRecomendada:
          'Verifique se o extrato bancário de entradas ou os recebimentos de clientes/frotas já foram baixados no Financeiro para não distorcer a margem e o EBITDA.',
      });
    } else if (pctDespesasSobreReceita > 100) {
      insights.push({
        id: 'deficit-geral',
        nivel: 'critico',
        categoria: 'Lucratividade & Caixa',
        titulo: `Despesas consomem ${pctDespesasSobreReceita.toFixed(1)}% da receita (Déficit)`,
        observacao: `O período fecha negativo em ${formatCurrency(Math.abs(saldoLiquidoFinal))}. As despesas totais (${formatCurrency(totalDespesasGeral)}) superaram as receitas (${formatCurrency(totalReceitasGeral)}).`,
        acaoRecomendada: topExpense
          ? `Ataque imediatamente a maior conta de saída ("${topExpense.nome}", que representa ${topExpense.pctSobreReceita.toFixed(1)}% da receita / ${formatCurrency(topExpense.total)}) e suspenda gastos não essenciais até zerar o déficit.`
          : 'Revise imediatamente gastos discricionários e acelere a cobrança de recebíveis pendentes.',
      });
    } else if (pctDespesasSobreReceita >= 85) {
      insights.push({
        id: 'comprometimento-alto',
        nivel: 'atencao',
        categoria: 'Lucratividade & Caixa',
        titulo: `Comprometimento elevado: despesas consomem ${pctDespesasSobreReceita.toFixed(1)}% da receita`,
        observacao: `A folga financeira atual é estreita (${(100 - pctDespesasSobreReceita).toFixed(1)}% de sobra líquida). Qualquer queda de movimento ou imprevisto pode levar o resultado para o negativo.`,
        acaoRecomendada:
          'Defina um teto máximo de 75% a 80% de despesas sobre a receita e renegocie prazos/valores nas 2 maiores contas de despesa.',
      });
    } else {
      insights.push({
        id: 'comprometimento-saudavel',
        nivel: 'positivo',
        categoria: 'Lucratividade & Caixa',
        titulo: `Estrutura de gastos controlada (${pctDespesasSobreReceita.toFixed(1)}% da receita)`,
        observacao: `Resta uma sobra líquida de ${formatCurrency(saldoLiquidoFinal)} (${(100 - pctDespesasSobreReceita).toFixed(1)}% da receita total) após pagar todos os compromissos do período.`,
        acaoRecomendada:
          'Direcione parte dessa geração líquida para reserva de capital de giro (mínimo 30 dias de custo fixo) e manutenção preventiva.',
      });
    }

    // 2. Margem de Contribuição & Custos Variáveis
    if (baseReceita > 0) {
      if (margemContribuicaoPct <= 0) {
        insights.push({
          id: 'mc-negativa',
          nivel: 'critico',
          categoria: 'Margem de Contribuição',
          titulo: `Margem de Contribuição negativa (${margemContribuicaoPct.toFixed(1)}%)`,
          observacao: `Os custos variáveis (${formatCurrency(custosVariaveis)} — índice de ${indiceCustosVariaveis.toFixed(1)}%) ultrapassaram a Receita Líquida (${formatCurrency(receitaLiquida)}). Cada serviço vendido gera prejuízo direto.`,
          acaoRecomendada: topVariableExpense
            ? `Audite "${topVariableExpense.nome}" (${formatCurrency(topVariableExpense.total)}), revise desperdício de insumos/produtos químicos e reajuste urgentemente a tabela de preços.`
            : 'Revise precificação e custos variáveis diretos antes de ampliar volume de atendimento.',
        });
      } else if (margemContribuicaoPct < 45) {
        insights.push({
          id: 'mc-baixa',
          nivel: 'atencao',
          categoria: 'Margem de Contribuição',
          titulo: `Margem de Contribuição apertada (${margemContribuicaoPct.toFixed(1)}%)`,
          observacao: `Índice de Custos Variáveis está em ${indiceCustosVariaveis.toFixed(1)}% (${formatCurrency(custosVariaveis)}). Para operações de serviços automotivos, uma margem de contribuição saudável costuma ficar acima de 55%.`,
          acaoRecomendada: topVariableExpense
            ? `Foque em reduzir "${topVariableExpense.nome}" (${formatCurrency(topVariableExpense.total)}) com compras em bombonas concentradas/diluição controlada e priorize vendas de serviços de maior ticket (Geral, Higienização, Polimento).`
            : 'Melhore o mix de serviços para pacotes completos e negocie descontos por volume com fornecedores.',
        });
      } else {
        insights.push({
          id: 'mc-boa',
          nivel: 'positivo',
          categoria: 'Margem de Contribuição',
          titulo: `Boa Margem de Contribuição (${margemContribuicaoPct.toFixed(1)}%)`,
          observacao: `Cada R$ 100,00 de receita líquida deixa R$ ${margemContribuicaoPct.toFixed(2).replace('.', ',')} livres após custos variáveis (ICV de ${indiceCustosVariaveis.toFixed(1)}%).`,
          acaoRecomendada:
            'Como sua margem unitária é forte, campanhas para aumentar o volume de veículos em horários ociosos multiplicam rapidamente o lucro líquido.',
        });
      }
    }

    // 3. Ponto de Equilíbrio & Custos Fixos
    if (custosFixos > 0) {
      if (!pontoEquilibrioViavel) {
        insights.push({
          id: 'pe-inviavel',
          nivel: 'critico',
          categoria: 'Ponto de Equilíbrio',
          titulo: 'Ponto de Equilíbrio inatingível com a margem atual',
          observacao: `Existem ${formatCurrency(custosFixos)} de custos fixos, mas a Margem de Contribuição não está positiva.`,
          acaoRecomendada:
            'Reduza custos variáveis imediatamente e confira no painel de classificação abaixo se alguma despesa fixa foi classificada como variável por engano.',
        });
      } else if (faltaParaEquilibrio > 0) {
        insights.push({
          id: 'abaixo-pe',
          nivel: 'critico',
          categoria: 'Ponto de Equilíbrio',
          titulo: `Receita abaixo do Ponto de Equilíbrio (faltam ${formatCurrency(faltaParaEquilibrio)})`,
          observacao: `O Ponto de Equilíbrio exige ${formatCurrency(pontoEquilibrioValor)} de receita líquida para cobrir os ${formatCurrency(custosFixos)} de custos fixos (ICF atual: ${indiceCustosFixos.toFixed(1)}%). Hoje você atingiu ${formatCurrency(receitaLiquida)}.`,
          acaoRecomendada: topFixedExpense
            ? `Você tem dois caminhos imediatos: faturar mais ${formatCurrency(faltaParaEquilibrio)} ou reduzir a estrutura fixa, começando por "${topFixedExpense.nome}" (${formatCurrency(topFixedExpense.total)}).`
            : `Foque em gerar mais ${formatCurrency(faltaParaEquilibrio)} em faturamento líquido com ação comercial junto às frotas cadastradas.`,
        });
      } else if (margemSegurancaPct < 15) {
        insights.push({
          id: 'pe-proximo',
          nivel: 'atencao',
          categoria: 'Ponto de Equilíbrio',
          titulo: `Próximo ao Ponto de Equilíbrio (Margem de segurança de apenas ${margemSegurancaPct.toFixed(1)}%)`,
          observacao: `O faturamento líquido (${formatCurrency(receitaLiquida)}) superou o Ponto de Equilíbrio (${formatCurrency(pontoEquilibrioValor)}) por ${formatCurrency(margemSegurancaValor)}.`,
          acaoRecomendada:
            'Busque manter pelo menos 20% de margem de segurança acima do Ponto de Equilíbrio para absorver semanas com feriados ou chuva.',
        });
      } else {
        insights.push({
          id: 'pe-superado',
          nivel: 'positivo',
          categoria: 'Ponto de Equilíbrio',
          titulo: `Ponto de Equilíbrio superado com folga (+${margemSegurancaPct.toFixed(1)}%)`,
          observacao: `O Ponto de Equilíbrio de ${formatCurrency(pontoEquilibrioValor)} já foi coberto, gerando ${formatCurrency(margemSegurancaValor)} de margem de segurança.`,
          acaoRecomendada:
            'Mantenha o controle dos custos fixos (ICF atual em ' + indiceCustosFixos.toFixed(1) + '%) para alavancar ainda mais o EBITDA.',
        });
      }
    }

    if (indiceCustosFixos > 45 && baseReceita > 0) {
      insights.push({
        id: 'icf-alto',
        nivel: 'atencao',
        categoria: 'Custos Fixos',
        titulo: `Índice de Custos Fixos elevado (${indiceCustosFixos.toFixed(1)}% da Receita Líquida)`,
        observacao: `Os gastos fixos somam ${formatCurrency(custosFixos)}. Estruturas acima de 40% engessam o caixa em meses de menor movimento.`,
        acaoRecomendada: topFixedExpense
          ? `Revise contratos e consumo de "${topFixedExpense.nome}" (${formatCurrency(topFixedExpense.total)}) e avalie vincular parte da folha a metas/comissões por produção.`
          : 'Avalie converter parte dos custos fixos em remuneração variável atrelada ao faturamento.',
      });
    }

    // 4. EBITDA vs Resultado Financeiro
    if (ebitdaValor > 0 && despesasFinanceiras > ebitdaValor * 0.25) {
      insights.push({
        id: 'tarifas-corroendo-ebitda',
        nivel: 'atencao',
        categoria: 'EBITDA & Taxas Financeiras',
        titulo: 'Taxas bancárias / juros estão corroendo o EBITDA',
        observacao: `Sua operação gerou EBITDA positivo de ${formatCurrency(ebitdaValor)} (${ebitdaPct.toFixed(1)}%), mas ${formatCurrency(despesasFinanceiras)} foram consumidos por despesas financeiras e tarifas.`,
        acaoRecomendada:
          'Compare taxas de antecipação/maquininha, tarifas de conta corrente e priorize recebimentos via PIX sem taxa para preservar seu EBITDA até o lucro final.',
      });
    } else if (ebitdaValor < 0) {
      insights.push({
        id: 'ebitda-negativo',
        nivel: 'critico',
        categoria: 'EBITDA & Operação',
        titulo: `EBITDA operacional negativo (${formatCurrency(ebitdaValor)} · ${ebitdaPct.toFixed(1)}%)`,
        observacao:
          'A operação central do negócio não está gerando caixa operacional suficiente para se pagar antes mesmo de juros e investimentos.',
        acaoRecomendada:
          'Reestruture preços de serviços com baixa margem, elimine retrabalho no pátio e corte despesas fixas ou variáveis menos produtivas.',
      });
    }

    // 5. Concentração de Despesas (Pareto)
    if (topExpense && totalDespesasGeral > 0) {
      const shareTop1 = (topExpense.total / totalDespesasGeral) * 100;
      const shareTop2 = secondExpense
        ? ((topExpense.total + secondExpense.total) / totalDespesasGeral) * 100
        : shareTop1;
      if (shareTop1 >= 45) {
        insights.push({
          id: 'pareto-despesas',
          nivel: 'oportunidade',
          categoria: 'Eficiência de Custos',
          titulo: `"${topExpense.nome}" concentra ${shareTop1.toFixed(1)}% de todas as despesas`,
          observacao: secondExpense
            ? `Somando "${topExpense.nome}" (${formatCurrency(topExpense.total)}) e "${secondExpense.nome}" (${formatCurrency(secondExpense.total)}), essas 2 contas representam ${shareTop2.toFixed(1)}% das saídas.`
            : `Esta única categoria soma ${formatCurrency(topExpense.total)} no período.`,
          acaoRecomendada:
            'Qualquer economia de 10% nessa conta isolada gera impacto imediato no Resultado Operacional sem precisar aumentar vendas.',
        });
      }
    }
  }

  // 6. Fluxo de Caixa Projetado (sempre avaliado quando há saldo/pendências)
  if (fluxoCaixa.projecao30Dias < 0 || fluxoCaixa.saldoAposPendencias < 0) {
    insights.push({
      id: 'caixa-projetado-negativo',
      nivel: 'critico',
      categoria: 'Fluxo de Caixa Projetado',
      titulo: `Alerta de Fluxo de Caixa Projetado negativo (${formatCurrency(fluxoCaixa.projecao30Dias)})`,
      observacao: `Saldo atual em contas: ${formatCurrency(fluxoCaixa.saldoAtualBancos)}. Após contas pendentes (+${formatCurrency(fluxoCaixa.receitasPendentesTotal)} / -${formatCurrency(fluxoCaixa.despesasPendentesTotal)}), vai para ${formatCurrency(fluxoCaixa.saldoAposPendencias)} e projeta ${formatCurrency(fluxoCaixa.projecao30Dias)} em 30 dias.`,
      acaoRecomendada:
        'Evite novas compras à vista, renegocie vencimentos das despesas pendentes e antecipe o faturamento/recebimento das frotas em aberto.',
    });
  } else if (fluxoCaixa.diasDeCaixa !== null && fluxoCaixa.diasDeCaixa < 15 && allEntries.length > 0) {
    insights.push({
      id: 'reserva-baixa',
      nivel: 'atencao',
      categoria: 'Fluxo de Caixa Projetado',
      titulo: `Colchão de caixa para apenas ${fluxoCaixa.diasDeCaixa} dia(s) de operação`,
      observacao: `Com o ritmo médio diário de saídas de ${formatCurrency(fluxoCaixa.mediaDiariaDespesa30d)}/dia, o saldo atual (${formatCurrency(fluxoCaixa.saldoAtualBancos)}) cobre menos de 15 dias.`,
      acaoRecomendada:
        'Acumule reservas antes de realizar novos investimentos ou retiradas e acompanhe os vencimentos semanalmente.',
    });
  }

  // 7. Confronto Operacional (Pátio) vs Financeiro + Pendências
  if (operationalRefRevenue > 0 && totalReceitasGeral < operationalRefRevenue * 0.75) {
    const gapOs = operationalRefRevenue - totalReceitasGeral;
    insights.push({
      id: 'gap-patio-financeiro',
      nivel: 'oportunidade',
      categoria: 'Conciliação & Cobrança',
      titulo: `Diferença de ${formatCurrency(gapOs)} entre OS do Pátio e Receitas no Financeiro`,
      observacao: `Foram lançados ${formatCurrency(operationalRefRevenue)} em serviços de lavagem no período, mas apenas ${formatCurrency(totalReceitasGeral)} entraram como receita financeira.`,
      acaoRecomendada:
        'Verifique se há faturas mensais de clientes aguardando recebimento, ou importe o extrato bancário atualizado para conciliar os créditos que já caíram no banco.',
    });
  }

  if (qtdPendentesPeriodo > 0 || qtdSemPlano > 0) {
    insights.push({
      id: 'governanca-dados',
      nivel: 'atencao',
      categoria: 'Qualidade do Relatório',
      titulo: `${qtdPendentesPeriodo} lançamento(s) pendentes e ${qtdSemPlano} sem Plano de Contas`,
      observacao:
        'Itens sem categoria ou não conciliados podem distorcer a separação entre Custos Fixos, Variáveis e o saldo bancário real.',
      acaoRecomendada:
        'Classifique os itens pendentes na aba Movimentações / Extrato Bancário para manter EBITDA, Margem de Contribuição e Ponto de Equilíbrio 100% precisos.',
    });
  }

  // Cálculo do Score de Saúde Financeira (0 - 100)
  let healthScore = 70;
  let healthStatus: FinancialAnalysisReport['healthStatus'] = 'Atenção';

  if (!hasData) {
    healthScore = 0;
    healthStatus = 'Sem Dados';
  } else {
    let score = 60;
    if (ebitdaPct >= 20) score += 20;
    else if (ebitdaPct >= 10) score += 10;
    else if (ebitdaPct < 0) score -= 25;

    if (margemContribuicaoPct >= 55) score += 15;
    else if (margemContribuicaoPct >= 40) score += 5;
    else if (margemContribuicaoPct <= 0) score -= 20;

    if (pontoEquilibrioViavel && faltaParaEquilibrio === 0) score += 10;
    else if (faltaParaEquilibrio > 0) score -= 15;

    if (fluxoCaixa.projecao30Dias >= 0 && (fluxoCaixa.diasDeCaixa === null || fluxoCaixa.diasDeCaixa >= 20)) {
      score += 10;
    } else if (fluxoCaixa.projecao30Dias < 0) {
      score -= 20;
    }

    if (pctDespesasSobreReceita > 100) score -= 15;

    healthScore = Math.max(5, Math.min(100, Math.round(score)));
    healthStatus = healthScore >= 75 ? 'Saudável' : healthScore >= 45 ? 'Atenção' : 'Crítico';
  }

  // Resumo Executivo do Especialista
  let resumoExecutivo = '';
  if (!hasData) {
    resumoExecutivo =
      'Ainda não há movimentações financeiras lançadas neste período. Importe um extrato bancário ou registre suas primeiras receitas e despesas para gerar a análise completa.';
  } else {
    const situacaoEbitda =
      ebitdaValor >= 0
        ? `EBITDA positivo de ${formatCurrency(ebitdaValor)} (${ebitdaPct.toFixed(1)}%)`
        : `EBITDA negativo de ${formatCurrency(ebitdaValor)} (${ebitdaPct.toFixed(1)}%)`;
    const situacaoPe = !pontoEquilibrioViavel
      ? 'Ponto de Equilíbrio bloqueado por Margem de Contribuição negativa ou zerada'
      : faltaParaEquilibrio > 0
      ? `faltam ${formatCurrency(faltaParaEquilibrio)} de receita líquida para atingir o Ponto de Equilíbrio (${formatCurrency(pontoEquilibrioValor)})`
      : `o Ponto de Equilíbrio de ${formatCurrency(pontoEquilibrioValor)} já foi superado com ${formatCurrency(margemSegurancaValor)} de folga`;

    resumoExecutivo = `Em ${periodLabel}, a operação registrou Receita Líquida de ${formatCurrency(receitaLiquida)} e Margem de Contribuição de ${margemContribuicaoPct.toFixed(1)}% (${formatCurrency(margemContribuicaoValor)}), alcançando ${situacaoEbitda}. Atualmente ${situacaoPe}, e o Fluxo de Caixa projetado em 30 dias aponta para ${formatCurrency(fluxoCaixa.projecao30Dias)}.`;
  }

  return {
    healthScore,
    healthStatus,
    resumoExecutivo,
    receitaBruta,
    deducoesReceita,
    receitaLiquida,
    receitasFinanceiras,
    totalReceitasGeral,
    custosVariaveis,
    indiceCustosVariaveis,
    custosFixos,
    indiceCustosFixos,
    margemContribuicaoValor,
    margemContribuicaoPct,
    pontoEquilibrioValor,
    pontoEquilibrioViavel,
    margemSegurancaValor,
    margemSegurancaPct,
    faltaParaEquilibrio,
    resultadoOperacionalValor,
    resultadoOperacionalPct,
    depreciacaoAmortizacao,
    ebitdaValor,
    ebitdaPct,
    despesasFinanceiras,
    investimentos,
    totalDespesasGeral,
    pctDespesasSobreReceita,
    saldoLiquidoFinal,
    qtdReceitas,
    qtdDespesas,
    qtdPendentesPeriodo,
    qtdSemPlano,
    fluxoCaixa,
    dreLines,
    accountBreakdown,
    insights,
  };
};

// Exportação para PDF Executivo
export const exportFinancialAnalysisToPDF = (
  report: FinancialAnalysisReport,
  company: CompanyProfile,
  periodLabel: string
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxContentW = pageWidth - margin * 2;
  let y = 14;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  // Cabeçalho
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, maxContentW, 24, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RELATÓRIO DO ASSISTENTE FINANCEIRO ESPECIALISTA', margin + 5, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `${company.nomeFantasia || company.razaoSocial || 'EMPRESA'} · Período: ${periodLabel} · Saúde: ${report.healthStatus} (${report.healthScore}/100)`,
    margin + 5,
    y + 16
  );
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, margin + 5, y + 21);
  y += 30;

  // Parecer Executivo
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PARECER EXECUTIVO', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const summaryLines = doc.splitTextToSize(report.resumoExecutivo, maxContentW);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4.2 + 5;

  // Indicadores Estratégicos (3x3)
  ensureSpace(48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INDICADORES FINANCEIROS ESTRATÉGICOS', margin, y);
  y += 4;

  const kpis = [
    { label: 'Receita Líquida', value: formatCurrency(report.receitaLiquida) },
    {
      label: 'Margem de Contribuição',
      value: `${formatCurrency(report.margemContribuicaoValor)} (${report.margemContribuicaoPct.toFixed(1)}%)`,
    },
    {
      label: 'Ponto de Equilíbrio',
      value: report.pontoEquilibrioViavel ? formatCurrency(report.pontoEquilibrioValor) : 'Inviável (MC <= 0)',
    },
    {
      label: 'EBITDA (LAJIDA)',
      value: `${formatCurrency(report.ebitdaValor)} (${report.ebitdaPct.toFixed(1)}%)`,
    },
    {
      label: 'Resultado Operacional',
      value: `${formatCurrency(report.resultadoOperacionalValor)} (${report.resultadoOperacionalPct.toFixed(1)}%)`,
    },
    {
      label: 'Índice Custos Fixos',
      value: `${report.indiceCustosFixos.toFixed(1)}% (${formatCurrency(report.custosFixos)})`,
    },
    {
      label: 'Índice Custos Variáveis',
      value: `${report.indiceCustosVariaveis.toFixed(1)}% (${formatCurrency(report.custosVariaveis)})`,
    },
    {
      label: '% Despesas s/ Receita',
      value: `${report.pctDespesasSobreReceita.toFixed(1)}%`,
    },
    {
      label: 'Fluxo de Caixa Projetado (30d)',
      value: formatCurrency(report.fluxoCaixa.projecao30Dias),
    },
  ];

  const colW = (maxContentW - 6) / 3;
  kpis.forEach((k, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const kx = margin + col * (colW + 3);
    const ky = y + row * 14;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kx, ky, colW, 12, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label.toUpperCase(), kx + 2.5, ky + 4.5);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(k.value, kx + 2.5, ky + 9.8);
  });
  y += 46;

  // DRE Resumida
  ensureSpace(65);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('DRE GERENCIAL DO PERÍODO', margin, y);
  y += 4;

  report.dreLines.forEach((line) => {
    ensureSpace(7);
    const isStrong = line.type === 'subtotal' || line.type === 'resultado';
    if (isStrong) {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, maxContentW, 5.8, 'F');
    }
    doc.setFont('helvetica', isStrong ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(isStrong ? 15 : 51, isStrong ? 23 : 65, isStrong ? 42 : 85);
    doc.text(line.label, margin + 2, y + 4.1);
    doc.text(formatCurrency(line.valor), pageWidth - margin - 26, y + 4.1, { align: 'right' });
    doc.text(
      line.pctReceita !== null ? `${line.pctReceita.toFixed(1)}%` : '—',
      pageWidth - margin - 2,
      y + 4.1,
      { align: 'right' }
    );
    y += 5.8;
  });
  y += 6;

  // Diagnóstico e Recomendações
  ensureSpace(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('PONTOS OBSERVADOS & RECOMENDAÇÕES DO ESPECIALISTA', margin, y);
  y += 5;

  report.insights.forEach((ins) => {
    const obsLines = doc.splitTextToSize(`Diagnóstico: ${ins.observacao}`, maxContentW - 6);
    const actLines = doc.splitTextToSize(`Ação Recomendada: ${ins.acaoRecomendada}`, maxContentW - 6);
    const blockH = 9 + obsLines.length * 3.8 + actLines.length * 3.8;
    ensureSpace(blockH + 3);

    const badgeText =
      ins.nivel === 'critico'
        ? '[CRÍTICO]'
        : ins.nivel === 'atencao'
        ? '[ATENÇÃO]'
        : ins.nivel === 'positivo'
        ? '[SAUDÁVEL]'
        : '[OPORTUNIDADE]';

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(margin, y, maxContentW, blockH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    if (ins.nivel === 'critico') doc.setTextColor(190, 18, 60);
    else if (ins.nivel === 'atencao') doc.setTextColor(180, 83, 9);
    else if (ins.nivel === 'positivo') doc.setTextColor(4, 120, 87);
    else doc.setTextColor(29, 78, 216);

    doc.text(`${badgeText} ${ins.titulo}`, margin + 3, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(obsLines, margin + 3, y + 9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(actLines, margin + 3, y + 9.5 + obsLines.length * 3.8 + 1);

    y += blockH + 3;
  });

  doc.save(`analise-financeira-especialista-${new Date().toISOString().slice(0, 10)}.pdf`);
};

// Exportação para Excel Completo (Indicadores + DRE + Fluxo de Caixa + Contas + Recomendações)
export const exportFinancialAnalysisToExcel = (
  report: FinancialAnalysisReport,
  company: CompanyProfile,
  periodLabel: string
) => {
  const wb = XLSX.utils.book_new();

  const kpiRows = [
    { Indicador: 'Empresa', Valor: company.nomeFantasia || company.razaoSocial, Observacao: periodLabel },
    { Indicador: 'Saúde Financeira (Score)', Valor: `${report.healthScore}/100`, Observacao: report.healthStatus },
    { Indicador: 'Receita Operacional Bruta', Valor: report.receitaBruta, Observacao: 'Entradas operacionais' },
    { Indicador: '(-) Deduções / Impostos s/ Receita', Valor: report.deducoesReceita, Observacao: 'Impostos/Taxas de venda' },
    { Indicador: 'Receita Líquida', Valor: report.receitaLiquida, Observacao: 'Base líquida operacional' },
    { Indicador: 'Custos e Despesas Variáveis', Valor: report.custosVariaveis, Observacao: `Índice: ${report.indiceCustosVariaveis.toFixed(2)}%` },
    { Indicador: 'Margem de Contribuição (R$)', Valor: report.margemContribuicaoValor, Observacao: `Margem: ${report.margemContribuicaoPct.toFixed(2)}%` },
    { Indicador: 'Custos e Despesas Fixas', Valor: report.custosFixos, Observacao: `Índice: ${report.indiceCustosFixos.toFixed(2)}%` },
    { Indicador: 'Ponto de Equilíbrio (Break-Even)', Valor: report.pontoEquilibrioValor, Observacao: report.faltaParaEquilibrio > 0 ? `Faltam ${formatCurrency(report.faltaParaEquilibrio)}` : 'Superado' },
    { Indicador: 'EBITDA (LAJIDA)', Valor: report.ebitdaValor, Observacao: `Margem EBITDA: ${report.ebitdaPct.toFixed(2)}%` },
    { Indicador: 'Resultado Operacional (EBIT)', Valor: report.resultadoOperacionalValor, Observacao: `Margem Operacional: ${report.resultadoOperacionalPct.toFixed(2)}%` },
    { Indicador: '% das Despesas sobre Receita', Valor: `${report.pctDespesasSobreReceita.toFixed(2)}%`, Observacao: `Total Despesas: ${formatCurrency(report.totalDespesasGeral)}` },
    { Indicador: 'Saldo Atual Bancos/Caixas', Valor: report.fluxoCaixa.saldoAtualBancos, Observacao: 'Disponível hoje' },
    { Indicador: 'Fluxo de Caixa Pós-Pendências', Valor: report.fluxoCaixa.saldoAposPendencias, Observacao: `A Receber: ${formatCurrency(report.fluxoCaixa.receitasPendentesTotal)} | A Pagar: ${formatCurrency(report.fluxoCaixa.despesasPendentesTotal)}` },
    { Indicador: 'Fluxo de Caixa Projetado (30 dias)', Valor: report.fluxoCaixa.projecao30Dias, Observacao: `Ritmo diário líquido (30d): ${formatCurrency(report.fluxoCaixa.mediaDiariaLiquida30d)}/dia` },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), 'Indicadores');

  const dreRows = report.dreLines.map((d) => ({
    Linha_DRE: d.label,
    Valor_RS: Number(d.valor.toFixed(2)),
    Percentual_AV: d.pctReceita !== null ? `${d.pctReceita.toFixed(2)}%` : '—',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dreRows), 'DRE_Gerencial');

  const contaRows = report.accountBreakdown.map((c) => ({
    Tipo: c.tipo.toUpperCase(),
    Natureza_Gerencial: COST_NATURE_LABELS[c.nature],
    Grupo: c.grupo,
    Conta: c.nome,
    Qtd_Lancamentos: c.count,
    Total_RS: Number(c.total.toFixed(2)),
    Pct_Receita: `${c.pctSobreReceita.toFixed(2)}%`,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contaRows), 'Por_Plano_Contas');

  const insightRows = report.insights.map((ins) => ({
    Nivel: ins.nivel.toUpperCase(),
    Categoria: ins.categoria,
    Titulo: ins.titulo,
    Observacao: ins.observacao,
    Acao_Recomendada: ins.acaoRecomendada,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insightRows), 'Diagnostico_Dicas');

  XLSX.writeFile(wb, `analise-financeira-especialista-${new Date().toISOString().slice(0, 10)}.xlsx`);
};
