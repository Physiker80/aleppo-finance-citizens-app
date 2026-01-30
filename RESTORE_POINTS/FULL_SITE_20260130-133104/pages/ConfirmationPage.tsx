import React, { useContext, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { generateArabicPDF, preloadArabicFonts } from '../utils/arabicPdfExporter';
import { EmojiRating } from '../components/UXEnhancements';

// Declare global variables for CDN libraries to satisfy TypeScript
declare const jspdf: any;
declare const html2canvas: any;
declare const JsBarcode: any;

const ConfirmationPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const { lastSubmittedId, findTicket } = appContext || {};
  const ticket = lastSubmittedId ? findTicket?.(lastSubmittedId) : undefined;
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const [emailStatus, setEmailStatus] = React.useState<'idle' | 'sending' | 'sent' | 'error' | 'disabled'>('idle');
  const [emailError, setEmailError] = React.useState<string>('');
  const [serviceRating, setServiceRating] = React.useState<number>(0);
  const [ratingSubmitted, setRatingSubmitted] = React.useState(false);
  const emailEnabled = (import.meta as any).env?.VITE_ENABLE_EMAIL !== 'false';
  // (تمت إزالة وظيفة PDF النصي حسب طلب المستخدم)

  // Debug logging
  console.log('ConfirmationPage Debug:', {
    lastSubmittedId,
    ticket,
    ticketId: ticket?.id,
    hasAppContext: !!appContext,
    hasFindTicket: !!findTicket
  });

  // Generate real barcode when ticket is available
  useEffect(() => {
    // Barcode removed - focusing on QR Code only
  }, [ticket?.id]);

  // Generate QR Code
  useEffect(() => {
    if (ticket?.id) {
      const generateQRCode = async (canvasId: string) => {
        try {
          const trackingUrl = `${window.location.origin}/#/track?id=${ticket.id}`;
          const qrCanvas = document.getElementById(canvasId) as HTMLCanvasElement;

          if (qrCanvas) {
            const ctx = qrCanvas.getContext('2d');
            if (ctx) {
              qrCanvas.width = 160;
              qrCanvas.height = 160;

              // Use external QR API with fallback
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(trackingUrl)}&color=000000&bgcolor=ffffff`;

              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                ctx.clearRect(0, 0, 160, 160);
                ctx.drawImage(img, 0, 0, 160, 160);
              };
              img.onerror = () => {
                // Fallback: create simple pattern-based QR
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, 160, 160);
                ctx.fillStyle = '#fff';
                ctx.fillRect(10, 10, 140, 140);
                ctx.fillStyle = '#000';

                // Create pattern based on ticket ID
                const id = ticket.id;
                for (let i = 0; i < 14; i++) {
                  for (let j = 0; j < 14; j++) {
                    const hash = (i * 14 + j + id.charCodeAt(0)) % 3;
                    if (hash === 0) {
                      ctx.fillRect(10 + i * 10, 10 + j * 10, 10, 10);
                    }
                  }
                }

                // Corner markers
                ctx.fillStyle = '#000';
                ctx.fillRect(20, 20, 30, 30);
                ctx.fillRect(110, 20, 30, 30);
                ctx.fillRect(20, 110, 30, 30);

                ctx.fillStyle = '#fff';
                ctx.fillRect(25, 25, 20, 20);
                ctx.fillRect(115, 25, 20, 20);
                ctx.fillRect(25, 115, 20, 20);
              };
              img.src = qrImageUrl;
            }
          }

        } catch (error) {
          console.error(`Error generating QR code for ${canvasId}:`, error);
        }
      };

      generateQRCode('qr-code-canvas');
      generateQRCode('qr-code-canvas-pdf');
    }
  }, [ticket?.id]);

  // Central email send function
  const generateReceiptImage = async (): Promise<string> => {
    await document.fonts.ready;
    if (!pdfContentRef.current || typeof html2canvas === 'undefined') throw new Error('html2canvas not available');
    const canvas = await html2canvas(pdfContentRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc: Document) => {
        clonedDoc.documentElement.classList.remove('dark');
        const style = clonedDoc.createElement('style');
        style.innerHTML = `*{font-family:Cairo,'Noto Kufi Arabic','Fustat',sans-serif!important}`;
        clonedDoc.head.appendChild(style);
        const rasterize = (selector: string, baseFontSize: number) => {
          const el = clonedDoc.querySelector(selector);
          if (!el) return;
          try {
            const text = el.textContent || '';
            const off = clonedDoc.createElement('canvas');
            const ctx = off.getContext('2d');
            if (ctx) {
              let fs = baseFontSize; ctx.font = `bold ${fs}px Cairo,'Noto Kufi Arabic',sans-serif`;
              let w = ctx.measureText(text).width; const maxW = 430;
              while (w > maxW && fs > 14) { fs -= 2; ctx.font = `bold ${fs}px Cairo,'Noto Kufi Arabic',sans-serif`; w = ctx.measureText(text).width; }
              off.width = Math.ceil(w) + 30; off.height = fs + 28; ctx.font = `bold ${fs}px Cairo,'Noto Kufi Arabic',sans-serif`; ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillText(text, off.width / 2, fs + 4);
              const img = clonedDoc.createElement('img'); img.src = off.toDataURL('image/png'); img.style.display = 'block'; img.style.margin = '0 auto'; el.replaceWith(img);
            }
          } catch { }
        };
        rasterize('[data-receipt-heading]', 26);
        rasterize('[data-receipt-subheading]', 20);
      }
    });
    return canvas.toDataURL('image/png');
  };

  const sendEmail = async () => {
    if (!ticket?.email) return;
    if (!emailEnabled) {
      setEmailStatus('disabled');
      return;
    }
    setEmailError('');
    setEmailStatus('sending');
    try {
      const imageData = await generateReceiptImage();
      const apiBase = (import.meta as any).env?.VITE_EMAIL_API_BASE || 'http://localhost:4000';
      const resp = await fetch(`${apiBase}/api/send-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ticket.email,
          subject: 'إيصال تقديم طلب',
          ticketId: ticket.id,
          body: `<p>مرحباً ${ticket.fullName || ''}</p><p>مرفق صورة عن إيصال تقديم طلبك برقم التتبع: <b>${ticket.id}</b>.</p><p>رابط المتابعة: ${window.location.origin}/#/track?id=${ticket.id}</p>`,
          imageData
        })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json.ok) {
        const detail = json?.error || resp.statusText || 'فشل غير معروف';
        setEmailError(`${detail}${json.code ? ' | code: ' + json.code : ''}${json.responseCode ? ' | smtp: ' + json.responseCode : ''}`);
        setEmailStatus('error');
        return;
      }
      setEmailStatus('sent');
    } catch (err: any) {
      console.error('Auto email send failed', err);
      setEmailError(err?.message || 'خطأ غير متوقع أثناء الإرسال');
      setEmailStatus('error');
    }
  };

  // Auto-trigger once
  useEffect(() => {
    if (emailStatus === 'idle' && ticket?.email) {
      sendEmail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, ticket?.email]);

  const handleDownloadPdf = async () => {
    if (!ticket?.id) {
      console.error("No ticket ID available.");
      alert("لا يوجد رقم تتبع متاح. يرجى المحاولة مرة أخرى.");
      return;
    }

    setIsGeneratingPdf(true);

    try {
      // استخدام المُصدّر الجديد مع دعم كامل للعربية
      await generateArabicPDF(
        {
          id: ticket.id,
          fullName: ticket.fullName,
          nationalId: ticket.nationalId,
          department: ticket.department,
          submissionDate: ticket.submissionDate,
          details: ticket.details,
          email: ticket.email,
          phone: ticket.phone
        },
        {
          filename: `receipt-${ticket.id}.pdf`
        }
      );
      console.log('Arabic PDF receipt created successfully.');

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdfFromPreview = async () => {
    if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined' || !pdfContentRef.current) {
      alert('المكتبات اللازمة لإنشاء PDF غير متوفرة. يرجى المحاولة مرة أخرى.');
      return;
    }

    setIsGeneratingPdf(true); // Start loading

    try {
      // Wait for fonts to be loaded
      await document.fonts.ready;
      console.log("Fonts are ready, proceeding with PDF generation.");

      const { jsPDF } = jspdf;
      const canvas = await html2canvas(pdfContentRef.current, {
        scale: 3, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Force light mode and robust Arabic font stack (avoid broken embedded Amiri)
          clonedDoc.documentElement.classList.remove('dark');
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { font-family: 'Cairo','Noto Kufi Arabic','Fustat',sans-serif !important; }
            body, html { background:#ffffff !important; direction:rtl; }
            [dir="rtl"] { direction:rtl !important; }
          `;
          clonedDoc.head.appendChild(style);
          const content = clonedDoc.querySelector('[data-receipt-root]');
          if (content) {
            (content as HTMLElement).setAttribute('dir', 'rtl');
            (content as HTMLElement).style.fontFamily = "Cairo, 'Noto Kufi Arabic','Fustat', sans-serif";
            (content as HTMLElement).style.backgroundColor = '#ffffff';
            (content as HTMLElement).style.color = '#111827';
          }

          // Rasterize heading separately to preserve Arabic joining (html2canvas issue workaround)
          const rasterize = (selector: string, baseFontSize: number) => {
            const el = clonedDoc.querySelector(selector);
            if (!el) return;
            try {
              const text = el.textContent || '';
              const offCanvas = clonedDoc.createElement('canvas');
              const ctx = offCanvas.getContext('2d');
              if (ctx) {
                let fontSize = baseFontSize;
                ctx.font = `bold ${fontSize}px Cairo, 'Noto Kufi Arabic', sans-serif`;
                const maxWidth = 440;
                let width = ctx.measureText(text).width;
                while (width > maxWidth && fontSize > 14) {
                  fontSize -= 2;
                  ctx.font = `bold ${fontSize}px Cairo, 'Noto Kufi Arabic', sans-serif`;
                  width = ctx.measureText(text).width;
                }
                offCanvas.width = Math.ceil(width) + 40;
                offCanvas.height = fontSize + 30;
                ctx.font = `bold ${fontSize}px Cairo, 'Noto Kufi Arabic', sans-serif`;
                ctx.fillStyle = '#111827';
                ctx.textAlign = 'center';
                ctx.direction = 'rtl';
                ctx.fillText(text, offCanvas.width / 2, fontSize + 6 - 4);
                const img = clonedDoc.createElement('img');
                img.src = offCanvas.toDataURL('image/png');
                img.style.display = 'block';
                img.style.margin = '0 auto';
                img.style.maxWidth = '100%';
                el.replaceWith(img);
              }
            } catch (e) {
              console.warn('Rasterization failed for', selector, e);
            }
          };

          rasterize('[data-receipt-heading]', 26);
          rasterize('[data-receipt-subheading]', 20);
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;

      let imgWidth = pdfWidth - 20; // with margin
      let imgHeight = imgWidth / ratio;

      if (imgHeight > pdfHeight - 20) {
        imgHeight = pdfHeight - 20;
        imgWidth = imgHeight * ratio;
      }

      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`receipt-preview-${ticket?.id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF from preview:", error);
      alert("حدث خطأ أثناء إنشاء ملف PDF من المعاينة.");
    } finally {
      setIsGeneratingPdf(false); // Stop loading
    }
  };

  // Download receipt area as PNG image (forced light mode + Arabic font enforcement)
  const handleDownloadAsImage = async () => {
    if (typeof html2canvas === 'undefined' || !pdfContentRef.current) {
      alert('المكتبة اللازمة غير متوفرة.');
      return;
    }
    setIsGeneratingImage(true);
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(pdfContentRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.classList.remove('dark');
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
              * { font-family: 'Cairo','Noto Kufi Arabic','Fustat',sans-serif !important; }
              body, html { background:#ffffff !important; direction:rtl; }
            `;
          clonedDoc.head.appendChild(style);
          const content = clonedDoc.querySelector('[data-receipt-root]');
          if (content) {
            (content as HTMLElement).setAttribute('dir', 'rtl');
            (content as HTMLElement).style.fontFamily = "Cairo, 'Noto Kufi Arabic','Fustat', sans-serif";
            (content as HTMLElement).style.backgroundColor = '#ffffff';
            (content as HTMLElement).style.color = '#111827';
          }

          // Rasterize heading for image export too
          const rasterize = (selector: string, baseFontSize: number) => {
            const el = clonedDoc.querySelector(selector);
            if (!el) return;
            try {
              const text = el.textContent || '';
              const offCanvas = clonedDoc.createElement('canvas');
              const ctx = offCanvas.getContext('2d');
              if (ctx) {
                let fontSize = baseFontSize;
                ctx.font = `bold ${fontSize}px Cairo, 'Noto Kufi Arabic', sans-serif`;
                const maxWidth = 440;
                let width = ctx.measureText(text).width;
                while (width > maxWidth && fontSize > 14) {
                  fontSize -= 2;
                  ctx.font = `bold ${fontSize}px Cairo, 'Noto Kufi Arabic', sans-serif`;
                  width = ctx.measureText(text).width;
                }
                offCanvas.width = Math.ceil(width) + 40;
                offCanvas.height = fontSize + 30;
                ctx.font = `bold ${fontSize}px Cairo, 'Noto Kufi Arabic', sans-serif`;
                ctx.fillStyle = '#111827';
                ctx.textAlign = 'center';
                ctx.direction = 'rtl';
                ctx.fillText(text, offCanvas.width / 2, fontSize + 6 - 4);
                const img = clonedDoc.createElement('img');
                img.src = offCanvas.toDataURL('image/png');
                img.style.display = 'block';
                img.style.margin = '0 auto';
                img.style.maxWidth = '100%';
                el.replaceWith(img);
              }
            } catch (e) {
              console.warn('Rasterization failed for', selector, e);
            }
          };

          rasterize('[data-receipt-heading]', 26);
          rasterize('[data-receipt-subheading]', 20);
        }
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `receipt-${ticket?.id}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error generating image:', e);
      alert('حدث خطأ أثناء إنشاء الصورة.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Helper function to wrap text for canvas
  const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const width = context.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine.trim());
        currentLine = word;
      }
    }
    lines.push(currentLine.trim());
    return lines;
  };

  if (!ticket) {
    console.log('No ticket found - Debug info:', { lastSubmittedId, appContext: !!appContext });
    return (
      <div className="min-h-screen bg-transparent p-4">
        <div className="max-w-2xl mx-auto">

          {/* Simple "No Ticket" Message */}
          <Card className="text-center border-t-4 border-amber-500 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
            <div className="text-amber-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              لم يتم العثور على طلب
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
              لرؤية رقم التتبع، يجب تقديم طلب جديد أولاً
            </p>

            {/* Simple Steps */}
            <div className="bg-blue-50/70 dark:bg-blue-900/30 p-6 rounded-lg mb-6 text-right backdrop-blur-sm">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">خطوات بسيطة:</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <span className="text-gray-700 dark:text-gray-300">اذهب إلى "تقديم طلب جديد"</span>
                </div>
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <span className="text-gray-700 dark:text-gray-300">املأ النموذج واضغط "إرسال"</span>
                </div>
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <span className="text-gray-700 dark:text-gray-300">ستحصل على رقم التتبع فوراً</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => window.location.hash = '#/submit'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
              >
                تقديم طلب جديد
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.hash = '#/'}
                className="w-full"
              >
                العودة للرئيسية
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-4">
      <div className="max-w-2xl mx-auto">

        {/* Success Header - Simple and Clear */}
        <Card className="text-center mb-6 border-t-4 border-green-500 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <div className="text-green-600 dark:text-green-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            تم استلام طلبك بنجاح
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            يمكنك متابعة حالة طلبك باستخدام المعلومات أدناه
          </p>
        </Card>

        {/* Tracking Information - Most Important */}
        <Card className="mb-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              معلومات التتبع
            </h2>

            {/* Tracking Number - Large and Prominent */}
            <div className="bg-blue-50/70 dark:bg-blue-900/30 p-6 rounded-lg mb-4 backdrop-blur-sm">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">رقم التتبع:</p>
              <p className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wider select-all">
                {ticket?.id}
              </p>
              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(ticket?.id || '');
                    alert('تم نسخ رقم التتبع');
                  }
                }}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
              >
                اضغط للنسخ
              </button>
            </div>

            {/* Enhanced QR Code Section */}
            <div className="mt-6">
              <div className="bg-gradient-to-br from-green-50/70 to-blue-50/70 dark:from-green-900/30 dark:to-blue-900/30 p-6 rounded-lg backdrop-blur-sm border-2 border-green-200/50 dark:border-green-600/50">
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-4 text-center">
                  QR Code للمتابعة السريعة
                </h3>

                <div className="flex justify-center mb-4">
                  <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-gray-200">
                    <canvas
                      id="qr-code-canvas"
                      className="w-40 h-40"
                    ></canvas>
                  </div>
                </div>

                <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
                  امسح هذا الكود بكاميرا الهاتف للانتقال المباشر لصفحة المتابعة
                </p>

                {/* Enhanced QR Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
                      if (canvas) {
                        canvas.toBlob((blob) => {
                          if (blob && navigator.clipboard && window.ClipboardItem) {
                            navigator.clipboard.write([
                              new ClipboardItem({ 'image/png': blob })
                            ]).then(() => {
                              alert('✅ تم نسخ QR Code للحافظة بنجاح!');
                            }).catch(() => {
                              // Fallback: download
                              const link = document.createElement('a');
                              link.download = `qr-tracking-${ticket?.id}.png`;
                              link.href = canvas.toDataURL();
                              link.click();
                              alert('📥 تم تحميل QR Code بنجاح!');
                            });
                          } else {
                            // Direct download fallback
                            const link = document.createElement('a');
                            link.download = `qr-tracking-${ticket?.id}.png`;
                            link.href = canvas.toDataURL();
                            link.click();
                            alert('📥 تم تحميل QR Code بنجاح!');
                          }
                        });
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 rtl:space-x-reverse"
                  >
                    <span className="font-semibold">تحميل QR</span>
                  </button>

                  <button
                    onClick={() => {
                      const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
                      if (canvas) {
                        canvas.toBlob((blob) => {
                          if (blob && navigator.clipboard && window.ClipboardItem) {
                            navigator.clipboard.write([
                              new ClipboardItem({ 'image/png': blob })
                            ]).then(() => {
                              alert('✅ تم نسخ QR Code للحافظة!');
                            });
                          } else {
                            alert('⚠️ المتصفح لا يدعم نسخ الصور. استخدم زر التحميل.');
                          }
                        });
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 rtl:space-x-reverse"
                  >
                    <span className="font-semibold">نسخ QR</span>
                  </button>
                </div>

                {/* QR Info */}
                <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                    💡 يحتوي QR Code على رابط مباشر لصفحة متابعة طلبك برقم: {ticket?.id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Request Preview Section */}
        <Card className="mb-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <div className="border-b border-gray-200 dark:border-gray-600 pb-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              معاينة الطلب المُرسل
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Personal Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm border-b border-purple-200 pb-1">المعلومات الشخصية</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">الاسم الكامل:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{ticket?.fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">رقم الهاتف:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{ticket?.phone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">البريد الإلكتروني:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 text-xs">{ticket?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">الرقم الوطني:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{ticket?.nationalId}</span>
                </div>
              </div>
            </div>

            {/* Request Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm border-b border-blue-200 pb-1">معلومات الطلب</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">نوع الطلب:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{ticket?.requestType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">القسم المختص:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{ticket?.department}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">الحالة:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    {ticket?.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">تاريخ الإرسال:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 text-xs">
                    {ticket?.submissionDate ? new Date(ticket.submissionDate).toLocaleString('ar-SY-u-nu-latn') : 'غير محدد'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="mb-4">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm border-b border-amber-200 pb-1 mb-3">تفاصيل الطلب</h3>
            <div className="bg-gray-50/70 dark:bg-gray-700/50 p-4 rounded-lg backdrop-blur-sm">
              <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                {ticket?.details || 'لا توجد تفاصيل إضافية'}
              </p>
            </div>
          </div>

          {/* Attachments if any */}
          {ticket?.attachments && ticket.attachments.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm border-b border-red-200 pb-1 mb-3">المرفقات</h3>
              <div className="space-y-2">
                {ticket.attachments.map((file, index) => (
                  <div key={index} className="flex items-center space-x-3 rtl:space-x-reverse bg-red-50/70 dark:bg-red-900/30 p-3 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB - {file.type || 'نوع غير محدد'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Receipt Preview Section */}
        <Card className="mb-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <div className="border-b border-gray-200 dark:border-gray-600 pb-3 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              تحميل الإيصال الرسمي
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">نموذج للإيصال كما سيظهر في الملف المُحمّل</p>
          </div>

          {/* Official Receipt Layout */}
          <div ref={pdfContentRef} data-receipt-root style={{ fontFamily: "'Cairo','Noto Kufi Arabic','Fustat', sans-serif" }} className="bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-500 rounded-lg p-6 mx-auto max-w-lg shadow-lg">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-800 dark:border-gray-300 pb-4 mb-6">
              <div className="flex items-center justify-center mb-2">
                <img src="/ministry-logo.svg" alt="شعار وزارة المالية" className="h-16 w-16" />
              </div>
              <h3 data-receipt-heading className="text-xl font-bold text-gray-800 dark:text-gray-100">مديرية مالية محافظة حلب</h3>
              <h4 data-receipt-subheading className="text-lg font-semibold text-gray-700 dark:text-gray-200 mt-1">إيصال تقديم طلب</h4>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                الجمهورية العربية السورية
              </div>
            </div>

            {/* Receipt Content */}
            <div className="space-y-4">
              {/* Tracking Number - Prominent */}
              <div className="text-center bg-blue-50/80 dark:bg-blue-900/30 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">رقم التتبع</div>
                <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                  {ticket?.id}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-right">
                  <span className="text-gray-600 dark:text-gray-400">الاسم:</span>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mt-1">{ticket?.fullName}</div>
                </div>
                <div className="text-right">
                  <span className="text-gray-600 dark:text-gray-400">التاريخ:</span>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mt-1">
                    {ticket?.submissionDate ? new Date(ticket.submissionDate).toLocaleDateString('ar-SY-u-nu-latn') : 'اليوم'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-gray-600 dark:text-gray-400">نوع الطلب:</span>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mt-1">{ticket?.requestType}</div>
                </div>
                <div className="text-right">
                  <span className="text-gray-600 dark:text-gray-400">القسم:</span>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mt-1">{ticket?.department}</div>
                </div>
              </div>

              {/* QR Code for PDF */}
              <div className="text-center py-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">امسح للمتابعة السريعة</div>
                <div className="flex justify-center">
                  <canvas id="qr-code-canvas-pdf" className="w-32 h-32 bg-white"></canvas>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>امسح الباركود أو استخدم رقم التتبع للمتابعة</div>
                  <div className="font-mono text-blue-600 dark:text-blue-400">
                    {window.location.origin}/#/track
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  وزارة المالية - مديرية مالية محافظة حلب
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  تم الإنشاء تلقائياً - {new Date().toLocaleDateString('ar-SY-u-nu-latn')}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Notes */}
          <div className="mt-4 p-3 bg-yellow-50/70 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-600">
            <div className="flex items-start space-x-2 rtl:space-x-reverse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <div className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">ملاحظات التحميل:</div>
                <ul className="text-yellow-700 dark:text-yellow-300 space-y-1 text-xs">
                  <li>• هذا نموذج للإيصال - الملف المُحمّل سيحتوي على باركود حقيقي</li>
                  <li>• الباركود القابل للمسح متوفر في ملف PDF المُحمّل</li>
                  <li>• احفظ رقم التتبع للمراجعة اللاحقة</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Simple Action Buttons */}
        <Card className="mb-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <div className="space-y-3">
            <Button
              onClick={() => window.location.hash = `#/track?id=${ticket?.id}`}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
            >
              متابعة الطلب الآن
            </Button>

            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={() => {
                  const trackingUrl = `${window.location.origin}/#/track?id=${ticket?.id}`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(trackingUrl);
                    alert('تم نسخ الرابط');
                  }
                }}
                variant="secondary"
                className="text-sm"
              >
                نسخ الرابط
              </Button>
              <Button
                onClick={handleDownloadAsImage}
                variant="secondary"
                className="text-sm"
                disabled={isGeneratingPdf || isGeneratingImage}
              >
                {isGeneratingImage ? 'جاري إنشاء الصورة...' : 'تحميل كصورة'}
              </Button>

              <Button
                onClick={handleDownloadPdfFromPreview}
                variant="secondary"
                className="text-sm"
                disabled={isGeneratingPdf || isGeneratingImage}
              >
                {isGeneratingPdf ? 'جاري التحضير...' : 'تحميل إيصال'}
              </Button>
            </div>
            {ticket?.email && (
              <div className="text-center mt-2 text-xs space-y-1">
                {emailStatus === 'disabled' && <span className="text-gray-500">تم تعطيل إرسال البريد في الإعدادات</span>}
                {emailStatus === 'sending' && <span className="text-gray-500">يتم إرسال الإيصال إلى بريدك...</span>}
                {emailStatus === 'sent' && <span className="text-green-600">تم إرسال نسخة من الإيصال إلى بريدك الإلكتروني</span>}
                {emailStatus === 'error' && (
                  <>
                    <span className="text-red-600 block">تعذر إرسال البريد تلقائياً</span>
                    {emailError && <span className="text-red-500 block ltr:text-left rtl:text-right break-all">{emailError}</span>}
                    <button
                      onClick={() => {
                        setEmailStatus('idle');
                        setTimeout(() => sendEmail(), 50);
                      }}
                      className="mt-1 inline-block bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                    >إعادة المحاولة</button>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Simple Instructions */}
        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">طرق المتابعة:</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-blue-500">•</span>
              <span>استخدم رقم التتبع في صفحة المتابعة</span>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-green-500">•</span>
              <span>امسح QR Code بكاميرا الهاتف للانتقال المباشر</span>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-emerald-500">•</span>
              <span>حمّل أو انسخ QR Code للاستخدام لاحقاً</span>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-purple-500">•</span>
              <span>راجع تفاصيل طلبك في قسم "معاينة الطلب" أعلاه</span>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-indigo-500">•</span>
              <span>اضغط على "متابعة الطلب الآن" للوصول المباشر</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            {/* قسم تقييم الخدمة */}
            <div className="mb-6 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700">
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-center">
                كيف كانت تجربتك في تقديم الطلب؟
              </h4>
              {!ratingSubmitted ? (
                <div className="text-center">
                  <EmojiRating
                    value={serviceRating}
                    onChange={(rating) => {
                      setServiceRating(rating);
                      // حفظ التقييم
                      try {
                        const ratings = JSON.parse(localStorage.getItem('serviceRatings') || '[]');
                        ratings.push({
                          ticketId: ticket?.id,
                          rating,
                          date: new Date().toISOString()
                        });
                        localStorage.setItem('serviceRatings', JSON.stringify(ratings));
                        setRatingSubmitted(true);
                      } catch (e) {
                        console.error('Error saving rating:', e);
                      }
                    }}
                    size="lg"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">اضغط على الوجه الذي يعبر عن رأيك</p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="text-3xl mb-2">🙏</div>
                  <p className="text-green-600 dark:text-green-400 font-medium">شكراً لتقييمك!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ملاحظاتك تساعدنا على تحسين خدماتنا</p>
                </div>
              )}
            </div>

            <Button
              onClick={() => window.location.hash = '#/'}
              variant="secondary"
              className="w-full"
            >
              العودة للرئيسية
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmationPage;
