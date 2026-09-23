import React, { useState, useEffect } from 'react';
import { CompanyProfile } from '../types';
import { Building2, Upload, Check, AlertCircle, X, Landmark, QrCode } from 'lucide-react';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  onSave: (updated: CompanyProfile) => void;
  isFirstAccess?: boolean;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  company,
  onSave,
  isFirstAccess = false,
}) => {
  const [formData, setFormData] = useState<CompanyProfile>({ ...company });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...company });
      setErrorMsg('');
    }
  }, [isOpen, company]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('banco_')) {
      const field = name.replace('banco_', '');
      setFormData((prev) => ({
        ...prev,
        dadosBancarios: {
          ...prev.dadosBancarios,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('O logotipo deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          logoUrl: reader.result as string,
        }));
        setErrorMsg('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razaoSocial.trim() || !formData.cnpj.trim()) {
      setErrorMsg('Por favor, informe ao menos a Razão Social e o CNPJ da empresa.');
      return;
    }

    onSave({
      ...formData,
      isConfigured: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-900 text-white rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {isFirstAccess ? 'Configuração Inicial: Dados da Minha Empresa' : 'Editar Dados da Minha Empresa'}
              </h2>
              <p className="text-xs text-neutral-500">
                Essas informações serão exibidas no cabeçalho oficial de relatórios, lançamentos e notas de serviço.
              </p>
            </div>
          </div>
          {!isFirstAccess && (
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Sessão: Identificação e Logotipo */}
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
              1. Identificação & Logotipo da Empresa
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-center p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg">
              <div className="flex flex-col items-center justify-center">
                {formData.logoUrl ? (
                  <div className="relative group w-24 h-24 rounded-lg border border-neutral-300 bg-white overflow-hidden p-1 flex items-center justify-center">
                    <img
                      src={formData.logoUrl}
                      alt="Logotipo"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, logoUrl: '' }))}
                      className="absolute inset-0 bg-black/60 text-white text-[10px] font-medium flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-neutral-300 bg-white flex flex-col items-center justify-center text-neutral-400 text-[11px] gap-1 p-2 text-center">
                    <Upload className="w-5 h-5 text-neutral-400" />
                    <span>Sem logo</span>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Logotipo Oficial da Empresa (PNG / JPG)
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleLogoUpload}
                  className="block w-full text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 cursor-pointer"
                />
                <p className="text-[11px] text-neutral-500">
                  O logo aparecerá no cabeçalho dos relatórios exportados em PDF e formulários de atendimento.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  CNPJ *
                </label>
                <input
                  type="text"
                  name="cnpj"
                  required
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome Fantasia *
                </label>
                <input
                  type="text"
                  name="nomeFantasia"
                  required
                  placeholder="Ex: Auto Brilho Lava Jato"
                  value={formData.nomeFantasia}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Razão Social Completa *
                </label>
                <input
                  type="text"
                  name="razaoSocial"
                  required
                  placeholder="Ex: Auto Brilho Serviços Automotivos e Estética Ltda"
                  value={formData.razaoSocial}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Telefone / WhatsApp Comercial
                </label>
                <input
                  type="text"
                  name="telefone"
                  placeholder="(11) 98765-4321"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  E-mail de Contato / Cobrança
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="contato@minhaempresa.com.br"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Endereço Completo (Rua, Número, Bairro, Cidade - UF, CEP)
                </label>
                <input
                  type="text"
                  name="endereco"
                  placeholder="Av. Principal, 1000 - Galpão 3, Centro, São Paulo - SP, CEP: 01000-000"
                  value={formData.endereco}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>

          {/* Sessão: Dados Bancários e Chave PIX */}
          <div className="pt-2 border-t border-neutral-200">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="w-4 h-4 text-neutral-700" />
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                2. Dados Bancários & Recebimento (PIX e Banco)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Instituição Financeira / Banco
                </label>
                <input
                  type="text"
                  name="banco_banco"
                  placeholder="Ex: Santander (033), Itaú, Bradesco"
                  value={formData.dadosBancarios.banco}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Agência
                </label>
                <input
                  type="text"
                  name="banco_agencia"
                  placeholder="Ex: 1234"
                  value={formData.dadosBancarios.agencia}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Conta Corrente / Dígito
                </label>
                <input
                  type="text"
                  name="banco_conta"
                  placeholder="Ex: 987654-3"
                  value={formData.dadosBancarios.conta}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                  <QrCode className="w-3 h-3 text-neutral-500" />
                  Tipo de Chave PIX
                </label>
                <select
                  name="banco_tipoChavePix"
                  value={formData.dadosBancarios.tipoChavePix}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                >
                  <option value="CNPJ">CNPJ</option>
                  <option value="Email">E-mail</option>
                  <option value="Telefone">Telefone</option>
                  <option value="Aleatória">Chave Aleatória</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Chave PIX
                </label>
                <input
                  type="text"
                  name="banco_chavePix"
                  placeholder="Informe a chave PIX para constar nos relatórios"
                  value={formData.dadosBancarios.chavePix}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
            {!isFirstAccess && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              {isFirstAccess ? 'Salvar e Iniciar Sistema' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
