import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const apiTarget =
  process.env.API_SERVER_URL ||
  (process.env.API_INTERNAL_HOSTPORT
    ? `http://${process.env.API_INTERNAL_HOSTPORT}`
    : "http://127.0.0.1:8000");

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const route = path.map(encodeURIComponent).join("/");
  const target = new URL(`/api/${route}${request.nextUrl.search}`, apiTarget);
  const headers = new Headers();
  const proxyRequestId = crypto.randomUUID();
  const contentType = request.headers.get("content-type");
  const idempotencyKey = request.headers.get("idempotency-key");

  if (contentType) headers.set("content-type", contentType);
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
  if (process.env.OPERATOR_API_TOKEN) {
    headers.set("authorization", `Bearer ${process.env.OPERATOR_API_TOKEN}`);
  }
  headers.set("x-request-id", proxyRequestId);

  try {
    const hasBody = !["GET", "HEAD"].includes(request.method);
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(195_000)
    });
    const responseHeaders = new Headers({
      "content-type": response.headers.get("content-type") || "application/json"
    });
    const requestId = response.headers.get("x-request-id");
    const retryAfter = response.headers.get("retry-after");
    if (requestId) responseHeaders.set("x-request-id", requestId);
    if (retryAfter) responseHeaders.set("retry-after", retryAfter);

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "control_plane_unavailable",
          message: "ScrapeSentry could not reach the control plane."
        },
        request_id: proxyRequestId
      },
      { status: 502, headers: { "X-Request-ID": proxyRequestId } }
    );
  }
}

export { proxy as DELETE, proxy as GET, proxy as PATCH, proxy as POST, proxy as PUT };
