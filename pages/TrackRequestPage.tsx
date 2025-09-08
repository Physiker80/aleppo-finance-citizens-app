import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Ticket, RequestStatus } from '../types';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { pdfjs } from 'react-pdf';
import jsQR from 'jsqr';
import Tesseract from 'tesseract.js';
// @ts-expect-error Vite resolves to URL
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as unknown as string;

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
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [decodeMsg, setDecodeMsg] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const trackingInputRef = React.useRef<HTMLInputElement | null>(null);
  const [controlHeight, setControlHeight] = useState<number | null>(null);
  // Manual crop fallback state
  const [cropMode, setCropMode] = useState(false);
  const [cropImgUrl, setCropImgUrl] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const cropImgRef = React.useRef<HTMLImageElement | null>(null);
  const cropViewRef = React.useRef<HTMLDivElement | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Check for QR code scan parameter on component mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const idFromQR = urlParams.get('id');
    if (idFromQR) {
      setTrackingId(idFromQR);
      // Auto-search when coming from QR code
      setTimeout(() => {
        const foundTicket = appContext?.findTicket(idFromQR);
        if (foundTicket) {
          setTicket(foundTicket);
        } else {
          setError('رقم التتبع غير صحيح أو لم يتم العثور على الطلب.');
        }
      }, 500);
    }
  }, [appContext]);
  
  const handleSearch = (explicitId?: string) => {
    const id = (explicitId ?? trackingId).trim();
    if (!id) {
      setError('يرجى إدخال رقم التتبع.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setTicket(null);
    
    setTimeout(() => {
        const foundTicket = appContext?.findTicket(id);
        if (foundTicket) {
            setTicket(foundTicket);
        } else {
            setError('رقم التتبع غير صحيح أو لم يتم العثور على الطلب.');
        }
        setIsLoading(false);
    }, 1000);
  };

  // Fetch remote image as Data URL (base64). When asSvgText=true, treat response as text and encode as SVG data URL.
  const fetchAsDataUrl = async (url: string, asSvgText: boolean = false): Promise<string | null> => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return null;
      if (asSvgText) {
        const text = await res.text();
        const base64 = btoa(unescape(encodeURIComponent(text)));
        return `data:image/svg+xml;base64,${base64}`;
      }
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.readAsDataURL(blob);
      });
      return dataUrl;
    } catch {
      return null;
    }
  };

  // Get logo Data URL with robust fallbacks (PNG then SVG then 1x1 transparent PNG)
  const getLogoDataUrl = async (): Promise<string> => {
    const png = await fetchAsDataUrl('https://syrian.zone/syid/materials/logo.png');
    if (png) return png;
    const svg = await fetchAsDataUrl('https://syrian.zone/syid/materials/logo.ai.svg', true);
    if (svg) return svg;
    // Fallback: 1x1 transparent PNG
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax7p4EAAAAASUVORK5CYII=';
  };

  const handleDownloadPdf = async (ticket: Ticket) => {
    const logoDataUrl = await getLogoDataUrl();
    const pdfContent = `
      <html>
        <head>
          <title>تفاصيل الطلب: ${ticket.id}</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { 
              font-family: 'Cairo', sans-serif; 
              direction: rtl;
              margin: 0;
            }
            h1 { 
              color: #2563EB; 
              border-bottom: 2px solid #2563EB;
              padding-bottom: 10px;
              text-align: center;
              margin: 8px 0 16px;
            }
            .logo {
              display: block;
              margin: 24px auto 8px auto;
              width: 200px;
              height: auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: right;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .details {
                white-space: pre-wrap;
                word-wrap: break-word;
            }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body>
          <img id="pdf-logo" src="${logoDataUrl}" alt="Syrian Zone Logo" class="logo" />
          <h1>مديرية المالية - محافظة حلب</h1>
          <h2 style="text-align:center; color:#2563EB; font-size:1.2em; margin-bottom:8px;">إيصال تقديم طلب</h2>
          <p style="text-align:center; color:#666; font-size:0.95em; margin-bottom:18px;">وزارة المالية - الجمهورية العربية السورية</p>
          <table>
            <tr><th>الاسم الكامل</th><td>${ticket.fullName}</td></tr>
            <tr><th>رقم الهاتف</th><td>${ticket.phone}</td></tr>
            <tr><th>البريد الإلكتروني</th><td>${ticket.email || 'غير متوفر'}</td></tr>
            <tr><th>نوع الطلب</th><td>${ticket.requestType}</td></tr>
            <tr><th>القسم المعني</th><td>${ticket.department}</td></tr>
            <tr><th>تاريخ التقديم</th><td>${ticket.submissionDate.toLocaleDateString('ar-SY')}</td></tr>
            <tr><th>الحالة</th><td>${ticket.status}</td></tr>
            <tr><th>تفاصيل الطلب</th><td class="details">${ticket.details}</td></tr>
          </table>
          <script>
            (function(){
              function waitForImage(img){
                return new Promise(function(resolve){
                  if(!img) return resolve();
                  if(img.complete) return resolve();
                  img.addEventListener('load', function(){ resolve(); }, { once: true });
                  img.addEventListener('error', function(){ resolve(); }, { once: true });
                });
              }
              function waitForFonts(){
                if (document.fonts && document.fonts.ready) { return document.fonts.ready.catch(function(){}) } 
                return Promise.resolve();
              }
              window.addEventListener('load', function(){
                Promise.all([waitForImage(document.getElementById('pdf-logo')), waitForFonts()])
                  .then(function(){ setTimeout(function(){ window.print(); window.close(); }, 150); });
              });
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
        let foundId = null;
        for (const p of tryPages) {
          const page = await pdfDoc.getPage(p);
          let ocrTriedThisPage = false;
          for (const scale of scales) {
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;
            canvas.width = viewport.width; canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;
            const imgUrl = canvas.toDataURL('image/png');
            const img = await loadImage(imgUrl);
            // 1. Try robust decode
            const decodedText = await decodeFromImageElRobust(img);
            if (decodedText) {
              const id = extractTrackingId(decodedText);
              if (id) {
                foundId = id;
                break;
              }
            }
            // 2. OCR fallback once per page (try on the highest scale attempted first)
            if (!ocrTriedThisPage && scale >= 5) {
              setDecodeMsg('نحاول التعرف الضوئي على النص (OCR)...');
              const ocrId = await ocrExtractTrackingIdFromImageEl(img);
              if (ocrId) {
                foundId = ocrId;
                break;
              }
              ocrTriedThisPage = true;
            }
          }
          if (foundId) break;
        }
        // 3. Fallback: extract text content from PDF pages and parse the tracking ID
        if (!foundId) {
          for (const p of tryPages) {
            const page = await pdfDoc.getPage(p);
            const textContent = await page.getTextContent();
            const pageText = (textContent.items as any[]).map((it) => it.str).join(' ');
            const id = extractTrackingId(pageText);
            if (id) {
              foundId = id;
              break;
            }
          }
        }
        // 4. Try extracting text from PDF using pdfjs's getTextContent (for scanned PDFs)
        if (!foundId && pdfDoc.getMetadata) {
          try {
            const meta = await pdfDoc.getMetadata();
            if (meta && meta.info && typeof meta.info === 'object') {
              const metaText = Object.values(meta.info).join(' ');
              const id = extractTrackingId(metaText);
              if (id) foundId = id;
            }
          } catch {}
        }
        // 5. If we rendered any page, offer manual crop on first page at decent scale
        if (!foundId) {
          try {
            const firstPage = await pdfDoc.getPage(1);
            const viewport = firstPage.getViewport({ scale: 4 });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = viewport.width; canvas.height = viewport.height;
              await firstPage.render({ canvasContext: ctx, viewport }).promise;
              const fallbackUrl = canvas.toDataURL('image/png');
              setCropImgUrl(fallbackUrl);
              setCropMode(true);
              setDecodeMsg('لم يتم العثور على رقم التتبع تلقائياً في ملف PDF المرفوع. يرجى تحديد منطقة الكود (QR أو باركود) يدوياً في الصورة أدناه، أو التأكد من أن الكود واضح وكبير بما يكفي للقراءة.');
              return;
            }
          } catch {}
        }
        if (foundId) {
          setTrackingId(foundId);
          setDecodeMsg(null);
          handleSearch(foundId);
          return;
        }
        setDecodeMsg('تعذر العثور على رقم التتبع في ملف PDF. تأكد من أن الملف يحتوي كود QR أو باركود واضح، أو استخدم أداة التحديد اليدوي لتجربة القراءة من منطقة محددة.');
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
              handleSearch(id);
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
        handleSearch(id);
        return;
      }
    }
    // Try OCR on crop
    const ocrId = await ocrExtractTrackingIdFromImageEl(cropImage);
    if (ocrId) {
      setCropMode(false);
      setDecodeMsg(null);
      setTrackingId(ocrId);
      handleSearch(ocrId);
      return;
    }
    setDecodeMsg('تعذر قراءة المنطقة المحددة. حاول تحديد منطقة أوضح.');
  };
  
  const statusOrder = [RequestStatus.New, RequestStatus.InProgress, RequestStatus.Answered, RequestStatus.Closed];

  return (
    <Card>
        <img src="https://syrian.zone/syid/materials/logo.ai.svg" alt="Syrian Zone Logo" className="mb-4 w-32 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">متابعة حالة طلب</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">أدخل رقم التتبع الخاص بطلبك للاستعلام عن حالته.</p>
        
  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
  <div className="flex-grow w-full">
          <div className="relative">
            <Input 
              id="trackingId" 
              label="رقم التتبع" 
              placeholder="مثال: ALF-20240815-ABC123" 
              value={trackingId} 
              onChange={(e) => setTrackingId(e.target.value)}
              className="pr-28 rtl:pl-28"
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
            style={controlHeight ? { height: `${controlHeight}px` } : undefined}
            title="رفع صورة/‏PDF للباركود أو QR"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12" /><path d="M7 8l5-5 5 5" /><path d="M5 21h14" /></svg>
            رفع كود
          </Button>
        </div>
      </div>

      {decodeMsg && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{decodeMsg}</p>}

      {error && <p className="text-red-500 mt-4 text-sm">{error}</p>
      }
      
      {ticket && (
        <div className="mt-8 border-t dark:border-gray-700 pt-6">
          <h3 className="text-xl font-bold mb-4 dark:text-gray-200">تفاصيل الطلب: <span className="font-mono text-blue-600 dark:text-blue-400">{ticket.id}</span></h3>
          
          <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">الاسم:</strong> {ticket.fullName}</div>
              {ticket.email && <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">البريد الإلكتروني:</strong> {ticket.email}</div>}
              <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">تاريخ التقديم:</strong> {ticket.submissionDate.toLocaleDateString('ar-SY')}</div>
              <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">نوع الطلب:</strong> {ticket.requestType}</div>
              <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">القسم:</strong> {ticket.department}</div>
          </div>
          
          <h4 className="text-lg font-bold mb-6 dark:text-gray-200">حالة الطلب الحالية:</h4>
          
          <div className="flex items-start">
            {statusOrder.map((status, index) => {
                const currentStatusIndex = statusOrder.indexOf(ticket.status);
                return (
                    <React.Fragment key={status}>
                        <StatusStep 
                            status={status}
                            isActive={currentStatusIndex === index}
                            isCompleted={currentStatusIndex > index}
                        />
                        {index < statusOrder.length -1 && (
                            <div className={`flex-1 h-1 mt-4 ${currentStatusIndex > index ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
          </div>
          
          <div className="mt-8 pt-6 border-t border-dashed dark:border-gray-700 text-center">
            <Button 
                onClick={() => handleDownloadPdf(ticket)}
                variant="secondary"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                تحميل كملف PDF
            </Button>
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