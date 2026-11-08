export type ApiMeta = {
  fetchedAt: string;
  source: string;
  ok: boolean;
  status?: number;
  error?: string;
  cached?: boolean;
};

export function jsonWithMeta<T extends object>(data: T, meta: Partial<ApiMeta>, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');
  return Response.json(
    {
      ...data,
      _meta: {
        fetchedAt: new Date().toISOString(),
        ok: true,
        ...meta,
      } satisfies ApiMeta,
    },
    { ...init, headers }
  );
}

export async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number; next?: any } = {}
): Promise<{ ok: true; status: number; data: any } | { ok: false; status: number; error: string }> {
  const { timeoutMs = 10000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    const status = res.status;
    if (!res.ok) {
      return { ok: false, status, error: `Upstream HTTP ${status}` };
    }
    const data = await res.json();
    return { ok: true, status, data };
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : (e?.message || 'Fetch failed');
    return { ok: false, status: 0, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export function errorPayload<T extends object>(fallback: T, source: string, error: string) {
  return {
    ...fallback,
    _meta: {
      fetchedAt: new Date().toISOString(),
      source,
      ok: false,
      error,
    } satisfies ApiMeta,
  };
}
