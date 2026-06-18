import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone: "success" | "warning" | "danger" | "info";
};

export function StatusBadge({ children, tone }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
        tone === "success" && "bg-emerald-100 text-emerald-700",
        tone === "warning" && "bg-amber-100 text-amber-700",
        tone === "danger" && "bg-rose-100 text-rose-700",
        tone === "info" && "bg-cyan-100 text-cyan-700"
      )}
    >
      {children}
    </span>
  );
}
