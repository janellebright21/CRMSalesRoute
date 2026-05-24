import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, X, WifiOff } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'offline';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ICONS = {
  error:   <AlertCircle className="w-4 h-4 flex-shrink-0" />,
  success: <CheckCircle className="w-4 h-4 flex-shrink-0" />,
  offline: <WifiOff className="w-4 h-4 flex-shrink-0" />,
};

const STYLES = {
  error:   'bg-red-600 text-white',
  success: 'bg-emerald-600 text-white',
  offline: 'bg-amber-600 text-white',
};

function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    if (toast.type === 'offline') return; // sticky until dismissed
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast.type, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm w-full pointer-events-auto ${STYLES[toast.type]}`}
      role="alert"
    >
      {ICONS[toast.type]}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="ml-1 opacity-80 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none px-4">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
