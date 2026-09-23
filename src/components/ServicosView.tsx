import React, { useState } from 'react';
import { ServiceItem } from '../types';
import { formatCurrency } from '../utils/storage';
import {
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  Info
} from 'lucide-react';

interface ServicosViewProps {
  services: ServiceItem[];
  onSaveService: (service: ServiceItem) => void;
  onDeleteService: (id: string) => void;
}

export const ServicosView: React.FC<ServicosViewProps> = ({
  services,
  onSaveService,
  onDeleteService,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  const [formData, setFormData] = useState<Omit<ServiceItem, 'id'>>({
    codigo: '',
    nome: '',
    categoria: 'Passeio / Leve',
    precoPadrao: 50.0,
    descricao: '',
    ativo: true,
  });

  const [errorMsg, setErrorMsg] = useState('');

  const filteredServices = services.filter(
    (s) =>
      s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenNew = () => {
    const nextCode = `SRV-0${services.length + 1}`;
    setFormData({
      codigo: nextCode,
      nome: '',
      categoria: 'Passeio / Leve',
      precoPadrao: 50.0,
      descricao: '',
      ativo: true,
    });
    setEditingService(null);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: ServiceItem) => {
    setFormData({
      codigo: service.codigo,
      nome: service.nome,
      categoria: service.categoria,
      precoPadrao: service.precoPadrao,
      descricao: service.descricao || '',
      ativo: service.ativo,
    });
    setEditingService(service);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setErrorMsg('Informe o nome do serviço.');
      return;
    }

    const serviceToSave: ServiceItem = {
      id: editingService ? editingService.id : `srv-${Date.now()}`,
      codigo: formData.codigo.trim() || `SRV-${Date.now().toString().slice(-4)}`,
      nome: formData.nome.trim(),
      categoria: formData.categoria,
      precoPadrao: Number(formData.precoPadrao) || 0,
      descricao: formData.descricao?.trim(),
      ativo: formData.ativo,
    };

    onSaveService(serviceToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Cadastro Geral de Serviços</h1>
          <p className="text-xs text-neutral-500">
            Cadastre os tipos de lavagem e serviços automotivos com seus preços padrão de referência.
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Serviço
        </button>
      </div>

      {/* Nota Explicativa sobre Tabela por Cliente */}
      <div className="p-3.5 bg-neutral-100/80 border border-neutral-200 rounded-xl flex items-start gap-2.5 text-xs text-neutral-700">
        <Info className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-neutral-900">Atenção sobre Tabela de Preço por Cliente:</strong>
          <span className="text-neutral-600 ml-1">
            O preço cadastrado aqui é o <em>preço padrão de referência</em>. No menu <strong>Cadastro de Clientes</strong>, você pode definir um valor contratual específico e exclusivo de cada serviço para cada empresa ou frota.
          </span>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-lg max-w-md shadow-xs">
        <Search className="w-4 h-4 text-neutral-400 shrink-0" />
        <input
          type="text"
          placeholder="Buscar serviço por nome, código ou categoria..."
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

      {/* Grid de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-all flex flex-col justify-between shadow-xs"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-neutral-100 rounded-lg text-neutral-800">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                      {service.nome}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono mt-0.5">
                      <span>{service.codigo}</span>
                      <span>·</span>
                      <span className="font-sans text-neutral-600">{service.categoria}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(service)}
                    title="Editar Serviço"
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Deseja remover o serviço ${service.nome}?`)) {
                        onDeleteService(service.id);
                      }
                    }}
                    title="Excluir Serviço"
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {service.descricao && (
                <p className="text-xs text-neutral-600 line-clamp-2">
                  {service.descricao}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">Preço Padrão:</span>
              <span className="text-base font-bold font-mono text-neutral-900">
                {formatCurrency(service.precoPadrao)}
              </span>
            </div>
          </div>
        ))}

        {filteredServices.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white border border-neutral-200 rounded-xl">
            <Wrench className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-800">Nenhum serviço cadastrado</p>
            <p className="text-xs text-neutral-500 mt-1">
              Cadastre serviços como Lavagem Simples, Geral, Higienização, Motor ou Chassi.
            </p>
            <button
              onClick={handleOpenNew}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar Primeiro Serviço
            </button>
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden my-4">
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">
                {editingService ? 'Editar Serviço' : 'Novo Serviço Automotivo'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-3 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="SRV-01"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categoria: e.target.value as ServiceItem['categoria'],
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                  >
                    <option value="Passeio / Leve">Passeio / Leve</option>
                    <option value="SUV / Caminhonete">SUV / Caminhonete</option>
                    <option value="Van / Utilitário">Van / Utilitário</option>
                    <option value="Caminhão / Pesado">Caminhão / Pesado</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lavagem Completa com Cera e Aspiração"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Preço Padrão de Referência (R$) *
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  required
                  placeholder="0,00"
                  value={formData.precoPadrao}
                  onChange={(e) =>
                    setFormData({ ...formData, precoPadrao: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono font-bold"
                />
                <span className="text-[11px] text-neutral-500 block mt-1">
                  Preço base aplicado quando o cliente não tiver um valor diferenciado cadastrado.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Descrição dos Itens Inclusos
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Ducha externa com shampoo com cera, aspiração dos estofados e pretinho..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-3">
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
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
