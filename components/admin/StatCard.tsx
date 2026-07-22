export default function StatCard({
  label,
  value,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  icon: string;
  tone?: "primary" | "secondary" | "error";
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary-container/40 text-on-secondary-container",
    error: "bg-error-container/40 text-error",
  };

  return (
    <div className="bg-surface-container-lowest p-md rounded-2xl cloud-shadow border border-outline-variant/50 flex flex-col gap-sm">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${toneClasses[tone]}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="font-label-md text-label-md text-on-surface-variant">{label}</p>
      <h3 className="font-headline-sm text-headline-sm text-on-surface">{value}</h3>
    </div>
  );
}
