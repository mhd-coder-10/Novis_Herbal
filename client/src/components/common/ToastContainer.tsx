import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore, ToastItem } from '../../store/useToastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  const getToastConfig = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          iconColor: 'text-emerald-600',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          borderColor: 'border-emerald-200/80',
          barColor: 'bg-emerald-600',
          shadow: 'shadow-[0_10px_35px_rgba(16,185,129,0.14)]'
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-rose-600',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          borderColor: 'border-rose-200/80',
          barColor: 'bg-rose-600',
          shadow: 'shadow-[0_10px_35px_rgba(244,63,94,0.14)]'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          borderColor: 'border-amber-200/80',
          barColor: 'bg-amber-500',
          shadow: 'shadow-[0_10px_35px_rgba(245,158,11,0.14)]'
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconColor: 'text-forest-800',
          badgeBg: 'bg-forest-900/10 text-forest-950 border-forest-900/20',
          borderColor: 'border-forest-900/20',
          barColor: 'bg-forest-900',
          shadow: 'shadow-[0_10px_35px_rgba(19,62,43,0.12)]'
        };
    }
  };

  return (
    <div
      aria-live="polite"
      className="fixed top-3 right-3 sm:top-5 sm:right-5 z-[99999] flex flex-col space-y-2.5 max-w-[92vw] sm:max-w-md pointer-events-none"
    >
      {toasts.map((t) => {
        const config = getToastConfig(t.type);
        const IconComponent = config.icon;

        return (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl border ${config.borderColor} ${config.shadow} p-3.5 sm:p-4 flex items-start space-x-3 transition-all duration-300 transform translate-y-0 opacity-100 hover:scale-[1.01] relative overflow-hidden`}
          >
            {/* Left Accent Icon */}
            <div className="shrink-0 mt-0.5">
              <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
            </div>

            {/* Content Text */}
            <div className="flex-1 min-w-0 pr-2">
              {t.title && (
                <div className="flex items-center space-x-2 mb-0.5">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.badgeBg}`}>
                    {t.title}
                  </span>
                </div>
              )}
              <p className="text-xs sm:text-sm font-semibold text-forest-950 leading-snug break-words">
                {t.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100/70 transition"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Subtle Progress Bar */}
            {t.duration && t.duration > 0 && (
              <div
                className={`absolute bottom-0 left-0 h-1 ${config.barColor} opacity-75`}
                style={{
                  width: '100%',
                  animation: `toastProgress ${t.duration}ms linear forwards`
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
