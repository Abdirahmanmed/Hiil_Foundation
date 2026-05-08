export default function Card({ className = "", children }) {
  return (
    <div
      className={
        "rounded-3xl border border-emerald-100 bg-white shadow-lg " +
        "shadow-emerald-100/50 transition-all duration-300 " +
        "hover:shadow-xl hover:shadow-emerald-200/60 " +
        className
      }
    >
      {children}
    </div>
  );
}
