export const activities = [
  {
    id: "ACT-001",
    name: "Jornada de insercion laboral",
    schedule: "18 Jun 2026 · 10:00 - 14:00",
    location: "Centro Cívico Norte",
    status: "Activa",
    capacity: "72/100"
  },
  {
    id: "ACT-002",
    name: "Tutoría intensiva de orientación",
    schedule: "19 Jun 2026 · 16:00 - 19:00",
    location: "Aula Digital 3",
    status: "Borrador",
    capacity: "18/25"
  }
];

export const attendees = [
  {
    id: "AST-204",
    dni: "12345678A",
    phone: "600123123",
    name: "Lucia Moreno",
    activity: "Jornada de insercion laboral",
    qrCode: "QR-TEMP-1A9ZK",
    photoInitials: "LM",
    statusTone: "success" as const,
    statusLabel: "Confirmada",
    table: "A-01"
  },
  {
    id: "AST-318",
    dni: "23456789B",
    phone: "611234234",
    name: "Carlos Vega",
    activity: "Jornada de insercion laboral",
    qrCode: "QR-TEMP-7K2XP",
    photoInitials: "CV",
    statusTone: "warning" as const,
    statusLabel: "Revisión",
    table: "B-04"
  },
  {
    id: "AST-455",
    dni: "34567890C",
    phone: "622345345",
    name: "Amina Torres",
    activity: "Tutoría intensiva de orientación",
    qrCode: "QR-TEMP-9M4QR",
    photoInitials: "AT",
    statusTone: "info" as const,
    statusLabel: "Pendiente",
    table: "C-02"
  }
] as const;

export const attendee = attendees[0];

export const stats = [
  { label: "Asistentes registrados", value: "1.248" },
  { label: "Actividades activas", value: "12" },
  { label: "Firmas pendientes", value: "08" }
];

export const dashboardMetrics = [
  {
    label: "Check-ins hoy",
    value: "186",
    hint: "+12 frente al último evento",
    delta: "+7%",
    tone: "success" as const
  },
  {
    label: "Pendientes de validar",
    value: "9",
    hint: "4 con firma pendiente",
    delta: "9 casos",
    tone: "warning" as const
  },
  {
    label: "Puestos activos",
    value: "6",
    hint: "2 móviles + 4 mesa fija",
    delta: "Online",
    tone: "info" as const
  },
  {
    label: "Incidencias abiertas",
    value: "3",
    hint: "Sin bloqueos críticos",
    delta: "-1",
    tone: "success" as const
  }
];

export const dashboardAlerts = [
  {
    title: "Faltan dos firmas de cierre",
    description: "El turno de mañana aún tiene asistentes con validación visual sin firma capturada.",
    tone: "warning" as const,
    label: "Seguimiento"
  },
  {
    title: "MinIO operativo",
    description: "Los buckets privados están disponibles para fotos y evidencias de la demo.",
    tone: "success" as const,
    label: "Correcto"
  }
];

export const recentCheckIns = [
  { name: "Lucia Moreno", time: "10:11", accessPoint: "Mesa norte", mode: "QR" },
  { name: "Carlos Vega", time: "10:14", accessPoint: "Tablet acceso 2", mode: "Manual" },
  { name: "Amina Torres", time: "10:18", accessPoint: "Mesa norte", mode: "QR" }
];

export const validationQueue = [
  { name: "Carlos Vega", reason: "Documento pendiente de revisión visual" },
  { name: "Nadia Ruiz", reason: "Firma simple aún no confirmada" },
  { name: "Javier Soler", reason: "Intento duplicado detectado en la demo" }
];
