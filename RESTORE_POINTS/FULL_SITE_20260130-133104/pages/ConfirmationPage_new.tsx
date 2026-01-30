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
    <Card className="text-center">
        <div className="mx-auto h-16 w-16 text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">تم استلام طلبك بنجاح!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">يرجى الاحتفاظ برقم التتبع التالي لمتابعة حالة طلبك:</p>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 my-4 inline-block">
            {/* Real Barcode Section */}
            <div className="text-center mb-4">
                {/* Real scannable barcode */}
                <div className="mb-4">
                    <div className="w-[350px] bg-white border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center mx-auto shadow-lg p-4">
                        {/* Canvas for real barcode */}
                        <canvas 
                            id="main-barcode"
                            className="max-w-[300px] max-h-[80px]"
                        ></canvas>
                        <p className="text-xs text-gray-600 mt-2 font-medium">باركود قابل للمسح والتتبع</p>
                    </div>
                </div>
            </div>
            
            {/* Tracking Number Display */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-4 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">رقم التتبع الخاص بك:</p>
                <p className="text-3xl font-mono font-bold text-pink-600 dark:text-pink-400 tracking-wider">{ticket?.id || 'خطأ في توليد الرقم'}</p>
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-2 mb-4">
                <div className="flex space-x-2 rtl:space-x-reverse">
                    <button
                        onClick={() => window.location.hash = `#/track?id=${ticket?.id}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        📋 متابعة الطلب
                    </button>
                    <button
                        onClick={() => {
                            const trackingUrl = `${window.location.origin}/#/track?id=${ticket?.id}`;
                            if (navigator.clipboard && window.isSecureContext) {
                                navigator.clipboard.writeText(trackingUrl);
                                alert('تم نسخ رابط المتابعة بنجاح!');
                            } else {
                                // Fallback for non-secure contexts
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
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        🔗 نسخ رابط المتابعة
                    </button>
                </div>
            </div>
            
            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">طرق المتابعة:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• امسح الباركود بكاميرا الهاتف أو تطبيق مسح الباركود</li>
                    <li>• استخدم رقم التتبع أعلاه في صفحة المتابعة</li>
                    <li>• اضغط على "متابعة الطلب" للوصول المباشر</li>
                    <li>• انسخ الرابط وشاركه أو احفظه في المفضلة</li>
                    <li>• احفظ رقم التتبع في مكان آمن</li>
                </ul>
            </div>
        </div>

        <div className="flex justify-center items-center space-x-4 rtl:space-x-reverse mt-6">
          <Button onClick={handleDownloadPdf}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 rtl:ml-0 rtl:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            تحميل إيصال PDF
          </Button>
          <Button onClick={() => window.location.hash = '#/'} variant="secondary">العودة للرئيسية</Button>
        </div>
    </Card>
    </>
  );
};

export default ConfirmationPage;
