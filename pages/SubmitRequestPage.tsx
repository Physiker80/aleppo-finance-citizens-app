import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import FileInput from '../components/ui/FileInput';
import Button from '../components/ui/Button';
import { REQUEST_TYPES, formatArabicNumber } from '../constants';
import { RequestType, Employee } from '../types';
import { useFilePreviews } from '../hooks/useFilePreview';
import { isTicketIdUsed } from '../utils/idGenerator';
import { MultiProgressBar } from '../components/FormEnhancements';

// ===== التصنيف التلقائي للشكاوى =====
interface AutoClassification {
  suggestedDepartment: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  keywords: string[];
}

const classifyTicketAuto = (title: string, description: string): AutoClassification => {
  const text = `${title} ${description}`.toLowerCase();

  const departments: Record<string, string[]> = {
    'ضريبة الدخل': ['ضريبة', 'دخل', 'إقرار', 'تصريح', 'ضريبي'],
    'الرواتب والأجور': ['راتب', 'أجر', 'معاش', 'تعويض', 'مالي'],
    'الديوان العام': ['ديوان', 'إداري', 'رسمي', 'وثيقة'],
    'المعلوماتية': ['نظام', 'تقني', 'موقع', 'إلكتروني', 'تطبيق'],
    'التدقيق': ['تدقيق', 'مراجعة', 'فحص'],
    'الخزينة': ['خزينة', 'دفع', 'سداد', 'مبلغ'],
    'الشكاوى والاستعلامات': ['شكوى', 'استعلام', 'سؤال', 'مساعدة']
  };

  let bestMatch = 'الديوان العام';
  let maxScore = 0;
  let matchedKeywords: string[] = [];

  Object.entries(departments).forEach(([dept, keywords]) => {
    const matches = keywords.filter(k => text.includes(k));
    if (matches.length > maxScore) {
      maxScore = matches.length;
      bestMatch = dept;
      matchedKeywords = matches;
    }
  });

  const urgentWords = ['عاجل', 'طارئ', 'فوري', 'ضروري', 'مستعجل'];
  const isUrgent = urgentWords.some(w => text.includes(w));

  return {
    suggestedDepartment: bestMatch,
    priority: isUrgent ? 'high' : maxScore > 1 ? 'medium' : 'low',
    confidence: Math.min(0.5 + maxScore * 0.15, 0.95),
    keywords: matchedKeywords
  };
};

const SubmitRequestPage: React.FC = () => {
  const appContext = useContext(AppContext);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    nationalId: '',
    requestType: REQUEST_TYPES[0],
    details: '',
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [manualId, setManualId] = useState('');
  const [manualIdError, setManualIdError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmployeeRequest, setIsEmployeeRequest] = useState(false);
  const [matchedEmployee, setMatchedEmployee] = useState<Employee | null>(null);
  
  // Custom Hooks & State
  const previews = useFilePreviews(attachments);
  const [autoClassification, setAutoClassification] = useState<AutoClassification | null>(null);

  // تحديث حالة "طلب موظف" بناءً على الهوية الوطنية أو الاسم
  // تعليمات المستخدم: "لمعرفة الموظفين مراجعة قاعدة البيانات (الاسم أو الرقم)"
  useEffect(() => {
    if (appContext?.isEmployeeLoggedIn) {
      let foundEmp: Employee | null = null;

      // 1. التحقق من الرقم الوطني
      if (formData.nationalId && formData.nationalId.length >= 5) {
        foundEmp = appContext.searchEmployeeByNationalId(formData.nationalId);
      }

      // 2. التحقق من الاسم الكامل (مطابقة تامة)
      if (!foundEmp && formData.fullName && formData.fullName.length >= 3) {
        const matches = appContext.searchEmployeeByName(formData.fullName);
        // نتحقق من تطابق الاسم بالكامل لتجنب التشابه الجزئي
        const exactMatch = matches.find(e => e.name.trim() === formData.fullName.trim());
        if (exactMatch) foundEmp = exactMatch;
      }

      if (foundEmp) {
        setIsEmployeeRequest(true);
        setMatchedEmployee(foundEmp);
      } else {
        setMatchedEmployee(null);
      }
    }
  }, [formData.nationalId, formData.fullName, appContext?.searchEmployeeByNationalId, appContext?.searchEmployeeByName, appContext?.isEmployeeLoggedIn]);


  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_FILES = 5;

  const handleFilesChange = (files: File[] | undefined) => {
    if (!files || files.length === 0) {
      setAttachments([]);
      setError(null);
      return;
    }

    const validFiles: File[] = [];
    let errorMsg = '';

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errorMsg = `الملف "${file.name}" كبير جداً. الحد الأقصى ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`;
        break;
      }
      if (validFiles.length >= MAX_FILES) {
        errorMsg = `يمكن إرفاق ${MAX_FILES} ملفات كحد أقصى`;
        break;
      }
      validFiles.push(file);
    }

    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    setAttachments(validFiles);
    setError(null);
  };

  const removeAttachment = (index: number) => {
    const newFiles = attachments.filter((_, i) => i !== index);
    setAttachments(newFiles);
    if (previewIndex === index) {
      setPreviewIndex(null);
    } else if (previewIndex !== null && previewIndex > index) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  const openPreview = (index: number) => {
    setPreviewIndex(index);
  };

  const closePreview = () => {
    setPreviewIndex(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });

    // التصنيف التلقائي عند كتابة التفاصيل
    if (id === 'details' && value.trim().length >= 10) {
      const classification = classifyTicketAuto(formData.requestType, value);
      setAutoClassification(classification);
    }
  };

  const readableSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.phone || !formData.email || !formData.nationalId || !formData.details) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Store manual ID if provided
    if (manualId && !manualIdError) {
      localStorage.setItem('manualTicketId', manualId);
    }

    setTimeout(async () => {
      // تحديد المصدر بناءً على النتائج
      let source: 'مواطن' | 'موظف' = 'مواطن';
      let department = 'الديوان العام';

      // استخدام القسم المقترح من التصنيف التلقائي إذا وجد
      if (autoClassification?.suggestedDepartment) {
        department = autoClassification.suggestedDepartment;
      }

      if (appContext?.isEmployeeLoggedIn && isEmployeeRequest && appContext?.currentEmployee) {
        // إذا كان الموظف متصل واختار التقديم بصفته الوظيفية
        source = 'موظف';
        department = appContext.currentEmployee.department || department;
      }
      
      const ticketPayload = {
        ...formData,
        requestType: formData.requestType as RequestType,
        department,
        source,
        attachments: attachments.length ? attachments : undefined,
        submissionDate: new Date(),
      };

      try {
        const newTicketId = await appContext?.addTicket(ticketPayload);
        setIsSubmitting(false);
        if (newTicketId) {
          window.location.hash = '#/confirmation';
        }
      } catch (err: any) {
        console.error("Failed to add ticket:", err);
        setError(err.message || "حدث خطأ غير متوقع أثناء إرسال الطلب.");
        setIsSubmitting(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen py-8" style={{
      background: 'url("https://syrian.zone/syid/materials/bg.svg") center/cover',
      backdropFilter: 'blur(0.5px)'
    }}>
      <div className="container mx-auto px-4">
        <Card className="max-w-5xl mx-auto shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-white/30 dark:border-gray-700/30 rounded-3xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-transparent px-8 py-8 border-b border-gray-100 dark:border-gray-700/50">
            <div className="text-center">
              <img
                src="https://syrian.zone/syid/materials/logo.ai.svg"
                alt="Syrian Zone Logo"
                className="mb-6 w-32 h-32 mx-auto filter drop-shadow-lg opacity-90 hover:opacity-100 transition-opacity duration-300"
              />
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 drop-shadow-sm">
                تقديم طلب جديد
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                يرجى ملء البيانات التالية بدقة. الحقول التي تحمل علامة <span className="text-red-500 font-semibold">*</span> إلزامية.
              </p>

              {/* شريط تقدم خطوات التعبئة */}
              <div className="mt-6 max-w-xl mx-auto">
                <MultiProgressBar
                  segments={[
                    {
                      value: formData.fullName && formData.nationalId && formData.phone && formData.email ? 100 :
                        (formData.fullName ? 25 : 0) + (formData.nationalId ? 25 : 0) + (formData.phone ? 25 : 0) + (formData.email ? 25 : 0),
                      color: '#10b981',
                      label: 'البيانات الشخصية'
                    },
                    {
                      value: formData.requestType && formData.details ? 100 : (formData.details ? 50 : 0),
                      color: '#3b82f6',
                      label: 'تفاصيل الطلب'
                    },
                    {
                      value: attachments.length > 0 ? 100 : 0,
                      color: '#8b5cf6',
                      label: 'المرفقات (اختياري)'
                    }
                  ]}
                  height={8}
                  showLabels={true}
                />
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/30">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
                  البيانات الشخصية
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="relative">
                    <Input
                      id="fullName"
                      label="الاسم الكامل *"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-[#002623]/20"
                    />

                  </div>
                  <Input
                    id="nationalId"
                    label="الرقم الوطني *"
                    value={formData.nationalId}
                    onChange={handleChange}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-[#002623]/20"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <Input
                    id="phone"
                    label="رقم الهاتف *"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-[#002623]/20"
                  />
                  <Input
                    id="email"
                    label="البريد الإلكتروني *"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-[#002623]/20"
                  />
                </div>
              </div>

              {/* Request Details */}
              <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/30">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
                  تفاصيل الطلب
                </h3>
                <div className="space-y-6">
                  <Select
                    id="requestType"
                    label="نوع الطلب *"
                    value={formData.requestType}
                    onChange={handleChange}
                    className="transition-all duration-300 focus:ring-2 focus:ring-[#002623]/20"
                  >
                    {REQUEST_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select>
                  <TextArea
                    id="details"
                    label="تفاصيل الطلب *"
                    value={formData.details}
                    onChange={handleChange}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-[#002623]/20 min-h-[120px]"
                  />

                  {/* مربع التصنيف التلقائي */}
                  {autoClassification && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">🤖</span>
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200">التصنيف التلقائي</h4>
                        <span className="text-xs bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                          ثقة: {Math.round(autoClassification.confidence * 100)}%
                        </span>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                          <span className="text-xs text-gray-500 dark:text-gray-400">القسم المقترح:</span>
                          <p className="font-medium text-blue-700 dark:text-blue-300">{autoClassification.suggestedDepartment}</p>
                        </div>
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                          <span className="text-xs text-gray-500 dark:text-gray-400">الأولوية:</span>
                          <p className={`font-medium ${autoClassification.priority === 'high' ? 'text-red-600' :
                            autoClassification.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                            {autoClassification.priority === 'high' ? '🔴 عالية' :
                              autoClassification.priority === 'medium' ? '🟡 متوسطة' : '🟢 منخفضة'}
                          </p>
                        </div>
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                          <span className="text-xs text-gray-500 dark:text-gray-400">الكلمات المفتاحية:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {autoClassification.keywords.slice(0, 3).map((kw, i) => (
                              <span key={i} className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Section */}
              {appContext?.isEmployeeLoggedIn && appContext?.currentEmployee?.role === 'مدير' && (
                <div className="bg-amber-50/50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200/50 dark:border-amber-700/30">
                  <h3 className="text-xl font-semibold text-amber-800 dark:text-amber-200 mb-6">
                    إعدادات المدير
                  </h3>
                  <Input
                    id="manualTicketId"
                    label="معرّف مخصص (اختياري - للمدير)"
                    placeholder="مثال: ALF-20250910-0001"
                    value={manualId}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase().trimStart();
                      setManualId(v);
                      if (v) {
                        const exists = isTicketIdUsed(appContext?.tickets?.map(t => t.id) || [], v);
                        setManualIdError(exists ? 'المعرف مستخدم مسبقاً.' : null);
                      } else {
                        setManualIdError(null);
                      }
                    }}
                    helperText={manualIdError ? manualIdError : 'عند تعبئته سيتم استخدامه بدلاً من التوليد التلقائي (مرة واحدة).'}
                    error={!!manualIdError}
                    className="transition-all duration-300 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              )}

              {/* Attachments */}
              <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/30">
                <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-6">
                  المرفقات (اختياري)
                </h3>
                <div className="space-y-4">
                  <FileInput
                    id="attachments"
                    label="إرفاق ملفات"
                    onFileChange={handleFilesChange}
                    accept=".pdf,.png,.jpg,.jpeg,.docx"
                    multiple
                    maxFiles={MAX_FILES}
                  />
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      PDF, Word, الصور
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>حد أقصى {MAX_FILES} ملفات</span>
                  </div>
                </div>
              </div>

              {/* Files Display */}
              {attachments.length > 0 && (
                <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/30">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>
                      الملفات المرفقة ({attachments.length})
                    </h4>
                    <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                      باقي {MAX_FILES - attachments.length} من {MAX_FILES}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {attachments.map((file, index) => {
                      const p = previews[index];
                      const kind = p?.kind || 'unsupported';
                      const badge = kind === 'image' ? '🖼️ صورة' : kind === 'pdf' ? '📄 PDF' : kind === 'docx' ? '📝 Word' : '📁 ملف';
                      return (
                        <div key={`${file.name}-${index}`} className="group relative border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                          <button
                            onClick={() => removeAttachment(index)}
                            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100"
                          >
                            ×
                          </button>
                          <div className="relative w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-t-xl overflow-hidden">
                            {!p || p.loading ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full mb-2"></div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">جاري المعاينة...</span>
                              </div>
                            ) : p.kind === 'pdf' ? (
                              <iframe src={p.url} className="w-full h-full border-0" />
                            ) : p.kind === 'image' ? (
                              <img src={p.url} alt={`attachment-${index}`} className="w-full h-full object-contain" />
                            ) : p.kind === 'docx' && p.html ? (
                              <div className="absolute inset-0 overflow-hidden p-2">
                                <div className="prose prose-sm max-w-none dark:prose-invert text-xs" dangerouslySetInnerHTML={{ __html: p.html.substring(0, 200) + '...' }} />
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-2xl mb-2">📁</div>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">لا يمكن المعاينة</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1" title={file.name}>
                              {file.name}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {badge} • {readableSize(file.size)}
                              </p>
                              <button
                                onClick={() => openPreview(index)}
                                className="px-3 py-1 text-xs bg-[#002623] text-white rounded-lg hover:bg-[#003833] transition-colors"
                              >
                                معاينة
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Employee Options */}
              {appContext?.isEmployeeLoggedIn && (
                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl p-6 border border-indigo-200/50 dark:border-indigo-700/30">
                  <h3 className="text-xl font-semibold text-indigo-800 dark:text-indigo-200 mb-4">
                    خيارات الموظف
                  </h3>

                  {matchedEmployee && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl flex items-start gap-4 animate-fadeIn">
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-2xl shadow-sm">
                        👨‍💼
                      </div>
                      <div>
                        <h4 className="font-bold text-green-800 dark:text-green-100 text-lg">
                          تم التحقق: موظف
                        </h4>
                        <p className="text-green-700 dark:text-green-300 font-medium">
                          {matchedEmployee.name}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="px-2 py-0.5 rounded-md bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100 text-xs font-bold">
                            {matchedEmployee.role || 'موظف'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100 text-xs">
                            {matchedEmployee.department}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isEmployeeRequest"
                      checked={isEmployeeRequest}
                      onChange={(e) => setIsEmployeeRequest(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <label htmlFor="isEmployeeRequest" className="text-gray-700 dark:text-gray-300 font-medium select-none cursor-pointer">
                      تسجيل هذا الطلب بصفة رسمية (طلب موظف)
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mr-8">
                    {isEmployeeRequest
                      ? 'سيتم تسجيل الطلب في سجلات طلبات الموظفين واحتسابه ضمن نشاطك.'
                      : 'سيتم تسجيل الطلب كطلب مواطن عادي (نيابة عن مواطن).'}
                  </p>
                </div>
              )}

              {/* Submit Section */}
              <div className="bg-gradient-to-r from-[#002623]/5 to-[#003833]/5 rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/30 text-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  جاهز لإرسال طلبك؟
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  تأكد من صحة جميع البيانات قبل الإرسال. سيتم إرسال رقم متابعة الطلب إلى بريدك الإلكتروني.
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting || !!error || !!manualIdError}
                  className="w-full py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>جاري الإرسال...</span>
                    </div>
                  ) : (
                    <span>إرسال الطلب</span>
                  )}
                </Button>
                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
              </div>
            </form>
          </div>
        </Card>
        {/* Preview Modal (portal-like overlay placed outside Card) */}
        {previewIndex !== null && previews[previewIndex] && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm" onClick={closePreview}>
            <div className="relative w-screen h-screen" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-white">
                <div>
                  <h5 className="text-lg font-semibold truncate mb-1" title={attachments[previewIndex].name}>
                    {attachments[previewIndex].name}
                  </h5>
                  <p className="text-sm opacity-80">
                    ملف {previewIndex + 1} من {attachments.length} • {readableSize(attachments[previewIndex].size)}
                  </p>
                </div>
                <button
                  onClick={closePreview}
                  className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center text-xl"
                >
                  ×
                </button>
              </div>
              <div className="absolute inset-6 mt-24 mb-20 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                {(() => {
                  const p = previews[previewIndex];
                  if (!p || p.loading) return (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <div className="animate-spin w-12 h-12 border-2 border-gray-400 border-t-transparent rounded-full mb-4"></div>
                        <p>جاري التحميل...</p>
                      </div>
                    </div>
                  );
                  if (p.kind === 'pdf') return <iframe src={p.url} className="w-full h-full" />;
                  if (p.kind === 'image') return <img src={p.url} className="w-full h-full object-contain" alt="Preview" />;
                  if (p.kind === 'docx' && p.html) {
                    return (
                      <div className="w-full h-full overflow-auto p-6">
                        <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: p.html }} />
                      </div>
                    );
                  }
                  return <div className="flex items-center justify-center h-full text-gray-500">لا يمكن معاينة هذا الملف</div>;
                })()}
              </div>
              {attachments.length > 1 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                    <div className="flex gap-2">
                      {attachments.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => setPreviewIndex(i)}
                          title={f.name}
                          className={`px-3 py-1 rounded-full text-xs transition-all ${i === previewIndex ? 'bg-[#002623] text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'
                            }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitRequestPage;