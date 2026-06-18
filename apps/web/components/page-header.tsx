type PageHeaderProps = {
  overline: string;
  title: string;
  description: string;
};

export function PageHeader({
  overline,
  title,
  description
}: PageHeaderProps) {
  return (
    <header className="space-y-2">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-signal">
        {overline}
      </p>
      <h1 className="font-[family:var(--font-heading)] text-3xl font-bold text-ink">
        {title}
      </h1>
      <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </header>
  );
}
