import React, { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { FaFileUpload, FaSpinner, FaFilePdf, FaFileWord, FaFileImage } from 'react-icons/fa';
import { useFilePreview } from '../hooks/useFilePreview';

const ToolsPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const preview = useFilePreview(selectedFile);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setOcrResult('');
      setProgress(0);
      setStatus('');
    }
  };

  const performOCR = useCallback(async () => {
    if (!selectedFile) {
      setStatus('الرجاء اختيار ملف أولاً.');
      return;
    }

    setIsLoading(true);
    setOcrResult('');
    setStatus('جاري التحضير...');
    setProgress(0);

  const type = selectedFile.type;
  const isDocx = type.includes('wordprocessingml.document') || selectedFile.name.toLowerCase().endsWith('.docx');

    // For DOCX, extract text directly instead of OCR
    if (isDocx) {
      try {
        setStatus('جارٍ استخراج النص من مستند وورد...');
        const arrayBuffer = await selectedFile.arrayBuffer();
        // @ts-ignore
        const mammothMod = await import('mammoth/mammoth.browser');
        const mammothLib: any = mammothMod.default || mammothMod;
  const { value: text } = await mammothLib.extractRawText({ arrayBuffer });
        setOcrResult(text || '');
        setStatus('تم استخراج النص من ملف الوورد.');
        setProgress(100);
      } catch (error) {
  console.error(error);
        setStatus('تعذر قراءة ملف الوورد.');
        setOcrResult('فشلت عملية القراءة. الرجاء التأكد أن الملف بصيغة DOCX وغير تالف.');
        setProgress(0);
      } finally {
        setIsLoading(false);
      }
      return;
    }

  const worker = await (Tesseract as any).createWorker({
      logger: (m) => {
        const statusMap: { [key: string]: string } = {
          'loading language model': 'جاري تحميل نموذج اللغة',
          'initializing': 'جاري التهيئة',
          'recognizing text': 'جاري قراءة النص',
          'done': 'اكتمل'
        };

        const friendlyStatus = statusMap[m.status] || m.status;
        if (m.status === 'recognizing text' || m.status.startsWith('loading')) {
          setProgress(Math.round((m.progress || 0) * 100));
        }
        setStatus(friendlyStatus);
      },
    });

    try {
  await (worker as any).loadLanguage('ara+eng');
  await (worker as any).initialize('ara+eng');
      setStatus('جاري التعرف على النص...');
      const { data: { text } } = await worker.recognize(selectedFile);
      setOcrResult(text);
      setStatus('اكتملت القراءة بنجاح!');
      setProgress(100);
    } catch (error) {
      console.error(error);
      setStatus('حدث خطأ أثناء قراءة الملف.');
      setOcrResult('فشلت عملية القراءة. يرجى التأكد من أن الملف غير تالف وأن صيغته مدعومة (صور، PDF).');
      setProgress(0);
    } finally {
  await (worker as any).terminate();
      setIsLoading(false);
    }
  }, [selectedFile]);

  const getFileIcon = () => {
    const type = selectedFile?.type;
    if (type?.startsWith('image/')) return <span className="text-blue-500"><FaFileImage /></span>;
    if (type === 'application/pdf') return <span className="text-red-500"><FaFilePdf /></span>;
    if (type?.includes('word')) return <span className="text-blue-700"><FaFileWord /></span>;
    return <span className="text-gray-400"><FaFileUpload /></span>;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8 animate-fade-in-up transition-all duration-300">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 text-center">أداة التعرف الضوئي على الحروف (OCR)</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-center text-lg">
          ارفع ملف صورة أو PDF لقراءة النص الموجود بداخله باللغتين العربية والإنجليزية.
        </p>

        <div className="bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center transition-all duration-300">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept="image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <label htmlFor="file-upload" className={`cursor-pointer ${isLoading ? 'cursor-not-allowed' : ''}`}>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="text-6xl">{getFileIcon()}</div>
              {selectedFile ? (
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              ) : (
                <p className="font-semibold text-gray-700 dark:text-gray-200">اسحب وأفلت ملفاً هنا، أو انقر للاختيار</p>
              )}
            </div>
          </label>
        </div>

        {/* Preview section */}
        {preview && (preview.url || preview.html || preview.error) && (
          <div className="mt-8 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">معاينة الملف</h3>
            {preview.loading && (
              <p className="text-sm text-gray-600 dark:text-gray-300">جاري تجهيز المعاينة...</p>
            )}
            {!preview.loading && preview.kind === 'image' && preview.url && (
              <img src={preview.url} alt="معاينة الصورة" className="max-w-full h-auto rounded" />
            )}
            {!preview.loading && preview.kind === 'pdf' && preview.url && (
              <iframe src={preview.url} title="معاينة PDF" className="w-full h-96 border rounded" />
            )}
            {!preview.loading && preview.kind === 'docx' && (
              <div className="prose prose-sm max-w-none dark:prose-invert bg-white dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 max-h-96 overflow-auto" dangerouslySetInnerHTML={{ __html: preview.html || '' }} />
            )}
            {!preview.loading && preview.kind === 'unsupported' && (
              <p className="text-sm text-gray-600 dark:text-gray-300">لا يمكن معاينة هذا النوع من الملفات.</p>
            )}
            {!preview.loading && preview.error && (
              <p className="text-sm text-red-600 dark:text-red-400">{preview.error}</p>
            )}
            {selectedFile && (
              <div className="text-left mt-3">
                <a href={preview?.url || ''} download={selectedFile.name} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                  تنزيل الملف
                </a>
              </div>
            )}
          </div>
        )}

        <div className="text-center my-6">
          <button
            onClick={performOCR}
            disabled={!selectedFile || isLoading}
            className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center mx-auto"
          >
            {isLoading ? (
              <>
                <span className="animate-spin ltr:mr-2 rtl:ml-2"><FaSpinner /></span>
                جاري المعالجة...
              </>
            ) : (
              'ابدأ قراءة النص'
            )}
          </button>
        </div>

        {isLoading && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full my-4 overflow-hidden">
            <div
              className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-1 leading-none rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            >
             {status} {progress > 0 && `(${progress}%)`}
            </div>
          </div>
        )}

        {!isLoading && status && !ocrResult && (
             <p className="text-center text-sm text-red-500 dark:text-red-400 my-4">{status}</p>
        )}

  {ocrResult && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">النص المستخرج:</h2>
            <div dir="rtl" className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-6 whitespace-pre-wrap text-right font-sans leading-relaxed border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
              {ocrResult}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsPage;
