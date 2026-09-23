import React, { useState } from 'react';
import { ServiceLaunch } from '../types';
import { formatCurrency, formatDateTime } from '../utils/storage';
import { ConfirmModal } from './ConfirmModal';
import {
  Car,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  Eye,
  FileSpreadsheet
} from 'lucide-react';

interface LancamentosViewProps {
  launches: ServiceLaunch[];
  onOpenNewLaunch: () => void;
  onEditLaunch: (launch: ServiceLaunch) => void;
  onDeleteLaunch: (id: string) => void;
}

export const LancamentosView: React.FC<LancamentosViewProps> = ({
  launches,
  onOpenNewLaunch,
  onEditLaunch,
  onDeleteLaunch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSignature, setSelectedSignature] = useState<{
    launch: ServiceLaunch;
  } | null>(null);
  const [launchToDelete, setLaunchToDelete] = useState<ServiceLaunch | null>(null);

  const filtered = launches.filter((l) => {
    const term = searchTerm.toLowerCase();
    return (
      l.placa.toLowerCase().includes(term) ||
      l.modelo.toLowerCase().includes(term) ||
      l.clienteNome.toLowerCase().includes(term) ||
      l.nomeCondutor.toLowerCase().includes(term) ||
      l.matriculaCondutor.toLowerCase().includes(term) ||
      l.numeroOS.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Lançamentos de Serviços Automotivos
          </h1>
          <p className="text-xs text-neutral-500">
            Histórico completo de ordens de serviço, veículos lavados, condutores e assinaturas registradas.
          </p>
        </div>
        <button
          onClick={onOpenNewLaunch}
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Lançamento
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-lg max-w-md shadow-xs">
        <Search className="w-4 h-4 text-neutral-400 shrink-0" />
        <input
          type="text"
          placeholder="Buscar por placa, modelo, condutor, matrícula ou OS..."
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

      {/* Visualização para Celular: Cards Otimizados para Touch (md:hidden) */}
      <div className="block md:hidden space-y-3">
        {filtered.map((l) => (
          <div
            key={l.id}
            className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-3"
          >
            {/* Linha superior: Placa, Nº OS e Data */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-block border border-neutral-800 rounded px-2 py-0.5 font-mono font-extrabold text-xs text-neutral-900 bg-neutral-50 shadow-2xs">
                  {l.placa}
                </span>
                <span className="font-mono text-xs font-bold text-neutral-700">
                  {l.numeroOS}
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">
                {formatDateTime(l.dataHora)}
              </span>
            </div>

            {/* Veículo e Cliente */}
            <div>
              <div className="text-xs font-bold text-neutral-900">{l.modelo}</div>
              <div className="text-[11px] text-neutral-600 truncate">{l.clienteNome}</div>
              {l.km && l.km !== '0' && (
                <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                  KM: {l.km}
                </div>
              )}
            </div>

            {/* Serviços Executados */}
            <div className="bg-neutral-50 rounded-lg p-2.5 text-xs text-neutral-800 space-y-1">
              <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                Serviços:
              </div>
              <div className="font-medium">
                {l.servicos.map((s) => s.nome).join(', ')}
              </div>
            </div>

            {/* Total e Condutor */}
            <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-xs">
              <div>
                <span className="text-[10px] text-neutral-500 block">Total</span>
                <span className="font-mono font-bold text-sm text-neutral-950">
                  {formatCurrency(l.valorTotal)}
                </span>
              </div>

              {/* Assinatura */}
              <div className="text-right">
                <span className="text-[10px] text-neutral-500 block">Condutor: {l.nomeCondutor}</span>
                {l.assinatura ? (
                  <button
                    onClick={() => setSelectedSignature({ launch: l })}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mt-0.5"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Ver Assinatura
                  </button>
                ) : (
                  <span className="text-[10px] text-neutral-400">Assinatura Pendente</span>
                )}
              </div>
            </div>

            {/* Botões de Ação para Celular */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => onEditLaunch(l)}
                className="py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-neutral-600" />
                Editar
              </button>
              <button
                onClick={() => setLaunchToDelete(l)}
                className="py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                Excluir
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-neutral-400">
            <Car className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
            <p className="text-xs font-semibold text-neutral-700">Nenhum lançamento encontrado</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Toque no botão de Lançamento para registrar um serviço.
            </p>
          </div>
        )}
      </div>

      {/* Tabela de Lançamentos para Computador / Tablet (hidden md:block) */}
      <div className="hidden md:block bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold w-24">Data/Hora</th>
                <th className="py-2.5 px-3 font-semibold w-20">Nº OS</th>
                <th className="py-2.5 px-3 font-semibold w-32">Cliente</th>
                <th className="py-2.5 px-3 font-semibold w-36">Veículo / Placa</th>
                <th className="py-2.5 px-3 font-semibold w-16">KM</th>
                <th className="py-2.5 px-3 font-semibold">Serviços Executados</th>
                <th className="py-2.5 px-3 font-semibold text-right w-24">Valor</th>
                <th className="py-2.5 px-3 font-semibold w-36">Condutor / Matrícula</th>
                <th className="py-2.5 px-3 font-semibold text-center w-24">Assinatura</th>
                <th className="py-2.5 px-3 font-semibold text-center w-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-neutral-600 whitespace-nowrap">
                    {formatDateTime(l.dataHora)}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">
                    {l.numeroOS}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-neutral-900">
                    {l.clienteNome}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-neutral-950 block">
                      {l.placa}
                    </span>
                    <span className="text-[11px] text-neutral-500 block truncate max-w-[150px]">
                      {l.modelo}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-neutral-700">
                    {l.km}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-800">
                    <div className="line-clamp-2">
                      {l.servicos.map((s) => s.nome).join(', ')}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-950 whitespace-nowrap">
                    {formatCurrency(l.valorTotal)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-neutral-900 block leading-tight">
                      {l.nomeCondutor}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 block">
                      Mat: {l.matriculaCondutor}
                    </span>
                    <span className="text-[10px] text-neutral-400 block">
                      Resp: {l.responsavel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {l.assinatura ? (
                      <button
                        onClick={() => setSelectedSignature({ launch: l })}
                        className="inline-flex items-center gap-1 text-[11px] text-neutral-700 hover:text-neutral-950 hover:underline font-medium"
                        title="Ver assinatura do condutor"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <Eye className="w-3 h-3 text-neutral-400" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-neutral-400">Pendente</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditLaunch(l)}
                        title="Editar Lançamento"
                        className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setLaunchToDelete(l)}
                        title="Excluir Lançamento"
                        className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-neutral-400">
                    <Car className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="text-xs font-semibold text-neutral-700">Nenhum lançamento encontrado</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Clique em "Novo Lançamento" para registrar uma nova ordem de serviço.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={Boolean(launchToDelete)}
        title="Excluir Ordem de Serviço"
        message={
          launchToDelete
            ? `Tem certeza que deseja excluir o lançamento #${launchToDelete.numeroOS} (${launchToDelete.placa} - ${launchToDelete.clienteNome})? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (launchToDelete) {
            onDeleteLaunch(launchToDelete.id);
            setLaunchToDelete(null);
          }
        }}
        onCancel={() => setLaunchToDelete(null)}
      />

      {/* Modal de Visualização da Assinatura Coletada */}
      {selectedSignature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Assinatura Digital Coletada · {selectedSignature.launch.numeroOS}
                </h3>
                <p className="text-xs text-neutral-500">
                  Condutor: {selectedSignature.launch.nomeCondutor} (Mat: {selectedSignature.launch.matriculaCondutor})
                </p>
              </div>
              <button
                onClick={() => setSelectedSignature(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-neutral-300 rounded-lg p-3 bg-neutral-50 flex flex-col items-center justify-center">
              <img
                src={selectedSignature.launch.assinatura}
                alt="Assinatura"
                className="max-h-40 w-full object-contain bg-white rounded border border-neutral-200 p-2"
              />
              <div className="mt-3 text-center text-xs text-neutral-600">
                <p className="font-semibold">{selectedSignature.launch.nomeCondutor}</p>
                <p className="text-[10px] text-neutral-500 font-mono">
                  Placa: {selectedSignature.launch.placa} · Data: {formatDateTime(selectedSignature.launch.dataHora)}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedSignature(null)}
                className="px-4 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
