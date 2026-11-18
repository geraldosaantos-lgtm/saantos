import * as XLSX from 'xlsx';
import { AccountPlanItem, FinancialEntry, FinancialCustomField } from '../types';

export interface ParsedBankRow {
  tempId: string;
  data: string; // YYYY-MM-DD
  descricao: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  banco: string;
  formaPagamento: string;
  documento: string;
  contaId: string;
  contaNome: string;
  grupo: string;
  status: 'Conciliado' | 'Pendente';
  observacoes: string;
  camposExtras: Record<string, string>;
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

/**
 * Sugere automaticamente uma conta do Plano de Contas com base no histórico do extrato
 */
export const suggestAccountForDescription = (
  description: string,
  tipo: 'receita' | 'despesa',
  accountsPlan: AccountPlanItem[]
): AccountPlanItem | undefined => {
  const active = accountsPlan.filter((a) => a.ativo && a.tipo === tipo);
  if (active.length === 0) return accountsPlan.find((a) => a.tipo === tipo);

  const upper = description.toUpperCase();

  if (tipo === 'despesa') {
    const rules: Array<{ keywords: string[]; match: string[] }> = [
      { keywords: ['ENERGIA', 'CEMIG', 'ENEL', 'CPFL', 'LIGHT', 'ELETRIC'], match: ['ENERGIA'] },
      { keywords: ['AGUA', 'ÁGUA', 'COPASA', 'SABESP', 'SANEPAR', 'ESGOTO'], match: ['ÁGUA', 'AGUA'] },
      { keywords: ['ALUGUEL', 'LOCACAO', 'LOCAÇÃO', 'CONDOMINIO'], match: ['ALUGUEL'] },
      { keywords: ['SHAMPOO', 'CERA', 'PRODUTO', 'QUIMICO', 'QUÍMICO', 'INSUMO', 'ESTOQUE', 'PRETINHO'], match: ['PRODUTO', 'INSUMO'] },
      { keywords: ['SALARIO', 'SALÁRIO', 'FOLHA', 'DIARIA', 'DIÁRIA', 'COMISSAO', 'FUNCIONARIO', 'VALE'], match: ['FOLHA', 'PAGAMENTO', 'PESSOAL'] },
      { keywords: ['DAS', 'SIMPLES', 'DARF', 'IMPOSTO', 'TRIBUTO', 'ISS', 'PREFEITURA', 'CONTABIL'], match: ['IMPOSTO', 'DAS'] },
      { keywords: ['TARIFA', 'IOF', 'MANUTENCAO CONTA', 'ANUIDADE', 'MAQUININHA', 'CIELO', 'STONE', 'PAGSEGURO', 'GETNET'], match: ['TARIFA', 'MAQUININHA'] },
      { keywords: ['MANUTENCAO', 'MANUTENÇÃO', 'BOMBA', 'MANGUEIRA', 'COMPRESSOR', 'OFICINA', 'PEÇA'], match: ['MANUTENÇÃO', 'EQUIPAMENTO'] },
      { keywords: ['POSTO', 'COMBUSTIVEL', 'COMBUSTÍVEL', 'GASOLINA', 'DIESEL', 'ETANOL', 'INTERNET', 'VIVO', 'CLARO', 'TIM'], match: ['COMBUSTÍVEL', 'GERAIS'] },
    ];

    for (const rule of rules) {
      if (rule.keywords.some((kw) => upper.includes(kw))) {
        const found = active.find((a) =>
          rule.match.some((m) => a.nome.toUpperCase().includes(m) || a.grupo.toUpperCase().includes(m))
        );
        if (found) return found;
      }
    }
  } else {
    const rules: Array<{ keywords: string[]; match: string[] }> = [
      { keywords: ['BOLETO', 'FATURA', 'MENSAL', 'FROTA', 'INOVA', 'TESTATO', 'CONTRATO'], match: ['FROTA', 'CONTRATO'] },
      { keywords: ['POLIMENTO', 'HIGIENIZACAO', 'HIGIENIZAÇÃO', 'CRISTALIZACAO'], match: ['POLIMENTO', 'HIGIENIZAÇÃO'] },
      { keywords: ['RENDIMENTO', 'JUROS', 'POUPANCA', 'CDB', 'RESGATE', 'ESTORNO'], match: ['RENDIMENTO', 'OUTRAS'] },
      { keywords: ['PIX', 'TED', 'DOC', 'DEPOSITO', 'LAVAGEM', 'CARTAO', 'CARTÃO', 'VENDAS'], match: ['LAVAGEM', 'SERVIÇO'] },
    ];

    for (const rule of rules) {
      if (rule.keywords.some((kw) => upper.includes(kw))) {
        const found = active.find((a) =>
          rule.match.some((m) => a.nome.toUpperCase().includes(m) || a.grupo.toUpperCase().includes(m))
        );
        if (found) return found;
      }
    }
  }

  return active[0];
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
  camposExtras?: Record<string, string>
): ParsedBankRow => {
  const tipo: 'receita' | 'despesa' = explicitTipo || (signedAmount >= 0 ? 'receita' : 'despesa');
  const valor = Math.abs(signedAmount);
  const cleanDesc = (descricao || 'LANÇAMENTO BANCÁRIO').trim().toUpperCase();

  let matchedAccount: AccountPlanItem | undefined;
  if (explicitContaNome && explicitContaNome.trim()) {
    const target = explicitContaNome.trim().toUpperCase();
    matchedAccount =
      accountsPlan.find((a) => a.nome.toUpperCase() === target || a.codigo.toUpperCase() === target) ||
      accountsPlan.find((a) => a.nome.toUpperCase().includes(target));
  }
  if (!matchedAccount) {
    matchedAccount = suggestAccountForDescription(cleanDesc, tipo, accountsPlan);
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
    contaNome: matchedAccount?.nome || (tipo === 'receita' ? 'RECEITA GERAL' : 'DESPESA GERAL'),
    grupo: matchedAccount?.grupo || (tipo === 'receita' ? 'RECEITAS' : 'DESPESAS'),
    status: 'Conciliado',
    observacoes: (explicitObs || '').trim().toUpperCase(),
    camposExtras: camposExtras || {},
  };
};

/**
 * Parser de arquivos OFX / QFX (Open Financial Exchange)
 */
export const parseOfxStatement = (
  content: string,
  accountsPlan: AccountPlanItem[],
  defaultBankName = 'BANCO (OFX)'
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
          explicitTipo
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
  defaultBankName = 'CONTA CORRENTE'
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
        extras
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
  defaultBankName = 'CONTA CORRENTE'
): ParsedBankRow[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Detecta se é OFX colado em texto
  if (trimmed.includes('<OFX>') || trimmed.includes('<STMTTRN>')) {
    return parseOfxStatement(trimmed, accountsPlan, defaultBankName);
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

  return parseMatrixRows(matrix, accountsPlan, customFields, defaultBankName);
};

/**
 * Parser para arquivos XLSX / XLS / CSV / OFX enviados via <input type="file" />
 */
export const parseBankStatementFile = async (
  file: File,
  accountsPlan: AccountPlanItem[],
  customFields: FinancialCustomField[]
): Promise<ParsedBankRow[]> => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.ofx') || fileName.endsWith('.qfx')) {
    const content = await file.text();
    return parseOfxStatement(content, accountsPlan, file.name.replace(/\.[^.]+$/, '').toUpperCase());
  }

  if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
    const content = await file.text();
    return parseTextOrCsvStatement(content, accountsPlan, customFields, 'CONTA CORRENTE');
  }

  // Excel (.xlsx / .xls)
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];
  const matrix = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: '' });
  return parseMatrixRows(matrix, accountsPlan, customFields, 'EXTRATO EXCEL');
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
