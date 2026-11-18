import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AccountPlanItem,
  AccountPlanType,
  FinancialEntry,
  FinancialCustomField,
  CustomFieldInputType,
} from '../types';
import { formatCurrency, parseLaunchDate, getWeekRange } from '../utils/storage';
import {
  ParsedBankRow,
  parseBankStatementFile,
  parseTextOrCsvStatement,
  buildEditableModelRows,
  downloadStatementTemplateExcel,
  exportFinancialEntriesToExcel,
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
} from 'lucide-react';

interface FinanceiroViewProps {
  entries: FinancialEntry[];
  accountsPlan: AccountPlanItem[];
  customFields: FinancialCustomField[];
  initialSubTab?: 'movimentacoes' | 'extrato' | 'plano';
  onSaveEntry: (entry: FinancialEntry) => void;
  onSaveEntriesBatch: (entries: FinancialEntry[]) => void;
  onDeleteEntry: (id: string) => void;
  onDeleteEntriesBatch: (ids: string[]) => void;
  onSaveAccount: (account: AccountPlanItem) => void;
  onDeleteAccount: (id: string) => void;
  onRestoreDefaultAccounts?: () => void;
  onSaveCustomField: (field: FinancialCustomField) => void;
  onDeleteCustomField: (id: string) => void;
}

type SubTab = 'movimentacoes' | 'extrato' | 'plano';
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

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  entries,
  accountsPlan,
  customFields,
  initialSubTab = 'movimentacoes',
  onSaveEntry,
  onSaveEntriesBatch,
  onDeleteEntry,
  onDeleteEntriesBatch,
  onSaveAccount,
  onDeleteAccount,
  onRestoreDefaultAccounts,
  onSaveCustomField,
  onDeleteCustomField,
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
    banco: 'SICREDI',
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
  const [bankDefaultName, setBankDefaultName] = useState('SICREDI');
  const [pastedText, setPastedText] = useState('');
  const [stagingRows, setStagingRows] = useState<ParsedBankRow[]>([]);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [stagingBulkContaId, setStagingBulkContaId] = useState('');

  // Plano de Contas
  const [planFilterTipo, setPlanFilterTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [planSearch, setPlanSearch] = useState('');
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

  // Movimentações filtradas
  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (filterTipo !== 'todos' && e.tipo !== filterTipo) return false;
        if (filterContaId !== 'todas' && e.contaId !== filterContaId && e.contaNome !== filterContaId) return false;
        if (filterStatus !== 'todos' && e.status !== filterStatus) return false;

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
    filterStatus,
    filterPeriod,
    customStart,
    customEnd,
    todayStr,
    currentMonthPrefix,
    prevMonthPrefix,
    weekStart,
    weekEnd,
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

  // Handlers de Lançamento Financeiro (Manual / Modal)
  const openNewEntryModal = (defaultTipo: AccountPlanType = 'despesa') => {
    const firstAcc =
      accountsPlan.find((a) => a.ativo && a.tipo === defaultTipo) ||
      accountsPlan.find((a) => a.tipo === defaultTipo);
    setEditingEntry(null);
    setEntryForm({
      data: new Date().toISOString().slice(0, 10),
      descricao: '',
      tipo: defaultTipo,
      contaId: firstAcc?.id || '',
      contaNome: firstAcc?.nome || '',
      grupo: firstAcc?.grupo || '',
      valor: 0,
      banco: bankDefaultName || 'SICREDI',
      formaPagamento: 'PIX',
      documento: '',
      status: 'Conciliado',
      origem: 'manual',
      observacoes: '',
      camposExtras: {},
    });
    setIsEntryModalOpen(true);
  };

  const openEditEntryModal = (entry: FinancialEntry) => {
    setEditingEntry(entry);
    setEntryForm({
      data: entry.data,
      descricao: entry.descricao,
      tipo: entry.tipo,
      contaId: entry.contaId,
      contaNome: entry.contaNome,
      grupo: entry.grupo,
      valor: entry.valor,
      banco: entry.banco,
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
    const saved: FinancialEntry = {
      id: editingEntry ? editingEntry.id : `fin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      data: entryForm.data || todayStr,
      descricao: entryForm.descricao.trim().toUpperCase(),
      tipo: entryForm.tipo,
      contaId: acc?.id || entryForm.contaId || '',
      contaNome: (acc?.nome || entryForm.contaNome || (entryForm.tipo === 'receita' ? 'OUTRAS RECEITAS' : 'OUTRAS DESPESAS')).toUpperCase(),
      grupo: (acc?.grupo || entryForm.grupo || 'GERAL').toUpperCase(),
      valor: Math.abs(Number(entryForm.valor) || 0),
      banco: (entryForm.banco || 'CAIXA').trim().toUpperCase(),
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
    setInlineEditId(entry.id);
    setInlineDraft({ ...entry, camposExtras: { ...(entry.camposExtras || {}) } });
  };

  const saveInlineEdit = () => {
    if (!inlineDraft) return;
    const acc = accountsPlan.find((a) => a.id === inlineDraft.contaId);
    onSaveEntry({
      ...inlineDraft,
      descricao: inlineDraft.descricao.trim().toUpperCase(),
      contaNome: (acc?.nome || inlineDraft.contaNome).toUpperCase(),
      grupo: (acc?.grupo || inlineDraft.grupo).toUpperCase(),
      valor: Math.abs(Number(inlineDraft.valor) || 0),
      banco: (inlineDraft.banco || 'CAIXA').trim().toUpperCase(),
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

  // Handlers de Extrato Bancário
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseBankStatementFile(file, accountsPlan, customFields);
      if (parsed.length === 0) {
        setImportFeedback({
          type: 'error',
          msg: 'Não foi possível identificar movimentações no arquivo. Verifique se possui colunas de Data, Descrição e Valor.',
        });
      } else {
        const withBank = parsed.map((row) => ({
          ...row,
          banco: row.banco === 'CONTA CORRENTE' || row.banco === 'EXTRATO EXCEL' ? bankDefaultName.toUpperCase() : row.banco,
        }));
        setStagingRows((prev) => [...prev, ...withBank]);
        setImportFeedback({
          type: 'success',
          msg: `${withBank.length} linhas carregadas do arquivo "${file.name}". Edite qualquer campo abaixo antes de salvar.`,
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
    const parsed = parseTextOrCsvStatement(
      pastedText,
      accountsPlan,
      customFields,
      bankDefaultName.toUpperCase() || 'EXTRATO BANCÁRIO'
    );
    if (parsed.length === 0) {
      setImportFeedback({
        type: 'error',
        msg: 'Nenhuma linha válida identificada no texto colado. Use o formato: Data | Descrição | Valor.',
      });
    } else {
      setStagingRows((prev) => [...prev, ...parsed]);
      setPastedText('');
      setImportFeedback({
        type: 'success',
        msg: `${parsed.length} lançamentos extraídos do texto! Você pode editar todos os campos antes de salvar.`,
      });
    }
  };

  const handleLoadEditableModel = () => {
    const modelRows = buildEditableModelRows(accountsPlan, customFields);
    setStagingRows((prev) => [...prev, ...modelRows]);
    setImportFeedback({
      type: 'success',
      msg: 'Modelo editável carregado na pré-visualização! Altere qualquer campo, adicione ou apague linhas conforme sua necessidade.',
    });
  };

  const handleAddEmptyStagingRow = () => {
    const firstAcc = accountsPlan.find((a) => a.ativo && a.tipo === 'despesa') || accountsPlan[0];
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
        tipo: firstAcc?.tipo || 'despesa',
        valor: 0,
        banco: (bankDefaultName || 'SICREDI').toUpperCase(),
        formaPagamento: 'PIX',
        documento: '',
        contaId: firstAcc?.id || '',
        contaNome: firstAcc?.nome || '',
        grupo: firstAcc?.grupo || '',
        status: 'Conciliado',
        observacoes: '',
        camposExtras: emptyExtras,
      },
    ]);
  };

  const updateStagingRow = (tempId: string, patch: Partial<ParsedBankRow>) => {
    setStagingRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) return row;
        const updated = { ...row, ...patch };
        if (patch.contaId !== undefined) {
          const acc = accountsPlan.find((a) => a.id === patch.contaId);
          if (acc) {
            updated.contaNome = acc.nome;
            updated.grupo = acc.grupo;
            updated.tipo = acc.tipo;
          }
        }
        return updated;
      })
    );
  };

  const handleApplyStagingBulkAccount = () => {
    if (!stagingBulkContaId) return;
    const acc = accountsPlan.find((a) => a.id === stagingBulkContaId);
    if (!acc) return;
    setStagingRows((prev) =>
      prev.map((row) => ({
        ...row,
        contaId: acc.id,
        contaNome: acc.nome,
        grupo: acc.grupo,
        tipo: acc.tipo,
      }))
    );
    setStagingBulkContaId('');
  };

  const handleCommitStagingRows = () => {
    const valid = stagingRows.filter((r) => r.descricao.trim() !== '' || r.valor > 0);
    if (valid.length === 0) return;

    const toSave: FinancialEntry[] = valid.map((r, idx) => ({
      id: `fin-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      data: r.data || todayStr,
      descricao: (r.descricao || 'LANÇAMENTO EXTRATO').trim().toUpperCase(),
      tipo: r.tipo,
      contaId: r.contaId,
      contaNome: (r.contaNome || (r.tipo === 'receita' ? 'OUTRAS RECEITAS' : 'OUTRAS DESPESAS')).toUpperCase(),
      grupo: (r.grupo || 'GERAL').toUpperCase(),
      valor: Math.abs(Number(r.valor) || 0),
      banco: (r.banco || bankDefaultName || 'BANCO').trim().toUpperCase(),
      formaPagamento: (r.formaPagamento || 'CONTA CORRENTE').toUpperCase(),
      documento: (r.documento || '').trim().toUpperCase(),
      status: r.status,
      origem: 'extrato',
      observacoes: (r.observacoes || '').trim().toUpperCase(),
      camposExtras: r.camposExtras || {},
      criadoEm: new Date().toISOString(),
    }));

    onSaveEntriesBatch(toSave);
    setStagingRows([]);
    setImportFeedback({
      type: 'success',
      msg: `${toSave.length} lançamentos salvos com sucesso no Financeiro!`,
    });
    setSubTab('movimentacoes');
  };

  // Handlers do Plano de Contas
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
    setEditingAccount(acc);
    setAccountForm({
      codigo: acc.codigo,
      nome: acc.nome,
      tipo: acc.tipo,
      grupo: acc.grupo,
      descricao: acc.descricao || '',
      ativo: acc.ativo,
    });
    setIsAccountModalOpen(true);
  };

  const handleSaveAccountModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.nome.trim()) return;
    onSaveAccount({
      id: editingAccount ? editingAccount.id : `acc-${Date.now()}`,
      codigo: accountForm.codigo.trim().toUpperCase(),
      nome: accountForm.nome.trim().toUpperCase(),
      tipo: accountForm.tipo,
      grupo: (accountForm.grupo.trim() || 'GERAL').toUpperCase(),
      descricao: accountForm.descricao?.trim() || '',
      ativo: accountForm.ativo,
    });
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

  const filteredPlanAccounts = useMemo(() => {
    const term = planSearch.trim().toLowerCase();
    return accountsPlan
      .filter((a) => {
        if (planFilterTipo !== 'todos' && a.tipo !== planFilterTipo) return false;
        if (term) {
          return (
            a.nome.toLowerCase().includes(term) ||
            a.codigo.toLowerCase().includes(term) ||
            a.grupo.toLowerCase().includes(term)
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
                Financeiro, Plano de Contas & Extrato Bancário
              </h1>
              <p className="text-xs text-neutral-500">
                Cadastre receitas e despesas, importe extratos bancários e edite ou personalize qualquer campo.
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
            className="px-3 py-2 text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-700" />
            Campos ({customFields.length})
          </button>

          <button
            onClick={() => setSubTab('extrato')}
            className="px-3 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            Extrato Bancário
          </button>

          <button
            onClick={() => openNewEntryModal('despesa')}
            className="px-3.5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
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
            className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
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
            className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
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
            onClick={() => setSubTab('plano')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
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
                <option value="todos">Todos os Tipos (Rec + Desp)</option>
                <option value="receita">Apenas Receitas</option>
                <option value="despesa">Apenas Despesas</option>
              </select>

              {/* Conta */}
              <select
                value={filterContaId}
                onChange={(e) => setFilterContaId(e.target.value)}
                className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="todas">Todas as Contas do Plano</option>
                {accountsPlan.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codigo} · {a.nome}
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
                          <input
                            type="text"
                            value={inlineDraft.banco}
                            onChange={(e) => setInlineDraft({ ...inlineDraft, banco: e.target.value })}
                            className="w-24 px-2 py-1 border border-blue-300 rounded text-xs bg-white uppercase"
                          />
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
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Banco / Conta Padrão
                  </label>
                  <input
                    type="text"
                    value={bankDefaultName}
                    onChange={(e) => setBankDefaultName(e.target.value.toUpperCase())}
                    placeholder="EX: SICREDI, ITAÚ, CAIXA..."
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
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

          {/* Área de Pré-Visualização e Edição Completa antes de Alimentar o Financeiro */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-bold text-neutral-950">
                  Pré-visualização Editável do Extrato ({stagingRows.length} linhas)
                </h3>
                <p className="text-xs text-neutral-500">
                  Edite livremente qualquer campo (Data, Descrição, Tipo, Plano de Contas, Valor, Banco ou Campos Extras), adicione ou apague linhas antes de confirmar.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddEmptyStagingRow}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Linha
                </button>
                {stagingRows.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStagingRows([])}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg"
                    >
                      Limpar Lista
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitStagingRows}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Confirmar e Salvar ({stagingRows.length})
                    </button>
                  </>
                )}
              </div>
            </div>

            {stagingRows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 text-xs">
                <span className="font-semibold text-neutral-700">Aplicar conta em todas as linhas:</span>
                <select
                  value={stagingBulkContaId}
                  onChange={(e) => setStagingBulkContaId(e.target.value)}
                  className="px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white text-xs"
                >
                  <option value="">-- Escolha uma conta --</option>
                  {accountsPlan.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.tipo === 'receita' ? '[RECEITA]' : '[DESPESA]'} {a.codigo} · {a.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleApplyStagingBulkAccount}
                  disabled={!stagingBulkContaId}
                  className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg font-semibold disabled:opacity-40"
                >
                  Aplicar a Todos
                </button>
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
                  {stagingRows.map((row) => (
                    <div
                      key={row.tempId}
                      className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs"
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
                          onChange={(e) => updateStagingRow(row.tempId, { tipo: e.target.value as AccountPlanType })}
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
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded bg-white font-semibold uppercase"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={row.contaId}
                          onChange={(e) => updateStagingRow(row.tempId, { contaId: e.target.value })}
                          className="px-2 py-1.5 border border-neutral-300 rounded bg-white text-xs"
                        >
                          <option value="">-- Conta --</option>
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

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={row.banco}
                          placeholder="Banco"
                          onChange={(e) => updateStagingRow(row.tempId, { banco: e.target.value.toUpperCase() })}
                          className="px-2 py-1 border border-neutral-300 rounded bg-white uppercase"
                        />
                        <input
                          type="text"
                          value={row.documento}
                          placeholder="Documento"
                          onChange={(e) => updateStagingRow(row.tempId, { documento: e.target.value.toUpperCase() })}
                          className="px-2 py-1 border border-neutral-300 rounded bg-white uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tabela Desktop Planilha Totalmente Editável */}
                <div className="hidden md:block border border-neutral-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                      <tr>
                        <th className="py-2 px-2 font-semibold">Data</th>
                        <th className="py-2 px-2 font-semibold">Tipo</th>
                        <th className="py-2 px-2 font-semibold">Descrição / Histórico</th>
                        <th className="py-2 px-2 font-semibold">Plano de Contas</th>
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
                      {stagingRows.map((row) => (
                        <tr key={row.tempId} className="hover:bg-neutral-50">
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
                                const nextAcc = accountsPlan.find((a) => a.tipo === nextTipo && a.ativo);
                                updateStagingRow(row.tempId, {
                                  tipo: nextTipo,
                                  contaId: nextAcc?.id || '',
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
                              className="w-full min-w-[180px] px-2 py-1 border border-neutral-300 rounded bg-white uppercase"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <select
                              value={row.contaId}
                              onChange={(e) => updateStagingRow(row.tempId, { contaId: e.target.value })}
                              className="w-full min-w-[170px] px-2 py-1 border border-neutral-300 rounded bg-white text-xs"
                            >
                              <option value="">-- Selecione Conta --</option>
                              {accountsPlan.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.tipo === 'receita' ? '[REC]' : '[DESP]'} {a.codigo} · {a.nome}
                                </option>
                              ))}
                            </select>
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
                            <input
                              type="text"
                              value={row.banco}
                              onChange={(e) =>
                                updateStagingRow(row.tempId, { banco: e.target.value.toUpperCase() })
                              }
                              className="w-24 px-2 py-1 border border-neutral-300 rounded bg-white uppercase"
                            />
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-ABA 3: PLANO DE CONTAS (RECEITAS & DESPESAS EDITÁVEL)             */}
      {/* ===================================================================== */}
      {subTab === 'plano' && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, nome ou grupo..."
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none"
                />
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
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
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
              {onRestoreDefaultAccounts && (
                <button
                  onClick={onRestoreDefaultAccounts}
                  className="px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5"
                  title="Adicionar contas do modelo padrão que não estejam na lista"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Modelo Padrão
                </button>
              )}
              <button
                onClick={() => openNewAccountModal('receita')}
                className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Receita
              </button>
              <button
                onClick={() => openNewAccountModal('despesa')}
                className="px-3 py-2 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Despesa
              </button>
            </div>
          </div>

          {/* Lista / Cards de Contas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredPlanAccounts.map((acc) => {
              const stats = accountTotalsMap.get(acc.id) || accountTotalsMap.get(acc.nome) || { total: 0, count: 0 };
              return (
                <div
                  key={acc.id}
                  className={`bg-white border rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3 ${
                    acc.ativo ? 'border-neutral-200' : 'border-neutral-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-neutral-500">{acc.codigo}</span>
                        <span className="text-neutral-300">·</span>
                        <span
                          className={`font-bold uppercase text-[11px] flex items-center gap-1 ${
                            acc.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {acc.tipo === 'receita' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {acc.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                        <span className="text-neutral-300">·</span>
                        <span className="text-[11px] text-neutral-500 truncate">{acc.grupo}</span>
                      </div>
                      <h3 className="text-sm font-bold text-neutral-950 truncate">{acc.nome}</h3>
                      {acc.descricao && (
                        <p className="text-xs text-neutral-500 line-clamp-2">{acc.descricao}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-mono font-black block ${
                          acc.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatCurrency(stats.total)}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {stats.count} {stats.count === 1 ? 'lançamento' : 'lançamentos'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-neutral-100 text-xs">
                    <button
                      onClick={() => onSaveAccount({ ...acc, ativo: !acc.ativo })}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${
                        acc.ativo
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-neutral-500 bg-neutral-100 hover:bg-neutral-200'
                      }`}
                    >
                      {acc.ativo ? 'Ativa' : 'Inativa'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditAccountModal(acc)}
                        className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg font-semibold flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      <button
                        onClick={() => setAccountToDelete(acc)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Apagar conta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
                  <label className="block font-semibold text-neutral-700 mb-1">Banco / Caixa</label>
                  <input
                    type="text"
                    value={entryForm.banco}
                    onChange={(e) => setEntryForm({ ...entryForm, banco: e.target.value.toUpperCase() })}
                    placeholder="SICREDI, CAIXA INTERNO, ITAÚ..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl uppercase"
                  />
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
          if (accountToDelete) onDeleteAccount(accountToDelete.id);
          setAccountToDelete(null);
        }}
        title="Apagar Conta do Plano?"
        message={`Deseja excluir a conta "${accountToDelete?.codigo} - ${accountToDelete?.nome}" do seu Plano de Contas?`}
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
