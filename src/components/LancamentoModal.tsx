import React, { useState, useEffect } from 'react';
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

  // Estados para envio de comprovante por e-mail
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [emailDestino, setEmailDestino] = useState('');
  const [salvarEmailNoCliente, setSalvarEmailNoCliente] = useState(false);

  // Define data e hora atuais
  const handleSetCurrentDateTime = () => {
    const now = new Date();
    setDataAtendimento(getLocalDateString(now));
    setHoraAtendimento(getLocalTimeString(now));
  };

  // Sincroniza estado se for edição ou novo
  useEffect(() => {
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

      setClienteId(existingLaunch.clienteId);
      setPlaca(existingLaunch.placa);
      setModelo(existingLaunch.modelo);
      setKm(String(existingLaunch.km));
      setResponsavel(existingLaunch.responsavel);
      setNomeCondutor(existingLaunch.nomeCondutor);
      setMatriculaCondutor(existingLaunch.matriculaCondutor);
      setContratoCentroCusto(existingLaunch.contratoCentroCusto || '');
      setObservacoes(existingLaunch.observacoes || '');
      setAssinatura(existingLaunch.assinatura);
      setItensServico(existingLaunch.servicos);

      // Email do cliente para lançamento existente
      const cliFound = clients.find((c) => c.id === existingLaunch.clienteId);
      setEmailDestino(cliFound?.email || '');
      setEnviarEmail(Boolean(cliFound?.email));
      setSalvarEmailNoCliente(!cliFound?.email);
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
      setResponsavel('Operador / Lavador Geral');
      setNomeCondutor('');
      setMatriculaCondutor('');
      setContratoCentroCusto('');
      setObservacoes('');
      setAssinatura('');

      // Sincroniza e-mail do primeiro cliente
      const firstCliObj = clients.find((c) => c.id === firstCli);
      setEmailDestino(firstCliObj?.email || '');
      setEnviarEmail(Boolean(firstCliObj?.email));
      setSalvarEmailNoCliente(!firstCliObj?.email);

      // Pré-seleciona primeiro serviço da tabela do cliente
      if (firstCli && services.length > 0) {
        const cli = clients.find((c) => c.id === firstCli);
        const srv = services[0];
        const preco = cli?.tabelaPrecos?.[srv.id] !== undefined ? cli.tabelaPrecos[srv.id] : srv.precoPadrao;
        setItensServico([
          {
            serviceId: srv.id,
            nome: srv.nome,
            preco: preco,
            quantidade: 1,
            subtotal: preco,
          },
        ]);
      } else {
        setItensServico([]);
      }
    }
  }, [existingLaunch, isOpen, clients, services]);

  if (!isOpen) return null;

  const currentClient = clients.find((c) => c.id === clienteId);
  const otherPlateOwner = findPlateOwner(placa, clients, currentClient?.id, launches);

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

    // Atualiza dados de e-mail ao trocar de cliente
    setEmailDestino(newClient?.email || '');
    setEnviarEmail(Boolean(newClient?.email));
    setSalvarEmailNoCliente(!newClient?.email);

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
          nome: srv.nome,
          preco: preco,
          quantidade: 1,
          subtotal: preco,
        },
      ]);
    }
    setSelectedServiceToAdd('');
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

    if (enviarEmail && !emailDestino.trim()) {
      setErrorMsg('Por favor, informe o e-mail do cliente ou desmarque a opção de envio por e-mail.');
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
          placa: formatPlate(placa),
          modelo: modelo.trim(),
          cadastradoEm: new Date().toISOString(),
        };
        const updatedClient: Client = {
          ...currentClient,
          veiculos: [...(currentClient.veiculos || []), newVehicle],
        };
        onSaveClient(updatedClient);
      }
    }

    const launch: ServiceLaunch = {
      id: existingLaunch ? existingLaunch.id : `lnc-${Date.now()}`,
      numeroOS: existingLaunch ? existingLaunch.numeroOS : `OS-${Math.floor(10000 + Math.random() * 90000)}`,
      dataHora: combineDateTimeToIso(dataAtendimento, horaAtendimento),
      clienteId: currentClient?.id || '',
      clienteNome: currentClient?.nomeFantasia || currentClient?.razaoSocial || 'Cliente Geral',
      clienteCnpj: currentClient?.cnpj || '',
      placa: formatPlate(placa),
      modelo: modelo.trim(),
      km: km.trim() || '0',
      responsavel: responsavel.trim(),
      nomeCondutor: nomeCondutor.trim(),
      matriculaCondutor: matriculaCondutor.trim() || 'S/N',
      contratoCentroCusto: contratoCentroCusto.trim(),
      servicos: itensServico,
      valorTotal: valorTotal,
      assinatura: assinatura,
      observacoes: observacoes.trim(),
      status: 'Concluído',
    };

    onSave(launch, {
      sendEmail: enviarEmail,
      recipientEmail: emailDestino.trim(),
      saveToClient: salvarEmailNoCliente,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl sm:rounded-xl shadow-2xl border border-neutral-200 overflow-hidden my-2 sm:my-4 flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-900 text-white rounded-lg shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                {existingLaunch ? `Editar Lançamento #${existingLaunch.numeroOS}` : 'Novo Lançamento de Serviço'}
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-500">
                Data, veículo, condutor, serviços e assinatura digital.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg transition-colors hover:bg-neutral-200/50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex justify-between items-center shrink-0">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-red-500 font-bold ml-2 text-base">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Seção 1: Cliente e Veículo */}
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2.5">
              1. Data, Cliente & Identificação do Veículo
            </h3>

            {/* Bloco de Data e Horário (pré-preenchidos com data e hora atuais) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                    Data do Atendimento *
                  </span>
                  <span className="text-[10px] text-neutral-500 font-normal">Preenchido com a data atual</span>
                </label>
                <input
                  type="date"
                  required
                  value={dataAtendimento}
                  onChange={(e) => setDataAtendimento(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-neutral-600" />
                    Horário do Atendimento *
                  </span>
                  <button
                    type="button"
                    onClick={handleSetCurrentDateTime}
                    className="text-[10px] text-blue-600 hover:text-blue-800 underline font-medium"
                    title="Definir para hora atual"
                  >
                    Usar agora
                  </button>
                </label>
                <input
                  type="time"
                  required
                  value={horaAtendimento}
                  onChange={(e) => setHoraAtendimento(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white font-mono font-medium"
                />
              </div>
            </div>

            {/* Seletor Rápido de Veículo da Frota Salva deste Cliente */}
            {currentClient?.veiculos && currentClient.veiculos.length > 0 && (
              <div className="mb-3.5 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-blue-950 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Frota de <strong>{currentClient.nomeFantasia}</strong> ({currentClient.veiculos.length} veículos cadastrados):
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
                  className="text-xs bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-neutral-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Cliente / Empresa da Frota *
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeFantasia} ({c.cnpj})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  Tabela de preços personalizada carregada para este cliente.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Placa do Veículo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ABC-1234 / BRA2E19"
                  value={placa}
                  onChange={(e) => {
                    setErrorMsg('');
                    const val = e.target.value.toUpperCase();
                    setPlaca(val);
                    // Se a placa já existir na frota deste cliente e o modelo estiver vazio, preenche automaticamente
                    if (currentClient?.veiculos) {
                      const found = currentClient.veiculos.find((v) => normalizePlate(v.placa) === normalizePlate(val));
                      if (found && !modelo) {
                        setModelo(found.modelo);
                      }
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs border rounded-md focus:outline-none focus:ring-2 font-mono font-bold tracking-wider ${
                    otherPlateOwner
                      ? 'border-red-500 bg-red-50 text-red-950 focus:ring-red-500'
                      : 'border-neutral-300 focus:ring-neutral-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Quilometragem (KM) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 45.890"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              {/* ALERTA DE EXCLUSIVIDADE: Se o veículo pertencer a outro cliente */}
              {otherPlateOwner && (
                <div className="col-span-full p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 flex items-start gap-2.5 animate-in fade-in">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-red-950 flex items-center gap-1">
                      VEÍCULO BLOQUEADO: Pertence a outro cliente!
                    </p>
                    <p className="text-red-800">
                      A placa <strong>{formatPlate(placa)}</strong> já {otherPlateOwner.origem === 'lancamento' ? 'foi lançada anteriormente para' : 'pertence exclusivamente ao'} o cliente{' '}
                      <strong>"{otherPlateOwner.client.nomeFantasia || otherPlateOwner.client.razaoSocial}"</strong> {otherPlateOwner.client.cnpj ? `(${otherPlateOwner.client.cnpj})` : ''}.
                    </p>
                    <p className="text-[11px] text-red-700 font-medium">
                      O sistema não permite lançar atendimentos deste veículo para outra empresa.
                    </p>
                  </div>
                </div>
              )}

              {/* NOTA: Se for a primeira vez que o veículo está sendo lançado para este cliente */}
              {!otherPlateOwner &&
                placa.length >= 7 &&
                currentClient &&
                !currentClient.veiculos?.some((v) => normalizePlate(v.placa) === normalizePlate(placa)) && (
                  <div className="col-span-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2 animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Primeiro lançamento deste veículo:</strong> A placa <strong>{formatPlate(placa)}</strong> será salva automaticamente na frota de <strong>{currentClient.nomeFantasia}</strong> ao concluir a ordem.
                    </span>
                  </div>
                )}

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Modelo do Veículo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Toyota Hilux CD 4x4, Fiat Strada, etc."
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Contrato / Centro de Custo
                </label>
                <input
                  type="text"
                  placeholder="Ex: CT-2026/01, CC-FROTA-SP, Obra Norte, etc."
                  value={contratoCentroCusto}
                  onChange={(e) => setContratoCentroCusto(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  Identificador para faturamento e rateio do cliente (exibido nos relatórios de frotas).
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Responsável pelo Atendimento (Lavador / Atendente) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Condutor Responsável */}
          <div className="pt-2 border-t border-neutral-200">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2.5">
              2. Dados do Condutor do Veículo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome Completo do Condutor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome de quem trouxe o veículo"
                  value={nomeCondutor}
                  onChange={(e) => setNomeCondutor(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Matrícula / Registro do Condutor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: MAT-4890 ou CPF"
                  value={matriculaCondutor}
                  onChange={(e) => setMatriculaCondutor(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Serviços Realizados com Tabela do Cliente */}
          <div className="pt-2 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                3. Serviços Realizados & Tabela de Preço do Cliente
              </h3>
              <span className="text-[11px] text-neutral-500">
                Preços aplicados conforme contrato de: <strong className="text-neutral-800">{currentClient?.nomeFantasia}</strong>
              </span>
            </div>

            {/* Adicionar Serviço */}
            <div className="flex gap-2 mb-3">
              <select
                value={selectedServiceToAdd}
                onChange={(e) => setSelectedServiceToAdd(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
              >
                <option value="">Selecione um serviço para adicionar...</option>
                {services.map((srv) => {
                  const p = getServicePriceForClient(srv, currentClient);
                  return (
                    <option key={srv.id} value={srv.id}>
                      {srv.nome} — {formatCurrency(p)}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={handleAddService}
                disabled={!selectedServiceToAdd}
                className="px-3 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>

            {/* Tabela de itens selecionados */}
            <div className="border border-neutral-200 rounded-lg overflow-hidden mb-2">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Serviço</th>
                    <th className="py-2 px-3 font-semibold text-right w-24">Valor Unit.</th>
                    <th className="py-2 px-3 font-semibold text-center w-24">Qtd.</th>
                    <th className="py-2 px-3 font-semibold text-right w-28">Subtotal</th>
                    <th className="py-2 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {itensServico.map((item, idx) => (
                    <tr key={`${item.serviceId}-${idx}`} className="hover:bg-neutral-50">
                      <td className="py-2 px-3 font-medium text-neutral-900">{item.nome}</td>
                      <td className="py-2 px-3 text-right font-mono text-neutral-700">
                        {formatCurrency(item.preco)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={item.quantidade}
                          onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                          className="w-14 text-center px-1 py-1 border border-neutral-300 rounded text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-neutral-900">
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td className="py-2 px-2 text-center">
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
                      <td colSpan={5} className="py-4 text-center text-neutral-400 text-xs">
                        Nenhum serviço selecionado. Escolha um serviço acima para compor a ordem de serviço.
                      </td>
                    </tr>
                  )}
                </tbody>
                {itensServico.length > 0 && (
                  <tfoot className="bg-neutral-50 font-bold border-t border-neutral-200">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-right text-neutral-700">
                        VALOR TOTAL DO ATENDIMENTO:
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm font-mono text-neutral-950">
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
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2.5">
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
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Observações Adicionais (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Avarias pré-existentes, objeto deixado no veículo, detalhes do serviço..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          {/* Seção 6: Envio de Mensagem para o E-mail do Cliente */}
          <div className="pt-3 border-t border-neutral-200">
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enviarEmail}
                    onChange={(e) => setEnviarEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-neutral-300"
                  />
                  <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Enviar mensagem por e-mail para o cliente ao finalizar
                  </span>
                </label>
                {currentClient?.email ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full font-medium self-start sm:self-auto">
                    ✓ E-mail cadastrado
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-medium self-start sm:self-auto">
                    Sem e-mail salvo
                  </span>
                )}
              </div>

              {enviarEmail && (
                <div className="space-y-2.5 pt-2 border-t border-blue-200/60">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                      E-mail de Destino do Cliente:
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={emailDestino}
                        onChange={(e) => setEmailDestino(e.target.value)}
                        placeholder="Digite o e-mail do cliente (ex: contato@empresa.com)"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-neutral-900"
                      />
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-2.5 top-2.5" />
                    </div>

                    {!currentClient?.email && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="saveClientEmailCheckModal"
                          checked={salvarEmailNoCliente}
                          onChange={(e) => setSalvarEmailNoCliente(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-blue-600 border-neutral-300"
                        />
                        <label htmlFor="saveClientEmailCheckModal" className="text-[10px] text-neutral-600 cursor-pointer">
                          Salvar este e-mail no cadastro permanente de <strong>{currentClient?.nomeFantasia || 'Cliente'}</strong>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Prévia dos campos obrigatórios da mensagem */}
                  <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100 text-[11px] space-y-1 text-neutral-700">
                    <p className="font-semibold text-blue-900 flex items-center gap-1">
                      📋 Conteúdo da mensagem a ser enviada ao cliente:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px] text-neutral-600 pt-1">
                      <div className="bg-neutral-50 p-1.5 rounded border border-neutral-200">
                        <span className="text-neutral-400 block">Data e Hora:</span>
                        <strong className="text-neutral-900">{dataAtendimento || 'Hoje'} às {horaAtendimento || '--:--'}</strong>
                      </div>
                      <div className="bg-neutral-50 p-1.5 rounded border border-neutral-200">
                        <span className="text-neutral-400 block">Condutor:</span>
                        <strong className="text-neutral-900 truncate block">{nomeCondutor || '(A informar)'}</strong>
                      </div>
                      <div className="bg-neutral-50 p-1.5 rounded border border-neutral-200">
                        <span className="text-neutral-400 block">Serviços:</span>
                        <strong className="text-neutral-900 truncate block">
                          {itensServico.length > 0 ? `${itensServico.length} serviço(s)` : '(Nenhum)'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-neutral-600 bg-neutral-50 sm:bg-transparent p-2 sm:p-0 rounded-lg flex items-center justify-between sm:block border sm:border-0 border-neutral-200">
              <span>Total a Faturar:</span>
              <span className="text-base text-neutral-950 font-mono font-bold ml-1.5">{formatCurrency(valorTotal)}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={Boolean(otherPlateOwner)}
                title={otherPlateOwner ? 'Veículo pertence a outro cliente' : undefined}
                className={`flex-2 sm:flex-initial px-5 py-2.5 sm:py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  otherPlateOwner
                    ? 'bg-neutral-400 cursor-not-allowed opacity-60'
                    : 'bg-neutral-900 hover:bg-neutral-800'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                {existingLaunch ? 'Salvar Alterações' : 'Concluir Lançamento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
