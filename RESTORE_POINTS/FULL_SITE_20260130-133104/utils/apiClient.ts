// Unified API fetch wrapper with 401 retry logic
// Usage: apiFetch('/api/endpoint', { method: 'GET' })
// Returns parsed JSON or throws ApiError

export interface ApiError extends Error {
  status: number;
  payload?: any;
}

export interface ApiFetchOptions extends RequestInit {
  retry401?: boolean; // default true
  parseJson?: boolean; // default true
}

// Consumer will inject refreshSession via setApiClientConfig (lazy to avoid circular imports with context)
let refreshSessionFn: (() => Promise<void>) | null = null;
export function setApiClientConfig(opts: { refreshSession?: () => Promise<void> }) {
  refreshSessionFn = opts.refreshSession || null;
}

// CSRF helpers
export const CSRF_COOKIE = 'csrf';
export const CSRF_HEADER = 'x-csrf-token';
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
export function getCsrfToken(): string | null {
  return getCookie(CSRF_COOKIE);
}

export async function apiFetch<T = any>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { retry401 = true, parseJson = true, headers, ...rest } = options;
  // If method has body but body is object, stringify
  let body = (rest as any).body;
  const isFormData = body instanceof FormData;
  if (body && typeof body === 'object' && !isFormData) {
    body = JSON.stringify(body);
  }
  // Build headers, avoid forcing content-type when sending FormData
  const mergedHeaders: Record<string, string> = {
    ...(isFormData ? {} : { 'content-type': 'application/json' }),
    ...(headers as any || {})
  };
  // Attach CSRF token for mutating requests
  const method = ((rest.method || 'GET') as string).toUpperCase();
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const csrf = needsCsrf ? getCsrfToken() : null;
  if (needsCsrf && csrf) {
    (mergedHeaders as any)[CSRF_HEADER] = csrf;
  }
  const res = await fetch(url, { credentials: 'include', ...rest, headers: mergedHeaders, body });
  if (res.status === 401 && retry401 && refreshSessionFn) {
    try { await refreshSessionFn(); } catch {}
    const retryRes = await fetch(url, { credentials: 'include', ...rest, headers: mergedHeaders, body });
    return handleResponse<T>(retryRes, parseJson);
  }
  return handleResponse<T>(res, parseJson);
}

async function handleResponse<T>(res: Response, parseJson: boolean): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  let payload: any = null;
  if (parseJson && contentType.includes('application/json')) {
    try { payload = await res.json(); } catch { payload = null; }
  } else if (parseJson) {
    try { payload = await res.text(); } catch { payload = null; }
  }
  if (!res.ok) {
    const err: ApiError = Object.assign(new Error(payload?.error || `HTTP ${res.status}`), { status: res.status, payload });
    throw err;
  }
  return payload as T;
}
