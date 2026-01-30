// أداة تسجيل خط فسطاط في jsPDF واستخدامه في مستندات PDF
// ضع ملف الخط Fustat-Regular.ttf داخل المسار: public/fonts/Fustat-Regular.ttf
// يمكن لاحقاً إضافة أوزان أخرى (Medium / Bold) بنفس الطريقة.

let fustatPromise: Promise<void> | null = null;

/**
 * تحميل الخط من public (بدون CORS مع Vite) ثم تسجيله داخل jsPDF VFS.
 * يتم تنفيذ العملية مرة واحدة فقط (Memoized).
 */
export const ensureFustatRegistered = async () => {
  if (fustatPromise) return fustatPromise;
  fustatPromise = (async () => {
    try {
      const fontUrl = '/fonts/Fustat-Regular.ttf';
      const res = await fetch(fontUrl);
      if (!res.ok) throw new Error('Font fetch failed');
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      // تحويل إلى Base64
      const base64 = arrayBufferToBase64(arrayBuffer);
      // استيراد jsPDF ديناميكياً ثم إضافة الخط
      const { jsPDF } = await import('jspdf');
      // @ts-ignore access to static API
      jsPDF.API.addFileToVFS('Fustat-Regular.ttf', base64);
      // @ts-ignore addFont signature
      jsPDF.API.addFont('Fustat-Regular.ttf', 'Fustat', 'normal');
    } catch (e) {
      console.warn('تعذر تحميل خط فسطاط، سيتم استخدام الخط الافتراضي.', e);
    }
  })();
  return fustatPromise;
};

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
