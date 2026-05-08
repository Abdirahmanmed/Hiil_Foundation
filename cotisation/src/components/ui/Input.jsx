export default function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={
        // ✅ White / Green theme
        "w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-800 " +
        "placeholder:text-slate-400 outline-none transition shadow-sm " +
        "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200/60 " +
        "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 " +
        className
      }
    />
  );
}
