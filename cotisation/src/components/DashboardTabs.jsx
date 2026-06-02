export default function DashboardTabs({ tabs, activeTab, onChange, className = "" }) {
  return (
    <div className={`-mx-4 overflow-x-auto px-4 pb-1 ${className}`}>
      <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-black transition sm:text-sm",
              activeTab === tab.id
                ? "border-emerald-200 bg-emerald-600 text-white shadow-sm"
                : "border-emerald-100 bg-white text-slate-700 hover:bg-emerald-50",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
