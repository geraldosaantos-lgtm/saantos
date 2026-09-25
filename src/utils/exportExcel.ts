import * as XLSX from 'xlsx';
import { CompanyProfile, Client, ServiceLaunch } from '../types';
import { formatCurrency, formatDateTime } from './storage';

export const exportReportToExcel = (
  company: CompanyProfile,
  selectedClient: Client | null,
  periodLabel: string,
  launches: ServiceLaunch[]
) => {
  const wb = XLSX.utils.book_new();

  // Cabeçalho da Empresa
  const rows: (string | number)[][] = [
    ['RELATÓRIO OPERACIONAL DE SERVIÇOS AUTOMOTIVOS'],
    [''],
    ['DADOS DO PRESTADOR DE SERVIÇOS (MINHA EMPRESA)'],
    ['Empresa:', company.nomeFantasia || company.razaoSocial],
    ['Razão Social:', company.razaoSocial],
    ['CNPJ:', company.cnpj],
    ['Telefone / E-mail:', `${company.telefone} | ${company.email}`],
    ['Endereço:', company.endereco],
    ['Dados Bancários:', `${company.dadosBancarios.banco} | Ag: ${company.dadosBancarios.agencia} | CC: ${company.dadosBancarios.conta}`],
    ['Chave PIX:', `${company.dadosBancarios.chavePix} (${company.dadosBancarios.tipoChavePix})`],
    [''],
    ['DADOS DO CLIENTE / FROTA'],
    ['Cliente:', selectedClient ? `${selectedClient.nomeFantasia} (${selectedClient.razaoSocial})` : 'Todos os Clientes'],
    ['CNPJ:', selectedClient ? selectedClient.cnpj : '-'],
    ['Período do Relatório:', periodLabel],
    ['Data de Emissão:', formatDateTime(new Date().toISOString())],
    ['Total de Lançamentos:', launches.length],
    [''],
    // Cabeçalho da tabela de dados
    [
      'Data / Hora',
      'Nº OS',
      'Cliente',
      'Contrato / Centro de Custo',
      'Placa',
      'Modelo do Veículo',
      'KM',
      'Serviços Realizados',
      'Valor Total (R$)',
      'Condutor',
      'Matrícula',
      'Responsável Atendimento',
      'Assinatura Coletada',
      'Observações',
    ],
  ];

  let totalGeral = 0;

  launches.forEach((l) => {
    totalGeral += l.valorTotal;
    const servicosTexto = l.servicos.map((s) => `${s.nome} (${formatCurrency(s.preco)})`).join('; ');
    const temAssinatura = l.assinatura ? 'Sim (Assinado Digitalmente)' : 'Pendente';

    rows.push([
      formatDateTime(l.dataHora),
      l.numeroOS,
      l.clienteNome,
      l.contratoCentroCusto || '-',
      l.placa,
      l.modelo,
      l.km,
      servicosTexto,
      Number(l.valorTotal.toFixed(2)),
      l.nomeCondutor,
      l.matriculaCondutor,
      l.responsavel,
      temAssinatura,
      l.observacoes || '-',
    ]);
  });

  // Linha de total
  rows.push(['']);
  rows.push([
    'TOTAL GERAL DO PERÍODO',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    Number(totalGeral.toFixed(2)),
    '',
    '',
    '',
    '',
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Configuração de largura de colunas
  ws['!cols'] = [
    { wch: 18 }, // Data/Hora
    { wch: 12 }, // OS
    { wch: 26 }, // Cliente
    { wch: 24 }, // Contrato / Centro de Custo
    { wch: 12 }, // Placa
    { wch: 22 }, // Modelo
    { wch: 10 }, // KM
    { wch: 40 }, // Serviços
    { wch: 16 }, // Valor
    { wch: 24 }, // Condutor
    { wch: 14 }, // Matrícula
    { wch: 22 }, // Responsável
    { wch: 24 }, // Assinatura
    { wch: 30 }, // Observações
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Serviços');

  const sanitizedPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Relatorio_Servicos_${sanitizedPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
};
