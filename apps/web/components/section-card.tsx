type SectionCardProps = {
  title: string;
  subtitle?: string;
  description?: string;
  children: React.ReactNode;
};

export function SectionCard({ title, subtitle, description, children }: SectionCardProps) {
  return (
    <section className="rounded-4xl border border-white/70 bg-white/80 p-6 shadow-float backdrop-blur md:p-8">
      <div className="mb-6">
        {subtitle ? (
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-tide">{subtitle}</p>
        ) : null}
        <h2 className="mt-2 text-2xl font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
