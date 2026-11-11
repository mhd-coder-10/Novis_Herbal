import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, AlertCircle, X, Loader2 } from 'lucide-react';

export interface AdminConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  itemName?: string;
  itemBadge?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  isOpen,
  title = 'Confirm Deletion',
  message,
  confirmLabel = 'Delete Permanently',
  cancelLabel = 'Cancel',
  variant = 'danger',
  itemName,
  itemBadge,
  isLoading = false,
  onConfirm,
  onClose
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={() => !isLoading && onClose()}
      />

      {/* Centered Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/90 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close icon button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 space-y-4">
          {/* Header Icon + Title */}
          <div className="flex items-start space-x-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                variant === 'danger'
                  ? 'bg-rose-50 border-rose-200/80 text-rose-600'
                  : variant === 'warning'
                    ? 'bg-amber-50 border-amber-200/80 text-amber-600'
                    : 'bg-blue-50 border-blue-200/80 text-blue-600'
              }`}
            >
              {variant === 'danger' ? (
                <Trash2 className="w-6 h-6" />
              ) : variant === 'warning' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>

            <div className="pr-6">
              <h3 className="font-serif text-lg font-bold text-forest-950 tracking-tight">
                {title}
              </h3>
              {itemBadge && (
                <span className="inline-block mt-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {itemBadge}
                </span>
              )}
            </div>
          </div>

          {/* Item details if specified */}
          {itemName && (
            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-slate-200/70 text-xs text-slate-700 font-medium">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                Selected Item
              </span>
              <p className="font-bold text-forest-950 mt-0.5 truncate">{itemName}</p>
            </div>
          )}

          {/* Warning Message */}
          <p className="text-xs text-slate-600 leading-relaxed">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-md cursor-pointer disabled:opacity-50 ${
                variant === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                  : variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                    : 'bg-forest-900 hover:bg-forest-950 text-white shadow-forest-900/20'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {variant === 'danger' && <Trash2 className="w-3.5 h-3.5" />}
                  <span>{confirmLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

