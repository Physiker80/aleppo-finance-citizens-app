import React, { useContext, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// Declare global variables for CDN libraries to satisfy TypeScript
declare const jspdf: any;
declare const html2canvas: any;
declare const JsBarcode: any;

const ConfirmationPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const { lastSubmittedId, findTicket } = appContext || {};
  const ticket = lastSubmittedId ? findTicket?.(lastSubmittedId) : undefined;
  const pdfContentRef = useRef<HTMLDivElement>(null);

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
    if (ticket?.id && typeof JsBarcode !== 'undefined') {
      try {
        // Generate barcode for main display
        const mainBarcodeCanvas = document.getElementById('main-barcode') as HTMLCanvasElement;
        if (mainBarcodeCanvas) {
          JsBarcode(mainBarcodeCanvas, ticket.id, {
            format: "CODE128",
            lineColor: "#000",
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 12,
            margin: 10,
            background: "#ffffff"
          });
        }

        console.log('Real barcode generated successfully for:', ticket.id);
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [ticket?.id]);

  // Generate QR Code
  useEffect(() => {
    if (ticket?.id) {
      const generateQRCode = async () => {
        try {
          const trackingUrl = `${window.location.origin}/#/track?id=${ticket.id}`;
          const qrCanvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
          
          if (qrCanvas) {
            const ctx = qrCanvas.getContext('2d');
            if (ctx) {
              qrCanvas.width = 160;
              qrCanvas.height = 160;
              
              // Use QR.js API to generate real QR code
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(trackingUrl)}`;
              
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                ctx.clearRect(0, 0, 160, 160);
                ctx.drawImage(img, 0, 0, 160, 160);
              };
              img.onerror = () => {
                // Fallback: simple pattern
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, 160, 160);
                ctx.fillStyle = '#fff';
                ctx.fillRect(10, 10, 140, 140);
                ctx.fillStyle = '#000';
                
                // Create pattern based on ticket ID
                const id = ticket.id;
                for (let i = 0; i < 14; i++) {
                  for (let j = 0; j < 14; j++) {
                    const hash = (i * 14 + j + id.charCodeAt(0)) % 4;
                    if (hash === 0) {
                      ctx.fillRect(10 + i * 10, 10 + j * 10, 10, 10);
                    }
                  }
                }
                
                // Corner markers
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

          // Setup copy QR button
          const copyQRBtn = document.getElementById('copy-qr-btn');
          if (copyQRBtn) {
            copyQRBtn.onclick = async () => {
              try {
                if (qrCanvas) {
                  qrCanvas.toBlob(async (blob) => {
                    if (blob && navigator.clipboard && window.ClipboardItem) {
                      try {
                        await navigator.clipboard.write([
                          new ClipboardItem({ 'image/png': blob })
                        ]);
                        alert('✅ تم نسخ QR Code كصورة بنجاح!');
                      } catch {
                        // Fallback: download
                        const link = document.createElement('a');
                        link.download = `qr-code-${ticket.id}.png`;
                        link.href = qrCanvas.toDataURL();
                        link.click();
                        alert('� تم تحميل QR Code كصورة!');
                      }
                    } else {
                      // Fallback: download the image
                      const link = document.createElement('a');
                      link.download = `qr-code-${ticket.id}.png`;
                      link.href = qrCanvas.toDataURL();
                      link.click();
                      alert('📥 تم تحميل QR Code كصورة!');
                    }
                  }, 'image/png');
                }
              } catch (error) {
                console.error('Error copying QR code:', error);
                alert('⚠️ حدث خطأ في نسخ الصورة. جرب مرة أخرى.');
              }
            };
          }

        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      };

      generateQRCode();
    }
  }, [ticket?.id]);

  const handleDownloadPdf = async () => {
    if (typeof jspdf === 'undefined' || !ticket?.id) {
      console.error("PDF generation library not loaded or no ticket ID.");
      return;
    }

    try {
      // Create barcode canvas
      const barcodeCanvas = document.createElement('canvas');
      barcodeCanvas.width = 300;
      barcodeCanvas.height = 100;
      
      // Generate barcode
      JsBarcode(barcodeCanvas, ticket.id, {
        format: "CODE128",
        lineColor: "#000000",
        width: 2.5,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        background: "#ffffff"
      });
      
      const barcodeDataURL = barcodeCanvas.toDataURL('image/png', 1.0);
      
      // Create PDF with direct content
      const { jsPDF } = jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Add header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('مديرية مالية محافظة حلب', pageWidth - 20, 30, { align: 'right' });
      
      pdf.setFontSize(14);
      pdf.text('إيصال تقديم طلب', pageWidth - 20, 45, { align: 'right' });
      
      // Add ticket info
      pdf.setFontSize(16);
      pdf.text(`رقم التتبع: ${ticket.id}`, pageWidth - 20, 70, { align: 'right' });
      
      // Add barcode image
      pdf.addImage(barcodeDataURL, 'PNG', 50, 90, 110, 40);
      
      // Add instructions
      pdf.setFontSize(12);
      pdf.text('امسح الباركود أو استخدم رقم التتبع للمتابعة', pageWidth - 20, 140, { align: 'right' });
      pdf.text(`الموقع: ${window.location.origin}/#/track`, pageWidth - 20, 160, { align: 'right' });
      
      pdf.save(`receipt-${ticket.id}.pdf`);
      console.log('PDF with barcode created successfully');
      
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.");
    }
  };

  if (!ticket) {
    console.log('No ticket found - Debug info:', { lastSubmittedId, appContext: !!appContext });
    return (
        <Card className="text-center">
            <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">لم يتم العثور على طلب</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
                لرؤية كود التتبع، يجب تقديم طلب جديد أولاً من خلال صفحة "تقديم طلب جديد".
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">كيفية الحصول على كود التتبع:</h3>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 text-right">
                    <li>1. اذهب إلى صفحة "تقديم طلب جديد"</li>
                    <li>2. املأ النموذج بالمعلومات المطلوبة</li>
                    <li>3. اضغط على "إرسال الطلب"</li>
                    <li>4. ستظهر هذه الصفحة مع كود التتبع الخاص بك</li>
                </ol>
            </div>
            <div className="space-y-2">
              <Button onClick={() => window.location.hash = '#/submit'}>تقديم طلب جديد</Button>
              <Button variant="secondary" onClick={() => window.location.hash = '#/'}>العودة للرئيسية</Button>
            </div>
        </Card>
    );
  }

  return (
    <>
    {/* Syrian Government Theme Background */}
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-gray-900 to-black relative overflow-hidden">
      {/* Syrian Pattern Overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        {/* Official Syrian Government Card */}
        <div className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-t-8 border-red-600 animate-fade-in">
          
          {/* Official Header with Syrian Colors */}
          <div className="bg-gradient-to-r from-red-600 via-white to-black p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              {/* Syrian Eagle Emblem */}
              <div className="text-6xl text-yellow-500 drop-shadow-lg">🦅</div>
              
              {/* Official Title */}
              <div className="text-center flex-1 mx-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg mb-2">
                  الجمهورية العربية السورية
                </h1>
                <h2 className="text-lg md:text-xl font-semibold text-yellow-200">
                  مديرية المالية - محافظة حلب
                </h2>
                <div className="w-32 h-1 bg-yellow-400 mx-auto mt-2 rounded"></div>
              </div>
              
              {/* Syrian Flag Colors */}
              <div className="flex flex-col space-y-1">
                <div className="w-12 h-3 bg-red-600 rounded"></div>
                <div className="w-12 h-3 bg-white border border-gray-300 rounded"></div>
                <div className="w-12 h-3 bg-black rounded"></div>
              </div>
            </div>
          </div>

          {/* Success Status Section */}
          <div className="p-8 text-center bg-gradient-to-b from-green-50 to-white dark:from-green-900/20 dark:to-gray-800">
            {/* Success Icon with Syrian Style */}
            <div className="mx-auto w-28 h-28 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-yellow-400 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            {/* Official Success Message */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-700 via-emerald-600 to-green-800 bg-clip-text text-transparent">
              تم استلام طلبكم بنجاح
            </h1>
            <div className="w-24 h-1 bg-green-600 mx-auto mb-6 rounded"></div>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
              تم تسجيل طلبكم في النظام الإلكتروني لمديرية المالية
            </p>
          </div>
          {/* Official Document Section */}
          <div className="p-8 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700">
            
            {/* Document Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 text-white rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">إيصال رسمي</h2>
              <p className="text-gray-600 dark:text-gray-300">رقم الإيصال: {ticket?.id}</p>
            </div>

            {/* QR Code and Barcode in Official Layout */}
            <div className="grid lg:grid-cols-3 gap-8 mb-8">
              
              {/* QR Code Section with Official Style */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-4 border-red-100 dark:border-red-900">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-red-600 text-white rounded-full mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M12 12v4M12 16h.01" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-red-700 dark:text-red-400">رمز QR للمتابعة</h3>
                  </div>
                  <div id="qr-code-container" className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg border-2 border-dashed border-red-300 dark:border-red-600">
                    <canvas id="qr-canvas" className="w-full max-w-[160px] h-40 mx-auto bg-white rounded"></canvas>
                  </div>
                  <button 
                    id="copy-qr-btn"
                    className="w-full mt-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
                  >
                    📋 نسخ QR كصورة
                  </button>
                </div>
              </div>
              
              {/* Barcode Section with Official Style */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-4 border-green-100 dark:border-green-900">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-600 text-white rounded-full mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-green-700 dark:text-green-400">الباركود</h3>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg border-2 border-dashed border-green-300 dark:border-green-600">
                    <canvas 
                      id="main-barcode"
                      className="w-full max-h-[80px] mx-auto bg-white rounded"
                    ></canvas>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">باركود قابل للمسح</p>
                </div>
              </div>

              {/* Tracking Number Section with Official Style */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-4 border-yellow-100 dark:border-yellow-900">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-600 text-white rounded-full mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-yellow-700 dark:text-yellow-400">رقم التتبع</h3>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 p-4 rounded-lg border-2 border-dashed border-yellow-300 dark:border-yellow-600 text-center">
                    <p className="text-4xl font-mono font-bold text-red-600 dark:text-red-400 mb-2 select-all tracking-wider break-all">
                      {ticket?.id || 'خطأ في توليد الرقم'}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(ticket?.id || '');
                        alert('✅ تم نسخ رقم التتبع بنجاح!');
                      }
                    }}
                    className="w-full mt-4 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
                  >
                    📋 نسخ رقم التتبع
                  </button>
                </div>
              </div>
            </div>
            
            {/* Enhanced Tracking Number Display */}
            <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 mb-8 shadow-inner">
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">رقم التتبع الخاص بك:</p>
                <p className="text-5xl font-mono font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent tracking-wider mb-4 select-all">
                  {ticket?.id || 'خطأ في توليد الرقم'}
                </p>
                <button 
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(ticket?.id || '');
                      alert('تم نسخ رقم التتبع بنجاح!');
                    }
                  }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  📋 نسخ رقم التتبع
                </button>
            </div>
            
            {/* Action Buttons with modern design */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
                <button
                    onClick={() => window.location.hash = `#/track?id=${ticket?.id}`}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl font-semibold text-lg"
                >
                    � متابعة الطلب
                </button>
                <button
                    onClick={() => {
                        const trackingUrl = `${window.location.origin}/#/track?id=${ticket?.id}`;
                        if (navigator.clipboard && window.isSecureContext) {
                            navigator.clipboard.writeText(trackingUrl);
                            alert('تم نسخ رابط المتابعة بنجاح!');
                        } else {
                            const textArea = document.createElement('textarea');
                            textArea.value = trackingUrl;
                            document.body.appendChild(textArea);
                            textArea.select();
                            try {
                                document.execCommand('copy');
                                alert('تم نسخ رابط المتابعة بنجاح!');
                            } catch (err) {
                                console.error('Failed to copy: ', err);
                                alert('فشل في نسخ الرابط. يرجى نسخه يدوياً: ' + trackingUrl);
                            } finally {
                                document.body.removeChild(textArea);
                            }
                        }
                    }}
                    className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl font-semibold text-lg"
                >
                    🔗 نسخ رابط المتابعة
                </button>
            </div>
            
            {/* Enhanced Instructions */}
            <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-inner">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-4 text-xl flex items-center gap-2">
                    ✨ طرق المتابعة والاستعلام:
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                    <ul className="text-blue-700 dark:text-blue-300 space-y-3 text-right">
                        <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-all">
                            <span className="text-2xl">📱</span>
                            <span>امسح QR Code بكاميرا الهاتف</span>
                        </li>
                        <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-all">
                            <span className="text-2xl">🔍</span>
                            <span>استخدم رقم التتبع في صفحة المتابعة</span>
                        </li>
                        <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-all">
                            <span className="text-2xl">🚀</span>
                            <span>اضغط على "متابعة الطلب" للوصول المباشر</span>
                        </li>
                    </ul>
                    <ul className="text-blue-700 dark:text-blue-300 space-y-3 text-right">
                        <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-all">
                            <span className="text-2xl">📋</span>
                            <span>انسخ الرابط وشاركه أو احفظه</span>
                        </li>
                        <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-all">
                            <span className="text-2xl">🔐</span>
                            <span>احفظ رقم التتبع في مكان آمن</span>
                        </li>
                        <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-all">
                            <span className="text-2xl">📄</span>
                            <span>حمل PDF للاحتفاظ بالإيصال</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        {/* Bottom Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
          <Button 
            onClick={handleDownloadPdf}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 px-8 py-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2 rtl:ml-0 rtl:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            📄 تحميل إيصال PDF
          </Button>
          <Button 
            onClick={() => window.location.hash = '#/'} 
            variant="secondary" 
            className="shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 px-8 py-3"
          >
            🏠 العودة للرئيسية
          </Button>
        </div>
      </Card>
    </div>
    </>
  );
};

export default ConfirmationPage;
