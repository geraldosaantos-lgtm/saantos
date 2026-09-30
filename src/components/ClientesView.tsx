import React, { useState } from 'react';
import { Client, ServiceItem, ClientVehicle, ServiceLaunch } from '../types';
import {
  formatCurrency,
  formatPlate,
  normalizePlate,
  findPlateOwner,
  getAllRegisteredVehicles,
  FlatVehicleItem,
  formatDate,
} from '../utils/storage';
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
  FileSpreadsheet,
  Car,
  AlertCircle,
  PlusCircle,
  ShieldAlert,
  Filter,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface ClientesViewProps {
  clients: Client[];
  services: ServiceItem[];
  launches?: ServiceLaunch[];
  onSaveClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  clients,
  services,
  launches = [],
  onSaveClient,
  onDeleteClient,
}) => {
  const [viewSection, setViewSection] = useState<'clientes' | 'veiculos'>('clientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchVehicleTerm, setSearchVehicleTerm] = useState('');
  const [clientFilterForVehicles, setClientFilterForVehicles] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Estado para cadastro rápido de veículos
  const [isQuickVehicleModalOpen, setIsQuickVehicleModalOpen] = useState(false);
  const [quickVehicleClientId, setQuickVehicleClientId] = useState('');
  const [quickVehiclePlate, setQuickVehiclePlate] = useState('');
  const [quickVehicleModel, setQuickVehicleModel] = useState('');
  const [quickVehicleError, setQuickVehicleError] = useState('');

  // Estado para exclusão/desvinculação de veículo
  const [vehicleToDelete, setVehicleToDelete] = useState<{
    clientId: string;
    placa: string;
    modelo: string;
    clientName: string;
  } | null>(null);

  // Form State do Cliente
  const [formData, setFormData] = useState<{
    id: string;
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
    email: string;
    telefone: string;
    endereco: string;
    tabelaPrecos: Record<string, number>;
    veiculos: ClientVehicle[];
  }>({
    id: '',
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    email: '',
    telefone: '',
    endereco: '',
    tabelaPrecos: {},
    veiculos: [],
  });

  const [activeTab, setActiveTab] = useState<'dados' | 'veiculos' | 'precos'>('dados');
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para inclusão de novos veículos na frota dentro do modal do cliente
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [vehicleError, setVehicleError] = useState('');

  // Lista geral de todos os veículos de todos os clientes
  const allRegisteredVehicles = getAllRegisteredVehicles(clients);

  const filteredVehicles = allRegisteredVehicles.filter((v) => {
    const term = searchVehicleTerm.toLowerCase();
    const matchesSearch =
      !term ||
      v.placa.toLowerCase().includes(term) ||
      normalizePlate(v.placa).includes(normalizePlate(term)) ||
      v.modelo.toLowerCase().includes(term) ||
      v.clientNome.toLowerCase().includes(term) ||
      v.clientCnpj.includes(term);

    const matchesClient = !clientFilterForVehicles || v.clientId === clientFilterForVehicles;
    return matchesSearch && matchesClient;
  });

  const filteredClients = clients.filter(
    (c) =>
      c.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm) ||
      (Array.isArray(c.veiculos) &&
        c.veiculos.some(
          (v) =>
            v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
        ))
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
      veiculos: [],
    });
    setEditingClient(null);
    setActiveTab('dados');
    setErrorMsg('');
    setVehicleError('');
    setNewVehiclePlate('');
    setNewVehicleModel('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client, tab: 'dados' | 'veiculos' | 'precos' = 'dados') => {
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
      veiculos: Array.isArray(client.veiculos) ? [...client.veiculos] : [],
    });
    setEditingClient(client);
    setActiveTab(tab);
    setErrorMsg('');
    setVehicleError('');
    setNewVehiclePlate('');
    setNewVehicleModel('');
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

  // Adiciona veículo à frota do cliente com checagem de exclusividade entre clientes
  const handleAddVehicle = () => {
    setVehicleError('');
    const clean = normalizePlate(newVehiclePlate);
    if (clean.length < 7) {
      setVehicleError('A placa deve ter pelo menos 7 caracteres (ex: ABC-1234 ou ABC1D23).');
      return;
    }
    if (!newVehicleModel.trim()) {
      setVehicleError('Informe o modelo do veículo (ex: Fiat Strada, VW Gol, Mercedes Accelo).');
      return;
    }

    const formattedPlate = formatPlate(newVehiclePlate);

    // 1. Checa se este veículo já está na lista deste mesmo cliente
    const alreadyHere = formData.veiculos.some((v) => normalizePlate(v.placa) === clean);
    if (alreadyHere) {
      setVehicleError(`A placa ${formattedPlate} já está cadastrada na frota deste cliente.`);
      return;
    }

    // 2. REGRA DE EXCLUSIVIDADE: Checa se a placa pertence a OUTRO cliente no sistema ou se já foi lançada
    const otherOwner = findPlateOwner(newVehiclePlate, clients, formData.id, launches);
    if (otherOwner) {
      const proprietario = otherOwner.client.nomeFantasia || otherOwner.client.razaoSocial || 'Outro Cliente';
      const motivo = otherOwner.origem === 'lancamento' ? 'já foi lançada no histórico do cliente' : 'já está cadastrada na frota do cliente';
      setVehicleError(
        `BLOQUEADO: A placa ${formattedPlate} ${motivo} "${proprietario}". O sistema não permite lançar ou cadastrar o mesmo veículo em clientes diferentes.`
      );
      return;
    }

    // Adiciona o veículo à frota do cliente
    setFormData((prev) => ({
      ...prev,
      veiculos: [
        ...prev.veiculos,
        {
          placa: formattedPlate,
          modelo: newVehicleModel.trim(),
          cadastradoEm: new Date().toISOString(),
        },
      ],
    }));

    setNewVehiclePlate('');
    setNewVehicleModel('');
  };

  const handleRemoveVehicle = (plateToRemove: string) => {
    const norm = normalizePlate(plateToRemove);
    setFormData((prev) => ({
      ...prev,
      veiculos: prev.veiculos.filter((v) => normalizePlate(v.placa) !== norm),
    }));
  };

  // Abre o modal de cadastro rápido de veículo
  const handleOpenQuickVehicle = (clientId?: string) => {
    setQuickVehicleClientId(clientId || (clients[0]?.id || ''));
    setQuickVehiclePlate('');
    setQuickVehicleModel('');
    setQuickVehicleError('');
    setIsQuickVehicleModalOpen(true);
  };

  // Salva novo veículo diretamente na frota do cliente selecionado
  const handleSaveQuickVehicle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setQuickVehicleError('');

    if (!quickVehicleClientId) {
      setQuickVehicleError('Selecione a empresa / cliente proprietário.');
      return;
    }

    const clean = normalizePlate(quickVehiclePlate);
    if (clean.length < 7) {
      setQuickVehicleError('A placa deve ter pelo menos 7 caracteres (ex: ABC-1234 ou ABC1D23).');
      return;
    }

    if (!quickVehicleModel.trim()) {
      setQuickVehicleError('Informe o modelo do veículo (ex: Fiat Strada, VW Gol, Mercedes Accelo).');
      return;
    }

    const targetClient = clients.find((c) => c.id === quickVehicleClientId);
    if (!targetClient) {
      setQuickVehicleError('Cliente selecionado não foi encontrado.');
      return;
    }

    const formattedPlate = formatPlate(quickVehiclePlate);

    // 1. Checa se este veículo já está na frota deste mesmo cliente
    const alreadyInClient =
      Array.isArray(targetClient.veiculos) &&
      targetClient.veiculos.some((v) => normalizePlate(v.placa) === clean);
    if (alreadyInClient) {
      setQuickVehicleError(`A placa ${formattedPlate} já está cadastrada na frota deste cliente.`);
      return;
    }

    // 2. REGRA DE EXCLUSIVIDADE: Checa se a placa pertence a OUTRO cliente ou já foi lançada
    const conflict = findPlateOwner(quickVehiclePlate, clients, quickVehicleClientId, launches);
    if (conflict) {
      const proprietario = conflict.client.nomeFantasia || conflict.client.razaoSocial || 'Outro Cliente';
      const motivo = conflict.origem === 'lancamento' ? 'já foi lançada anteriormente no cliente' : 'já está cadastrada na frota do cliente';
      setQuickVehicleError(
        `BLOQUEADO: A placa ${formattedPlate} ${motivo} "${proprietario}". O sistema não permite cadastrar ou lançar o mesmo veículo em clientes diferentes.`
      );
      return;
    }

    // Adiciona o veículo e salva no cliente
    const newVehicle: ClientVehicle = {
      placa: formattedPlate,
      modelo: quickVehicleModel.trim(),
      cadastradoEm: new Date().toISOString(),
    };

    const updatedClient: Client = {
      ...targetClient,
      veiculos: [...(targetClient.veiculos || []), newVehicle],
    };

    onSaveClient(updatedClient);
    setIsQuickVehicleModalOpen(false);
  };

  // Desvincula/remove veículo de um cliente
  const handleDeleteRegisteredVehicle = (clientId: string, plateToRemove: string) => {
    const targetClient = clients.find((c) => c.id === clientId);
    if (!targetClient) return;

    const norm = normalizePlate(plateToRemove);
    const updatedClient: Client = {
      ...targetClient,
      veiculos: (targetClient.veiculos || []).filter((v) => normalizePlate(v.placa) !== norm),
    };

    onSaveClient(updatedClient);
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
      veiculos: formData.veiculos || [],
      ativo: true,
      criadoEm: editingClient ? editingClient.criadoEm : new Date().toISOString().slice(0, 10),
    };

    onSaveClient(clientToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Aba de Navegação Superior: Clientes vs Cadastro Geral de Veículos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-200/70 rounded-xl w-fit">
          <button
            onClick={() => setViewSection('clientes')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              viewSection === 'clientes'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Clientes & Contratos</span>
            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded-full text-[10px] font-mono font-bold">
              {clients.length}
            </span>
          </button>

          <button
            onClick={() => setViewSection('veiculos')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              viewSection === 'veiculos'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-blue-600" />
            <span>Cadastro Geral de Veículos</span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-mono font-bold">
              {allRegisteredVehicles.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewSection === 'veiculos' ? (
            <button
              onClick={() => handleOpenQuickVehicle()}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              Novo Veículo
            </button>
          ) : (
            <button
              onClick={handleOpenNew}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Cliente
            </button>
          )}
        </div>
      </div>

      {/* SEÇÃO 1: ABA DE CLIENTES & FROTAS */}
      {viewSection === 'clientes' && (
        <div className="space-y-5">
          {/* Top Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
                Cadastro de Clientes & Frotas
              </h1>
              <p className="text-xs text-neutral-500">
                Gerencie empresas clientes, frota de veículos (com exclusividade de placa) e tabelas de valores.
              </p>
            </div>
          </div>

          {/* Barra de Busca de Clientes */}
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2 shadow-2xs max-w-md">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por cliente, CNPJ ou placa de veículo..."
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
              const totalVeiculos = client.veiculos?.length || 0;
              return (
                <div
                  key={client.id}
                  className="bg-white border border-neutral-200 rounded-2xl p-5 hover:border-neutral-300 transition-all flex flex-col justify-between shadow-xs space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-neutral-100 rounded-xl text-neutral-800">
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
                          onClick={() => handleOpenEdit(client, 'dados')}
                          title="Editar Cliente"
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setClientToDelete(client)}
                          title="Excluir Cliente"
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

                    {/* Tags com prévia das placas cadastradas */}
                    {client.veiculos && client.veiculos.length > 0 && (
                      <div className="pt-1.5">
                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                          Frota Cadastrada ({client.veiculos.length}):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {client.veiculos.slice(0, 3).map((veh) => (
                            <span
                              key={veh.placa}
                              className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-900 rounded font-mono font-bold text-[10px]"
                              title={`${veh.placa} - ${veh.modelo}`}
                            >
                              {veh.placa}
                            </span>
                          ))}
                          {client.veiculos.length > 3 && (
                            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-semibold">
                              +{client.veiculos.length - 3} mais
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botões de Frota de Veículos e Preços */}
                  <div className="pt-3 border-t border-neutral-100 space-y-2 text-xs">
                    {/* Badge e Botão de Veículos da Frota */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-neutral-700 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-blue-600" />
                        {totalVeiculos > 0 ? (
                          <span className="font-mono text-neutral-900">
                            <strong>{totalVeiculos}</strong> veículo{totalVeiculos > 1 ? 's' : ''} salvo{totalVeiculos > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-neutral-400 font-normal">Nenhum veículo salvo</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenQuickVehicle(client.id)}
                          className="text-[11px] font-bold text-neutral-700 hover:text-neutral-950 hover:underline flex items-center gap-0.5"
                          title="Adicionar veículo diretamente a este cliente"
                        >
                          <Plus className="w-3 h-3 text-neutral-500" />
                          Veículo
                        </button>
                        <button
                          onClick={() => handleOpenEdit(client, 'veiculos')}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          Gerenciar Frota
                        </button>
                      </div>
                    </div>

                    {/* Tabela de Preços */}
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-50">
                      <span className="text-neutral-500 flex items-center gap-1 text-[11px]">
                        <Receipt className="w-3.5 h-3.5 text-neutral-400" />
                        {totalCustomPrices} serviços tarifados
                      </span>
                      <button
                        onClick={() => handleOpenEdit(client, 'precos')}
                        className="text-xs font-semibold text-neutral-800 hover:text-neutral-950 hover:underline flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3 text-neutral-500" />
                        Tabela de Preços
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredClients.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white border border-neutral-200 rounded-2xl">
                <Users className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-800">Nenhum cliente encontrado</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Cadastre seus clientes frotistas ou particulares com controle de frota e tabelas de valores.
                </p>
                <button
                  onClick={handleOpenNew}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar Primeiro Cliente
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEÇÃO 2: ABA DE CADASTRO GERAL DE VEÍCULOS & FROTAS */}
      {viewSection === 'veiculos' && (
        <div className="space-y-5">
          {/* Header e Ações de Veículos */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                Cadastro Geral de Veículos & Frotas
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Controle centralizado de veículos por placa e modelo vinculados a cada cliente.
                <strong className="text-neutral-700 ml-1">Placas possuem exclusividade e não podem ser lançadas em clientes diferentes.</strong>
              </p>
            </div>
          </div>

          {/* Cards de Métricas / Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Total de Veículos Cadastrados
                </p>
                <p className="text-2xl font-black text-neutral-950 mt-1">
                  {allRegisteredVehicles.length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Car className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Clientes com Frota Ativa
                </p>
                <p className="text-2xl font-black text-neutral-950 mt-1">
                  {clients.filter((c) => Array.isArray(c.veiculos) && c.veiculos.length > 0).length}{' '}
                  <span className="text-xs font-normal text-neutral-400">de {clients.length} empresas</span>
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Building className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Regra de Exclusividade
                </p>
                <p className="text-xs font-bold text-emerald-700 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Veículo único por cliente
                </p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Barra de Filtros e Busca de Veículos */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 flex-1">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por placa, modelo ou cliente..."
                value={searchVehicleTerm}
                onChange={(e) => setSearchVehicleTerm(e.target.value)}
                className="w-full text-xs text-neutral-800 bg-transparent focus:outline-none"
              />
              {searchVehicleTerm && (
                <button
                  onClick={() => setSearchVehicleTerm('')}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select
                value={clientFilterForVehicles}
                onChange={(e) => setClientFilterForVehicles(e.target.value)}
                className="text-xs bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="">Todos os Clientes ({allRegisteredVehicles.length} veículos)</option>
                {clients.map((c) => {
                  const count = c.veiculos?.length || 0;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.nomeFantasia} ({count} veículos)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Tabela de Veículos (Desktop) */}
          <div className="hidden md:block bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-700 border-b border-neutral-200">
                <tr>
                  <th className="py-3 px-4 font-bold text-neutral-800 uppercase tracking-wider w-40">
                    Placa do Veículo
                  </th>
                  <th className="py-3 px-4 font-bold text-neutral-800 uppercase tracking-wider">
                    Modelo do Veículo
                  </th>
                  <th className="py-3 px-4 font-bold text-neutral-800 uppercase tracking-wider">
                    Cliente / Proprietário Exclusivo
                  </th>
                  <th className="py-3 px-4 font-bold text-neutral-800 uppercase tracking-wider w-36">
                    Cadastrado Em
                  </th>
                  <th className="py-3 px-4 text-center font-bold text-neutral-800 uppercase tracking-wider w-28">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredVehicles.map((v) => (
                  <tr key={`${v.clientId}-${v.placa}`} className="hover:bg-neutral-50/80 transition-colors">
                    {/* Badge estilizada de Placa Mercosul/Brasil */}
                    <td className="py-3 px-4">
                      <div className="inline-flex flex-col border-2 border-neutral-900 rounded-md bg-white overflow-hidden shadow-2xs w-28">
                        <div className="bg-blue-700 text-[8px] font-bold text-white tracking-widest text-center py-0.5 leading-none px-1 flex items-center justify-between">
                          <span>BRASIL</span>
                          <span className="text-[7px]">BR</span>
                        </div>
                        <div className="text-center py-1 px-1 font-mono font-black text-sm tracking-wider text-neutral-950 leading-none">
                          {v.placa}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {v.modelo}
                    </td>

                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-neutral-900 block">{v.clientNome}</span>
                        <span className="text-[11px] text-neutral-500 font-mono">{v.clientCnpj}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-neutral-500 text-[11px]">
                      {v.cadastradoEm ? formatDate(v.cadastradoEm) : 'Salvo no lançamento'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            const cli = clients.find((c) => c.id === v.clientId);
                            if (cli) handleOpenEdit(cli, 'veiculos');
                          }}
                          className="p-1.5 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Abrir frota do cliente"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setVehicleToDelete({
                              clientId: v.clientId,
                              placa: v.placa,
                              modelo: v.modelo,
                              clientName: v.clientNome,
                            })
                          }
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Desvincular / Excluir veículo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-neutral-400 text-xs">
                      <Car className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <p className="font-semibold text-neutral-700">Nenhum veículo encontrado</p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Cadastre veículos com placa e modelo ou realize o primeiro lançamento para salvá-los automaticamente.
                      </p>
                      <button
                        onClick={() => handleOpenQuickVehicle()}
                        className="mt-3 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl inline-flex items-center gap-1 shadow-xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Cadastrar Primeiro Veículo
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Cards de Veículos para Telas Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {filteredVehicles.map((v) => (
              <div
                key={`${v.clientId}-${v.placa}`}
                className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex flex-col border-2 border-neutral-900 rounded-md bg-white overflow-hidden shadow-2xs w-28">
                    <div className="bg-blue-700 text-[8px] font-bold text-white tracking-widest text-center py-0.5 leading-none px-1 flex items-center justify-between">
                      <span>BRASIL</span>
                      <span className="text-[7px]">BR</span>
                    </div>
                    <div className="text-center py-1 px-1 font-mono font-black text-sm tracking-wider text-neutral-950 leading-none">
                      {v.placa}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setVehicleToDelete({
                        clientId: v.clientId,
                        placa: v.placa,
                        modelo: v.modelo,
                        clientName: v.clientNome,
                      })
                    }
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir veículo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <p className="text-xs font-bold text-neutral-900">{v.modelo}</p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">
                    Cliente: <strong>{v.clientNome}</strong> ({v.clientCnpj})
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">
                    {v.cadastradoEm ? formatDate(v.cadastradoEm) : 'Salvo no lançamento'}
                  </span>
                  <button
                    onClick={() => {
                      const cli = clients.find((c) => c.id === v.clientId);
                      if (cli) handleOpenEdit(cli, 'veiculos');
                    }}
                    className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Ver Frota
                  </button>
                </div>
              </div>
            ))}

            {filteredVehicles.length === 0 && (
              <div className="col-span-full py-8 text-center bg-white border border-neutral-200 rounded-2xl p-4">
                <Car className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-neutral-800">Nenhum veículo encontrado</p>
                <button
                  onClick={() => handleOpenQuickVehicle()}
                  className="mt-3 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl inline-flex items-center gap-1 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Cadastrar Veículo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição com Frota de Veículos e Tabela de Valores */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden my-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  {editingClient ? `Editar: ${editingClient.nomeFantasia}` : 'Novo Cadastro de Cliente'}
                </h2>
                <p className="text-xs text-neutral-500">
                  Dados cadastrais, frota de veículos exclusivos e tabela de preços personalizada.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-neutral-200 bg-white px-6 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('dados')}
                className={`py-3 text-xs font-semibold border-b-2 mr-6 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'dados'
                    ? 'border-neutral-900 text-neutral-900 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                1. Dados Cadastrais
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('veiculos')}
                className={`py-3 text-xs font-semibold border-b-2 mr-6 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'veiculos'
                    ? 'border-neutral-900 text-neutral-900 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Car className="w-3.5 h-3.5 text-blue-600" />
                2. Frota de Veículos ({formData.veiculos?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('precos')}
                className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'precos'
                    ? 'border-neutral-900 text-neutral-900 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                3. Tabela de Valores
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 shrink-0">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* ABA 1: DADOS CADASTRAIS */}
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
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
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
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between items-center">
                    <span className="text-[11px] text-neutral-500">
                      Próximo passo: configure a frota de veículos ou os preços.
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('veiculos')}
                      className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Car className="w-3.5 h-3.5 text-blue-600" />
                      Cadastrar Frota de Veículos
                    </button>
                  </div>
                </div>
              )}

              {/* ABA 2: FROTA DE VEÍCULOS (PLACA E MODELO COM EXCLUSIVIDADE) */}
              {activeTab === 'veiculos' && (
                <div className="space-y-4">
                  {/* Bloco de Informação de Exclusividade */}
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-neutral-700 space-y-1">
                    <p className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-blue-600" />
                      Cadastro Exclusivo de Veículos da Frota
                    </p>
                    <p className="text-[11px] text-neutral-600">
                      Os veículos cadastrados aqui pertencem exclusivamente a este cliente. Ao lançar um atendimento com a placa, os dados do veículo são preenchidos automaticamente. <strong>O sistema impede que veículos de outro cliente sejam vinculados aqui.</strong>
                    </p>
                  </div>

                  {/* Formulário para Inserir Novo Veículo */}
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Adicionar Novo Veículo à Frota
                    </h4>

                    {vehicleError && (
                      <div className="p-2.5 bg-red-50 border border-red-300 rounded-lg text-xs text-red-800 flex items-start gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>{vehicleError}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                          Placa do Veículo *
                        </label>
                        <input
                          type="text"
                          placeholder="ABC-1234 / BRA2E19"
                          value={newVehiclePlate}
                          onChange={(e) => {
                            setVehicleError('');
                            setNewVehiclePlate(e.target.value.toUpperCase());
                          }}
                          className="w-full px-3 py-2 text-xs font-mono font-bold border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white tracking-wider uppercase"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                          Modelo / Descrição *
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ex: Fiat Strada Freedom 1.3, VW Delivery"
                            value={newVehicleModel}
                            onChange={(e) => {
                              setVehicleError('');
                              setNewVehicleModel(e.target.value);
                            }}
                            className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddVehicle}
                            className="px-3.5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Veículos Cadastrados */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-800">
                        Veículos Vinculados a este Cliente ({formData.veiculos?.length || 0}):
                      </span>
                    </div>

                    <div className="border border-neutral-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                          <tr>
                            <th className="py-2 px-3 font-semibold w-28">Placa</th>
                            <th className="py-2 px-3 font-semibold">Modelo do Veículo</th>
                            <th className="py-2 px-2 text-center w-12">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {formData.veiculos?.map((v) => (
                            <tr key={v.placa} className="hover:bg-neutral-50 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-neutral-950">
                                {v.placa}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-800 font-medium">
                                {v.modelo}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVehicle(v.placa)}
                                  className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                                  title="Remover veículo da frota"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}

                          {(!formData.veiculos || formData.veiculos.length === 0) && (
                            <tr>
                              <td colSpan={3} className="py-6 text-center text-neutral-400 text-xs">
                                Nenhum veículo cadastrado na frota deste cliente ainda.
                                <p className="text-[11px] text-neutral-400 mt-1">
                                  Dica: Você também pode adicionar veículos automaticamente ao realizar o primeiro lançamento!
                                </p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: TABELA DE VALORES PERSONALIZADA */}
              {activeTab === 'precos' && (
                <div className="space-y-4">
                  {/* Atalhos de Desconto / Reajuste Rápido */}
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-neutral-500" />
                      Aplicar desconto rápido para esta frota:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleApplyDiscount(5)}
                        className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 rounded text-neutral-800 text-[11px] font-semibold"
                      >
                        -5%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyDiscount(10)}
                        className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 rounded text-neutral-800 text-[11px] font-semibold"
                      >
                        -10%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyDiscount(15)}
                        className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 rounded text-neutral-800 text-[11px] font-semibold"
                      >
                        -15%
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToStandard}
                        className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 rounded text-neutral-600 text-[11px]"
                      >
                        Resetar Preços Padrão
                      </button>
                    </div>
                  </div>

                  {/* Tabela de Preços dos Serviços */}
                  <div className="border border-neutral-200 rounded-xl overflow-hidden">
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
                          const customVal =
                            formData.tabelaPrecos[srv.id] !== undefined
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
              <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3 mt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Salvar Cliente, Frota e Preços
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastro Rápido de Veículo */}
      {isQuickVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden my-4 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                    Cadastrar Veículo na Frota
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Placa exclusiva e modelo vinculados ao cliente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickVehicleModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickVehicle} className="p-5 space-y-4">
              {quickVehicleError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-red-950">Atenção</p>
                    <p>{quickVehicleError}</p>
                  </div>
                </div>
              )}

              {/* Seleção do Cliente */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Cliente / Empresa Proprietária *
                </label>
                <select
                  value={quickVehicleClientId}
                  onChange={(e) => {
                    setQuickVehicleError('');
                    setQuickVehicleClientId(e.target.value);
                  }}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white font-medium"
                >
                  <option value="">-- Selecione o cliente --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeFantasia} ({c.cnpj})
                    </option>
                  ))}
                </select>
              </div>

              {/* Placa com validação em tempo real */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center justify-between">
                  <span>Placa do Veículo *</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Ex: ABC-1234 ou BRA2E19</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ABC-1234"
                  value={quickVehiclePlate}
                  onChange={(e) => {
                    setQuickVehicleError('');
                    setQuickVehiclePlate(e.target.value.toUpperCase());
                  }}
                  className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider uppercase border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                />
              </div>

              {/* Modelo */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Modelo / Descrição do Veículo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fiat Strada Freedom 1.3, VW Delivery, etc."
                  value={quickVehicleModel}
                  onChange={(e) => {
                    setQuickVehicleError('');
                    setQuickVehicleModel(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                />
              </div>

              {/* Alerta de exclusividade prévia */}
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  O veículo cadastrado fica salvo exclusivamente para este cliente. Caso outro cliente tente cadastrar ou lançar essa mesma placa, o sistema bloqueará.
                </span>
              </div>

              {/* Botões */}
              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsQuickVehicleModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Salvar Veículo na Frota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Veículo */}
      <ConfirmModal
        isOpen={Boolean(vehicleToDelete)}
        title="Desvincular Veículo"
        message={
          vehicleToDelete
            ? `Tem certeza que deseja desvincular o veículo placa "${vehicleToDelete.placa}" (${vehicleToDelete.modelo}) do cliente "${vehicleToDelete.clientName}"?`
            : ''
        }
        confirmLabel="Sim, Desvincular Veículo"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (vehicleToDelete) {
            handleDeleteRegisteredVehicle(vehicleToDelete.clientId, vehicleToDelete.placa);
            setVehicleToDelete(null);
          }
        }}
        onCancel={() => setVehicleToDelete(null)}
      />

      {/* Modal de Confirmação de Exclusão de Cliente */}
      <ConfirmModal
        isOpen={Boolean(clientToDelete)}
        title="Excluir Cliente"
        message={
          clientToDelete
            ? `Tem certeza que deseja remover o cliente "${clientToDelete.nomeFantasia}" (${clientToDelete.cnpj})? Sua frota de veículos e tabelas de preços personalizadas também serão excluídas.`
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
