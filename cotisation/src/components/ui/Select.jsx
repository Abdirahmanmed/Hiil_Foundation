export default function Select({ className = "", children, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={
          // ✅ White/Green theme
          "w-full appearance-none rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition " +
          "shadow-sm " +
          "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200/60 " +
          "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 " +
          className
        }
      >
        {children}
      </select>

      {/* chevron */}
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
        ▾
      </div>
    </div>
  );
}
