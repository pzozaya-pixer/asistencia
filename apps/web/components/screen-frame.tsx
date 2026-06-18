type ScreenFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
};

export function ScreenFrame({
  eyebrow,
  title,
  description,
  aside,
  children
}: ScreenFrameProps) {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between rounded-[36px] border border-white/60 bg-white/72 p-6 shadow-panel backdrop-blur xl:p-10">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-signal">
              {eyebrow}
            </p>
            <div className="max-w-xl space-y-3">
              <h1 className="font-[family:var(--font-heading)] text-4xl font-bold leading-tight text-ink sm:text-5xl">
                {title}
              </h1>
              <p className="text-base leading-7 text-slate-600 sm:text-lg">
                {description}
              </p>
            </div>
          </div>
          <div className="mt-8 hidden lg:block">{aside}</div>
        </section>
        <section className="flex items-center justify-center">{children}</section>
      </div>
    </main>
  );
}
