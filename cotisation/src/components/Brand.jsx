export default function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-16 w-16 place-items-center rounded-2xl text-slate-950 shadow-glow">
        <img
          src="/logoherciise.jpeg"
          alt="Hiil Foundation"
          style={{
            height: 60,
            width: "auto",
            objectFit: "contain",
          }}
        />
      </div>
      <div>
        <div className="text-lg font-black tracking-tight">Hiil Foundation</div>
        <div className="text-xs text-black/55">Sécurisé • VIP-ready</div>
      </div>
    </div>
  );
}
