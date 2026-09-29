import { ServiceLaunch } from '../types';
import { formatCurrency, formatDateTime } from './storage';

export interface EmailContent {
  to: string;
  subject: string;
  body: string;
}

/**
 * Gera o assunto e o corpo formatado do e-mail de comprovante de atendimento
 * Contendo obrigatoriamente: Data e Hora, Condutor e Serviços Realizados.
 */
export function generateLaunchEmailContent(
  launch: ServiceLaunch,
  clientEmail: string = '',
  companyName: string = 'AutoLava'
): EmailContent {
  const dataHoraFormatada = formatDateTime(launch.dataHora);
  const condutorFormatado = launch.matriculaCondutor && launch.matriculaCondutor !== 'S/N'
    ? `${launch.nomeCondutor} (Matrícula: ${launch.matriculaCondutor})`
    : launch.nomeCondutor;

  const listaServicos = launch.servicos
    .map(
      (s) =>
        `  • ${s.nome} (${s.quantidade}x) - ${formatCurrency(s.subtotal)}`
    )
    .join('\n');

  const subject = `Comprovante de Atendimento - OS #${launch.numeroOS} - ${launch.placa} - ${companyName}`;

  const body = `Olá, ${launch.clienteNome || 'Cliente'}!

Confirmamos a realização do atendimento do seu veículo:

══════════════════════════════════════════
📋 COMPROVANTE DE ORDEM DE SERVIÇO #${launch.numeroOS}
══════════════════════════════════════════

📅 DATA E HORA DO ATENDIMENTO:
${dataHoraFormatada}

👤 CONDUTOR RESPONSÁVEL PELO VEÍCULO:
${condutorFormatado}

🚗 VEÍCULO ATENDIDO:
Placa: ${launch.placa}
Modelo: ${launch.modelo}${launch.km && launch.km !== '0' ? `\nQuilometragem (KM): ${launch.km}` : ''}${
    launch.contratoCentroCusto ? `\nContrato / Centro de Custo: ${launch.contratoCentroCusto}` : ''
  }

🛠️ SERVIÇOS REALIZADOS:
${listaServicos}

💰 VALOR TOTAL: ${formatCurrency(launch.valorTotal)}
👨‍🔧 RESPONSÁVEL OPERACIONAL: ${launch.responsavel}
${launch.observacoes ? `\n📝 OBSERVAÇÕES:\n${launch.observacoes}\n` : ''}
✍️ Assinatura digital do condutor coletada e arquivada com sucesso.

──────────────────────────────────────────
Atendimento realizado por ${companyName}.
Agradecemos a preferência e confiança!
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
