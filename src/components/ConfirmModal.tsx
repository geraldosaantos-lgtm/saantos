import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Sim, Excluir',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-sm overflow-hidden p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-neutral-900 leading-snug">{title}</h3>
            <p className="text-xs text-neutral-600 mt-1">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
