/*
  Citizen uploads/downloads utility
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
  const data = await res.json().catch(() => ({ ok: false, error: 'bad-json' }));
  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error || `http-${res.status}` } as const;
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
    // When proxying, the response is the file stream; just return ok if successful
    if (res.ok && !res.headers.get('content-type')?.includes('application/json')) {
      // Not returning stream here; see downloadFile for actual usage.
      return { ok: true, url, expiresIn: 0 } as const;
    }
  }
  const data = await res.json().catch(() => ({ ok: false, error: 'bad-json' }));
  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error || `http-${res.status}` } as const;
  }
  return { ok: true, url: data.url, expiresIn: data.expiresIn, contentType: data.contentType ?? null, contentLength: data.contentLength } as const;
}

// Trigger a browser download; prefers presigned URL path.
export async function downloadFile(objectKey: string, filename?: string, options?: { endpoint?: string }): Promise<{ ok: boolean; error?: string }>{
  const presign = await getPresignedUrl(objectKey, { proxy: false, endpoint: options?.endpoint });
  if (!presign.ok) return { ok: false, error: presign.error };
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
