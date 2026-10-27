import React, { useState, useEffect, useRef } from 'react';
import { Client, ServiceItem, ServiceLaunch, ServiceItemLaunch } from '../types';
import { SignaturePad } from './SignaturePad';
import {
  formatCurrency,
  formatPlate,
  normalizePlate,
  findPlateOwner,
  getLocalDateString,
  getLocalTimeString,
  combineDateTimeToIso,
  SERVICE_CATEGORIES,
  normalizeServiceCategory,
} from '../utils/storage';
import { X, Plus, Trash2, CheckCircle, Car, Calendar, Clock, Mail, AlertCircle, ShieldAlert, Check } from 'lucide-react';

export interface LaunchEmailOption {
  sendEmail: boolean;
  recipientEmail: string;
  saveToClient?: boolean;
}

interface LancamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  services: ServiceItem[];
  launches?: ServiceLaunch[];
  onSave: (launch: ServiceLaunch, emailOption?: LaunchEmailOption) => void;
  onSaveClient?: (client: Client) => void;
  existingLaunch?: ServiceLaunch | null;
}

export const LancamentoModal: React.FC<LancamentoModalProps> = ({
  isOpen,
  onClose,
  clients,
  services,
  launches = [],
  onSave,
  onSaveClient,
  existingLaunch = null,
}) => {
  const [dataAtendimento, setDataAtendimento] = useState('');
  const [horaAtendimento, setHoraAtendimento] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [km, setKm] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [nomeCondutor, setNomeCondutor] = useState('');
  const [matriculaCondutor, setMatriculaCondutor] = useState('');
  const [contratoCentroCusto, setContratoCentroCusto] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [assinatura, setAssinatura] = useState('');
  const [itensServico, setItensServico] = useState<ServiceItemLaunch[]>([]);
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Ref para controlar a inicialização e evitar que re-renderizações de fundo apaguem dados digitados
  const initializedLaunchRef = useRef<string | null>(null);

  // Estado para cadastro rápido de nova empresa direto no lançamento
  const [showQuickClientForm, setShowQuickClientForm] = useState(false);
  const [quickClientNome, setQuickClientNome] = useState('');
  const [quickClientCnpj, setQuickClientCnpj] = useState('');
  const [quickClientEmail, setQuickClientEmail] = useState('');

  const handleSaveQuickClient = () => {
    if (!quickClientNome.trim()) {
      setErrorMsg('INFORME O NOME DA EMPRESA PARA CADASTRAR.');
      return;
    }
    const defaultPrices: Record<string, number> = {};
    services.forEach((s) => {
      defaultPrices[s.id] = s.precoPadrao;
    });
    const newClient: Client = {
      id: `cli-${Date.now()}`,
      nomeFantasia: quickClientNome.trim().toUpperCase(),
      razaoSocial: quickClientNome.trim().toUpperCase(),
      cnpj: (quickClientCnpj.trim() || 'NÃO INFORMADO').toUpperCase(),
      email: quickClientEmail.trim().toLowerCase(),
      enviarEmail: true,
      telefone: '',
      endereco: '',
      tabelaPrecos: defaultPrices,
      veiculos: [],
      ativo: true,
      criadoEm: new Date().toISOString().slice(0, 10),
    };
    if (onSaveClient) {
      onSaveClient(newClient);
    }
    setClienteId(newClient.id);
    setQuickClientNome('');
    setQuickClientCnpj('');
    setQuickClientEmail('');
    setShowQuickClientForm(false);
    setErrorMsg('');
  };

  // Define data e hora atuais
  const handleSetCurrentDateTime = () => {
    const now = new Date();
    setDataAtendimento(getLocalDateString(now));
    setHoraAtendimento(getLocalTimeString(now));
  };

  // Sincroniza estado apenas quando o modal for aberto ou se o lançamento selecionado mudar
  useEffect(() => {
    if (!isOpen) {
      initializedLaunchRef.current = null;
      return;
    }

    const currentKey = existingLaunch ? existingLaunch.id : 'new';
    if (initializedLaunchRef.current === currentKey) {
      // Já inicializado para este lançamento; não sobrescreve alterações feitas pelo usuário
      return;
    }
    initializedLaunchRef.current = currentKey;

    if (existingLaunch) {
      if (existingLaunch.dataHora) {
        const d = new Date(existingLaunch.dataHora);
        setDataAtendimento(getLocalDateString(d));
        setHoraAtendimento(getLocalTimeString(d));
      } else {
        const now = new Date();
        setDataAtendimento(getLocalDateString(now));
        setHoraAtendimento(getLocalTimeString(now));
      }

      // Procura cliente por id ou nome para garantir seleção correta
      const matchedClient =
        clients.find((c) => c.id === existingLaunch.clienteId) ||
        (existingLaunch.clienteNome
          ? clients.find(
              (c) =>
                c.nomeFantasia.toUpperCase() === existingLaunch.clienteNome.toUpperCase() ||
                c.razaoSocial.toUpperCase() === existingLaunch.clienteNome.toUpperCase()
            )
          : undefined);

      setClienteId(matchedClient?.id || existingLaunch.clienteId || (clients[0]?.id || ''));
      setPlaca(existingLaunch.placa.toUpperCase());
      setModelo(existingLaunch.modelo.toUpperCase());
      setKm(existingLaunch.km !== undefined && existingLaunch.km !== null ? String(existingLaunch.km) : '0');
      setResponsavel(existingLaunch.responsavel.toUpperCase());
      setNomeCondutor(existingLaunch.nomeCondutor.toUpperCase());
      setMatriculaCondutor(existingLaunch.matriculaCondutor.toUpperCase());
      setContratoCentroCusto((existingLaunch.contratoCentroCusto || '').toUpperCase());
      setObservacoes((existingLaunch.observacoes || '').toUpperCase());
      setAssinatura(existingLaunch.assinatura);
      setItensServico(
        existingLaunch.servicos.map((s) => ({
          ...s,
          nome: s.nome.toUpperCase(),
          categoria: normalizeServiceCategory(
            s.categoria ||
            services.find((sv) => sv.id === s.serviceId)?.categoria
          ),
        }))
      );
    } else {
      // Padrões para novo lançamento: data e hora atuais pré-preenchidas
      const now = new Date();
      setDataAtendimento(getLocalDateString(now));
      setHoraAtendimento(getLocalTimeString(now));

      const firstCli = clients[0]?.id || '';
      setClienteId(firstCli);
      setPlaca('');
      setModelo('');
      setKm('');
      setResponsavel('OPERADOR / LAVADOR GERAL');
      setNomeCondutor('');
      setMatriculaCondutor('');
      setContratoCentroCusto('');
      setObservacoes('');
      setAssinatura('');

      // Para novo lançamento: inicia com a lista de serviços 100% LIMPA (nenhum serviço pré-selecionado)
      setItensServico([]);
    }
  }, [existingLaunch, isOpen, clients, services]);

  if (!isOpen) return null;

  const currentClient =
    clients.find((c) => c.id === clienteId) ||
    (existingLaunch?.clienteNome
      ? clients.find(
          (c) =>
            c.nomeFantasia.toUpperCase() === existingLaunch.clienteNome.toUpperCase() ||
            c.razaoSocial.toUpperCase() === existingLaunch.clienteNome.toUpperCase()
        )
      : undefined);

  // Ignora o lançamento atual ao verificar conflito de exclusividade da placa
  const otherPlateOwner = findPlateOwner(
    placa,
    clients,
    currentClient?.id,
    launches,
    existingLaunch ? existingLaunch.id : undefined
  );

  // Função para pegar o preço do serviço respeitando a tabela do cliente
  const getServicePriceForClient = (service: ServiceItem, client?: Client): number => {
    if (!client) return service.precoPadrao;
    if (client.tabelaPrecos && client.tabelaPrecos[service.id] !== undefined) {
      return client.tabelaPrecos[service.id];
    }
    return service.precoPadrao;
  };

  const handleClientChange = (newClientId: string) => {
    setClienteId(newClientId);
    const newClient = clients.find((c) => c.id === newClientId);

    // Atualiza os preços dos serviços já selecionados de acordo com a tabela do novo cliente
    setItensServico((prev) =>
      prev.map((item) => {
        const srvObj = services.find((s) => s.id === item.serviceId);
        const novoPreco = srvObj ? getServicePriceForClient(srvObj, newClient) : item.preco;
        return {
          ...item,
          preco: novoPreco,
          subtotal: novoPreco * item.quantidade,
        };
      })
    );
  };

  const handleAddService = () => {
    if (!selectedServiceToAdd) return;
    const srv = services.find((s) => s.id === selectedServiceToAdd);
    if (!srv) return;

    const preco = getServicePriceForClient(srv, currentClient);

    // Se já tiver na lista, apenas incrementa quantidade
    const existingIndex = itensServico.findIndex((i) => i.serviceId === srv.id);
    if (existingIndex >= 0) {
      const updated = [...itensServico];
      const item = updated[existingIndex];
      const newQty = item.quantidade + 1;
      updated[existingIndex] = {
        ...item,
        quantidade: newQty,
        subtotal: item.preco * newQty,
      };
      setItensServico(updated);
    } else {
      setItensServico((prev) => [
        ...prev,
        {
          serviceId: srv.id,
          nome: srv.nome.toUpperCase(),
          categoria: normalizeServiceCategory(srv.categoria),
          preco: preco,
          quantidade: 1,
          subtotal: preco,
        },
      ]);
    }
    setSelectedServiceToAdd('');
  };

  const handleCategoryChange = (index: number, newCategory: string) => {
    setItensServico((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        categoria: normalizeServiceCategory(newCategory),
      };
      return updated;
    });
  };

  const handleRemoveService = (index: number) => {
    setItensServico((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, qty: number) => {
    if (qty <= 0) return;
    setItensServico((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantidade: qty,
        subtotal: updated[index].preco * qty,
      };
      return updated;
    });
  };

  const valorTotal = itensServico.reduce((acc, curr) => acc + curr.subtotal, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataAtendimento.trim() || !horaAtendimento.trim()) {
      setErrorMsg('Por favor, informe a Data e o Horário do atendimento.');
      return;
    }

    if (!placa.trim() || !modelo.trim() || !responsavel.trim() || !nomeCondutor.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (Placa, Modelo, Responsável, Nome do Condutor).');
      return;
    }

    // REGRA DE EXCLUSIVIDADE: Bloqueia lançamento de veículo pertencente ou lançado em outro cliente
    if (otherPlateOwner) {
      const proprietario = otherPlateOwner.client.nomeFantasia || otherPlateOwner.client.razaoSocial || 'Outro Cliente';
      const motivo = otherPlateOwner.origem === 'lancamento' ? 'já foi lançado no histórico de' : 'já está cadastrado na frota de';
      setErrorMsg(
        `BLOQUEADO: A placa ${formatPlate(placa)} ${motivo} "${proprietario}". O sistema não permite lançar o mesmo veículo em clientes diferentes!`
      );
      return;
    }

    if (itensServico.length === 0) {
      setErrorMsg('Adicione pelo menos um serviço ao lançamento.');
      return;
    }

    if (!assinatura) {
      setErrorMsg('A assinatura digital do condutor é obrigatória para conformidade e faturamento.');
      return;
    }

    // REGRA: Ao lançar pela primeira vez um veículo para o cliente, o mesmo fica salvo automaticamente
    if (currentClient && onSaveClient) {
      const cleanPlate = normalizePlate(placa);
      const alreadyHas =
        Array.isArray(currentClient.veiculos) &&
        currentClient.veiculos.some((v) => normalizePlate(v.placa) === cleanPlate);

      if (!alreadyHas) {
        const newVehicle = {
          placa: formatPlate(placa).toUpperCase(),
          modelo: modelo.trim().toUpperCase(),
          cadastradoEm: new Date().toISOString(),
        };
        const updatedClient: Client = {
          ...currentClient,
          veiculos: [...(currentClient.veiculos || []), newVehicle],
        };
        onSaveClient(updatedClient);
      }
    }

    const finalClient = currentClient || clients.find((c) => c.id === clienteId);
    const finalClientNome = (
      finalClient?.nomeFantasia ||
      finalClient?.razaoSocial ||
      existingLaunch?.clienteNome ||
      'CLIENTE GERAL'
    ).toUpperCase();
    const finalClientCnpj = (
      finalClient?.cnpj ||
      existingLaunch?.clienteCnpj ||
      'NÃO INFORMADO'
    ).toUpperCase();

    const launch: ServiceLaunch = {
      id: existingLaunch ? existingLaunch.id : `lnc-${Date.now()}`,
      numeroOS: existingLaunch ? existingLaunch.numeroOS : `OS-${Math.floor(10000 + Math.random() * 90000)}`,
      dataHora: combineDateTimeToIso(dataAtendimento, horaAtendimento),
      clienteId: finalClient?.id || existingLaunch?.clienteId || '',
      clienteNome: finalClientNome,
      clienteCnpj: finalClientCnpj,
      placa: formatPlate(placa).toUpperCase(),
      modelo: modelo.trim().toUpperCase(),
      km: km.trim() || '0',
      responsavel: responsavel.trim().toUpperCase(),
      nomeCondutor: nomeCondutor.trim().toUpperCase(),
      matriculaCondutor: (matriculaCondutor.trim() || 'S/N').toUpperCase(),
      contratoCentroCusto: (contratoCentroCusto || '').trim().toUpperCase(),
      servicos: itensServico.map((item) => ({
        ...item,
        nome: item.nome.toUpperCase(),
        categoria: normalizeServiceCategory(
          item.categoria ||
          services.find((s) => s.id === item.serviceId)?.categoria
        ),
      })),
      valorTotal: valorTotal,
      assinatura: assinatura,
      observacoes: (observacoes || '').trim().toUpperCase(),
      status: 'Concluído',
    };

    const shouldSendClientEmail = Boolean(
      currentClient && currentClient.enviarEmail !== false && currentClient.email?.trim()
    );

    onSave(launch, {
      sendEmail: shouldSendClientEmail,
      recipientEmail: currentClient?.email?.trim().toLowerCase() || '',
      saveToClient: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[96dvh] sm:max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-neutral-900 text-white rounded-lg shrink-0">
              <Car className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-base font-bold text-neutral-900 leading-tight">
                {existingLaunch ? `Editar Lançamento #${existingLaunch.numeroOS}` : 'Novo Lançamento de Serviço'}
              </h2>
              <p className="text-[10px] sm:text-xs text-neutral-500">
                Data, veículo, condutor, serviços e assinatura digital.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 sm:p-1.5 rounded-lg transition-colors hover:bg-neutral-200/50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-3.5 sm:mx-6 mt-2.5 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex justify-between items-center shrink-0">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-red-500 font-bold ml-2 text-base">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Área com Scroll do Formulário */}
          <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
            {/* Seção 1: Cliente e Veículo */}
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
                1. Data, Cliente & Identificação do Veículo
              </h3>

              {/* Bloco de Data e Horário (Lado a lado em 2 colunas no celular para poupar tela) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3.5 mb-2.5 p-2 sm:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-neutral-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                      Data *
                    </span>
                    <span className="text-[9px] text-neutral-500 hidden sm:inline">Data atual</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataAtendimento}
                    onChange={(e) => setDataAtendimento(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-neutral-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                      Horário *
                    </span>
                    <button
                      type="button"
                      onClick={handleSetCurrentDateTime}
                      className="text-[10px] text-blue-600 hover:text-blue-800 underline font-medium"
                      title="Definir para hora atual"
                    >
                      Agora
                    </button>
                  </label>
                  <input
                    type="time"
                    required
                    value={horaAtendimento}
                    onChange={(e) => setHoraAtendimento(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white font-mono font-medium"
                  />
                </div>
              </div>

              {/* Seletor Rápido de Veículo da Frota Salva deste Cliente */}
              {currentClient?.veiculos && currentClient.veiculos.length > 0 && (
                <div className="mb-2.5 p-2 sm:p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                  <span className="text-[11px] sm:text-xs font-semibold text-blue-950 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Frota de <strong>{currentClient.nomeFantasia}</strong> ({currentClient.veiculos.length} veículos):
                    </span>
                  </span>
                  <select
                    onChange={(e) => {
                      const v = currentClient.veiculos?.find((veh) => veh.placa === e.target.value);
                      if (v) {
                        setPlaca(v.placa);
                        setModelo(v.modelo);
                        setErrorMsg('');
                      }
                    }}
                    value={
                      currentClient.veiculos.some((v) => normalizePlate(v.placa) === normalizePlate(placa))
                        ? formatPlate(placa)
                        : ''
                    }
                    className="text-xs bg-white border border-blue-300 rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 text-neutral-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="">-- Escolher veículo da frota cadastrada --</option>
                    {currentClient.veiculos.map((v) => (
                      <option key={v.placa} value={v.placa}>
                        {v.placa} · {v.modelo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700">
                      Cliente / Empresa da Frota *
                    </label>
                    {onSaveClient && (
                      <button
                        type="button"
                        onClick={() => setShowQuickClientForm(!showQuickClientForm)}
                        className="text-[10px] sm:text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {showQuickClientForm ? 'Cancelar' : 'Nova Empresa'}
                      </button>
                    )}
                  </div>

                  {showQuickClientForm && (
                    <div className="mb-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg space-y-2 animate-in fade-in">
                      <div className="text-[10px] font-bold text-blue-950 uppercase">
                        Cadastro Rápido de Empresa:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          placeholder="NOME DA EMPRESA *"
                          value={quickClientNome}
                          onChange={(e) => setQuickClientNome(e.target.value.toUpperCase())}
                          className="px-2 py-1.5 text-xs bg-white border border-blue-300 rounded-md font-bold uppercase focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        <input
                          type="text"
                          placeholder="CNPJ (OPCIONAL)"
                          value={quickClientCnpj}
                          onChange={(e) => setQuickClientCnpj(e.target.value.toUpperCase())}
                          className="px-2 py-1.5 text-xs bg-white border border-blue-300 rounded-md font-mono uppercase focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="email"
                          placeholder="e-mail (opcional)"
                          value={quickClientEmail}
                          onChange={(e) => setQuickClientEmail(e.target.value.toLowerCase())}
                          className="flex-1 px-2 py-1.5 text-xs bg-white border border-blue-300 rounded-md lowercase focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        <button
                          type="button"
                          onClick={handleSaveQuickClient}
                          className="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1 shrink-0 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}

                  <select
                    value={clienteId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white font-semibold uppercase"
                    required
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nomeFantasia.toUpperCase()} {c.cnpj && c.cnpj !== 'NÃO INFORMADO' ? `(${c.cnpj})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700 mb-1">
                    Placa do Veículo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ABC-1234"
                    value={placa}
                    onChange={(e) => {
                      setErrorMsg('');
                      const val = e.target.value.toUpperCase();
                      setPlaca(val);
                      if (currentClient?.veiculos) {
                        const found = currentClient.veiculos.find((v) => normalizePlate(v.placa) === normalizePlate(val));
                        if (found && !modelo) {
                          setModelo(found.modelo.toUpperCase());
                        }
                      }
                    }}
                    className={`w-full px-2.5 py-1.5 sm:py-2 text-xs border rounded-md focus:outline-none focus:ring-2 font-mono font-bold tracking-wider uppercase ${
                      otherPlateOwner
                        ? 'border-red-500 bg-red-50 text-red-950 focus:ring-red-500'
                        : 'border-neutral-300 focus:ring-neutral-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700 mb-1">
                    KM *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 45.890"
                    value={km}
                    onChange={(e) => setKm(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 sm:py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono uppercase"
                  />
                </div>

                {/* ALERTA DE EXCLUSIVIDADE: Se o veículo pertencer a outro cliente */}
                {otherPlateOwner && (
                  <div className="col-span-full p-2.5 bg-red-50 border border-red-300 rounded-lg text-xs text-red-900 flex items-start gap-2 animate-in fade-in">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-[11px]">
                      <p className="font-bold text-red-950">
                        VEÍCULO BLOQUEADO: Pertence a outro cliente!
                      </p>
                      <p className="text-red-800">
                        A placa <strong>{formatPlate(placa)}</strong> já pertence a{' '}
                        <strong>"{otherPlateOwner.client.nomeFantasia || otherPlateOwner.client.razaoSocial}"</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* NOTA: Primeiro lançamento deste veículo */}
                {!otherPlateOwner &&
                  placa.length >= 7 &&
                  currentClient &&
                  !currentClient.veiculos?.some((v) => normalizePlate(v.placa) === normalizePlate(placa)) && (
                    <div className="col-span-full p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] sm:text-[11px] text-emerald-900 flex items-center gap-1.5 animate-in fade-in">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        A placa <strong>{formatPlate(placa)}</strong> será salva na frota de <strong>{currentClient.nomeFantasia}</strong> ao concluir.
                      </span>
                    </div>
                  )}

                <div className="col-span-2">
                  <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700 mb-1">
                    Modelo do Veículo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TOYOTA HILUX CD 4X4, FIAT STRADA..."
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 sm:py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 uppercase"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700 mb-1">
                    Contrato / CC
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CT-2026/01"
                    value={contratoCentroCusto}
                    onChange={(e) => setContratoCentroCusto(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 sm:py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono uppercase"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700 mb-1">
                    Responsável (Lavador) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CARLOS EDUARDO"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 sm:py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Condutor Responsável */}
            <div className="pt-2 border-t border-neutral-200">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
                2. Dados do Condutor do Veículo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700 mb-1">
                    Nome do Condutor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome de quem trouxe o veículo"
                    value={nomeCondutor}
                    onChange={(e) => setNomeCondutor(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 sm:py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700 mb-1">
                    Matrícula / Registro *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MAT-4890 OU CPF"
                    value={matriculaCondutor}
                    onChange={(e) => setMatriculaCondutor(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 sm:py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Serviços Realizados com Tabela do Cliente */}
            <div className="pt-2 border-t border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  3. Serviços Realizados & Valores
                </h3>
                <span className="text-[10px] text-neutral-500 truncate max-w-[150px] sm:max-w-none">
                  Cliente: <strong className="text-neutral-800">{currentClient?.nomeFantasia}</strong>
                </span>
              </div>

              {/* Adicionar Serviço */}
              <div className="flex gap-1.5 sm:gap-2 mb-2.5">
                <select
                  value={selectedServiceToAdd}
                  onChange={(e) => setSelectedServiceToAdd(e.target.value)}
                  className="min-w-0 flex-1 px-2.5 py-1.5 sm:py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                >
                  <option value="">Selecione um serviço para adicionar...</option>
                  {services.map((srv) => {
                    const p = getServicePriceForClient(srv, currentClient);
                    return (
                      <option key={srv.id} value={srv.id}>
                        {srv.nome.toUpperCase()} [{normalizeServiceCategory(srv.categoria)}] — {formatCurrency(p)}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={handleAddService}
                  disabled={!selectedServiceToAdd}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>

              {/* Tabela de itens selecionados com Categoria/Classe (com overflow-x-auto para nunca quebrar no celular) */}
              <div className="border border-neutral-200 rounded-lg overflow-x-auto mb-2">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                    <tr>
                      <th className="py-2 px-2.5 font-semibold">Serviço & Classe</th>
                      <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Valor Unit.</th>
                      <th className="py-2 px-2 font-semibold text-center w-14">Qtd.</th>
                      <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Subtotal</th>
                      <th className="py-2 px-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {itensServico.map((item, idx) => (
                      <tr key={`${item.serviceId}-${idx}`} className="hover:bg-neutral-50">
                        <td className="py-2 px-2.5">
                          <span className="font-semibold text-neutral-900 block leading-tight">{item.nome.toUpperCase()}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] font-bold text-neutral-500 uppercase">Classe:</span>
                            <select
                              value={normalizeServiceCategory(item.categoria)}
                              onChange={(e) => handleCategoryChange(idx, e.target.value)}
                              className="text-[9px] font-bold uppercase bg-blue-50 text-blue-900 border border-blue-200 rounded px-1 py-0.5 focus:outline-none"
                            >
                              {SERVICE_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-neutral-700 whitespace-nowrap">
                          {formatCurrency(item.preco)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={item.quantidade}
                            onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                            className="w-12 text-center px-1 py-1 border border-neutral-300 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-neutral-900 whitespace-nowrap">
                          {formatCurrency(item.subtotal)}
                        </td>
                        <td className="py-2 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveService(idx)}
                            className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {itensServico.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-5 px-3 text-center text-neutral-500 text-xs">
                          <div className="font-semibold text-neutral-700">Nenhum serviço selecionado ainda.</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">
                            Escolha um serviço no campo acima e clique em "+ Adicionar".
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {itensServico.length > 0 && (
                    <tfoot className="bg-neutral-50 font-bold border-t border-neutral-200">
                      <tr>
                        <td colSpan={3} className="py-2 px-2.5 text-right text-neutral-700">
                          TOTAL:
                        </td>
                        <td className="py-2 px-2 text-right text-xs sm:text-sm font-mono text-neutral-950 whitespace-nowrap">
                          {formatCurrency(valorTotal)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Seção 4: Assinatura Digital do Condutor */}
            <div className="pt-2 border-t border-neutral-200">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
                4. Assinatura Digital do Condutor (Obrigatório)
              </h3>
              <SignaturePad
                value={assinatura}
                onChange={setAssinatura}
                driverName={nomeCondutor || 'Condutor Autorizado'}
              />
            </div>

            {/* Seção 5: Observações */}
            <div className="pt-2 border-t border-neutral-200">
              <label className="block text-[11px] sm:text-xs font-semibold text-neutral-700 mb-1">
                Observações Adicionais (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: AVARIAS PRÉ-EXISTENTES, DETALHES DO SERVIÇO..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 sm:py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 uppercase"
              />
            </div>
          </div>

          {/* Rodapé Fixo (Pinned Footer) - Sempre visível na tela sem precisar rolar */}
          <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
            <div className="text-xs text-neutral-600">
              <span className="text-[10px] text-neutral-500 block leading-none">Total:</span>
              <span className="text-sm sm:text-lg text-neutral-950 font-mono font-black">{formatCurrency(valorTotal)}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3 sm:px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg transition-colors text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={Boolean(otherPlateOwner)}
                title={otherPlateOwner ? 'Veículo pertence a outro cliente' : undefined}
                className={`px-3.5 sm:px-5 py-2 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  otherPlateOwner
                    ? 'bg-neutral-400 cursor-not-allowed opacity-60'
                    : 'bg-neutral-900 hover:bg-neutral-800'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{existingLaunch ? 'Salvar' : 'Concluir Lançamento'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
