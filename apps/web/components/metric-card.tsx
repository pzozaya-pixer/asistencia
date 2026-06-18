import { StatusBadge } from "@/components/status-badge";

type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
  delta: string;
  tone: "success" | "warning" | "info";
};

export function MetricCard({ label, value, hint, delta, tone }: MetricCardProps) {
  return (
    <article className="rounded-[30px] border border-slate-200/70 bg-white/80 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <StatusBadge tone={tone}>{delta}</StatusBadge>
      </div>
      <p className="font-[family:var(--font-heading)] text-3xl font-bold text-ink">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </article>
  );
}
