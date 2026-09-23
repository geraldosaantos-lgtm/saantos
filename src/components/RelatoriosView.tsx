import React, { useState, useMemo } from 'react';
import { CompanyProfile, Client, ServiceLaunch } from '../types';
import { formatCurrency, formatDateTime, getLocalDateString } from '../utils/storage';
import { exportReportToExcel } from '../utils/exportExcel';
import { exportReportToPdf } from '../utils/exportPdf';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Calendar,
  Building,
  DollarSign,
  Car,
  QrCode,
  PenTool,
  Landmark
} from 'lucide-react';

interface RelatoriosViewProps {
  company: CompanyProfile;
  clients: Client[];
  launches: ServiceLaunch[];
  onOpenCompanyModal: () => void;
}

type PeriodType = 'hoje' | 'semana' | 'mes' | 'mes_anterior' | 'personalizado';

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  company,
  clients,
  launches,
  onOpenCompanyModal,
}) => {
  const [periodType, setPeriodType] = useState<PeriodType>('mes');
  const [selectedClientId, setSelectedClientId] = useState<string>('todos');

  // Período personalizado
  const todayIso = getLocalDateString(new Date());
  const firstDayOfMonthIso = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [customStart, setCustomStart] = useState(firstDayOfMonthIso);
  const [customEnd, setCustomEnd] = useState(todayIso);

  // Calcula intervalo de datas baseado no período selecionado
  const { filteredLaunches, periodLabel } = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    let label = '';

    if (periodType === 'hoje') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      label = `Hoje (${now.toLocaleDateString('pt-BR')})`;
    } else if (periodType === 'semana') {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      label = `Esta Semana (${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')})`;
    } else if (periodType === 'mes') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const mesNome = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      label = `Mês Atual (${mesNome.toUpperCase()})`;
    } else if (periodType === 'mes_anterior') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const mesNome = startDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      label = `Mês Anterior (${mesNome.toUpperCase()})`;
    } else {
      // Personalizado
      startDate = new Date(`${customStart}T00:00:00`);
      endDate = new Date(`${customEnd}T23:59:59`);
      label = `${new Date(customStart).toLocaleDateString('pt-BR')} até ${new Date(customEnd).toLocaleDateString('pt-BR')}`;
    }

    const filtered = launches.filter((l) => {
      const lDate = new Date(l.dataHora);
      const matchesPeriod = lDate >= startDate && lDate <= endDate;
      const matchesClient =
        selectedClientId === 'todos' || l.clienteId === selectedClientId;
      return matchesPeriod && matchesClient;
    });

    return { filteredLaunches: filtered, periodLabel: label };
  }, [periodType, selectedClientId, customStart, customEnd, launches]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  const totalValor = filteredLaunches.reduce((acc, curr) => acc + curr.valorTotal, 0);

  const handleExportExcel = () => {
    exportReportToExcel(company, selectedClient, periodLabel, filteredLaunches);
  };

  const handleExportPdf = () => {
    exportReportToPdf(company, selectedClient, periodLabel, filteredLaunches);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Actions - Ocultos na Impressão (@media print) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              Relatórios Operacionais & Faturamento
            </h1>
            <p className="text-xs text-neutral-500">
              Gere e exporte relatórios consolidados em PDF e Excel com cabeçalho da sua empresa, dados do cliente e assinaturas dos condutores.
            </p>
          </div>

          {/* Botões de Ação de Exportação */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              title="Baixar arquivo PDF com cabeçalho e assinaturas"
            >
              <FileText className="w-4 h-4 text-red-400" />
              Exportar em PDF
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              title="Baixar planilha compatível com Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              Exportar em Excel
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              title="Imprimir relatório direto na impressora ou salvar pelo navegador"
            >
              <Printer className="w-4 h-4 text-neutral-600" />
              Imprimir / PDF Direto
            </button>
          </div>
        </div>

        {/* Filtros de Período e Cliente */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {/* Filtro de Período */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                Período do Relatório
              </label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
              >
                <option value="hoje">Hoje</option>
                <option value="semana">Esta Semana</option>
                <option value="mes">Mês Atual</option>
                <option value="mes_anterior">Mês Anterior</option>
                <option value="personalizado">Período Personalizado...</option>
              </select>
            </div>

            {/* Filtro de Cliente */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-neutral-500" />
                Filtrar por Cliente
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
              >
                <option value="todos">Todos os Clientes (Geral)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeFantasia} ({c.cnpj})
                  </option>
                ))}
              </select>
            </div>

            {/* Resumo Rápido */}
            <div className="flex items-center gap-4 bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2">
              <div>
                <span className="text-[11px] text-neutral-500 block">Total Atendimentos:</span>
                <span className="text-sm font-bold font-mono text-neutral-900">
                  {filteredLaunches.length} veículos
                </span>
              </div>
              <div className="border-l border-neutral-200 pl-4">
                <span className="text-[11px] text-neutral-500 block">Total Faturado:</span>
                <span className="text-base font-bold font-mono text-neutral-950">
                  {formatCurrency(totalValor)}
                </span>
              </div>
            </div>
          </div>

          {/* Seleção de datas personalizadas */}
          {periodType === 'personalizado' && (
            <div className="pt-2 border-t border-neutral-100 flex items-center gap-3">
              <div>
                <label className="block text-[11px] text-neutral-500 mb-0.5">Data Início</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-500 mb-0.5">Data Fim</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-md"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PRÉ-VISUALIZAÇÃO OFICIAL DO RELATÓRIO (Folha A4 formatada para tela e impressão) */}
      <div className="bg-white border border-neutral-300 rounded-xl shadow-md p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0">
        
        {/* CABEÇALHO DA MINHA EMPRESA (Conforme solicitado) */}
        <div className="border-b-2 border-neutral-900 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Logotipo */}
              {company.logoUrl ? (
                <div className="w-20 h-20 border border-neutral-200 rounded-lg p-1 bg-white flex items-center justify-center shrink-0">
                  <img
                    src={company.logoUrl}
                    alt={company.nomeFantasia}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 bg-neutral-900 text-white rounded-lg flex flex-col items-center justify-center shrink-0 p-1">
                  <Car className="w-6 h-6 mb-0.5" />
                  <span className="text-[9px] font-bold tracking-wider">AUTO</span>
                </div>
              )}

              {/* Informações da Empresa */}
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-neutral-950 uppercase tracking-tight">
                  {company.nomeFantasia || company.razaoSocial}
                </h2>
                <p className="text-xs text-neutral-600">
                  <strong className="font-semibold text-neutral-800">Razão Social:</strong> {company.razaoSocial}
                </p>
                <p className="text-xs text-neutral-600">
                  <strong className="font-semibold text-neutral-800">CNPJ:</strong>{' '}
                  <span className="font-mono">{company.cnpj}</span> ·{' '}
                  <strong className="font-semibold text-neutral-800">Telefone:</strong> {company.telefone}
                </p>
                <p className="text-xs text-neutral-600">
                  <strong className="font-semibold text-neutral-800">Endereço:</strong> {company.endereco}
                </p>
                <p className="text-xs text-neutral-600">
                  <strong className="font-semibold text-neutral-800">E-mail:</strong> {company.email}
                </p>
              </div>
            </div>

            {/* Botão de editar empresa na tela (oculto no print) */}
            <div className="print:hidden">
              <button
                onClick={onOpenCompanyModal}
                className="text-[11px] text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded transition-colors"
              >
                Editar Dados da Empresa
              </button>
            </div>
          </div>

          {/* DADOS BANCÁRIOS E PIX NO CABEÇALHO */}
          <div className="mt-3.5 pt-3 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-neutral-50/80 p-2.5 rounded-lg">
            <div className="flex items-center gap-1.5 text-neutral-700">
              <Landmark className="w-4 h-4 text-neutral-600 shrink-0" />
              <span>
                <strong>Dados Bancários:</strong> {company.dadosBancarios.banco} · Ag: {company.dadosBancarios.agencia} · Conta: {company.dadosBancarios.conta}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-700">
              <QrCode className="w-4 h-4 text-neutral-600 shrink-0" />
              <span>
                <strong>Chave PIX ({company.dadosBancarios.tipoChavePix}):</strong>{' '}
                <span className="font-mono font-bold text-neutral-900">{company.dadosBancarios.chavePix}</span>
              </span>
            </div>
          </div>
        </div>

        {/* DADOS DO CLIENTE & PERÍODO */}
        <div className="bg-neutral-100/60 border border-neutral-200 rounded-lg p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
              Cliente / Faturamento
            </span>
            <span className="font-bold text-neutral-900 text-sm block">
              {selectedClient ? selectedClient.nomeFantasia : 'Relatório Geral (Todos os Clientes)'}
            </span>
            {selectedClient && (
              <span className="text-neutral-600 block text-[11px]">
                {selectedClient.razaoSocial}
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
              CNPJ do Cliente
            </span>
            <span className="font-mono text-neutral-800">
              {selectedClient ? selectedClient.cnpj : 'Diversos'}
            </span>
            {selectedClient?.telefone && (
              <span className="text-neutral-600 block text-[11px]">
                Contato: {selectedClient.telefone}
              </span>
            )}
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
              Período & Emissão
            </span>
            <span className="font-bold text-neutral-900 block">{periodLabel}</span>
            <span className="text-neutral-500 text-[11px] block">
              Emitido em: {formatDateTime(new Date().toISOString())}
            </span>
          </div>
        </div>

        {/* DESCRIÇÃO DOS SERVIÇOS REALIZADOS (TABELA COMPLETA COM ASSINATURA) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Detalhamento dos Serviços Automotivos Realizados
            </h3>
            <span className="text-xs text-neutral-500 font-mono">
              {filteredLaunches.length} registro(s) no período
            </span>
          </div>

          <div className="border border-neutral-300 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-neutral-900 text-white font-semibold">
                <tr>
                  <th className="py-2.5 px-3 w-24">Data / Hora</th>
                  <th className="py-2.5 px-3 w-16">OS</th>
                  {!selectedClient && <th className="py-2.5 px-3 w-32">Cliente</th>}
                  <th className="py-2.5 px-3 w-28">Veículo / Placa</th>
                  <th className="py-2.5 px-3 w-16">KM</th>
                  <th className="py-2.5 px-3">Serviços Realizados</th>
                  <th className="py-2.5 px-3 text-right w-24">Valor (R$)</th>
                  <th className="py-2.5 px-3 w-36">Condutor / Matrícula</th>
                  <th className="py-2.5 px-3 text-center w-32">Assinatura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredLaunches.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/70'}
                  >
                    {/* Data / Hora */}
                    <td className="py-2.5 px-3 align-top font-mono text-[11px] text-neutral-700 whitespace-nowrap">
                      {formatDateTime(item.dataHora)}
                    </td>

                    {/* Nº OS */}
                    <td className="py-2.5 px-3 align-top font-mono font-bold text-neutral-900 whitespace-nowrap">
                      {item.numeroOS}
                    </td>

                    {/* Cliente (se geral) */}
                    {!selectedClient && (
                      <td className="py-2.5 px-3 align-top font-medium text-neutral-900">
                        {item.clienteNome}
                      </td>
                    )}

                    {/* Placa e Modelo */}
                    <td className="py-2.5 px-3 align-top">
                      <span className="font-mono font-bold text-neutral-950 block">
                        {item.placa}
                      </span>
                      <span className="text-[11px] text-neutral-600 block line-clamp-1">
                        {item.modelo}
                      </span>
                    </td>

                    {/* KM */}
                    <td className="py-2.5 px-3 align-top font-mono text-neutral-700">
                      {item.km}
                    </td>

                    {/* Serviços Realizados */}
                    <td className="py-2.5 px-3 align-top">
                      <ul className="space-y-0.5">
                        {item.servicos.map((s, sIdx) => (
                          <li key={sIdx} className="text-neutral-800 flex justify-between gap-1">
                            <span>
                              {s.quantidade > 1 ? `${s.quantidade}x ` : ''}
                              {s.nome}
                            </span>
                            <span className="font-mono text-neutral-500 text-[10px]">
                              {formatCurrency(s.subtotal)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {item.observacoes && (
                        <p className="text-[10px] text-neutral-500 italic mt-1">
                          Obs: {item.observacoes}
                        </p>
                      )}
                    </td>

                    {/* Valor Total */}
                    <td className="py-2.5 px-3 align-top text-right font-mono font-bold text-neutral-950 whitespace-nowrap">
                      {formatCurrency(item.valorTotal)}
                    </td>

                    {/* Condutor e Matrícula */}
                    <td className="py-2.5 px-3 align-top">
                      <span className="font-bold text-neutral-900 block leading-tight">
                        {item.nomeCondutor}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500 block">
                        Mat: {item.matriculaCondutor}
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        Resp: {item.responsavel}
                      </span>
                    </td>

                    {/* Imagem da Assinatura Digital do Condutor */}
                    <td className="py-2 px-2 align-middle text-center">
                      {item.assinatura ? (
                        <div className="inline-block border border-neutral-300 rounded bg-white p-0.5 shadow-2xs">
                          <img
                            src={item.assinatura}
                            alt={`Assinatura ${item.nomeCondutor}`}
                            className="h-10 w-28 object-contain"
                          />
                          <span className="block text-[8px] text-neutral-400 uppercase tracking-tighter">
                            Assinado Digitalmente
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-400 italic">
                          (Pendente)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredLaunches.length === 0 && (
                  <tr>
                    <td
                      colSpan={selectedClient ? 8 : 9}
                      className="py-8 text-center text-neutral-400 text-xs"
                    >
                      Nenhum serviço automotivo encontrado para o período e cliente selecionados.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Linha de Totalizador do Período */}
              {filteredLaunches.length > 0 && (
                <tfoot className="bg-neutral-100 font-bold border-t-2 border-neutral-300">
                  <tr>
                    <td
                      colSpan={selectedClient ? 5 : 6}
                      className="py-3 px-3 text-right text-xs uppercase tracking-wider text-neutral-700"
                    >
                      TOTAL GERAL DO PERÍODO ({filteredLaunches.length} ATENDIMENTOS):
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-mono text-neutral-950">
                      {formatCurrency(totalValor)}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-[11px] text-neutral-500 text-center">
                      Valores para fechamento e conciliação
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Rodapé de Conformidade & Assinaturas */}
        <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div>
            <p>
              Declaro que os serviços automotivos descritos acima foram devidamente executados e inspecionados pelos condutores responsáveis.
            </p>
            <p className="font-mono text-[10px] mt-0.5">
              Emitido via Sistema de Controle Operacional AutoLava · Todos os direitos reservados.
            </p>
          </div>

          <div className="text-center sm:text-right shrink-0">
            <div className="border-t border-neutral-400 w-48 mx-auto sm:ml-auto pt-1 mt-6">
              <span className="text-neutral-700 font-semibold block text-[11px]">
                {company.nomeFantasia || company.razaoSocial}
              </span>
              <span className="text-[10px] text-neutral-500">
                Gerência / Controle Operacional
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
