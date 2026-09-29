import React, { useState, useEffect } from 'react';
import { Mail, Send, Copy, Check, X, Car, Calendar, User, Wrench, MessageSquare, AlertCircle } from 'lucide-react';
import { ServiceLaunch } from '../types';
import { generateLaunchEmailContent, openEmailClient } from '../utils/emailService';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  launch: ServiceLaunch | null;
  defaultEmail?: string;
  companyName?: string;
  onSaveClientEmail?: (clientId: string, newEmail: string) => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  launch,
  defaultEmail = '',
  companyName = 'AutoLava',
  onSaveClientEmail,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveToClient, setSaveToClient] = useState(false);
  const [hasSent, setHasSent] = useState(false);

  useEffect(() => {
    if (isOpen && launch) {
      setRecipientEmail(defaultEmail || '');
      setCopied(false);
      setHasSent(false);
      setSaveToClient(!defaultEmail);
    }
  }, [isOpen, launch, defaultEmail]);

  if (!isOpen || !launch) return null;

  const emailData = generateLaunchEmailContent(launch, recipientEmail, companyName);

  const handleOpenEmail = () => {
    if (!recipientEmail.trim()) {
      alert('Por favor, informe o e-mail de destino do cliente.');
      return;
    }

    // Se o usuário marcou para salvar o e-mail no cadastro do cliente
    if (saveToClient && onSaveClientEmail && launch.clienteId && recipientEmail.trim()) {
      onSaveClientEmail(launch.clienteId, recipientEmail.trim());
    }

    openEmailClient(recipientEmail.trim(), emailData.subject, emailData.body);
    setHasSent(true);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(emailData.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback para navegadores sem API de clipboard
      const textarea = document.createElement('textarea');
      textarea.value = emailData.body;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(emailData.body);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Enviar Comprovante por E-mail
              </h2>
              <p className="text-xs text-neutral-300">
                Ordem de Serviço #{launch.numeroOS} · {launch.clienteNome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Informações Obrigatórias em Destaque */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
            <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-4 h-4 text-blue-600" />
              Dados Inclusos na Mensagem:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-neutral-700">
              <div className="flex items-center gap-1.5 bg-white/90 p-2 rounded-lg border border-blue-100">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-neutral-400 block">Data e Hora</span>
                  <span className="font-semibold text-neutral-900 text-[11px] truncate">
                    {new Date(launch.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white/90 p-2 rounded-lg border border-blue-100">
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-neutral-400 block">Condutor</span>
                  <span className="font-semibold text-neutral-900 text-[11px] truncate">
                    {launch.nomeCondutor}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white/90 p-2 rounded-lg border border-blue-100">
                <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-neutral-400 block">Serviços</span>
                  <span className="font-semibold text-neutral-900 text-[11px] truncate">
                    {launch.servicos.length} realizado{launch.servicos.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Campo E-mail do Cliente */}
          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1">
              E-mail do Cliente Cadastrado:
            </label>
            <div className="relative">
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="exemplo@cliente.com.br"
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-neutral-900"
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            </div>

            {defaultEmail ? (
              <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                E-mail cadastrado na ficha de {launch.clienteNome}
              </p>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveEmailCheck"
                  checked={saveToClient}
                  onChange={(e) => setSaveToClient(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-neutral-300"
                />
                <label htmlFor="saveEmailCheck" className="text-[11px] text-neutral-600 cursor-pointer">
                  Salvar este e-mail no cadastro permanente do cliente <strong>{launch.clienteNome}</strong>
                </label>
              </div>
            )}
          </div>

          {/* Assunto */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Assunto do E-mail:
            </label>
            <input
              type="text"
              readOnly
              value={emailData.subject}
              className="w-full px-3 py-2 text-xs bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-700 font-medium select-all"
            />
          </div>

          {/* Pré-visualização da Mensagem */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-700">
                Texto da Mensagem a ser Enviada:
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar texto
                  </>
                )}
              </button>
            </div>

            <pre className="p-3 bg-neutral-900 text-neutral-100 font-mono text-[11px] rounded-xl overflow-x-auto max-h-48 border border-neutral-800 whitespace-pre-wrap leading-relaxed select-all">
              {emailData.body}
            </pre>
          </div>

          {hasSent && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cliente de e-mail acionado! O comprovante foi gerado e preenchido.</span>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-xl order-2 sm:order-1 transition-colors"
          >
            Fechar
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 order-1 sm:order-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              title="Também é possível enviar pelo WhatsApp"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              WhatsApp
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="px-3.5 py-2.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>

            <button
              type="button"
              onClick={handleOpenEmail}
              disabled={!recipientEmail.trim()}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Send className="w-4 h-4" />
              Abrir no E-mail (Gmail / Outlook)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
