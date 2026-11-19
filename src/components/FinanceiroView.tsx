import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AccountPlanItem,
  AccountPlanType,
  FinancialEntry,
  FinancialCustomField,
  CustomFieldInputType,
  BankAccount,
  BankAccountType,
} from '../types';
import { formatCurrency, parseLaunchDate, getWeekRange } from '../utils/storage';
import {
  ParsedBankRow,
  parseBankStatementFile,
  parseTextOrCsvStatement,
  buildEditableModelRows,
  downloadStatementTemplateExcel,
  exportFinancialEntriesToExcel,
  exportAccountsPlanToExcel,
  parseAccountsPlanFile,
  analyzeStatementLineAccount,
  reanalyzeStagingRows,
} from '../utils/bankStatementParser';
import { ConfirmModal } from './ConfirmModal';
import {
  Wallet,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Upload,
  FileSpreadsheet,
  Download,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Landmark,
  CheckCircle2,
  Clock,
  ClipboardPaste,
  Layers,
  AlertCircle,
  Save,
  RotateCcw,
  Copy,
  CreditCard,
  ArrowRight,
} from 'lucide-react';

interface FinanceiroViewProps {
  entries: FinancialEntry[];
  accountsPlan: AccountPlanItem[];
  customFields: FinancialCustomField[];
  bankAccounts: BankAccount[];
  initialSubTab?: 'movimentacoes' | 'extrato' | 'bancos' | 'plano';
  onSaveEntry: (entry: FinancialEntry) => void;
  onSaveEntriesBatch: (entries: FinancialEntry[]) => void;
  onDeleteEntry: (id: string) => void;
  onDeleteEntriesBatch: (ids: string[]) => void;
  onSaveAccount: (account: AccountPlanItem) => void;
  onSaveAccountsBatch?: (accounts: AccountPlanItem[]) => void;
  onDeleteAccount: (id: string) => void;
  onDeleteAccountsBatch?: (ids: string[]) => void;
  onRestoreDefaultAccounts?: () => void;
  onSaveCustomField: (field: FinancialCustomField) => void;
  onDeleteCustomField: (id: string) => void;
  onSaveBankAccount: (account: BankAccount) => void;
  onDeleteBankAccount: (id: string) => void;
  onRestoreDefaultBankAccounts?: () => void;
}

type SubTab = 'movimentacoes' | 'extrato' | 'bancos' | 'plano';
type FilterPeriod = 'mes' | 'mes_anterior' | 'hoje' | 'semana' | 'todos' | 'personalizado';

const PAYMENT_METHODS = [
  'PIX',
  'CONTA CORRENTE',
  'BOLETO',
  'CARTÃO',
  'TRANSFERÊNCIA',
  'DINHEIRO',
  'DÉBITO AUTOMÁTICO',
  'TARIFA BANCÁRIA',
];

const BANK_SUGGESTIONS = [
  'SICREDI / 748',
  'BANCO DO BRASIL / 001',
  'ITAÚ / 341',
  'BRADESCO / 237',
  'CAIXA ECONÔMICA / 104',
  'SANTANDER / 033',
  'SICOOB / 756',
  'BANCO INTER / 077',
  'NUBANK / 260',
  'MERCADO PAGO',
  'STONE / PAGSEGURO',
  'CAIXA FÍSICO (ESPÉCIE)',
];

const BANK_ACCOUNT_TYPES: BankAccountType[] = [
  'Conta Corrente',
  'Caixa Físico',
  'Poupança',
  'Carteira Digital',
  'Investimento',
];

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  entries,
  accountsPlan,
  customFields,
  bankAccounts,
  initialSubTab = 'movimentacoes',
  onSaveEntry,
  onSaveEntriesBatch,
  onDeleteEntry,
  onDeleteEntriesBatch,
  onSaveAccount,
  onSaveAccountsBatch,
  onDeleteAccount,
  onDeleteAccountsBatch,
  onRestoreDefaultAccounts,
  onSaveCustomField,
  onDeleteCustomField,
  onSaveBankAccount,
  onDeleteBankAccount,
  onRestoreDefaultBankAccounts,
}) => {
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Filtros de Movimentações
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [filterContaId, setFilterContaId] = useState<string>('todas');
  const [filterBanco, setFilterBanco] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'Conciliado' | 'Pendente'>('todos');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('mes');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));

  // Seleção em lote nas Movimentações
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAccountId, setBulkAccountId] = useState<string>('');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Edição inline rápida na tabela de Movimentações
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState<FinancialEntry | null>(null);

  // Contas Bancárias
  const defaultActiveBank = useMemo(
    () => bankAccounts.find((b) => b.ativo) || bankAccounts[0],
    [bankAccounts]
  );
  const [bankSearch, setBankSearch] = useState('');
  const [bankFilterStatus, setBankFilterStatus] = useState<'todas' | 'ativas' | 'inativas'>('todas');
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankForm, setBankForm] = useState<Omit<BankAccount, 'id'>>({
    nome: '',
    banco: '',
    agencia: '',
    numeroConta: '',
    tipoConta: 'Conta Corrente',
    saldoInicial: 0,
    dataSaldoInicial: new Date().toISOString().slice(0, 10),
    chavePix: '',
    observacoes: '',
    ativo: true,
  });
  const [bankToDelete, setBankToDelete] = useState<BankAccount | null>(null);
  const [selectNewBankForEntry, setSelectNewBankForEntry] = useState(false);

  // Modal de Lançamento Financeiro (Novo / Editar Completo)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [entryForm, setEntryForm] = useState<Omit<FinancialEntry, 'id'>>({
    data: new Date().toISOString().slice(0, 10),
    descricao: '',
    tipo: 'despesa',
    contaId: '',
    contaNome: '',
    grupo: '',
    valor: 0,
    banco: defaultActiveBank?.nome || 'SICREDI',
    bancoId: defaultActiveBank?.id || '',
    formaPagamento: 'PIX',
    documento: '',
    status: 'Conciliado',
    origem: 'manual',
    observacoes: '',
    camposExtras: {},
  });
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null);

  // Extrato Bancário (Importação & Staging Editável)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedExtratoBankId, setSelectedExtratoBankId] = useState<string>(defaultActiveBank?.id || '');
  const [bankDefaultName, setBankDefaultName] = useState(defaultActiveBank?.nome || 'SICREDI');
  const [pastedText, setPastedText] = useState('');
  const [stagingRows, setStagingRows] = useState<ParsedBankRow[]>([]);
  const [stagingFilter, setStagingFilter] = useState<'todas' | 'pendentes' | 'classificadas'>('todas');
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [stagingBulkContaId, setStagingBulkContaId] = useState('');

  useEffect(() => {
    if (selectedExtratoBankId) {
      const found = bankAccounts.find((b) => b.id === selectedExtratoBankId);
      if (found) setBankDefaultName(found.nome);
    } else if (!bankDefaultName && defaultActiveBank) {
      setSelectedExtratoBankId(defaultActiveBank.id);
      setBankDefaultName(defaultActiveBank.nome);
    }
  }, [bankAccounts, selectedExtratoBankId, defaultActiveBank]);

  // Plano de Contas (Totalmente Editável Inline na Tela + Import/Export)
  const planFileInputRef = useRef<HTMLInputElement | null>(null);
  const [planFilterTipo, setPlanFilterTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [planSearch, setPlanSearch] = useState('');
  const [planDrafts, setPlanDrafts] = useState<Record<string, AccountPlanItem>>({});
  const [dirtyPlanIds, setDirtyPlanIds] = useState<string[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [confirmPlanBulkDelete, setConfirmPlanBulkDelete] = useState(false);
  const [quickNewAccount, setQuickNewAccount] = useState<{
    codigo: string;
    tipo: AccountPlanType;
    grupo: string;
    nome: string;
    descricao: string;
  }>({
    codigo: '',
    tipo: 'despesa',
    grupo: 'DESPESAS OPERACIONAIS',
    nome: '',
    descricao: '',
  });
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountPlanItem | null>(null);
  const [accountForm, setAccountForm] = useState<Omit<AccountPlanItem, 'id'>>({
    codigo: '',
    nome: '',
    tipo: 'despesa',
    grupo: 'DESPESAS OPERACIONAIS',
    descricao: '',
    ativo: true,
  });
  const [accountToDelete, setAccountToDelete] = useState<AccountPlanItem | null>(null);

  // Mantém rascunhos locais sincronizados com accountsPlan sem perder edições ainda não salvas
  useEffect(() => {
    setPlanDrafts((prev) => {
      const dirtySet = new Set(dirtyPlanIds);
      const next: Record<string, AccountPlanItem> = {};
      accountsPlan.forEach((acc) => {
        next[acc.id] = dirtySet.has(acc.id) && prev[acc.id] ? prev[acc.id] : { ...acc };
      });
      return next;
    });
  }, [accountsPlan]);

  // Gerenciador de Campos Personalizados Editáveis
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FinancialCustomField | null>(null);
  const [fieldFormName, setFieldFormName] = useState('');
  const [fieldFormType, setFieldFormType] = useState<CustomFieldInputType>('texto');
  const [fieldFormOptions, setFieldFormOptions] = useState('');
  const [fieldToDelete, setFieldToDelete] = useState<FinancialCustomField | null>(null);

  const activeCustomFields = useMemo(
    () => customFields.filter((f) => f.ativo),
    [customFields]
  );

  // Datas auxiliares
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const { start: weekStart, end: weekEnd } = getWeekRange(now);

  // Calcula saldos reais de cada Conta Bancária cadastrada
  const bankBalancesMap = useMemo(() => {
    const map = new Map<
      string,
      {
        entradasConciliadas: number;
        saidasConciliadas: number;
        entradasPendentes: number;
        saidasPendentes: number;
        saldoAtual: number;
        saldoPrevisto: number;
        count: number;
      }
    >();

    bankAccounts.forEach((bank) => {
      map.set(bank.id, {
        entradasConciliadas: 0,
        saidasConciliadas: 0,
        entradasPendentes: 0,
        saidasPendentes: 0,
        saldoAtual: Number(bank.saldoInicial) || 0,
        saldoPrevisto: Number(bank.saldoInicial) || 0,
        count: 0,
      });
    });

    entries.forEach((e) => {
      const matchedBank =
        (e.bancoId ? bankAccounts.find((b) => b.id === e.bancoId) : undefined) ||
        bankAccounts.find((b) => b.nome.trim().toUpperCase() === (e.banco || '').trim().toUpperCase());

      if (!matchedBank) return;
      if (matchedBank.dataSaldoInicial && e.data && e.data < matchedBank.dataSaldoInicial) return;

      const stat = map.get(matchedBank.id);
      if (!stat) return;
      const val = Math.abs(Number(e.valor) || 0);
      stat.count += 1;

      if (e.status === 'Pendente') {
        if (e.tipo === 'receita') stat.entradasPendentes += val;
        else stat.saidasPendentes += val;
      } else {
        if (e.tipo === 'receita') stat.entradasConciliadas += val;
        else stat.saidasConciliadas += val;
      }
    });

    bankAccounts.forEach((bank) => {
      const stat = map.get(bank.id)!;
      const base = Number(bank.saldoInicial) || 0;
      stat.saldoAtual = base + stat.entradasConciliadas - stat.saidasConciliadas;
      stat.saldoPrevisto = stat.saldoAtual + stat.entradasPendentes - stat.saidasPendentes;
    });

    return map;
  }, [bankAccounts, entries]);

  const consolidatedBankTotals = useMemo(() => {
    let saldoAtualTotal = 0;
    let saldoPrevistoTotal = 0;
    let ativas = 0;
    bankAccounts.forEach((b) => {
      if (!b.ativo) return;
      ativas += 1;
      const st = bankBalancesMap.get(b.id);
      if (st) {
        saldoAtualTotal += st.saldoAtual;
        saldoPrevistoTotal += st.saldoPrevisto;
      }
    });
    return { saldoAtualTotal, saldoPrevistoTotal, ativas };
  }, [bankAccounts, bankBalancesMap]);

  const legacyUnregisteredBankNames = useMemo(() => {
    const regNames = new Set(bankAccounts.map((b) => b.nome.trim().toUpperCase()));
    const set = new Set<string>();
    entries.forEach((e) => {
      const name = (e.banco || '').trim().toUpperCase();
      if (name && !regNames.has(name) && !e.bancoId) {
        set.add(name);
      }
    });
    return Array.from(set).sort();
  }, [bankAccounts, entries]);

  // Movimentações filtradas
  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (filterTipo !== 'todos' && e.tipo !== filterTipo) return false;
        if (filterContaId !== 'todas' && e.contaId !== filterContaId && e.contaNome !== filterContaId) return false;
        if (filterStatus !== 'todos' && e.status !== filterStatus) return false;

        if (filterBanco !== 'todos') {
          if (filterBanco.startsWith('bank:')) {
            const targetId = filterBanco.slice(5);
            const targetBank = bankAccounts.find((b) => b.id === targetId);
            const matchById = e.bancoId === targetId;
            const matchByName =
              targetBank &&
              !e.bancoId &&
              (e.banco || '').trim().toUpperCase() === targetBank.nome.trim().toUpperCase();
            if (!matchById && !matchByName) return false;
          } else if (filterBanco.startsWith('name:')) {
            const targetName = filterBanco.slice(5);
            if ((e.banco || '').trim().toUpperCase() !== targetName) return false;
          }
        }

        if (filterPeriod === 'hoje' && e.data !== todayStr) return false;
        if (filterPeriod === 'mes' && !e.data.startsWith(currentMonthPrefix)) return false;
        if (filterPeriod === 'mes_anterior' && !e.data.startsWith(prevMonthPrefix)) return false;
        if (filterPeriod === 'semana') {
          const d = parseLaunchDate(e.data);
          if (!d || d.getTime() < weekStart.getTime() || d.getTime() > weekEnd.getTime()) return false;
        }
        if (filterPeriod === 'personalizado') {
          if (customStart && e.data < customStart) return false;
          if (customEnd && e.data > customEnd) return false;
        }

        if (term) {
          const extrasStr = Object.values(e.camposExtras || {}).join(' ').toLowerCase();
          const match =
            e.descricao.toLowerCase().includes(term) ||
            e.contaNome.toLowerCase().includes(term) ||
            e.grupo.toLowerCase().includes(term) ||
            e.banco.toLowerCase().includes(term) ||
            (e.documento || '').toLowerCase().includes(term) ||
            (e.observacoes || '').toLowerCase().includes(term) ||
            extrasStr.includes(term);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [
    entries,
    searchTerm,
    filterTipo,
    filterContaId,
    filterBanco,
    filterStatus,
    filterPeriod,
    customStart,
    customEnd,
    todayStr,
    currentMonthPrefix,
    prevMonthPrefix,
    weekStart,
    weekEnd,
    bankAccounts,
  ]);

  const filteredSummary = useMemo(() => {
    let rec = 0;
    let desp = 0;
    let pendentes = 0;
    filteredEntries.forEach((e) => {
      if (e.tipo === 'receita') rec += Math.abs(e.valor);
      else desp += Math.abs(e.valor);
      if (e.status === 'Pendente') pendentes += 1;
    });
    return {
      receitas: rec,
      despesas: desp,
      saldo: rec - desp,
      pendentes,
    };
  }, [filteredEntries]);

  // Totais por conta do Plano de Contas
  const accountTotalsMap = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    entries.forEach((e) => {
      const key = e.contaId || e.contaNome;
      const curr = map.get(key) || { total: 0, count: 0 };
      curr.total += Math.abs(e.valor);
      curr.count += 1;
      map.set(key, curr);
    });
    return map;
  }, [entries]);

  // Handlers de Contas Bancárias
  const openNewBankModal = (forEntry = false) => {
    setEditingBank(null);
    setSelectNewBankForEntry(forEntry);
    setBankForm({
      nome: '',
      banco: '',
      agencia: '',
      numeroConta: '',
      tipoConta: 'Conta Corrente',
      saldoInicial: 0,
      dataSaldoInicial: todayStr,
      chavePix: '',
      observacoes: '',
      ativo: true,
    });
    setIsBankModalOpen(true);
  };

  const openEditBankModal = (bank: BankAccount) => {
    setEditingBank(bank);
    setSelectNewBankForEntry(false);
    setBankForm({
      nome: bank.nome,
      banco: bank.banco,
      agencia: bank.agencia,
      numeroConta: bank.numeroConta,
      tipoConta: bank.tipoConta,
      saldoInicial: bank.saldoInicial,
      dataSaldoInicial: bank.dataSaldoInicial || todayStr,
      chavePix: bank.chavePix || '',
      observacoes: bank.observacoes || '',
      ativo: bank.ativo,
    });
    setIsBankModalOpen(true);
  };

  const handleSaveBankModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.nome.trim()) return;
    const saved: BankAccount = {
      id: editingBank ? editingBank.id : `bank-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      nome: bankForm.nome.trim().toUpperCase(),
      banco: (bankForm.banco.trim() || bankForm.nome.trim()).toUpperCase(),
      agencia: (bankForm.agencia || '').trim().toUpperCase(),
      numeroConta: (bankForm.numeroConta || '').trim().toUpperCase(),
      tipoConta: bankForm.tipoConta || 'Conta Corrente',
      saldoInicial: Number(bankForm.saldoInicial) || 0,
      dataSaldoInicial: bankForm.dataSaldoInicial || todayStr,
      chavePix: (bankForm.chavePix || '').trim(),
      observacoes: (bankForm.observacoes || '').trim().toUpperCase(),
      ativo: bankForm.ativo,
    };
    onSaveBankAccount(saved);
    if (selectNewBankForEntry) {
      setEntryForm((prev) => ({
        ...prev,
        banco: saved.nome,
        bancoId: saved.id,
      }));
    }
    if (subTab === 'extrato' || !selectedExtratoBankId) {
      setSelectedExtratoBankId(saved.id);
      setBankDefaultName(saved.nome);
    }
    setIsBankModalOpen(false);
    setSelectNewBankForEntry(false);
    setImportFeedback({
      type: 'success',
      msg: `Conta bancária "${saved.nome}" salva com sucesso!`,
    });
  };

  // Handlers de Lançamento Financeiro (Manual / Modal)
  const openNewEntryModal = (defaultTipo: AccountPlanType = 'despesa', presetBank?: BankAccount) => {
    const firstAcc =
      accountsPlan.find((a) => a.ativo && a.tipo === defaultTipo) ||
      accountsPlan.find((a) => a.tipo === defaultTipo);
    const chosenBank =
      presetBank ||
      bankAccounts.find((b) => b.id === selectedExtratoBankId) ||
      defaultActiveBank;
    setEditingEntry(null);
    setEntryForm({
      data: new Date().toISOString().slice(0, 10),
      descricao: '',
      tipo: defaultTipo,
      contaId: firstAcc?.id || '',
      contaNome: firstAcc?.nome || '',
      grupo: firstAcc?.grupo || '',
      valor: 0,
      banco: chosenBank?.nome || bankDefaultName || 'CAIXA',
      bancoId: chosenBank?.id || '',
      formaPagamento: chosenBank?.tipoConta === 'Caixa Físico' ? 'DINHEIRO' : 'PIX',
      documento: '',
      status: 'Conciliado',
      origem: 'manual',
      observacoes: '',
      camposExtras: {},
    });
    setIsEntryModalOpen(true);
  };

  const openEditEntryModal = (entry: FinancialEntry) => {
    const matchedBank =
      (entry.bancoId ? bankAccounts.find((b) => b.id === entry.bancoId) : undefined) ||
      bankAccounts.find((b) => b.nome.trim().toUpperCase() === (entry.banco || '').trim().toUpperCase());
    setEditingEntry(entry);
    setEntryForm({
      data: entry.data,
      descricao: entry.descricao,
      tipo: entry.tipo,
      contaId: entry.contaId,
      contaNome: entry.contaNome,
      grupo: entry.grupo,
      valor: entry.valor,
      banco: matchedBank?.nome || entry.banco,
      bancoId: matchedBank?.id || entry.bancoId || '',
      formaPagamento: entry.formaPagamento || 'PIX',
      documento: entry.documento || '',
      status: entry.status,
      origem: entry.origem,
      observacoes: entry.observacoes || '',
      camposExtras: { ...(entry.camposExtras || {}) },
    });
    setIsEntryModalOpen(true);
  };

  const handleSaveEntryModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForm.descricao.trim()) return;
    const acc = accountsPlan.find((a) => a.id === entryForm.contaId);
    const matchedBank =
      (entryForm.bancoId ? bankAccounts.find((b) => b.id === entryForm.bancoId) : undefined) ||
      bankAccounts.find((b) => b.nome.trim().toUpperCase() === (entryForm.banco || '').trim().toUpperCase());
    const saved: FinancialEntry = {
      id: editingEntry ? editingEntry.id : `fin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      data: entryForm.data || todayStr,
      descricao: entryForm.descricao.trim().toUpperCase(),
      tipo: entryForm.tipo,
      contaId: acc?.id || entryForm.contaId || '',
      contaNome: (acc?.nome || entryForm.contaNome || (entryForm.tipo === 'receita' ? 'OUTRAS RECEITAS' : 'OUTRAS DESPESAS')).toUpperCase(),
      grupo: (acc?.grupo || entryForm.grupo || 'GERAL').toUpperCase(),
      valor: Math.abs(Number(entryForm.valor) || 0),
      banco: (matchedBank?.nome || entryForm.banco || 'CAIXA').trim().toUpperCase(),
      bancoId: matchedBank?.id || entryForm.bancoId || '',
      formaPagamento: (entryForm.formaPagamento || '').trim().toUpperCase(),
      documento: (entryForm.documento || '').trim().toUpperCase(),
      status: entryForm.status,
      origem: editingEntry ? entryForm.origem : 'manual',
      observacoes: (entryForm.observacoes || '').trim().toUpperCase(),
      camposExtras: entryForm.camposExtras || {},
      criadoEm: editingEntry?.criadoEm || new Date().toISOString(),
    };
    onSaveEntry(saved);
    setIsEntryModalOpen(false);
  };

  // Edição Inline Rápida
  const startInlineEdit = (entry: FinancialEntry) => {
    const matchedBank =
      (entry.bancoId ? bankAccounts.find((b) => b.id === entry.bancoId) : undefined) ||
      bankAccounts.find((b) => b.nome.trim().toUpperCase() === (entry.banco || '').trim().toUpperCase());
    setInlineEditId(entry.id);
    setInlineDraft({
      ...entry,
      bancoId: matchedBank?.id || entry.bancoId || '',
      camposExtras: { ...(entry.camposExtras || {}) },
    });
  };

  const saveInlineEdit = () => {
    if (!inlineDraft) return;
    const acc = accountsPlan.find((a) => a.id === inlineDraft.contaId);
    const matchedBank =
      (inlineDraft.bancoId ? bankAccounts.find((b) => b.id === inlineDraft.bancoId) : undefined) ||
      bankAccounts.find((b) => b.nome.trim().toUpperCase() === (inlineDraft.banco || '').trim().toUpperCase());
    onSaveEntry({
      ...inlineDraft,
      descricao: inlineDraft.descricao.trim().toUpperCase(),
      contaNome: (acc?.nome || inlineDraft.contaNome).toUpperCase(),
      grupo: (acc?.grupo || inlineDraft.grupo).toUpperCase(),
      valor: Math.abs(Number(inlineDraft.valor) || 0),
      banco: (matchedBank?.nome || inlineDraft.banco || 'CAIXA').trim().toUpperCase(),
      bancoId: matchedBank?.id || inlineDraft.bancoId || '',
      documento: (inlineDraft.documento || '').trim().toUpperCase(),
      observacoes: (inlineDraft.observacoes || '').trim().toUpperCase(),
    });
    setInlineEditId(null);
    setInlineDraft(null);
  };

  // Ações em lote
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEntries.map((e) => e.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkApplyAccount = () => {
    if (!bulkAccountId || selectedIds.length === 0) return;
    const acc = accountsPlan.find((a) => a.id === bulkAccountId);
    if (!acc) return;
    const updatedList = entries
      .filter((e) => selectedIds.includes(e.id))
      .map((e) => ({
        ...e,
        tipo: acc.tipo,
        contaId: acc.id,
        contaNome: acc.nome,
        grupo: acc.grupo,
      }));
    onSaveEntriesBatch(updatedList);
    setSelectedIds([]);
    setBulkAccountId('');
  };

  const handleBulkReconcile = () => {
    if (selectedIds.length === 0) return;
    const updatedList = entries
      .filter((e) => selectedIds.includes(e.id))
      .map((e) => ({ ...e, status: 'Conciliado' as const }));
    onSaveEntriesBatch(updatedList);
    setSelectedIds([]);
  };

  const stagingStats = useMemo(() => {
    let pendentes = 0;
    let totalReceitas = 0;
    let totalDespesas = 0;
    stagingRows.forEach((r) => {
      if (!r.contaId) pendentes += 1;
      if (r.tipo === 'receita') totalReceitas += Math.abs(Number(r.valor) || 0);
      else totalDespesas += Math.abs(Number(r.valor) || 0);
    });
    return {
      total: stagingRows.length,
      pendentes,
      classificadas: stagingRows.length - pendentes,
      totalReceitas,
      totalDespesas,
    };
  }, [stagingRows]);

  const visibleStagingRows = useMemo(() => {
    if (stagingFilter === 'pendentes') return stagingRows.filter((r) => !r.contaId);
    if (stagingFilter === 'classificadas') return stagingRows.filter((r) => Boolean(r.contaId));
    return stagingRows;
  }, [stagingRows, stagingFilter]);

  // Handlers de Extrato Bancário
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseBankStatementFile(file, accountsPlan, customFields, entries);
      if (parsed.length === 0) {
        setImportFeedback({
          type: 'error',
          msg: 'Não foi possível identificar movimentações no arquivo. Verifique se possui colunas de Data, Descrição e Valor.',
        });
      } else {
        const chosenBank = bankAccounts.find((b) => b.id === selectedExtratoBankId);
        const withBank = parsed.map((row) => {
          const useSelected =
            !!chosenBank ||
            row.banco === 'CONTA CORRENTE' ||
            row.banco === 'EXTRATO EXCEL';
          const bankName = chosenBank ? chosenBank.nome : useSelected ? bankDefaultName.toUpperCase() : row.banco;
          const bankMatch =
            chosenBank ||
            bankAccounts.find((b) => b.nome.trim().toUpperCase() === bankName.trim().toUpperCase());
          return {
            ...row,
            banco: bankName,
            bancoId: bankMatch?.id || '',
          };
        });
        const pendingCount = withBank.filter((r) => !r.contaId).length;
        const classifiedCount = withBank.length - pendingCount;
        setStagingRows((prev) => [...prev, ...withBank]);
        setStagingFilter('todas');
        setImportFeedback({
          type: 'success',
          msg:
            pendingCount > 0
              ? `${withBank.length} linha(s) analisada(s) de "${file.name}": ${classifiedCount} com Plano de Contas sugerido e ${pendingCount} pendente(s) — informe em qual conta lançar abaixo.`
              : `${withBank.length} linha(s) analisada(s) de "${file.name}" e todas já identificadas com Plano de Contas! Revise abaixo antes de confirmar.`,
        });
      }
    } catch (err: any) {
      setImportFeedback({
        type: 'error',
        msg: `Erro ao ler arquivo: ${err?.message || 'formato inválido'}`,
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    const chosenBank = bankAccounts.find((b) => b.id === selectedExtratoBankId);
    const parsed = parseTextOrCsvStatement(
      pastedText,
      accountsPlan,
      customFields,
      chosenBank?.nome || bankDefaultName.toUpperCase() || 'EXTRATO BANCÁRIO',
      entries
    );
    if (parsed.length === 0) {
      setImportFeedback({
        type: 'error',
        msg: 'Nenhuma linha válida identificada no texto colado. Use o formato: Data | Descrição | Valor.',
      });
    } else {
      const withBank = parsed.map((r) => ({
        ...r,
        banco: chosenBank?.nome || r.banco,
        bancoId: chosenBank?.id || '',
      }));
      const pendingCount = withBank.filter((r) => !r.contaId).length;
      const classifiedCount = withBank.length - pendingCount;
      setStagingRows((prev) => [...prev, ...withBank]);
      setStagingFilter('todas');
      setPastedText('');
      setImportFeedback({
        type: 'success',
        msg:
          pendingCount > 0
            ? `${parsed.length} linha(s) analisada(s): ${classifiedCount} classificada(s) no Plano de Contas e ${pendingCount} aguardando sua seleção.`
            : `${parsed.length} linha(s) analisada(s) e todas já vinculadas ao Plano de Contas! Revise antes de confirmar.`,
      });
    }
  };

  const handleLoadEditableModel = () => {
    const chosenBank = bankAccounts.find((b) => b.id === selectedExtratoBankId);
    const modelRows = buildEditableModelRows(accountsPlan, customFields).map((r) => ({
      ...r,
      banco: chosenBank?.nome || bankDefaultName || r.banco,
      bancoId: chosenBank?.id || '',
    }));
    setStagingRows((prev) => [...prev, ...modelRows]);
    setStagingFilter('todas');
    setImportFeedback({
      type: 'success',
      msg: 'Modelo editável carregado na pré-visualização! Altere qualquer campo, adicione ou apague linhas conforme sua necessidade.',
    });
  };

  const handleAddEmptyStagingRow = () => {
    const chosenBank = bankAccounts.find((b) => b.id === selectedExtratoBankId) || defaultActiveBank;
    const emptyExtras: Record<string, string> = {};
    customFields.forEach((f) => {
      emptyExtras[f.id] = '';
    });
    setStagingRows((prev) => [
      ...prev,
      {
        tempId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        data: todayStr,
        descricao: '',
        tipo: 'despesa',
        valor: 0,
        banco: (chosenBank?.nome || bankDefaultName || 'SICREDI').toUpperCase(),
        bancoId: chosenBank?.id || '',
        formaPagamento: 'PIX',
        documento: '',
        contaId: '',
        contaNome: '',
        grupo: '',
        status: 'Conciliado',
        observacoes: '',
        camposExtras: emptyExtras,
        analysisStatus: 'pendente',
        analysisReason: 'Nova linha — preencha a descrição ou selecione o Plano de Contas',
      },
    ]);
  };

  const handleAnalyzeSingleRow = (tempId: string) => {
    setStagingRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) return row;
        if (row.analysisStatus === 'manual' || row.analysisStatus === 'explicit') return row;
        if (!row.descricao.trim()) return row;
        const analysis = analyzeStatementLineAccount(row.descricao, row.tipo, accountsPlan, entries);
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
      })
    );
  };

  const handleReanalyzeAllStaging = () => {
    if (stagingRows.length === 0) return;
    const next = reanalyzeStagingRows(stagingRows, accountsPlan, entries);
    setStagingRows(next);
    const pendingCount = next.filter((r) => !r.contaId).length;
    setImportFeedback({
      type: 'success',
      msg:
        pendingCount === 0
          ? `Análise concluída: todas as ${next.length} linhas possuem Plano de Contas informado.`
          : `Análise atualizada: ${next.length - pendingCount} classificadas e ${pendingCount} aguardando definição manual.`,
    });
  };

  const updateStagingRow = (tempId: string, patch: Partial<ParsedBankRow>) => {
    setStagingRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) return row;
        const updated = { ...row, ...patch };
        if (patch.contaId !== undefined) {
          if (!patch.contaId) {
            updated.contaId = '';
            updated.contaNome = '';
            updated.grupo = '';
            updated.analysisStatus = 'pendente';
            updated.analysisReason = 'Selecione em qual Plano de Contas lançar';
          } else {
            const acc = accountsPlan.find((a) => a.id === patch.contaId);
            if (acc) {
              updated.contaNome = acc.nome;
              updated.grupo = acc.grupo;
              updated.tipo = acc.tipo;
              updated.analysisStatus = patch.analysisStatus || 'manual';
              updated.analysisReason =
                patch.analysisReason || `Informado (${acc.codigo} · ${acc.nome})`;
            }
          }
        }
        return updated;
      })
    );
  };

  const handleApplyStagingBulkAccount = (onlyPending = false) => {
    if (!stagingBulkContaId) return;
    const acc = accountsPlan.find((a) => a.id === stagingBulkContaId);
    if (!acc) return;
    setStagingRows((prev) =>
      prev.map((row) => {
        if (onlyPending && row.contaId) return row;
        return {
          ...row,
          contaId: acc.id,
          contaNome: acc.nome,
          grupo: acc.grupo,
          tipo: acc.tipo,
          analysisStatus: 'manual',
          analysisReason: `Aplicado em lote (${acc.codigo} · ${acc.nome})`,
        };
      })
    );
    setStagingBulkContaId('');
  };

  const handleCommitStagingRows = () => {
    const valid = stagingRows.filter((r) => r.descricao.trim() !== '' || r.valor > 0);
    if (valid.length === 0) return;

    const missingAccount = valid.filter((r) => !r.contaId);
    if (missingAccount.length > 0) {
      setStagingFilter('pendentes');
      setImportFeedback({
        type: 'error',
        msg: `Cada linha do extrato deve informar em qual Plano de Contas será lançada. Faltam ${missingAccount.length} linha(s) destacada(s) abaixo.`,
      });
      return;
    }

    const toSave: FinancialEntry[] = valid.map((r, idx) => {
      const matchedAcc = accountsPlan.find((a) => a.id === r.contaId);
      const matchedBank =
        (r.bancoId ? bankAccounts.find((b) => b.id === r.bancoId) : undefined) ||
        bankAccounts.find((b) => b.nome.trim().toUpperCase() === (r.banco || '').trim().toUpperCase());
      return {
        id: `fin-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        data: r.data || todayStr,
        descricao: (r.descricao || 'LANÇAMENTO EXTRATO').trim().toUpperCase(),
        tipo: matchedAcc?.tipo || r.tipo,
        contaId: r.contaId,
        contaNome: (matchedAcc?.nome || r.contaNome || (r.tipo === 'receita' ? 'OUTRAS RECEITAS' : 'OUTRAS DESPESAS')).toUpperCase(),
        grupo: (matchedAcc?.grupo || r.grupo || 'GERAL').toUpperCase(),
        valor: Math.abs(Number(r.valor) || 0),
        banco: (matchedBank?.nome || r.banco || bankDefaultName || 'BANCO').trim().toUpperCase(),
        bancoId: matchedBank?.id || r.bancoId || '',
        formaPagamento: (r.formaPagamento || 'CONTA CORRENTE').toUpperCase(),
        documento: (r.documento || '').trim().toUpperCase(),
        status: r.status,
        origem: 'extrato',
        observacoes: (r.observacoes || '').trim().toUpperCase(),
        camposExtras: r.camposExtras || {},
        criadoEm: new Date().toISOString(),
      };
    });

    onSaveEntriesBatch(toSave);
    setStagingRows([]);
    setStagingFilter('todas');
    setImportFeedback({
      type: 'success',
      msg: `${toSave.length} lançamentos salvos com sucesso no Financeiro com seus respectivos Planos de Contas!`,
    });
    setSubTab('movimentacoes');
  };

  // Handlers do Plano de Contas (Inline + Rápido + Lote + Excel)
  const updatePlanDraft = (id: string, patch: Partial<AccountPlanItem>) => {
    setPlanDrafts((prev) => {
      const current = prev[id] || accountsPlan.find((a) => a.id === id);
      if (!current) return prev;
      return {
        ...prev,
        [id]: { ...current, ...patch },
      };
    });
    setDirtyPlanIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const commitPlanDraftRow = (id: string) => {
    const draft = planDrafts[id];
    if (!draft) return;
    if (!draft.nome.trim()) {
      // Restaura nome anterior se deixou vazio
      const orig = accountsPlan.find((a) => a.id === id);
      if (orig) {
        setPlanDrafts((prev) => ({ ...prev, [id]: { ...orig } }));
      }
      setDirtyPlanIds((prev) => prev.filter((x) => x !== id));
      return;
    }
    const normalized: AccountPlanItem = {
      ...draft,
      codigo: draft.codigo.trim().toUpperCase(),
      nome: draft.nome.trim().toUpperCase(),
      grupo: (draft.grupo.trim() || 'GERAL').toUpperCase(),
      descricao: (draft.descricao || '').trim(),
    };
    onSaveAccount(normalized);
    setDirtyPlanIds((prev) => prev.filter((x) => x !== id));
  };

  const commitAllPlanDrafts = () => {
    if (dirtyPlanIds.length === 0) return;
    const toSave: AccountPlanItem[] = [];
    dirtyPlanIds.forEach((id) => {
      const draft = planDrafts[id];
      if (draft && draft.nome.trim()) {
        toSave.push({
          ...draft,
          codigo: draft.codigo.trim().toUpperCase(),
          nome: draft.nome.trim().toUpperCase(),
          grupo: (draft.grupo.trim() || 'GERAL').toUpperCase(),
          descricao: (draft.descricao || '').trim(),
        });
      }
    });
    if (toSave.length > 0) {
      if (onSaveAccountsBatch) onSaveAccountsBatch(toSave);
      else toSave.forEach((a) => onSaveAccount(a));
    }
    setDirtyPlanIds([]);
    setImportFeedback({
      type: 'success',
      msg: `${toSave.length} conta(s) do Plano de Contas atualizadas!`,
    });
  };

  const handleQuickAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNewAccount.nome.trim()) return;
    const sameTypeCount = accountsPlan.filter((a) => a.tipo === quickNewAccount.tipo).length + 1;
    const prefix = quickNewAccount.tipo === 'receita' ? '1' : '2';
    const nextCode =
      quickNewAccount.codigo.trim().toUpperCase() ||
      `${prefix}.${String(sameTypeCount).padStart(2, '0')}`;
    const newAcc: AccountPlanItem = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      codigo: nextCode,
      tipo: quickNewAccount.tipo,
      grupo: (
        quickNewAccount.grupo.trim() ||
        (quickNewAccount.tipo === 'receita' ? 'RECEITAS OPERACIONAIS' : 'DESPESAS OPERACIONAIS')
      ).toUpperCase(),
      nome: quickNewAccount.nome.trim().toUpperCase(),
      descricao: quickNewAccount.descricao.trim(),
      ativo: true,
    };
    onSaveAccount(newAcc);
    setQuickNewAccount({
      codigo: '',
      tipo: quickNewAccount.tipo,
      grupo: quickNewAccount.tipo === 'receita' ? 'RECEITAS OPERACIONAIS' : 'DESPESAS OPERACIONAIS',
      nome: '',
      descricao: '',
    });
    setImportFeedback({
      type: 'success',
      msg: `Conta "${newAcc.codigo} · ${newAcc.nome}" adicionada ao Plano de Contas!`,
    });
  };

  const handleDuplicateAccount = (acc: AccountPlanItem) => {
    const source = planDrafts[acc.id] || acc;
    const duplicated: AccountPlanItem = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      codigo: `${source.codigo}-C`,
      nome: `${source.nome} (CÓPIA)`,
      tipo: source.tipo,
      grupo: source.grupo,
      descricao: source.descricao || '',
      ativo: true,
    };
    onSaveAccount(duplicated);
  };

  const handlePlanFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseAccountsPlanFile(file);
      if (imported.length === 0) {
        setImportFeedback({
          type: 'error',
          msg: 'Nenhuma conta identificada no arquivo. Use colunas: Código, Tipo, Grupo, Nome da Conta, Descrição.',
        });
      } else {
        if (onSaveAccountsBatch) onSaveAccountsBatch(imported);
        else imported.forEach((a) => onSaveAccount(a));
        setImportFeedback({
          type: 'success',
          msg: `${imported.length} conta(s) importadas para o Plano de Contas! Você pode editar qualquer célula abaixo.`,
        });
      }
    } catch (err: any) {
      setImportFeedback({
        type: 'error',
        msg: `Erro ao importar Plano de Contas: ${err?.message || 'formato inválido'}`,
      });
    } finally {
      e.target.value = '';
    }
  };

  const openNewAccountModal = (tipo: AccountPlanType = 'despesa') => {
    const sameTypeCount = accountsPlan.filter((a) => a.tipo === tipo).length + 1;
    const prefix = tipo === 'receita' ? '1' : '2';
    setEditingAccount(null);
    setAccountForm({
      codigo: `${prefix}.${String(sameTypeCount).padStart(2, '0')}`,
      nome: '',
      tipo,
      grupo: tipo === 'receita' ? 'RECEITAS OPERACIONAIS' : 'DESPESAS OPERACIONAIS',
      descricao: '',
      ativo: true,
    });
    setIsAccountModalOpen(true);
  };

  const openEditAccountModal = (acc: AccountPlanItem) => {
    const current = planDrafts[acc.id] || acc;
    setEditingAccount(current);
    setAccountForm({
      codigo: current.codigo,
      nome: current.nome,
      tipo: current.tipo,
      grupo: current.grupo,
      descricao: current.descricao || '',
      ativo: current.ativo,
    });
    setIsAccountModalOpen(true);
  };

  const handleSaveAccountModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.nome.trim()) return;
    const savedId = editingAccount ? editingAccount.id : `acc-${Date.now()}`;
    onSaveAccount({
      id: savedId,
      codigo: accountForm.codigo.trim().toUpperCase(),
      nome: accountForm.nome.trim().toUpperCase(),
      tipo: accountForm.tipo,
      grupo: (accountForm.grupo.trim() || 'GERAL').toUpperCase(),
      descricao: accountForm.descricao?.trim() || '',
      ativo: accountForm.ativo,
    });
    setDirtyPlanIds((prev) => prev.filter((x) => x !== savedId));
    setIsAccountModalOpen(false);
  };

  // Handlers de Campos Personalizados Editáveis
  const openFieldForm = (field?: FinancialCustomField) => {
    if (field) {
      setEditingField(field);
      setFieldFormName(field.nome);
      setFieldFormType(field.tipo);
      setFieldFormOptions((field.opcoes || []).join(', '));
    } else {
      setEditingField(null);
      setFieldFormName('');
      setFieldFormType('texto');
      setFieldFormOptions('');
    }
  };

  const handleSaveCustomFieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldFormName.trim()) return;
    const opcoes =
      fieldFormType === 'selecao'
        ? fieldFormOptions
            .split(',')
            .map((o) => o.trim().toUpperCase())
            .filter(Boolean)
        : [];
    onSaveCustomField({
      id: editingField ? editingField.id : `fld-${Date.now()}`,
      nome: fieldFormName.trim(),
      tipo: fieldFormType,
      opcoes,
      ativo: editingField ? editingField.ativo : true,
    });
    openFieldForm(undefined);
  };

  const planGroupsList = useMemo(() => {
    const groups = new Set<string>([
      'RECEITAS OPERACIONAIS',
      'OUTRAS RECEITAS',
      'DESPESAS OPERACIONAIS',
      'DESPESAS FIXAS',
      'DESPESAS COM PESSOAL',
      'DESPESAS BANCÁRIAS',
      'IMPOSTOS E TAXAS',
      'INVESTIMENTOS',
    ]);
    accountsPlan.forEach((a) => {
      if (a.grupo) groups.add(a.grupo.toUpperCase());
    });
    return Array.from(groups).sort();
  }, [accountsPlan]);

  const filteredBankAccounts = useMemo(() => {
    const term = bankSearch.trim().toLowerCase();
    return bankAccounts.filter((b) => {
      if (bankFilterStatus === 'ativas' && !b.ativo) return false;
      if (bankFilterStatus === 'inativas' && b.ativo) return false;
      if (term) {
        return (
          b.nome.toLowerCase().includes(term) ||
          b.banco.toLowerCase().includes(term) ||
          (b.agencia || '').toLowerCase().includes(term) ||
          (b.numeroConta || '').toLowerCase().includes(term) ||
          (b.chavePix || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [bankAccounts, bankFilterStatus, bankSearch]);

  const filteredPlanAccounts = useMemo(() => {
    const term = planSearch.trim().toLowerCase();
    return accountsPlan
      .filter((a) => {
        if (planFilterTipo !== 'todos' && a.tipo !== planFilterTipo) return false;
        if (term) {
          return (
            a.nome.toLowerCase().includes(term) ||
            a.codigo.toLowerCase().includes(term) ||
            a.grupo.toLowerCase().includes(term) ||
            (a.descricao || '').toLowerCase().includes(term)
          );
        }
        return true;
      })
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [accountsPlan, planFilterTipo, planSearch]);

  return (
    <div className="space-y-5">
      {/* Cabeçalho Principal do Módulo Financeiro */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-neutral-900 text-white rounded-xl shadow-xs">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-neutral-950 tracking-tight">
                Financeiro, Contas Bancárias & Plano de Contas
              </h1>
              <p className="text-xs text-neutral-500">
                Gerencie bancos e caixas, importe extratos bancários e edite diretamente qualquer linha do plano de contas ou movimentação.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              openFieldForm(undefined);
              setIsFieldsModalOpen(true);
            }}
            className="px-3 py-2 text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-700" />
            Campos ({customFields.length})
          </button>

          <button
            onClick={() => openNewBankModal(false)}
            className="px-3 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
            + Conta Bancária
          </button>

          <button
            onClick={() => setSubTab('extrato')}
            className="px-3 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            Extrato Bancário
          </button>

          <button
            onClick={() => openNewEntryModal('despesa')}
            className="px-3.5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Sub-Navegação do Financeiro */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-neutral-200/70 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setSubTab('movimentacoes')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              subTab === 'movimentacoes'
                ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Movimentações ({entries.length})
          </button>
          <button
            onClick={() => setSubTab('extrato')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              subTab === 'extrato'
                ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            Extrato Bancário
            {stagingRows.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-mono">
                {stagingRows.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab('bancos')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              subTab === 'bancos'
                ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Contas Bancárias ({bankAccounts.length})
          </button>
          <button
            onClick={() => setSubTab('plano')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              subTab === 'plano'
                ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Plano de Contas ({accountsPlan.length})
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {importFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            importFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {importFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{importFeedback.msg}</span>
          </div>
          <button
            onClick={() => setImportFeedback(null)}
            className="text-neutral-500 hover:text-neutral-800 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-ABA 1: MOVIMENTAÇÕES FINANCEIRAS (TOTALMENTE EDITÁVEL)            */}
      {/* ===================================================================== */}
      {subTab === 'movimentacoes' && (
        <div className="space-y-4">
          {/* Resumo do Filtro Atual */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Receitas no Filtro</span>
              <span className="text-lg sm:text-xl font-black font-mono tabular-nums text-emerald-700">
                {formatCurrency(filteredSummary.receitas)}
              </span>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Despesas no Filtro</span>
              <span className="text-lg sm:text-xl font-black font-mono tabular-nums text-rose-700">
                {formatCurrency(filteredSummary.despesas)}
              </span>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Saldo Líquido</span>
              <span
                className={`text-lg sm:text-xl font-black font-mono tabular-nums ${
                  filteredSummary.saldo >= 0 ? 'text-neutral-950' : 'text-rose-700'
                }`}
              >
                {formatCurrency(filteredSummary.saldo)}
              </span>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Itens Pendentes</span>
              <span className="text-lg sm:text-xl font-black font-mono tabular-nums text-amber-700">
                {filteredSummary.pendentes}
              </span>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              {/* Busca */}
              <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl lg:col-span-2">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar por descrição, conta, banco, documento ou campo extra..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none text-neutral-900"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-neutral-400 hover:text-neutral-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tipo */}
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value as any)}
                className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="receita">Apenas Receitas</option>
                <option value="despesa">Apenas Despesas</option>
              </select>

              {/* Conta do Plano */}
              <select
                value={filterContaId}
                onChange={(e) => setFilterContaId(e.target.value)}
                className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="todas">Todas as Contas (Plano)</option>
                {accountsPlan.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codigo} · {a.nome}
                  </option>
                ))}
              </select>

              {/* Banco / Caixa */}
              <select
                value={filterBanco}
                onChange={(e) => setFilterBanco(e.target.value)}
                className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="todos">Todos os Bancos / Caixas</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={`bank:${b.id}`}>
                    {b.nome} ({b.tipoConta})
                  </option>
                ))}
                {legacyUnregisteredBankNames.map((name) => (
                  <option key={name} value={`name:${name}`}>
                    {name} (Não cadastrado)
                  </option>
                ))}
              </select>

              {/* Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="todos">Status: Todos</option>
                <option value="Conciliado">Conciliado</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
              <div className="flex flex-wrap items-center gap-1 bg-neutral-100 p-1 rounded-xl">
                {[
                  { id: 'hoje', label: 'Hoje' },
                  { id: 'semana', label: 'Semana' },
                  { id: 'mes', label: 'Este Mês' },
                  { id: 'mes_anterior', label: 'Mês Ant.' },
                  { id: 'todos', label: 'Tudo' },
                  { id: 'personalizado', label: 'Datas' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setFilterPeriod(p.id as FilterPeriod)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                      filterPeriod === p.id
                        ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {filterPeriod === 'personalizado' && (
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2 py-1 border border-neutral-300 rounded-lg text-xs"
                  />
                  <span className="text-neutral-400">até</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-2 py-1 border border-neutral-300 rounded-lg text-xs"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => exportFinancialEntriesToExcel(filteredEntries, customFields)}
                  disabled={filteredEntries.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar Excel
                </button>
                <button
                  onClick={() => openNewEntryModal('receita')}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Receita
                </button>
                <button
                  onClick={() => openNewEntryModal('despesa')}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Despesa
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Edição em Lote (quando há linhas selecionadas) */}
          {selectedIds.length > 0 && (
            <div className="bg-neutral-900 text-white rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
              <span className="font-bold">
                {selectedIds.length} lançamento(s) selecionado(s)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulkAccountId}
                  onChange={(e) => setBulkAccountId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none"
                >
                  <option value="">-- Reclassificar Conta em Massa --</option>
                  {accountsPlan.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.tipo === 'receita' ? '[REC]' : '[DESP]'} {a.codigo} · {a.nome}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkApplyAccount}
                  disabled={!bulkAccountId}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg font-semibold"
                >
                  Aplicar Conta
                </button>
                <button
                  onClick={handleBulkReconcile}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold"
                >
                  Conciliar
                </button>
                <button
                  onClick={() => setConfirmBulkDelete(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Apagar
                </button>
              </div>
            </div>
          )}

          {/* Lista Mobile (Cards Editáveis) */}
          <div className="block md:hidden space-y-2.5">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(entry.id)}
                      onChange={() => toggleSelectOne(entry.id)}
                      className="mt-0.5 rounded border-neutral-300"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-neutral-950 block truncate">{entry.descricao}</span>
                      <span className="text-[11px] text-neutral-500 block truncate">
                        {entry.contaNome} · {entry.banco}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`font-mono font-black shrink-0 ${
                      entry.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {entry.tipo === 'receita' ? '+' : '-'}
                    {formatCurrency(entry.valor)}
                  </span>
                </div>

                {activeCustomFields.some((cf) => entry.camposExtras?.[cf.id]) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-neutral-600 bg-neutral-50 px-2 py-1 rounded-lg">
                    {activeCustomFields.map((cf) =>
                      entry.camposExtras?.[cf.id] ? (
                        <span key={cf.id}>
                          <strong>{cf.nome}:</strong> {entry.camposExtras[cf.id]}
                        </span>
                      ) : null
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px]">
                  <div className="flex items-center gap-2 text-neutral-500 font-mono">
                    <span>{entry.data.split('-').reverse().join('/')}</span>
                    <span>·</span>
                    <span className={entry.status === 'Conciliado' ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                      {entry.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditEntryModal(entry)}
                      className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg font-semibold flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                    <button
                      onClick={() => setEntryToDelete(entry)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Apagar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabela Desktop (Edição Inline em Qualquer Campo + Modal Completo) */}
          <div className="hidden md:block bg-white border border-neutral-200 rounded-2xl overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={filteredEntries.length > 0 && selectedIds.length === filteredEntries.length}
                      onChange={toggleSelectAll}
                      className="rounded border-neutral-300"
                    />
                  </th>
                  <th className="py-2.5 px-3 font-semibold">Data</th>
                  <th className="py-2.5 px-3 font-semibold">Tipo</th>
                  <th className="py-2.5 px-3 font-semibold">Descrição / Histórico</th>
                  <th className="py-2.5 px-3 font-semibold">Plano de Contas</th>
                  <th className="py-2.5 px-3 font-semibold">Banco / Pagamento</th>
                  {activeCustomFields.map((cf) => (
                    <th key={cf.id} className="py-2.5 px-3 font-semibold whitespace-nowrap">
                      {cf.nome}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Valor</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredEntries.map((entry) => {
                  const isEditingRow = inlineEditId === entry.id && inlineDraft;
                  if (isEditingRow && inlineDraft) {
                    return (
                      <tr key={entry.id} className="bg-blue-50/50">
                        <td className="py-2 px-3" />
                        <td className="py-2 px-2">
                          <input
                            type="date"
                            value={inlineDraft.data}
                            onChange={(e) => setInlineDraft({ ...inlineDraft, data: e.target.value })}
                            className="px-2 py-1 border border-blue-300 rounded text-xs bg-white font-mono"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={inlineDraft.tipo}
                            onChange={(e) => {
                              const nextTipo = e.target.value as AccountPlanType;
                              const nextAcc = accountsPlan.find((a) => a.tipo === nextTipo && a.ativo);
                              setInlineDraft({
                                ...inlineDraft,
                                tipo: nextTipo,
                                contaId: nextAcc?.id || '',
                                contaNome: nextAcc?.nome || '',
                                grupo: nextAcc?.grupo || '',
                              });
                            }}
                            className="px-2 py-1 border border-blue-300 rounded text-xs bg-white font-semibold"
                          >
                            <option value="receita">Receita</option>
                            <option value="despesa">Despesa</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={inlineDraft.descricao}
                            onChange={(e) => setInlineDraft({ ...inlineDraft, descricao: e.target.value })}
                            className="w-full min-w-[160px] px-2 py-1 border border-blue-300 rounded text-xs bg-white uppercase"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={inlineDraft.contaId}
                            onChange={(e) => {
                              const acc = accountsPlan.find((a) => a.id === e.target.value);
                              setInlineDraft({
                                ...inlineDraft,
                                contaId: e.target.value,
                                contaNome: acc?.nome || inlineDraft.contaNome,
                                grupo: acc?.grupo || inlineDraft.grupo,
                                tipo: acc?.tipo || inlineDraft.tipo,
                              });
                            }}
                            className="w-full min-w-[150px] px-2 py-1 border border-blue-300 rounded text-xs bg-white"
                          >
                            <option value="">-- Selecione --</option>
                            {accountsPlan.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.codigo} · {a.nome}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={inlineDraft.bancoId || ''}
                            onChange={(e) => {
                              const b = bankAccounts.find((x) => x.id === e.target.value);
                              setInlineDraft({
                                ...inlineDraft,
                                bancoId: b ? b.id : '',
                                banco: b ? b.nome : inlineDraft.banco,
                              });
                            }}
                            className="w-32 px-2 py-1 border border-blue-300 rounded text-xs bg-white uppercase font-medium"
                          >
                            {!inlineDraft.bancoId && inlineDraft.banco && (
                              <option value="">{inlineDraft.banco}</option>
                            )}
                            {bankAccounts.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.nome}
                              </option>
                            ))}
                          </select>
                        </td>
                        {activeCustomFields.map((cf) => (
                          <td key={cf.id} className="py-2 px-2">
                            <input
                              type={cf.tipo === 'numero' ? 'number' : cf.tipo === 'data' ? 'date' : 'text'}
                              value={inlineDraft.camposExtras?.[cf.id] || ''}
                              onChange={(e) =>
                                setInlineDraft({
                                  ...inlineDraft,
                                  camposExtras: {
                                    ...(inlineDraft.camposExtras || {}),
                                    [cf.id]: e.target.value,
                                  },
                                })
                              }
                              className="w-28 px-2 py-1 border border-blue-300 rounded text-xs bg-white"
                            />
                          </td>
                        ))}
                        <td className="py-2 px-2">
                          <select
                            value={inlineDraft.status}
                            onChange={(e) =>
                              setInlineDraft({
                                ...inlineDraft,
                                status: e.target.value as 'Conciliado' | 'Pendente',
                              })
                            }
                            className="px-2 py-1 border border-blue-300 rounded text-xs bg-white"
                          >
                            <option value="Conciliado">Conciliado</option>
                            <option value="Pendente">Pendente</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={inlineDraft.valor}
                            onChange={(e) =>
                              setInlineDraft({ ...inlineDraft, valor: parseFloat(e.target.value) || 0 })
                            }
                            className="w-24 px-2 py-1 border border-blue-300 rounded text-xs bg-white text-right font-mono font-bold"
                          />
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <button
                            onClick={saveInlineEdit}
                            className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 mr-1"
                            title="Salvar edição na linha"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setInlineEditId(null);
                              setInlineDraft(null);
                            }}
                            className="p-1.5 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={entry.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(entry.id)}
                          onChange={() => toggleSelectOne(entry.id)}
                          className="rounded border-neutral-300"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-neutral-600 whitespace-nowrap">
                        {entry.data.split('-').reverse().join('/')}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[11px] font-bold uppercase ${
                            entry.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {entry.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-neutral-900 block max-w-[240px] truncate">
                          {entry.descricao}
                        </span>
                        {(entry.documento || entry.observacoes) && (
                          <span className="text-[10px] text-neutral-500 block max-w-[240px] truncate">
                            {[entry.documento ? `Doc: ${entry.documento}` : '', entry.observacoes]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-neutral-800 block max-w-[180px] truncate">
                          {entry.contaNome}
                        </span>
                        <span className="text-[10px] text-neutral-400 block truncate">{entry.grupo}</span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 whitespace-nowrap">
                        <span className="font-medium text-neutral-800 block">{entry.banco}</span>
                        <span className="text-[10px] text-neutral-400">
                          {entry.formaPagamento || (entry.origem === 'extrato' ? 'EXTRATO' : 'MANUAL')}
                        </span>
                      </td>
                      {activeCustomFields.map((cf) => (
                        <td key={cf.id} className="py-2.5 px-3 text-neutral-700 max-w-[140px] truncate">
                          {entry.camposExtras?.[cf.id] || '—'}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {entry.status === 'Conciliado' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Conciliado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                            <Clock className="w-3.5 h-3.5" /> Pendente
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                          entry.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {entry.tipo === 'receita' ? '+' : '-'}
                        {formatCurrency(entry.valor)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => startInlineEdit(entry)}
                            title="Edição rápida na linha"
                            className="p-1.5 text-neutral-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditEntryModal(entry)}
                            title="Editar todos os campos no formulário"
                            className="px-1.5 py-1 text-[10px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors"
                          >
                            Abrir
                          </button>
                          <button
                            onClick={() => setEntryToDelete(entry)}
                            title="Apagar lançamento"
                            className="p-1.5 text-neutral-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredEntries.length === 0 && (
              <div className="py-12 text-center space-y-3">
                <Wallet className="w-8 h-8 text-neutral-300 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-700">
                    Nenhuma movimentação encontrada neste filtro
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Importe seu extrato bancário, carregue o modelo editável ou registre manualmente receitas e despesas.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => setSubTab('extrato')}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800"
                  >
                    Importar Extrato / Modelo
                  </button>
                  <button
                    onClick={() => openNewEntryModal('despesa')}
                    className="px-3.5 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 rounded-lg hover:bg-neutral-200"
                  >
                    + Lançamento Manual
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-ABA 2: EXTRATO BANCÁRIO (UPLOAD, COLAR, MODELO EDITÁVEL)         */}
      {/* ===================================================================== */}
      {subTab === 'extrato' && (
        <div className="space-y-5">
          {/* Painel de Alimentação do Extrato */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cartão 1: Upload de Arquivo OFX / CSV / Excel + Baixar Modelo */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-neutral-950 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  1. Enviar Extrato do Banco ou Planilha
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Aceita arquivos <strong>.OFX / .QFX</strong> (Sicredi, Itaú, BB, Nubank, Bradesco, Caixa), <strong>.CSV / .TXT</strong> e <strong>.XLSX / .XLS</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700">
                      Conta Bancária de Destino *
                    </label>
                    <button
                      type="button"
                      onClick={() => openNewBankModal(false)}
                      className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Nova Conta
                    </button>
                  </div>
                  <select
                    value={selectedExtratoBankId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedExtratoBankId(val);
                      if (val !== '__custom__') {
                        const found = bankAccounts.find((b) => b.id === val);
                        if (found) setBankDefaultName(found.nome);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome} ({b.banco})
                      </option>
                    ))}
                    <option value="__custom__">-- OUTRO BANCO (DIGITAR) --</option>
                  </select>
                  {selectedExtratoBankId === '__custom__' && (
                    <input
                      type="text"
                      value={bankDefaultName}
                      onChange={(e) => setBankDefaultName(e.target.value.toUpperCase())}
                      placeholder="DIGITE O NOME DO BANCO..."
                      className="mt-2 w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-xl bg-white uppercase font-semibold"
                    />
                  )}
                </div>
                <div className="flex items-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ofx,.qfx,.csv,.txt,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    Selecionar Arquivo do Extrato
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadEditableModel}
                  className="px-3 py-2 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Carregar Modelo Editável na Tela
                </button>
                <button
                  type="button"
                  onClick={() => downloadStatementTemplateExcel(customFields)}
                  className="px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Planilha Modelo (.xlsx)
                </button>
              </div>
            </div>

            {/* Cartão 2: Colar Extrato em Texto */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div>
                <h2 className="text-sm font-bold text-neutral-950 flex items-center gap-2">
                  <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                  2. Colar Linhas do Extrato ou Planilha
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Copie do internet banking, Excel ou bloco de notas (ex: <code className="font-mono bg-neutral-100 px-1 rounded">18/11/2026; PIX RECEBIDO; 250,00</code>) e cole abaixo:
                </p>
              </div>

              <textarea
                rows={4}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={'18/11/2026; RECEBIMENTO PIX FROTA; 850,00\n18/11/2026; COMPRA SHAMPOO AUTOMOTIVO; -180,00'}
                className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-neutral-50"
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-neutral-500">
                  Valores negativos (-) entram como Despesa; positivos como Receita.
                </span>
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={!pastedText.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 rounded-xl transition-colors shrink-0"
                >
                  Processar Texto
                </button>
              </div>
            </div>
          </div>

          {/* Área de Análise Linha a Linha e Edição Completa antes de Lançar */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-bold text-neutral-950">
                  Análise &amp; Classificação do Extrato ({stagingRows.length} linhas)
                </h3>
                <p className="text-xs text-neutral-500">
                  Cada linha é analisada para sugerir o Plano de Contas correspondente. Confira ou informe a conta de lançamento antes de salvar.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {stagingRows.length > 0 && (
                  <button
                    type="button"
                    onClick={handleReanalyzeAllStaging}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 whitespace-nowrap"
                    title="Reanalisar linhas com base no Plano de Contas e histórico"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reanalisar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openNewAccountModal('despesa')}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg flex items-center gap-1 whitespace-nowrap"
                  title="Criar uma nova conta no Plano de Contas sem perder as linhas do extrato"
                >
                  <Plus className="w-3.5 h-3.5" /> Nova Conta no Plano
                </button>
                <button
                  type="button"
                  onClick={handleAddEmptyStagingRow}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Linha
                </button>
                {stagingRows.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStagingRows([])}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg whitespace-nowrap"
                    >
                      Limpar Lista
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitStagingRows}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Confirmar e Lançar ({stagingRows.length})
                    </button>
                  </>
                )}
              </div>
            </div>

            {stagingRows.length > 0 && (
              <div className="space-y-3">
                {/* Resumo da Análise Automática */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-neutral-500 block">Linhas no Extrato</span>
                    <span className="text-base font-black font-mono tabular-nums text-neutral-950">
                      {stagingStats.total}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                      Plano de Contas Definido
                    </span>
                    <span className="text-base font-black font-mono tabular-nums text-emerald-800">
                      {stagingStats.classificadas} / {stagingStats.total}
                    </span>
                  </div>
                  <div
                    className={`p-3 border rounded-xl ${
                      stagingStats.pendentes > 0
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase block">
                      Sem Plano de Contas
                    </span>
                    <span className="text-base font-black font-mono tabular-nums">
                      {stagingStats.pendentes === 0 ? '0 (Tudo pronto)' : `${stagingStats.pendentes} pendente(s)`}
                    </span>
                  </div>
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-neutral-500 block">Totais do Lote</span>
                    <div className="font-mono font-bold tabular-nums text-[11px] flex items-center gap-2 mt-0.5">
                      <span className="text-emerald-700">+{formatCurrency(stagingStats.totalReceitas)}</span>
                      <span className="text-rose-700">-{formatCurrency(stagingStats.totalDespesas)}</span>
                    </div>
                  </div>
                </div>

                {/* Filtros da Análise + Classificação em Lote */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 text-xs">
                  <div className="flex flex-wrap items-center gap-1 bg-neutral-200/70 p-1 rounded-lg">
                    {[
                      { id: 'todas', label: `Todas (${stagingStats.total})` },
                      { id: 'pendentes', label: `Sem Conta (${stagingStats.pendentes})` },
                      { id: 'classificadas', label: `Classificadas (${stagingStats.classificadas})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStagingFilter(f.id as any)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                          stagingFilter === f.id
                            ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                            : 'text-neutral-600 hover:text-neutral-950'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-neutral-700">Definir conta em lote:</span>
                    <select
                      value={stagingBulkContaId}
                      onChange={(e) => setStagingBulkContaId(e.target.value)}
                      className="px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white text-xs max-w-[240px]"
                    >
                      <option value="">-- Escolha uma conta --</option>
                      {accountsPlan.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.tipo === 'receita' ? '[RECEITA]' : '[DESPESA]'} {a.codigo} · {a.nome}
                        </option>
                      ))}
                    </select>
                    {stagingStats.pendentes > 0 && (
                      <button
                        type="button"
                        onClick={() => handleApplyStagingBulkAccount(true)}
                        disabled={!stagingBulkContaId}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold disabled:opacity-40 whitespace-nowrap"
                      >
                        Aplicar às Pendentes ({stagingStats.pendentes})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApplyStagingBulkAccount(false)}
                      disabled={!stagingBulkContaId}
                      className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg font-semibold disabled:opacity-40 whitespace-nowrap"
                    >
                      Aplicar a Todas
                    </button>
                  </div>
                </div>
              </div>
            )}

            {stagingRows.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-neutral-500">
                <FileSpreadsheet className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs font-semibold text-neutral-700">
                  Nenhuma linha na fila de importação
                </p>
                <p className="text-[11px] text-neutral-400">
                  Envie um arquivo de extrato acima, cole texto ou clique em &ldquo;Carregar Modelo Editável na Tela&rdquo; para começar.
                </p>
              </div>
            ) : (
              <>
                {/* Cards Mobile Editáveis para Extrato */}
                <div className="block md:hidden space-y-3">
                  {visibleStagingRows.length === 0 && (
                    <div className="py-6 text-center text-xs text-neutral-500 border border-dashed border-neutral-300 rounded-xl">
                      Nenhuma linha nesta visualização ({stagingFilter === 'pendentes' ? 'Sem Conta' : 'Classificadas'}).
                    </div>
                  )}
                  {visibleStagingRows.map((row) => {
                    const isMissingAccount = !row.contaId;
                    return (
                    <div
                      key={row.tempId}
                      className={`p-3 border rounded-xl space-y-2 text-xs ${
                        isMissingAccount
                          ? 'bg-amber-50/50 border-amber-300'
                          : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="date"
                          value={row.data}
                          onChange={(e) => updateStagingRow(row.tempId, { data: e.target.value })}
                          className="px-2 py-1 border border-neutral-300 rounded bg-white font-mono text-xs"
                        />
                        <select
                          value={row.tipo}
                          onChange={(e) => {
                            const nextTipo = e.target.value as AccountPlanType;
                            const analysis = analyzeStatementLineAccount(row.descricao, nextTipo, accountsPlan, entries);
                            updateStagingRow(row.tempId, {
                              tipo: nextTipo,
                              contaId: analysis.account?.id || '',
                              contaNome: analysis.account?.nome || '',
                              grupo: analysis.account?.grupo || '',
                              analysisStatus: analysis.status,
                              analysisReason: analysis.reason,
                            });
                          }}
                          className={`px-2 py-1 border rounded font-bold text-xs ${
                            row.tipo === 'receita'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-rose-300 bg-rose-50 text-rose-800'
                          }`}
                        >
                          <option value="receita">Receita</option>
                          <option value="despesa">Despesa</option>
                        </select>
                        <button
                          onClick={() => setStagingRows((prev) => prev.filter((r) => r.tempId !== row.tempId))}
                          className="p-1 text-rose-600 hover:bg-rose-100 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={row.descricao}
                        placeholder="Descrição..."
                        onChange={(e) => updateStagingRow(row.tempId, { descricao: e.target.value.toUpperCase() })}
                        onBlur={() => handleAnalyzeSingleRow(row.tempId)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded bg-white font-semibold uppercase"
                      />

                      <div className="space-y-1">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={row.contaId}
                            onChange={(e) => updateStagingRow(row.tempId, { contaId: e.target.value })}
                            className={`px-2 py-1.5 border rounded bg-white text-xs font-medium ${
                              isMissingAccount ? 'border-amber-400 text-amber-900' : 'border-neutral-300'
                            }`}
                          >
                            <option value="">-- Informe o Plano de Contas * --</option>
                            {accountsPlan
                              .filter((a) => a.tipo === row.tipo)
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.codigo} · {a.nome}
                                </option>
                              ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            value={row.valor}
                            onChange={(e) => updateStagingRow(row.tempId, { valor: parseFloat(e.target.value) || 0 })}
                            className="px-2.5 py-1.5 border border-neutral-300 rounded bg-white font-mono font-bold text-right"
                          />
                        </div>
                        <div
                          className={`text-[10px] flex items-center gap-1 ${
                            isMissingAccount
                              ? 'text-amber-800 font-semibold'
                              : row.analysisStatus === 'historico'
                              ? 'text-blue-700 font-medium'
                              : row.analysisStatus === 'regra' || row.analysisStatus === 'explicit'
                              ? 'text-emerald-700 font-medium'
                              : 'text-neutral-500'
                          }`}
                        >
                          {isMissingAccount ? (
                            <AlertCircle className="w-3 h-3 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                          )}
                          <span className="truncate">
                            {row.analysisReason || (isMissingAccount ? 'Selecione em qual conta lançar' : 'Plano de Contas informado')}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={row.bancoId || ''}
                          onChange={(e) => {
                            const b = bankAccounts.find((x) => x.id === e.target.value);
                            updateStagingRow(row.tempId, {
                              bancoId: b ? b.id : '',
                              banco: b ? b.nome : row.banco,
                            });
                          }}
                          className="px-2 py-1 border border-neutral-300 rounded bg-white uppercase text-xs"
                        >
                          {!row.bancoId && <option value="">{row.banco || '-- Banco --'}</option>}
                          {bankAccounts.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nome}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={row.documento}
                          placeholder="Documento"
                          onChange={(e) => updateStagingRow(row.tempId, { documento: e.target.value.toUpperCase() })}
                          className="px-2 py-1 border border-neutral-300 rounded bg-white uppercase"
                        />
                      </div>
                    </div>
                  );
                  })}
                </div>

                {/* Tabela Desktop Planilha Totalmente Editável */}
                <div className="hidden md:block border border-neutral-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                      <tr>
                        <th className="py-2 px-2 font-semibold">Data</th>
                        <th className="py-2 px-2 font-semibold">Tipo</th>
                        <th className="py-2 px-2 font-semibold">Descrição / Histórico</th>
                        <th className="py-2 px-2 font-semibold">Plano de Contas a Lançar *</th>
                        <th className="py-2 px-2 font-semibold">Valor (R$)</th>
                        <th className="py-2 px-2 font-semibold">Banco</th>
                        <th className="py-2 px-2 font-semibold">Documento</th>
                        {activeCustomFields.map((cf) => (
                          <th key={cf.id} className="py-2 px-2 font-semibold whitespace-nowrap">
                            {cf.nome}
                          </th>
                        ))}
                        <th className="py-2 px-2 font-semibold">Status</th>
                        <th className="py-2 px-2 font-semibold text-center">Apagar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {visibleStagingRows.map((row) => {
                        const isMissingAccount = !row.contaId;
                        return (
                        <tr
                          key={row.tempId}
                          className={isMissingAccount ? 'bg-amber-50/50 hover:bg-amber-50/80' : 'hover:bg-neutral-50'}
                        >
                          <td className="py-1.5 px-2">
                            <input
                              type="date"
                              value={row.data}
                              onChange={(e) => updateStagingRow(row.tempId, { data: e.target.value })}
                              className="px-2 py-1 border border-neutral-300 rounded bg-white font-mono text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <select
                              value={row.tipo}
                              onChange={(e) => {
                                const nextTipo = e.target.value as AccountPlanType;
                                const analysis = analyzeStatementLineAccount(row.descricao, nextTipo, accountsPlan, entries);
                                updateStagingRow(row.tempId, {
                                  tipo: nextTipo,
                                  contaId: analysis.account?.id || '',
                                  contaNome: analysis.account?.nome || '',
                                  grupo: analysis.account?.grupo || '',
                                  analysisStatus: analysis.status,
                                  analysisReason: analysis.reason,
                                });
                              }}
                              className={`px-2 py-1 border rounded text-xs font-bold ${
                                row.tipo === 'receita'
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  : 'border-rose-300 bg-rose-50 text-rose-800'
                              }`}
                            >
                              <option value="receita">Receita</option>
                              <option value="despesa">Despesa</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={row.descricao}
                              placeholder="DESCRIÇÃO..."
                              onChange={(e) =>
                                updateStagingRow(row.tempId, { descricao: e.target.value.toUpperCase() })
                              }
                              onBlur={() => handleAnalyzeSingleRow(row.tempId)}
                              className="w-full min-w-[180px] px-2 py-1 border border-neutral-300 rounded bg-white uppercase"
                            />
                          </td>
                          <td className="py-1.5 px-2 min-w-[230px]">
                            <select
                              value={row.contaId}
                              onChange={(e) => updateStagingRow(row.tempId, { contaId: e.target.value })}
                              className={`w-full px-2 py-1 border rounded text-xs font-medium ${
                                isMissingAccount
                                  ? 'border-amber-400 bg-amber-50 text-amber-950 font-semibold'
                                  : 'border-neutral-300 bg-white'
                              }`}
                            >
                              <option value="">-- Informe o Plano de Contas * --</option>
                              {accountsPlan.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.tipo === 'receita' ? '[REC]' : '[DESP]'} {a.codigo} · {a.nome}
                                </option>
                              ))}
                            </select>
                            <div
                              className={`mt-1 text-[10px] flex items-center gap-1 leading-tight ${
                                isMissingAccount
                                  ? 'text-amber-800 font-semibold'
                                  : row.analysisStatus === 'historico'
                                  ? 'text-blue-700 font-medium'
                                  : row.analysisStatus === 'regra' || row.analysisStatus === 'explicit'
                                  ? 'text-emerald-700 font-medium'
                                  : 'text-neutral-500'
                              }`}
                            >
                              {isMissingAccount ? (
                                <AlertCircle className="w-3 h-3 shrink-0" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                              )}
                              <span className="truncate max-w-[220px]" title={row.analysisReason || ''}>
                                {row.analysisReason || (isMissingAccount ? 'Informe em qual conta lançar' : 'Conta informada')}
                              </span>
                            </div>
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={row.valor}
                              onChange={(e) =>
                                updateStagingRow(row.tempId, { valor: parseFloat(e.target.value) || 0 })
                              }
                              className="w-24 px-2 py-1 border border-neutral-300 rounded bg-white font-mono font-bold text-right"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <select
                              value={row.bancoId || ''}
                              onChange={(e) => {
                                const b = bankAccounts.find((x) => x.id === e.target.value);
                                updateStagingRow(row.tempId, {
                                  bancoId: b ? b.id : '',
                                  banco: b ? b.nome : row.banco,
                                });
                              }}
                              className="w-32 px-2 py-1 border border-neutral-300 rounded bg-white uppercase text-xs"
                            >
                              {!row.bancoId && <option value="">{row.banco || '-- Banco --'}</option>}
                              {bankAccounts.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.nome}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={row.documento}
                              onChange={(e) =>
                                updateStagingRow(row.tempId, { documento: e.target.value.toUpperCase() })
                              }
                              className="w-24 px-2 py-1 border border-neutral-300 rounded bg-white uppercase"
                            />
                          </td>
                          {activeCustomFields.map((cf) => (
                            <td key={cf.id} className="py-1.5 px-2">
                              <input
                                type={cf.tipo === 'numero' ? 'number' : cf.tipo === 'data' ? 'date' : 'text'}
                                value={row.camposExtras?.[cf.id] || ''}
                                onChange={(e) =>
                                  updateStagingRow(row.tempId, {
                                    camposExtras: {
                                      ...(row.camposExtras || {}),
                                      [cf.id]: e.target.value,
                                    },
                                  })
                                }
                                className="w-28 px-2 py-1 border border-neutral-300 rounded bg-white"
                              />
                            </td>
                          ))}
                          <td className="py-1.5 px-2">
                            <select
                              value={row.status}
                              onChange={(e) =>
                                updateStagingRow(row.tempId, {
                                  status: e.target.value as 'Conciliado' | 'Pendente',
                                })
                              }
                              className="px-2 py-1 border border-neutral-300 rounded bg-white text-xs"
                            >
                              <option value="Conciliado">Conciliado</option>
                              <option value="Pendente">Pendente</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setStagingRows((prev) => prev.filter((r) => r.tempId !== row.tempId))
                              }
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              title="Remover linha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                      {visibleStagingRows.length === 0 && (
                        <tr>
                          <td colSpan={9 + activeCustomFields.length} className="py-6 text-center text-xs text-neutral-500">
                            Nenhuma linha nesta visualização ({stagingFilter === 'pendentes' ? 'Sem Conta' : 'Classificadas'}).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-ABA 3: CONTAS BANCÁRIAS E CAIXA (CADASTRO & SALDO REAL)           */}
      {/* ===================================================================== */}
      {subTab === 'bancos' && (
        <div className="space-y-4">
          {/* KPI Consolidado de Bancos e Caixas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                Saldo Atual Consolidado (Conciliado)
              </span>
              <span
                className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${
                  consolidatedBankTotals.saldoAtualTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatCurrency(consolidatedBankTotals.saldoAtualTotal)}
              </span>
              <span className="text-[11px] text-neutral-400 block mt-0.5">
                Soma do saldo inicial + lançamentos conciliados
              </span>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                Saldo Previsto (Com Pendentes)
              </span>
              <span
                className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${
                  consolidatedBankTotals.saldoPrevistoTotal >= 0 ? 'text-neutral-950' : 'text-rose-700'
                }`}
              >
                {formatCurrency(consolidatedBankTotals.saldoPrevistoTotal)}
              </span>
              <span className="text-[11px] text-neutral-400 block mt-0.5">
                Projeção considerando contas a pagar e receber
              </span>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                Contas Bancárias & Caixas
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-neutral-950">
                {consolidatedBankTotals.ativas}{' '}
                <span className="text-xs font-normal text-neutral-400">/ {bankAccounts.length} cadastradas</span>
              </span>
              <span className="text-[11px] text-neutral-400 block mt-0.5">
                Prontas para lançamentos e importação de extratos
              </span>
            </div>
          </div>

          {/* Barra de Controle das Contas Bancárias */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar banco, conta, agência ou PIX..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
                {[
                  { id: 'todas', label: 'Todas' },
                  { id: 'ativas', label: 'Ativas' },
                  { id: 'inativas', label: 'Inativas' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setBankFilterStatus(f.id as any)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      bankFilterStatus === f.id
                        ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onRestoreDefaultBankAccounts && (
                <button
                  type="button"
                  onClick={onRestoreDefaultBankAccounts}
                  className="px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Contas Padrão
                </button>
              )}
              <button
                type="button"
                onClick={() => openNewBankModal(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Nova Conta Bancária
              </button>
            </div>
          </div>

          {/* Lista de Contas Bancárias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBankAccounts.map((bank) => {
              const bal = bankBalancesMap.get(bank.id) || {
                entradasConciliadas: 0,
                saidasConciliadas: 0,
                entradasPendentes: 0,
                saidasPendentes: 0,
                saldoAtual: bank.saldoInicial,
                saldoPrevisto: bank.saldoInicial,
                count: 0,
              };
              const hasPending = bal.entradasPendentes > 0 || bal.saidasPendentes > 0;
              return (
                <div
                  key={bank.id}
                  className={`bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-4 ${
                    !bank.ativo ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-neutral-100 text-neutral-800 rounded-lg shrink-0">
                          <Landmark className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-neutral-950 truncate">{bank.nome}</h3>
                          <span className="text-[11px] text-neutral-500 block truncate">
                            {bank.banco} · {bank.tipoConta}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500 font-mono pt-1">
                        {(bank.agencia || bank.numeroConta) && (
                          <span>
                            Ag: <strong>{bank.agencia || '—'}</strong> · Conta: <strong>{bank.numeroConta || '—'}</strong>
                          </span>
                        )}
                        {bank.chavePix && (
                          <span className="truncate max-w-[230px]">
                            PIX: <strong>{bank.chavePix}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSaveBankAccount({ ...bank, ativo: !bank.ativo })}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors shrink-0 whitespace-nowrap ${
                        bank.ativo
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-neutral-500 bg-neutral-100 hover:bg-neutral-200'
                      }`}
                    >
                      {bank.ativo ? 'Ativa' : 'Inativa'}
                    </button>
                  </div>

                  {/* Balanço da Conta */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-neutral-100 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase block">Saldo Inicial</span>
                      <span className="font-mono font-semibold tabular-nums text-neutral-800">
                        {formatCurrency(bank.saldoInicial)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase block">Entradas ({bal.count})</span>
                      <span className="font-mono font-semibold tabular-nums text-emerald-700">
                        +{formatCurrency(bal.entradasConciliadas)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase block">Saídas</span>
                      <span className="font-mono font-semibold tabular-nums text-rose-700">
                        -{formatCurrency(bal.saidasConciliadas)}
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-[10px] text-neutral-500 font-bold uppercase block">Saldo Atual</span>
                      <span
                        className={`font-mono font-black tabular-nums text-sm ${
                          bal.saldoAtual >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatCurrency(bal.saldoAtual)}
                      </span>
                    </div>
                  </div>

                  {(hasPending || bank.observacoes) && (
                    <div className="text-[11px] text-neutral-500 flex flex-wrap items-center justify-between gap-2 bg-neutral-50 px-3 py-1.5 rounded-xl">
                      {hasPending ? (
                        <span>
                          Previsto (c/ pendentes):{' '}
                          <strong className="font-mono tabular-nums text-neutral-800">
                            {formatCurrency(bal.saldoPrevisto)}
                          </strong>
                        </span>
                      ) : (
                        <span className="truncate">{bank.observacoes}</span>
                      )}
                      {bank.dataSaldoInicial && (
                        <span className="text-[10px] font-mono text-neutral-400">
                          Base: {bank.dataSaldoInicial.split('-').reverse().join('/')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Ações Rápidas */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterBanco(`bank:${bank.id}`);
                          setSubTab('movimentacoes');
                        }}
                        className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg font-semibold flex items-center gap-1 whitespace-nowrap"
                      >
                        Movimentações <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExtratoBankId(bank.id);
                          setBankDefaultName(bank.nome);
                          setSubTab('extrato');
                        }}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg font-semibold flex items-center gap-1 whitespace-nowrap"
                      >
                        <Upload className="w-3 h-3" /> Importar Extrato
                      </button>
                      <button
                        type="button"
                        onClick={() => openNewEntryModal('despesa', bank)}
                        className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-semibold flex items-center gap-1 whitespace-nowrap"
                      >
                        <Plus className="w-3 h-3 text-emerald-400" /> Lançar
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditBankModal(bank)}
                        className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                        title="Editar conta bancária"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBankToDelete(bank)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Excluir conta bancária"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredBankAccounts.length === 0 && (
              <div className="md:col-span-2 bg-white border border-neutral-200 rounded-2xl p-10 text-center space-y-3">
                <Landmark className="w-8 h-8 text-neutral-300 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-800">Nenhuma conta bancária encontrada</p>
                  <p className="text-[11px] text-neutral-500">
                    Cadastre seus bancos (Sicredi, Itaú, BB, Nubank) e caixas internos para controlar saldos e vincular extratos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openNewBankModal(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" /> Criar Primeira Conta Bancária
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-ABA 4: PLANO DE CONTAS (TABELA INLINE TOTALMENTE EDITÁVEL)        */}
      {/* ===================================================================== */}
      {subTab === 'plano' && (
        <div className="space-y-4">
          {/* Toolbar de Busca, Filtro, Importação e Exportação */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar por código, nome, grupo ou descrição..."
                    value={planSearch}
                    onChange={(e) => setPlanSearch(e.target.value)}
                    className="w-full text-xs bg-transparent focus:outline-none"
                  />
                  {planSearch && (
                    <button onClick={() => setPlanSearch('')} className="text-neutral-400 hover:text-neutral-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
                  {[
                    { id: 'todos', label: 'Todas' },
                    { id: 'receita', label: 'Receitas' },
                    { id: 'despesa', label: 'Despesas' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setPlanFilterTipo(t.id as any)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                        planFilterTipo === t.id
                          ? 'bg-white text-neutral-950 font-bold shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={planFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  onChange={handlePlanFileUpload}
                  className="hidden"
                />
                {onRestoreDefaultAccounts && (
                  <button
                    type="button"
                    onClick={onRestoreDefaultAccounts}
                    className="px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    title="Restaurar contas padrão que não estejam cadastradas"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Modelo Padrão
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => planFileInputRef.current?.click()}
                  className="px-3 py-2 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  title="Importar Plano de Contas em Excel (.xlsx) ou CSV"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar Excel
                </button>
                <button
                  type="button"
                  onClick={() => exportAccountsPlanToExcel(filteredPlanAccounts)}
                  disabled={filteredPlanAccounts.length === 0}
                  className="px-3 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar Excel
                </button>
                <button
                  type="button"
                  onClick={() => openNewAccountModal('receita')}
                  className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Receita
                </button>
                <button
                  type="button"
                  onClick={() => openNewAccountModal('despesa')}
                  className="px-3 py-2 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Despesa
                </button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500">
              Edite qualquer célula diretamente na tabela abaixo (Código, Tipo, Grupo, Nome da Conta, Descrição ou Status) — as alterações são salvas automaticamente ao sair da linha ou pelo botão Salvar.
            </p>
          </div>

          {/* Banner de Alterações Pendentes */}
          {dirtyPlanIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-950 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold">
                {dirtyPlanIds.length} conta(s) com edições em andamento.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const reset: Record<string, AccountPlanItem> = {};
                    accountsPlan.forEach((a) => {
                      reset[a.id] = { ...a };
                    });
                    setPlanDrafts(reset);
                    setDirtyPlanIds([]);
                  }}
                  className="px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-100 rounded-lg font-semibold text-blue-900"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={commitAllPlanDrafts}
                  className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Alterações ({dirtyPlanIds.length})
                </button>
              </div>
            </div>
          )}

          {/* Barra de Ações em Lote no Plano de Contas */}
          {selectedPlanIds.length > 0 && (
            <div className="bg-neutral-900 text-white rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
              <span className="font-bold">
                {selectedPlanIds.length} conta(s) selecionada(s)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idSet = new Set(selectedPlanIds);
                    const updated = accountsPlan
                      .filter((a) => idSet.has(a.id))
                      .map((a) => ({ ...(planDrafts[a.id] || a), ativo: true }));
                    if (onSaveAccountsBatch) onSaveAccountsBatch(updated);
                    else updated.forEach((a) => onSaveAccount(a));
                    setSelectedPlanIds([]);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold"
                >
                  Ativar Selecionadas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idSet = new Set(selectedPlanIds);
                    const updated = accountsPlan
                      .filter((a) => idSet.has(a.id))
                      .map((a) => ({ ...(planDrafts[a.id] || a), ativo: false }));
                    if (onSaveAccountsBatch) onSaveAccountsBatch(updated);
                    else updated.forEach((a) => onSaveAccount(a));
                    setSelectedPlanIds([]);
                  }}
                  className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-semibold"
                >
                  Inativar Selecionadas
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmPlanBulkDelete(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Selecionadas
                </button>
              </div>
            </div>
          )}

          {/* Barra de Criação Rápida Inline */}
          <form
            onSubmit={handleQuickAddAccount}
            className="bg-white border border-neutral-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                + Adicionar Nova Conta Direto na Planilha
              </span>
              <span className="text-[10px] text-neutral-400 hidden sm:inline">
                Deixe o código em branco para gerar automaticamente (ex: 1.04 / 2.08)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2">
              <input
                type="text"
                value={quickNewAccount.codigo}
                onChange={(e) => setQuickNewAccount({ ...quickNewAccount, codigo: e.target.value.toUpperCase() })}
                placeholder="Código (Auto)"
                className="lg:col-span-1 px-2.5 py-2 border border-neutral-300 rounded-xl font-mono uppercase bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <select
                value={quickNewAccount.tipo}
                onChange={(e) => {
                  const t = e.target.value as AccountPlanType;
                  setQuickNewAccount({
                    ...quickNewAccount,
                    tipo: t,
                    grupo: t === 'receita' ? 'RECEITAS OPERACIONAIS' : 'DESPESAS OPERACIONAIS',
                  });
                }}
                className={`lg:col-span-2 px-2.5 py-2 border rounded-xl font-bold focus:outline-none ${
                  quickNewAccount.tipo === 'receita'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-rose-300 bg-rose-50 text-rose-800'
                }`}
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
              <input
                type="text"
                list="plan-groups-datalist"
                value={quickNewAccount.grupo}
                onChange={(e) => setQuickNewAccount({ ...quickNewAccount, grupo: e.target.value.toUpperCase() })}
                placeholder="Grupo / Categoria"
                className="lg:col-span-2 px-2.5 py-2 border border-neutral-300 rounded-xl uppercase bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <input
                type="text"
                required
                value={quickNewAccount.nome}
                onChange={(e) => setQuickNewAccount({ ...quickNewAccount, nome: e.target.value.toUpperCase() })}
                placeholder="Nome da Conta * (Ex: PRODUTOS QUÍMICOS)"
                className="lg:col-span-3 px-2.5 py-2 border border-neutral-300 rounded-xl uppercase font-semibold bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <input
                type="text"
                value={quickNewAccount.descricao}
                onChange={(e) => setQuickNewAccount({ ...quickNewAccount, descricao: e.target.value })}
                placeholder="Descrição / Observação (opcional)"
                className="lg:col-span-2 px-2.5 py-2 border border-neutral-300 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <button
                type="submit"
                className="lg:col-span-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Adicionar Conta
              </button>
            </div>
          </form>

          {/* Visualização Celular: Cards Diretamente Editáveis */}
          <div className="block md:hidden space-y-3">
            {filteredPlanAccounts.map((acc) => {
              const draft = planDrafts[acc.id] || acc;
              const isDirty = dirtyPlanIds.includes(acc.id);
              const stats = accountTotalsMap.get(acc.id) || accountTotalsMap.get(acc.nome) || { total: 0, count: 0 };
              return (
                <div
                  key={acc.id}
                  onBlur={(e) => {
                    if (isDirty && !e.currentTarget.contains(e.relatedTarget as Node)) {
                      commitPlanDraftRow(acc.id);
                    }
                  }}
                  className={`bg-white border rounded-xl p-3.5 shadow-2xs space-y-2.5 text-xs ${
                    isDirty ? 'border-blue-400 bg-blue-50/20' : 'border-neutral-200'
                  } ${!draft.ativo ? 'opacity-65' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPlanIds.includes(acc.id)}
                        onChange={() =>
                          setSelectedPlanIds((prev) =>
                            prev.includes(acc.id) ? prev.filter((x) => x !== acc.id) : [...prev, acc.id]
                          )
                        }
                        className="rounded border-neutral-300"
                      />
                      <input
                        type="text"
                        value={draft.codigo}
                        onChange={(e) => updatePlanDraft(acc.id, { codigo: e.target.value.toUpperCase() })}
                        className="w-16 px-2 py-1 border border-neutral-300 rounded-lg font-mono font-bold uppercase bg-white"
                      />
                      <select
                        value={draft.tipo}
                        onChange={(e) => updatePlanDraft(acc.id, { tipo: e.target.value as AccountPlanType })}
                        className={`px-2 py-1 border rounded-lg font-bold ${
                          draft.tipo === 'receita'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-rose-300 bg-rose-50 text-rose-800'
                        }`}
                      >
                        <option value="receita">Receita</option>
                        <option value="despesa">Despesa</option>
                      </select>
                    </div>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        draft.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatCurrency(stats.total)}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={draft.nome}
                    onChange={(e) => updatePlanDraft(acc.id, { nome: e.target.value.toUpperCase() })}
                    placeholder="Nome da Conta *"
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg font-bold uppercase bg-white"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      list="plan-groups-datalist"
                      value={draft.grupo}
                      onChange={(e) => updatePlanDraft(acc.id, { grupo: e.target.value.toUpperCase() })}
                      placeholder="Grupo"
                      className="px-2.5 py-1.5 border border-neutral-300 rounded-lg uppercase bg-white"
                    />
                    <input
                      type="text"
                      value={draft.descricao || ''}
                      onChange={(e) => updatePlanDraft(acc.id, { descricao: e.target.value })}
                      placeholder="Descrição..."
                      className="px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...draft, ativo: !draft.ativo };
                        updatePlanDraft(acc.id, { ativo: !draft.ativo });
                        onSaveAccount(updated);
                        setDirtyPlanIds((prev) => prev.filter((x) => x !== acc.id));
                      }}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                        draft.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {draft.ativo ? 'Ativa' : 'Inativa'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      {isDirty && (
                        <button
                          type="button"
                          onClick={() => commitPlanDraftRow(acc.id)}
                          className="px-2.5 py-1 bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Salvar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDuplicateAccount(acc)}
                        className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                        title="Duplicar conta"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountToDelete(acc)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Excluir conta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabela Planilha Desktop: Edição Direta em Todas as Células */}
          <div className="hidden md:block bg-white border border-neutral-200 rounded-2xl overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        filteredPlanAccounts.length > 0 &&
                        selectedPlanIds.length === filteredPlanAccounts.length
                      }
                      onChange={() => {
                        if (selectedPlanIds.length === filteredPlanAccounts.length) {
                          setSelectedPlanIds([]);
                        } else {
                          setSelectedPlanIds(filteredPlanAccounts.map((a) => a.id));
                        }
                      }}
                      className="rounded border-neutral-300"
                    />
                  </th>
                  <th className="py-2.5 px-2 font-semibold w-24">Código</th>
                  <th className="py-2.5 px-2 font-semibold w-28">Tipo</th>
                  <th className="py-2.5 px-2 font-semibold w-44">Grupo / Categoria</th>
                  <th className="py-2.5 px-2 font-semibold min-w-[200px]">Nome da Conta</th>
                  <th className="py-2.5 px-2 font-semibold min-w-[180px]">Descrição</th>
                  <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Movimentado</th>
                  <th className="py-2.5 px-2 font-semibold text-center w-24">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-32">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredPlanAccounts.map((acc) => {
                  const draft = planDrafts[acc.id] || acc;
                  const isDirty = dirtyPlanIds.includes(acc.id);
                  const stats =
                    accountTotalsMap.get(acc.id) ||
                    accountTotalsMap.get(acc.nome) || { total: 0, count: 0 };

                  return (
                    <tr
                      key={acc.id}
                      onBlur={(e) => {
                        if (isDirty && !e.currentTarget.contains(e.relatedTarget as Node)) {
                          commitPlanDraftRow(acc.id);
                        }
                      }}
                      className={`transition-colors ${
                        isDirty ? 'bg-blue-50/40' : 'hover:bg-neutral-50/70'
                      } ${!draft.ativo ? 'opacity-65' : ''}`}
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selectedPlanIds.includes(acc.id)}
                          onChange={() =>
                            setSelectedPlanIds((prev) =>
                              prev.includes(acc.id) ? prev.filter((x) => x !== acc.id) : [...prev, acc.id]
                            )
                          }
                          className="rounded border-neutral-300"
                        />
                      </td>

                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={draft.codigo}
                          onChange={(e) => updatePlanDraft(acc.id, { codigo: e.target.value.toUpperCase() })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitPlanDraftRow(acc.id);
                            }
                          }}
                          className="w-20 px-2 py-1.5 border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 rounded-lg font-mono font-bold uppercase bg-white focus:outline-none"
                        />
                      </td>

                      <td className="py-1.5 px-2">
                        <select
                          value={draft.tipo}
                          onChange={(e) => {
                            const nextTipo = e.target.value as AccountPlanType;
                            updatePlanDraft(acc.id, { tipo: nextTipo });
                          }}
                          className={`w-full px-2 py-1.5 border rounded-lg font-bold text-xs focus:outline-none ${
                            draft.tipo === 'receita'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-rose-300 bg-rose-50 text-rose-800'
                          }`}
                        >
                          <option value="receita">Receita</option>
                          <option value="despesa">Despesa</option>
                        </select>
                      </td>

                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          list="plan-groups-datalist"
                          value={draft.grupo}
                          onChange={(e) => updatePlanDraft(acc.id, { grupo: e.target.value.toUpperCase() })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitPlanDraftRow(acc.id);
                            }
                          }}
                          className="w-full px-2 py-1.5 border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 rounded-lg uppercase bg-white focus:outline-none"
                        />
                      </td>

                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={draft.nome}
                          onChange={(e) => updatePlanDraft(acc.id, { nome: e.target.value.toUpperCase() })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitPlanDraftRow(acc.id);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 rounded-lg font-semibold uppercase bg-white focus:outline-none"
                        />
                      </td>

                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={draft.descricao || ''}
                          placeholder="Adicionar descrição..."
                          onChange={(e) => updatePlanDraft(acc.id, { descricao: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitPlanDraftRow(acc.id);
                            }
                          }}
                          className="w-full px-2 py-1.5 border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 rounded-lg bg-white text-neutral-700 focus:outline-none"
                        />
                      </td>

                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-bold tabular-nums block ${
                            draft.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {formatCurrency(stats.total)}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {stats.count} {stats.count === 1 ? 'lanç.' : 'lançs.'}
                        </span>
                      </td>

                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...draft, ativo: !draft.ativo };
                            updatePlanDraft(acc.id, { ativo: !draft.ativo });
                            onSaveAccount(updated);
                            setDirtyPlanIds((prev) => prev.filter((x) => x !== acc.id));
                          }}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                            draft.ativo
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-neutral-500 bg-neutral-100 hover:bg-neutral-200'
                          }`}
                        >
                          {draft.ativo ? 'Ativa' : 'Inativa'}
                        </button>
                      </td>

                      <td className="py-1.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => commitPlanDraftRow(acc.id)}
                            disabled={!isDirty}
                            title={isDirty ? 'Salvar alterações desta conta' : 'Sem alterações pendentes'}
                            className={`p-1.5 rounded transition-colors ${
                              isDirty
                                ? 'bg-blue-700 text-white hover:bg-blue-800 shadow-2xs'
                                : 'text-neutral-300 cursor-default'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateAccount(acc)}
                            title="Duplicar conta"
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditAccountModal(acc)}
                            title="Abrir formulário completo"
                            className="p-1.5 text-neutral-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAccountToDelete(acc)}
                            title="Apagar conta"
                            className="p-1.5 text-neutral-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPlanAccounts.length === 0 && (
              <div className="py-10 text-center space-y-2 text-neutral-500">
                <FileSpreadsheet className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs font-semibold text-neutral-700">
                  Nenhuma conta encontrada neste filtro
                </p>
                <p className="text-[11px] text-neutral-400">
                  Use a linha acima para adicionar contas diretamente ou importe seu Plano de Contas em Excel.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: NOVO / EDITAR LANÇAMENTO FINANCEIRO                            */}
      {/* ===================================================================== */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[95dvh] flex flex-col">
            <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-950">
                {editingEntry ? 'Editar Movimentação Financeira' : 'Novo Lançamento Financeiro'}
              </h2>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntryModal} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Tipo *</label>
                  <select
                    value={entryForm.tipo}
                    onChange={(e) => {
                      const nextTipo = e.target.value as AccountPlanType;
                      const nextAcc = accountsPlan.find((a) => a.tipo === nextTipo && a.ativo);
                      setEntryForm({
                        ...entryForm,
                        tipo: nextTipo,
                        contaId: nextAcc?.id || '',
                        contaNome: nextAcc?.nome || '',
                        grupo: nextAcc?.grupo || '',
                      });
                    }}
                    className={`w-full px-3 py-2 border rounded-xl font-bold focus:outline-none ${
                      entryForm.tipo === 'receita'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-rose-300 bg-rose-50 text-rose-800'
                    }`}
                  >
                    <option value="receita">Receita (Entrada)</option>
                    <option value="despesa">Despesa (Saída)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={entryForm.data}
                    onChange={(e) => setEntryForm({ ...entryForm, data: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl font-mono"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-neutral-700 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={entryForm.valor}
                    onChange={(e) => setEntryForm({ ...entryForm, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl font-mono font-bold text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Descrição / Histórico *</label>
                <input
                  type="text"
                  required
                  value={entryForm.descricao}
                  onChange={(e) => setEntryForm({ ...entryForm, descricao: e.target.value.toUpperCase() })}
                  placeholder="EX: COMPRA DE SHAMPOO AUTOMOTIVO / RECEBIMENTO FROTA"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Conta (Plano de Contas) *</label>
                  <select
                    value={entryForm.contaId}
                    onChange={(e) => {
                      const acc = accountsPlan.find((a) => a.id === e.target.value);
                      setEntryForm({
                        ...entryForm,
                        contaId: e.target.value,
                        contaNome: acc?.nome || '',
                        grupo: acc?.grupo || '',
                        tipo: acc?.tipo || entryForm.tipo,
                      });
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl bg-white"
                  >
                    <option value="">-- Selecione uma conta --</option>
                    {accountsPlan
                      .filter((a) => a.tipo === entryForm.tipo)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.codigo} · {a.nome}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-neutral-700">Banco / Conta *</label>
                    <button
                      type="button"
                      onClick={() => openNewBankModal(true)}
                      className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Nova Conta
                    </button>
                  </div>
                  <select
                    value={entryForm.bancoId || '__legacy__'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__legacy__') {
                        setEntryForm({ ...entryForm, bancoId: '', banco: '' });
                      } else {
                        const b = bankAccounts.find((x) => x.id === val);
                        if (b) {
                          setEntryForm({ ...entryForm, bancoId: b.id, banco: b.nome });
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl bg-white uppercase font-semibold"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome} ({b.tipoConta})
                      </option>
                    ))}
                    <option value="__legacy__">-- Outro (Digitar manualmente) --</option>
                  </select>
                  {!entryForm.bancoId && (
                    <input
                      type="text"
                      value={entryForm.banco}
                      onChange={(e) => setEntryForm({ ...entryForm, banco: e.target.value.toUpperCase() })}
                      placeholder="SICREDI, CAIXA INTERNO, ITAÚ..."
                      className="mt-2 w-full px-3 py-2 border border-neutral-300 rounded-xl uppercase"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Forma Pagamento</label>
                  <select
                    value={entryForm.formaPagamento}
                    onChange={(e) => setEntryForm({ ...entryForm, formaPagamento: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl bg-white"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Nº Documento / NF</label>
                  <input
                    type="text"
                    value={entryForm.documento}
                    onChange={(e) => setEntryForm({ ...entryForm, documento: e.target.value.toUpperCase() })}
                    placeholder="NF-123 / PIX"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl uppercase"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-neutral-700 mb-1">Status</label>
                  <select
                    value={entryForm.status}
                    onChange={(e) =>
                      setEntryForm({ ...entryForm, status: e.target.value as 'Conciliado' | 'Pendente' })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl bg-white"
                  >
                    <option value="Conciliado">Conciliado (Pago/Recebido)</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>
              </div>

              {/* Campos Personalizados Editáveis */}
              {activeCustomFields.length > 0 && (
                <div className="pt-2 border-t border-neutral-100 space-y-2">
                  <span className="text-[11px] font-bold uppercase text-neutral-500 block">
                    Campos Personalizados
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeCustomFields.map((cf) => (
                      <div key={cf.id}>
                        <label className="block font-semibold text-neutral-700 mb-1">{cf.nome}</label>
                        {cf.tipo === 'selecao' && cf.opcoes && cf.opcoes.length > 0 ? (
                          <select
                            value={entryForm.camposExtras?.[cf.id] || ''}
                            onChange={(e) =>
                              setEntryForm({
                                ...entryForm,
                                camposExtras: { ...(entryForm.camposExtras || {}), [cf.id]: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 border border-neutral-300 rounded-xl bg-white"
                          >
                            <option value="">-- Selecione --</option>
                            {cf.opcoes.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={cf.tipo === 'numero' ? 'number' : cf.tipo === 'data' ? 'date' : 'text'}
                            value={entryForm.camposExtras?.[cf.id] || ''}
                            onChange={(e) =>
                              setEntryForm({
                                ...entryForm,
                                camposExtras: { ...(entryForm.camposExtras || {}), [cf.id]: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 border border-neutral-300 rounded-xl"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Observações</label>
                <input
                  type="text"
                  value={entryForm.observacoes}
                  onChange={(e) => setEntryForm({ ...entryForm, observacoes: e.target.value.toUpperCase() })}
                  placeholder="Detalhes adicionais..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  Salvar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: NOVA / EDITAR CONTA DO PLANO DE CONTAS                         */}
      {/* ===================================================================== */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-950">
                {editingAccount ? 'Editar Conta do Plano' : 'Nova Conta no Plano de Contas'}
              </h2>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccountModal} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    value={accountForm.codigo}
                    onChange={(e) => setAccountForm({ ...accountForm, codigo: e.target.value.toUpperCase() })}
                    placeholder="EX: 2.10"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Tipo *</label>
                  <select
                    value={accountForm.tipo}
                    onChange={(e) => setAccountForm({ ...accountForm, tipo: e.target.value as AccountPlanType })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl bg-white font-semibold"
                  >
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Nome da Conta *</label>
                <input
                  type="text"
                  required
                  value={accountForm.nome}
                  onChange={(e) => setAccountForm({ ...accountForm, nome: e.target.value.toUpperCase() })}
                  placeholder="EX: ENERGIA ELÉTRICA / RECEITA DE FROTAS"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Grupo / Categoria</label>
                <input
                  type="text"
                  value={accountForm.grupo}
                  onChange={(e) => setAccountForm({ ...accountForm, grupo: e.target.value.toUpperCase() })}
                  placeholder="EX: DESPESAS FIXAS, INSUMOS, RECEITAS OPERACIONAIS"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={accountForm.descricao}
                  onChange={(e) => setAccountForm({ ...accountForm, descricao: e.target.value })}
                  placeholder="Finalidade desta conta..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: GERENCIAR CAMPOS PERSONALIZADOS EDITÁVEIS                      */}
      {/* ===================================================================== */}
      {isFieldsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[90dvh] flex flex-col">
            <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-neutral-950">Campos Adicionais Editáveis</h2>
                <p className="text-[11px] text-neutral-500">
                  Adicione, renomeie, altere o tipo ou apague campos conforme o seu modelo financeiro.
                </p>
              </div>
              <button
                onClick={() => setIsFieldsModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <form onSubmit={handleSaveCustomFieldSubmit} className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                <span className="font-bold text-neutral-900 block">
                  {editingField ? `Editar Campo: ${editingField.nome}` : 'Adicionar Novo Campo'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Nome do Campo *</label>
                    <input
                      type="text"
                      required
                      value={fieldFormName}
                      onChange={(e) => setFieldFormName(e.target.value)}
                      placeholder="Ex: Fornecedor, Placa, Parcela"
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Tipo de Dado</label>
                    <select
                      value={fieldFormType}
                      onChange={(e) => setFieldFormType(e.target.value as CustomFieldInputType)}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg bg-white"
                    >
                      <option value="texto">Texto</option>
                      <option value="numero">Número</option>
                      <option value="data">Data</option>
                      <option value="selecao">Lista de Opções</option>
                    </select>
                  </div>
                </div>

                {fieldFormType === 'selecao' && (
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Opções (separadas por vírgula)
                    </label>
                    <input
                      type="text"
                      value={fieldFormOptions}
                      onChange={(e) => setFieldFormOptions(e.target.value)}
                      placeholder="Ex: PÁTIO, ESCRITÓRIO, FROTA"
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg bg-white"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  {editingField && (
                    <button
                      type="button"
                      onClick={() => openFieldForm(undefined)}
                      className="px-3 py-1.5 bg-neutral-200 text-neutral-800 rounded-lg font-semibold"
                    >
                      Cancelar Edição
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg font-bold hover:bg-neutral-800"
                  >
                    {editingField ? 'Atualizar Campo' : '+ Adicionar Campo'}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <span className="font-bold text-neutral-700 block">Campos Cadastrados ({customFields.length})</span>
                {customFields.map((cf) => (
                  <div
                    key={cf.id}
                    className="p-3 border border-neutral-200 rounded-xl flex items-center justify-between gap-2 bg-white"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-neutral-950 block truncate">{cf.nome}</span>
                      <span className="text-[11px] text-neutral-500 uppercase">
                        Tipo: {cf.tipo} {cf.ativo ? '· Visível nas tabelas' : '· Oculto'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSaveCustomField({ ...cf, ativo: !cf.ativo })}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${
                          cf.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {cf.ativo ? 'Ativo' : 'Oculto'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openFieldForm(cf)}
                        className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                        title="Editar campo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFieldToDelete(cf)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Apagar campo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {customFields.length === 0 && (
                  <p className="text-center py-4 text-neutral-400">Nenhum campo adicional cadastrado.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: NOVA / EDITAR CONTA BANCÁRIA OU CAIXA                          */}
      {/* ===================================================================== */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[95dvh] flex flex-col">
            <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-950 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-700" />
                {editingBank ? 'Editar Conta Bancária / Caixa' : 'Nova Conta Bancária / Caixa'}
              </h2>
              <button
                onClick={() => {
                  setIsBankModalOpen(false);
                  setSelectNewBankForEntry(false);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankModal} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Nome / Apelido da Conta *</label>
                  <input
                    type="text"
                    required
                    value={bankForm.nome}
                    onChange={(e) => setBankForm({ ...bankForm, nome: e.target.value.toUpperCase() })}
                    placeholder="EX: SICREDI EMPRESA / CAIXA INTERNO"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl uppercase font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Instituição Financeira *</label>
                  <input
                    type="text"
                    list="bank-suggestions"
                    value={bankForm.banco}
                    onChange={(e) => setBankForm({ ...bankForm, banco: e.target.value.toUpperCase() })}
                    placeholder="EX: SICREDI / 748"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Tipo de Conta</label>
                  <select
                    value={bankForm.tipoConta}
                    onChange={(e) => setBankForm({ ...bankForm, tipoConta: e.target.value as BankAccountType })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl bg-white"
                  >
                    {BANK_ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={bankForm.agencia}
                    onChange={(e) => setBankForm({ ...bankForm, agencia: e.target.value.toUpperCase() })}
                    placeholder="0001"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Nº Conta</label>
                  <input
                    type="text"
                    value={bankForm.numeroConta}
                    onChange={(e) => setBankForm({ ...bankForm, numeroConta: e.target.value.toUpperCase() })}
                    placeholder="12345-6"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Saldo Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankForm.saldoInicial}
                    onChange={(e) => setBankForm({ ...bankForm, saldoInicial: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl font-mono font-bold text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Data Base do Saldo</label>
                  <input
                    type="date"
                    value={bankForm.dataSaldoInicial}
                    onChange={(e) => setBankForm({ ...bankForm, dataSaldoInicial: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Chave PIX (Opcional)</label>
                <input
                  type="text"
                  value={bankForm.chavePix || ''}
                  onChange={(e) => setBankForm({ ...bankForm, chavePix: e.target.value })}
                  placeholder="CNPJ, E-mail, Telefone ou Chave Aleatória"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Observações</label>
                <input
                  type="text"
                  value={bankForm.observacoes || ''}
                  onChange={(e) => setBankForm({ ...bankForm, observacoes: e.target.value.toUpperCase() })}
                  placeholder="Gerente, limite, finalidade da conta..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl uppercase"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bankForm.ativo}
                  onChange={(e) => setBankForm({ ...bankForm, ativo: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <span className="font-semibold text-neutral-800">Conta ativa para novos lançamentos e extratos</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsBankModalOpen(false);
                    setSelectNewBankForEntry(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  Salvar Conta Bancária
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Listas de Sugestões (Datalists) */}
      <datalist id="bank-suggestions">
        {BANK_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <datalist id="plan-groups-datalist">
        {planGroupsList.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      {/* Confirmações de Exclusão */}
      <ConfirmModal
        isOpen={!!entryToDelete}
        onCancel={() => setEntryToDelete(null)}
        onConfirm={() => {
          if (entryToDelete) onDeleteEntry(entryToDelete.id);
          setEntryToDelete(null);
        }}
        title="Apagar Movimentação?"
        message={`Deseja excluir "${entryToDelete?.descricao}" no valor de ${formatCurrency(entryToDelete?.valor || 0)}?`}
        confirmLabel="Sim, Apagar"
      />

      <ConfirmModal
        isOpen={confirmBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => {
          onDeleteEntriesBatch(selectedIds);
          setSelectedIds([]);
          setConfirmBulkDelete(false);
        }}
        title="Apagar Selecionados?"
        message={`Tem certeza que deseja excluir ${selectedIds.length} lançamentos financeiros selecionados?`}
        confirmLabel="Sim, Apagar Todos"
      />

      <ConfirmModal
        isOpen={!!accountToDelete}
        onCancel={() => setAccountToDelete(null)}
        onConfirm={() => {
          if (accountToDelete) {
            onDeleteAccount(accountToDelete.id);
            setDirtyPlanIds((prev) => prev.filter((x) => x !== accountToDelete.id));
            setSelectedPlanIds((prev) => prev.filter((x) => x !== accountToDelete.id));
          }
          setAccountToDelete(null);
        }}
        title="Apagar Conta do Plano?"
        message={`Deseja excluir a conta "${accountToDelete?.codigo} - ${accountToDelete?.nome}" do seu Plano de Contas?`}
        confirmLabel="Sim, Excluir Conta"
      />

      <ConfirmModal
        isOpen={confirmPlanBulkDelete}
        onCancel={() => setConfirmPlanBulkDelete(false)}
        onConfirm={() => {
          if (onDeleteAccountsBatch) {
            onDeleteAccountsBatch(selectedPlanIds);
          } else {
            selectedPlanIds.forEach((id) => onDeleteAccount(id));
          }
          setDirtyPlanIds((prev) => prev.filter((x) => !selectedPlanIds.includes(x)));
          setSelectedPlanIds([]);
          setConfirmPlanBulkDelete(false);
        }}
        title="Apagar Contas Selecionadas?"
        message={`Tem certeza que deseja excluir ${selectedPlanIds.length} conta(s) selecionada(s) do Plano de Contas?`}
        confirmLabel="Sim, Excluir Contas"
      />

      <ConfirmModal
        isOpen={!!bankToDelete}
        onCancel={() => setBankToDelete(null)}
        onConfirm={() => {
          if (bankToDelete) onDeleteBankAccount(bankToDelete.id);
          setBankToDelete(null);
        }}
        title="Apagar Conta Bancária?"
        message={`Deseja excluir a conta bancária "${bankToDelete?.nome}"? Os lançamentos financeiros já salvos continuarão preservados no histórico.`}
        confirmLabel="Sim, Excluir Conta"
      />

      <ConfirmModal
        isOpen={!!fieldToDelete}
        onCancel={() => setFieldToDelete(null)}
        onConfirm={() => {
          if (fieldToDelete) onDeleteCustomField(fieldToDelete.id);
          setFieldToDelete(null);
        }}
        title="Apagar Campo Personalizado?"
        message={`Deseja remover o campo "${fieldToDelete?.nome}"?`}
        confirmLabel="Sim, Apagar Campo"
      />
    </div>
  );
};
