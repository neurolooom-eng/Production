import * as L from 'lucide-react';

export function Modal({ title, subtitle, onClose, children, footer, wide }: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-auto" onClick={onClose}>
      <div className={`card shadow-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} my-8`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-4 border-b border-line">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
          </div>
          <button className="btn-ghost" onClick={onClose}><L.X size={18} /></button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 p-4 border-t border-line bg-surface-2">{footer}</div>}
      </div>
    </div>
  );
}
