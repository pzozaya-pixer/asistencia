import { LoginCard } from "@/components/login-card";
import { ScreenFrame } from "@/components/screen-frame";

export default function LoginPage() {
  return (
    <ScreenFrame
      eyebrow="Control de asistencia"
      title="Acceso para responsables"
      description="Base demo sin backend real, optimizada para acceso rápido desde móvil o tablet en punto de entrada."
      aside={
        <div className="space-y-4 rounded-[28px] border border-white/60 bg-white/75 p-5 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-signal">
            Flujo previsto
          </p>
          <ul className="space-y-3 text-sm text-slate-600">
            <li>Entrar con usuario responsable.</li>
            <li>Consultar estado operativo y aforo.</li>
            <li>Atender búsqueda y validación de asistentes.</li>
          </ul>
        </div>
      }
    >
      <LoginCard />
    </ScreenFrame>
  );
}
