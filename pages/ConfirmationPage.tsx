import React, { useContext, useRef, useEffect, useState } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

declare const jspdf: any;
declare const html2canvas: any;
declare const JsBarcode: any;
declare const QRCode: any;

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

  const trackingUrl = ticket?.id ? `${window.location.origin}/#/track?id=${ticket.id}` : '';

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

  const handleDownloadPdf = async () => {
    const content = pdfContentRef.current;
    if (!content || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
      console.error("PDF generation libraries not loaded or content not found.");
      return;
    }

    try {
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
      const headerLogo = content.querySelector('img[src*="logo.ai.svg"]') as HTMLImageElement | null;
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
    <div>
      <Card className="text-center">
        <div className="mx-auto h-16 w-16 text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">تم استلام طلبك بنجاح!</h2>
        <p className="text-gray-400 mb-4">يرجى الاحتفاظ بالمعلومات التالية لمتابعة حالة طلبك:</p>

        {/* لوحة رقم التتبع والباركود */}
        <div className="bg-slate-800/40 p-6 rounded-lg border border-dashed border-slate-600 my-4 inline-block w-full">
          <p className="text-sm text-slate-300 mb-2">رقم التتبع</p>
          <div className="w-[360px] bg-white border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center mx-auto shadow-lg p-4">
            <canvas id="main-barcode" className="max-w-[320px] max-h-[90px]"></canvas>
          </div>
  </div>

  {/* ملخص المرفق */}
        <div className="text-sm text-slate-300 -mt-2 mb-2">
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

        {/* أزرار الإجراءات الرئيسية */}
        <div className="flex flex-wrap justify-center items-center gap-3 mt-4">
          <Button onClick={handleDownloadPdf}>
            تنزيل إيصال PDF
          </Button>
          <Button onClick={handlePreviewPdf} variant="secondary">
            معاينة PDF
          </Button>
          <Button onClick={() => window.location.hash = `#/track?id=${ticket?.id}` } variant="secondary">
            متابعة الطلب الآن
          </Button>
          <Button onClick={() => window.location.hash = '#/'} variant="secondary">العودة للرئيسية</Button>
        </div>

        {/* فاصل */}
        <hr className="my-6 border-slate-700" />

        {/* QR والأدوات */}
        <div className="mt-2">
          <div className="w-[180px] bg-white/95 border border-gray-300 rounded-lg mx-auto shadow p-3">
            <div id="main-qr" className="flex items-center justify-center"></div>
          </div>
          <div className="flex justify-center gap-3 mt-3">
            <button onClick={handleDownloadQr} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-100">تحميل</button>
            <button onClick={handleCopyTrackingLink} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-100">نسخ الرابط</button>
          </div>
          {trackingUrl && (
            <div className="mt-2 text-center">
              <span className="inline-block max-w-full truncate px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 border border-slate-700" title={trackingUrl}>{trackingUrl}</span>
            </div>
          )}
        </div>

  {/* أزلنا مجموعة الأزرار السفلية لأننا وفرناها بالأعلى */}
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

  <div ref={pdfContentRef} style={{ position: 'absolute', left: '-9999px', width: '800px', direction: 'rtl', fontFamily: 'Cairo, sans-serif', backgroundColor: 'white', zIndex: -1000 }}>
        <div style={{ padding: '40px', color: '#333', minHeight: '1000px', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0f3c35', paddingBottom: '25px', marginBottom: '30px' }}>
            <div style={{textAlign: 'right'}}>
              <h1 style={{ margin: '8px 0 0', fontSize: '28px', color: '#0f3c35', fontWeight: '600' }}>مديريــة الماليــة - محافظــة حلــب</h1>
              <p style={{ margin: '8px 0 0', fontSize: '18px', color: '#555', fontWeight: '600' }}>إيصال تقديم طلب</p>
              <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#777' }}>وزارة المالية - الجمهورية العربية السورية</p>
            </div>
            <img src="https://syrian.zone/syid/materials/logo.ai.svg" alt="شعار" style={{ height: '90px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
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
                  <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333' }}>{ticket?.submissionDate ? new Intl.DateTimeFormat('ar-SY-u-nu-latn', { dateStyle: 'medium' }).format(ticket.submissionDate) : 'غير محدد'}</td>
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

          <div style={{ marginTop: '50px', textAlign: 'center', backgroundColor: '#f8f9fa', padding: '30px', borderRadius: '12px', border: '2px solid #0f3c35' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f3c35', marginBottom: '25px' }}>معلومات متابعة الطلب</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '30px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', border: '2px solid #0f3c35', borderRadius: '8px', padding: '15px', margin: '0 auto', minHeight: '120px', minWidth: '300px' }}>
                  <canvas 
                    id="pdf-barcode"
                    style={{ maxWidth: '300px', maxHeight: '120px', display: 'block' }}
                  ></canvas>
                </div>
                <p style={{ fontSize: '12px', color: '#0f3c35', margin: '8px 0 0 0', fontWeight: 'bold' }}>باركود قابل للمسح والتتبع</p>
                <div style={{ backgroundColor: '#ffffff', border: '2px dashed #0f3c35', borderRadius: '8px', padding: '10px', marginTop: '12px', display: 'inline-block' }}>
                  <div id="pdf-qr" style={{ width: '160px', height: '160px' }}></div>
                </div>
                <p style={{ fontSize: '12px', color: '#0f3c35', margin: '8px 0 0 0', fontWeight: 'bold' }}>رمز QR لفتح صفحة المتابعة</p>
              </div>
              
              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '2px dashed #0f3c35', minWidth: '300px' }}>
                <p style={{ fontSize: '16px', color: '#0f3c35', margin: '0 0 10px 0', fontWeight: 'bold' }}>رقم التتبع الخاص بك:</p>
                <p style={{ fontSize: '28px', fontFamily: 'monospace', color: '#d63384', fontWeight: 'bold', letterSpacing: '2px', margin: '10px 0', textAlign: 'center' }}>{ticket?.id || 'خطأ في توليد الرقم'}</p>
              </div>
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
    </div>
  );
};

export default ConfirmationPage;