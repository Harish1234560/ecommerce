import { useToasts } from '@/store/toast';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-auto sm:items-end" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-lift"
          >
            {t.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : t.tone === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded p-0.5 text-stone-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
