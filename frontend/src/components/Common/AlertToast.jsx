import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export function AlertToast({ alert, onDismiss }) {
  if (!alert) return null;

  const { type = 'warning', title, message, duration = 6000 } = alert;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [alert, duration, onDismiss]);

  const config = {
    warning: {
      bg: 'bg-amber-950/90 border-amber-500/50 text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
    },
    danger: {
      bg: 'bg-rose-950/90 border-rose-500/50 text-rose-200',
      icon: <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
    },
    success: {
      bg: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
    },
    info: {
      bg: 'bg-sky-950/90 border-sky-500/50 text-sky-200',
      icon: <Info className="w-5 h-5 text-sky-400 flex-shrink-0" />
    }
  }[type] || {
    bg: 'bg-slate-900/90 border-slate-700 text-slate-200',
    icon: <Info className="w-5 h-5 text-sky-400 flex-shrink-0" />
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className={`flex items-start space-x-3 p-3.5 rounded-xl border backdrop-blur-md shadow-2xl ${config.bg}`}>
        {config.icon}
        <div className="flex-1 min-w-0">
          {title && <h4 className="text-xs font-bold uppercase tracking-wider">{title}</h4>}
          <p className="text-xs font-medium mt-0.5 leading-relaxed">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
