// أداة تسجيل خط الأميري (Amiri) وخط فسطاط (Fustat) في jsPDF واستخدامه في مستندات PDF
// ضع ملفات الخطوط داخل المسار: public/fonts/

let fontsPromise: Promise<void> | null = null;

/**
 * تحميل الخط من public (بدون CORS مع Vite) ثم تسجيله داخل jsPDF VFS.
 * يتم تنفيذ العملية مرة واحدة فقط (Memoized).
 */
export const ensureFontsRegistered = async () => {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    try {
      const { jsPDF } = await import('jspdf');
      
      // تحميل خط الأميري (Amiri) - الأساسي للنصوص العربية
      try {
        const amiriUrl = '/fonts/Amiri-Regular.ttf';
        const res = await fetch(amiriUrl);
        if (res.ok) {
          const blob = await res.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = arrayBufferToBase64(arrayBuffer);
          
          // @ts-ignore access to static API
          if (jsPDF.API.events && jsPDF.API.events.push) {
             // For older jsPDF versions or specific setups
          }
          
          // @ts-ignore
          jsPDF.API.addFileToVFS('Amiri-Regular.ttf', base64);
          // @ts-ignore
          jsPDF.API.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
          console.log('تم تحميل خط Amiri بنجاح');
        } else {
          console.warn('ملف خط Amiri غير موجود في', amiriUrl);
        }
      } catch (e) {
        console.warn('فشل في تحميل خط Amiri:', e);
      }

      // محاولة تحميل خط Fustat (اختياري)
      try {
        const fustatUrl = '/fonts/Fustat-Regular.ttf';
        const res = await fetch(fustatUrl);
        if (res.ok) {
          const blob = await res.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = arrayBufferToBase64(arrayBuffer);
          
          // @ts-ignore
          jsPDF.API.addFileToVFS('Fustat-Regular.ttf', base64);
          // @ts-ignore
          jsPDF.API.addFont('Fustat-Regular.ttf', 'Fustat', 'normal');
          console.log('تم تحميل خط Fustat بنجاح');
        }
      } catch (e) {
        // تجاهل الخطأ لأن Fustat قد لا يكون متوفراً
      }
      
    } catch (e) {
      console.warn('تعذر تهيئة الخطوط في jsPDF:', e);
    }
  })();
  return fontsPromise;
};

/**
 * تحميل الخطوط إلى المستند (Browser Document) لاستخدامها في Canvas
 */
export const loadFontsIntoDocument = async () => {
  try {
    if ('fonts' in document) {
      const fontName = 'Amiri';
      const fontUrl = '/fonts/Amiri-Regular.ttf';
      
      // التحقق مما إذا كان الخط محملاً بالفعل
      if (document.fonts.check(`12px "${fontName}"`)) {
        return true;
      }

      const font = new FontFace(fontName, `url(${fontUrl})`);
      await font.load();
      document.fonts.add(font);
      console.log('تم تحميل خط Amiri إلى المستند بنجاح');
      return true;
    }
    return false;
  } catch (error) {
    console.warn('فشل في تحميل الخط إلى المستند:', error);
    return false;
  }
};

// @deprecated Use ensureFontsRegistered instead
export const ensureFustatRegistered = ensureFontsRegistered;

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * انتظار توافر الخط في نظام المتصفح (للرسم عبر canvas أو html2canvas) قبل الالتقاط.
 * يعيد true عند النجاح أو false عند الفشل بعد مهلة.
 */
export const waitForFustatInDocument = async (timeoutMs = 3000) => {
  if (!(document && (document as any).fonts?.load)) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // محاولة تحميل وزن عادي 400
    await (document as any).fonts.load("400 14px 'Fustat'");
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
};
