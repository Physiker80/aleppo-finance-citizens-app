import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Ticket } from '../types';
import { formatArabicNumber, formatArabicDate } from '../constants';
import { TicketTimeline } from '../components/GamificationWidgets';

const TrackRequestPageSimple: React.FC = () => {
  console.log('TrackRequestPageSimple rendering...');

  const appContext = useContext(AppContext);
  const { tickets, findTicket } = appContext || {};
  const [searchId, setSearchId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchNationalId, setSearchNationalId] = useState('');
  const [foundTicket, setFoundTicket] = useState<Ticket | null>(null);
  const [searchResults, setSearchResults] = useState<Ticket[]>([]);
  const [trackedTickets, setTrackedTickets] = useState<Ticket[]>([]);
  const [searchError, setSearchError] = useState<string>('');
  const [searchMethod, setSearchMethod] = useState<'manual' | 'file' | 'camera'>('manual');
  const [searchType, setSearchType] = useState<'id' | 'name' | 'nationalId'>('id');
  const [trackingMode, setTrackingMode] = useState<'single' | 'multiple'>('single');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // استعادة آخر تذكرة تم تتبعها عند التحميل
  React.useEffect(() => {
    // 1. Check URL params first
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const urlId = params.get('id');
    
    if (urlId && findTicket) {
      setSearchId(urlId);
      const ticket = findTicket(urlId);
      if (ticket) {
        setFoundTicket(ticket);
        setTrackingMode('single');
      }
    } 
    // 2. Fallback to localStorage for single tracking
    else if (findTicket) {
      const savedId = localStorage.getItem('last_tracked_id');
      if (savedId) {
        setSearchId(savedId);
        const ticket = findTicket(savedId);
        if (ticket) setFoundTicket(ticket);
      }
    }
    
    // 3. Restore multiple tracked tickets from localStorage
    if (findTicket) {
      try {
        const rawTracked = localStorage.getItem('tracked_tickets_list');
        if (rawTracked) {
          const ids = JSON.parse(rawTracked);
          if (Array.isArray(ids)) {
            const found = ids.map((id: string) => findTicket(id)).filter((t): t is Ticket => !!t);
            if (found.length > 0) setTrackedTickets(found);
          }
        }
      } catch (e) {
        console.error('Error restoring tracked tickets:', e);
      }
    }
  }, [findTicket]); // Run when findTicket is available (tickets loaded)

  // حفظ المعرف عند العثور على تذكرة (Single Mode)
  React.useEffect(() => {
    if (foundTicket) {
      localStorage.setItem('last_tracked_id', foundTicket.id);
    }
  }, [foundTicket]);

  // حفظ قائمة التذاكر المتتبعة (Multiple Mode)
  React.useEffect(() => {
    if (trackedTickets.length > 0) {
      const ids = trackedTickets.map(t => t.id);
      localStorage.setItem('tracked_tickets_list', JSON.stringify(ids));
    }
  }, [trackedTickets]);

  // يستخرج رقم التتبع فقط من نص/رابط (يدعم id= في الرابط وأنماط ALF-YYYYMMDD/YYMMDD-XXXXX)
  const extractTrackingId = (text: string): string | null => {
    const raw = (text || '').trim();
    if (!raw) return null;
    const s = raw.replace(/\s+/g, ' ');

    // 1) استخراج من معلمة id= في الروابط (يدعم ?, #, &)
    const urlIdMatch = s.match(/[?&#]id=([A-Za-z0-9_-]+)/i);
    if (urlIdMatch && urlIdMatch[1]) return urlIdMatch[1].toUpperCase();

    // 2) قراءة إعداد المعرّف من التخزين (بادئة وتنسيق التاريخ)
    let prefix = 'ALF';
    let dateDigits = 8; // YYYYMMDD
    try {
      const rawCfg = localStorage.getItem('ticketIdConfig');
      if (rawCfg) {
        const cfg = JSON.parse(rawCfg);
        prefix = String(cfg?.prefix || 'ALF').toUpperCase();
        dateDigits = cfg?.dateFormat === 'YYMMDD' ? 6 : 8;
      }
    } catch { }

    // 3) نمط صارم مع البادئة والتاريخ
    const strictRe = new RegExp(`${prefix}-\\d{${dateDigits}}-[A-Za-z0-9]{3,}`, 'i');
    const strictMatch = s.match(strictRe);
    if (strictMatch) return strictMatch[0].toUpperCase();

    // 4) نمط عام ABC-YYYYMMDD-XXXX
    const genericMatch = s.match(/[A-Z]{2,5}-\d{6,8}-[A-Z0-9]{3,}/i);
    if (genericMatch) return genericMatch[0].toUpperCase();

    // 5) مفاضلة بحسب الرموز المحتملة
    const tokens = s.split(/[^A-Za-z0-9_-]+/).filter(Boolean);
    const candidates = tokens.filter(t => {
      if (t.length < 6 || t.length > 32) return false;
      if (!/^[A-Za-z0-9_-]+$/.test(t)) return false;
      if (!/[A-Za-z]/.test(t)) return false; // يحتوي حرف
      if (!/\d/.test(t)) return false;      // ويحتوي رقم
      return true;
    });
    if (candidates.length) {
      const byPrefix = candidates.find(c => c.toUpperCase().startsWith(prefix + '-'));
      return (byPrefix || candidates[0]).toUpperCase();
    }
    return null;
  };

  const handleSearch = () => {
    setSearchError('');
    setSearchResults([]);

    if (searchType === 'id') {
      if (!searchId.trim()) {
        setSearchError('يرجى إدخال رقم الطلب');
        return;
      }
      // طبيعـة الإدخال قد تكون رابطاً كاملاً؛ نستخرج المعرّف أولاً
      const normalizedId = extractTrackingId(searchId) || searchId.trim();
      setSearchId(normalizedId);
      const ticket = findTicket?.(normalizedId);
      if (ticket) {
        if (trackingMode === 'single') {
          setFoundTicket(ticket);
        } else {
          if (!trackedTickets.some(t => t.id === ticket.id)) {
            setTrackedTickets(prev => [...prev, ticket]);
          }
          setSearchId('');
        }
      } else {
        setSearchError('لم يتم العثور على طلب بهذا الرقم');
      }
    } else if (searchType === 'name') {
      if (!searchName.trim()) {
        setSearchError('يرجى إدخال الاسم الكامل');
        return;
      }
      const results = tickets?.filter(t => 
        t.fullName && t.fullName.toLowerCase().includes(searchName.toLowerCase())
      ) || [];
      
      if (results.length === 0) {
        setSearchError('لم يتم العثور على طلبات بهذا الاسم');
      } else if (results.length === 1) {
        setFoundTicket(results[0]);
      } else {
        setSearchResults(results);
      }
    } else if (searchType === 'nationalId') {
      if (!searchNationalId.trim()) {
        setSearchError('يرجى إدخال الرقم الوطني');
        return;
      }
      const results = tickets?.filter(t => 
        t.nationalId && t.nationalId === searchNationalId.trim()
      ) || [];
      
      if (results.length === 0) {
        setSearchError('لم يتم العثور على طلبات بهذا الرقم الوطني');
      } else if (results.length === 1) {
        setFoundTicket(results[0]);
      } else {
        setSearchResults(results);
      }
    }
  };

  const removeTrackedTicket = (ticketId: string) => {
    setTrackedTickets(prev => prev.filter(t => t.id !== ticketId));
  };

  const clearAllTrackedTickets = () => {
    setTrackedTickets([]);
  };

  // قراءة QR code من صورة
  const readQRFromImage = async (imageFile: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        try {
          // محاولة قراءة QR باستخدام jsQR
          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          if (imageData) {
            const jsQR = await import('jsqr');
            const code = jsQR.default(imageData.data, imageData.width, imageData.height);
            if (code) {
              resolve(code.data);
              return;
            }
          }

          // محاولة باستخدام ZXing
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const reader = new BrowserMultiFormatReader();
          try {
            const result = await reader.decodeFromImageUrl(URL.createObjectURL(imageFile));
            resolve(result.getText());
          } catch {
            resolve(null);
          }
        } catch (error) {
          console.error('Error reading QR code:', error);
          resolve(null);
        }
      };

      img.src = URL.createObjectURL(imageFile);
    });
  };

  // قراءة QR code من PDF
  const readQRFromPDF = async (pdfFile: File): Promise<string | null> => {
    try {
      console.log("Starting PDF processing...");
      // استيراد PDF.js ديناميكياً
      const pdfjs = await import('pdfjs-dist');
      
      // إعداد Worker
      // استخدام unpkg مع الإصدار المثبت لضمان التوافق
      // في الإصدار 5+ نستخدم mjs
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
         const version = pdfjs.version || '5.3.93';
         console.log(`Setting PDF Worker to version: ${version}`);
         pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      }

      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      
      const pdf = await loadingTask.promise;
      console.log(`PDF Loaded, pages: ${pdf.numPages}`);

      // البحث في أول 5 صفحات (زاد العدد لضمان العثور)
      const maxPages = Math.min(pdf.numPages, 5);
      
      // استيراد المكتبات
      const jsQR = await import('jsqr');
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const zxingReader = new BrowserMultiFormatReader();

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        console.log(`Scanning page ${pageNum}...`);
        try {
          const page = await pdf.getPage(pageNum);
          
          // زيادة الدقة إلى 3.0 لتحسين قراءة الرموز الصغيرة
          const viewport = page.getViewport({ scale: 3.0 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          if (!ctx) continue;
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // === المحاولة 1: jsQR ===
          const code = jsQR.default(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          
          if (code && code.data) {
             console.log(`QR Found via jsQR on page ${pageNum}:`, code.data);
             return code.data;
          }

          // === المحاولة 2: ZXing ===
          // نستخدم DataURL
          const dataUrl = canvas.toDataURL('image/png');
          try {
             // إضافة Hints لتحسين الدقة
             const result = await zxingReader.decodeFromImageUrl(dataUrl);
             if (result && result.getText()) {
                console.log(`QR Found via ZXing on page ${pageNum}:`, result.getText());
                return result.getText();
             }
          } catch (zError) {
             // ZXing failure is expected if no QR
          }

        } catch (pageError) {
           console.warn(`Error scanning page ${pageNum}:`, pageError);
        }
      }

      console.log("No QR code found in scanned pages");
      return null;
    } catch (error) {
      console.error('Error reading PDF:', error);
      setSearchError('حدث خطأ أثناء معالجة ملف PDF. تأكد من أن الملف صالح وليس محمياً بكلمة مرور.');
      return null;
    }
  };

  // معالجة رفع الملف
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processFile(file);

    // مسح القيمة لتمكين رفع نفس الملف مرة أخرى
    if (event.target) {
      event.target.value = '';
    }
  };

  // معالجة الملف
  const processFile = async (file: File) => {
    setIsProcessing(true);
    setSearchError('');

    try {
      let qrData: string | null = null;

      if (file.type.startsWith('image/')) {
        qrData = await readQRFromImage(file);
      } else if (file.type === 'application/pdf') {
        qrData = await readQRFromPDF(file);
      } else {
        setSearchError('نوع الملف غير مدعوم. يرجى رفع صورة أو ملف PDF');
        return;
      }

      if (qrData) {
        const id = extractTrackingId(qrData);
        if (!id) {
          setSearchError('تمت القراءة لكن لم نتمكن من تحديد رقم التتبع');
          return;
        }
        setSearchId(id);
        // البحث التلقائي باستخدام المعرّف المستخرج فقط
        const ticket = findTicket?.(id);
        if (ticket) {
          if (trackingMode === 'single') {
            setFoundTicket(ticket);
          } else {
            // وضع المتعدد: أضف إلى القائمة إذا غير مكرر
            setTrackedTickets(prev => prev.some(t => t.id === ticket.id) ? prev : [...prev, ticket]);
            setFoundTicket(null);
            setSearchId('');
          }
        } else {
          setSearchError('تم قراءة الكود لكن لم يتم العثور على طلب بهذا الرقم');
        }
      } else {
        setSearchError('لم يتم العثور على كود QR في الملف');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setSearchError('حدث خطأ أثناء معالجة الملف');
    } finally {
      setIsProcessing(false);
    }
  };

  // معالجة السحب والإفلات
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  // بدء الكاميرا
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // الكاميرا الخلفية
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setCameraStream(stream);
      setShowCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setSearchError('لا يمكن الوصول للكاميرا. تأكد من السماح للموقع باستخدام الكاميرا');
    }
  };

  // إيقاف الكاميرا
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // قراءة QR من الكاميرا
  const scanFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0);

    try {
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        const jsQR = await import('jsqr');
        const code = jsQR.default(imageData.data, imageData.width, imageData.height);

        if (code) {
          const id = extractTrackingId(code.data);
          if (!id) return; // تجاهل النتائج غير المفهومة
          setSearchId(id);
          stopCamera();

          // البحث التلقائي
          const ticket = findTicket?.(id);
          if (ticket) {
            if (trackingMode === 'single') {
              setFoundTicket(ticket);
            } else {
              setTrackedTickets(prev => prev.some(t => t.id === ticket.id) ? prev : [...prev, ticket]);
              setFoundTicket(null);
              setSearchId('');
            }
          } else {
            setSearchError('تم قراءة الكود لكن لم يتم العثور على طلب بهذا الرقم');
          }
        }
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
    }
  };

  // مسح مستمر للكاميرا
  React.useEffect(() => {
    let scanInterval: NodeJS.Timeout | null = null;

    if (showCamera && videoRef.current) {
      scanInterval = setInterval(scanFromCamera, 1000); // مسح كل ثانية
    }

    return () => {
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  }, [showCamera]);

  // مسح الكاميرا عند إلغاء تحميل المكون
  React.useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const getStatusInArabic = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'New': 'جديد',
      'InProgress': 'قيد المعالجة',
      'Answered': 'تم الرد',
      'Closed': 'مغلق'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'New': 'bg-blue-100 text-blue-800',
      'InProgress': 'bg-yellow-100 text-yellow-800',
      'Answered': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen py-8" style={{
      background: 'url("https://syrian.zone/syid/materials/bg.svg") center/cover',
      backdropFilter: 'blur(0.5px)'
    }}>
      <div className="container mx-auto px-4 space-y-8">
        <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-white/20 dark:border-gray-700/20">
          <div className="text-center mb-8">
            {/* الشعار الرسمي */}
            <div className="mb-8 flex flex-col items-center">
              <img
                src="https://syrian.zone/syid/materials/logo.ai.svg"
                alt="شعار الجمهورية العربية السورية"
                className="w-32 h-32 mx-auto filter drop-shadow-lg opacity-90 hover:opacity-100 transition-opacity duration-300"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  // fallback to local logo if remote fails
                  img.src = '/logo.ai.svg';
                }}
              />
            </div>

            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white drop-shadow-sm">
              تتبع الطلبات والاستعلامات
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 drop-shadow-sm">
              تتبع حالة طلبك بطرق متعددة وسهلة
            </p>

            {/* التبديل بين وضع التتبع المفرد والمتعدد */}
            <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl max-w-md mx-auto mt-6">
              <button
                onClick={() => {
                  setTrackingMode('single');
                  setTrackedTickets([]);
                  setFoundTicket(null);
                  setSearchError('');
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${trackingMode === 'single'
                    ? 'bg-white dark:bg-gray-700 text-[#002623] dark:text-green-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                تتبع طلب واحد
              </button>
              <button
                onClick={() => {
                  setTrackingMode('multiple');
                  setFoundTicket(null);
                  setSearchError('');
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${trackingMode === 'multiple'
                    ? 'bg-white dark:bg-gray-700 text-[#002623] dark:text-green-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                تتبع طلبات متعددة ({trackedTickets.length})
              </button>
            </div>
          </div>

          {/* خيارات طرق البحث */}
          <div className="max-w-4xl mx-auto space-y-8">
            {/* شريط التبديل بين طرق البحث */}
            <div className="flex flex-wrap gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl max-w-2xl mx-auto">
              <button
                onClick={() => {
                  setSearchMethod('manual');
                  stopCamera();
                  setSearchError('');
                }}
                className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${searchMethod === 'manual'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-[0.98]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                إدخال يدوي
              </button>
              <button
                onClick={() => {
                  setSearchMethod('file');
                  stopCamera();
                  setSearchError('');
                }}
                className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${searchMethod === 'file'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-[0.98]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                رفع رمز التتبع
              </button>
              <button
                onClick={() => {
                  setSearchMethod('camera');
                  setSearchError('');
                }}
                className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${searchMethod === 'camera'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-[0.98]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                كاميرا
              </button>
            </div>

            {/* البحث اليدوي */}
            {searchMethod === 'manual' && (
              <div className="max-w-md mx-auto space-y-6">
                {/* خيارات نوع البحث */}
                <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <button
                    onClick={() => {
                      setSearchType('id');
                      setSearchError('');
                      setSearchResults([]);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${searchType === 'id'
                        ? 'bg-white dark:bg-gray-700 text-[#002623] dark:text-green-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                  >
                    رقم الطلب
                  </button>
                  <button
                    onClick={() => {
                      setSearchType('name');
                      setSearchError('');
                      setSearchResults([]);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${searchType === 'name'
                        ? 'bg-white dark:bg-gray-700 text-[#002623] dark:text-green-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                  >
                    الاسم
                  </button>
                  <button
                    onClick={() => {
                      setSearchType('nationalId');
                      setSearchError('');
                      setSearchResults([]);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${searchType === 'nationalId'
                        ? 'bg-white dark:bg-gray-700 text-[#002623] dark:text-green-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                  >
                    الرقم الوطني
                  </button>
                </div>

                {/* حقل البحث حسب النوع */}
                {searchType === 'id' && (
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="أدخل رقم الطلب"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="text-center h-14 text-lg rounded-2xl border-2 focus:border-blue-500 transition-all duration-200"
                    />
                    <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-gray-900 text-sm text-gray-500">
                      مثال: ALF-20250912-001-ABC123
                    </div>
                  </div>
                )}

                {searchType === 'name' && (
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="أدخل الاسم الكامل"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="text-center h-14 text-lg rounded-2xl border-2 focus:border-blue-500 transition-all duration-200"
                    />
                    <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-gray-900 text-sm text-gray-500">
                      مثال: محمد أحمد الخطيب
                    </div>
                  </div>
                )}

                {searchType === 'nationalId' && (
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="أدخل الرقم الوطني (11 رقم)"
                      value={searchNationalId}
                      onChange={(e) => setSearchNationalId(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      maxLength={11}
                      className="text-center h-14 text-lg rounded-2xl border-2 focus:border-blue-500 transition-all duration-200"
                    />
                    <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-gray-900 text-sm text-gray-500">
                      مثال: 01234567890
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSearch}
                  className="w-full h-14 text-lg rounded-2xl bg-[#002623] hover:bg-[#003833] text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                  disabled={isProcessing || (
                    searchType === 'id' && !searchId.trim() ||
                    searchType === 'name' && !searchName.trim() ||
                    searchType === 'nationalId' && !searchNationalId.trim()
                  )}
                >
                  {trackingMode === 'single' ? 'البحث عن الطلب' : 'إضافة طلب للتتبع'}
                </Button>
              </div>
            )}

            {/* رفع رمز التتبع */}
            {searchMethod === 'file' && (
              <div className="max-w-lg mx-auto space-y-6">
                <div
                  className={`relative overflow-hidden rounded-3xl transition-all duration-300 ${isDragging
                      ? 'border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/20 transform scale-[1.02]'
                      : 'border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                    } ${isProcessing ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="p-12 text-center">
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl transition-all duration-300 ${isProcessing
                        ? 'bg-blue-100 dark:bg-blue-900/40 animate-pulse'
                        : isDragging
                          ? 'bg-blue-100 dark:bg-blue-900/40 transform rotate-12'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}>
                      <div className={`transition-transform duration-300 ${isDragging ? 'scale-125' : ''}`}>
                        {isProcessing ? '⟳' : '⬆'}
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
                      {isProcessing
                        ? 'جاري معالجة الملف'
                        : isDragging
                          ? 'أفلت الملف هنا'
                          : 'رفع رمز التتبع'
                      }
                    </h3>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {isProcessing
                        ? 'يرجى الانتظار حتى انتهاء المعالجة'
                        : 'اسحب الملف هنا أو اضغط لاختيار ملف من جهازك'
                      }
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isProcessing}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="px-8 py-4 bg-[#002623] hover:bg-[#003833] text-white font-medium rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                    >
                      {isProcessing ? 'جاري المعالجة...' : 'اختيار ملف'}
                    </button>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">الملفات المدعومة</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs">JPG</span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs">PNG</span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs">GIF</span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs">PDF</span>
                  </div>
                </div>
              </div>
            )}

            {/* الكاميرا */}
            {searchMethod === 'camera' && (
              <div className="max-w-lg mx-auto space-y-6">
                {!showCamera ? (
                  <div className="text-center p-12 rounded-3xl bg-gradient-to-bl from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-100 dark:border-green-800">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-bl from-green-500 to-emerald-500 flex items-center justify-center text-white text-4xl">
                      �
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
                      مسح رمز QR بالكاميرا
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      استخدم كاميرا جهازك لمسح رمز QR الموجود على إيصال الطلب
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-8 py-4 bg-[#002623] hover:bg-[#003833] text-white font-medium rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      تشغيل الكاميرا
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full aspect-video object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      {/* إطار مساعد للتصويب */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative">
                          <div className="w-64 h-64 border-4 border-white rounded-3xl shadow-lg">
                            <div className="absolute -top-2 -left-2 w-8 h-8 border-l-4 border-t-4 border-blue-400 rounded-tl-2xl"></div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 border-r-4 border-t-4 border-blue-400 rounded-tr-2xl"></div>
                            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-4 border-b-4 border-blue-400 rounded-bl-2xl"></div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-4 border-b-4 border-blue-400 rounded-br-2xl"></div>
                          </div>
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={stopCamera}
                        className="px-8 py-4 bg-[#002623] hover:bg-[#003833] text-white font-medium rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                      >
                        إيقاف الكاميرا
                      </button>
                    </div>

                    <div className="text-center space-y-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                      <h4 className="font-medium text-blue-800 dark:text-blue-300">تعليمات الاستخدام</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400">وجه الكاميرا نحو رمز QR</p>
                      <p className="text-xs text-blue-600 dark:text-blue-500">سيتم المسح تلقائياً عند اكتشاف الكود</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* نتيجة البحث المباشر */}
            {searchId && !foundTicket && (
              <div className="text-center max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-l from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl border border-green-200 dark:border-green-700">
                  <p className="text-blue-800 dark:text-blue-300 font-medium">الكود المقروء</p>
                  <p className="font-mono text-sm text-blue-600 dark:text-blue-400 mt-1 break-all">{searchId}</p>
                </div>
              </div>
            )}

            {searchError && (
              <div className="text-center max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-l from-red-100 to-red-50 dark:from-red-800/20 dark:to-red-900/20 rounded-2xl border border-red-200 dark:border-red-700">
                  <p className="text-red-600 dark:text-red-400 font-medium">{searchError}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* عرض نتائج البحث المتعددة */}
        {searchResults.length > 0 && (
          <Card className="overflow-hidden shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-white/20 dark:border-gray-700/20">
            <div className="bg-[#002623]/90 backdrop-blur-sm p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">نتائج البحث</h2>
                  <p className="text-green-100">تم العثور على {searchResults.length} طلب</p>
                </div>
                <Button
                  onClick={() => {
                    setSearchResults([]);
                    setSearchName('');
                    setSearchNationalId('');
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm"
                >
                  مسح النتائج
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {searchResults.map((ticket, index) => (
                <div 
                  key={ticket.id} 
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/50 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setFoundTicket(ticket);
                    setSearchResults([]);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-[#002623] text-white px-3 py-1 rounded-full text-xs font-medium">
                          #{index + 1}
                        </span>
                        <span className="font-mono text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                          {ticket.id}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                          {getStatusInArabic(ticket.status)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{ticket.fullName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">الرقم الوطني: {ticket.nationalId}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">نوع الطلب: {ticket.requestType}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        تاريخ التقديم: {formatArabicDate(ticket.submissionDate)}
                      </p>
                    </div>
                  </div>

                  {ticket.response && (
                    <div className="mt-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-700">
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">الرد:</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">{ticket.response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* عرض الطلبات المتتبعة في الوضع المتعدد */}
        {trackingMode === 'multiple' && trackedTickets.length > 0 && (
          <Card className="overflow-hidden shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-white/20 dark:border-gray-700/20">
            <div className="bg-[#002623]/90 backdrop-blur-sm p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">الطلبات المتتبعة</h2>
                  <p className="text-green-100">يتم تتبع {trackedTickets.length} طلب حالياً</p>
                </div>
                <Button
                  onClick={clearAllTrackedTickets}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm"
                >
                  مسح الكل
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {trackedTickets.map((ticket, index) => (
                <div key={ticket.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-[#002623] text-white px-3 py-1 rounded-full text-xs font-medium">
                          #{index + 1}
                        </span>
                        <span className="font-mono text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                          {ticket.id}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${ticket.status === 'New' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                            ticket.status === 'InProgress' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                              ticket.status === 'Answered' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                          }`}>
                          {ticket.status === 'New' ? 'جديد' :
                            ticket.status === 'InProgress' ? 'قيد المعالجة' :
                              ticket.status === 'Answered' ? 'تم الرد' :
                                'مغلق'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{ticket.subject}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">القسم: {ticket.department}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        تاريخ التقديم: {formatArabicDate(ticket.submissionDate)}
                      </p>
                    </div>
                    <Button
                      onClick={() => removeTrackedTicket(ticket.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 px-3 py-2 rounded-lg text-sm"
                    >
                      إزالة
                    </Button>
                  </div>

                  {ticket.response && (
                    <div className="mt-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-700">
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">الرد:</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">{ticket.response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* رسالة عدم وجود طلبات في الوضع المتعدد */}
        {trackingMode === 'multiple' && trackedTickets.length === 0 && (
          <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-white/20 dark:border-gray-700/20">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                لا توجد طلبات متتبعة
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                استخدم نموذج البحث أعلاه لإضافة طلبات للتتبع
              </p>
            </div>
          </Card>
        )}

        {foundTicket && trackingMode === 'single' && (
          <Card className="overflow-hidden shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-white/20 dark:border-gray-700/20">
            <div className="bg-[#002623]/90 backdrop-blur-sm p-6 text-center text-white">
              <h2 className="text-2xl font-bold mb-2">تم العثور على الطلب</h2>
              <p className="text-green-100">جميع تفاصيل طلبك متوفرة أدناه</p>
            </div>

            {/* Timeline للحالة */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">مسار الطلب</h3>
              <TicketTimeline
                steps={[
                  {
                    id: 'submitted',
                    title: 'استلام الطلب',
                    date: new Date(foundTicket.submissionDate),
                    status: 'completed',
                    icon: '📝'
                  },
                  {
                    id: 'processing',
                    title: 'قيد المعالجة',
                    date: foundTicket.startedAt ? new Date(foundTicket.startedAt) : undefined,
                    status: foundTicket.status === 'New' ? 'pending' : 
                            foundTicket.status === 'InProgress' ? 'current' : 'completed',
                    icon: '⚙️'
                  },
                  {
                    id: 'answered',
                    title: 'الرد النهائي',
                    date: foundTicket.answeredAt ? new Date(foundTicket.answeredAt) : undefined,
                    status: (foundTicket.status === 'Answered' || foundTicket.status === 'Closed') ? 'completed' : 'pending',
                    icon: '✅'
                  }
                ]}
                orientation="horizontal"
              />
            </div>

            <div className="p-8">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* العمود الأول */}
                <div className="space-y-6">
                  <div className="group">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">رقم الطلب</h3>
                    <p className="text-lg font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-700">
                      {foundTicket.id}
                    </p>
                  </div>

                  <div className="group">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">الحالة</h3>
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(foundTicket.status)}`}>
                      {getStatusInArabic(foundTicket.status)}
                    </span>
                  </div>

                  <div className="group">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">القسم المختص</h3>
                    <p className="text-lg text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                      {foundTicket.department}
                    </p>
                  </div>

                  <div className="group">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">تاريخ التقديم</h3>
                    <p className="text-lg text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                      {formatArabicDate(foundTicket.submissionDate)}
                    </p>
                  </div>
                </div>

                {/* العمود الثاني */}
                <div className="space-y-6">
                  <div className="group">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">موضوع الطلب</h3>
                    <p className="text-lg text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                      {foundTicket.subject}
                    </p>
                  </div>

                  <div className="group">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">تفاصيل الطلب</h3>
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl leading-relaxed">
                      {foundTicket.description}
                    </p>
                  </div>

                  {foundTicket.response && (
                    <div className="group">
                      <div className="bg-gradient-to-bl from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-700">
                        <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                          الرد الرسمي
                        </h3>
                        <p className="text-green-700 dark:text-green-300 leading-relaxed mb-3">
                          {foundTicket.response}
                        </p>
                        {foundTicket.answeredAt && (
                          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                            تاريخ الرد: {formatArabicDate(foundTicket.answeredAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center bg-gradient-to-l from-black to-green-700 dark:from-gray-100 dark:to-green-300 bg-clip-text text-transparent">
            إحصائيات سريعة
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-gradient-to-bl from-green-100 to-green-50 dark:from-green-800/30 dark:to-green-900/20 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-200 dark:border-green-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-full"></div>
                </div>
                <span className="text-blue-600 dark:text-blue-400 font-medium text-sm bg-blue-100 dark:bg-blue-800 px-3 py-1 rounded-full">
                  المجموع
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatArabicNumber(tickets?.length || 0)}
                </h3>
                <p className="text-blue-700 dark:text-blue-300 font-medium">إجمالي الطلبات</p>
                <p className="text-xs text-blue-500 dark:text-blue-400">
                  آخر طلب: {tickets && tickets.length > 0 ?
                    formatArabicDate(new Date(Math.max(...tickets.map(t => new Date(t.submissionDate).getTime())))) :
                    'لا توجد طلبات'
                  }
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-bl from-gray-100 to-gray-50 dark:from-gray-800/30 dark:to-gray-900/20 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-full animate-pulse"></div>
                </div>
                <span className="text-orange-600 dark:text-orange-400 font-medium text-sm bg-orange-100 dark:bg-orange-800 px-3 py-1 rounded-full">
                  قيد المعالجة
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {formatArabicNumber(tickets?.filter(t => t.status === 'InProgress').length || 0)}
                </h3>
                <p className="text-orange-700 dark:text-orange-300 font-medium">طلبات معلقة</p>
                <p className="text-xs text-orange-500 dark:text-orange-400">
                  آخر تحديث: {(() => {
                    const inProgressTickets = tickets?.filter(t => t.status === 'InProgress');
                    if (inProgressTickets && inProgressTickets.length > 0) {
                      const latestUpdate = Math.max(...inProgressTickets.map(t =>
                        new Date(t.startedAt || t.submissionDate).getTime()
                      ));
                      return formatArabicDate(new Date(latestUpdate));
                    }
                    return 'لا توجد';
                  })()}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-200 dark:border-green-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center">
                  <div className="w-8 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-green-600 dark:text-green-400 font-medium text-sm bg-green-100 dark:bg-green-800 px-3 py-1 rounded-full">
                  مكتملة
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatArabicNumber(tickets?.filter(t => t.status === 'Answered').length || 0)}
                </h3>
                <p className="text-green-700 dark:text-green-300 font-medium">تم الرد عليها</p>
                <p className="text-xs text-green-500 dark:text-green-400">
                  آخر رد: {(() => {
                    const answeredTickets = tickets?.filter(t => t.status === 'Answered' && t.answeredAt);
                    if (answeredTickets && answeredTickets.length > 0) {
                      const latestAnswer = Math.max(...answeredTickets.map(t =>
                        new Date(t.answeredAt!).getTime()
                      ));
                      return formatArabicDate(new Date(latestAnswer));
                    }
                    return 'لا توجد';
                  })()}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-lg"></div>
                </div>
                <span className="text-purple-600 dark:text-purple-400 font-medium text-sm bg-purple-100 dark:bg-purple-800 px-3 py-1 rounded-full">
                  اليوم
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {formatArabicNumber(tickets?.filter(t => {
                    const today = new Date();
                    const ticketDate = new Date(t.submissionDate);
                    return ticketDate.toDateString() === today.toDateString();
                  }).length || 0)}
                </h3>
                <p className="text-purple-700 dark:text-purple-300 font-medium">طلبات اليوم</p>
                <p className="text-xs text-purple-500 dark:text-purple-400">
                  التاريخ: {formatArabicDate(new Date())}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/30 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-teal-200 dark:border-teal-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-teal-600 dark:text-teal-400 font-medium text-sm bg-teal-100 dark:bg-teal-800 px-3 py-1 rounded-full">
                  الزمن
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                  {(() => {
                    const answeredTickets = tickets?.filter(t => t.status === 'Answered' && t.answeredAt && t.submissionDate);
                    if (!answeredTickets || answeredTickets.length === 0) return '—';

                    const totalResponseTime = answeredTickets.reduce((sum, ticket) => {
                      const submissionTime = new Date(ticket.submissionDate).getTime();
                      const answerTime = new Date(ticket.answeredAt!).getTime();
                      const diffInHours = (answerTime - submissionTime) / (1000 * 60 * 60);
                      return sum + diffInHours;
                    }, 0);

                    const avgResponseTime = totalResponseTime / answeredTickets.length;

                    if (avgResponseTime < 24) {
                      return formatArabicNumber(Math.round(avgResponseTime)) + 'س';
                    } else {
                      return formatArabicNumber(Math.round(avgResponseTime / 24)) + 'ي';
                    }
                  })()}
                </h3>
                <p className="text-teal-700 dark:text-teal-300 font-medium">متوسط الاستجابة</p>
                <p className="text-xs text-teal-500 dark:text-teal-400">
                  {(() => {
                    const answeredTickets = tickets?.filter(t => t.status === 'Answered' && t.answeredAt);
                    if (!answeredTickets || answeredTickets.length === 0) return 'لا توجد بيانات';
                    return `من ${formatArabicNumber(answeredTickets.length)} طلب مجاب`;
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackRequestPageSimple;