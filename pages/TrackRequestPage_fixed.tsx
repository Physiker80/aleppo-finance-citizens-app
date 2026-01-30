import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import TextArea from '../components/ui/TextArea';
import { Ticket, RequestStatus } from '../types';
import { formatArabicNumber, formatArabicDate } from '../constants';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import jsQR from 'jsqr';
import Tesseract from 'tesseract.js';
// Use a real module worker so pdf.js doesn't fall back to a fake worker
// @ts-ignore Vite returns a Worker constructor for ?worker imports
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
// Prefer workerPort when available to avoid cross-origin/fetch issues
// @ts-ignore pdfjs types don't include workerPort in older d.ts
GlobalWorkerOptions.workerPort = new PdfJsWorker();

// Ministry identity logo for header branding
const ministryLogo = 'https://syrian.zone/syid/materials/logo.ai.svg';

const StatusStep: React.FC<{
  status: RequestStatus;
  isActive: boolean;
  isCompleted: boolean;
}> = ({ status, isActive, isCompleted }) => {
  const activeCircleClasses = 'bg-blue-600 text-white';
  const completedCircleClasses = 'bg-green-500 text-white';
  const inactiveCircleClasses = 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400';

  let circleClass = inactiveCircleClasses;
  if (isActive) circleClass = activeCircleClasses;
  if (isCompleted) circleClass = completedCircleClasses;

  return (
    <div className="flex flex-col items-center">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${circleClass}`}>
        {isCompleted ? '✓' : '•'}
      </div>
      <p className={`mt-2 text-sm text-center ${isActive || isCompleted ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{status}</p>
    </div>
  );
};

const TrackRequestPage: React.FC = () => {
  const appContext = useContext(AppContext);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [decodeMsg, setDecodeMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const trackingInputRef = useRef<HTMLInputElement | null>(null);
  const trackingTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const multiLabelRef = useRef<HTMLLabelElement | null>(null);
  const singleLabelRef = useRef<HTMLLabelElement | null>(null);
  const [controlHeight, setControlHeight] = useState<number | null>(null);
  const [labelOffset, setLabelOffset] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [multiMode, setMultiMode] = useState(true);

  const [trackingId, setTrackingId] = useState('');
  const [trackedIds, setTrackedIds] = useState<string[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const toggleReply = (id: string) => setOpenReplies(prev => ({ ...prev, [id]: !prev[id] }));

  // Manual crop fallback state
  const [cropMode, setCropMode] = useState(false);
  const [cropImgUrl, setCropImgUrl] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const cropViewRef = useRef<HTMLDivElement | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Helpers for multi-IDs
  const normalizeId = (id: string) => id.trim();
  const splitIds = (input: string) => input.split(/[\s,،;\n\r\t]+/).map(normalizeId).filter(Boolean);
  const persistIds = (ids: string[]) => {
    try { localStorage.setItem('tracked_ids', JSON.stringify(ids)); } catch {}
  };
  const loadPersistedIds = (): string[] => {
    try {
      const raw = localStorage.getItem('tracked_ids');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
    } catch { return []; }
  };

  // Load persisted IDs and QR param on mount
  React.useEffect(() => {
    const initialIds = loadPersistedIds();
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const idFromQR = urlParams.get('id');
    const merged = Array.from(new Set([...(initialIds || []), ...(idFromQR ? [idFromQR] : [])]));
    if (merged.length) {
      setTrackedIds(merged);
      // resolve tickets
      const found: Ticket[] = [];
      const missing: string[] = [];
      merged.forEach((id) => {
        const t = appContext?.findTicket(id);
        if (t) found.push(t); else missing.push(id);
      });
      setTickets(found);
      setNotFound(missing);
    }
    if (idFromQR) setTrackingId(idFromQR);
  }, [appContext]);

  // Sync upload button height with active control height
  React.useEffect(() => {
    const target = multiMode ? trackingTextAreaRef.current : trackingInputRef.current;
    if (!target) return;
    const sync = () => setControlHeight(target.clientHeight);
    sync();
    window.addEventListener('resize', sync);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => sync());
      ro.observe(target);
    }
    return () => {
      window.removeEventListener('resize', sync);
      if (ro) ro.disconnect();
    };
  }, [multiMode, trackingId]);

  // In multi mode, align the upload button top with the textarea top by offsetting the label height
  React.useEffect(() => {
    const compute = () => {
      const el = multiMode ? multiLabelRef.current : singleLabelRef.current;
      if (!el) { setLabelOffset(0); return; }
      const mb = parseFloat(getComputedStyle(el).marginBottom || '0') || 0;
      setLabelOffset(el.clientHeight + mb);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [multiMode]);

  const addIdsToTracked = (ids: string[]) => {
    if (!ids.length) return;
    setIsLoading(true);
    setError(null);
    const existing = new Set(trackedIds.map((s) => s.toUpperCase()));
    const newUnique = ids.map((s) => s.trim()).filter(Boolean).filter((s) => !existing.has(s.toUpperCase()));
    const nextIds = [...trackedIds, ...newUnique];
    const justFound: Ticket[] = [];
    const justMissing: string[] = [];
    newUnique.forEach((id) => {
      const t = appContext?.findTicket(id);
      if (t) justFound.push(t); else justMissing.push(id);
    });
    const ticketIdSet = new Set(tickets.map((t) => t.id));
    const mergedTickets = [...tickets, ...justFound.filter((t) => !ticketIdSet.has(t.id))];
    const mergedMissing = Array.from(new Set([...notFound, ...justMissing]));
    setTrackedIds(nextIds);
    setTickets(mergedTickets);
    setNotFound(mergedMissing);
    persistIds(nextIds);
    setTimeout(() => setIsLoading(false), 300);
  };

  // After decoding an ID from an uploaded PDF/image, navigate and focus it
  const focusDecodedId = (id: string) => {
    try {
      const targetHash = `#/track?id=${encodeURIComponent(id)}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    } catch {}
    setTimeout(() => {
      const el = document.getElementById(`ticket-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-emerald-500', 'animate-pulse');
        setTimeout(() => el.classList.remove('animate-pulse', 'ring-2', 'ring-emerald-500'), 1600);
      }
    }, 400);
  };

  const handleSearch = (explicitId?: string) => {
    const raw = explicitId ?? trackingId;
    const ids = splitIds(raw);
    if (!ids.length) {
      setError('يرجى إدخال رقم/أرقام التتبع.');
      return;
    }
    addIdsToTracked(ids);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (!multiMode && e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
    if (multiMode && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSearch();
    }
  };

  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // Build QR as data URL (lightweight: returns external URL suitable for <img src>)
  const buildQRDataUrl = async (text: string, size = 160): Promise<string | null> => {
    try {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
      return url;
    } catch {
      return null;
    }
  };

  // Build CODE128 barcode as PNG data URL via JsBarcode
  const buildBarcodeDataUrl = async (
    text: string,
    opts?: { width?: number; height?: number; displayValue?: boolean; fontSize?: number }
  ): Promise<string | null> => {
    try {
      const JsBarcodeAny = (window as any).JsBarcode;
      if (!JsBarcodeAny) return null;
      const canvas = document.createElement('canvas');
      JsBarcodeAny(canvas, text, {
        format: 'CODE128',
        lineColor: '#000000',
        width: opts?.width ?? 2.5,
        height: opts?.height ?? 80,
        displayValue: opts?.displayValue ?? true,
        fontSize: opts?.fontSize ?? 14,
        margin: 10,
        background: '#ffffff',
      });
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  const handleDownloadPdf = async (ticket: Ticket) => {
    const trackingUrl = `${window.location.origin}/#/track?id=${ticket.id}`;
    const [qrUrl, barcodeUrl] = await Promise.all([
      buildQRDataUrl(trackingUrl, 160),
      buildBarcodeDataUrl(ticket.id, { height: 80, width: 2.5, displayValue: true, fontSize: 14 })
    ]);
    const dt = new Intl.DateTimeFormat('ar-SY-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
    const submittedAtStr = dt.format(ticket.submissionDate);
    const answeredAtStr = ticket.answeredAt ? dt.format(ticket.answeredAt) : 'لم يتم الرد بعد';
    const closedAtStr = ticket.closedAt ? dt.format(ticket.closedAt) : (ticket.status === RequestStatus.Closed ? '—' : 'غير مغلق');
    const replyDurationStr = ticket.answeredAt ? formatDuration(ticket.answeredAt.getTime() - ticket.submissionDate.getTime()) : '—';
    const closeDurationStr = ticket.closedAt ? formatDuration(ticket.closedAt.getTime() - ticket.submissionDate.getTime()) : (ticket.startedAt ? formatDuration((ticket.closedAt ?? new Date()).getTime() - ticket.submissionDate.getTime()) : '—');
    const pdfContent = `
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>تفاصيل الطلب: ${ticket.id}</title>
          <style>
            body { font-family: 'Cairo', 'Amiri', 'Noto Kufi Arabic', system-ui, Arial, sans-serif; margin: 24px; color: #111827; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0f3c35; padding-bottom: 16px; margin-bottom: 16px; }
            .title { font-size: 22px; font-weight: 800; color: #0f3c35; }
            .subtitle { font-size: 14px; color: #374151; margin-top: 4px; }
            .logo { width: 64px; height: 64px; object-fit: contain; }
            .section-title { font-size: 18px; color: #0f3c35; border-right: 4px solid #0f3c35; padding-right: 10px; margin: 24px 0 12px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 10px; vertical-align: top; border-bottom: 1px dashed #94a3b8; }
            td.label { color: #0f3c35; font-weight: 700; width: 180px; }
            .qr-barcode { display: flex; justify-content: center; align-items: flex-start; gap: 24px; }
            .box { background: #fff; border: 2px dashed #0f3c35; border-radius: 10px; padding: 12px; }
            .barcode-box { border-style: solid; }
            .tracking { text-align: center; font-weight: bold; color: #d63384; font-family: monospace; font-size: 22px; letter-spacing: 2px; }
            .subheader { display:flex; align-items:center; justify-content: space-between; margin-top: 4px; margin-bottom: 12px; }
            .subheader-text h2 { margin: 0; font-size: 18px; color: #0f3c35; }
            .logo-sm { width: 48px; height: 48px; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">وزارة المالية - الجمهورية العربية السورية</div>
              <div class="subtitle">وحدة الاستعلامات والشكاوى</div>
            </div>
            <img src="${ministryLogo}" alt="شعار الوزارة" class="logo" />
          </div>

          <div>
            <h3 class="section-title">بيانات الطلب</h3>
            <table>
              <tbody>
                <tr>
                  <td class="label">رقم التتبع</td>
                  <td><span style="font-family: monospace; color:#0f3c35; font-weight: 700;">${ticket.id}</span></td>
                </tr>
                <tr>
                  <td class="label">الاسم</td>
                  <td>${ticket.fullName}</td>
                </tr>
                ${ticket.email ? `<tr><td class="label">البريد الإلكتروني</td><td>${ticket.email}</td></tr>` : ''}
                <tr>
                  <td class="label" style="vertical-align: top;">تفاصيل الطلب</td>
                  <td class="details">${ticket.details}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="page-break" style="margin-top: 0;">
            <div class="subheader">
              <div class="subheader-text" style="text-align: right;">
                <h2>معلومات متابعة الطلب</h2>
                <p>وزارة المالية - الجمهورية العربية السورية</p>
              </div>
              <img class="logo-sm" src="${ministryLogo}" alt="شعار الوزارة" />
            </div>
            <div style="text-align: center; background-color: #f8f9fa; padding: 24px; border-radius: 12px; border: 2px solid #0f3c35">
              <h3 style="font-size: 20px; font-weight: bold; color: #0f3c35; margin-bottom: 16px">معلومات متابعة الطلب</h3>
              <div style="display:flex;justify-content:center;align-items:flex-start;gap:24px;flex-wrap:wrap">
                <div>
                  <div style="background:#ffffff;border:2px solid #0f3c35;border-radius:8px;padding:12px;min-width:300px;min-height:120px;display:flex;align-items:center;justify-content:center">
                    ${barcodeUrl ? `<img id="barcodeImg" src="${barcodeUrl}" style="max-width:300px;max-height:120px;display:block"/>` : `<div style='font-size:12px;color:#666'>تعذر توليد الباركود</div>`}
                  </div>
                  <p style="font-size:12px;color:#0f3c35;margin:8px 0 0 0;font-weight:bold">باركود قابل للمسح والتتبع</p>
                </div>
                <div>
                  <div style="background:#ffffff;border:2px dashed #0f3c35;border-radius:8px;padding:10px;display:inline-block">
                    ${qrUrl ? `<img id="qrImg" src="${qrUrl}" width="160" height="160" style="display:block"/>` : `<div style='font-size:12px;color:#666'>تعذر توليد رمز QR</div>`}
                  </div>
                  <p style="font-size:12px;color:#0f3c35;margin:8px 0 0 0;font-weight:bold">رمز QR لفتح صفحة المتابعة</p>
                </div>
              </div>
              <div style="background:#ffffff;padding:16px;border-radius:8px;border:2px dashed #0f3c35;min-width:300px;margin-top:16px;display:inline-block">
                <p style="font-size:14px;color:#0f3c35;margin:0 0 8px 0;font-weight:bold">رقم التتبع الخاص بك:</p>
                <p style="font-size:24px;font-family:monospace;color:#d63384;font-weight:bold;letter-spacing:2px;margin:6px 0;text-align:center">${ticket.id}</p>
              </div>
            </div>
            <div style="margin-top:20px">
              <h3 class="section-title">ملخص الزمن</h3>
              <table>
                <tbody>
                  <tr>
                    <td class="label">التقديم</td>
                    <td>${submittedAtStr}</td>
                  </tr>
                  <tr>
                    <td class="label">الرد</td>
                    <td>${answeredAtStr}${ticket.answeredAt ? ` • ${replyDurationStr}` : ''}</td>
                  </tr>
                  <tr>
                    <td class="label">الإغلاق</td>
                    <td>${closedAtStr}${ticket.closedAt ? ` • ${closeDurationStr}` : ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <script>
            (function(){
              function ready(){
                var bi = document.getElementById('barcodeImg');
                var qi = document.getElementById('qrImg');
                var need = []; if(bi) need.push(bi); if(qi) need.push(qi);
                if(need.length === 0){ setTimeout(function(){ window.print(); window.close(); }, 200); return; }
                var left = need.length, done=false;
                function check(){ if(done) return; if(--left <= 0){ done=true; setTimeout(function(){ window.print(); window.close(); }, 200); } }
                need.forEach(function(img){ if(img.complete) { check(); } else { img.onload = check; img.onerror = check; } });
              }
              if(document.readyState === 'complete') ready(); else window.addEventListener('load', ready);
            })();
          </script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(pdfContent);
      printWindow.document.close();
    }
  };

  const extractTrackingId = (text: string): string | null => {
    const raw = (text || '').trim();
    if (!raw) return null;

    // Normalize whitespace
    const s = raw.replace(/\s+/g, ' ');

    // 1) Try URL param id= (supports ?, #, &)
    const urlIdMatch = s.match(/[?&#]id=([A-Za-z0-9_-]+)/i);
    if (urlIdMatch && urlIdMatch[1]) return urlIdMatch[1].toUpperCase();

    // Load ID config (prefix and date length) from localStorage when available
    const getIdCfg = () => {
      try {
        const rawCfg = localStorage.getItem('ticketIdConfig');
        if (!rawCfg) return { prefix: 'ALF', dateDigits: 8 } as const;
        const cfg = JSON.parse(rawCfg);
        const prefix = String(cfg?.prefix || 'ALF').toUpperCase();
        const dateDigits = cfg?.dateFormat === 'YYMMDD' ? 6 : 8;
        return { prefix, dateDigits } as const;
      } catch { return { prefix: 'ALF', dateDigits: 8 } as const; }
    };
    const { prefix, dateDigits } = getIdCfg();

    // 2) Prefix-aware strict pattern: PREFIX-YYYYMMDD/RRMMDD-ALNUM
    const strictRe = new RegExp(`${prefix}-\\d{${dateDigits}}-[A-Za-z0-9]{3,}`, 'i');
    const strictMatch = s.match(strictRe);
    if (strictMatch) return strictMatch[0].toUpperCase();

    // 3) Generic pattern: ABC-YYYYMMDD-XXXX
    const genericMatch = s.match(/[A-Z]{2,5}-\d{6,8}-[A-Z0-9]{3,}/i);
    if (genericMatch) return genericMatch[0].toUpperCase();

    // 4) Token-based fallback: choose best plausible token (avoid capturing full titles)
    const tokens = s.split(/[^A-Za-z0-9_-]+/).filter(Boolean);
    const candidates = tokens.filter(t => {
      if (t.length < 6 || t.length > 32) return false;
      if (!/^[A-Za-z0-9_-]+$/.test(t)) return false;
      if (!/[A-Za-z]/.test(t)) return false; // must have a letter
      if (!/\d/.test(t)) return false;      // and a digit
      return true;
    });
    if (candidates.length) {
      // Prefer ones starting with prefix; else the first plausible
      const byPrefix = candidates.find(c => c.toUpperCase().startsWith(prefix + '-'));
      return (byPrefix || candidates[0]).toUpperCase();
    }
    return null;
  };

  const newReader = () => {
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.ITF,
      BarcodeFormat.PDF_417,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.AZTEC,
    ]);
    return new BrowserMultiFormatReader(hints as any);
  };

  // Image helpers
  const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const scaleImageEl = async (img: HTMLImageElement, scale: number): Promise<HTMLImageElement> => {
    if (scale === 1) return img;
    const w = Math.max(1, Math.floor(img.width * scale));
    const h = Math.max(1, Math.floor(img.height * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return img;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w, h);
    return await loadImage(c.toDataURL('image/png'));
  };

  const rotateImageEl = async (img: HTMLImageElement, angleDeg: number): Promise<HTMLImageElement> => {
    const angle = ((angleDeg % 360) + 360) % 360;
    if (angle === 0) return img;
    const rad = angle * Math.PI / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const w = img.width;
    const h = img.height;
    const rw = Math.floor(w * cos + h * sin);
    const rh = Math.floor(w * sin + h * cos);
    const c = document.createElement('canvas');
    c.width = rw; c.height = rh;
    const ctx = c.getContext('2d');
    if (!ctx) return img;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(rw / 2, rh / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -w / 2, -h / 2);
    return await loadImage(c.toDataURL('image/png'));
  };

  const cropTileEl = async (img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number): Promise<HTMLImageElement> => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.floor(sw));
    c.height = Math.max(1, Math.floor(sh));
    const ctx = c.getContext('2d');
    if (!ctx) return img;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return await loadImage(c.toDataURL('image/png'));
  };

  const tryJsQr = async (img: HTMLImageElement): Promise<string | null> => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const res = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    return res?.data ?? null;
  };

  // OCR helpers
  const ocrExtractTrackingIdFromImageEl = async (img: HTMLImageElement): Promise<string | null> => {
    try {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d'); if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const result: any = await (Tesseract as any).recognize(c, 'ara+eng', {
        // @ts-ignore
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_#=?&',
        // @ts-ignore
        preserve_interword_spaces: '1',
      });
      const text: string = result?.data?.text ?? '';
      return extractTrackingId(text);
    } catch {
      return null;
    }
  };

  const ocrExtractTrackingIdFromImageElRedMask = async (img: HTMLImageElement): Promise<string | null> => {
    try {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d'); if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const isMagenta = (r > 150) && (b > 70) && (g < 140) && (r - g > 40) && (b - g > 10) && (r >= b);
        if (isMagenta) {
          data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255; // black
        } else {
          data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255; // white
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const result: any = await (Tesseract as any).recognize(c, 'ara+eng', {
        // @ts-ignore
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_#=?&',
        // @ts-ignore
        preserve_interword_spaces: '1',
      });
      const text: string = result?.data?.text ?? '';
      return extractTrackingId(text);
    } catch {
      return null;
    }
  };

  const preprocessVariants = async (img: HTMLImageElement): Promise<HTMLImageElement[]> => {
    const out: HTMLImageElement[] = [];
    const w = img.width, h = img.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); if (!ctx) return out;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    let min = 255, max = 0;
    const gray = new Uint8ClampedArray(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      gray[p] = y;
      if (y < min) min = y; if (y > max) max = y;
    }
    const mkImageFromGray = async (buf: Uint8ClampedArray) => {
      const gCanvas = document.createElement('canvas'); gCanvas.width = w; gCanvas.height = h;
      const gCtx = gCanvas.getContext('2d'); if (!gCtx) return null;
      const outData = gCtx.createImageData(w, h);
      for (let p = 0, j = 0; p < buf.length; p++, j += 4) {
        const v = buf[p];
        outData.data[j] = v; outData.data[j + 1] = v; outData.data[j + 2] = v; outData.data[j + 3] = 255;
      }
      gCtx.putImageData(outData, 0, 0);
      return await loadImage(gCanvas.toDataURL('image/png'));
    };
    const stretched = new Uint8ClampedArray(gray.length);
    const range = Math.max(1, max - min);
    for (let i = 0; i < gray.length; i++) {
      stretched[i] = Math.max(0, Math.min(255, Math.round((gray[i] - min) * 255 / range)));
    }
    const stretchedImg = await mkImageFromGray(stretched); if (stretchedImg) out.push(stretchedImg);
    const thresholds = [180, 160, 140, 120];
    for (const t of thresholds) {
      const thr = new Uint8ClampedArray(gray.length);
      for (let i = 0; i < gray.length; i++) thr[i] = gray[i] > t ? 255 : 0;
      const thrImg = await mkImageFromGray(thr); if (thrImg) out.push(thrImg);
      const inv = new Uint8ClampedArray(gray.length);
      for (let i = 0; i < gray.length; i++) inv[i] = 255 - thr[i];
      const invImg = await mkImageFromGray(inv); if (invImg) out.push(invImg);
    }
    const invGray = new Uint8ClampedArray(gray.length);
    for (let i = 0; i < gray.length; i++) invGray[i] = 255 - gray[i];
    const invGrayImg = await mkImageFromGray(invGray); if (invGrayImg) out.push(invGrayImg);
    return out;
  };

  const decodeFromImageElRobust = async (baseImg: HTMLImageElement): Promise<string | null> => {
    const scales = [1, 1.5, 2, 3, 4];
    const angles = [0, 90, 180, 270];
    const tryDecode = async (el: HTMLImageElement): Promise<string | null> => {
      try {
        const result = await newReader().decodeFromImageElement(el);
        return (result as any).getText?.() ?? null;
      } catch {
        const variants = await preprocessVariants(el);
        for (const v of variants) {
          try {
            const result = await newReader().decodeFromImageElement(v);
            return (result as any).getText?.() ?? null;
          } catch {}
        }
        const qrText = await tryJsQr(el);
        if (qrText) return qrText;
        for (const v of variants) {
          const t = await tryJsQr(v);
          if (t) return t;
        }
        return null;
      }
    };
    for (const s of scales) {
      let img = await scaleImageEl(baseImg, s);
      for (const a of angles) {
        const el = await rotateImageEl(img, a);
        const text = await tryDecode(el);
        if (text) return text;
      }
    }
    const grids = [2, 3];
    for (const g of grids) {
      const overlap = 0.1;
      const tileW = Math.floor(baseImg.width / g);
      const tileH = Math.floor(baseImg.height / g);
      for (let row = 0; row < g; row++) {
        for (let col = 0; col < g; col++) {
          const sx = Math.max(0, Math.floor(col * tileW - tileW * overlap));
          const sy = Math.max(0, Math.floor(row * tileH - tileH * overlap));
          const sw = Math.min(baseImg.width - sx, Math.floor(tileW * (1 + 2 * overlap)));
          const sh = Math.min(baseImg.height - sy, Math.floor(tileH * (1 + 2 * overlap)));
          const tile = await cropTileEl(baseImg, sx, sy, sw, sh);
          for (const s of [1, 1.5, 2, 3]) {
            const scaled = await scaleImageEl(tile, s);
            for (const a of angles) {
              const el = await rotateImageEl(scaled, a);
              const text = await tryDecode(el);
              if (text) return text;
            }
          }
        }
      }
    }
    return null;
  };

  const decodeUploadedFile = async (file: File) => {
    setDecodeMsg('جاري تحليل الملف...');
    try {
      if (file.type === 'application/pdf') {
        const ab = await file.arrayBuffer();
  const pdfDoc = await getDocument({ data: ab }).promise;
        const maxPages = Math.min(5, pdfDoc.numPages || 1);
        const tryPages = Array.from({ length: maxPages }, (_, i) => i + 1);
        const scales = [5, 4, 3, 2];
        for (const p of tryPages) {
          const page = await pdfDoc.getPage(p);
          let ocrTriedThisPage = false;
          for (const scale of scales) {
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;
            canvas.width = viewport.width; canvas.height = viewport.height;
            await page.render({ canvasContext: ctx as any, viewport }).promise;
            const imgUrl = canvas.toDataURL('image/png');
            const img = await loadImage(imgUrl);
            const decodedText = await decodeFromImageElRobust(img);
            if (decodedText) {
              const id = extractTrackingId(decodedText);
              if (id) {
                setTrackingId(id);
                setDecodeMsg('تم التعرف على رقم التتبع، جارٍ فتح التفاصيل...');
                addIdsToTracked([id]);
                focusDecodedId(id);
                return;
              }
            }
            if (!ocrTriedThisPage && scale >= 5) {
              setDecodeMsg('نحاول التعرف على رقم التتبع المكتوب باللون الأحمر...');
              const redId = await ocrExtractTrackingIdFromImageElRedMask(img);
              if (redId) {
                setTrackingId(redId);
                setDecodeMsg('تم التعرف على رقم التتبع، جارٍ فتح التفاصيل...');
                addIdsToTracked([redId]);
                focusDecodedId(redId);
                return;
              }
              setDecodeMsg('نحاول التعرف الضوئي على النص (OCR)...');
              const ocrId = await ocrExtractTrackingIdFromImageEl(img);
              if (ocrId) {
                setTrackingId(ocrId);
                setDecodeMsg('تم التعرف على رقم التتبع، جارٍ فتح التفاصيل...');
                addIdsToTracked([ocrId]);
                focusDecodedId(ocrId);
                return;
              }
              ocrTriedThisPage = true;
            }
          }
        }
        for (const p of tryPages) {
          const page = await pdfDoc.getPage(p);
          const textContent = await page.getTextContent();
          const pageText = (textContent.items as any[]).map((it) => it.str).join(' ');
          const id = extractTrackingId(pageText);
          if (id) {
            setTrackingId(id);
            setDecodeMsg('تم التعرف على رقم التتبع، جارٍ فتح التفاصيل...');
            addIdsToTracked([id]);
            focusDecodedId(id);
            return;
          }
        }
        try {
          const firstPage = await pdfDoc.getPage(1);
          const viewport = firstPage.getViewport({ scale: 4 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = viewport.width; canvas.height = viewport.height;
            await firstPage.render({ canvasContext: ctx as any, viewport }).promise;
            const fallbackUrl = canvas.toDataURL('image/png');
            setCropImgUrl(fallbackUrl);
            setCropMode(true);
            setDecodeMsg('لم نعثر على كود تلقائياً. حدد منطقة الكود وحاول القراءة.');
            return;
          }
        } catch {}
        setDecodeMsg('لم نعثر على كود صالح في صفحات ملف PDF.');
      } else if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const baseImg = await loadImage(url);
        try {
          const decodedText = await decodeFromImageElRobust(baseImg);
          if (decodedText) {
            const id = extractTrackingId(decodedText);
            if (id) {
              setTrackingId(id);
              setDecodeMsg('تم التعرف على رقم التتبع، جارٍ فتح التفاصيل...');
              addIdsToTracked([id]);
              focusDecodedId(id);
              URL.revokeObjectURL(url);
              return;
            }
          }
          setCropImgUrl(url);
          setCropMode(true);
          setDecodeMsg('تعذر القراءة تلقائياً. حدد منطقة الكود وجرب مرة أخرى.');
        } catch (e) {
          setDecodeMsg('تعذر قراءة الكود من الصورة.');
        }
      } else {
        setDecodeMsg('الرجاء رفع صورة أو ملف PDF فقط.');
      }
    } catch (e: any) {
      const msg = (e && (e.message || String(e))) || '';
      setDecodeMsg(`حدث خطأ أثناء تحليل الملف. تأكد من أن الملف يحتوي كود QR أو باركود واضح.${msg ? ' التفاصيل: ' + msg : ''}`);
    }
  };

  // Crop helpers
  const onCropMouseDown = (e: React.MouseEvent) => {
    if (!cropViewRef.current) return;
    const rect = cropViewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragStart({ x, y });
    setCropRect({ x, y, w: 0, h: 0 });
    setIsCropping(true);
  };

  const onCropMouseMove = (e: React.MouseEvent) => {
    if (!isCropping || !dragStart || !cropViewRef.current) return;
    const rect = cropViewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nx = Math.min(x, dragStart.x);
    const ny = Math.min(y, dragStart.y);
    const nw = Math.abs(x - dragStart.x);
    const nh = Math.abs(y - dragStart.y);
    setCropRect({ x: nx, y: ny, w: nw, h: nh });
  };

  const onCropMouseUp = () => {
    setIsCropping(false);
  };

  const decodeFromCrop = async () => {
    if (!cropImgRef.current || !cropRect) return;
    const imgEl = cropImgRef.current;
    const view = cropViewRef.current;
    if (!view) return;
    const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
    const scaleY = imgEl.naturalHeight / imgEl.clientHeight;
    const sx = Math.max(0, Math.floor(cropRect.x * scaleX));
    const sy = Math.max(0, Math.floor(cropRect.y * scaleY));
    const sw = Math.max(1, Math.floor(cropRect.w * scaleX));
    const sh = Math.max(1, Math.floor(cropRect.h * scaleY));
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, sw, sh);
    const cropUrl = c.toDataURL('image/png');
    const cropImage = await loadImage(cropUrl);
    setDecodeMsg('جاري قراءة المنطقة المحددة...');
    const decoded = await decodeFromImageElRobust(cropImage);
    if (decoded) {
      const id = extractTrackingId(decoded);
      if (id) {
        setCropMode(false);
        setDecodeMsg('تم التعرف على رقم التتبع، جارٍ فتح التفاصيل...');
        setTrackingId(id);
        addIdsToTracked([id]);
        focusDecodedId(id);
        return;
      }
    }
    const ocrId = await ocrExtractTrackingIdFromImageEl(cropImage);
    if (ocrId) {
      setCropMode(false);
      setDecodeMsg(null);
      setTrackingId(ocrId);
      addIdsToTracked([ocrId]);
      return;
    }
    setDecodeMsg('تعذر قراءة المنطقة المحددة. حاول تحديد منطقة أوضح.');
  };

  const statusOrder = [RequestStatus.New, RequestStatus.InProgress, RequestStatus.Answered, RequestStatus.Closed];

  const formatDuration = (ms: number) => {
    if (ms <= 0 || !isFinite(ms)) return '—';
    const sec = Math.floor(ms / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts: string[] = [];
    if (d) parts.push(`${d} يوم`);
    if (h) parts.push(`${h} س`);
    if (m) parts.push(`${m} د`);
    if (!d && !h && !m) parts.push(`${s} ث`);
    return parts.join(' ');
  };

  const formatDateTime = (d?: Date) => {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('ar-SY-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    } catch {
      return formatArabicDate(d);
    }
  };

  const removeTracked = (id: string) => {
    const nextIds = trackedIds.filter((x) => x !== id);
    const nextTickets = tickets.filter((t) => t.id !== id);
    const nextMissing = notFound.filter((x) => x !== id);
    setTrackedIds(nextIds);
    setTickets(nextTickets);
    setNotFound(nextMissing);
    persistIds(nextIds);
  };

  const clearAllTracked = () => {
    setTrackedIds([]);
    setTickets([]);
    setNotFound([]);
    persistIds([]);
  };

  return (
    <Card>
      <div className="flex justify-center mb-6">
        <img src={ministryLogo} alt="شعار وزارة المالية" className="w-32 mx-auto" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">متابعة حالة طلب</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">أدخل رقم التتبع الخاص بطلبك للاستعلام عن حالته.</p>

      {/* مؤشرات الأداء الرئيسية */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center">مؤشرات الأداء الرئيسية</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl md:text-3xl font-bold mb-2">93%</div>
            <div className="text-xs md:text-sm opacity-90">الالتزام بـ SLA</div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl md:text-3xl font-bold mb-2">82%</div>
            <div className="text-xs md:text-sm opacity-90">رضا العملاء</div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl md:text-3xl font-bold mb-2">72%</div>
            <div className="text-xs md:text-sm opacity-90">الحل من المرة الأولى</div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl md:text-3xl font-bold mb-2">55</div>
            <div className="text-xs md:text-sm opacity-90">مؤشر NPS</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-500 dark:text-gray-400"></div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          <input type="checkbox" checked={multiMode} onChange={(e) => setMultiMode(e.target.checked)} />
          إدخال متعدد
        </label>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="flex-grow w-full">
          {multiMode ? (
            <div>
              <label ref={multiLabelRef} htmlFor="trackingIdMulti" className="block font-medium text-gray-700 dark:text-gray-300 mb-1 text-base md:text-lg">أرقام التتبع</label>
              <TextArea
                id="trackingIdMulti"
                rows={3}
                className="text-right text-base md:text-lg font-mono tracking-wide"
                placeholder={'مثال:\nALF-20240815-ABC123\nALF-20240816-DEF456'}
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                onKeyDown={onInputKeyDown}
                ref={trackingTextAreaRef}
                endAdornment={
                  <Button
                    onClick={() => handleSearch()}
                    isLoading={isLoading}
                    className="!py-1.5 !px-3 !bg-transparent !text-gray-600 !hover:bg-transparent !shadow-none !ring-0 !focus:ring-0 !focus:ring-offset-0 !border-0 !rounded-md dark:!text-gray-300"
                    aria-label="بحث"
                    title="بحث"
                  >
                    {!isLoading && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                    )}
                    {isLoading ? 'جاري...' : 'بحث'}
                  </Button>
                }
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">سيتم إضافة {splitIds(trackingId).length} رقم</div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <Input
                id="trackingId"
                label="رقم التتبع"
                labelClassName="text-base md:text-lg"
                labelRef={singleLabelRef}
                placeholder="مثال: ALF-20240815-ABC123"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                onKeyDown={onInputKeyDown}
                className="pr-28 rtl:pl-28 text-right text-lg md:text-xl font-mono tracking-wide"
                ref={trackingInputRef}
                endAdornment={
                  <Button
                    onClick={() => handleSearch()}
                    isLoading={isLoading}
                    className="!py-1.5 !px-3 !bg-transparent !text-gray-600 !hover:bg-transparent !shadow-none !ring-0 !focus:ring-0 !focus:ring-offset-0 !border-0 !rounded-md dark:!text-gray-300"
                    aria-label="بحث"
                    title="بحث"
                  >
                    {!isLoading && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                    )}
                    {isLoading ? 'جاري...' : 'بحث'}
                  </Button>
                }
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-start">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) decodeUploadedFile(f);
              e.currentTarget.value = '';
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="primary"
            className="whitespace-nowrap flex-shrink-0 min-w-[108px] !py-2 !px-4 !rounded-lg"
            style={{
              ...(controlHeight ? { height: `${controlHeight}px` } : {}),
              ...(labelOffset ? { marginTop: `${labelOffset}px` } : {}
            )}}
            title="رفع صورة/‏PDF للباركود أو QR"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12" /><path d="M7 8l5-5 5 5" /><path d="M5 21h14" /></svg>
            رفع كود
          </Button>
        </div>
      </div>

      {decodeMsg && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{decodeMsg}</p>}
      {multiMode && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">وضع الإدخال المتعدد: استخدم سطر جديد أو فاصلة. Ctrl+Enter للبحث</p>
      )}

      {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}

      {(tickets.length > 0 || notFound.length > 0) && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold mb-2 dark:text-gray-200">طلبات تمت إضافتها ({tickets.length})</h3>
            <div className="flex items.CENTER gap-2">
              {trackedIds.length > 0 && (
                <Button variant="secondary" className="!py-1 !px-3" onClick={clearAllTracked}>مسح الكل</Button>
              )}
            </div>
          </div>
          {notFound.length > 0 && (
            <div className="text-sm text-orange-600 dark:text-amber-400 mb-3">لم يتم العثور على: {notFound.map((id) => <bdi key={id} dir="ltr" className="mx-1">{id}</bdi>)}</div>
          )}
          <div className="space-y-8">
            {tickets.map((t) => {
              const currentStatusIndex = statusOrder.indexOf(t.status);
              return (
                <div key={t.id} id={`ticket-${t.id}`} className="border-t dark:border-gray-700 pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold dark:text-gray-100">تفاصيل الطلب</h4>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" className="!py-1 !px-3" onClick={() => copyText(t.id)}>نسخ</Button>
                      <Button variant="secondary" className="!py-1 !px-3" onClick={() => handleDownloadPdf(t)}>PDF</Button>
                      <Button className="!py-1 !px-3" onClick={() => removeTracked(t.id)}>إزالة</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap" dir="rtl">
                    <span className="font-mono text-xl md:text-2xl text-blue-700 dark:text-blue-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1">
                      <bdi dir="ltr">{t.id}</bdi>
                    </span>
                    {copied && <span className="text-xs text-green-600 dark:text-green-400">تم النسخ</span>}
                  </div>
                  <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                    <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">الاسم:</strong> {t.fullName}</div>
                    {t.email && <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">البريد الإلكتروني:</strong> {t.email}</div>}
                    <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">تاريخ التقديم:</strong> {t.submissionDate.toLocaleDateString('ar-SY-u-nu-latn')}</div>
                  </div>
                  <div className="flex items-start gap-3">
                    {statusOrder.map((status, index) => (
                      <React.Fragment key={status}>
                        <StatusStep
                          status={status}
                          isActive={currentStatusIndex === index}
                          isCompleted={currentStatusIndex > index}
                        />
                        {index < statusOrder.length - 1 && (
                          <div className={`w-8 sm:w-12 h-1 mt-4 ${currentStatusIndex > index ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">وقت وتاريخ التقديم</p>
                      <p className="text-lg font-bold text-teal-700 dark:text-teal-300">
                        {formatDateTime(t.submissionDate)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">تم الاستلام</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الرد</p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                        {t.answeredAt ? formatDuration(t.answeredAt.getTime() - t.submissionDate.getTime()) : '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t.answeredAt ? formatDateTime(t.answeredAt) : 'لم يتم الرد بعد'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الإغلاق</p>
                      <p className="text-lg font-bold text-fuchsia-700 dark:text-fuchsia-300">
                        {t.closedAt ? formatDuration(t.closedAt.getTime() - t.submissionDate.getTime()) : (t.startedAt ? formatDuration((t.closedAt ?? new Date()).getTime() - t.submissionDate.getTime()) : '—')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t.closedAt ? formatDateTime(t.closedAt) : (t.status === RequestStatus.Closed ? '—' : 'غير مغلق')}
                      </p>
                    </div>
                  </div>
                  {t.response && (
                    <div className="mt-4 border border-emerald-200 dark:border-emerald-700 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200"
                        onClick={() => toggleReply(t.id)}
                        aria-expanded={!!openReplies[t.id]}
                        aria-controls={`reply-panel-${t.id}`}
                      >
                        <span className="text-sm font-semibold">الرد</span>
                        <span className={`transition-transform ${openReplies[t.id] ? 'rotate-180' : ''}`} aria-hidden>
                          ▾
                        </span>
                      </button>
                      {openReplies[t.id] && (
                        <div id={`reply-panel-${t.id}`} className="px-4 pb-4 pt-3 bg-white dark:bg-gray-800">
                          <p className="whitespace-pre-wrap leading-7 text-gray-800 dark:text-gray-100">{t.response}</p>
                          {t.responseAttachments && t.responseAttachments.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">مرفقات الرد ({t.responseAttachments.length}):</p>
                              <ul className="mt-1 space-y-1 text-sm">
                                {t.responseAttachments.map((f, i) => (
                                  <li key={`${f.name}-${i}`} className="flex items-center gap-2">
                                    <span className="truncate" title={f.name}>{f.name}</span>
                                    <button
                                      className="text-blue-700 dark:text-blue-300 underline"
                                      onClick={() => {
                                        const url = URL.createObjectURL(f);
                                        window.open(url, '_blank');
                                        setTimeout(() => URL.revokeObjectURL(url), 10000);
                                      }}
                                    >فتح</button>
                                    <button
                                      className="text-blue-700 dark:text-blue-300 underline"
                                      onClick={() => {
                                        const url = URL.createObjectURL(f);
                                        const a = document.createElement('a');
                                        a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                        setTimeout(() => URL.revokeObjectURL(url), 0);
                                      }}
                                    >تنزيل</button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cropMode && cropImgUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-5xl w-full p-4">
            <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">حدد منطقة الكود</h3>
            <div
              ref={cropViewRef}
              className="relative max-h-[70vh] overflow-auto rounded-md border border-gray-200 dark:border-gray-700"
              onMouseDown={onCropMouseDown}
              onMouseMove={onCropMouseMove}
              onMouseUp={onCropMouseUp}
            >
              <img ref={cropImgRef} src={cropImgUrl} alt="crop" className="max-w-full h-auto block select-none" />
              {cropRect && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/10"
                  style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
                />
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => { setCropMode(false); setCropRect(null); setDecodeMsg(null); }}>إلغاء</Button>
              <Button onClick={decodeFromCrop} disabled={!cropRect}>قراءة المنطقة المحددة</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default TrackRequestPage;
