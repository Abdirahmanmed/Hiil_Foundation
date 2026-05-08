export default function Badge({ tone = "neutral", children }) {
  const map = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    yellow: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
    purple: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${map[tone]}`}
    >
      {children}
    </span>
  );
}