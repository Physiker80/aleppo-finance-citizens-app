/*
  Citizen uploads/downloads utility (client-side)
  - uploadFile: POSTs to /api/citizen/uploads with multipart/form-data
  - getPresignedUrl: GETs presigned download URL (or proxy stream if proxy=1)
  - downloadFile: Convenience to trigger browser download via presigned URL
*/

export type UploadResult = {
  ok: true;
  objectKey: string;
  contentType?: string;
  size?: number;
} | { ok: false; error: string };

export async function uploadFile(file: File, endpoint = '/api/citizen/uploads'): Promise<UploadResult> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(endpoint, { method: 'POST', body: fd });
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok || !data?.ok) {
    return { ok: false, error: (data && data.error) || `http-${res.status}` } as const;
  }
  return { ok: true, objectKey: data.objectKey, contentType: data.contentType, size: data.size } as const;
}

export type PresignResult = {
  ok: true;
  url: string;
  expiresIn: number;
  contentType?: string | null;
  contentLength?: number;
} | { ok: false; error: string };

export async function getPresignedUrl(objectKey: string, options?: { proxy?: boolean; endpoint?: string }): Promise<PresignResult> {
  const { proxy = false, endpoint = '/api/citizen/uploads' } = options || {};
  if (!objectKey) return { ok: false, error: 'objectKey-required' } as const;
  const url = `${endpoint}/${encodeURI(objectKey)}` + (proxy ? '?proxy=1' : '');
  const res = await fetch(url);
  if (proxy) {
    // In proxy mode, a non-JSON successful response indicates streaming content
    const ct = res.headers.get('content-type') || '';
    if (res.ok && (!ct.includes('application/json') || ct.startsWith('application/octet-stream'))) {
      return { ok: true, url, expiresIn: 0 } as const;
    }
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok || !data?.ok) {
    return { ok: false, error: (data && data.error) || `http-${res.status}` } as const;
  }
  return { ok: true, url: data.url, expiresIn: data.expiresIn, contentType: data.contentType ?? null, contentLength: data.contentLength } as const;
}

// Trigger a browser download; prefers presigned URL path.
export async function downloadFile(objectKey: string, filename?: string, options?: { endpoint?: string }): Promise<{ ok: boolean; error?: string }>{
  const presign = await getPresignedUrl(objectKey, { proxy: false, endpoint: options?.endpoint });
  if (!presign.ok) return { ok: false, error: ('error' in presign ? presign.error : 'unknown-error') };
  const a = document.createElement('a');
  a.href = presign.url;
  a.download = filename || objectKey.split('/').pop() || 'download';
  a.rel = 'noopener';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  requestAnimationFrame(() => {
    try { document.body.removeChild(a); } catch {}
  });
  return { ok: true };
}

// Delete an uploaded object by key (admin session or API key required)
export async function deleteUploaded(
  objectKey: string,
  options?: { endpoint?: string; apiKey?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const endpoint = options?.endpoint || '/api/citizen/uploads';
  if (!objectKey) return { ok: false, error: 'objectKey-required' } as const;
  const url = `${endpoint}/${encodeURI(objectKey)}`;
  const headers: Record<string, string> = {};
  if (options?.apiKey) headers['x-api-key'] = options.apiKey;
  // Try to send CSRF token when present (session-based admin)
  try {
    const m = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
    if (m && m[1]) headers['x-csrf-token'] = decodeURIComponent(m[1]);
  } catch {}
  const res = await fetch(url, { method: 'DELETE', headers, credentials: 'include' });
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok || !data?.ok) return { ok: false, error: (data && data.error) || `http-${res.status}` } as const;
  return { ok: true } as const;
}
