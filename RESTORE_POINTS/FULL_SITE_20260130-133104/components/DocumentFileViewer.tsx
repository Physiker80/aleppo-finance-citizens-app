import React, { useState } from 'react';
import { FiDownload, FiEye, FiFile, FiImage, FiFileText, FiFilm, FiMusic, FiX } from 'react-icons/fi';
import Card from './ui/Card';
import Button from './ui/Button';

interface DocumentFile {
  name: string;
  size: number;
  type: string;
  data?: string; // Base64 data for localStorage files
  url?: string; // URL for direct file links
}

interface DocumentFileViewerProps {
  files: DocumentFile[];
  title?: string;
  className?: string;
}

const DocumentFileViewer: React.FC<DocumentFileViewerProps> = ({
  files = [],
  title = "الملفات المرفقة",
  className = ""
}) => {
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // تحديد نوع الملف وأيقونته
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <span className="text-blue-600"><FiImage /></span>;
    if (type.startsWith('video/')) return <span className="text-purple-600"><FiFilm /></span>;
    if (type.startsWith('audio/')) return <span className="text-green-600"><FiMusic /></span>;
    if (type.includes('pdf')) return <span className="text-red-600"><FiFileText /></span>;
    if (type.includes('word') || type.includes('document')) return <span className="text-blue-700"><FiFileText /></span>;
    if (type.includes('excel') || type.includes('spreadsheet')) return <span className="text-green-700"><FiFileText /></span>;
    if (type.includes('powerpoint') || type.includes('presentation')) return <span className="text-orange-600"><FiFileText /></span>;
    return <span className="text-gray-600"><FiFile /></span>;
  };

  // تنسيق حجم الملف
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلو بايت', 'ميجا بايت', 'جيجا بايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // تحميل الملف
  const downloadFile = (file: DocumentFile) => {
    try {
      let blob: Blob;
      let url: string;

      if (file.data) {
        // Base64 data from localStorage
        const binaryString = atob(file.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: file.type });
        url = URL.createObjectURL(blob);
      } else if (file.url) {
        // Direct URL
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } else {
        console.warn('لا يمكن تحميل الملف - لا توجد بيانات');
        return;
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('خطأ في تحميل الملف:', error);
      alert('حدث خطأ أثناء تحميل الملف');
    }
  };

  // معاينة الملف
  const previewFile = (file: DocumentFile) => {
    setSelectedFile(file);
    setIsModalOpen(true);
  };

  // إغلاق نافذة المعاينة
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
  };

  // عرض محتوى المعاينة
  const renderPreview = () => {
    if (!selectedFile) return null;

    try {
      if (selectedFile.type.startsWith('image/')) {
        const src = selectedFile.data 
          ? `data:${selectedFile.type};base64,${selectedFile.data}`
          : selectedFile.url;
        return (
          <img 
            src={src} 
            alt={selectedFile.name} 
            className="max-w-full max-h-96 object-contain mx-auto rounded"
            onError={() => alert('خطأ في تحميل الصورة')}
          />
        );
      }

      if (selectedFile.type.includes('pdf')) {
        const src = selectedFile.data 
          ? `data:${selectedFile.type};base64,${selectedFile.data}`
          : selectedFile.url;
        return (
          <iframe 
            src={src} 
            className="w-full h-96 border rounded"
            title={selectedFile.name}
          />
        );
      }

      if (selectedFile.type.startsWith('text/')) {
        if (selectedFile.data) {
          const text = atob(selectedFile.data);
          return (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded border max-h-96 overflow-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono text-right">
                {text}
              </pre>
            </div>
          );
        }
      }

      // للملفات الأخرى
      return (
        <div className="text-center p-8">
          <div className="text-6xl mb-4 text-gray-400">
            {getFileIcon(selectedFile.type)}
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            لا يمكن معاينة هذا النوع من الملفات
          </p>
          <Button
            onClick={() => downloadFile(selectedFile)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <span className="inline-block ml-2"><FiDownload /></span>
            تحميل الملف
          </Button>
        </div>
      );
    } catch (error) {
      return (
        <div className="text-center p-8">
          <p className="text-red-600 mb-4">خطأ في معاينة الملف</p>
          <Button
            onClick={() => downloadFile(selectedFile)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <span className="inline-block ml-2"><FiDownload /></span>
            تحميل الملف
          </Button>
        </div>
      );
    }
  };

  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center">
            <span className="inline-block ml-2"><FiFile /></span>
            {title} ({files.length})
          </h3>
          
          <div className="space-y-3">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="text-2xl">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)} • {file.type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => previewFile(file)}
                    className="flex items-center"
                    title="معاينة"
                  >
                    <FiEye />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => downloadFile(file)}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white"
                    title="تحميل"
                  >
                    <FiDownload />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* نافذة المعاينة */}
      {isModalOpen && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="text-right flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {selectedFile.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse mr-4">
                <Button
                  size="sm"
                  onClick={() => downloadFile(selectedFile)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <span className="inline-block ml-1"><FiDownload /></span>
                  تحميل
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={closeModal}
                  className="flex items-center"
                >
                  <span className="inline-block ml-1"><FiX /></span>
                  إغلاق
                </Button>
              </div>
            </div>
            
            <div className="p-4">
              {renderPreview()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentFileViewer;