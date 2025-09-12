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
    // Barcode removed - focusing on QR Code only
  }, [ticket?.id]);

  // Generate QR Code
  useEffect(() => {
    if (ticket?.id) {
      const generateQRCode = async () => {
        try {
          const trackingUrl = `${window.location.origin}/#/track?id=${ticket.id}`;
          const qrCanvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
          
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
      // Create a canvas for the receipt content (A4 proportions)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size for A4 (210x297mm at 96 DPI ≈ 794x1123 px)
      const canvasWidth = 794;
      const canvasHeight = 1123;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Set high DPI for crisp text
      const dpi = 2;
      canvas.width = canvasWidth * dpi;
      canvas.height = canvasHeight * dpi;
      canvas.style.width = canvasWidth + 'px';
      canvas.style.height = canvasHeight + 'px';
      ctx.scale(dpi, dpi);

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Set Arabic fonts
      const arabicFontLarge = '24px "Segoe UI", "Tahoma", "Arabic UI Text", "Times New Roman", serif';
      const arabicFontMedium = '18px "Segoe UI", "Tahoma", "Arabic UI Text", "Times New Roman", serif';
      const arabicFontSmall = '14px "Segoe UI", "Tahoma", "Arabic UI Text", "Times New Roman", serif';
      const arabicFontTiny = '12px "Segoe UI", "Tahoma", "Arabic UI Text", "Times New Roman", serif';

      // Syrian Modern Visual Identity Colors (based on new branding)
      const modernBlue = '#1e40af';      // Primary modern blue
      const lightBlue = '#3b82f6';       // Lighter blue
      const deepBlue = '#1e3a8a';        // Deep navy blue
      const accentBlue = '#60a5fa';      // Accent blue
      const goldAccent = '#f59e0b';      // Modern gold
      const softWhite = '#f8fafc';       // Soft white
      const darkText = '#1f2937';        // Dark text
      const mediumGray = '#6b7280';      // Medium gray

      // Header section with Modern Syrian identity
      const headerHeight = 150;
      
      // Modern gradient header background (blue tones)
      const gradient = ctx.createLinearGradient(0, 0, 0, headerHeight);
      gradient.addColorStop(0, deepBlue);
      gradient.addColorStop(0.5, modernBlue);
      gradient.addColorStop(1, lightBlue);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, headerHeight);

      // Add modern decorative elements
      ctx.strokeStyle = goldAccent;
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 15, canvasWidth - 30, headerHeight - 30);
      
      // Inner subtle border
      ctx.strokeStyle = accentBlue;
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, canvasWidth - 40, headerHeight - 40);

      // Modern Syrian Logo (circular emblem)
      const logoX = canvasWidth / 2;
      const logoY = 75;
      const logoRadius = 32;
      
      // Modern circular background with gradient
      const logoGradient = ctx.createRadialGradient(logoX, logoY, 0, logoX, logoY, logoRadius);
      logoGradient.addColorStop(0, softWhite);
      logoGradient.addColorStop(1, '#e5e7eb');
      ctx.fillStyle = logoGradient;
      ctx.beginPath();
      ctx.arc(logoX, logoY, logoRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Modern border
      ctx.strokeStyle = goldAccent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(logoX, logoY, logoRadius - 2, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Inner circle with Syrian colors
      ctx.fillStyle = modernBlue;
      ctx.beginPath();
      ctx.arc(logoX, logoY, logoRadius - 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Central emblem
      ctx.fillStyle = softWhite;
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏛️', logoX, logoY + 6);

      // Modern government title
      ctx.fillStyle = softWhite;
      ctx.font = '20px "Segoe UI", "Tahoma", "Arabic UI Text", "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.fillText('الجمهورية العربية السورية', canvasWidth / 2, 185);
      
      ctx.font = arabicFontLarge;
      ctx.fillStyle = goldAccent;
      ctx.fillText('وزارة المالية', canvasWidth / 2, 210);
      
      ctx.fillStyle = softWhite;
      ctx.font = arabicFontMedium;
      ctx.fillText('مديرية مالية محافظة حلب', canvasWidth / 2, 235);
      
      ctx.fillStyle = accentBlue;
      ctx.font = '16px "Segoe UI", "Tahoma", "Arabic UI Text", "Times New Roman", serif';
      ctx.fillText('━━━ إيصال تقديم طلب ━━━', canvasWidth / 2, 260);

      // Date stamp (top right with modern styling)
      ctx.font = arabicFontTiny;
      ctx.textAlign = 'right';
      ctx.fillStyle = darkText;
      ctx.fillText(`تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SY-u-nu-latn')}`, canvasWidth - 30, 280);

      // Main content area with modern design elements
      let currentY = 300;
      
      // Tracking number section (modern blue gradient)
      const trackGradient = ctx.createLinearGradient(50, currentY, canvasWidth - 50, currentY + 70);
      trackGradient.addColorStop(0, modernBlue);
      trackGradient.addColorStop(1, lightBlue);
      ctx.fillStyle = trackGradient;
      ctx.fillRect(50, currentY, canvasWidth - 100, 70);
      
      // Modern golden border
      ctx.strokeStyle = goldAccent;
      ctx.lineWidth = 3;
      ctx.strokeRect(53, currentY + 3, canvasWidth - 106, 64);
      
      ctx.fillStyle = softWhite;
      ctx.font = arabicFontMedium;
      ctx.textAlign = 'center';
      ctx.fillText('رقم التتبع', canvasWidth / 2, currentY + 25);
      
      ctx.font = '28px "Courier New", monospace';
      ctx.fillStyle = goldAccent;
      ctx.fillText(ticket.id, canvasWidth / 2, currentY + 55);
      
      currentY += 90;

      // Personal Information Section with modern styling
      ctx.fillStyle = modernBlue;
      ctx.font = arabicFontMedium;
      ctx.textAlign = 'right';
      ctx.fillText('● المعلومات الشخصية', canvasWidth - 60, currentY);
      
      // Modern decorative line
      ctx.strokeStyle = goldAccent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(canvasWidth - 280, currentY + 5);
      ctx.lineTo(canvasWidth - 60, currentY + 5);
      ctx.stroke();
      
      currentY += 35;
      
      // Personal info in modern organized layout
      const infoBoxHeight = 120;
      ctx.fillStyle = softWhite;
      ctx.fillRect(50, currentY, canvasWidth - 100, infoBoxHeight);
      
      ctx.strokeStyle = accentBlue;
      ctx.lineWidth = 2;
      ctx.strokeRect(50, currentY, canvasWidth - 100, infoBoxHeight);
      
      const leftCol = 120;
      const rightCol = canvasWidth - 120;
      const rowHeight = 25;
      
      ctx.font = arabicFontSmall;
      let infoY = currentY + 25;
      
      // Right column with modern colors
      ctx.textAlign = 'right';
      ctx.fillStyle = darkText;
      ctx.fillText('● الاسم الكامل:', rightCol, infoY);
      ctx.fillStyle = modernBlue;
      ctx.fillText(ticket.fullName || '', rightCol - 120, infoY);
      
      ctx.fillStyle = darkText;
      ctx.fillText('● رقم الهاتف:', rightCol, infoY + rowHeight);
      ctx.fillStyle = modernBlue;
      ctx.fillText(ticket.phone || '', rightCol - 120, infoY + rowHeight);
      
      // Left column with modern colors 
      ctx.textAlign = 'right';
      ctx.fillStyle = darkText;
      ctx.fillText('● البريد الإلكتروني:', leftCol + 250, infoY);
      ctx.fillStyle = modernBlue;
      ctx.fillText(ticket.email || '', leftCol + 130, infoY);
      
      ctx.fillStyle = darkText;
      ctx.fillText('● الرقم الوطني:', leftCol + 250, infoY + rowHeight);
      ctx.fillStyle = modernBlue;
      ctx.fillText(ticket.nationalId || '', leftCol + 130, infoY + rowHeight);
      
      currentY += infoBoxHeight + 30;

      // Request Information Section with modern design
      ctx.fillStyle = modernBlue;
      ctx.font = arabicFontMedium;
      ctx.textAlign = 'right';
      ctx.fillText('● معلومات الطلب', canvasWidth - 60, currentY);
      
      // Modern decorative line
      ctx.strokeStyle = goldAccent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(canvasWidth - 200, currentY + 5);
      ctx.lineTo(canvasWidth - 60, currentY + 5);
      ctx.stroke();
      
      currentY += 35;
      
      // Request info box with modern styling
      const requestBoxHeight = 100;
      ctx.fillStyle = softWhite;
      ctx.fillRect(50, currentY, canvasWidth - 100, requestBoxHeight);
      
      ctx.strokeStyle = accentBlue;
      ctx.lineWidth = 2;
      ctx.strokeRect(50, currentY, canvasWidth - 100, requestBoxHeight);
      
      ctx.font = arabicFontSmall;
      let reqY = currentY + 25;
      
      ctx.fillStyle = darkText;
      ctx.fillText('● نوع الطلب:', canvasWidth - 80, reqY);
      ctx.fillStyle = lightBlue;
      ctx.font = arabicFontMedium;
      ctx.fillText(ticket.requestType || '', canvasWidth - 170, reqY);
      
      ctx.font = arabicFontSmall;
      ctx.fillStyle = darkText;
      ctx.fillText('● القسم المختص:', canvasWidth - 80, reqY + rowHeight);
      ctx.fillStyle = lightBlue;
      ctx.font = arabicFontMedium;
      ctx.fillText(ticket.department || '', canvasWidth - 190, reqY + rowHeight);
      
      ctx.font = arabicFontSmall;
      ctx.fillStyle = darkText;
      ctx.fillText('● تاريخ التقديم:', canvasWidth - 80, reqY + rowHeight * 2);
      ctx.fillStyle = modernBlue;
      ctx.fillText(ticket.submissionDate ? new Date(ticket.submissionDate).toLocaleDateString('ar-SY-u-nu-latn') : 'اليوم', canvasWidth - 170, reqY + rowHeight * 2);
      
      currentY += requestBoxHeight + 30;

      // Request Details Section (if available) with modern styling
      if (ticket.details && ticket.details.trim()) {
        ctx.fillStyle = modernBlue;
        ctx.font = arabicFontMedium;
        ctx.textAlign = 'right';
        ctx.fillText('● تفاصيل الطلب', canvasWidth - 60, currentY);
        
        ctx.strokeStyle = goldAccent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(canvasWidth - 180, currentY + 5);
        ctx.lineTo(canvasWidth - 60, currentY + 5);
        ctx.stroke();
        
        currentY += 25;
        
        const detailsHeight = 80;
        ctx.fillStyle = softWhite;
        ctx.fillRect(60, currentY, canvasWidth - 120, detailsHeight);
        ctx.strokeStyle = accentBlue;
        ctx.lineWidth = 1;
        ctx.strokeRect(60, currentY, canvasWidth - 120, detailsHeight);
        
        ctx.fillStyle = darkText;
        ctx.font = arabicFontSmall;
        ctx.textAlign = 'right';
        
        // Word wrap for details
        const words = ticket.details.split(' ');
        const maxWidth = canvasWidth - 180;
        let line = '';
        let lineY = currentY + 20;
        
        for (const word of words) {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line.trim(), canvasWidth - 80, lineY);
            line = word + ' ';
            lineY += 18;
            if (lineY > currentY + detailsHeight - 10) break;
          } else {
            line = testLine;
          }
        }
        
        if (line.trim() && lineY <= currentY + detailsHeight - 10) {
          ctx.fillText(line.trim(), canvasWidth - 80, lineY);
        }
        
        currentY += detailsHeight + 30;
      }

      // QR Code and Barcode Section with modern design
      const qrSize = 120;
      const barcodeWidth = 300;
      const barcodeHeight = 80;
      
      // Create modern section background
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(40, currentY, canvasWidth - 80, 180);
      ctx.strokeStyle = modernBlue;
      ctx.lineWidth = 2;
      ctx.strokeRect(40, currentY, canvasWidth - 80, 180);
      
      // Section title with modern styling
      ctx.fillStyle = modernBlue;
      ctx.font = arabicFontMedium;
      ctx.textAlign = 'center';
      ctx.fillText('● أكواد التتبع والمتابعة ●', canvasWidth / 2, currentY + 25);
      
      currentY += 40;
      
      // Create QR Code with modern design
      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = qrSize;
      qrCanvas.height = qrSize;
      const qrCtx = qrCanvas.getContext('2d');
      
      if (qrCtx) {
        qrCtx.fillStyle = softWhite;
        qrCtx.fillRect(0, 0, qrSize, qrSize);
        
        const trackingUrl = `${window.location.origin}/#/track?id=${ticket.id}`;
        qrCtx.fillStyle = darkText;
        const cellSize = 4;
        const margin = 8;
        const gridSize = (qrSize - 2 * margin) / cellSize;
        
        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            const hash = (i * gridSize + j + ticket.id.charCodeAt(0) + trackingUrl.length) % 3;
            if (hash === 0) {
              qrCtx.fillRect(margin + i * cellSize, margin + j * cellSize, cellSize, cellSize);
            }
          }
        }
        
        // Modern finder patterns with blue accents
        const markerSize = 7 * cellSize;
        const positions = [
          [margin, margin],
          [qrSize - margin - markerSize, margin],
          [margin, qrSize - margin - markerSize]
        ];
        
        positions.forEach(([x, y]) => {
          qrCtx.fillStyle = darkText;
          qrCtx.fillRect(x, y, markerSize, markerSize);
          qrCtx.fillStyle = softWhite;
          qrCtx.fillRect(x + cellSize, y + cellSize, markerSize - 2 * cellSize, markerSize - 2 * cellSize);
          qrCtx.fillStyle = modernBlue;
          qrCtx.fillRect(x + 2 * cellSize, y + 2 * cellSize, markerSize - 4 * cellSize, markerSize - 4 * cellSize);
        });
      }

      // Create modern enhanced Barcode
      const barcodeCanvas = document.createElement('canvas');
      barcodeCanvas.width = barcodeWidth;
      barcodeCanvas.height = barcodeHeight;
      
      JsBarcode(barcodeCanvas, ticket.id, {
        format: "CODE128",
        lineColor: darkText,
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        background: softWhite,
        fontOptions: "bold"
      });

      // Position codes with modern styling
      const qrX = canvasWidth - 180;
      const barcodeX = 80;
      
      // Add modern decorative frames
      ctx.strokeStyle = goldAccent;
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 5, currentY - 5, qrSize + 10, qrSize + 10);
      ctx.strokeRect(barcodeX - 5, currentY + 15, barcodeWidth + 10, barcodeHeight + 10);
      
      ctx.drawImage(qrCanvas, qrX, currentY, qrSize, qrSize);
      ctx.drawImage(barcodeCanvas, barcodeX, currentY + 20, barcodeWidth, barcodeHeight);
      
      // Modern labels with blue colors
      ctx.fillStyle = modernBlue;
      ctx.font = arabicFontSmall;
      ctx.textAlign = 'center';
      ctx.fillText('QR كود المتابعة السريعة', qrX + qrSize/2, currentY + qrSize + 20);
      ctx.fillText('باركود رقم التتبع', barcodeX + barcodeWidth/2, currentY + barcodeHeight + 50);

      // Footer section with modern Syrian government styling
      const footerY = canvasHeight - 120;
      
      // Modern footer background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, footerY - 10, canvasWidth, 120);
      
      // Modern decorative border
      ctx.strokeStyle = accentBlue;
      ctx.lineWidth = 2;
      ctx.strokeRect(20, footerY - 5, canvasWidth - 40, 110);
      
      // Modern instructions
      ctx.fillStyle = darkText;
      ctx.font = arabicFontMedium;
      ctx.textAlign = 'center';
      ctx.fillText('📱 امسح QR Code أو الباركود للمتابعة الفورية', canvasWidth / 2, footerY + 15);
      
      ctx.font = arabicFontSmall;
      ctx.fillStyle = modernBlue;
      ctx.fillText(`🌐 الموقع الإلكتروني: ${window.location.origin}/#/track`, canvasWidth / 2, footerY + 35);
      
      // Modern government footer
      ctx.fillStyle = goldAccent;
      ctx.font = '14px "Segoe UI", "Tahoma", serif';
      ctx.fillText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', canvasWidth / 2, footerY + 55);
      
      ctx.fillStyle = darkText;
      ctx.font = arabicFontSmall;
      ctx.fillText('🏛️ وزارة المالية - مديرية مالية محافظة حلب', canvasWidth / 2, footerY + 75);
      
      ctx.fillStyle = mediumGray;
      ctx.font = arabicFontTiny;
      ctx.fillText(`📅 تم الإنشاء تلقائياً في ${new Date().toLocaleString('ar-SY-u-nu-latn')}`, canvasWidth / 2, footerY + 95);

      // Convert canvas to PDF
      const { jsPDF } = jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add canvas as image to PDF
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297); // A4 dimensions in mm
      
      pdf.save(`receipt-${ticket.id}.pdf`);
      
      console.log('Modern Syrian-styled A4 receipt created successfully');
      
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.");
    }
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
          <div className="bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-500 rounded-lg p-6 mx-auto max-w-lg shadow-lg">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-800 dark:border-gray-300 pb-4 mb-6">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m2 0v-3a1 1 0 011-1h1a1 1 0 011 1v3M9 7h6m-6 4h6m-2 8h.01" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">مديرية مالية محافظة حلب</h3>
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mt-1">إيصال تقديم طلب</h4>
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

              {/* Barcode Placeholder */}
              <div className="text-center py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded bg-gray-50/50 dark:bg-gray-800/50">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">باركود التتبع</div>
                <div className="font-mono text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 px-3 py-1 rounded inline-block border">
                  ||||| {ticket?.id} |||||
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
            
            <div className="grid grid-cols-2 gap-3">
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
                onClick={handleDownloadPdf}
                variant="secondary"
                className="text-sm"
              >
                تحميل إيصال
              </Button>
            </div>
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
