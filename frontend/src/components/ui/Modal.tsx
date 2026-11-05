import { Button, IconButton } from '@/components/ui/Button';
import clsx from 'clsx';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// A centred dialog on larger screens and a bottom sheet on phones: it slides up from the bottom edge,
// has a grab handle, and can be dismissed by dragging the handle down, tapping outside or Escape.
export function Modal({ open, onClose, title, children, footer, size = 'md', dismissable = true }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; dismissable?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose, dismissable]);

  const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size];
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]" onClick={dismissable ? onClose : undefined} />
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            drag={dismissable ? 'y' : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) onClose();
            }}
            className={clsx('relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white pb-safe-b shadow-lift outline-none sm:rounded-2xl sm:pb-0', width)}
          >
            {dismissable && (
              <div onPointerDown={(e) => drag.start(e)} className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing sm:hidden" aria-hidden>
                <span className="h-1 w-10 rounded-full bg-stone-300" />
              </div>
            )}
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-2.5 sm:py-3">
              <h2 className="text-base font-semibold text-stone-900">{title}</h2>
              {dismissable && (
                <IconButton label="Close" onClick={onClose} className="-mr-3 h-11 w-11">
                  <X className="h-4 w-4" />
                </IconButton>
              )}
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 px-5 py-3 max-sm:[&>*]:h-11 max-sm:[&>*]:flex-1">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-stone-600">{message}</div>
    </Modal>
  );
}
