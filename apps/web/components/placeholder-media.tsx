import { cn } from "@/lib/utils";

type PlaceholderMediaProps = {
  title: string;
  subtitle: string;
  tone: "signal" | "coral";
};

export function PlaceholderMedia({
  title,
  subtitle,
  tone
}: PlaceholderMediaProps) {
  return (
    <div
      className={cn(
        "rounded-[30px] border p-4",
        tone === "signal"
          ? "border-cyan-200 bg-cyan-50/70"
          : "border-rose-200 bg-rose-50/70"
      )}
    >
      <div className="mb-4">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="flex aspect-[4/5] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/75 text-center text-sm text-slate-500">
        Placeholder seguro
      </div>
    </div>
  );
}
