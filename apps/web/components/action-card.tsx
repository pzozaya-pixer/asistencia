import Link from "next/link";

import { cn } from "@/lib/utils";

type ActionCardProps = {
  href: string;
  title: string;
  description: string;
  accent: "signal" | "coral";
};

export function ActionCard({
  href,
  title,
  description,
  accent
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-[30px] border p-5 transition hover:-translate-y-1 hover:shadow-panel",
        accent === "signal"
          ? "border-cyan-200 bg-cyan-50/80"
          : "border-rose-200 bg-rose-50/80"
      )}
    >
      <p className="mb-2 font-[family:var(--font-heading)] text-2xl font-bold text-ink">
        {title}
      </p>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}
