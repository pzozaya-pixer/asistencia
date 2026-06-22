const baseUrl = process.env.DEMO_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const demoEmail = process.env.DEMO_EMAIL ?? 'responsable@demo.local';
const demoPassword = process.env.DEMO_PASSWORD ?? 'responsable123';
const automationSecret = process.env.AUTOMATION_SECRET ?? '';

const signatureDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnPZXsAAAAASUVORK5CYII=';
const tinyPngBytes = Buffer.from(
  signatureDataUrl.replace('data:image/png;base64,', ''),
  'base64',
);

async function main() {
  const created = {
    activityId: null,
    attendeeId: null,
    qrToken: null,
  };

  await runStep('Health OK', async () => {
    const payload = await request('/health');
    assert(payload.status === 'ok', 'health no devolvio ok');
  });

  await runStep('Health ready', async () => {
    const response = await rawRequest('/health/ready');
    assert([200, 503].includes(response.status), 'health/ready devolvio estado inesperado');
    const payload = await response.json();
    assert(payload.service === 'asistencia-api', 'health/ready sin servicio esperado');
  });

  const login = await runStep('Login responsable demo', async () => {
    const payload = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: demoEmail,
        password: demoPassword,
      }),
    });

    assert(payload.accessToken, 'login sin access token');
    return payload;
  });

  const authHeaders = {
    Authorization: `Bearer ${login.accessToken}`,
  };

  const createdActivity = await runStep('Crear actividad demo', async () => {
    const unique = Date.now();
    const payload = await request(
      '/activities',
      {
        method: 'POST',
        body: JSON.stringify({
          codigo: `DEMO-${unique}`,
          nombre: `Actividad demo ${unique}`,
          descripcion: 'Validacion automatica del bloque 16',
          fechaInicio: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          fechaFin: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          ubicacion: 'Entorno automatizado',
          aforo: 25,
          estado: 'borrador',
        }),
      },
      authHeaders,
    );

    assert(payload.id, 'actividad sin id');
    created.activityId = payload.id;
    return payload;
  });

  const createdAttendee = await runStep('Registrar asistente en actividad', async () => {
    const unique = Date.now();
    const payload = await request(
      `/activities/${createdActivity.id}/attendees`,
      {
        method: 'POST',
        body: JSON.stringify({
          dniNie: `${String(unique).slice(-8)}Z`,
          nombre: 'Validacion',
          apellidos: `Automatica ${String(unique).slice(-4)}`,
          telefono: '600123999',
          email: `demo-${unique}@example.com`,
          estado: 'confirmado',
          observaciones: 'Alta automatica demo',
        }),
      },
      authHeaders,
    );

    assert(payload.attendeeId, 'asistente sin attendeeId');
    created.attendeeId = payload.attendeeId;
    return payload;
  });

  await runStep('Subir fotografia a MinIO', async () => {
    const form = new FormData();
    form.append(
      'file',
      new Blob([tinyPngBytes], { type: 'image/png' }),
      'demo-photo.png',
    );

    const payload = await request(
      `/attendees/${createdAttendee.attendeeId}/photo`,
      {
        method: 'POST',
        body: form,
      },
      authHeaders,
      false,
    );

    assert(payload.photoUrl, 'foto sin url de retorno');
  });

  const qrSession = await runStep('Generar QR temporal', async () => {
    const payload = await request(
      '/qr-sessions',
      {
        method: 'POST',
        body: JSON.stringify({
          attendeeId: createdAttendee.attendeeId,
          activityId: createdActivity.id,
          ttlSeconds: 120,
        }),
      },
      authHeaders,
    );

    assert(payload.token, 'QR sin token');
    created.qrToken = payload.token;
    return payload;
  });

  await runStep('Resolver QR temporal', async () => {
    const payload = await request(
      '/qr-sessions/resolve',
      {
        method: 'POST',
        body: JSON.stringify({ token: qrSession.token }),
      },
      authHeaders,
    );

    assert(payload.status === 'ready', 'QR no resolvio en estado ready');
  });

  await runStep('Registrar asistencia con firma', async () => {
    const payload = await request(
      '/attendance/qr',
      {
        method: 'POST',
        body: JSON.stringify({
          token: qrSession.token,
          observaciones: 'Validacion automatica bloque 16',
          validacionVisual: true,
          firma: {
            dataUrl: signatureDataUrl,
            width: 1,
            height: 1,
          },
        }),
      },
      authHeaders,
    );

    assert(payload.estado === 'validado', 'asistencia no quedo validada');
  });

  await runStep('Dashboard summary', async () => {
    const payload = await request('/dashboard/summary', {}, authHeaders);
    assert(Array.isArray(payload.metrics), 'dashboard sin metrics');
  });

  await runStep('Exportacion XLSX', async () => {
    const response = await rawRequest('/dashboard/export/excel', { method: 'GET' }, authHeaders);
    assert(response.ok, 'export excel fallo');
    assert(
      response.headers.get('content-type')?.includes(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
      'export excel sin content-type xlsx',
    );
  });

  await runStep('Exportacion PDF', async () => {
    const response = await rawRequest('/dashboard/export/pdf', { method: 'GET' }, authHeaders);
    assert(response.ok, 'export pdf fallo');
    assert(
      response.headers.get('content-type')?.includes('application/pdf'),
      'export pdf sin content-type pdf',
    );
  });

  if (automationSecret) {
    await runStep('Automatizacion daily-summary', async () => {
      const payload = await request(
        '/automation/daily-summary',
        {},
        {
          'x-automation-secret': automationSecret,
        },
      );
      assert(payload.type === 'daily-summary', 'daily-summary no respondio');
    });

    await runStep('Automatizacion export-bundle', async () => {
      const payload = await request(
        '/automation/export-bundle',
        {},
        {
          'x-automation-secret': automationSecret,
        },
      );
      assert(Array.isArray(payload.files), 'export-bundle sin files');
    });
  } else {
    console.log('! Automatizaciones omitidas: define AUTOMATION_SECRET para validarlas.');
  }

  console.log('\nValidacion final demo completada.');
}

async function runStep(label, action) {
  process.stdout.write(`- ${label}... `);
  try {
    const result = await action();
    console.log('ok');
    return result;
  } catch (error) {
    console.log('error');
    throw error;
  }
}

async function request(path, init = {}, extraHeaders = {}, jsonBody = true) {
  const response = await rawRequest(path, init, extraHeaders, jsonBody);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${path} -> ${response.status} ${text}`);
  }

  return response.json();
}

async function rawRequest(path, init = {}, extraHeaders = {}, jsonBody = true) {
  const headers = new Headers(init.headers ?? {});

  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }

  if (jsonBody && init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(`\nValidacion demo fallida: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
