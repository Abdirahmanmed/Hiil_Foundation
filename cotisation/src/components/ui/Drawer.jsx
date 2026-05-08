export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  right,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-emerald-100 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-900">{title}</div>
            {subtitle ? (
              <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {right}
            <button
              onClick={onClose}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 hover:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="mt-5 h-[calc(100vh-110px)] overflow-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
