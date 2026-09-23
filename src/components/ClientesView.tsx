import React, { useState } from 'react';
import { Client, ServiceItem } from '../types';
import { formatCurrency } from '../utils/storage';
import { ConfirmModal } from './ConfirmModal';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Check,
  X,
  Building,
  Phone,
  Mail,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';

interface ClientesViewProps {
  clients: Client[];
  services: ServiceItem[];
  onSaveClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  clients,
  services,
  onSaveClient,
  onDeleteClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    id: string;
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
    email: string;
    telefone: string;
    endereco: string;
    tabelaPrecos: Record<string, number>;
  }>({
    id: '',
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    email: '',
    telefone: '',
    endereco: '',
    tabelaPrecos: {},
  });

  const [activeTab, setActiveTab] = useState<'dados' | 'precos'>('dados');
  const [errorMsg, setErrorMsg] = useState('');

  const filteredClients = clients.filter(
    (c) =>
      c.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm)
  );

  const handleOpenNew = () => {
    // Inicializa a tabela de preços do novo cliente com os preços padrão dos serviços
    const defaultPrices: Record<string, number> = {};
    services.forEach((s) => {
      defaultPrices[s.id] = s.precoPadrao;
    });

    setFormData({
      id: '',
      cnpj: '',
      razaoSocial: '',
      nomeFantasia: '',
      email: '',
      telefone: '',
      endereco: '',
      tabelaPrecos: defaultPrices,
    });
    setEditingClient(null);
    setActiveTab('dados');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    // Garante que serviços novos não cadastrados previamente também apareçam
    const mergedPrices = { ...client.tabelaPrecos };
    services.forEach((s) => {
      if (mergedPrices[s.id] === undefined) {
        mergedPrices[s.id] = s.precoPadrao;
      }
    });

    setFormData({
      id: client.id,
      cnpj: client.cnpj,
      razaoSocial: client.razaoSocial,
      nomeFantasia: client.nomeFantasia,
      email: client.email,
      telefone: client.telefone,
      endereco: client.endereco || '',
      tabelaPrecos: mergedPrices,
    });
    setEditingClient(client);
    setActiveTab('dados');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handlePriceChange = (serviceId: string, val: string) => {
    const num = parseFloat(val);
    setFormData((prev) => ({
      ...prev,
      tabelaPrecos: {
        ...prev.tabelaPrecos,
        [serviceId]: isNaN(num) ? 0 : num,
      },
    }));
  };

  const handleApplyDiscount = (percent: number) => {
    const factor = (100 - percent) / 100;
    const updated: Record<string, number> = {};
    services.forEach((s) => {
      updated[s.id] = Math.round(s.precoPadrao * factor * 100) / 100;
    });
    setFormData((prev) => ({
      ...prev,
      tabelaPrecos: updated,
    }));
  };

  const handleResetToStandard = () => {
    const standard: Record<string, number> = {};
    services.forEach((s) => {
      standard[s.id] = s.precoPadrao;
    });
    setFormData((prev) => ({
      ...prev,
      tabelaPrecos: standard,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomeFantasia.trim() || !formData.cnpj.trim()) {
      setErrorMsg('Informe ao menos o CNPJ e o Nome Fantasia do cliente.');
      return;
    }

    const clientToSave: Client = {
      id: formData.id || `cli-${Date.now()}`,
      cnpj: formData.cnpj.trim(),
      razaoSocial: formData.razaoSocial.trim() || formData.nomeFantasia.trim(),
      nomeFantasia: formData.nomeFantasia.trim(),
      email: formData.email.trim(),
      telefone: formData.telefone.trim(),
      endereco: formData.endereco.trim(),
      tabelaPrecos: formData.tabelaPrecos,
      ativo: true,
      criadoEm: editingClient ? editingClient.criadoEm : new Date().toISOString().slice(0, 10),
    };

    onSaveClient(clientToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Cadastro de Clientes</h1>
          <p className="text-xs text-neutral-500">
            Gerencie empresas, frotas e configure a tabela de preços exclusiva para cada cliente.
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Cliente
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-lg max-w-md shadow-xs">
        <Search className="w-4 h-4 text-neutral-400 shrink-0" />
        <input
          type="text"
          placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs text-neutral-800 bg-transparent focus:outline-none"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-neutral-400 hover:text-neutral-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Lista / Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const totalCustomPrices = Object.keys(client.tabelaPrecos || {}).length;
          return (
            <div
              key={client.id}
              className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-all flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-neutral-100 rounded-lg text-neutral-800">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                        {client.nomeFantasia}
                      </h3>
                      <p className="text-[11px] text-neutral-500 font-mono">{client.cnpj}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(client)}
                      title="Editar Cliente e Tabela de Preços"
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setClientToDelete(client)}
                      title="Excluir Cliente"
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-neutral-600 space-y-1.5 pt-1">
                  <p className="line-clamp-1">
                    <span className="text-neutral-400">Razão Social:</span> {client.razaoSocial}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-neutral-400" />
                    <span>{client.telefone || 'Sem telefone'}</span>
                  </p>
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-neutral-400" />
                    <span className="truncate">{client.email || 'Sem e-mail'}</span>
                  </p>
                </div>
              </div>

              {/* Tabela de Preços do Cliente */}
              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                <span className="text-neutral-500 flex items-center gap-1 text-[11px]">
                  <Receipt className="w-3.5 h-3.5 text-neutral-400" />
                  {totalCustomPrices} serviços tarifados
                </span>
                <button
                  onClick={() => {
                    handleOpenEdit(client);
                    setActiveTab('precos');
                  }}
                  className="text-xs font-semibold text-neutral-900 hover:underline flex items-center gap-1"
                >
                  <Tag className="w-3 h-3 text-neutral-500" />
                  Ver Tabela de Preços
                </button>
              </div>
            </div>
          );
        })}

        {filteredClients.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white border border-neutral-200 rounded-xl">
            <Users className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-800">Nenhum cliente encontrado</p>
            <p className="text-xs text-neutral-500 mt-1">
              Cadastre seus clientes frotistas ou particulares com tabelas de valores personalizadas.
            </p>
            <button
              onClick={handleOpenNew}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar Primeiro Cliente
            </button>
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição com Tabela de Valores */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden my-4">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  {editingClient ? `Editar: ${editingClient.nomeFantasia}` : 'Novo Cadastro de Cliente'}
                </h2>
                <p className="text-xs text-neutral-500">
                  Configure os dados cadastrais e a tabela de preços específica deste cliente.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-neutral-200 bg-white px-6">
              <button
                type="button"
                onClick={() => setActiveTab('dados')}
                className={`py-3 text-xs font-semibold border-b-2 mr-6 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'dados'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                1. Dados Cadastrais (CNPJ, Razão, Contato)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('precos')}
                className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'precos'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                2. Tabela de Valores dos Serviços
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-3 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
              {activeTab === 'dados' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        CNPJ *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="00.000.000/0000-00"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Nome Fantasia *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Expresso Logística"
                        value={formData.nomeFantasia}
                        onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Razão Social *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Expresso Logística e Transportes Rodoviários S/A"
                        value={formData.razaoSocial}
                        onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        placeholder="frotas@cliente.com.br"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="(11) 3210-9000"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Endereço Completo
                      </label>
                      <input
                        type="text"
                        placeholder="Rua, Número, Bairro, Cidade - UF"
                        value={formData.endereco}
                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('precos')}
                      className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
                    >
                      Próximo: Configurar Tabela de Preços deste Cliente →
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'precos' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs">
                    <div>
                      <span className="font-semibold text-neutral-900">
                        Preços Exclusivos para: {formData.nomeFantasia || 'Este Cliente'}
                      </span>
                      <p className="text-[11px] text-neutral-500">
                        Cada cliente tem sua própria tabela negociada. Ajuste o valor de cada serviço abaixo.
                      </p>
                    </div>
                    {/* Ações rápidas de desconto */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApplyDiscount(10)}
                        className="px-2 py-1 bg-white border border-neutral-300 hover:bg-neutral-100 rounded text-[11px] font-medium"
                      >
                        -10% Frota
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyDiscount(15)}
                        className="px-2 py-1 bg-white border border-neutral-300 hover:bg-neutral-100 rounded text-[11px] font-medium"
                      >
                        -15% Volume
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToStandard}
                        className="px-2 py-1 bg-white border border-neutral-300 hover:bg-neutral-100 rounded text-[11px] font-medium text-neutral-600"
                      >
                        Copiar Padrão
                      </button>
                    </div>
                  </div>

                  <div className="border border-neutral-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                        <tr>
                          <th className="py-2 px-3 font-semibold">Serviço Cadastrado</th>
                          <th className="py-2 px-3 font-semibold w-28">Categoria</th>
                          <th className="py-2 px-3 font-semibold text-right w-28">Preço Padrão</th>
                          <th className="py-2 px-3 font-semibold text-right w-36">
                            Preço do Cliente (R$)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {services.map((srv) => {
                          const customVal = formData.tabelaPrecos[srv.id] !== undefined
                            ? formData.tabelaPrecos[srv.id]
                            : srv.precoPadrao;

                          const diff = customVal - srv.precoPadrao;

                          return (
                            <tr key={srv.id} className="hover:bg-neutral-50">
                              <td className="py-2.5 px-3">
                                <span className="font-medium text-neutral-900 block">{srv.nome}</span>
                                <span className="text-[10px] text-neutral-400 font-mono">{srv.codigo}</span>
                              </td>
                              <td className="py-2.5 px-3 text-neutral-500 text-[11px]">
                                {srv.categoria}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-neutral-500">
                                {formatCurrency(srv.precoPadrao)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-neutral-400 text-xs">R$</span>
                                  <input
                                    type="number"
                                    step="0.50"
                                    min="0"
                                    value={customVal}
                                    onChange={(e) => handlePriceChange(srv.id, e.target.value)}
                                    className="w-24 text-right px-2 py-1 border border-neutral-300 rounded text-xs font-mono font-bold focus:ring-1 focus:ring-neutral-900"
                                  />
                                </div>
                                {diff !== 0 && (
                                  <span
                                    className={`text-[10px] block mt-0.5 ${
                                      diff < 0 ? 'text-emerald-600' : 'text-amber-600'
                                    }`}
                                  >
                                    {diff < 0
                                      ? `Desconto de ${formatCurrency(Math.abs(diff))}`
                                      : `Acréscimo de ${formatCurrency(diff)}`}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Salvar Cliente e Tabela de Preços
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Cliente */}
      <ConfirmModal
        isOpen={Boolean(clientToDelete)}
        title="Excluir Cliente"
        message={
          clientToDelete
            ? `Tem certeza que deseja remover o cliente "${clientToDelete.nomeFantasia}" (${clientToDelete.cnpj})? Suas tabelas de preços personalizadas também serão excluídas.`
            : ''
        }
        confirmLabel="Sim, Excluir Cliente"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (clientToDelete) {
            onDeleteClient(clientToDelete.id);
            setClientToDelete(null);
          }
        }}
        onCancel={() => setClientToDelete(null)}
      />
    </div>
  );
};
