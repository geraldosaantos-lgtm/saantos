import React, { useState, useEffect } from 'react';
import {
  getSupabaseConfig,
  saveCustomSupabaseConfig,
  removeCustomSupabaseConfig,
  testSupabaseConnection,
} from '../lib/supabase';
import { uploadAllLocalDataToSupabase, fetchStateFromSupabase } from '../services/supabaseService';
import { AppState } from '../utils/storage';
import {
  Database,
  Cloud,
  Github,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  X,
  Server,
  Key,
  ShieldCheck,
  UploadCloud,
  FileCode2,
  AlertCircle,
  Send,
  Download,
  Eye,
  EyeOff,
  GitBranch,
  GitCommit,
  Sparkles,
  FolderArchive,
  ArrowRight
} from 'lucide-react';
import {
  getStoredGitHubConfig,
  saveGitHubConfig,
  pushToGitHub,
  downloadProjectZip,
  PushResult,
} from '../utils/githubSync';

interface InfraModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: AppState;
  onStateUpdated: (newState: AppState) => void;
  initialTab?: 'supabase' | 'migrations' | 'sql' | 'vercel' | 'github';
}

export const InfraModal: React.FC<InfraModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onStateUpdated,
  initialTab,
}) => {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'supabase' | 'migrations' | 'sql' | 'vercel' | 'github'>(initialTab || 'supabase');
  const [selectedMigration, setSelectedMigration] = useState<number>(0);
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // GitHub Tab State
  const [ghToken, setGhToken] = useState('');
  const [ghRepo, setGhRepo] = useState('geraldosaantos-lgtm/saantos');
  const [ghBranch, setGhBranch] = useState('main');
  const [ghCommitMsg, setGhCommitMsg] = useState('Atualizações do Lava Jato: correções e melhorias');
  const [showGhToken, setShowGhToken] = useState(false);
  const [ghPushing, setGhPushing] = useState(false);
  const [ghPushProgress, setGhPushProgress] = useState<string | null>(null);
  const [ghPushResult, setGhPushResult] = useState<PushResult | null>(null);
  const [ghDownloadingZip, setGhDownloadingZip] = useState(false);
  const [ghSaveFeedback, setGhSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      const current = getSupabaseConfig();
      setConfig(current);
      setUrlInput(current.url);
      setKeyInput(current.anonKey);
      setTestResult(null);
      setSyncFeedback(null);

      const ghConfig = getStoredGitHubConfig();
      setGhToken(ghConfig.token);
      setGhRepo(ghConfig.repo);
      setGhBranch(ghConfig.branch);
      setGhPushResult(null);
      setGhPushProgress(null);
      setGhSaveFeedback(null);
    }
  }, [isOpen]);

  const handleSaveGitHubConfig = () => {
    saveGitHubConfig({
      token: ghToken,
      repo: ghRepo,
      branch: ghBranch,
    });
    setGhSaveFeedback('Configurações do GitHub salvas com sucesso no seu navegador!');
    setTimeout(() => setGhSaveFeedback(null), 3000);
  };

  const handlePushToGitHub = async () => {
    if (!ghToken.trim()) {
      setGhPushResult({
        success: false,
        error: 'Personal Access Token do GitHub obrigatório! Clique no link "Gerar Token no GitHub" para gerar o token com permissão "repo".',
      });
      return;
    }
    if (!ghRepo.trim() || !ghRepo.includes('/')) {
      setGhPushResult({
        success: false,
        error: 'Formato do repositório inválido. Deve ser no padrão: usuario/repositorio (ex: geraldosaantos-lgtm/saantos).',
      });
      return;
    }

    setGhPushing(true);
    setGhPushResult(null);
    setGhPushProgress('Iniciando envio para o GitHub...');

    // Salva token e repositório
    saveGitHubConfig({
      token: ghToken,
      repo: ghRepo,
      branch: ghBranch,
    });

    const result = await pushToGitHub(
      ghToken,
      ghRepo,
      ghBranch,
      ghCommitMsg,
      (progress) => setGhPushProgress(progress)
    );

    setGhPushResult(result);
    setGhPushing(false);
  };

  const handleDownloadZip = async () => {
    try {
      setGhDownloadingZip(true);
      await downloadProjectZip();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert('Erro ao gerar arquivo ZIP: ' + msg);
    } finally {
      setGhDownloadingZip(false);
    }
  };

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setTesting(false);
  };

  const handleSaveCredentials = async () => {
    if (!urlInput.trim() || !keyInput.trim()) {
      setTestResult({
        success: false,
        message: 'Preencha a URL e a chave Anon do Supabase para salvar.',
      });
      return;
    }
    saveCustomSupabaseConfig(urlInput, keyInput);
    const updated = getSupabaseConfig();
    setConfig(updated);
    setTesting(true);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setTesting(false);
  };

  const handleResetCredentials = () => {
    removeCustomSupabaseConfig();
    const updated = getSupabaseConfig();
    setConfig(updated);
    setUrlInput(updated.url);
    setKeyInput(updated.anonKey);
    setTestResult(null);
  };

  const handleSyncToSupabase = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    const res = await uploadAllLocalDataToSupabase(currentState);
    setSyncFeedback(res.message);
    setSyncing(false);
  };

  const handlePullFromSupabase = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    const data = await fetchStateFromSupabase();
    if (data) {
      onStateUpdated({
        ...currentState,
        ...data,
      });
      setSyncFeedback('Dados do Supabase carregados no aplicativo com sucesso!');
    } else {
      setSyncFeedback('Não foi possível obter dados do Supabase. Verifique a conexão e as tabelas.');
    }
    setSyncing(false);
  };

  const copySqlScript = () => {
    const sql = `-- ========================================================
-- ESQUEMA DO BANCO DE DADOS SUPABASE PARA AUTOLAVA
-- ========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS company_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  cnpj TEXT NOT NULL DEFAULT '',
  razao_social TEXT NOT NULL DEFAULT '',
  nome_fantasia TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  dados_bancarios JSONB NOT NULL DEFAULT '{"banco":"","agencia":"","conta":"","tipoConta":"Conta Corrente","chavePix":"","tipoChavePix":"CNPJ"}'::jsonb,
  logo_url TEXT DEFAULT '',
  is_configured BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Passeio / Leve',
  preco_padrao NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  cnpj TEXT NOT NULL DEFAULT '',
  razao_social TEXT NOT NULL DEFAULT '',
  nome_fantasia TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  endereco TEXT DEFAULT '',
  tabela_precos JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  meta_diaria NUMERIC(10, 2) NOT NULL DEFAULT 800.00,
  meta_semanal NUMERIC(10, 2) NOT NULL DEFAULT 4800.00,
  meta_mensal NUMERIC(10, 2) NOT NULL DEFAULT 22000.00,
  meta_diaria_qtd INTEGER NOT NULL DEFAULT 12,
  meta_semanal_qtd INTEGER NOT NULL DEFAULT 70,
  meta_mensal_qtd INTEGER NOT NULL DEFAULT 300,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_launches (
  id TEXT PRIMARY KEY,
  numero_os TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  cliente_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT DEFAULT '',
  contrato_centro_custo TEXT DEFAULT '',
  placa TEXT NOT NULL,
  modelo TEXT NOT NULL,
  km TEXT DEFAULT '',
  responsavel TEXT NOT NULL,
  nome_condutor TEXT NOT NULL,
  matricula_condutor TEXT NOT NULL,
  servicos JSONB NOT NULL DEFAULT '[]'::jsonb,
  valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  assinatura TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Concluído',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir coluna contrato_centro_custo se a tabela já existir previamente
ALTER TABLE service_launches ADD COLUMN IF NOT EXISTS contrato_centro_custo TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_launches_data_hora ON service_launches(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_launches_cliente_id ON service_launches(cliente_id);
CREATE INDEX IF NOT EXISTS idx_launches_placa ON service_launches(placa);

ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_launches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura anonima em company_profile" ON company_profile FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao anonima em company_profile" ON company_profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir leitura anonima em services" ON services FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao anonima em services" ON services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir leitura anonima em clients" ON clients FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao anonima em clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir leitura anonima em goals_config" ON goals_config FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao anonima em goals_config" ON goals_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir leitura anonima em service_launches" ON service_launches FOR SELECT USING (true);
CREATE POLICY "Permitir gravacao anonima em service_launches" ON service_launches FOR ALL USING (true) WITH CHECK (true);`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isConfigured = !!config.url && !!config.anonKey;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden my-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-900 text-white rounded-lg">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                Infraestrutura: GitHub + Vercel + Supabase
              </h2>
              <p className="text-xs text-neutral-500">
                Gestão do banco de dados na nuvem, deploy contínuo e sincronização.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 px-6 bg-white gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'supabase'
                ? 'border-neutral-900 text-neutral-950'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-600" />
            Supabase (Banco)
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'sql'
                ? 'border-neutral-900 text-neutral-950'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Script SQL Completo
          </button>
          <button
            onClick={() => setActiveTab('migrations')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'migrations'
                ? 'border-neutral-900 text-neutral-950'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <FileCode2 className="w-4 h-4 text-amber-600" />
            Migrations Supabase CLI
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'vercel'
                ? 'border-neutral-900 text-neutral-950'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Cloud className="w-4 h-4 text-neutral-900" />
            Vercel (Hospedagem)
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'github'
                ? 'border-neutral-900 text-neutral-950'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Github className="w-4 h-4 text-neutral-800" />
            GitHub (Repositório)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: SUPABASE CONFIG */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              {/* Status do Supabase */}
              <div
                className={`p-3.5 rounded-lg border flex items-center justify-between ${
                  isConfigured
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isConfigured ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold">
                      {isConfigured
                        ? 'Supabase Configurado e Ativo'
                        : 'Modo Local Ativo (Supabase não conectado)'}
                    </h4>
                    <p className="text-[11px] opacity-80">
                      {isConfigured
                        ? `Origem: ${config.source === 'env' ? 'Variável de Ambiente Vercel (.env)' : 'Configuração inserida no navegador'}`
                        : 'Os dados estão salvos localmente. Conecte ao Supabase para sincronização em nuvem.'}
                    </p>
                  </div>
                </div>

                {isConfigured && (
                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-emerald-300 rounded-md shadow-2xs hover:bg-emerald-50 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                    Testar Conexão
                  </button>
                )}
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-md text-xs border ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <strong className="block mb-0.5">
                    {testResult.success ? '✓ Sucesso na Conexão' : '✕ Atenção na Conexão:'}
                  </strong>
                  {testResult.message}
                </div>
              )}

              {/* Formulário de Credenciais */}
              <div className="space-y-3 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-neutral-600" />
                    Credenciais do Projeto Supabase
                  </h4>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    Acessar Supabase Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Project URL (VITE_SUPABASE_URL)
                  </label>
                  <input
                    type="text"
                    placeholder="https://seu-projeto.supabase.co"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Anon Public Key (VITE_SUPABASE_ANON_KEY)
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md font-mono bg-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {config.source === 'custom' && (
                    <button
                      type="button"
                      onClick={handleResetCredentials}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remover credenciais salvas
                    </button>
                  )}
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveCredentials}
                      disabled={testing}
                      className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      Salvar & Conectar ao Supabase
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Carga e Sincronização */}
              {isConfigured && (
                <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-emerald-600" />
                    Sincronização de Dados com Supabase
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Ao criar seu banco Supabase novo, você pode enviar com 1 clique todos os clientes, serviços e lançamentos que já cadastrou localmente:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSyncToSupabase}
                      disabled={syncing}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      {syncing ? 'Enviando ao Supabase...' : 'Enviar Dados Locais para o Supabase'}
                    </button>

                    <button
                      type="button"
                      onClick={handlePullFromSupabase}
                      disabled={syncing}
                      className="px-3.5 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      Recarregar Dados da Nuvem
                    </button>
                  </div>

                  {syncFeedback && (
                    <div className="p-2.5 bg-neutral-100 rounded text-xs text-neutral-800 font-medium">
                      {syncFeedback}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SQL SCHEMA */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">
                    Esquema SQL de Tabelas (PostgreSQL)
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Copie e cole este script na aba <strong>SQL Editor</strong> do seu painel Supabase.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copySqlScript}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar Script SQL
                    </>
                  )}
                </button>
              </div>

              <div className="bg-neutral-900 text-neutral-200 p-3.5 rounded-lg font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed">
                <pre>{`-- 1. Tabela da Empresa
CREATE TABLE company_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  cnpj TEXT, razao_social TEXT, nome_fantasia TEXT, email TEXT, telefone TEXT, endereco TEXT,
  dados_bancarios JSONB, logo_url TEXT, is_configured BOOLEAN DEFAULT false, updated_at TIMESTAMPTZ
);

-- 2. Tabela de Serviços
CREATE TABLE services (
  id TEXT PRIMARY KEY, codigo TEXT, nome TEXT, categoria TEXT,
  preco_padrao NUMERIC(10,2), descricao TEXT, ativo BOOLEAN DEFAULT true
);

-- 3. Tabela de Clientes & Preços
CREATE TABLE clients (
  id TEXT PRIMARY KEY, cnpj TEXT, razao_social TEXT, nome_fantasia TEXT,
  email TEXT, telefone TEXT, endereco TEXT, tabela_precos JSONB, ativo BOOLEAN
);

-- 4. Tabela de Metas
CREATE TABLE goals_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  meta_diaria NUMERIC, meta_semanal NUMERIC, meta_mensal NUMERIC,
  meta_diaria_qtd INT, meta_semanal_qtd INT, meta_mensal_qtd INT
);

-- 5. Tabela de Lançamentos & Ordens de Serviço
CREATE TABLE service_launches (
  id TEXT PRIMARY KEY, numero_os TEXT, data_hora TEXT, cliente_id TEXT,
  cliente_nome TEXT, cliente_cnpj TEXT, contrato_centro_custo TEXT,
  placa TEXT, modelo TEXT, km TEXT, responsavel TEXT, nome_condutor TEXT,
  matricula_condutor TEXT, servicos JSONB, valor_total NUMERIC, assinatura TEXT, status TEXT
);`}</pre>
              </div>

              <div className="p-3 bg-neutral-100 rounded-lg text-xs text-neutral-700 space-y-1">
                <span className="font-bold text-neutral-900 block">Como rodar no Supabase:</span>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-neutral-600">
                  <li>Abra seu projeto no Supabase (<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 underline">supabase.com/dashboard</a>).</li>
                  <li>Clique no menu lateral esquerdo em <strong>SQL Editor</strong>.</li>
                  <li>Clique em <strong>+ New Query</strong>, cole o script acima e clique em <strong>Run</strong> (Ctrl+Enter).</li>
                  <li>Pronto! Todas as 5 tabelas, índices e políticas de segurança RLS estarão criadas.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB: MIGRATIONS SUPABASE CLI */}
          {activeTab === 'migrations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <FileCode2 className="w-4 h-4 text-amber-600" />
                    Arquivos de Migração Versionados (Supabase CLI)
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    O diretório <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">/supabase/migrations/</code> contém as migrações sequenciais prontas para CI/CD e Supabase CLI.
                  </p>
                </div>
              </div>

              {/* Seletor de Arquivos de Migração */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  {
                    id: 0,
                    file: '20240101000000_initial_schema.sql',
                    title: '1. Esquema Inicial',
                    desc: 'Cria as 5 tabelas principais, campos JSONB e chaves estrangeiras',
                  },
                  {
                    id: 1,
                    file: '20240101000001_indexes_and_performance.sql',
                    title: '2. Índices & Triggers',
                    desc: 'Índices B-Tree em OS, placa, cliente e trigger updated_at',
                  },
                  {
                    id: 2,
                    file: '20240101000002_rls_security_policies.sql',
                    title: '3. Segurança & RLS',
                    desc: 'Habilitação de RLS e políticas de leitura/gravação segura',
                  },
                  {
                    id: 3,
                    file: '20240101000003_storage_and_seed.sql',
                    title: '4. Storage & Seed Inicial',
                    desc: 'Bucket autolava_media e catálogo inicial de 6 serviços',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMigration(item.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      selectedMigration === item.id
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{item.title}</span>
                      <span className={`text-[10px] font-mono px-1 py-0.5 rounded ${
                        selectedMigration === item.id ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        .sql
                      </span>
                    </div>
                    <p className={`text-[11px] leading-tight ${
                      selectedMigration === item.id ? 'text-neutral-300' : 'text-neutral-500'
                    }`}>
                      {item.desc}
                    </p>
                    <span className={`mt-1.5 block font-mono text-[9px] truncate ${
                      selectedMigration === item.id ? 'text-amber-400' : 'text-neutral-400'
                    }`}>
                      supabase/migrations/{item.file}
                    </span>
                  </button>
                ))}
              </div>

              {/* Comandos do Supabase CLI */}
              <div className="p-3.5 bg-neutral-950 text-neutral-200 rounded-lg text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-neutral-400 text-[11px] border-b border-neutral-800 pb-1.5">
                  <span className="font-sans font-semibold text-neutral-300">Como aplicar as migrations via Supabase CLI:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('supabase db push');
                      setCopiedMigration(true);
                      setTimeout(() => setCopiedMigration(false), 2000);
                    }}
                    className="hover:text-white flex items-center gap-1 text-[10px] text-amber-400"
                  >
                    {copiedMigration ? '✓ Copiado' : 'Copiar comando de push'}
                  </button>
                </div>
                <div className="space-y-1 text-[11px]">
                  <p className="text-neutral-400"># 1. Login e link com o seu projeto Supabase</p>
                  <p className="text-emerald-400">npx supabase login</p>
                  <p className="text-emerald-400">npx supabase link --project-ref SEU_PROJECT_ID</p>
                  <p className="text-neutral-400 pt-1"># 2. Aplicar todas as 4 migrations automaticamente</p>
                  <p className="text-amber-400 font-bold">npx supabase db push</p>
                  <p className="text-neutral-400 pt-1"># 3. Rodar localmente para testes (Docker opcional)</p>
                  <p className="text-neutral-300">npx supabase start</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VERCEL DEPLOY */}
          {activeTab === 'vercel' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-900">
                Deploy na Vercel (Produção com SSL Gratuito)
              </h4>
              <p className="text-xs text-neutral-600">
                O projeto já inclui o arquivo <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800 font-mono">vercel.json</code> configurado para Single Page Application (SPA), eliminando qualquer erro de 404 em rotas e recarregamentos.
              </p>

              <div className="border border-neutral-200 rounded-lg p-3.5 bg-neutral-50 space-y-2 text-xs">
                <h5 className="font-bold text-neutral-800">Passos para Deploy na Vercel:</h5>
                <ol className="list-decimal list-inside space-y-1.5 text-neutral-600 text-[11px]">
                  <li>Acesse <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">vercel.com</a> e faça login com sua conta do GitHub.</li>
                  <li>Clique em <strong>Add New... &gt; Project</strong> e selecione o repositório do seu Lava Jato.</li>
                  <li>
                    Na seção <strong>Environment Variables</strong> da Vercel, adicione as duas variáveis:
                    <div className="mt-1 bg-white p-2 rounded border border-neutral-300 font-mono text-[10px] space-y-1">
                      <div><strong className="text-neutral-900">VITE_SUPABASE_URL</strong> = https://seu-projeto.supabase.co</div>
                      <div><strong className="text-neutral-900">VITE_SUPABASE_ANON_KEY</strong> = sua_chave_anon_publica</div>
                    </div>
                  </li>
                  <li>Clique em <strong>Deploy</strong>. Em menos de 1 minuto seu sistema estará no ar com domínio seguro HTTPS!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: GITHUB */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              {/* Notificação / Contexto */}
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                  Sincronização do Código com o seu GitHub
                </p>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  Aqui você pode <strong>enviar as alterações e melhorias do sistema diretamente para o seu GitHub</strong>.
                  Assim que o envio for concluído, se o seu projeto estiver conectado na Vercel, o deploy em produção é atualizado automaticamente!
                </p>
              </div>

              {/* OPÇÃO 1: ENVIO DIRETO VIA GITHUB API (WEB PUSH) */}
              <div className="border-2 border-neutral-900 rounded-xl p-4 bg-white space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                        Opção 1: Enviar Atualizações Direto para o GitHub
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        Faz o commit e push de todos os arquivos modificados usando a API do GitHub
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Repositório no GitHub:
                    </label>
                    <input
                      type="text"
                      value={ghRepo}
                      onChange={(e) => setGhRepo(e.target.value)}
                      placeholder="seu-usuario/seu-repositorio"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-neutral-50"
                    />
                    <span className="text-[10px] text-neutral-400">Ex: geraldosaantos-lgtm/saantos</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Branch de Destino:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-4 h-4 text-neutral-400 shrink-0" />
                      <input
                        type="text"
                        value={ghBranch}
                        onChange={(e) => setGhBranch(e.target.value)}
                        placeholder="main"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-neutral-50"
                      />
                    </div>
                    <span className="text-[10px] text-neutral-400">Padrão da Vercel: main</span>
                  </div>
                </div>

                {/* Token PAT */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-neutral-700">
                      GitHub Personal Access Token (PAT):
                    </label>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=AutoLava+Deploy"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-800 underline font-medium flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Gerar Token no GitHub (1 clique com permissão &apos;repo&apos;)
                    </a>
                  </div>

                  <div className="relative">
                    <input
                      type={showGhToken ? 'text' : 'password'}
                      value={ghToken}
                      onChange={(e) => setGhToken(e.target.value)}
                      placeholder="Cole aqui seu token: ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full pl-3 pr-20 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    />
                    <div className="absolute right-2 top-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowGhToken(!showGhToken)}
                        className="p-1 text-neutral-400 hover:text-neutral-700 rounded"
                        title={showGhToken ? 'Ocultar Token' : 'Mostrar Token'}
                      >
                        {showGhToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    O token precisa da permissão <strong>repo</strong> marcada. Ele é guardado com segurança apenas no armazenamento local do seu próprio navegador.
                  </p>
                </div>

                {/* Mensagem do commit */}
                <div className="text-xs">
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Mensagem da Atualização (Commit):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <GitCommit className="w-4 h-4 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      value={ghCommitMsg}
                      onChange={(e) => setGhCommitMsg(e.target.value)}
                      placeholder="Ex: Atualizações do sistema: nova tela e correções"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Feedback e Resultados */}
                {ghSaveFeedback && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{ghSaveFeedback}</span>
                  </div>
                )}

                {ghPushProgress && (
                  <div className="p-3 bg-neutral-900 text-white rounded-lg text-xs flex items-center gap-2.5 animate-pulse font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-emerald-400" />
                    <span>{ghPushProgress}</span>
                  </div>
                )}

                {ghPushResult && (
                  <div
                    className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                      ghPushResult.success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-red-50 border-red-300 text-red-900'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {ghPushResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1">
                        <p className="font-bold text-sm">
                          {ghPushResult.success
                            ? '🚀 Código Enviado com Sucesso para o GitHub!'
                            : 'Erro ao Enviar para o GitHub'}
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          {ghPushResult.success
                            ? `Foram enviados ${ghPushResult.filesCount || 'todos os'} arquivos do sistema para a branch ${ghBranch}. Se você conectou seu repositório na Vercel, o novo deploy em produção já começou!`
                            : ghPushResult.error}
                        </p>

                        {ghPushResult.commitUrl && (
                          <div className="pt-2 flex flex-wrap items-center gap-2">
                            <a
                              href={ghPushResult.commitUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-md text-[11px] flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Ver Commit no GitHub ({ghPushResult.commitSha})
                            </a>
                            <a
                              href="https://vercel.com"
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-md text-[11px] flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <Cloud className="w-3.5 h-3.5" />
                              Acompanhar Deploy na Vercel ↗
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePushToGitHub}
                    disabled={ghPushing}
                    className={`flex-1 min-w-[200px] px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 ${
                      ghPushing
                        ? 'bg-neutral-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
                    }`}
                  >
                    {ghPushing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Enviando para o GitHub...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Atualizações para o GitHub Agora</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveGitHubConfig}
                    className="px-3 py-2.5 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-700 transition-colors"
                    title="Salvar token e repositório no navegador"
                  >
                    Salvar Dados
                  </button>
                </div>
              </div>

              {/* OPÇÃO 2: DOWNLOAD DO PROJETO EM ZIP */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-neutral-200 text-neutral-800 flex items-center justify-center">
                      <FolderArchive className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">
                        Opção 2: Baixar Código Completo (.ZIP)
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        Baixe o arquivo compactado com todo o sistema atualizado
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={ghDownloadingZip}
                    className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {ghDownloadingZip ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Compactando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar Projeto (.ZIP)</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Se você preferir não usar token, baixe o arquivo <code>.zip</code> e envie pelo navegador acessando{' '}
                  <a
                    href={`https://github.com/${ghRepo || 'geraldosaantos-lgtm/saantos'}/upload/${ghBranch || 'main'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline font-medium"
                  >
                    github.com/{ghRepo || 'seu-repo'}/upload/{ghBranch || 'main'}
                  </a>{' '}
                  (basta arrastar e soltar os arquivos no site do GitHub).
                </p>
              </div>

              {/* OPÇÃO 3: COMANDOS DE TERMINAL */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-white space-y-3 text-xs">
                <h5 className="font-bold text-neutral-900 flex items-center justify-between">
                  <span>Opção 3: Enviar pelo Terminal (Git no Computador)</span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Terminal / CMD
                  </span>
                </h5>
                <p className="text-[11px] text-neutral-600">
                  Se você clonou o projeto no seu computador, execute no terminal da pasta do projeto:
                </p>

                <div className="bg-neutral-950 text-neutral-200 p-3 rounded-lg font-mono text-[11px] space-y-1.5">
                  <div className="text-neutral-400"># 1. Configurar o repositório remoto:</div>
                  <div className="text-emerald-400">git remote set-url origin https://github.com/{ghRepo || 'geraldosaantos-lgtm/saantos'}.git</div>
                  <div className="text-neutral-400 pt-1"># 2. Adicionar arquivos modificados e commitar:</div>
                  <div className="text-neutral-300">git add .</div>
                  <div className="text-neutral-300">git commit -m &quot;{ghCommitMsg || 'Atualizacoes do Lava Jato'}&quot;</div>
                  <div className="text-neutral-400 pt-1"># 3. Enviar para a branch principal:</div>
                  <div className="text-amber-400 font-bold">git push -u origin {ghBranch || 'main'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-neutral-500">
            Arquivos de infraestrutura inclusos: <code className="font-mono">vercel.json</code> e <code className="font-mono">supabase_schema.sql</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-200 hover:bg-neutral-300 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
