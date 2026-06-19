import { NextRequest } from "next/server";

const backendBaseUrl =
  process.env.API_INTERNAL_URL ?? "http://asistencia-api:4000/api/v1";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const url = new URL(`${backendBaseUrl}/${path.join("/")}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : new Uint8Array(await request.arrayBuffer());

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(url, {
      method: request.method,
      headers: buildHeaders(request),
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store"
    });
  } catch {
    return Response.json(
      {
        message:
          "El servicio interno no responde. Revisa API_INTERNAL_URL o la conectividad con la API."
      },
      { status: 503 }
    );
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: filterHeaders(upstreamResponse.headers)
  });
}

function buildHeaders(request: NextRequest) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  const accept = request.headers.get("accept");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (authorization) {
    headers.set("authorization", authorization);
  }

  if (accept) {
    headers.set("accept", accept);
  }

  return headers;
}

function filterHeaders(headers: Headers) {
  const nextHeaders = new Headers();
  const contentType = headers.get("content-type");
  const contentDisposition = headers.get("content-disposition");

  if (contentType) {
    nextHeaders.set("content-type", contentType);
  }

  if (contentDisposition) {
    nextHeaders.set("content-disposition", contentDisposition);
  }

  return nextHeaders;
}
