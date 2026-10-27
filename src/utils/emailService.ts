import { ServiceLaunch } from '../types';
import { formatCurrency, formatDateTime, normalizeServiceCategory } from './storage';

export interface EmailContent {
  to: string;
  subject: string;
  body: string;
}

/**
 * Gera o assunto e o corpo formatado do e-mail de comprovante de atendimento
 * Contendo obrigatoriamente: Data e Hora, Condutor e Serviços Realizados com Classe.
 */
export function generateLaunchEmailContent(
  launch: ServiceLaunch,
  clientEmail: string = '',
  companyName: string = 'AUTOLAVA'
): EmailContent {
  const dataHoraFormatada = formatDateTime(launch.dataHora);
  const condutorUpper = (launch.nomeCondutor || '').toUpperCase();
  const matUpper = (launch.matriculaCondutor || '').toUpperCase();
  const condutorFormatado =
    matUpper && matUpper !== 'S/N'
      ? `${condutorUpper} (MATRÍCULA: ${matUpper})`
      : condutorUpper;

  const listaServicos = launch.servicos
    .map(
      (s) =>
        `  • ${(s.nome || '').toUpperCase()} [CLASSE: ${normalizeServiceCategory(s.categoria)}] (${s.quantidade}X) - ${formatCurrency(s.subtotal)}`
    )
    .join('\n');

  const companyUpper = (companyName || 'AUTOLAVA').toUpperCase();
  const subject = `COMPROVANTE DE ATENDIMENTO - OS #${(launch.numeroOS || '').toUpperCase()} - ${(launch.placa || '').toUpperCase()} - ${companyUpper}`;

  const body = `OLÁ, ${(launch.clienteNome || 'CLIENTE').toUpperCase()}!

CONFIRMAMOS A REALIZAÇÃO DO ATENDIMENTO DO SEU VEÍCULO:

══════════════════════════════════════════
📋 COMPROVANTE DE ORDEM DE SERVIÇO #${(launch.numeroOS || '').toUpperCase()}
══════════════════════════════════════════

📅 DATA E HORA DO ATENDIMENTO:
${dataHoraFormatada}

👤 CONDUTOR RESPONSÁVEL PELO VEÍCULO:
${condutorFormatado}

🚗 VEÍCULO ATENDIDO:
PLACA: ${(launch.placa || '').toUpperCase()}
MODELO: ${(launch.modelo || '').toUpperCase()}${launch.km && launch.km !== '0' ? `\nQUILOMETRAGEM (KM): ${String(launch.km).toUpperCase()}` : ''}${
    launch.contratoCentroCusto ? `\nCONTRATO / CENTRO DE CUSTO: ${launch.contratoCentroCusto.toUpperCase()}` : ''
  }

🛠️ SERVIÇOS REALIZADOS & CLASSE:
${listaServicos}

💰 VALOR TOTAL: ${formatCurrency(launch.valorTotal)}
👨‍🔧 RESPONSÁVEL OPERACIONAL: ${(launch.responsavel || '').toUpperCase()}
${launch.observacoes ? `\n📝 OBSERVAÇÕES:\n${launch.observacoes.toUpperCase()}\n` : ''}
✍️ ASSINATURA DIGITAL DO CONDUTOR COLETADA E ARQUIVADA COM SUCESSO.

──────────────────────────────────────────
ATENDIMENTO REALIZADO POR ${companyUpper}.
AGRADECEMOS A PREFERÊNCIA E CONFIANÇA!
`;

  return {
    to: clientEmail.trim(),
    subject,
    body,
  };
}

/**
 * Cria a URL mailto com tratamento correto de caracteres especiais
 */
export function buildMailtoUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams();
  if (subject) params.append('subject', subject);
  if (body) params.append('body', body);

  const query = params.toString().replace(/\+/g, '%20');
  return `mailto:${encodeURIComponent(to)}?${query}`;
}

/**
 * Abre o cliente de e-mail padrão do sistema operacional ou celular
 */
export function openEmailClient(to: string, subject: string, body: string): void {
  const mailtoUrl = buildMailtoUrl(to, subject, body);
  // Usa um link temporário para evitar bloqueio de popup em navegadores móveis
  const link = document.createElement('a');
  link.href = mailtoUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
