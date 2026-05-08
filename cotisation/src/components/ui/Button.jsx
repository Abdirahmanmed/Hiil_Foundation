export function PrimaryButton({ loading, className = "", children, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={
        "relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-slate-950 transition " +
        "bg-gradient-to-r from-emerald-400 to-lime-300 hover:brightness-110 active:brightness-95 " +
        "disabled:cursor-not-allowed disabled:opacity-70 ring-1 ring-white/10 shadow-glow " +
        className
      }
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/40 border-t-slate-950" />
          <span>Chargement...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function GhostButton({ className = "", children, ...props }) {
  return (
    <button
      {...props}
      className={
        "inline-flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition " +
        "hover:bg-emerald-50 hover:border-emerald-300 " +
        "active:bg-emerald-100 " +
        "focus:outline-none focus:ring-4 focus:ring-emerald-100 " +
        className
      }
    >
      {children}
    </button>
  );
}
