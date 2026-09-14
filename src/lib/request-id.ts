const REQUEST_ID_HEADER = "x-request-id";

export function createRequestId(): string {
  return crypto.randomUUID();
}

/** Read an incoming request ID or mint one for this request. */
export function getRequestId(req: Request): string {
  const existing = req.headers.get(REQUEST_ID_HEADER)?.trim();
  if (existing && existing.length <= 64) return existing;
  return createRequestId();
}

export function attachRequestId(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { REQUEST_ID_HEADER };
