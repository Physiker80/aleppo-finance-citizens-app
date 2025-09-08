import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import TextArea from '../components/ui/TextArea';
import { Ticket, RequestStatus } from '../types';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { pdfjs } from 'react-pdf';
import jsQR from 'jsqr';
import Tesseract from 'tesseract.js';
// @ts-expect-error Vite resolves to URL
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as unknown as string;

// Ministry identity logo for header branding
const ministryLogo = 'https://syrian.zone/syid/materials/logo.ai.svg';

const StatusStep: React.FC<{
  status: RequestStatus;
  isActive: boolean;
  isCompleted: boolean;
}> = ({ status, isActive, isCompleted }) => {
  const baseCircleClasses = "w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300";
  const activeCircleClasses = "bg-blue-600 text-white";
  const completedCircleClasses = "bg-green-500 text-white";
  const inactiveCircleClasses = "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400";

  let circleClass = inactiveCircleClasses;
  if(isActive) circleClass = activeCircleClasses;
  if(isCompleted) circleClass = completedCircleClasses;

  return (
    <div className="flex-1 flex flex-col items-center">
        <div className={circleClass}>
            {isCompleted ? '✓' : '•'}
        </div>
        <p className={`mt-2 text-sm text-center ${isActive || isCompleted ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{status}</p>
    </div>
  );
};

const TrackRequestPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const [trackingId, setTrackingId] = useState('');
  // Multi-tracking state
  const [trackedIds, setTrackedIds] = useState<string[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [decodeMsg, setDecodeMsg] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const trackingInputRef = React.useRef<HTMLInputElement | null>(null);
  const [controlHeight, setControlHeight] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [multiMode, setMultiMode] = useState(true); // تسهيل إدخال عدة أرقام افتراضياً
  // Manual crop fallback state
  const [cropMode, setCropMode] = useState(false);
  const [cropImgUrl, setCropImgUrl] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const cropImgRef = React.useRef<HTMLImageElement | null>(null);
  const cropViewRef = React.useRef<HTMLDivElement | null>(null);
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
  
  const addIdsToTracked = (ids: string[]) => {
    if (!ids.length) return;
    setIsLoading(true);
    setError(null);
    // de-dup against existing
    const existing = new Set(trackedIds.map((s) => s.toUpperCase()));
    const newUnique = ids.map((s) => s.trim()).filter(Boolean).filter((s) => !existing.has(s.toUpperCase()));
    const nextIds = [...trackedIds, ...newUnique];
    // resolve tickets for just-added ids
    const justFound: Ticket[] = [];
    const justMissing: string[] = [];
    newUnique.forEach((id) => {
      const t = appContext?.findTicket(id);
      if (t) justFound.push(t); else justMissing.push(id);
    });
    // merge tickets, avoid duplicate ids
    const ticketIdSet = new Set(tickets.map((t) => t.id));
    const mergedTickets = [...tickets, ...justFound.filter((t) => !ticketIdSet.has(t.id))];
    const mergedMissing = Array.from(new Set([...notFound, ...justMissing]));
    setTrackedIds(nextIds);
    setTickets(mergedTickets);
    setNotFound(mergedMissing);
    persistIds(nextIds);
    setTimeout(() => setIsLoading(false), 300);
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

  const prettyTrackingId = (id: string) => {
    if (!id) return '';
    // Add thin spacing around dashes for readability and keep LTR rendering
    return id.replace(/-/g, ' - ').replace(/\s\s+/g, ' - ');
  };

  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // Build QR as data URL (tries qrcodejs then qrcode-generator)
  const buildQRDataUrl = async (text: string, size = 160): Promise<string | null> => {
    try {
      const QRCodeAny = (window as any).QRCode;
      if (QRCodeAny) {
        const tmpDiv = document.createElement('div');
        new QRCodeAny(tmpDiv, { text, width: size, height: size, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCodeAny.CorrectLevel.M });
        const c = tmpDiv.querySelector('canvas') as HTMLCanvasElement | null;
        const im = tmpDiv.querySelector('img') as HTMLImageElement | null;
        if (c) return c.toDataURL('image/png');
        if (im && im.src) return im.src;
      }
    } catch {}
    try {
      const qrcodeFactory = (window as any).qrcode;
      if (qrcodeFactory) {
        const qr = qrcodeFactory(4, 'M');
        qr.addData(text);
        qr.make();
        const gifUrl = qr.createDataURL(8, 0);
        // Convert GIF to PNG to embed cleanly
        return await new Promise<string>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const oc = document.createElement('canvas');
            oc.width = size; oc.height = size;
            const ctx = oc.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, size, size);
              ctx.drawImage(img, 0, 0, size, size);
              resolve(oc.toDataURL('image/png'));
            } else {
              resolve(gifUrl);
            }
          };
          img.onerror = () => resolve(gifUrl);
          img.src = gifUrl;
        });
      }
    } catch {}
    return null;
  };

  // Build CODE128 barcode as PNG data URL via JsBarcode
  const buildBarcodeDataUrl = async (text: string, opts?: { width?: number; height?: number; displayValue?: boolean; fontSize?: number; }): Promise<string | null> => {
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
    const pdfContent = `
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>تفاصيل الطلب: ${ticket.id}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Cairo', sans-serif;
              direction: rtl;
              margin: 0;
              background: #ffffff;
              color: #333;
            }
            .container { padding: 40px; }
            @page { size: A4; margin: 12mm; }
            @media print {
              .page { break-after: page; page-break-after: always; }
              .page-break { break-before: page; page-break-before: always; }
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #0f3c35;
              padding-bottom: 25px;
              margin-bottom: 30px;
            }
            .subheader {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f3c35;
              padding-bottom: 14px;
              margin-bottom: 20px;
            }
            .header-text { text-align: right; }
            .header-text h1 { margin: 8px 0 0; font-size: 28px; color: #0f3c35; font-weight: 600; }
            .header-text p { margin: 6px 0 0; color: #555; font-weight: 600; }
            .subheader-text h2 { margin: 6px 0 0; font-size: 20px; color: #0f3c35; font-weight: 600; }
            .subheader-text p { margin: 4px 0 0; color: #777; font-size: 13px; }
            .section-title { font-size: 24px; margin-bottom: 20px; color: #0f3c35; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 16px; border-radius: 8px; overflow: hidden; }
            td { padding: 15px; border: 1px solid #e0e0e0; }
            .label { font-weight: bold; color: #0f3c35; width: 30%; background: #f8f9fa; }
            .details { white-space: pre-wrap; line-height: 1.6; }
            .logo { height: 90px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
            .logo-sm { height: 60px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
          </style>
  </head>
  <body>
          <div class="container">
            <div class="page">
              <div class="header">
                <div class="header-text">
                  <h1>مديريــة الماليــة - محافظــة حلــب</h1>
                  <p>تفاصيل الطلب</p>
                  <p style="font-size:14px;color:#777">وزارة المالية - الجمهورية العربية السورية</p>
                </div>
                <img class="logo" src="${ministryLogo}" alt="شعار الوزارة" />
              </div>

              <h2 class="section-title">تفاصيل الطلب</h2>
              <table>
                <tbody>
                <tr>
                  <td class="label">رقم التتبع</td>
                  <td>${ticket.id}</td>
                </tr>
                <tr>
                  <td class="label">الاسم الكامل</td>
                  <td>${ticket.fullName}</td>
                </tr>
                <tr>
                  <td class="label">رقم الهاتف</td>
                  <td>${ticket.phone}</td>
                </tr>
                <tr>
                  <td class="label">البريد الإلكتروني</td>
                  <td>${ticket.email || 'غير محدد'}</td>
                </tr>
                <tr>
                  <td class="label">نوع الطلب</td>
                  <td>${ticket.requestType}</td>
                </tr>
                <tr>
                  <td class="label">القسم المعني</td>
                  <td>${ticket.department}</td>
                </tr>
                <tr>
                  <td class="label">تاريخ التقديم</td>
                  <td>${new Intl.DateTimeFormat('ar-SY-u-nu-latn', { dateStyle: 'medium' }).format(ticket.submissionDate)}</td>
                </tr>
                <tr>
                  <td class="label">الحالة الحالية</td>
                  <td>${ticket.status}</td>
                </tr>
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
      // Inner script handles waiting and printing
    }
  };

  const extractTrackingId = (text: string): string | null => {
    // Try direct id, or find ALF-like pattern
    const trimmed = (text || '').trim();
    if (!trimmed) return null;
    // Accept exact ID or hash URL like ...#/track?id=XYZ
    const urlMatch = trimmed.match(/[#?&]id=([^\s&#]+)/i);
    if (urlMatch?.[1]) return urlMatch[1];
    // Prefer an ALF-like token if present
    const alfMatch = trimmed.match(/ALF-[A-Z0-9-]+/i);
    if (alfMatch?.[0]) return alfMatch[0];
    // Fallback: capture a token-like id (letters/digits/dash/underscore)
    const tokenMatch = trimmed.match(/[A-Z0-9_-]{6,}/i);
    return tokenMatch ? tokenMatch[0] : null;
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
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.PDF_417,
      BarcodeFormat.AZTEC,
      BarcodeFormat.DATA_MATRIX,
    ]);
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 500 });
  };

  // no-op

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const rotateImageEl = async (img: HTMLImageElement, angle: number): Promise<HTMLImageElement> => {
    if (angle % 360 === 0) return img;
    const rc = document.createElement('canvas');
    const rad = (angle % 360) * Math.PI / 180;
    if (angle % 180 === 0) { rc.width = img.width; rc.height = img.height; }
    else { rc.width = img.height; rc.height = img.width; }
    const rctx = rc.getContext('2d');
    if (!rctx) return img;
    rctx.imageSmoothingEnabled = false;
    rctx.translate(rc.width / 2, rc.height / 2);
    rctx.rotate(rad);
    rctx.drawImage(img, -img.width / 2, -img.height / 2);
    const rotatedUrl = rc.toDataURL('image/png');
    return await loadImage(rotatedUrl);
  };

  const scaleImageEl = async (img: HTMLImageElement, scale: number): Promise<HTMLImageElement> => {
    if (scale === 1) return img;
    const sc = document.createElement('canvas');
    sc.width = Math.max(1, Math.round(img.width * scale));
    sc.height = Math.max(1, Math.round(img.height * scale));
    const sctx = sc.getContext('2d');
    if (!sctx) return img;
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(img, 0, 0, sc.width, sc.height);
    const url = sc.toDataURL('image/png');
    return await loadImage(url);
  };

  const cropTileEl = async (img: HTMLImageElement, x: number, y: number, w: number, h: number): Promise<HTMLImageElement> => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); if (!ctx) return img;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    const url = c.toDataURL('image/png');
    return await loadImage(url);
  };

  const decodeFromImageElRobust = async (baseImg: HTMLImageElement): Promise<string | null> => {
    const scales = [1, 1.5, 2, 3, 4];
    const angles = [0, 90, 180, 270];
    const tryDecode = async (el: HTMLImageElement): Promise<string | null> => {
      try {
        const result = await newReader().decodeFromImageElement(el);
        return (result as any).getText?.() ?? null;
      } catch {
        // try preprocessed variants
        const variants = await preprocessVariants(el);
        for (const v of variants) {
          try {
            const result = await newReader().decodeFromImageElement(v);
            return (result as any).getText?.() ?? null;
          } catch {}
        }
        // jsQR fallback on original and variants
        const qrText = await tryJsQr(el);
        if (qrText) return qrText;
        for (const v of variants) {
          const t = await tryJsQr(v);
          if (t) return t;
        }
        return null;
      }
    };
    // Try full image first (all scales/rotations)
    for (const s of scales) {
      let img = await scaleImageEl(baseImg, s);
      for (const a of angles) {
        const el = await rotateImageEl(img, a);
        const text = await tryDecode(el);
        if (text) return text;
      }
    }
    // Try tiled crops (2x2 and 3x3) with slight overlaps
    const grids = [2, 3];
    for (const g of grids) {
      const overlap = 0.1; // 10% overlap
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

  const tryJsQr = async (img: HTMLImageElement): Promise<string | null> => {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
  const res = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' as const });
    return res?.data ?? null;
  };

  const ocrExtractTrackingIdFromImageEl = async (img: HTMLImageElement): Promise<string | null> => {
    try {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d'); if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      // Use ara+eng; whitelist ID-like characters to bias recognition
      const result: any = await (Tesseract as any).recognize(c, 'ara+eng', {
        // @ts-ignore
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_#=?&',
        // @ts-ignore
        preserve_interword_spaces: '1',
      });
      const text: string = result?.data?.text ?? '';
      const id = extractTrackingId(text);
      return id;
    } catch {
      return null;
    }
  };

  // Focused OCR: isolate magenta/pink text (e.g., the red tracking number in the receipt box), then OCR
  const ocrExtractTrackingIdFromImageElRedMask = async (img: HTMLImageElement): Promise<string | null> => {
    try {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d'); if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imgData.data;
      // Build a binary mask that keeps only magenta/pink-ish pixels as black text on white background
      // Targeting colors similar to #d63384 used for tracking ID in the receipt template
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const isMagenta = (r > 150) && (b > 70) && (g < 140) && (r - g > 40) && (b - g > 10) && (r >= b);
        if (isMagenta) {
          // black text
          data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
        } else {
          // white background
          data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      // Optional: light dilation to connect characters (skip for performance for now)
      const result: any = await (Tesseract as any).recognize(c, 'ara+eng', {
        // @ts-ignore
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_#=?&',
        // @ts-ignore
        preserve_interword_spaces: '1',
      });
      const text: string = result?.data?.text ?? '';
      const id = extractTrackingId(text);
      return id;
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
    // grayscale + min/max
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
    // contrast stretch
    const stretched = new Uint8ClampedArray(gray.length);
    const range = Math.max(1, max - min);
    for (let i = 0; i < gray.length; i++) {
      stretched[i] = Math.max(0, Math.min(255, Math.round((gray[i] - min) * 255 / range)));
    }
    const stretchedImg = await mkImageFromGray(stretched); if (stretchedImg) out.push(stretchedImg);
    // binary thresholds
    const thresholds = [180, 160, 140, 120];
    for (const t of thresholds) {
      const thr = new Uint8ClampedArray(gray.length);
      for (let i = 0; i < gray.length; i++) thr[i] = gray[i] > t ? 255 : 0;
      const thrImg = await mkImageFromGray(thr); if (thrImg) out.push(thrImg);
      // inverted
      const inv = new Uint8ClampedArray(gray.length);
      for (let i = 0; i < gray.length; i++) inv[i] = 255 - thr[i];
      const invImg = await mkImageFromGray(inv); if (invImg) out.push(invImg);
    }
    // inverted grayscale
    const invGray = new Uint8ClampedArray(gray.length);
    for (let i = 0; i < gray.length; i++) invGray[i] = 255 - gray[i];
    const invGrayImg = await mkImageFromGray(invGray); if (invGrayImg) out.push(invGrayImg);
    return out;
  };

  const decodeUploadedFile = async (file: File) => {
    setDecodeMsg('جاري تحليل الملف...');
    try {
      if (file.type === 'application/pdf') {
        // Render up to first 5 pages to canvas using pdfjs, then decode via robust image trials
        const ab = await file.arrayBuffer();
  const pdfDoc = await pdfjs.getDocument({ data: ab }).promise;
        const maxPages = Math.min(5, pdfDoc.numPages || 1);
        const tryPages = Array.from({ length: maxPages }, (_, i) => i + 1);
        const scales = [6, 5, 4, 3, 2];
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
                setDecodeMsg(null);
                addIdsToTracked([id]);
                return;
              }
            }
            // OCR fallback once per page (try on the highest scale attempted first)
            if (!ocrTriedThisPage && scale >= 5) {
              // Try focused OCR on the red tracking number first
              setDecodeMsg('نحاول التعرف على رقم التتبع المكتوب باللون الأحمر...');
              const redId = await ocrExtractTrackingIdFromImageElRedMask(img);
              if (redId) {
                setTrackingId(redId);
                setDecodeMsg(null);
                addIdsToTracked([redId]);
                return;
              }
              // Then generic OCR across the whole page
              setDecodeMsg('نحاول التعرف الضوئي على النص (OCR)...');
              const ocrId = await ocrExtractTrackingIdFromImageEl(img);
              if (ocrId) {
                setTrackingId(ocrId);
                setDecodeMsg(null);
                addIdsToTracked([ocrId]);
                return;
              }
              ocrTriedThisPage = true;
            }
          }
        }
        // Fallback: extract text content from PDF pages and parse the tracking ID
        for (const p of tryPages) {
          const page = await pdfDoc.getPage(p);
          const textContent = await page.getTextContent();
          const pageText = (textContent.items as any[]).map((it) => it.str).join(' ');
          const id = extractTrackingId(pageText);
          if (id) {
            setTrackingId(id);
            setDecodeMsg(null);
            addIdsToTracked([id]);
            return;
          }
        }
        // If we rendered any page, offer manual crop on first page at decent scale
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
        // Decode from image element with robust retries (scales, rotations, tiles)
        const url = URL.createObjectURL(file);
        const baseImg = await loadImage(url);
        try {
          const decodedText = await decodeFromImageElRobust(baseImg);
      if (decodedText) {
            const id = extractTrackingId(decodedText);
            if (id) {
        setTrackingId(id);
        setDecodeMsg(null);
        addIdsToTracked([id]);
              URL.revokeObjectURL(url);
              return;
            }
          }
          // Offer manual crop on the original image
          setCropImgUrl(url);
          setCropMode(true);
          setDecodeMsg('تعذر القراءة تلقائياً. حدد منطقة الكود وجرب مرة أخرى.');
        } catch (e) {
          setDecodeMsg('تعذر قراءة الكود من الصورة.');
        }
      } else {
        setDecodeMsg('الرجاء رفع صورة أو ملف PDF فقط.');
      }
    } catch (e) {
      setDecodeMsg('حدث خطأ أثناء تحليل الملف. تأكد من أن الملف يحتوي كود QR أو باركود واضح.');
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
    // Map view rect to natural image pixels
    const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
    const scaleY = imgEl.naturalHeight / imgEl.clientHeight;
    const sx = Math.max(0, Math.floor(cropRect.x * scaleX));
    const sy = Math.max(0, Math.floor(cropRect.y * scaleY));
    const sw = Math.max(1, Math.floor(cropRect.w * scaleX));
    const sh = Math.max(1, Math.floor(cropRect.h * scaleY));
    // Build cropped image URL
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, sw, sh);
    const cropUrl = c.toDataURL('image/png');
    const cropImage = await loadImage(cropUrl);
    setDecodeMsg('جاري قراءة المنطقة المحددة...');
    // Try robust decode
    const decoded = await decodeFromImageElRobust(cropImage);
    if (decoded) {
      const id = extractTrackingId(decoded);
      if (id) {
        setCropMode(false);
        setDecodeMsg(null);
        setTrackingId(id);
        addIdsToTracked([id]);
        return;
      }
    }
    // Try OCR on crop
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
              <label htmlFor="trackingIdMulti" className="block font-medium text-gray-700 dark:text-gray-300 mb-1 text-base md:text-lg">أرقام التتبع</label>
              <TextArea
                id="trackingIdMulti"
                rows={3}
                className="text-right text-base md:text-lg font-mono tracking-wide"
                placeholder={'مثال:\nALF-20240815-ABC123\nALF-20240816-DEF456'}
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                onKeyDown={onInputKeyDown}
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">سيتم إضافة {splitIds(trackingId).length} رقم</div>
                <Button onClick={() => handleSearch()} isLoading={isLoading} className="!py-1.5 !px-4" title="بحث عن الأرقام">
                  {!isLoading && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                  )}
                  {isLoading ? 'جاري...' : 'بحث'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <Input
                id="trackingId"
                label="رقم التتبع"
                labelClassName="text-base md:text-lg"
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
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) decodeUploadedFile(f);
              // reset to allow re-upload same file
              e.currentTarget.value = '';
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="primary"
            className="whitespace-nowrap flex-shrink-0 min-w-[108px] !py-2 !px-4"
            style={!multiMode && controlHeight ? { height: `${controlHeight}px` } : undefined}
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
            <div className="flex items-center gap-2">
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
                <div key={t.id} className="border-t dark:border-gray-700 pt-6">
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
                    <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">تاريخ التقديم:</strong> {t.submissionDate.toLocaleDateString('ar-SY')}</div>
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

      {/* Sync upload button height with input height */}
      {React.useEffect(() => {
        const sync = () => {
          if (trackingInputRef.current) {
            setControlHeight(trackingInputRef.current.clientHeight);
          }
        };
        sync();
        window.addEventListener('resize', sync);
        return () => window.removeEventListener('resize', sync);
      }, [])}
    </Card>
  );
};

export default TrackRequestPage;