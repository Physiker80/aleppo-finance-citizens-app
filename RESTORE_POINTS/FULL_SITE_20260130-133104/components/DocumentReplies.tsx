import React, { useState, useContext } from 'react';
import { FiMessageSquare, FiSend, FiPaperclip, FiX, FiUser, FiClock, FiArrowRight, FiRefreshCcw } from 'react-icons/fi';
import Card from './ui/Card';
import Button from './ui/Button';
import TextArea from './ui/TextArea';
import { DocumentReply, DocumentReplyAttachment } from '../types';

interface DocumentRepliesProps {
  documentId: string;
  replies?: DocumentReply[];
  onAddReply: (reply: Omit<DocumentReply, 'id' | 'timestamp'>) => void;
  className?: string;
  currentEmployee?: {
    name: string;
    department: string;
  };
}

const DocumentReplies: React.FC<DocumentRepliesProps> = ({
  documentId,
  replies = [],
  onAddReply,
  className = "",
  currentEmployee
}) => {
  const [isReplyFormOpen, setIsReplyFormOpen] = useState(false);
  const [replyType, setReplyType] = useState<'reply' | 'comment' | 'forward'>('reply');
  const [replyContent, setReplyContent] = useState('');
  const [forwardToDepartment, setForwardToDepartment] = useState('');
  const [attachments, setAttachments] = useState<DocumentReplyAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // قائمة الأقسام المتاحة
  const availableDepartments = [
    'قسم الإدارة العامة',
    'قسم الدخل',
    'قسم كبار ومتوسطي المكلفين',
    'قسم المتابعة وإدارة الديون',
    'قسم الواردات',
    'قسم الرقابة الداخلية',
    'قسم المعلوماتية',
    'قسم التنمية الإدارية',
    'قسم الاستعلام',
    'قسم الخزينة'
  ];

  // تحويل الملف إلى Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // رفع الملفات
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;

    try {
      const newAttachments: DocumentReplyAttachment[] = [];
      
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { // 10MB max
          alert(`الملف ${file.name} كبير جداً (الحد الأقصى 10 ميجابايت)`);
          continue;
        }

        const base64Data = await fileToBase64(file);
        newAttachments.push({
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64Data
        });
      }

      setAttachments([...attachments, ...newAttachments]);
    } catch (error) {
      console.error('خطأ في رفع الملف:', error);
      alert('حدث خطأ أثناء رفع الملف');
    }
  };

  // إزالة المرفق
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // تنسيق حجم الملف
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلو بايت', 'ميجا بايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // إرسال الرد
  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {
      alert('يرجى كتابة محتوى الرد أو التعليق');
      return;
    }

    if (replyType === 'forward' && !forwardToDepartment) {
      alert('يرجى اختيار القسم المحول إليه');
      return;
    }

    if (!currentEmployee) {
      alert('يجب تسجيل الدخول لإضافة رد');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const newReply: Omit<DocumentReply, 'id' | 'timestamp'> = {
        documentId,
        authorName: currentEmployee.name,
        authorDepartment: currentEmployee.department,
        type: replyType,
        content: replyContent,
        forwardTo: replyType === 'forward' ? forwardToDepartment : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        isRead: false
      };

      await onAddReply(newReply);

      // إعادة تعيين النموذج
      setReplyContent('');
      setForwardToDepartment('');
      setAttachments([]);
      setIsReplyFormOpen(false);

    } catch (error) {
      console.error('خطأ في إرسال الرد:', error);
      alert('حدث خطأ أثناء إرسال الرد');
    } finally {
      setIsSubmitting(false);
    }
  };

  // تنسيق التاريخ
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ar-SY-u-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // أيقونة نوع الرد
  const getReplyTypeIcon = (type: string) => {
    switch (type) {
      case 'reply':
        return <span className="text-blue-600"><FiRefreshCcw /></span>;
      case 'comment':
        return <span className="text-green-600"><FiMessageSquare /></span>;
      case 'forward':
        return <span className="text-orange-600"><FiArrowRight /></span>;
      default:
        return <span className="text-gray-600"><FiMessageSquare /></span>;
    }
  };

  // نص نوع الرد
  const getReplyTypeText = (type: string) => {
    switch (type) {
      case 'reply': return 'رد';
      case 'comment': return 'تعليق';
      case 'forward': return 'تحويل';
      default: return 'رد';
    }
  };

  return (
    <div className={className}>
      <Card>
        <div className="p-4">
          {/* عنوان القسم */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <span className="inline-block ml-2"><FiMessageSquare /></span>
              الردود والتعليقات ({replies.length})
            </h3>
            
            <Button
              onClick={() => setIsReplyFormOpen(!isReplyFormOpen)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <span className="inline-block ml-2"><FiSend /></span>
              {isReplyFormOpen ? 'إلغاء' : 'إضافة رد'}
            </Button>
          </div>

          {/* نموذج إضافة رد */}
          {isReplyFormOpen && (
            <Card className="mb-4 border-2 border-blue-200 dark:border-blue-800">
              <div className="p-4">
                <h4 className="font-bold mb-3 text-gray-900 dark:text-gray-100">إضافة رد أو تعليق</h4>
                
                {/* نوع الرد */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    onClick={() => setReplyType('reply')}
                    className={`p-2 rounded border transition ${replyType === 'reply' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <span className="inline-block ml-1"><FiRefreshCcw /></span>
                    رد رسمي
                  </button>
                  <button
                    onClick={() => setReplyType('comment')}
                    className={`p-2 rounded border transition ${replyType === 'comment' ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <span className="inline-block ml-1"><FiMessageSquare /></span>
                    تعليق
                  </button>
                  <button
                    onClick={() => setReplyType('forward')}
                    className={`p-2 rounded border transition ${replyType === 'forward' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <span className="inline-block ml-1"><FiArrowRight /></span>
                    تحويل
                  </button>
                </div>

                {/* اختيار القسم للتحويل */}
                {replyType === 'forward' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      تحويل إلى القسم:
                    </label>
                    <select
                      value={forwardToDepartment}
                      onChange={(e) => setForwardToDepartment(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">اختر القسم...</option>
                      {availableDepartments
                        .filter(dept => dept !== currentEmployee?.department)
                        .map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                  </div>
                )}

                {/* محتوى الرد */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {replyType === 'reply' ? 'نص الرد:' : 
                     replyType === 'comment' ? 'التعليق:' : 
                     'ملاحظات التحويل:'}
                  </label>
                  <TextArea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`أدخل ${getReplyTypeText(replyType)} هنا...`}
                    rows={4}
                    className="w-full"
                    dir="rtl"
                  />
                </div>

                {/* المرفقات */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المرفقات:
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="file"
                      id="reply-attachments"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      as="label"
                      htmlFor="reply-attachments"
                      variant="secondary"
                      className="cursor-pointer"
                    >
                      <span className="inline-block ml-2"><FiPaperclip /></span>
                      إرفاق ملفات
                    </Button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      (الحد الأقصى 10 ميجابايت لكل ملف)
                    </span>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((attachment, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border"
                        >
                          <div className="text-sm">
                            <span className="font-medium">{attachment.name}</span>
                            <span className="text-gray-500 dark:text-gray-400 mr-2">
                              ({formatFileSize(attachment.size)})
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => removeAttachment(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <FiX />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitReply}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? 'جاري الإرسال...' : 
                     replyType === 'forward' ? 'تحويل' : 'إرسال'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsReplyFormOpen(false);
                      setReplyContent('');
                      setAttachments([]);
                      setForwardToDepartment('');
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* قائمة الردود */}
          <div className="space-y-4">
            {replies.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <span className="inline-block text-4xl mb-2"><FiMessageSquare /></span>
                <p>لا توجد ردود أو تعليقات بعد</p>
                <p className="text-sm mt-1">كن أول من يضيف رد أو تعليق</p>
              </div>
            ) : (
              replies
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((reply) => (
                  <Card key={reply.id} className="border-r-4 border-r-blue-500">
                    <div className="p-4">
                      {/* رأس الرد */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <span className="text-2xl">{getReplyTypeIcon(reply.type)}</span>
                          <div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <span className="font-bold text-gray-900 dark:text-gray-100">
                                {reply.authorName}
                              </span>
                              <span className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {getReplyTypeText(reply.type)}
                              </span>
                              {reply.forwardTo && (
                                <span className="text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                                  إلى: {reply.forwardTo}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500 dark:text-gray-400 mt-1">
                              <span className="inline-block"><FiUser /></span>
                              <span>{reply.authorDepartment}</span>
                              <span>•</span>
                              <span className="inline-block"><FiClock /></span>
                              <span>{formatDate(reply.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* محتوى الرد */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded border-r-2 border-r-gray-300 dark:border-r-gray-600 mb-3">
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-right">
                          {reply.content}
                        </p>
                      </div>

                      {/* المرفقات */}
                      {reply.attachments && reply.attachments.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            المرفقات ({reply.attachments.length}):
                          </p>
                          <div className="space-y-2">
                            {reply.attachments.map((attachment, index) => (
                              <div 
                                key={index}
                                className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                              >
                                <div className="text-sm">
                                  <span className="font-medium">{attachment.name}</span>
                                  <span className="text-gray-500 dark:text-gray-400 mr-2">
                                    ({formatFileSize(attachment.size)})
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    // تحميل المرفق
                                    try {
                                      const binaryString = atob(attachment.data);
                                      const bytes = new Uint8Array(binaryString.length);
                                      for (let i = 0; i < binaryString.length; i++) {
                                        bytes[i] = binaryString.charCodeAt(i);
                                      }
                                      const blob = new Blob([bytes], { type: attachment.type });
                                      const url = URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = attachment.name;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      URL.revokeObjectURL(url);
                                    } catch (error) {
                                      console.error('خطأ في تحميل المرفق:', error);
                                      alert('حدث خطأ أثناء تحميل المرفق');
                                    }
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                >
                                  تحميل
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DocumentReplies;