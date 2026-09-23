import React from 'react';
import { CompanyProfile, GoalsConfig, ServiceLaunch, ActiveTab } from '../types';
import { formatCurrency, formatDateTime } from '../utils/storage';
import {
  Car,
  Users,
  Wrench,
  Target,
  FileText,
  Building2,
  Edit,
  ArrowRight,
  PlusCircle,
  Clock,
  Landmark,
  QrCode,
  CheckCircle2
} from 'lucide-react';

interface DashboardHomeProps {
  company: CompanyProfile;
  goals: GoalsConfig;
  launches: ServiceLaunch[];
  onOpenLancamento: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenCompanyModal: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  company,
  goals,
  launches,
  onOpenLancamento,
  onNavigateTab,
  onOpenCompanyModal,
}) => {
  // Cálculos rápidos para o resumo operacional
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  let totalHoje = 0;
  let qtdHoje = 0;
  let totalMes = 0;
  let qtdMes = 0;

  launches.forEach((l) => {
    const lDateStr = l.dataHora.slice(0, 10);
    const lDate = new Date(l.dataHora);

    if (lDateStr === todayStr) {
      totalHoje += l.valorTotal;
      qtdHoje += 1;
    }

    if (
      lDate.getMonth() === now.getMonth() &&
      lDate.getFullYear() === now.getFullYear()
    ) {
      totalMes += l.valorTotal;
      qtdMes += 1;
    }
  });

  const pctDia = goals.metaDiaria > 0 ? Math.min(100, Math.round((totalHoje / goals.metaDiaria) * 100)) : 0;
  const pctMes = goals.metaMensal > 0 ? Math.min(100, Math.round((totalMes / goals.metaMensal) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* CARD: DADOS DE MINHA EMPRESA COM BOTÃO PARA EDITAR */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {company.logoUrl ? (
              <div className="w-16 h-16 rounded-lg border border-neutral-200 p-1 bg-white flex items-center justify-center shrink-0">
                <img
                  src={company.logoUrl}
                  alt={company.nomeFantasia}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-neutral-900 text-white flex flex-col items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-neutral-200" />
                <span className="text-[9px] font-bold mt-0.5">EMPRESA</span>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-950">
                  {company.nomeFantasia || company.razaoSocial}
                </h2>
                <span className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-mono">
                  {company.cnpj}
                </span>
              </div>
              <p className="text-xs text-neutral-500 line-clamp-1">
                {company.razaoSocial} · {company.telefone} · {company.email}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-600 pt-0.5">
                <span className="flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-neutral-400" />
                  {company.dadosBancarios.banco} (Ag: {company.dadosBancarios.agencia} / CC: {company.dadosBancarios.conta})
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <QrCode className="w-3 h-3 text-neutral-400" />
                  PIX ({company.dadosBancarios.tipoChavePix}): <strong>{company.dadosBancarios.chavePix}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenCompanyModal}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
          >
            <Edit className="w-3.5 h-3.5" />
            Editar Dados da Minha Empresa
          </button>
        </div>
      </div>

      {/* OS BOTÕES PRINCIPAIS DA TELA INICIAL (Requisitos Centrais do Usuário) */}
      <div>
        <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-3">
          Ações Principais do Sistema de Lava Jato
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Botão Lançamento */}
          <button
            onClick={onOpenLancamento}
            className="group text-left bg-neutral-900 text-white p-5 rounded-xl hover:bg-neutral-800 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden"
          >
            <div>
              <div className="p-2.5 bg-white/10 rounded-lg w-fit text-white mb-3">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold tracking-tight">
                Lançamento de Serviço
              </h3>
              <p className="text-xs text-neutral-300 mt-1 line-clamp-2">
                Informe placa, modelo, km, responsável, matrícula do condutor e colha a assinatura digital.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-neutral-100">
              <span className="flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" /> Novo Lançamento
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* 2. Botão Cadastro de Clientes */}
          <button
            onClick={() => onNavigateTab('clientes')}
            className="group text-left bg-white border border-neutral-200 p-5 rounded-xl hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="p-2.5 bg-neutral-100 rounded-lg w-fit text-neutral-800 mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                Cadastro de Clientes
              </h3>
              <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                CNPJ, razão social, nome fantasia, e-mail, telefone e tabela de valores exclusiva por cliente.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-900">
              <span>Gerenciar Clientes & Preços</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-neutral-500" />
            </div>
          </button>

          {/* 3. Botão Cadastro de Serviços */}
          <button
            onClick={() => onNavigateTab('servicos')}
            className="group text-left bg-white border border-neutral-200 p-5 rounded-xl hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="p-2.5 bg-neutral-100 rounded-lg w-fit text-neutral-800 mb-3">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                Cadastro de Serviços
              </h3>
              <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                Lavagem simples, completa, motor, chassi e tabela base de referência para os clientes.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-900">
              <span>Catálogo de Serviços</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-neutral-500" />
            </div>
          </button>

          {/* 4. Botão Planejamento de Metas */}
          <button
            onClick={() => onNavigateTab('metas')}
            className="group text-left bg-white border border-neutral-200 p-5 rounded-xl hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="p-2.5 bg-neutral-100 rounded-lg w-fit text-neutral-800 mb-3">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                Planejamento de Metas
              </h3>
              <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                Controle de metas por dia, semana e mês com acompanhamento do progresso em tempo real.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-900">
              <span>Acompanhar Metas</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-neutral-500" />
            </div>
          </button>
        </div>
      </div>

      {/* ÁREA DE RELATÓRIOS (PDF E EXCEL) DESTAQUE */}
      <div className="bg-neutral-900 text-white rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-neutral-200" />
            <h3 className="text-base font-bold">Relatórios de Atendimento com PDF e Excel</h3>
          </div>
          <p className="text-xs text-neutral-300 max-w-2xl">
            Exporte relatórios consolidados para fechamento e conciliação por período selecionado. Cada relatório contém o cabeçalho completo da sua empresa, dados do cliente e serviços com data, hora, condutor, matrícula e assinatura.
          </p>
        </div>
        <button
          onClick={() => onNavigateTab('relatorios')}
          className="px-4 py-2.5 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm"
        >
          <FileText className="w-4 h-4 text-red-500" />
          Acessar Central de Relatórios
        </button>
      </div>

      {/* RESUMO DE METAS HOJE E MÊS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
              Produtividade de Hoje ({new Date().toLocaleDateString('pt-BR')})
            </span>
            <span className="text-xs font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded">
              {pctDia}% da meta diária
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-neutral-950">
              {formatCurrency(totalHoje)}
            </div>
            <div className="text-xs text-neutral-500">
              Meta: <strong className="font-mono text-neutral-800">{formatCurrency(goals.metaDiaria)}</strong>
            </div>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-neutral-900 h-2 rounded-full transition-all duration-500"
              style={{ width: `${pctDia}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500">
            <span>{qtdHoje} veículos atendidos hoje</span>
            <span>Meta: {goals.metaDiariaQtd} veículos</span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
              Fechamento do Mês Atual
            </span>
            <span className="text-xs font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded">
              {pctMes}% da meta mensal
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-neutral-950">
              {formatCurrency(totalMes)}
            </div>
            <div className="text-xs text-neutral-500">
              Meta: <strong className="font-mono text-neutral-800">{formatCurrency(goals.metaMensal)}</strong>
            </div>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-neutral-900 h-2 rounded-full transition-all duration-500"
              style={{ width: `${pctMes}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500">
            <span>{qtdMes} veículos atendidos no mês</span>
            <span>Meta: {goals.metaMensalQtd} veículos</span>
          </div>
        </div>
      </div>

      {/* ÚLTIMOS LANÇAMENTOS REGISTRADOS */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-600" />
            Lançamentos Recentes no Lava Jato
          </h3>
          <button
            onClick={() => onNavigateTab('lancamentos')}
            className="text-xs font-semibold text-neutral-900 hover:underline flex items-center gap-1"
          >
            Ver Todos os Lançamentos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Data/Hora</th>
                <th className="py-2.5 px-3 font-semibold">OS</th>
                <th className="py-2.5 px-3 font-semibold">Cliente</th>
                <th className="py-2.5 px-3 font-semibold">Placa / Veículo</th>
                <th className="py-2.5 px-3 font-semibold">Condutor / Matrícula</th>
                <th className="py-2.5 px-3 font-semibold text-center">Assinatura</th>
                <th className="py-2.5 px-3 font-semibold text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {launches.slice(0, 5).map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50">
                  <td className="py-2.5 px-3 font-mono text-neutral-600">
                    {formatDateTime(l.dataHora)}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">
                    {l.numeroOS}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-neutral-900">{l.clienteNome}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-neutral-950">{l.placa}</span>
                    <span className="text-neutral-500 block text-[11px]">{l.modelo}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-neutral-900">{l.nomeCondutor}</span>
                    <span className="text-neutral-500 block text-[10px] font-mono">
                      Mat: {l.matriculaCondutor}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {l.assinatura ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Assinado
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400">Pendente</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-950">
                    {formatCurrency(l.valorTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
