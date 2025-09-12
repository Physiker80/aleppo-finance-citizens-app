import React, { useContext, useRef, useEffect, useState } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { generateConfirmationPdf, getAvailableTemplates, hasCustomTemplates, getDefaultApprovedTemplate } from '../utils/confirmationPdfIntegration';

declare const jspdf: any;
declare const html2canvas: any;
declare const JsBarcode: any;
declare const QRCode: any;

// Ministry identity logo for header branding (used in PDF as well)
// Place your provided logo file at: public/ministry-logo.png
const ministryLogoLocalPng = '/ministry-logo.png';
const ministryLogoLocalSvg = '/ministry-logo.svg';
const ministryLogoRemote = 'https://syrian.zone/syid/materials/logo.ai.svg';

const ConfirmationPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const { lastSubmittedId, findTicket } = appContext || {};
  const ticket = lastSubmittedId ? findTicket?.(lastSubmittedId) : undefined;
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [attGalleryOpen, setAttGalleryOpen] = useState(false);
  const [attIndex, setAttIndex] = useState(0);
  const [attLoading, setAttLoading] = useState<boolean>(false);
  const [attCanceled, setAttCanceled] = useState<boolean>(false);
  const [attObjUrl, setAttObjUrl] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [availableTemplates, setAvailableTemplates] = useState(getAvailableTemplates());

  const trackingUrl = ticket?.id ? `${window.location.origin}/#/track?id=${ticket.id}` : '';

  // تحميل القوالب المعتمدة عند التهيئة
  useEffect(() => {
    const templates = getAvailableTemplates();
    setAvailableTemplates(templates);
    
    // تعيين القالب الافتراضي
    const defaultTemplate = getDefaultApprovedTemplate();
    if (defaultTemplate) {
      setSelectedTemplate(defaultTemplate.name);
    }
  }, []);

  // Helpers for date/time and durations (Arabic locale with Latin digits)
  const formatDateTime = (d?: Date) => {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('ar-SY-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    } catch {
      return d.toLocaleString();
    }
  };
  const formatDuration = (from?: Date, to?: Date) => {
    if (!from || !to) return '—';
    const ms = to.getTime() - from.getTime();
    if (!isFinite(ms) || ms <= 0) return '—';
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

  const handleCopyTrackingLink = () => {
    if (!trackingUrl) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(trackingUrl).then(() => alert('تم نسخ رابط المتابعة بنجاح!')).catch(() => alert('تعذر نسخ الرابط'));
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = trackingUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('تم نسخ رابط المتابعة بنجاح!');
      } catch {
        alert('فشل في نسخ الرابط. يرجى نسخه يدوياً.');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const handleDownloadQr = () => {
    const container = document.getElementById('main-qr');
    if (!container) return;
    // Try canvas first then img fallback
    const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
    const img = container.querySelector('img') as HTMLImageElement | null;
    let dataUrl: string | null = null;
    if (canvas) dataUrl = canvas.toDataURL('image/png');
    else if (img && img.src) dataUrl = img.src;
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${ticket?.id || 'tracking'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenFirstAttachment = () => {
    const files = ticket?.attachments || [];
    if (!files.length) return;
    setAttIndex(0);
    setAttGalleryOpen(true);
  };

  // Manage object URL and loading state for attachments viewer
  useEffect(() => {
    if (!attGalleryOpen || !ticket?.attachments?.length) {
      if (attObjUrl) {
        URL.revokeObjectURL(attObjUrl);
        setAttObjUrl(null);
      }
      setAttLoading(false);
      setAttCanceled(false);
      return;
    }
    const file = ticket.attachments[attIndex];
    setAttLoading(true);
    setAttCanceled(false);
    if (attObjUrl) {
      URL.revokeObjectURL(attObjUrl);
      setAttObjUrl(null);
    }
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf' || !file.type)) {
      const url = URL.createObjectURL(file);
      setAttObjUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
    return;
  }, [attGalleryOpen, attIndex, ticket?.attachments]);

  const readableSize = (size: number) => {
    if (size >= 1024 * 1024) return `${Math.ceil(size / (1024 * 1024))}MB`;
    if (size >= 1024) return `${Math.ceil(size / 1024)}KB`;
    return `${size}B`;
  };

  const DocxPreview: React.FC<{ file: File }> = ({ file }) => {
    const [html, setHtml] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          // @ts-ignore dynamic import browser build
          const mammothMod = await import('mammoth/mammoth.browser');
          const mammothLib: any = mammothMod.default || mammothMod;
          const { value } = await mammothLib.convertToHtml({ arrayBuffer });
          if (!cancelled) setHtml(value);
        } catch {
          if (!cancelled) setError('تعذر عرض ملف الوورد');
        }
      })();
      return () => { cancelled = true; };
    }, [file]);
    if (error) return <div className="text-center py-10 text-white/90">{error}</div>;
    if (!html) return <div className="text-center py-10 text-white/90">جارٍ تجهيز معاينة الوورد…</div>;
    return (
      <div className="prose max-w-none dark:prose-invert bg-white/90 dark:bg-gray-900/90 p-6 rounded border border-white/20 max-h-full overflow-auto" dangerouslySetInnerHTML={{ __html: html }} />
    );
  };

  useEffect(() => {
    if (ticket?.id && typeof JsBarcode !== 'undefined') {
      try {
        const mainBarcodeCanvas = document.getElementById('main-barcode') as HTMLCanvasElement;
        if (mainBarcodeCanvas) {
          JsBarcode(mainBarcodeCanvas, ticket.id, {
            format: 'CODE128',
            lineColor: '#000',
            width: 2,
            height: 80,
            displayValue: true,
            fontSize: 14,
            margin: 10,
            background: '#ffffff',
          });
        }
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }

    // Generate on-screen QR code
    if (ticket?.id && typeof QRCode !== 'undefined') {
      try {
        const qrContainer = document.getElementById('main-qr');
        if (qrContainer) {
          qrContainer.innerHTML = '';
          const trackingUrl = `${window.location.origin}/#/track?id=${ticket.id}`;
          new QRCode(qrContainer, {
            text: trackingUrl,
            width: 140,
            height: 140,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M,
          });
        }
      } catch (error) {
        console.error('Error generating QR:', error);
      }
    }
  }, [ticket?.id]);

  // دالة إنتاج PDF بالقوالب المعتمدة
  const handleDownloadTemplatedPdf = async () => {
    if (!ticket) {
      alert('لا توجد بيانات طلب لإنتاج PDF');
      return;
    }

    try {
      // استخدام القالب المحدد أو الافتراضي
      const templateName = selectedTemplate || getDefaultApprovedTemplate()?.name;
      await generateConfirmationPdf(ticket, templateName);
      alert('تم إنتاج إيصال PDF بالقالب المعتمد بنجاح');
    } catch (error) {
      console.error('Error generating templated PDF:', error);
      alert('فشل في إنتاج إيصال PDF بالقالب المعتمد');
    }
  };

  const handleDownloadPdf = async () => {
    const content = pdfContentRef.current;
    if (!content || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
      console.error("PDF generation libraries not loaded or content not found.");
      return;
    }

    try {
      // Ensure web fonts are loaded to render Arabic shaping correctly
      try {
        if ((document as any).fonts && typeof (document as any).fonts.ready?.then === 'function') {
          const fontReady = (document as any).fonts.ready as Promise<void>;
          await Promise.race([
            fontReady,
            new Promise((resolve) => setTimeout(resolve, 800)) // safety timeout
          ]);
        }
      } catch {}
      const pdfBarcodeCanvas = document.getElementById('pdf-barcode') as HTMLCanvasElement;
      if (pdfBarcodeCanvas && ticket?.id) {
        JsBarcode(pdfBarcodeCanvas, ticket.id, {
          format: "CODE128",
          lineColor: "#000000",
          width: 2.5,
          height: 80,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: "#ffffff"
        });
      }

      // Ensure QR for PDF exists before capture
      if (ticket?.id && (typeof QRCode !== 'undefined' || typeof window !== 'undefined')) {
        const pdfQrContainer = document.getElementById('pdf-qr');
        if (pdfQrContainer) {
          pdfQrContainer.innerHTML = '';
          const trackingUrl = `${window.location.origin}/#/track?id=${ticket.id}`;
          let appended = false;
          try {
            if (typeof QRCode !== 'undefined') {
              const tmpDiv = document.createElement('div');
              new QRCode(tmpDiv, {
                text: trackingUrl,
                width: 160,
                height: 160,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M,
              });
              const qrCanvas = tmpDiv.querySelector('canvas') as HTMLCanvasElement | null;
              const qrImgTag = tmpDiv.querySelector('img') as HTMLImageElement | null;
              const qrTable = tmpDiv.querySelector('table') as HTMLTableElement | null;
              if (qrCanvas) {
                const img = document.createElement('img');
                img.src = qrCanvas.toDataURL('image/png');
                img.width = 160;
                img.height = 160;
                img.style.display = 'block';
                pdfQrContainer.appendChild(img);
                appended = true;
              } else if (qrImgTag) {
                qrImgTag.width = 160;
                qrImgTag.height = 160;
                qrImgTag.style.display = 'block';
                pdfQrContainer.appendChild(qrImgTag);
                appended = true;
              } else if (qrTable) {
                // As a last resort, append table-based QR
                pdfQrContainer.appendChild(qrTable);
                appended = true;
              }
            }
          } catch {}
          if (!appended) {
            try {
              const qrcodeFactory = (window as any).qrcode;
              if (qrcodeFactory) {
                const qr = qrcodeFactory(4, 'M');
                qr.addData(trackingUrl);
                qr.make();
                const dataUrl = qr.createDataURL(8, 0);
                const img = document.createElement('img');
                img.src = dataUrl;
                img.width = 160;
                img.height = 160;
                pdfQrContainer.appendChild(img);
                appended = true;
              }
            } catch {}
          }
        }
      }

  // Wait for header logo to load to avoid it missing in the capture
  const headerLogo = content.querySelector('#ministry-logo') as HTMLImageElement | null;
      if (headerLogo && !headerLogo.complete) {
        await new Promise<void>((resolve) => {
          headerLogo.onload = () => resolve();
          headerLogo.onerror = () => resolve();
        });
      }

      // Wait for QR image (if present) to load fully
      const qrImg = document.querySelector('#pdf-qr img') as HTMLImageElement | null;
      if (qrImg && !qrImg.complete) {
        await new Promise<void>((resolve) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = () => resolve();
        });
      }
      // Small extra delay to ensure canvas/SVG render
      await new Promise(resolve => setTimeout(resolve, 200));

  // Update on-screen timestamp only
  const now = new Date();
  setGeneratedAt(now);

  const canvas = await html2canvas(content, { 
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: false,
        width: content.scrollWidth,
        height: content.scrollHeight
      });
      
  const imgData = canvas.toDataURL('image/png', 1.0);
      
      const { jsPDF } = jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const aspectRatio = canvas.height / canvas.width;
      let finalWidth = pdfWidth - 20;
      let finalHeight = finalWidth * aspectRatio;
      
      if (finalHeight > pdfHeight - 20) {
        finalHeight = pdfHeight - 20;
        finalWidth = finalHeight / aspectRatio;
      }
      
      const x = (pdfWidth - finalWidth) / 2;
      const y = 10;
      
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

      // Helper: fetch and rasterize logo to PNG for safe embedding into PDF
      const getLogoPngDataUrl = async (targetWidthPx: number, targetHeightPx: number): Promise<string | null> => {
        const tryFetch = async (url: string): Promise<string | null> => {
          try {
            const res = await fetch(url, { mode: url.startsWith('/') ? 'same-origin' : 'cors' });
            if (!res.ok) return null;
            const blob = await res.blob();
            const base64Url: string = await new Promise((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve(fr.result as string);
              fr.onerror = reject;
              fr.readAsDataURL(blob);
            });
            const isSvg = base64Url.startsWith('data:image/svg');
            if (!isSvg) return base64Url; // already PNG/JPEG
            // Rasterize SVG to PNG at desired pixel size
            return await new Promise<string>((resolve) => {
              const img = new Image();
              img.onload = () => {
                const w = Math.max(1, Math.round(targetWidthPx || 160));
                const h = Math.max(1, Math.round(targetHeightPx || 80));
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                const ctx = c.getContext('2d');
                if (ctx) {
                  ctx.clearRect(0, 0, w, h);
                  // optional white bg
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, w, h);
                  ctx.drawImage(img, 0, 0, w, h);
                  resolve(c.toDataURL('image/png'));
                } else {
                  resolve(base64Url);
                }
              };
              img.onerror = () => resolve(base64Url);
              img.src = base64Url;
            });
          } catch { return null; }
        };
        return (
          (await tryFetch(ministryLogoLocalPng)) ||
          (await tryFetch(ministryLogoLocalSvg)) ||
          (await tryFetch(ministryLogoRemote))
        );
      };

      // Build QR as data URL and overlay it directly on PDF at the #pdf-qr spot
      const buildQRDataUrl = async (text: string, size = 160): Promise<string | null> => {
        try {
          if (typeof QRCode !== 'undefined') {
            const tmpDiv = document.createElement('div');
            new QRCode(tmpDiv, { text, width: size, height: size, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
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
            // convert to PNG
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

      const qrEl = document.getElementById('pdf-qr');
      if (qrEl && ticket?.id) {
        const trackingUrl = `${window.location.origin}/#/track?id=${ticket.id}`;
        const qrDataUrl = await buildQRDataUrl(trackingUrl, 160);
        if (qrDataUrl) {
          const elRect = qrEl.getBoundingClientRect();
          const contentRect = content.getBoundingClientRect();
          const offsetXPx = elRect.left - contentRect.left;
          const offsetYPx = elRect.top - contentRect.top;
          const widthPx = elRect.width;
          const heightPx = elRect.height;
          const scaleFactor = canvas.width / content.scrollWidth; // equals html2canvas scale (2)
          const mmPerCanvasPx = finalWidth / canvas.width;
          const qrXmm = x + (offsetXPx * scaleFactor) * mmPerCanvasPx;
          const qrYmm = y + (offsetYPx * scaleFactor) * mmPerCanvasPx;
          const qrWmm = Math.max(25, (widthPx * scaleFactor) * mmPerCanvasPx);
          const qrHmm = Math.max(25, (heightPx * scaleFactor) * mmPerCanvasPx);
          try {
            pdf.addImage(qrDataUrl, 'PNG', qrXmm, qrYmm, qrWmm, qrHmm);
          } catch (e) {
            // conservative fallback size
            pdf.addImage(qrDataUrl, 'PNG', qrXmm, qrYmm, 35, 35);
          }
        }
      }

      // Overlay the ministry logo explicitly to ensure it's embedded in the PDF
      try {
        const headerImgEl = content.querySelector('#ministry-logo') as HTMLImageElement | null;
        if (headerImgEl) {
          const elRect = headerImgEl.getBoundingClientRect();
          const contentRect = content.getBoundingClientRect();
          const offsetXPx = elRect.left - contentRect.left;
          const offsetYPx = elRect.top - contentRect.top;
          const widthPx = elRect.width;
          const heightPx = elRect.height;
          const scaleFactor = canvas.width / content.scrollWidth; // html2canvas scale
          const mmPerCanvasPx = finalWidth / canvas.width;
          const logoXmm = x + (offsetXPx * scaleFactor) * mmPerCanvasPx;
          const logoYmm = y + (offsetYPx * scaleFactor) * mmPerCanvasPx;
          const logoWmm = Math.max(20, (widthPx * scaleFactor) * mmPerCanvasPx);
          const logoHmm = Math.max(20, (heightPx * scaleFactor) * mmPerCanvasPx);
          const logoDataUrl = await getLogoPngDataUrl(widthPx * scaleFactor, heightPx * scaleFactor);
          if (logoDataUrl) {
            pdf.addImage(logoDataUrl, 'PNG', logoXmm, logoYmm, logoWmm, logoHmm);
          }
        }
      } catch {}
      
      pdf.setProperties({
        title: `إيصال طلب رقم ${ticket?.id || 'غير محدد'}`,
        subject: 'إيصال تقديم طلب - مديريــة الماليــة - محافظــة حلــب',
        author: 'مديريــة الماليــة - محافظــة حلــب',
        keywords: 'طلب، استعلام، شكوى، مالية، حلب',
        creator: 'نظام الاستعلامات والشكاوى'
      });      
      pdf.save(`receipt-${ticket?.id || 'unknown'}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.");
    }
  };

  const handlePreviewPdf = async () => {
    const content = pdfContentRef.current;
    if (!content || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
      console.error("PDF generation libraries not loaded or content not found.");
      return;
    }
    try {
      // Ensure web fonts are loaded to render Arabic shaping correctly (preview)
      try {
        if ((document as any).fonts && typeof (document as any).fonts.ready?.then === 'function') {
          const fontReady = (document as any).fonts.ready as Promise<void>;
          await Promise.race([
            fontReady,
            new Promise((resolve) => setTimeout(resolve, 800))
          ]);
        }
      } catch {}
      const pdfBarcodeCanvas = document.getElementById('pdf-barcode') as HTMLCanvasElement;
      if (pdfBarcodeCanvas && ticket?.id) {
        JsBarcode(pdfBarcodeCanvas, ticket.id, {
          format: "CODE128",
          lineColor: "#000000",
          width: 2.5,
          height: 80,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: "#ffffff"
        });
      }

      if (ticket?.id && (typeof QRCode !== 'undefined' || typeof window !== 'undefined')) {
        const pdfQrContainer = document.getElementById('pdf-qr');
        if (pdfQrContainer) {
          pdfQrContainer.innerHTML = '';
          const trackingUrl = `${window.location.origin}/#/track?id=${ticket.id}`;
          let appended = false;
          try {
            if (typeof QRCode !== 'undefined') {
              const tmpDiv = document.createElement('div');
              new QRCode(tmpDiv, {
                text: trackingUrl,
                width: 160,
                height: 160,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M,
              });
              const qrCanvas = tmpDiv.querySelector('canvas') as HTMLCanvasElement | null;
              const qrImgTag = tmpDiv.querySelector('img') as HTMLImageElement | null;
              const qrTable = tmpDiv.querySelector('table') as HTMLTableElement | null;
              if (qrCanvas) {
                const img = document.createElement('img');
                img.src = qrCanvas.toDataURL('image/png');
                img.width = 160;
                img.height = 160;
                img.style.display = 'block';
                pdfQrContainer.appendChild(img);
                appended = true;
              } else if (qrImgTag) {
                qrImgTag.width = 160;
                qrImgTag.height = 160;
                qrImgTag.style.display = 'block';
                pdfQrContainer.appendChild(qrImgTag);
                appended = true;
              } else if (qrTable) {
                pdfQrContainer.appendChild(qrTable);
                appended = true;
              }
            }
          } catch {}
          if (!appended) {
            try {
              const qrcodeFactory = (window as any).qrcode;
              if (qrcodeFactory) {
                const qr = qrcodeFactory(4, 'M');
                qr.addData(trackingUrl);
                qr.make();
                const dataUrl = qr.createDataURL(8, 0);
                const img = document.createElement('img');
                img.src = dataUrl;
                img.width = 160;
                img.height = 160;
                pdfQrContainer.appendChild(img);
                appended = true;
              }
            } catch {}
          }
        }
      }

      const qrImg = document.querySelector('#pdf-qr img') as HTMLImageElement | null;
      if (qrImg && !qrImg.complete) {
        await new Promise<void>((resolve) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = () => resolve();
        });
      }
      await new Promise(resolve => setTimeout(resolve, 200));

  // Update on-screen timestamp only
  const now = new Date();
  setGeneratedAt(now);

  const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: false,
        width: content.scrollWidth,
        height: content.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const { jsPDF } = jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const aspectRatio = canvas.height / canvas.width;
      let finalWidth = pdfWidth - 20;
      let finalHeight = finalWidth * aspectRatio;
      if (finalHeight > pdfHeight - 20) {
        finalHeight = pdfHeight - 20;
        finalWidth = finalHeight / aspectRatio;
      }
      const x = (pdfWidth - finalWidth) / 2;
      const y = 10;
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

      const getLogoPngDataUrl = async (targetWidthPx: number, targetHeightPx: number): Promise<string | null> => {
        const tryFetch = async (url: string): Promise<string | null> => {
          try {
            const res = await fetch(url, { mode: url.startsWith('/') ? 'same-origin' : 'cors' });
            if (!res.ok) return null;
            const blob = await res.blob();
            const base64Url: string = await new Promise((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve(fr.result as string);
              fr.onerror = reject;
              fr.readAsDataURL(blob);
            });
            const isSvg = base64Url.startsWith('data:image/svg');
            if (!isSvg) return base64Url;
            return await new Promise<string>((resolve) => {
              const img = new Image();
              img.onload = () => {
                const w = Math.max(1, Math.round(targetWidthPx || 160));
                const h = Math.max(1, Math.round(targetHeightPx || 80));
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                const ctx = c.getContext('2d');
                if (ctx) {
                  ctx.clearRect(0, 0, w, h);
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, w, h);
                  ctx.drawImage(img, 0, 0, w, h);
                  resolve(c.toDataURL('image/png'));
                } else {
                  resolve(base64Url);
                }
              };
              img.onerror = () => resolve(base64Url);
              img.src = base64Url;
            });
          } catch { return null; }
        };
        return (
          (await tryFetch(ministryLogoLocalPng)) ||
          (await tryFetch(ministryLogoLocalSvg)) ||
          (await tryFetch(ministryLogoRemote))
        );
      };

      // Overlay QR directly as in download
      const buildQRDataUrl = async (text: string, size = 160): Promise<string | null> => {
        try {
          if (typeof QRCode !== 'undefined') {
            const tmpDiv = document.createElement('div');
            new QRCode(tmpDiv, { text, width: size, height: size, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
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

      const qrEl = document.getElementById('pdf-qr');
      if (qrEl && ticket?.id) {
        const trackingUrl = `${window.location.origin}/#/track?id=${ticket.id}`;
        const qrDataUrl = await buildQRDataUrl(trackingUrl, 160);
        if (qrDataUrl) {
          const elRect = qrEl.getBoundingClientRect();
          const contentRect = content.getBoundingClientRect();
          const offsetXPx = elRect.left - contentRect.left;
          const offsetYPx = elRect.top - contentRect.top;
          const widthPx = elRect.width;
          const heightPx = elRect.height;
          const scaleFactor = canvas.width / content.scrollWidth;
          const mmPerCanvasPx = finalWidth / canvas.width;
          const qrXmm = x + (offsetXPx * scaleFactor) * mmPerCanvasPx;
          const qrYmm = y + (offsetYPx * scaleFactor) * mmPerCanvasPx;
          const qrWmm = Math.max(25, (widthPx * scaleFactor) * mmPerCanvasPx);
          const qrHmm = Math.max(25, (heightPx * scaleFactor) * mmPerCanvasPx);
          try {
            pdf.addImage(qrDataUrl, 'PNG', qrXmm, qrYmm, qrWmm, qrHmm);
          } catch (e) {
            pdf.addImage(qrDataUrl, 'PNG', qrXmm, qrYmm, 35, 35);
          }
        }
      }

      // Overlay the ministry logo in preview as well
      try {
        const headerImgEl = content.querySelector('#ministry-logo') as HTMLImageElement | null;
        if (headerImgEl) {
          const elRect = headerImgEl.getBoundingClientRect();
          const contentRect = content.getBoundingClientRect();
          const offsetXPx = elRect.left - contentRect.left;
          const offsetYPx = elRect.top - contentRect.top;
          const widthPx = elRect.width;
          const heightPx = elRect.height;
          const scaleFactor = canvas.width / content.scrollWidth;
          const mmPerCanvasPx = finalWidth / canvas.width;
          const logoXmm = x + (offsetXPx * scaleFactor) * mmPerCanvasPx;
          const logoYmm = y + (offsetYPx * scaleFactor) * mmPerCanvasPx;
          const logoWmm = Math.max(20, (widthPx * scaleFactor) * mmPerCanvasPx);
          const logoHmm = Math.max(20, (heightPx * scaleFactor) * mmPerCanvasPx);
          const logoDataUrl = await getLogoPngDataUrl(widthPx * scaleFactor, heightPx * scaleFactor);
          if (logoDataUrl) {
            pdf.addImage(logoDataUrl, 'PNG', logoXmm, logoYmm, logoWmm, logoHmm);
          }
        }
      } catch {}

      pdf.setProperties({
        title: `إيصال طلب رقم ${ticket?.id || 'غير محدد'}`,
        subject: 'إيصال تقديم طلب - مديريــة الماليــة - محافظــة حلــب',
        author: 'مديريــة الماليــة - محافظــة حلــب',
        keywords: 'طلب، استعلام، شكوى، مالية، حلب',
        creator: 'نظام الاستعلامات والشكاوى'
      });

      try {
        const blobUrl = pdf.output('bloburl');
        const win = window.open(blobUrl, '_blank');
        if (!win) throw new Error('Popup blocked');
      } catch (e) {
        try {
          pdf.output('dataurlnewwindow');
        } catch {
          pdf.save(`receipt-${ticket?.id || 'unknown'}.pdf`);
        }
      }
    } catch (error) {
      console.error('Error previewing PDF:', error);
      alert('حدث خطأ أثناء معاينة ملف PDF. يرجى المحاولة مرة أخرى.');
    }
  };

  if (!ticket) {
    return (
      <Card className="text-center">
        <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">لم يتم العثور على طلب</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          لرؤية كود التتبع، يجب تقديم طلب جديد أولاً من خلال صفحة "تقديم طلب جديد".
        </p>
        <div className="space-y-2">
          <Button onClick={() => window.location.hash = '#/submit'}>تقديم طلب جديد</Button>
          <Button variant="secondary" onClick={() => window.location.hash = '#/'}>العودة للرئيسية</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="min-h-screen" style={{ 
      background: 'url("https://syrian.zone/syid/materials/bg.svg") center/cover',
      backdropFilter: 'blur(0.5px)'
    }}>
      <div className="container mx-auto px-4 py-12">
        <Card className="text-center relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-0 shadow-2xl">
        {/* خلفية ديكورية محسنة */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 via-blue-50/20 to-emerald-50/30 dark:from-green-900/10 dark:via-blue-900/5 dark:to-emerald-900/10"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        
        <div className="relative z-10 p-8">
          {/* شعار النظام */}
          <div className="mb-8">
            <img 
              src="https://syrian.zone/syid/materials/logo.ai.svg" 
              alt="شعار الجمهورية العربية السورية" 
              className="w-20 h-20 mx-auto opacity-90 hover:opacity-100 transition-opacity duration-300"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.src = '/logo.ai.svg';
              }}
            />
          </div>

          {/* أيقونة النجاح المحسنة */}
          <div className="mx-auto mb-8 w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-xl animate-bounce-slow">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* العنوان والرسالة المحسنة */}
          <div className="mb-12 animate-fade-in">
            <h1 className="text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              ✨ تم استلام طلبك بنجاح ✨
            </h1>
            <div className="max-w-2xl mx-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              <p className="text-xl text-gray-800 dark:text-gray-200 font-semibold mb-3">
                🎉 تهانينا! تم تسجيل طلبك بنجاح في نظام مديرية مالية حلب
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                سيتم مراجعة طلبك من قبل الفريق المختص وستتلقى ردّاً خلال أقرب وقت ممكن. 
                يرجى الاحتفاظ برقم التتبع التالي لمتابعة حالة طلبك.
              </p>
            </div>
          </div>
        </div>

        {/* لوحة رقم التتبع المحدثة بتصميم عصري */}
        <div className="relative overflow-hidden bg-gradient-to-bl from-slate-900 via-slate-800 to-slate-700 p-8 rounded-3xl border border-slate-600/50 shadow-2xl my-6">
          {/* خلفية ديكورية */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 animate-gradient-x"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">رقم التتبع الخاص بك</h3>
              <p className="text-slate-300 text-sm">احتفظ بهذا الرقم لمتابعة حالة طلبك</p>
            </div>

            {/* رقم التتبع مع تأثير بصري متقدم */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 mb-6 shadow-xl">
              <div className="text-center">
                <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">TRACKING ID</div>
                <div className="font-mono text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent leading-tight tracking-wider">
                  {ticket?.id || 'خطأ في توليد الرقم'}
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full mt-4 opacity-60"></div>
              </div>
            </div>

            {/* الباركود المحدث */}
            <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-slate-200">
              <canvas id="main-barcode" className="max-w-full max-h-[90px] mx-auto"></canvas>
            </div>

            {/* أزرار الإجراءات السريعة المحسنة */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button 
                onClick={handleCopyTrackingLink}
                className="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 shadow-md"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                نسخ رقم التتبع
              </button>
              <button 
                onClick={() => window.location.hash = `#/track?id=${ticket?.id}`}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 shadow-lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                تتبع الطلب الآن
              </button>
            </div>
          </div>
        </div>

        {/* معلومات إضافية منظمة */}
        <div className="bg-gradient-to-r from-gray-50/80 to-white/80 dark:from-gray-800/80 dark:to-gray-700/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {/* القسم المختص */}
            <div className="space-y-2">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-800 dark:text-gray-200">القسم المختص</h4>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {ticket?.department || 'غير محدد'}
              </p>
            </div>

            {/* تاريخ الإرسال */}
            <div className="space-y-2">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-800 dark:text-gray-200">تاريخ الإرسال</h4>
              <p className="text-gray-600 dark:text-gray-400 font-medium text-sm">
                {ticket?.submittedAt ? new Date(ticket.submittedAt).toLocaleString('ar-SY', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'غير متوفر'}
              </p>
            </div>

            {/* حالة الطلب */}
            <div className="space-y-2">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-800 dark:text-gray-200">حالة الطلب</h4>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                مستلم بنجاح
              </span>
            </div>
          </div>
        </div>
          {ticket?.attachments?.length ? (
            <span>
              تم إرفاق ملف: <span className="text-slate-100 font-medium">{ticket.attachments[0].name}</span>
              {ticket.attachments.length > 1 && <span className="text-slate-400"> (+{ticket.attachments.length - 1} ملفات)</span>}
      <button onClick={handleOpenFirstAttachment} className="text-blue-400 hover:text-blue-300 underline ml-2">(عرض المرفق)</button>
            </span>
          ) : (
            <span className="text-slate-400">لا توجد مرفقات</span>
          )}
        </div>

        {/* أزرار الإجراءات الرئيسية المحدثة */}
        <div className="mt-8 space-y-6">
          {/* اختيار القالب المعتمد */}
          {availableTemplates.length > 0 && (
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-2xl border border-gray-200 dark:border-gray-600">
                <label className="block text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                  <svg className="w-6 h-6 inline-block mr-2 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  اختيار قالب الإيصال
                </label>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  {availableTemplates.map(template => (
                    <option key={template.id} value={template.name}>
                      {template.name} {template.approvedBy ? `(معتمد بواسطة: ${template.approvedBy})` : '(معتمد)'}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
          
          {/* مجموعة الأزرار */}
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hasCustomTemplates() ? (
                <Button 
                  onClick={handleDownloadTemplatedPdf}
                  className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  إيصال PDF معتمد
                </Button>
              ) : (
                <Button 
                  onClick={handleDownloadPdf}
                  className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  تنزيل إيصال PDF
                </Button>
              )}

              <Button 
                onClick={handlePreviewPdf} 
                className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                معاينة PDF
              </Button>

              {hasCustomTemplates() && (
                <Button 
                  onClick={handleDownloadPdf} 
                  className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  إيصال PDF تقليدي
                </Button>
              )}

              <Button 
                onClick={() => window.location.hash = '#/'} 
                className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                العودة للرئيسية
              </Button>
            </div>
          </div>
        </div>

        {/* فاصل */}
        <hr className="my-6 border-slate-700" />

        {/* QR والأدوات المحدثة بتصميم عصري */}
        <div className="mt-8 relative">
          <div className="text-center mb-4">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">رمز QR للمتابعة السريعة</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">امسح الكود لفتح صفحة المتابعة مباشرة</p>
          </div>
          
          <div className="max-w-sm mx-auto">
            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 p-6 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-600">
              <div className="bg-white rounded-2xl p-4 shadow-inner border-2 border-gray-100">
                <div id="main-qr" className="flex items-center justify-center"></div>
              </div>
              
              <div className="flex justify-center gap-2 mt-4">
                <button 
                  onClick={handleDownloadQr} 
                  className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  حفظ الكود
                </button>
                <button 
                  onClick={handleCopyTrackingLink} 
                  className="flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.102m-.758 4.899L7.343 16.657" />
                  </svg>
                  نسخ الرابط
                </button>
              </div>
            </div>
          </div>
          
          {trackingUrl && (
            <div className="mt-4 max-w-2xl mx-auto">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">رابط المتابعة:</div>
                <div className="text-sm text-gray-700 dark:text-gray-300 font-mono break-all bg-white dark:bg-gray-700 p-2 rounded-lg border">
                  {trackingUrl}
                </div>
              </div>
            </div>
          )}
          
          {generatedAt && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                آخر تحديث: {formatDateTime(generatedAt)}
              </div>
            </div>
          )}
        </div>

        {/* تفاصيل زمن متابعة الطلب المحدثة */}
        <div className="mt-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">معلومات التوقيت</h3>
            <p className="text-gray-600 dark:text-gray-400">تفاصيل زمنية مهمة لطلبك</p>
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 p-6 rounded-3xl border-2 border-blue-200 dark:border-blue-700/50 shadow-xl">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <div className="text-center">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">تاريخ ووقت التقديم</div>
                <div className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                  {formatDateTime(ticket?.submissionDate)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/30 px-3 py-1 rounded-full inline-block">
                  تم استلام الطلب بنجاح
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">الحالة الحالية:</span>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    جديد
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">القسم المختص:</span>
                  <span className="text-blue-800 dark:text-blue-200 font-medium">
                    {ticket?.department || 'غير محدد'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* أزرار الإجراءات الرئيسية المحسنة */}
        <div className="mt-8 space-y-6">
          {/* اختيار القالب المعتمد */}
          {availableTemplates.length > 0 && (
            <div className="max-w-md mx-auto">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                <label className="block text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                  <svg className="w-6 h-6 inline-block mr-2 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  اختيار قالب الإيصال
                </label>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  {availableTemplates.map(template => (
                    <option key={template.id} value={template.name}>
                      {template.name} {template.approvedBy ? `(معتمد بواسطة: ${template.approvedBy})` : '(معتمد)'}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
          
          {/* مجموعة الأزرار */}
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hasCustomTemplates() ? (
                <Button 
                  onClick={handleDownloadTemplatedPdf}
                  className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  إيصال PDF معتمد
                </Button>
              ) : (
                <Button 
                  onClick={handleDownloadPdf}
                  className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  تنزيل إيصال PDF
                </Button>
              )}
              
              <Button 
                onClick={() => window.location.hash = `#/track?id=${ticket?.id}`}
                className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                متابعة الطلب
              </Button>

              <Button 
                onClick={handleCopyTrackingLink}
                className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                نسخ رابط المتابعة
              </Button>

              <Button 
                onClick={() => window.location.hash = '#/'}
                className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                العودة للرئيسية
              </Button>
            </div>
          </div>

          {/* نصائح إضافية */}
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-yellow-50/80 to-amber-50/80 dark:from-yellow-900/20 dark:to-amber-900/20 backdrop-blur-sm p-6 rounded-2xl border border-yellow-200/50 dark:border-yellow-700/50 shadow-lg">
            <h4 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-4 text-center flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              نصائح مهمة
            </h4>
            <ul className="text-yellow-700 dark:text-yellow-300 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                احتفظ برقم التتبع في مكان آمن للمراجعة المستقبلية
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                يمكنك طباعة هذه الصفحة كإيصال للاحتفاظ
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                ستتلقى تحديثات عند تغيير حالة طلبك
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                في حالة وجود استفسارات، يرجى الاتصال بخدمة العملاء
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* معرض المرفقات الكامل */}
      {attGalleryOpen && ticket?.attachments && ticket.attachments.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/80" onClick={() => setAttGalleryOpen(false)}>
          <div className="relative w-screen h-screen" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const files = ticket.attachments!;
              const file = files[attIndex];
              const openInNewTab = () => {
                const url = URL.createObjectURL(file);
                const win = window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 5000);
                if (!win) alert('تعذر فتح الملف في تبويب جديد');
              };
              const downloadFile = () => {
                const url = URL.createObjectURL(file);
                const a = document.createElement('a');
                a.href = url; a.download = file.name;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 0);
              };
              return (
                <>
                  {/* شريط علوي شفاف */}
                  <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between text-white bg-transparent">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate" title={file.name}>{file.name}</h3>
                      <p className="text-xs opacity-80">ملف {attIndex + 1} من {files.length} • {readableSize(file.size)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={openInNewTab} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs">فتح</button>
                      <button onClick={downloadFile} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs">تنزيل</button>
                      <button
                        onClick={() => { if (attLoading && !attCanceled) { setAttCanceled(true); setAttLoading(false); } }}
                        title="إلغاء التحميل"
                        aria-label="إلغاء التحميل"
                        className={`w-8 h-8 rounded-full ${attLoading && !attCanceled ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50 cursor-not-allowed'} text-white`}
                        disabled={!attLoading || attCanceled}
                      >✕</button>
                    </div>
                  </div>

                  {/* أسهم جانبية */}
                  {files.length > 1 && (
                    <>
                      <button aria-label="السابق" disabled={attIndex === 0} onClick={() => setAttIndex(Math.max(0, attIndex - 1))} className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40">‹</button>
                      <button aria-label="التالي" disabled={attIndex === files.length - 1} onClick={() => setAttIndex(Math.min(files.length - 1, attIndex + 1))} className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40">›</button>
                    </>
                  )}

                  {/* المحتوى */}
                  <div className="h-full w-full flex items-center justify-center px-6 pt-16 pb-24">
                    {attCanceled ? (
                      <div className="text-center py-10 text-white/90">
                        <p>تم إلغاء التحميل.</p>
                      </div>
                    ) : file.type.startsWith('image/') ? (
                      attObjUrl ? (
                        <img src={attObjUrl} alt="معاينة" className="max-w-full max-h-full object-contain" onLoad={() => setAttLoading(false)} onError={() => setAttLoading(false)} />
                      ) : null
                    ) : file.type === 'application/pdf' ? (
                      attObjUrl ? (
                        <iframe src={attObjUrl} title="pdf" className="w-full h-full bg-white rounded" onLoad={() => setAttLoading(false)} />
                      ) : null
                    ) : (file.type.includes('wordprocessingml.document') || file.name.toLowerCase().endsWith('.docx')) ? (
                      <DocxPreview file={file} />
                    ) : (
                      <div className="text-center py-10 text-white/90">
                        <p>لا يمكن معاينة هذا النوع من الملفات.</p>
                        <button onClick={downloadFile} className="mt-4 inline-block px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">تنزيل الملف</button>
                      </div>
                    )}
                  </div>

                  {/* شريط سفلي شفاف */}
                  {files.length > 1 && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 overflow-x-auto bg-transparent">
                      <div className="flex gap-2 px-2">
                        {files.map((f, i) => (
                          <button key={i} onClick={() => setAttIndex(i)} title={f.name} className={`px-2 py-1 rounded text-xs whitespace-nowrap border ${i === attIndex ? 'bg-white/20 text-white border-white/50' : 'bg-transparent text-white/90 border-white/20 hover:bg-white/10'}`}>{f.name}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

  <div ref={pdfContentRef} style={{ position: 'absolute', left: '-9999px', width: '800px', direction: 'rtl', fontFamily: '"Noto Kufi Arabic", Amiri, Cairo, sans-serif', backgroundColor: 'white', zIndex: -1000 }}>
        <div style={{ padding: '40px', color: '#233', minHeight: '1000px', backgroundColor: '#ffffff' }}>
          {/* Header matching the provided style */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #0f3c35', paddingBottom: '20px', marginBottom: '28px' }}>
            {/* Text block on the right (RTL), logo to its right */}
            <div style={{textAlign: 'right'}}>
              <div style={{ fontSize: '28px', color: '#0f3c35', fontWeight: 800 }}>مديرية المالية - محافظة حلب</div>
              <div style={{ fontSize: '16px', color: '#475569', marginTop: '4px' }}>إيصال تقديم طلب</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>وزارة المالية - الجمهورية العربية السورية</div>
            </div>
            {/* Logo (also overlaid directly into the PDF later) */}
            <img
              id="ministry-logo"
              src={ministryLogoLocalPng}
              crossOrigin="anonymous"
              alt="شعار"
              style={{ height: '82px' }}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.dataset.triedRemote) {
                  img.dataset.triedRemote = '1';
                  img.src = ministryLogoLocalSvg;
                } else if (!img.dataset.triedRemote2) {
                  img.dataset.triedRemote2 = '1';
                  img.src = ministryLogoRemote;
                }
              }}
            />
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#0f3c35', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>تفاصيل الطلب</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
              <tbody>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#0f3c35', width: '30%' }}>الاسم الكامل</td>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333' }}>{ticket?.fullName || 'غير محدد'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#0f3c35' }}>رقم الهاتف</td>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333' }}>{ticket?.phone || 'غير محدد'}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#0f3c35' }}>البريد الإلكتروني</td>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333' }}>{ticket?.email || 'غير محدد'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#0f3c35' }}>نوع الطلب</td>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333' }}>{ticket?.requestType || 'غير محدد'}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#0f3c35' }}>القسم المعني</td>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333' }}>{ticket?.department || 'غير محدد'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#0f3c35' }}>تاريخ التقديم</td>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333' }}>{ticket?.submissionDate ? formatDateTime(ticket.submissionDate) : 'غير محدد'}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#0f3c35' }}>الحالة</td>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333' }}>جديد</td>
                </tr>
                <tr>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#0f3c35', verticalAlign: 'top' }}>تفاصيل الطلب</td>
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{ticket?.details || 'غير محدد'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '36px', textAlign: 'center', backgroundColor: '#f2f8f6', padding: '28px', borderRadius: '12px', border: '2px solid #0f3c35' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f3c35', marginBottom: '18px' }}>معلومات متابعة الطلب</div>

            {/* Top row: barcode and QR at same level */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {/* QR card (left) */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ backgroundColor: '#ffffff', border: '2px dashed #0f3c35', borderRadius: '8px', padding: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 'fit-content', height: '184px' }}>
                  <div id="pdf-qr" style={{ width: '160px', height: '160px' }}></div>
                </div>
                <div style={{ fontSize: '12px', color: '#0f3c35', fontWeight: 700, marginTop: '6px' }}>رمز QR لفتح صفحة المتابعة</div>
              </div>
              {/* Barcode card (right) */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ backgroundColor: '#ffffff', border: '2px solid #0f3c35', borderRadius: '8px', padding: '12px', minWidth: '320px', height: '184px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <canvas id="pdf-barcode" style={{ maxWidth: '320px', maxHeight: '110px', display: 'block' }}></canvas>
                </div>
                <div style={{ fontSize: '12px', color: '#0f3c35', fontWeight: 700, marginTop: '6px' }}>باركود قابل للمسح والتتبع</div>
              </div>
            </div>

            {/* Bottom centered: tracking number dashed box */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '8px', border: '2px dashed #0f3c35', minHeight: '110px', minWidth: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#0f3c35', marginBottom: '8px' }}>رقم التتبع الخاص بك:</div>
                  <div style={{ fontSize: '28px', fontFamily: 'monospace', color: '#d63384', fontWeight: 700, letterSpacing: '2px' }}>{ticket?.id || 'خطأ في توليد الرقم'}</div>
                </div>
              </div>
            </div>
          </div>
            {/* تفاصيل زمن متابعة الطلب */}
            <div style={{ marginTop: '10px', textAlign: 'right' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '12px', color: '#0f3c35', borderBottom: '2px solid #e0e0e0', paddingBottom: '8px' }}>تفاصيل زمن متابعة الطلب</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px', borderRadius: '8px', overflow: 'hidden' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#0f3c35', width: '30%', background: '#f8f9fa' }}>التقديم</td>
                    <td style={{ padding: '12px', border: '1px solid #e0e0e0', color: '#333' }}>{ticket?.submissionDate ? formatDateTime(ticket.submissionDate) : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div style={{ backgroundColor: '#e8f5e8', padding: '20px', borderRadius: '8px', textAlign: 'right' }}>
              <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f3c35', marginBottom: '15px', textAlign: 'center' }}>طرق المتابعة:</h4>
              <div style={{ fontSize: '14px', color: '#2d5a2d', lineHeight: '1.8' }}>
                <p style={{ margin: '8px 0' }}>🌐 <strong>عبر الموقع:</strong> {window.location.origin}/#/track</p>
                <p style={{ margin: '8px 0' }}>🔍 <strong>استخدم رقم التتبع:</strong> أدخل الرقم في صفحة المتابعة</p>
                <p style={{ margin: '8px 0' }}>📱 <strong>عبر الهاتف:</strong> XXXXXXX-021</p>
                <p style={{ margin: '8px 0' }}>📧 <strong>عبر البريد:</strong> info@aleppo-finance.gov.sy</p>
                <p style={{ margin: '8px 0' }}>🏢 <strong>زيارة شخصية:</strong> مبنى المديرية - شارع الملك فيصل</p>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default ConfirmationPage;