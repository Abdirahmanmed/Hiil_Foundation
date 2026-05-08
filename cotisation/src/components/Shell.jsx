export default function Shell({ children }) {
  return (
    <div className="min-h-screen bg-white text-black relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-96 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 bg-cyan-400/10 blur-3xl" />
      </div>
      <div className=" px-4 py-10">{children}</div>
    </div>
  );
}
