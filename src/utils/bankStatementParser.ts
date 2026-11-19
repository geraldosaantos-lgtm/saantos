import * as XLSX from 'xlsx';
import { AccountPlanItem, FinancialEntry, FinancialCustomField } from '../types';

export type StatementAnalysisStatus = 'historico' | 'regra' | 'explicit' | 'manual' | 'pendente';

export interface ParsedBankRow {
  tempId: string;
  data: string; // YYYY-MM-DD
  descricao: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  banco: string;
  bancoId?: string;
  formaPagamento: string;
  documento: string;
  contaId: string;
  contaNome: string;
  grupo: string;
  status: 'Conciliado' | 'Pendente';
  observacoes: string;
  camposExtras: Record<string, string>;
  analysisStatus?: StatementAnalysisStatus;
  analysisReason?: string;
}

/**
 * Converte strings numéricas brasileiras ou internacionais para number
 */
export const parseFlexibleAmount = (raw: string | number | undefined | null): number => {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;
  let str = String(raw).trim();
  if (!str) return 0;

  // Detecta negativo entre parênteses ex: (150,00) ou sinal - ou sufixo D (Débito)
  const isParenNeg = str.startsWith('(') && str.endsWith(')');
  const isSuffixDebito = /\s*D$/i.test(str) || /DEB/i.test(str);
  const isNeg = str.startsWith('-') || isParenNeg || isSuffixDebito;

  str = str
    .replace(/R\$/gi, '')
    .replace(/[()]/g, '')
    .replace(/\s*[CD]$/i, '')
    .replace(/[^\d.,-]/g, '')
    .trim();

  if (!str) return 0;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    // Se a vírgula vem depois do ponto: formato BR (1.234,56)
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato US (1,234.56)
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Apenas vírgula: assume decimal BR
    str = str.replace(',', '.');
  }

  const parsed = parseFloat(str);
  if (isNaN(parsed)) return 0;
  const abs = Math.abs(parsed);
  return isNeg || parsed < 0 ? -abs : abs;
};

/**
 * Converte data em string (DD/MM/YYYY, YYYY-MM-DD, YYYYMMDD, número serial Excel) para YYYY-MM-DD
 */
export const parseFlexibleDate = (raw: any): string => {
  if (raw === undefined || raw === null || raw === '') {
    return new Date().toISOString().slice(0, 10);
  }

  // Serial numérico do Excel
  if (typeof raw === 'number' && raw > 20000 && raw < 90000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dt = new Date(excelEpoch.getTime() + raw * 86400000);
    return dt.toISOString().slice(0, 10);
  }

  const str = String(raw).trim();

  // YYYY-MM-DD
  const iso = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }

  // DD/MM/YYYY ou DD-MM-YYYY ou DD/MM/YY
  const br = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (br) {
    const day = br[1].padStart(2, '0');
    const month = br[2].padStart(2, '0');
    let year = br[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // OFX YYYYMMDD...
  const ofx = str.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) {
    return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;
  }

  return new Date().toISOString().slice(0, 10);
};

const normalizeForMatch = (raw: string): string =>
  String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const STOP_WORDS = new Set([
  'PIX',
  'TED',
  'DOC',
  'PAG',
  'PAGTO',
  'PAGAMENTO',
  'RECEBIMENTO',
  'RECEBIDO',
  'ENVIADO',
  'TRANSF',
  'TRANSFERENCIA',
  'DEBITO',
  'CREDITO',
  'COMPRA',
  'CARTAO',
  'BOLETO',
  'VALOR',
  'CONTA',
  'CONTAS',
  'BANCO',
  'MOVIMENTACAO',
  'LANCAMENTO',
  'EXTRATO',
  'LTDA',
  'EIRELI',
  'EPP',
  'MEI',
  'PARA',
  'COM',
  'DOS',
  'DAS',
  'DEL',
  'POR',
  'VIA',
  'DESPESA',
  'DESPESAS',
  'RECEITA',
  'RECEITAS',
  'GERAL',
  'GERAIS',
  'OUTRAS',
  'OUTROS',
  'OPERACIONAIS',
  'OPERACIONAL',
  'FIXAS',
  'FIXA',
  'SERVICO',
  'SERVICOS',
]);

const extractSignificantTokens = (raw: string): string[] =>
  normalizeForMatch(raw)
    .split(' ')
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

export interface LineAnalysisResult {
  account?: AccountPlanItem;
  status: StatementAnalysisStatus;
  reason: string;
}

/**
 * Analisa uma linha do extrato comparando com:
 * 1) Histórico anterior de lançamentos financeiros do usuário
 * 2) Nomes, grupos e descrições do Plano de Contas atual (editável)
 * 3) Regras bancárias e operacionais (energia, água, insumos, frotas, tarifas, etc.)
 * Quando não há correspondência segura, retorna status 'pendente' para que o usuário informe.
 */
export const analyzeStatementLineAccount = (
  description: string,
  tipo: 'receita' | 'despesa',
  accountsPlan: AccountPlanItem[],
  existingEntries: FinancialEntry[] = []
): LineAnalysisResult => {
  const candidates = accountsPlan.filter((a) => a.ativo && a.tipo === tipo);
  const pool = candidates.length > 0 ? candidates : accountsPlan.filter((a) => a.tipo === tipo);

  if (pool.length === 0) {
    return {
      status: 'pendente',
      reason: 'Nenhuma conta cadastrada no Plano de Contas para este tipo — informe ou cadastre uma conta',
    };
  }

  const normDesc = normalizeForMatch(description);
  const descTokens = extractSignificantTokens(description);

  // 1. Aprendizado pelo histórico de lançamentos já classificados pelo usuário
  if (existingEntries.length > 0 && normDesc) {
    let bestHistoryScore = 0;
    let bestHistoryEntry: FinancialEntry | undefined;
    let bestHistoryAccount: AccountPlanItem | undefined;

    for (const entry of existingEntries) {
      if (entry.tipo !== tipo || !entry.contaId) continue;
      const acc = pool.find((a) => a.id === entry.contaId) || accountsPlan.find((a) => a.id === entry.contaId);
      if (!acc) continue;

      const entryNorm = normalizeForMatch(entry.descricao);
      if (!entryNorm) continue;

      let score = 0;
      if (entryNorm === normDesc) {
        score = 100;
      } else if (normDesc.length >= 6 && (entryNorm.includes(normDesc) || normDesc.includes(entryNorm))) {
        score = 40;
      } else {
        const entryTokens = extractSignificantTokens(entry.descricao);
        const common = descTokens.filter((t) => entryTokens.includes(t));
        const strongCommon = common.filter((t) => t.length >= 4);
        if (strongCommon.length >= 1 && (common.length >= 2 || strongCommon[0].length >= 5)) {
          score = common.length * 10 + strongCommon.length * 5;
        }
      }

      if (score > bestHistoryScore) {
        bestHistoryScore = score;
        bestHistoryEntry = entry;
        bestHistoryAccount = acc;
      }
    }

    if (bestHistoryAccount && bestHistoryEntry && bestHistoryScore >= 15) {
      return {
        account: bestHistoryAccount,
        status: 'historico',
        reason: `Histórico semelhante ("${bestHistoryEntry.descricao.slice(0, 28)}")`,
      };
    }
  }

  // 2. Correspondência direta com o Plano de Contas editável do usuário (código, nome, descrição, grupo)
  let bestPlanScore = 0;
  let bestPlanAcc: AccountPlanItem | undefined;
  let bestPlanToken = '';

  for (const acc of pool) {
    const accNormCode = normalizeForMatch(acc.codigo);
    if (accNormCode && accNormCode.length >= 3 && normDesc.includes(accNormCode)) {
      return {
        account: acc,
        status: 'regra',
        reason: `Código identificado (${acc.codigo})`,
      };
    }

    const nameTokens = extractSignificantTokens(acc.nome);
    const descExtraTokens = extractSignificantTokens(acc.descricao || '');
    const groupTokens = extractSignificantTokens(acc.grupo);

    let score = 0;
    let matchedToken = '';

    for (const tok of nameTokens) {
      if (tok.length >= 4 && normDesc.includes(tok)) {
        score += 12;
        if (!matchedToken) matchedToken = tok;
      }
    }
    for (const tok of descExtraTokens) {
      if (tok.length >= 4 && normDesc.includes(tok)) {
        score += 8;
        if (!matchedToken) matchedToken = tok;
      }
    }
    for (const tok of groupTokens) {
      if (tok.length >= 5 && normDesc.includes(tok)) {
        score += 4;
        if (!matchedToken) matchedToken = tok;
      }
    }

    if (score > bestPlanScore) {
      bestPlanScore = score;
      bestPlanAcc = acc;
      bestPlanToken = matchedToken;
    }
  }

  if (bestPlanAcc && bestPlanScore >= 12) {
    return {
      account: bestPlanAcc,
      status: 'regra',
      reason: `Termo "${bestPlanToken}" compatível com o Plano`,
    };
  }

  // 3. Regras bancárias e operacionais conhecidas
  if (tipo === 'despesa') {
    const rules: Array<{ keywords: string[]; match: string[]; label: string }> = [
      { keywords: ['ENERGIA', 'CEMIG', 'ENEL', 'CPFL', 'LIGHT', 'COPEL', 'CELESC', 'ELETRIC'], match: ['ENERGIA'], label: 'Energia' },
      { keywords: ['AGUA', 'COPASA', 'SABESP', 'SANEPAR', 'SANEAGO', 'EMBASA', 'ESGOTO'], match: ['AGUA'], label: 'Água/Esgoto' },
      { keywords: ['ALUGUEL', 'LOCACAO', 'IMOBILIARIA', 'CONDOMINIO'], match: ['ALUGUEL'], label: 'Aluguel/Imóvel' },
      { keywords: ['SHAMPOO', 'CERA', 'PRODUTO', 'QUIMICO', 'DESENGRAXANTE', 'SILICONE', 'INSUMO', 'ESTOQUE', 'PRETINHO'], match: ['PRODUTO', 'INSUMO'], label: 'Insumos/Produtos' },
      { keywords: ['SALARIO', 'FOLHA', 'DIARIA', 'COMISSAO', 'FUNCIONARIO', 'VALE', 'ADIANTAMENTO', 'FGTS', 'INSS', 'PROLABORE'], match: ['FOLHA', 'PAGAMENTO', 'PESSOAL'], label: 'Folha/Pessoal' },
      { keywords: ['DAS', 'SIMPLES', 'DARF', 'IMPOSTO', 'TRIBUTO', 'ISS', 'IPTU', 'PREFEITURA', 'CONTABIL', 'CONTABILIDADE'], match: ['IMPOSTO', 'DAS', 'TRIBUTO'], label: 'Impostos/Contabilidade' },
      { keywords: ['TARIFA', 'IOF', 'MANUTENCAO CONTA', 'ANUIDADE', 'CESTA', 'MAQUININHA', 'CIELO', 'STONE', 'PAGSEGURO', 'GETNET', 'REDE'], match: ['TARIFA', 'MAQUININHA', 'BANCAR'], label: 'Tarifa/Maquininha' },
      { keywords: ['MANUTENCAO', 'BOMBA', 'MANGUEIRA', 'COMPRESSOR', 'OFICINA', 'PECA', 'LAVADORA'], match: ['MANUTENCAO', 'EQUIPAMENTO'], label: 'Manutenção/Equipamentos' },
      { keywords: ['POSTO', 'COMBUSTIVEL', 'GASOLINA', 'DIESEL', 'ETANOL', 'IPIRANGA', 'SHELL'], match: ['COMBUSTIVEL', 'VEICULO', 'GERAIS'], label: 'Combustível' },
      { keywords: ['INTERNET', 'VIVO', 'CLARO', 'TIM', 'OI', 'FIBRA', 'TELEFONE'], match: ['INTERNET', 'TELEFONE', 'GERAIS', 'FIXA'], label: 'Telecom/Internet' },
    ];

    for (const rule of rules) {
      const hit = rule.keywords.find((kw) => normDesc.includes(kw));
      if (hit) {
        const found = pool.find((a) => {
          const hay = normalizeForMatch(`${a.nome} ${a.grupo} ${a.descricao || ''}`);
          return rule.match.some((m) => hay.includes(m));
        });
        if (found) {
          return {
            account: found,
            status: 'regra',
            reason: `Identificado "${hit}" (${rule.label})`,
          };
        }
      }
    }
  } else {
    const rules: Array<{ keywords: string[]; match: string[]; label: string }> = [
      { keywords: ['BOLETO', 'FATURA', 'MENSAL', 'FROTA', 'CONTRATO', 'LIQ TIT'], match: ['FROTA', 'CONTRATO'], label: 'Faturamento Frota/Boleto' },
      { keywords: ['POLIMENTO', 'HIGIENIZACAO', 'CRISTALIZACAO', 'VITRIFICACAO', 'ESTETICA'], match: ['POLIMENTO', 'HIGIENIZACAO', 'ESTETICA'], label: 'Estética/Polimento' },
      { keywords: ['RENDIMENTO', 'JUROS', 'POUPANCA', 'CDB', 'RESGATE', 'ESTORNO', 'APLICACAO'], match: ['RENDIMENTO', 'OUTRAS'], label: 'Rendimento/Estorno' },
      { keywords: ['LAVAGEM', 'DUCHA', 'REDE', 'CIELO', 'STONE', 'GETNET', 'PAGSEGURO', 'CARTAO', 'VENDAS', 'PIX RECEBIDO'], match: ['LAVAGEM', 'SERVICO', 'OPERACIONAIS'], label: 'Recebimento de Serviços' },
    ];

    for (const rule of rules) {
      const hit = rule.keywords.find((kw) => normDesc.includes(kw));
      if (hit) {
        const found = pool.find((a) => {
          const hay = normalizeForMatch(`${a.nome} ${a.grupo} ${a.descricao || ''}`);
          return rule.match.some((m) => hay.includes(m));
        });
        if (found) {
          return {
            account: found,
            status: 'regra',
            reason: `Identificado "${hit}" (${rule.label})`,
          };
        }
      }
    }
  }

  return {
    status: 'pendente',
    reason: 'Sem correspondência automática — selecione em qual Plano de Contas lançar',
  };
};

/**
 * Sugere automaticamente uma conta do Plano de Contas com base no histórico do extrato
 */
export const suggestAccountForDescription = (
  description: string,
  tipo: 'receita' | 'despesa',
  accountsPlan: AccountPlanItem[],
  existingEntries: FinancialEntry[] = []
): AccountPlanItem | undefined => {
  return analyzeStatementLineAccount(description, tipo, accountsPlan, existingEntries).account;
};

/**
 * Reanalisa linhas já carregadas na pré-visualização que não tenham sido definidas manualmente
 */
export const reanalyzeStagingRows = (
  rows: ParsedBankRow[],
  accountsPlan: AccountPlanItem[],
  existingEntries: FinancialEntry[] = []
): ParsedBankRow[] => {
  return rows.map((row) => {
    if (row.analysisStatus === 'manual' || row.analysisStatus === 'explicit') {
      return row;
    }
    const analysis = analyzeStatementLineAccount(row.descricao, row.tipo, accountsPlan, existingEntries);
    if (analysis.account) {
      return {
        ...row,
        contaId: analysis.account.id,
        contaNome: analysis.account.nome,
        grupo: analysis.account.grupo,
        tipo: analysis.account.tipo,
        analysisStatus: analysis.status,
        analysisReason: analysis.reason,
      };
    }
    return {
      ...row,
      contaId: '',
      contaNome: '',
      grupo: '',
      analysisStatus: 'pendente',
      analysisReason: analysis.reason,
    };
  });
};

const detectPaymentMethod = (desc: string): string => {
  const upper = desc.toUpperCase();
  if (upper.includes('PIX')) return 'PIX';
  if (upper.includes('BOLETO') || upper.includes('LIQ TIT')) return 'BOLETO';
  if (upper.includes('TED') || upper.includes('DOC') || upper.includes('TRANSF')) return 'TRANSFERÊNCIA';
  if (upper.includes('CARTAO') || upper.includes('CARTÃO') || upper.includes('CIELO') || upper.includes('STONE') || upper.includes('VISA') || upper.includes('MASTER')) return 'CARTÃO';
  if (upper.includes('DEB') && upper.includes('AUT')) return 'DÉBITO AUTOMÁTICO';
  if (upper.includes('TARIFA') || upper.includes('IOF')) return 'TARIFA BANCÁRIA';
  return 'CONTA CORRENTE';
};

const buildParsedRow = (
  idx: number,
  data: string,
  descricao: string,
  signedAmount: number,
  banco: string,
  documento: string,
  accountsPlan: AccountPlanItem[],
  explicitTipo?: 'receita' | 'despesa',
  explicitContaNome?: string,
  explicitObs?: string,
  camposExtras?: Record<string, string>,
  existingEntries: FinancialEntry[] = []
): ParsedBankRow => {
  const tipo: 'receita' | 'despesa' = explicitTipo || (signedAmount >= 0 ? 'receita' : 'despesa');
  const valor = Math.abs(signedAmount);
  const cleanDesc = (descricao || 'LANÇAMENTO BANCÁRIO').trim().toUpperCase();

  let matchedAccount: AccountPlanItem | undefined;
  let analysisStatus: StatementAnalysisStatus = 'pendente';
  let analysisReason = '';

  if (explicitContaNome && explicitContaNome.trim()) {
    const target = explicitContaNome.trim().toUpperCase();
    matchedAccount =
      accountsPlan.find((a) => a.nome.toUpperCase() === target || a.codigo.toUpperCase() === target) ||
      accountsPlan.find((a) => a.nome.toUpperCase().includes(target));
    if (matchedAccount) {
      analysisStatus = 'explicit';
      analysisReason = `Informado na planilha (${matchedAccount.codigo} · ${matchedAccount.nome})`;
    }
  }

  if (!matchedAccount) {
    const analysis = analyzeStatementLineAccount(cleanDesc, tipo, accountsPlan, existingEntries);
    matchedAccount = analysis.account;
    analysisStatus = analysis.status;
    analysisReason = analysis.reason;
  }

  return {
    tempId: `tmp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    data: parseFlexibleDate(data),
    descricao: cleanDesc,
    tipo: matchedAccount ? matchedAccount.tipo : tipo,
    valor,
    banco: (banco || 'EXTRATO BANCÁRIO').trim().toUpperCase(),
    formaPagamento: detectPaymentMethod(cleanDesc),
    documento: (documento || '').trim().toUpperCase(),
    contaId: matchedAccount?.id || '',
    contaNome: matchedAccount?.nome || '',
    grupo: matchedAccount?.grupo || '',
    status: 'Conciliado',
    observacoes: (explicitObs || '').trim().toUpperCase(),
    camposExtras: camposExtras || {},
    analysisStatus,
    analysisReason,
  };
};

/**
 * Parser de arquivos OFX / QFX (Open Financial Exchange)
 */
export const parseOfxStatement = (
  content: string,
  accountsPlan: AccountPlanItem[],
  defaultBankName = 'BANCO (OFX)',
  existingEntries: FinancialEntry[] = []
): ParsedBankRow[] => {
  const rows: ParsedBankRow[] = [];

  // Tenta extrair nome do banco / ORG
  const orgMatch = content.match(/<ORG>([^<\r\n]+)/i);
  const bankIdMatch = content.match(/<BANKID>([^<\r\n]+)/i);
  const detectedBank = orgMatch?.[1]?.trim() || (bankIdMatch ? `BANCO ${bankIdMatch[1].trim()}` : defaultBankName);

  const txBlocks = content.split(/<STMTTRN>/i).slice(1);
  txBlocks.forEach((block, idx) => {
    const endIdx = block.search(/<\/STMTTRN>/i);
    const segment = endIdx >= 0 ? block.slice(0, endIdx) : block;

    const getTag = (tag: string): string => {
      const m = segment.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'));
      return m ? m[1].trim() : '';
    };

    const dtPosted = getTag('DTPOSTED');
    const trnAmt = getTag('TRNAMT');
    const memo = getTag('MEMO');
    const name = getTag('NAME');
    const fitId = getTag('FITID') || getTag('CHECKNUM');
    const trnType = getTag('TRNTYPE').toUpperCase();

    const amount = parseFlexibleAmount(trnAmt);
    const desc = [name, memo].filter(Boolean).join(' · ') || trnType || 'MOVIMENTAÇÃO OFX';
    const explicitTipo =
      amount > 0 ? 'receita' : amount < 0 ? 'despesa' : trnType === 'CREDIT' || trnType === 'DEP' ? 'receita' : 'despesa';

    if (amount !== 0 || desc) {
      rows.push(
        buildParsedRow(
          idx,
          dtPosted,
          desc,
          amount,
          detectedBank,
          fitId,
          accountsPlan,
          explicitTipo,
          undefined,
          undefined,
          undefined,
          existingEntries
        )
      );
    }
  });

  return rows;
};

/**
 * Parser genérico para linhas de tabela (CSV, TXT, XLSX ou texto colado)
 */
const parseMatrixRows = (
  matrix: any[][],
  accountsPlan: AccountPlanItem[],
  customFields: FinancialCustomField[],
  defaultBankName = 'CONTA CORRENTE',
  existingEntries: FinancialEntry[] = []
): ParsedBankRow[] => {
  const nonEmpty = matrix.filter((r) => Array.isArray(r) && r.some((cell) => String(cell ?? '').trim() !== ''));
  if (nonEmpty.length === 0) return [];

  // Tenta identificar linha de cabeçalho nas primeiras 8 linhas
  let headerIdx = -1;
  let colMap = {
    data: -1,
    descricao: -1,
    valor: -1,
    credito: -1,
    debito: -1,
    tipo: -1,
    conta: -1,
    banco: -1,
    documento: -1,
    observacoes: -1,
  };

  for (let i = 0; i < Math.min(8, nonEmpty.length); i++) {
    const normalizedCells = nonEmpty[i].map((c) =>
      String(c ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
    );

    const hasDate = normalizedCells.some((c) => c === 'data' || c.includes('dt ') || c.includes('data'));
    const hasDesc = normalizedCells.some(
      (c) =>
        c.includes('descri') ||
        c.includes('historic') ||
        c.includes('lancamento') ||
        c.includes('memo') ||
        c.includes('detalhe')
    );
    const hasVal = normalizedCells.some(
      (c) =>
        c.includes('valor') ||
        c.includes('credito') ||
        c.includes('debito') ||
        c.includes('entrada') ||
        c.includes('saida') ||
        c.includes('quantia')
    );

    if ((hasDate && (hasDesc || hasVal)) || (hasDesc && hasVal)) {
      headerIdx = i;
      normalizedCells.forEach((c, idx) => {
        if (colMap.data === -1 && (c === 'data' || c.startsWith('data'))) colMap.data = idx;
        else if (
          colMap.descricao === -1 &&
          (c.includes('descri') || c.includes('historic') || c.includes('lancamento') || c.includes('memo'))
        )
          colMap.descricao = idx;
        else if (colMap.credito === -1 && (c.includes('credito') || c.includes('entrada') || c === 'receita'))
          colMap.credito = idx;
        else if (colMap.debito === -1 && (c.includes('debito') || c.includes('saida') || c === 'despesa'))
          colMap.debito = idx;
        else if (colMap.valor === -1 && (c.includes('valor') || c.includes('quantia') || c === 'r$'))
          colMap.valor = idx;
        else if (colMap.tipo === -1 && (c === 'tipo' || c.includes('natureza') || c === 'c/d' || c === 'd/c'))
          colMap.tipo = idx;
        else if (colMap.conta === -1 && (c.includes('conta') || c.includes('plano') || c.includes('categoria')))
          colMap.conta = idx;
        else if (colMap.banco === -1 && (c.includes('banco') || c.includes('instituicao')))
          colMap.banco = idx;
        else if (colMap.documento === -1 && (c.includes('doc') || c.includes('nf') || c.includes('numero')))
          colMap.documento = idx;
        else if (colMap.observacoes === -1 && (c.includes('obs') || c.includes('nota')))
          colMap.observacoes = idx;
      });
      break;
    }
  }

  // Mapeia possíveis colunas correspondentes aos Campos Personalizados
  const customColMap: Array<{ fieldId: string; colIdx: number }> = [];
  if (headerIdx >= 0) {
    const headerCells = nonEmpty[headerIdx].map((c) =>
      String(c ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
    );
    customFields.forEach((cf) => {
      const target = cf.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
      const idx = headerCells.findIndex((h) => h === target || h.includes(target));
      if (idx >= 0) customColMap.push({ fieldId: cf.id, colIdx: idx });
    });
  }

  const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;
  const rows: ParsedBankRow[] = [];

  for (let i = startRow; i < nonEmpty.length; i++) {
    const row = nonEmpty[i];
    if (!row || row.length === 0) continue;

    // Fallback posicional quando não há cabeçalho explícito
    let dataVal = colMap.data >= 0 ? row[colMap.data] : row[0];
    let descVal = colMap.descricao >= 0 ? row[colMap.descricao] : row.length >= 3 ? row[1] : row[0];
    let docVal = colMap.documento >= 0 ? String(row[colMap.documento] ?? '') : '';
    let bankVal = colMap.banco >= 0 ? String(row[colMap.banco] ?? '') : defaultBankName;
    let contaVal = colMap.conta >= 0 ? String(row[colMap.conta] ?? '') : '';
    let obsVal = colMap.observacoes >= 0 ? String(row[colMap.observacoes] ?? '') : '';

    let signedAmount = 0;
    let explicitTipo: 'receita' | 'despesa' | undefined;

    if (colMap.credito >= 0 || colMap.debito >= 0) {
      const cred = colMap.credito >= 0 ? Math.abs(parseFlexibleAmount(row[colMap.credito])) : 0;
      const deb = colMap.debito >= 0 ? Math.abs(parseFlexibleAmount(row[colMap.debito])) : 0;
      if (cred > 0) {
        signedAmount = cred;
        explicitTipo = 'receita';
      } else if (deb > 0) {
        signedAmount = -deb;
        explicitTipo = 'despesa';
      }
    } else if (colMap.valor >= 0) {
      signedAmount = parseFlexibleAmount(row[colMap.valor]);
    } else {
      // Procura a última coluna que pareça valor numérico
      for (let cIdx = row.length - 1; cIdx >= 0; cIdx--) {
        const candidate = parseFlexibleAmount(row[cIdx]);
        if (candidate !== 0) {
          signedAmount = candidate;
          if (cIdx === 1 && row.length >= 2) {
            descVal = String(row[0] ?? '');
          }
          break;
        }
      }
    }

    if (colMap.tipo >= 0 && row[colMap.tipo]) {
      const rawTipo = String(row[colMap.tipo]).trim().toUpperCase();
      if (rawTipo.startsWith('R') || rawTipo === 'C' || rawTipo.includes('CRED') || rawTipo.includes('ENTR')) {
        explicitTipo = 'receita';
        signedAmount = Math.abs(signedAmount);
      } else if (rawTipo.startsWith('D') || rawTipo.includes('DEB') || rawTipo.includes('SAID') || rawTipo.includes('DESP')) {
        explicitTipo = 'despesa';
        signedAmount = -Math.abs(signedAmount);
      }
    }

    const extras: Record<string, string> = {};
    customColMap.forEach(({ fieldId, colIdx }) => {
      if (row[colIdx] !== undefined && row[colIdx] !== null) {
        extras[fieldId] = String(row[colIdx]).trim().toUpperCase();
      }
    });

    const descStr = String(descVal ?? '').trim();
    // Ignora linhas típicas de "Saldo Anterior" ou "Saldo Final"
    if (/^SALDO\s*(ANTERIOR|DO DIA|FINAL|DISPONIVEL|DISPONÍVEL)/i.test(descStr)) continue;
    if (signedAmount === 0 && !descStr) continue;

    rows.push(
      buildParsedRow(
        i,
        String(dataVal ?? ''),
        descStr || 'MOVIMENTAÇÃO EXTRATO',
        signedAmount,
        bankVal || defaultBankName,
        docVal,
        accountsPlan,
        explicitTipo,
        contaVal,
        obsVal,
        extras,
        existingEntries
      )
    );
  }

  return rows;
};

/**
 * Parser para CSV / TXT / Texto colado
 */
export const parseTextOrCsvStatement = (
  text: string,
  accountsPlan: AccountPlanItem[],
  customFields: FinancialCustomField[],
  defaultBankName = 'CONTA CORRENTE',
  existingEntries: FinancialEntry[] = []
): ParsedBankRow[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Detecta se é OFX colado em texto
  if (trimmed.includes('<OFX>') || trimmed.includes('<STMTTRN>')) {
    return parseOfxStatement(trimmed, accountsPlan, defaultBankName, existingEntries);
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Detecta delimitador mais provável
  const firstSample = lines.slice(0, 5).join('\n');
  let delimiter = ';';
  if ((firstSample.match(/\t/g) || []).length >= lines.length) {
    delimiter = '\t';
  } else if ((firstSample.match(/;/g) || []).length >= (firstSample.match(/,/g) || []).length) {
    delimiter = ';';
  } else if ((firstSample.match(/,/g) || []).length > 0) {
    delimiter = ',';
  }

  const matrix = lines.map((line) => {
    // Se não houver delimitador claro e parecer linha copiada de extrato (Data + Texto + Valor)
    if (delimiter === ';' && !line.includes(';') && !line.includes('\t')) {
      const m = line.match(/^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+([+-]?\s*(?:R\$\s*)?[\d.,]+(?:\s*[CD])?)$/i);
      if (m) {
        return [m[1], m[2], m[3]];
      }
    }
    return line.split(delimiter).map((cell) => cell.replace(/^"|"$/g, '').trim());
  });

  return parseMatrixRows(matrix, accountsPlan, customFields, defaultBankName, existingEntries);
};

/**
 * Parser para arquivos XLSX / XLS / CSV / OFX enviados via <input type="file" />
 */
export const parseBankStatementFile = async (
  file: File,
  accountsPlan: AccountPlanItem[],
  customFields: FinancialCustomField[],
  existingEntries: FinancialEntry[] = []
): Promise<ParsedBankRow[]> => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.ofx') || fileName.endsWith('.qfx')) {
    const content = await file.text();
    return parseOfxStatement(content, accountsPlan, file.name.replace(/\.[^.]+$/, '').toUpperCase(), existingEntries);
  }

  if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
    const content = await file.text();
    return parseTextOrCsvStatement(content, accountsPlan, customFields, 'CONTA CORRENTE', existingEntries);
  }

  // Excel (.xlsx / .xls)
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];
  const matrix = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: '' });
  return parseMatrixRows(matrix, accountsPlan, customFields, 'EXTRATO EXCEL', existingEntries);
};

/**
 * Gera linhas de modelo editáveis na tela para o usuário preencher, editar ou adaptar
 */
export const buildEditableModelRows = (
  accountsPlan: AccountPlanItem[],
  customFields: FinancialCustomField[]
): ParsedBankRow[] => {
  const today = new Date().toISOString().slice(0, 10);
  const emptyExtras: Record<string, string> = {};
  customFields.forEach((f) => {
    emptyExtras[f.id] = '';
  });

  const recAcc = accountsPlan.find((a) => a.tipo === 'receita' && a.ativo) || accountsPlan[0];
  const despInsumo =
    accountsPlan.find((a) => a.tipo === 'despesa' && a.nome.includes('PRODUTO')) ||
    accountsPlan.find((a) => a.tipo === 'despesa');
  const despFixa =
    accountsPlan.find((a) => a.tipo === 'despesa' && a.nome.includes('ENERGIA')) ||
    accountsPlan.find((a) => a.tipo === 'despesa');

  return [
    {
      tempId: `mdl-${Date.now()}-1`,
      data: today,
      descricao: 'RECEBIMENTO PIX - CLIENTE EXEMPLO (EDITÁVEL)',
      tipo: 'receita',
      valor: 450.0,
      banco: 'SICREDI',
      formaPagamento: 'PIX',
      documento: 'PIX-001',
      contaId: recAcc?.id || '',
      contaNome: recAcc?.nome || 'SERVIÇOS DE LAVAGEM E ESTÉTICA',
      grupo: recAcc?.grupo || 'RECEITAS OPERACIONAIS',
      status: 'Conciliado',
      observacoes: 'MODELO EDITÁVEL - CLIQUE PARA ALTERAR OU APAGAR',
      camposExtras: { ...emptyExtras },
      analysisStatus: recAcc ? 'regra' : 'pendente',
      analysisReason: recAcc ? `Modelo sugerido (${recAcc.codigo} · ${recAcc.nome})` : 'Selecione o Plano de Contas',
    },
    {
      tempId: `mdl-${Date.now()}-2`,
      data: today,
      descricao: 'COMPRA PRODUTOS QUÍMICOS / SHAMPOO (EDITÁVEL)',
      tipo: 'despesa',
      valor: 185.0,
      banco: 'SICREDI',
      formaPagamento: 'CARTÃO',
      documento: 'NF-102',
      contaId: despInsumo?.id || '',
      contaNome: despInsumo?.nome || 'PRODUTOS QUÍMICOS E INSUMOS',
      grupo: despInsumo?.grupo || 'INSUMOS E MATERIAIS',
      status: 'Conciliado',
      observacoes: '',
      camposExtras: { ...emptyExtras },
      analysisStatus: despInsumo ? 'regra' : 'pendente',
      analysisReason: despInsumo ? `Modelo sugerido (${despInsumo.codigo} · ${despInsumo.nome})` : 'Selecione o Plano de Contas',
    },
    {
      tempId: `mdl-${Date.now()}-3`,
      data: today,
      descricao: 'CONTA DE ENERGIA ELÉTRICA (EDITÁVEL)',
      tipo: 'despesa',
      valor: 320.0,
      banco: 'SICREDI',
      formaPagamento: 'BOLETO',
      documento: 'BOL-998',
      contaId: despFixa?.id || '',
      contaNome: despFixa?.nome || 'ENERGIA ELÉTRICA',
      grupo: despFixa?.grupo || 'DESPESAS FIXAS',
      status: 'Pendente',
      observacoes: '',
      camposExtras: { ...emptyExtras },
      analysisStatus: despFixa ? 'regra' : 'pendente',
      analysisReason: despFixa ? `Modelo sugerido (${despFixa.codigo} · ${despFixa.nome})` : 'Selecione o Plano de Contas',
    },
  ];
};

/**
 * Gera e baixa planilha Excel (.xlsx) modelo pronta para preenchimento
 */
export const downloadStatementTemplateExcel = (customFields: FinancialCustomField[]) => {
  const today = new Date().toLocaleDateString('pt-BR');
  const customHeaders = customFields.filter((f) => f.ativo).map((f) => f.nome);

  const headers = [
    'Data',
    'Descrição',
    'Tipo (Receita/Despesa)',
    'Conta (Plano de Contas)',
    'Valor',
    'Banco',
    'Documento',
    'Observações',
    ...customHeaders,
  ];

  const rows = [
    [
      today,
      'RECEBIMENTO PIX FROTA INOVA MAQUINAS',
      'Receita',
      'CONTRATOS DE FROTAS / MENSALISTAS',
      1250.0,
      'SICREDI',
      'PIX-123',
      'Fatura quinzenal',
      ...customHeaders.map(() => ''),
    ],
    [
      today,
      'COMPRA SHAMPOO E CERA AUTOMOTIVA',
      'Despesa',
      'PRODUTOS QUÍMICOS E INSUMOS',
      280.5,
      'SICREDI',
      'NF-4521',
      'Reposição estoque',
      ...customHeaders.map(() => ''),
    ],
    [
      today,
      'PAGAMENTO ENERGIA ELETRICA CEMIG',
      'Despesa',
      'ENERGIA ELÉTRICA',
      410.0,
      'SICREDI',
      'BOL-889',
      '',
      ...customHeaders.map(() => ''),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Extrato');
  XLSX.writeFile(wb, 'Modelo_Extrato_Financeiro_AutoLava.xlsx');
};

/**
 * Exporta movimentações financeiras filtradas para Excel (.xlsx)
 */
export const exportFinancialEntriesToExcel = (
  entries: FinancialEntry[],
  customFields: FinancialCustomField[]
) => {
  const activeFields = customFields.filter((f) => f.ativo);
  const headers = [
    'Data',
    'Tipo',
    'Descrição',
    'Plano de Contas',
    'Grupo',
    'Valor (R$)',
    'Banco',
    'Forma Pagamento',
    'Documento',
    'Status',
    'Origem',
    'Observações',
    ...activeFields.map((f) => f.nome),
  ];

  const dataRows = entries.map((e) => [
    e.data.split('-').reverse().join('/'),
    e.tipo === 'receita' ? 'RECEITA' : 'DESPESA',
    e.descricao,
    e.contaNome,
    e.grupo,
    e.tipo === 'receita' ? e.valor : -e.valor,
    e.banco,
    e.formaPagamento || '',
    e.documento || '',
    e.status,
    e.origem.toUpperCase(),
    e.observacoes || '',
    ...activeFields.map((f) => e.camposExtras?.[f.id] || ''),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Financeiro');
  XLSX.writeFile(wb, `Financeiro_AutoLava_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Exporta o Plano de Contas editável para Excel (.xlsx)
 */
export const exportAccountsPlanToExcel = (accounts: AccountPlanItem[]) => {
  const headers = ['Código', 'Tipo (Receita/Despesa)', 'Grupo / Categoria', 'Nome da Conta', 'Descrição', 'Status'];
  const rows = [...accounts]
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
    .map((a) => [
      a.codigo,
      a.tipo === 'receita' ? 'Receita' : 'Despesa',
      a.grupo,
      a.nome,
      a.descricao || '',
      a.ativo ? 'Ativa' : 'Inativa',
    ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plano_de_Contas');
  XLSX.writeFile(wb, `Plano_de_Contas_AutoLava_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Importa Plano de Contas a partir de arquivo Excel (.xlsx/.xls) ou CSV
 */
export const parseAccountsPlanFile = async (file: File): Promise<AccountPlanItem[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
  const nonEmpty = matrix.filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''));
  if (nonEmpty.length === 0) return [];

  let headerIdx = -1;
  let colMap = { codigo: -1, tipo: -1, grupo: -1, nome: -1, descricao: -1, status: -1 };
  for (let i = 0; i < Math.min(5, nonEmpty.length); i++) {
    const norm = nonEmpty[i].map((c) =>
      String(c ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
    );
    if (norm.some((c) => c.includes('nome') || c.includes('conta') || c.includes('codigo'))) {
      headerIdx = i;
      norm.forEach((c, idx) => {
        if (colMap.codigo === -1 && c.includes('cod')) colMap.codigo = idx;
        else if (colMap.tipo === -1 && (c.includes('tipo') || c.includes('natureza'))) colMap.tipo = idx;
        else if (colMap.grupo === -1 && (c.includes('grupo') || c.includes('categ'))) colMap.grupo = idx;
        else if (colMap.nome === -1 && (c.includes('nome') || c.includes('conta') || c.includes('titulo'))) colMap.nome = idx;
        else if (colMap.descricao === -1 && c.includes('descr')) colMap.descricao = idx;
        else if (colMap.status === -1 && (c.includes('status') || c.includes('ativ'))) colMap.status = idx;
      });
      break;
    }
  }

  const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;
  const imported: AccountPlanItem[] = [];
  for (let i = startRow; i < nonEmpty.length; i++) {
    const r = nonEmpty[i];
    const codigo = String((colMap.codigo >= 0 ? r[colMap.codigo] : r[0]) ?? '').trim().toUpperCase();
    const rawTipo = String((colMap.tipo >= 0 ? r[colMap.tipo] : r[1]) ?? '').trim().toUpperCase();
    const grupo = String((colMap.grupo >= 0 ? r[colMap.grupo] : r[2]) ?? '').trim().toUpperCase();
    const nome = String((colMap.nome >= 0 ? r[colMap.nome] : r[3] ?? r[1]) ?? '').trim().toUpperCase();
    const descricao = String((colMap.descricao >= 0 ? r[colMap.descricao] : r[4]) ?? '').trim();
    const rawStatus = String((colMap.status >= 0 ? r[colMap.status] : '') ?? '').trim().toUpperCase();

    if (!nome) continue;
    const isReceita =
      rawTipo.startsWith('R') ||
      rawTipo.includes('CRED') ||
      rawTipo.includes('ENTR') ||
      codigo.startsWith('1.');

    imported.push({
      id: `acc-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
      codigo: codigo || `${isReceita ? '1' : '2'}.${String(imported.length + 1).padStart(2, '0')}`,
      tipo: isReceita ? 'receita' : 'despesa',
      grupo: grupo || (isReceita ? 'RECEITAS OPERACIONAIS' : 'DESPESAS OPERACIONAIS'),
      nome,
      descricao,
      ativo: rawStatus ? !rawStatus.includes('INATIV') : true,
    });
  }
  return imported;
};

