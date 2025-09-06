import { useEffect, useMemo, useRef, useState } from 'react';

export type PreviewKind = 'image' | 'pdf' | 'docx' | 'unsupported' | 'none';

export interface PreviewResult {
  file: File;
  kind: PreviewKind;
  url?: string; // object URL for image/pdf (and for download)
  html?: string; // for docx rendered HTML
  error?: string;
  loading: boolean;
}

const isDocx = (file: File | null | undefined): boolean => {
  if (!file) return false;
  const type = file.type || '';
  const name = file.name?.toLowerCase() || '';
  return (
    type.includes('wordprocessingml.document') ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  );
};

const detectKind = (file: File | null): PreviewKind => {
  if (!file) return 'none';
  if (file.type?.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  if (isDocx(file)) return 'docx';
  return 'unsupported';
};

export function useFilePreview(file: File | null): PreviewResult | null {
  const [state, setState] = useState<PreviewResult | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // cleanup any previous URL
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }

    if (!file) {
      setState(null);
      return;
    }

    const kind = detectKind(file);
    const base: PreviewResult = { file, kind, loading: true };

    if (kind === 'image' || kind === 'pdf' || kind === 'unsupported') {
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      setState({ ...base, url, loading: false });
      return () => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      };
    }

    if (kind === 'docx') {
      setState({ ...base, loading: true });
      (async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          // @ts-ignore dynamic import browser build
          const mammothMod = await import('mammoth/mammoth.browser');
          const mammothLib: any = mammothMod.default || mammothMod;
          const { value: html } = await mammothLib.convertToHtml({ arrayBuffer });
          if (cancelled) return;
          const url = URL.createObjectURL(file);
          urlRef.current = url;
          setState({ file, kind, html, url, loading: false });
        } catch (err) {
          if (cancelled) return;
          const url = URL.createObjectURL(file);
          urlRef.current = url;
          setState({ file, kind, url, loading: false, error: 'تعذر معاينة ملف الوورد.' });
        }
      })();
      return () => {
        cancelled = true;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      };
    }

    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, [file]);

  return state;
}

export function useFilePreviews(files: File[]): PreviewResult[] {
  // memoize identity array for stable mapping
  const inputs = useMemo(() => files.map((f) => f), [files]);
  const [results, setResults] = useState<PreviewResult[]>([]);
  const urlMapRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    // cleanup any previous URLs
    for (const url of urlMapRef.current.values()) {
      URL.revokeObjectURL(url);
    }
    urlMapRef.current.clear();
    setResults([]);

    if (!inputs || inputs.length === 0) return;

    // initialize with loading states
    const initial: PreviewResult[] = inputs.map((file) => ({ file, kind: detectKind(file), loading: true }));
    setResults(initial);

    // process all files
    (async () => {
      const out: PreviewResult[] = await Promise.all(
        inputs.map(async (file, index) => {
          const kind = detectKind(file);
          if (kind === 'image' || kind === 'pdf' || kind === 'unsupported') {
            const url = URL.createObjectURL(file);
            urlMapRef.current.set(index, url);
            return { file, kind, url, loading: false } as PreviewResult;
          }
          if (kind === 'docx') {
            try {
              const arrayBuffer = await file.arrayBuffer();
              // @ts-ignore dynamic import browser build
              const mammothMod = await import('mammoth/mammoth.browser');
              const mammothLib: any = mammothMod.default || mammothMod;
              const { value: html } = await mammothLib.convertToHtml({ arrayBuffer });
              const url = URL.createObjectURL(file);
              urlMapRef.current.set(index, url);
              return { file, kind, html, url, loading: false } as PreviewResult;
            } catch (err) {
              const url = URL.createObjectURL(file);
              urlMapRef.current.set(index, url);
              return { file, kind, url, loading: false, error: 'تعذر معاينة ملف الوورد.' } as PreviewResult;
            }
          }
          // fallback
          const url = URL.createObjectURL(file);
          urlMapRef.current.set(index, url);
          return { file, kind: 'unsupported', url, loading: false } as PreviewResult;
        })
      );
      if (!cancelled) {
        setResults(out);
      } else {
        // if cancelled, cleanup created URLs
        for (const url of urlMapRef.current.values()) URL.revokeObjectURL(url);
        urlMapRef.current.clear();
      }
    })();

    return () => {
      cancelled = true;
      for (const url of urlMapRef.current.values()) URL.revokeObjectURL(url);
      urlMapRef.current.clear();
    };
  }, [inputs]);

  return results;
}
