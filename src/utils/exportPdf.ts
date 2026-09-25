import { jsPDF } from 'jspdf';
import { CompanyProfile, Client, ServiceLaunch } from '../types';
import { formatCurrency, formatDateTime } from './storage';

export const exportReportToPdf = (
  company: CompanyProfile,
  selectedClient: Client | null,
  periodLabel: string,
  launches: ServiceLaunch[]
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let currentY = margin;

  const drawHeader = (pageNumber: number) => {
    // Fundo sutil do cabeçalho da empresa
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(margin, margin, pageWidth - margin * 2, 34, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.rect(margin, margin, pageWidth - margin * 2, 34, 'S');

    // Logo ou ícone da empresa
    if (company.logoUrl && company.logoUrl.startsWith('data:image')) {
      try {
        doc.addImage(company.logoUrl, 'PNG', margin + 3, margin + 3, 28, 28);
      } catch {
        // Fallback se imagem tiver formato incompatível
        doc.setFillColor(30, 41, 59);
        doc.circle(margin + 16, margin + 16, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('AUTO', margin + 11, margin + 17);
      }
    } else {
      // Ícone decorativo elegante
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(margin + 3, margin + 4, 26, 26, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('LAVA', margin + 8, margin + 16);
      doc.text('JATO', margin + 8, margin + 22);
    }

    const headerTextX = margin + 33;
    // Dados da Minha Empresa no Cabeçalho
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(company.nomeFantasia || company.razaoSocial, headerTextX, margin + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Razão Social: ${company.razaoSocial}   |   CNPJ: ${company.cnpj}`, headerTextX, margin + 12);
    doc.text(`Endereço: ${company.endereco}`, headerTextX, margin + 17);
    doc.text(`Contato: ${company.telefone}   |   E-mail: ${company.email}`, headerTextX, margin + 22);

    // Dados Bancários e PIX no cabeçalho
    const bankStr = `Banco: ${company.dadosBancarios.banco} | Ag: ${company.dadosBancarios.agencia} | CC: ${company.dadosBancarios.conta} | PIX (${company.dadosBancarios.tipoChavePix}): ${company.dadosBancarios.chavePix}`;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text(bankStr, headerTextX, margin + 28);

    // Box lateral com info do cliente e período
    const clientBoxWidth = 85;
    const clientBoxX = pageWidth - margin - clientBoxWidth;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(clientBoxX, margin + 2, clientBoxWidth, 30, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(clientBoxX, margin + 2, clientBoxWidth, 30, 1.5, 1.5, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('RELATÓRIO DE SERVIÇOS', clientBoxX + 4, margin + 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(7.5);
    doc.text(`Período: ${periodLabel}`, clientBoxX + 4, margin + 12);
    
    const clientText = selectedClient ? selectedClient.nomeFantasia : 'Todos os Clientes';
    doc.text(`Cliente: ${clientText}`, clientBoxX + 4, margin + 17);
    if (selectedClient?.cnpj) {
      doc.text(`CNPJ Cliente: ${selectedClient.cnpj}`, clientBoxX + 4, margin + 22);
    }
    doc.text(`Emissão: ${formatDateTime(new Date().toISOString())} | Pág. ${pageNumber}`, clientBoxX + 4, margin + 27);
  };

  let pageNumber = 1;
  drawHeader(pageNumber);
  currentY = margin + 38;

  // Cabeçalho das Colunas da Tabela
  const tableHeaders = [
    { title: 'Data/Hora', width: 23, align: 'left' },
    { title: 'OS', width: 16, align: 'left' },
    { title: 'Contrato / CC', width: 26, align: 'left' },
    { title: 'Veículo (Placa / Modelo)', width: 40, align: 'left' },
    { title: 'KM', width: 14, align: 'left' },
    { title: 'Serviços Realizados', width: 56, align: 'left' },
    { title: 'Valor', width: 22, align: 'right' },
    { title: 'Condutor / Matrícula', width: 42, align: 'left' },
    { title: 'Assinatura', width: 34, align: 'center' },
  ];

  const drawTableHeader = (yPos: number) => {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, yPos, pageWidth - margin * 2, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');

    let x = margin + 2;
    tableHeaders.forEach((col) => {
      if (col.align === 'right') {
        doc.text(col.title, x + col.width - 2, yPos + 4.8, { align: 'right' });
      } else if (col.align === 'center') {
        doc.text(col.title, x + col.width / 2, yPos + 4.8, { align: 'center' });
      } else {
        doc.text(col.title, x, yPos + 4.8);
      }
      x += col.width;
    });
  };

  drawTableHeader(currentY);
  currentY += 8;

  let totalGeral = 0;
  const rowHeight = 15; // Altura para acomodar texto e assinatura

  launches.forEach((launch, idx) => {
    totalGeral += launch.valorTotal;

    // Checar quebra de página
    if (currentY + rowHeight > pageHeight - 16) {
      doc.addPage();
      pageNumber++;
      drawHeader(pageNumber);
      currentY = margin + 38;
      drawTableHeader(currentY);
      currentY += 8;
    }

    // Fundo zebra
    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

    let x = margin + 2;

    // 1. Data/Hora
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    const dateFormatted = formatDateTime(launch.dataHora).split(' ');
    doc.text(dateFormatted[0] || '', x, currentY + 5);
    doc.text(dateFormatted[1] || '', x, currentY + 9);
    x += tableHeaders[0].width;

    // 2. OS
    doc.setFont('helvetica', 'bold');
    doc.text(launch.numeroOS, x, currentY + 6);
    x += tableHeaders[1].width;

    // 3. Contrato / Centro de Custo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    const ccText = launch.contratoCentroCusto || '-';
    const splitCC = doc.splitTextToSize(ccText, tableHeaders[2].width - 2);
    doc.text(splitCC.slice(0, 2), x, currentY + 5);
    x += tableHeaders[2].width;

    // 4. Veículo (Placa / Modelo)
    doc.setFont('helvetica', 'bold');
    doc.text(launch.placa, x, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const splitModelo = doc.splitTextToSize(launch.modelo, tableHeaders[3].width - 3);
    doc.text(splitModelo[0] || '', x, currentY + 9);
    x += tableHeaders[3].width;

    // 5. KM
    doc.setFontSize(7);
    doc.text(`${launch.km} km`, x, currentY + 6);
    x += tableHeaders[4].width;

    // 6. Serviços Realizados
    doc.setFontSize(6.5);
    const servStr = launch.servicos.map((s) => s.nome).join(', ');
    const splitServ = doc.splitTextToSize(servStr, tableHeaders[5].width - 3);
    doc.text(splitServ.slice(0, 2), x, currentY + 5);
    x += tableHeaders[5].width;

    // 7. Valor Total
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(launch.valorTotal), x + tableHeaders[6].width - 2, currentY + 6, {
      align: 'right',
    });
    x += tableHeaders[6].width;

    // 8. Condutor / Matrícula
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    const splitCond = doc.splitTextToSize(launch.nomeCondutor, tableHeaders[7].width - 3);
    doc.text(splitCond[0] || '', x, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Matrícula: ${launch.matriculaCondutor}`, x, currentY + 9);
    x += tableHeaders[7].width;

    // 9. Assinatura do Condutor
    if (launch.assinatura && launch.assinatura.startsWith('data:image')) {
      try {
        doc.addImage(launch.assinatura, 'PNG', x + 2, currentY + 1.5, 30, 11);
      } catch {
        doc.setFontSize(6);
        doc.text('[Assinatura Válida]', x + 5, currentY + 7);
      }
    } else {
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text('(Pendente)', x + 8, currentY + 7);
    }

    currentY += rowHeight;
  });

  // Linha de Resumo / Total
  if (currentY + 14 > pageHeight - margin) {
    doc.addPage();
    pageNumber++;
    drawHeader(pageNumber);
    currentY = margin + 40;
  }

  currentY += 3;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, pageWidth - margin * 2, 8, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin, currentY, pageWidth - margin * 2, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTALIZADOR DO PERÍODO: ${launches.length} SERVIÇOS REALIZADOS`, margin + 4, currentY + 5.5);

  doc.text(
    `VALOR TOTAL: ${formatCurrency(totalGeral)}`,
    pageWidth - margin - 6,
    currentY + 5.5,
    { align: 'right' }
  );

  // Rodapé
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Documento comprobatório emitido eletronicamente com assinaturas digitais dos condutores de frotas.',
    margin,
    pageHeight - 6
  );

  const sanitizedPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Relatorio_LavaJato_${sanitizedPeriod}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};
