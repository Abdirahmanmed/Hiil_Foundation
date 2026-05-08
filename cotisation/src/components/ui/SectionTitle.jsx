export default function SectionTitle({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-black text-slate-900">{title}</div>

        {subtitle ? (
          <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
        ) : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
