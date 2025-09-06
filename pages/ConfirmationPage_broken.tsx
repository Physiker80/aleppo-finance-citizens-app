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
            height: 80,
            displayValue: true,
            fontSize: 14,
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
    const content = pdfContentRef.current;
    if (!content || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
      console.error("PDF generation libraries not loaded or content not found.");
      return;
    }

    try {
      // Ensure barcode is generated for PDF before capturing
      const pdfBarcodeCanvas = document.getElementById('pdf-barcode') as HTMLCanvasElement;
      if (pdfBarcodeCanvas && ticket?.id) {
        // Generate barcode directly on the canvas
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
        
        // Wait for barcode to render
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('PDF Barcode generated successfully for:', ticket.id);
      }

      // Capture content with html2canvas
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
      
      // Add metadata
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

    {/* Hidden content for PDF generation */}
    <div ref={pdfContentRef} style={{ position: 'absolute', left: '-9999px', width: '800px', direction: 'rtl', fontFamily: 'Cairo, sans-serif', backgroundColor: 'white', zIndex: -1000 }}>
        <div style={{ padding: '40px', color: '#333', minHeight: '1000px', backgroundColor: '#ffffff' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0f3c35', paddingBottom: '25px', marginBottom: '30px' }}>
          <div style={{textAlign: 'right'}}>
            <h1 style={{ margin: '8px 0 0', fontSize: '28px', color: '#0f3c35', fontWeight: '600' }}>مديريــة الماليــة - محافظــة حلــب</h1>
            <p style={{ margin: '8px 0 0', fontSize: '18px', color: '#555', fontWeight: '600' }}>إيصال تقديم طلب</p>
            <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#777' }}>وزارة المالية - الجمهورية العربية السورية</p>
                </div>
                <img src="https://syrian.zone/syid/materials/logo.ai.svg" alt="شعار" style={{ height: '90px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
            </div>

            {/* Request Information Section */}
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
                            <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333' }}>{ticket?.type || 'غير محدد'}</td>
                        </tr>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                            <td style={{ padding: '15px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#0f3c35' }}>القسم المعني</td>
                            <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333' }}>{ticket?.department || 'غير محدد'}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '15px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#0f3c35' }}>تاريخ التقديم</td>
                            <td style={{ padding: '15px', border: '1px solid #e0e0e0', color: '#333' }}>{ticket?.submissionDate?.toLocaleDateString('ar-SY') || 'غير محدد'}</td>
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

            {/* Tracking Information Section */}
            <div style={{ marginTop: '50px', textAlign: 'center', backgroundColor: '#f8f9fa', padding: '30px', borderRadius: '12px', border: '2px solid #0f3c35' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f3c35', marginBottom: '25px' }}>معلومات متابعة الطلب</h3>
                
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', marginBottom: '20px' }}>
                    {/* Real barcode for PDF */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', border: '2px solid #0f3c35', borderRadius: '8px', padding: '15px', margin: '0 auto', minHeight: '120px', minWidth: '300px' }}>
                            {/* Canvas for PDF barcode */}
                            <canvas 
                                id="pdf-barcode"
                                style={{ maxWidth: '300px', maxHeight: '120px', display: 'block' }}
                            ></canvas>
                        </div>
                        <p style={{ fontSize: '12px', color: '#0f3c35', margin: '8px 0 0 0', fontWeight: 'bold' }}>باركود قابل للمسح والتتبع</p>
                    </div>
                    
                    {/* Tracking Number Display */}
                    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '2px dashed #0f3c35', minWidth: '300px' }}>
                        <p style={{ fontSize: '16px', color: '#0f3c35', margin: '0 0 10px 0', fontWeight: 'bold' }}>رقم التتبع الخاص بك:</p>
                        <p style={{ fontSize: '28px', fontFamily: 'monospace', color: '#d63384', fontWeight: 'bold', letterSpacing: '2px', margin: '10px 0', textAlign: 'center' }}>{ticket?.id || 'خطأ في توليد الرقم'}</p>
                    </div>
                </div>
                
                {/* Instructions */}
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
                
                {/* Important Notes */}
                <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', marginTop: '20px', textAlign: 'right' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#856404', marginBottom: '10px', textAlign: 'center' }}>ملاحظات مهمة:</h4>
                    <ul style={{ fontSize: '12px', color: '#856404', lineHeight: '1.6', listStyleType: 'disc', paddingRight: '20px' }}>
                        <li>استخدم رقم التتبع للبحث في صفحة المتابعة</li>
                        <li>احتفظ برقم التتبع في مكان آمن</li>
                        <li>يمكنك الاستعلام عن إجابتك في أي وقت</li>
                        <li>يمكن متابعة الطلب في أي وقت عبر الرقم المذكور</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
    </>
  );
};

export default ConfirmationPage;
