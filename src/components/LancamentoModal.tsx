import React, { useState, useEffect } from 'react';
import { Client, ServiceItem, ServiceLaunch, ServiceItemLaunch } from '../types';
import { SignaturePad } from './SignaturePad';
import { formatCurrency, formatPlate } from '../utils/storage';
import { X, Plus, Trash2, CheckCircle, Car } from 'lucide-react';

interface LancamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  services: ServiceItem[];
  onSave: (launch: ServiceLaunch) => void;
  existingLaunch?: ServiceLaunch | null;
}

export const LancamentoModal: React.FC<LancamentoModalProps> = ({
  isOpen,
  onClose,
  clients,
  services,
  onSave,
  existingLaunch = null,
}) => {
  const [clienteId, setClienteId] = useState('');
  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [km, setKm] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [nomeCondutor, setNomeCondutor] = useState('');
  const [matriculaCondutor, setMatriculaCondutor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [assinatura, setAssinatura] = useState('');
  const [itensServico, setItensServico] = useState<ServiceItemLaunch[]>([]);
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sincroniza estado se for edição ou novo
  useEffect(() => {
    if (existingLaunch) {
      setClienteId(existingLaunch.clienteId);
      setPlaca(existingLaunch.placa);
      setModelo(existingLaunch.modelo);
      setKm(String(existingLaunch.km));
      setResponsavel(existingLaunch.responsavel);
      setNomeCondutor(existingLaunch.nomeCondutor);
      setMatriculaCondutor(existingLaunch.matriculaCondutor);
      setObservacoes(existingLaunch.observacoes || '');
      setAssinatura(existingLaunch.assinatura);
      setItensServico(existingLaunch.servicos);
    } else {
      // Padrões para novo lançamento
      const firstCli = clients[0]?.id || '';
      setClienteId(firstCli);
      setPlaca('');
      setModelo('');
      setKm('');
      setResponsavel('Operador / Lavador Geral');
      setNomeCondutor('');
      setMatriculaCondutor('');
      setObservacoes('');
      setAssinatura('');

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
    if (!placa.trim() || !modelo.trim() || !responsavel.trim() || !nomeCondutor.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (Placa, Modelo, Responsável, Nome do Condutor).');
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

    const launch: ServiceLaunch = {
      id: existingLaunch ? existingLaunch.id : `lnc-${Date.now()}`,
      numeroOS: existingLaunch ? existingLaunch.numeroOS : `OS-${Math.floor(10000 + Math.random() * 90000)}`,
      dataHora: existingLaunch ? existingLaunch.dataHora : new Date().toISOString(),
      clienteId: currentClient?.id || '',
      clienteNome: currentClient?.nomeFantasia || currentClient?.razaoSocial || 'Cliente Geral',
      clienteCnpj: currentClient?.cnpj || '',
      placa: formatPlate(placa),
      modelo: modelo.trim(),
      km: km.trim() || '0',
      responsavel: responsavel.trim(),
      nomeCondutor: nomeCondutor.trim(),
      matriculaCondutor: matriculaCondutor.trim() || 'S/N',
      servicos: itensServico,
      valorTotal: valorTotal,
      assinatura: assinatura,
      observacoes: observacoes.trim(),
      status: 'Concluído',
    };

    onSave(launch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden my-4">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-900 text-white rounded-lg">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {existingLaunch ? `Editar Lançamento #${existingLaunch.numeroOS}` : 'Novo Lançamento de Serviço Automotivo'}
              </h2>
              <p className="text-xs text-neutral-500">
                Registre os dados do veículo, condutor, serviços e colete a assinatura digital.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex justify-between items-center">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-red-500 font-bold ml-2">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Seção 1: Cliente e Veículo */}
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2.5">
              1. Cliente & Identificação do Veículo
            </h3>
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
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono font-bold tracking-wider"
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

          {/* Ações */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
            <div className="text-xs text-neutral-600">
              Total a Faturar: <strong className="text-base text-neutral-950 font-mono">{formatCurrency(valorTotal)}</strong>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                {existingLaunch ? 'Salvar Alterações' : 'Concluir e Gravar Lançamento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
