/**
 * المساعد الذكي - Chatbot
 * Smart Assistant for Citizen Inquiries
 * 
 * الميزات:
 * - التعرف على الصوت (Speech Recognition)
 * - تحويل النص إلى كلام (Text-to-Speech)
 * - التحكم بالموقع عبر الأوامر النصية والصوتية
 * - اختصارات لوحة المفاتيح لإمكانية الوصول
 * - دعم المكفوفين
 * - تكامل مع Gemini AI للإجابات الذكية
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { askGemini, isGeminiAvailable, getGeminiConfig, saveGeminiConfig, testGeminiConnection } from '../services/geminiService';

// ==================== أنواع البيانات ====================

interface ChatMessage {
    id: string;
    type: 'user' | 'bot';
    content: string;
    timestamp: Date;
    options?: QuickReply[];
    isNavigationResult?: boolean;
    isAIResponse?: boolean;
}

interface QuickReply {
    id: string;
    label: string;
    action: string;
}

interface FAQ {
    keywords: string[];
    question: string;
    answer: string;
    category: string;
}

// أوامر التنقل في الموقع
interface NavigationCommand {
    keywords: string[];
    action: () => void;
    description: string;
    hash: string;
}

// ==================== دعم Web Speech API ====================

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

// ==================== قاعدة المعرفة ====================

const FAQS: FAQ[] = [
    // حجز المواعيد
    {
        keywords: ['حجز', 'موعد', 'احجز', 'مواعيد'],
        question: 'كيف أحجز موعد؟',
        answer: 'يمكنك حجز موعد بسهولة من خلال:\n\n1️⃣ الضغط على "حجز موعد" من الصفحة الرئيسية\n2️⃣ إدخال بياناتك (الرقم الوطني ورقم الهاتف)\n3️⃣ اختيار نوع المعاملة والتاريخ والوقت المناسب\n4️⃣ ستحصل على تذكرة برمز QR\n\n📌 يمكنك حجز موعد واحد كل أسبوع.',
        category: 'المواعيد'
    },
    {
        keywords: ['الغاء', 'إلغاء', 'الغي', 'حذف موعد'],
        question: 'كيف ألغي موعدي؟',
        answer: 'لإلغاء موعدك:\n\n1️⃣ اذهب إلى صفحة "متابعة طلب"\n2️⃣ أدخل رقم الموعد\n3️⃣ اختر "إلغاء الموعد"\n\n⚠️ يرجى إلغاء الموعد قبل 24 ساعة على الأقل لإتاحة الفرصة للآخرين.',
        category: 'المواعيد'
    },
    {
        keywords: ['تعديل', 'تغيير', 'موعد جديد'],
        question: 'هل يمكنني تعديل موعدي؟',
        answer: 'نعم، يمكنك تعديل موعدك بإلغائه وحجز موعد جديد.\n\nالخطوات:\n1️⃣ ألغِ الموعد الحالي\n2️⃣ احجز موعداً جديداً بالتاريخ والوقت المناسب\n\n💡 ننصح بالتعديل قبل 48 ساعة من الموعد.',
        category: 'المواعيد'
    },
    // الشكاوى والاستعلامات
    {
        keywords: ['شكوى', 'شكاوى', 'اعتراض', 'مشكلة'],
        question: 'كيف أقدم شكوى؟',
        answer: 'لتقديم شكوى:\n\n1️⃣ اضغط على "تقديم طلب جديد"\n2️⃣ اختر نوع الطلب "شكوى"\n3️⃣ املأ البيانات المطلوبة\n4️⃣ أرفق المستندات الداعمة\n5️⃣ ستحصل على رقم تتبع\n\n📞 يمكنك متابعة حالة شكواك من صفحة "متابعة طلب".',
        category: 'الشكاوى'
    },
    {
        keywords: ['متابعة', 'تتبع', 'حالة', 'طلبي'],
        question: 'كيف أتابع حالة طلبي؟',
        answer: 'لمتابعة حالة طلبك:\n\n1️⃣ اذهب إلى صفحة "متابعة طلب"\n2️⃣ أدخل رقم الطلب أو رقم الموعد\n3️⃣ ستظهر لك جميع التفاصيل والتحديثات\n\n📧 يتم إرسال إشعارات عند أي تحديث على طلبك.',
        category: 'المتابعة'
    },
    // الضرائب
    {
        keywords: ['ضريبة', 'ضرائب', 'دفع', 'تسديد'],
        question: 'كيف أدفع الضرائب؟',
        answer: 'لدفع الضرائب:\n\n💳 الدفع الإلكتروني:\n- عبر تطبيق الدفع الحكومي\n- التحويل البنكي\n\n🏛️ الدفع المباشر:\n- احجز موعد لزيارة المديرية\n- توجه للنافذة المختصة\n\n📄 المستندات المطلوبة:\n- الهوية الشخصية\n- إشعار التكليف الضريبي',
        category: 'الضرائب'
    },
    {
        keywords: ['براءة ذمة', 'شهادة', 'وثيقة'],
        question: 'كيف أحصل على براءة ذمة؟',
        answer: 'للحصول على براءة ذمة:\n\n1️⃣ احجز موعد واختر "شهادة براءة ذمة"\n2️⃣ أحضر المستندات التالية:\n   - الهوية الشخصية\n   - دفتر العائلة\n   - إيصالات السداد\n3️⃣ مدة الإصدار: 1-3 أيام عمل\n\n💰 الرسوم: حسب نوع الشهادة',
        category: 'الضرائب'
    },
    {
        keywords: ['إعفاء', 'اعفاء', 'تخفيض'],
        question: 'كيف أطلب إعفاء ضريبي؟',
        answer: 'لطلب إعفاء ضريبي:\n\n1️⃣ قدم طلباً عبر النظام أو بالحضور\n2️⃣ أرفق المستندات المطلوبة:\n   - وثائق تثبت استحقاق الإعفاء\n   - الهوية والسجلات المالية\n3️⃣ سيتم دراسة الطلب خلال 14 يوم\n\n📋 أنواع الإعفاءات:\n- إعفاء ذوي الشهداء\n- إعفاء ذوي الإعاقة\n- إعفاءات خاصة',
        category: 'الضرائب'
    },
    // أوقات العمل والموقع
    {
        keywords: ['دوام', 'ساعات', 'عمل', 'فتح', 'اغلاق'],
        question: 'ما هي أوقات العمل؟',
        answer: '🕐 أوقات الدوام الرسمي:\n\n📅 الأحد - الخميس:\n   8:00 صباحاً - 2:00 ظهراً\n\n🚫 الجمعة والسبت: عطلة رسمية\n\n⚠️ ملاحظة: استقبال المراجعين حتى الساعة 1:00 ظهراً',
        category: 'معلومات عامة'
    },
    {
        keywords: ['عنوان', 'موقع', 'أين', 'مكان', 'خريطة'],
        question: 'أين تقع المديرية؟',
        answer: '📍 عنوان مديرية مالية حلب:\n\nحلب - شارع بارون\nمبنى المديرية المالية\n\n🚗 للوصول:\n- بالسيارة: 5 دقائق من ساحة سعد الله الجابري\n- بالحافلة: خطوط 1, 5, 12\n\n📞 هاتف: 021-XXXXXXX\n\n💡 يمكنك عرض الخريطة من صفحة حجز الموعد.',
        category: 'معلومات عامة'
    },
    // مساعدة
    {
        keywords: ['مساعدة', 'help', 'استفسار'],
        question: 'أحتاج مساعدة',
        answer: 'مرحباً! أنا هنا لمساعدتك 😊\n\nيمكنك السؤال عن:\n\n📅 حجز المواعيد\n📝 تقديم الشكاوى\n💰 الضرائب والرسوم\n📄 الشهادات والوثائق\n🏛️ خدمات المديرية\n\n📞 للتواصل المباشر:\nواتساب: 09XXXXXXXX\nهاتف: 021-XXXXXXX',
        category: 'مساعدة'
    }
];

const QUICK_REPLIES: QuickReply[] = [
    { id: '1', label: '📅 حجز موعد', action: 'booking' },
    { id: '2', label: '📝 تقديم شكوى', action: 'complaint' },
    { id: '3', label: '🔍 متابعة طلب', action: 'track' },
    { id: '4', label: '💰 استفسار ضريبي', action: 'tax' },
    { id: '5', label: '🕐 أوقات العمل', action: 'hours' },
    { id: '6', label: '📍 موقع المديرية', action: 'location' }
];

// أوامر التنقل في الموقع
const NAVIGATION_COMMANDS: NavigationCommand[] = [
    {
        keywords: ['اذهب للرئيسية', 'الصفحة الرئيسية', 'رئيسية', 'home', 'افتح الرئيسية'],
        action: () => window.location.hash = '',
        description: 'الانتقال للصفحة الرئيسية',
        hash: ''
    },
    {
        keywords: ['احجز موعد', 'صفحة الحجز', 'حجز موعد', 'اذهب للحجز', 'افتح الحجز'],
        action: () => window.location.hash = '#appointment-booking',
        description: 'الانتقال لصفحة حجز المواعيد',
        hash: '#appointment-booking'
    },
    {
        keywords: ['تقديم طلب', 'طلب جديد', 'شكوى جديدة', 'اذهب للطلبات', 'افتح الطلبات'],
        action: () => window.location.hash = '#new-request',
        description: 'الانتقال لصفحة تقديم طلب جديد',
        hash: '#new-request'
    },
    {
        keywords: ['متابعة طلب', 'تتبع', 'حالة الطلب', 'اذهب للمتابعة', 'افتح المتابعة'],
        action: () => window.location.hash = '#track-request',
        description: 'الانتقال لصفحة متابعة الطلبات',
        hash: '#track-request'
    },
    {
        keywords: ['تواصل', 'اتصل بنا', 'التواصل', 'اذهب للتواصل', 'افتح التواصل'],
        action: () => window.location.hash = '#contact',
        description: 'الانتقال لصفحة التواصل',
        hash: '#contact'
    },
    {
        keywords: ['لوحة التحكم', 'داشبورد', 'dashboard', 'الإدارة', 'افتح لوحة التحكم'],
        action: () => window.location.hash = '#dashboard',
        description: 'الانتقال للوحة التحكم',
        hash: '#dashboard'
    },
    {
        keywords: ['تسجيل الوصول', 'check in', 'checkin', 'qr', 'الباركود'],
        action: () => window.location.hash = '#qr-checkin',
        description: 'الانتقال لصفحة تسجيل الوصول',
        hash: '#qr-checkin'
    },
    {
        keywords: ['مواعيدي', 'مواعيد اليوم', 'جدول المواعيد'],
        action: () => window.location.hash = '#appointments',
        description: 'الانتقال لصفحة المواعيد',
        hash: '#appointments'
    }
];

// أوامر إمكانية الوصول
const ACCESSIBILITY_COMMANDS = [
    { keywords: ['تكبير الخط', 'خط أكبر', 'كبر الخط'], action: 'increase-font' },
    { keywords: ['تصغير الخط', 'خط أصغر', 'صغر الخط'], action: 'decrease-font' },
    { keywords: ['تفعيل الوضع الداكن', 'الوضع الليلي', 'dark mode'], action: 'dark-mode' },
    { keywords: ['تفعيل الوضع الفاتح', 'الوضع النهاري', 'light mode'], action: 'light-mode' },
    { keywords: ['أين أنا', 'موقعي الحالي', 'الصفحة الحالية'], action: 'current-page' },
    { keywords: ['اقرأ الصفحة', 'قراءة المحتوى', 'اسمع الصفحة'], action: 'read-page' },
    { keywords: ['مساعدة صوتية', 'تفعيل الصوت', 'اقرأ الردود'], action: 'enable-tts' },
    { keywords: ['إيقاف الصوت', 'أوقف القراءة', 'صمت'], action: 'disable-tts' }
];

// ==================== المكون الرئيسي ====================

interface ChatbotProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({ isOpen: controlledOpen, onClose }) => {
    const [isOpen, setIsOpen] = useState(controlledOpen ?? false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // حالة ميزات إمكانية الوصول
    const [isListening, setIsListening] = useState(false);
    const [isTTSEnabled, setIsTTSEnabled] = useState(false);
    const [accessibilityMode, setAccessibilityMode] = useState(false);
    const [shortcutsEnabled, setShortcutsEnabled] = useState(() => {
        const saved = localStorage.getItem('chatbot-shortcuts-enabled');
        return saved !== null ? saved === 'true' : true; // مفعّل افتراضياً
    });

    // حالة Gemini AI
    const [geminiEnabled, setGeminiEnabled] = useState(false);
    const [showGeminiSettings, setShowGeminiSettings] = useState(false);
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [isTestingGemini, setIsTestingGemini] = useState(false);

    // مراجع للتعرف على الصوت وتحويل النص للكلام
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    // تحميل إعدادات Gemini عند التهيئة
    useEffect(() => {
        const config = getGeminiConfig();
        setGeminiEnabled(config.enabled);
        setGeminiApiKey(config.apiKey);
    }, []);

    // تهيئة Web Speech API
    useEffect(() => {
        // التحقق من دعم التعرف على الصوت
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = false;
            recognition.interimResults = true; // للحصول على نتائج مباشرة
            // استخدام ar للتوافق الأفضل مع جميع المتصفحات
            recognition.lang = 'ar'; // العربية العامة - أكثر توافقاً

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[0][0].transcript;
                setInputValue(transcript);
                // إرسال تلقائي فقط عند النتيجة النهائية
                if (event.results[0].isFinal) {
                    setTimeout(() => {
                        handleVoiceCommand(transcript);
                    }, 300);
                }
            };

            recognition.onerror = (event: Event) => {
                setIsListening(false);
                console.error('خطأ في التعرف على الصوت:', event);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognitionRef.current = recognition;
        }

        // تهيئة تحويل النص للكلام
        if ('speechSynthesis' in window) {
            synthRef.current = window.speechSynthesis;
        }

        // اختصارات لوحة المفاتيح العالمية
        const handleKeyDown = (e: KeyboardEvent) => {
            // لا تعمل الاختصارات إذا كانت معطلة
            if (!shortcutsEnabled) return;

            // Alt + H لفتح المساعد
            if (e.altKey && e.key === 'h') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            // Alt + V للتحدث (صوت)
            if (e.altKey && e.key === 'v' && isOpen) {
                e.preventDefault();
                startListening();
            }
            // Escape للإغلاق
            if (e.key === 'Escape' && isOpen) {
                toggleChat();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, [isOpen]);

    // وظيفة تحويل النص للكلام بالعربية
    const speak = useCallback((text: string) => {
        // لا تنطق إذا لم يكن TTS مفعّلاً
        if (!synthRef.current || !isTTSEnabled) return;

        synthRef.current.cancel(); // إيقاف أي كلام حالي

        // البحث عن صوت عربي متاح
        const voices = synthRef.current.getVoices();

        // ترتيب الأولوية: سوري > مصري > سعودي > أي عربي
        const arabicVoice =
            voices.find(v => v.lang === 'ar-SY') ||
            voices.find(v => v.lang === 'ar-EG') ||
            voices.find(v => v.lang === 'ar-SA') ||
            voices.find(v => v.lang.startsWith('ar-')) ||
            voices.find(v => v.lang === 'ar') ||
            null;

        // لا تنطق إذا لم يتوفر صوت عربي (لتجنب القراءة بالإنجليزية)
        if (!arabicVoice) {
            console.warn('لا يتوفر صوت عربي في النظام. يرجى تثبيت حزمة اللغة العربية.');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = arabicVoice;
        utterance.lang = arabicVoice.lang;
        utterance.rate = 0.85; // سرعة أبطأ للوضوح
        utterance.pitch = 1;
        utterance.volume = 1;

        synthRef.current.speak(utterance);
    }, [isTTSEnabled]);

    // تحميل الأصوات عند التهيئة
    useEffect(() => {
        if (synthRef.current) {
            // Chrome يحتاج لتحميل الأصوات بشكل منفصل
            const loadVoices = () => {
                synthRef.current?.getVoices();
            };
            loadVoices();
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }, []);

    // بدء الاستماع للصوت
    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
                // لا نستخدم speak هنا لتجنب مشاكل النطق
            } catch (error) {
                console.error('خطأ في بدء التعرف على الصوت:', error);
            }
        }
    };

    // إيقاف الاستماع
    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    };

    // معالجة أوامر التنقل
    const handleNavigationCommand = (query: string): string | null => {
        const normalizedQuery = query.toLowerCase().trim();

        for (const cmd of NAVIGATION_COMMANDS) {
            for (const keyword of cmd.keywords) {
                if (normalizedQuery.includes(keyword.toLowerCase())) {
                    cmd.action();
                    return `✅ ${cmd.description}\n\nجاري الانتقال...`;
                }
            }
        }
        return null;
    };

    // معالجة أوامر إمكانية الوصول
    const handleAccessibilityCommand = (query: string): string | null => {
        const normalizedQuery = query.toLowerCase().trim();

        for (const cmd of ACCESSIBILITY_COMMANDS) {
            for (const keyword of cmd.keywords) {
                if (normalizedQuery.includes(keyword.toLowerCase())) {
                    switch (cmd.action) {
                        case 'increase-font':
                            document.documentElement.style.fontSize =
                                (parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.1) + 'px';
                            return '✅ تم تكبير الخط';
                        case 'decrease-font':
                            document.documentElement.style.fontSize =
                                (parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.9) + 'px';
                            return '✅ تم تصغير الخط';
                        case 'dark-mode':
                            document.documentElement.classList.add('dark');
                            return '🌙 تم تفعيل الوضع الداكن';
                        case 'light-mode':
                            document.documentElement.classList.remove('dark');
                            return '☀️ تم تفعيل الوضع الفاتح';
                        case 'current-page':
                            const currentHash = window.location.hash || 'الصفحة الرئيسية';
                            return `📍 أنت حالياً في: ${currentHash}`;
                        case 'read-page':
                            const mainContent = document.querySelector('main')?.textContent ||
                                document.querySelector('body')?.textContent || '';
                            const truncated = mainContent.substring(0, 500);
                            if (synthRef.current) {
                                synthRef.current.cancel();
                                const utterance = new SpeechSynthesisUtterance(truncated);
                                utterance.lang = 'ar-SA';
                                synthRef.current.speak(utterance);
                            }
                            return '🔊 جاري قراءة محتوى الصفحة...';
                        case 'enable-tts':
                            setIsTTSEnabled(true);
                            setAccessibilityMode(true);
                            return '🔊 تم تفعيل القراءة الصوتية. سيتم قراءة جميع الردود بصوت عالٍ.';
                        case 'disable-tts':
                            setIsTTSEnabled(false);
                            if (synthRef.current) synthRef.current.cancel();
                            return '🔇 تم إيقاف القراءة الصوتية';
                    }
                }
            }
        }
        return null;
    };

    // معالجة الأوامر الصوتية
    const handleVoiceCommand = async (transcript: string) => {
        if (!transcript.trim()) return;

        addUserMessage(transcript);
        setInputValue('');
        setIsTyping(true);

        // محاولة تنفيذ أمر تنقل
        const navResult = handleNavigationCommand(transcript);
        if (navResult) {
            setIsTyping(false);
            addBotMessage(navResult);
            return;
        }

        // محاولة تنفيذ أمر إمكانية وصول
        const accessResult = handleAccessibilityCommand(transcript);
        if (accessResult) {
            setIsTyping(false);
            addBotMessage(accessResult);
            return;
        }

        // البحث في قاعدة المعرفة (محلياً أو عبر Gemini)
        const response = await findAnswer(transcript);
        setIsTyping(false);
        addBotMessage(response, QUICK_REPLIES, response.startsWith('🤖'));
    };

    // تحديث حالة الفتح من الخارج
    useEffect(() => {
        if (controlledOpen !== undefined) {
            setIsOpen(controlledOpen);
        }
    }, [controlledOpen]);

    // رسالة الترحيب
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const welcomeMessage = `مرحباً بك في المساعد الذكي لمديرية مالية حلب! 👋

كيف يمكنني مساعدتك اليوم؟

🎙️ يمكنك التحدث معي صوتياً بالضغط على زر الميكروفون
⌨️ أو اكتب سؤالك في حقل النص
${geminiEnabled ? '🤖 الذكاء الاصطناعي Gemini مفعّل' : '✨ فعّل Gemini AI للحصول على إجابات أكثر ذكاءً'}

💡 أوامر مفيدة:
• "اذهب للحجز" - للانتقال لصفحة الحجز
• "تقديم شكوى" - لفتح صفحة الشكاوى
• "تكبير الخط" - لتسهيل القراءة
• "أين أنا" - لمعرفة الصفحة الحالية`;

            addBotMessage(welcomeMessage, [
                ...QUICK_REPLIES,
                { id: '7', label: '🎙️ تفعيل الصوت', action: 'enable-voice' },
                { id: '8', label: '♿ وضع إمكانية الوصول', action: 'accessibility' },
                { id: '9', label: geminiEnabled ? '🤖 Gemini مفعّل' : '✨ تفعيل Gemini AI', action: 'gemini-settings' }
            ]);
            // لا نقوم بالنطق تلقائياً - المستخدم يفعّل الصوت يدوياً
        }
    }, [isOpen, messages.length, geminiEnabled]);

    // التمرير للأسفل عند إضافة رسالة
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const addBotMessage = (content: string, options?: QuickReply[], isAI?: boolean) => {
        const message: ChatMessage = {
            id: Date.now().toString(),
            type: 'bot',
            content,
            timestamp: new Date(),
            options,
            isAIResponse: isAI
        };
        setMessages(prev => [...prev, message]);
    };

    const addUserMessage = (content: string) => {
        const message: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, message]);
    };

    // البحث في قاعدة المعرفة المحلية
    const findLocalAnswer = (query: string): string | null => {
        const normalizedQuery = query.toLowerCase().trim();

        // البحث في قاعدة المعرفة
        for (const faq of FAQS) {
            for (const keyword of faq.keywords) {
                if (normalizedQuery.includes(keyword)) {
                    return faq.answer;
                }
            }
        }

        return null; // لم يتم العثور على إجابة محلية
    };

    // البحث عن إجابة (محلياً أو عبر Gemini)
    const findAnswer = async (query: string): Promise<string> => {
        // أولاً: البحث في قاعدة المعرفة المحلية
        const localAnswer = findLocalAnswer(query);
        if (localAnswer) {
            return localAnswer;
        }

        // ثانياً: إذا كان Gemini مفعّلاً، اسأله
        if (geminiEnabled && isGeminiAvailable()) {
            const geminiResponse = await askGemini(query);
            if (geminiResponse.success) {
                return `🤖 ${geminiResponse.message}`;
            }
        }

        // رد افتراضي
        return 'عذراً، لم أفهم سؤالك بشكل واضح. 🤔\n\nيمكنك:\n- إعادة صياغة السؤال\n- اختيار أحد الخيارات السريعة\n- التواصل معنا مباشرة عبر واتساب\n\n💡 جرب أن تسأل عن: المواعيد، الشكاوى، الضرائب، أوقات العمل' +
            (geminiEnabled ? '' : '\n\n✨ يمكنك تفعيل الذكاء الاصطناعي للحصول على إجابات أكثر ذكاءً');
    };

    // حفظ إعدادات Gemini
    const handleSaveGeminiSettings = async () => {
        if (geminiApiKey.trim()) {
            setIsTestingGemini(true);
            const isValid = await testGeminiConnection(geminiApiKey.trim());
            setIsTestingGemini(false);

            if (isValid) {
                saveGeminiConfig({ apiKey: geminiApiKey.trim(), enabled: true, useDefaultKey: false });
                setGeminiEnabled(true);
                setShowGeminiSettings(false);
                addBotMessage('✅ تم تفعيل Gemini AI بنجاح!\n\nالآن يمكنني الإجابة على أسئلتك بشكل أكثر ذكاءً. 🤖');
            } else {
                addBotMessage('❌ مفتاح API غير صالح. يرجى التحقق من المفتاح والمحاولة مرة أخرى.');
            }
        }
    };

    // إيقاف Gemini
    const handleDisableGemini = () => {
        saveGeminiConfig({ apiKey: '', enabled: false, useDefaultKey: false });
        setGeminiEnabled(false);
        setGeminiApiKey('');
        addBotMessage('🔴 تم إيقاف Gemini AI. سيتم استخدام قاعدة المعرفة المحلية فقط.');
    };

    const handleQuickReply = async (action: string) => {
        let userText = '';
        let botResponse = '';
        let useLocalAnswer = true;

        switch (action) {
            case 'booking':
                userText = 'أريد حجز موعد';
                botResponse = findLocalAnswer('حجز موعد') || '';
                break;
            case 'complaint':
                userText = 'أريد تقديم شكوى';
                botResponse = findLocalAnswer('شكوى') || '';
                break;
            case 'track':
                userText = 'أريد متابعة طلبي';
                botResponse = findLocalAnswer('متابعة') || '';
                break;
            case 'tax':
                userText = 'استفسار ضريبي';
                botResponse = findLocalAnswer('ضريبة') || '';
                break;
            case 'hours':
                userText = 'ما هي أوقات العمل؟';
                botResponse = findLocalAnswer('دوام') || '';
                break;
            case 'location':
                userText = 'أين تقع المديرية؟';
                botResponse = findLocalAnswer('موقع') || '';
                break;
            case 'enable-voice':
                userText = 'تفعيل الصوت';
                setIsTTSEnabled(true);
                setAccessibilityMode(true);
                botResponse = '🔊 تم تفعيل القراءة الصوتية!\n\nسيتم قراءة جميع الردود بصوت عالٍ.\n\n💡 للتحدث معي، اضغط على زر الميكروفون 🎙️\n\nأوامر صوتية مفيدة:\n• "اذهب للحجز"\n• "تقديم شكوى"\n• "أوقف الصوت"';
                break;
            case 'accessibility':
                userText = 'وضع إمكانية الوصول';
                setAccessibilityMode(true);
                setIsTTSEnabled(true);
                botResponse = `♿ تم تفعيل وضع إمكانية الوصول!

🔊 القراءة الصوتية: مفعّلة
🎙️ التحكم الصوتي: متاح

⌨️ اختصارات لوحة المفاتيح:
• Alt + H: فتح/إغلاق المساعد
• Alt + V: بدء التحدث
• Escape: إغلاق النافذة

📢 أوامر صوتية:
• "تكبير الخط" / "تصغير الخط"
• "الوضع الداكن" / "الوضع الفاتح"
• "اقرأ الصفحة"
• "أين أنا"

🧭 التنقل في الموقع:
• "اذهب للحجز"
• "افتح الشكاوى"
• "الصفحة الرئيسية"`;
                break;
            case 'gemini-settings':
                userText = 'إعدادات Gemini AI';
                setShowGeminiSettings(true);
                botResponse = geminiEnabled
                    ? '⚙️ Gemini AI مفعّل حالياً.\n\nيمكنك تعديل الإعدادات أو إيقاف الخدمة.'
                    : '⚙️ لتفعيل Gemini AI، تحتاج إلى مفتاح API من Google.\n\n📝 للحصول على المفتاح:\n1. اذهب إلى: https://makersuite.google.com/app/apikey\n2. أنشئ مفتاح API جديد\n3. الصق المفتاح أدناه';
                break;
            default:
                useLocalAnswer = false;
                botResponse = await findAnswer(action);
        }

        addUserMessage(userText);
        setIsTyping(true);

        setTimeout(() => {
            setIsTyping(false);
            addBotMessage(botResponse, QUICK_REPLIES);
        }, useLocalAnswer ? 500 : 100);
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        addUserMessage(inputValue);
        const query = inputValue;
        setInputValue('');
        setIsTyping(true);

        // محاولة تنفيذ أمر تنقل
        const navResult = handleNavigationCommand(query);
        if (navResult) {
            setIsTyping(false);
            addBotMessage(navResult);
            return;
        }

        // محاولة تنفيذ أمر إمكانية وصول
        const accessResult = handleAccessibilityCommand(query);
        if (accessResult) {
            setIsTyping(false);
            addBotMessage(accessResult);
            return;
        }

        // البحث في قاعدة المعرفة (محلياً أو عبر Gemini)
        const response = await findAnswer(query);
        setIsTyping(false);
        addBotMessage(response, QUICK_REPLIES, response.startsWith('🤖'));
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const toggleChat = () => {
        if (onClose && isOpen) {
            onClose();
        } else {
            setIsOpen(!isOpen);
        }
    };

    return (
        <>
            {/* زر فتح الدردشة - تصميم احترافي حكومي */}
            <div className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ease-out
                           ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
                <button
                    onClick={toggleChat}
                    className="group relative"
                    title="المساعد الذكي - مديرية مالية حلب"
                >
                    {/* الحلقة الخارجية المتحركة */}
                    <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0f3c35] to-[#1a5c4f]
                                  animate-ping opacity-20"></div>

                    {/* الزر الرئيسي */}
                    <div className="relative w-16 h-16 bg-gradient-to-br from-[#0f3c35] via-[#145c52] to-[#1a6b5f] 
                                  rounded-2xl shadow-xl flex items-center justify-center
                                  group-hover:shadow-2xl group-hover:scale-105 transition-all duration-300
                                  border border-white/10 overflow-hidden">
                        {/* خلفية نمط */}
                        <div className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='1' cy='1' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
                            }}></div>

                        {/* أيقونة سماعة الدعم */}
                        <svg className="w-8 h-8 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12v6c0 1.1.9 2 2 2h2v-8H4.5c-.28-3.81 2.79-7.5 7.5-7.5s7.78 3.69 7.5 7.5H18v8h2c1.1 0 2-.9 2-2v-6c0-5.52-4.48-10-10-10zm-4 12v4H6v-4h2zm10 4h-2v-4h2v4z" />
                            <circle cx="12" cy="17" r="2" fill="white" opacity="0.9" />
                        </svg>
                    </div>

                    {/* شارة الإشعار مع نبض */}
                    <div className="absolute -top-1 -right-1">
                        <span className="absolute w-6 h-6 bg-amber-500 rounded-full animate-ping opacity-50"></span>
                        <span className="relative flex items-center justify-center w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 
                                       rounded-full text-white text-xs font-bold shadow-lg border-2 border-white">
                            {accessibilityMode ? '♿' : '?'}
                        </span>
                    </div>

                    {/* النص التوضيحي الجانبي */}
                    <div className="absolute left-full mr-4 top-1/2 -translate-y-1/2 
                                  opacity-0 group-hover:opacity-100 transition-all duration-300
                                  pointer-events-none translate-x-2 group-hover:translate-x-0">
                        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white 
                                      text-sm px-4 py-3 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700
                                      flex items-center gap-3 min-w-max">
                            <div className="w-8 h-8 bg-[#0f3c35]/10 rounded-lg flex items-center justify-center">
                                <span className="text-lg">💬</span>
                            </div>
                            <div>
                                <p className="font-bold text-[#0f3c35] dark:text-emerald-400">المساعد الذكي</p>
                                <p className="text-xs text-gray-500">اسألني عن أي شيء! (Alt+H)</p>
                            </div>
                        </div>
                        {/* السهم */}
                        <div className="absolute top-1/2 -right-2 -translate-y-1/2 
                                      w-0 h-0 border-t-8 border-t-transparent 
                                      border-l-8 border-l-white dark:border-l-gray-800
                                      border-b-8 border-b-transparent"></div>
                    </div>
                </button>
            </div>

            {/* نافذة الدردشة - تصميم محسّن */}
            <div className={`fixed z-50 transition-all duration-500 ease-out
                           ${isOpen
                    ? 'bottom-6 left-6 opacity-100 scale-100'
                    : 'bottom-0 left-6 opacity-0 scale-95 pointer-events-none'
                }`}
                role="dialog"
                aria-label="المساعد الذكي"
                aria-modal="true">
                <div className="w-[420px] max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-800 
                              rounded-2xl shadow-2xl overflow-hidden
                              border border-gray-200 dark:border-gray-700
                              flex flex-col h-[580px] max-h-[80vh]">

                    {/* الهيدر المحسّن */}
                    <div className="bg-gradient-to-r from-[#0f3c35] via-[#145c52] to-[#1a5c4f] p-4 text-white relative overflow-hidden">
                        {/* نمط خلفية */}
                        <div className="absolute inset-0 opacity-5"
                            style={{
                                backgroundImage: `url("https://syrian.zone/syid/materials/pattern.svg")`,
                                backgroundSize: '200px'
                            }}></div>

                        <div className="relative flex items-center gap-3">
                            {/* شعار المديرية */}
                            <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-xl 
                                          flex items-center justify-center border border-white/20
                                          shadow-inner">
                                <img
                                    src="https://syrian.zone/syid/materials/logo.ai.svg"
                                    alt="شعار الجمهورية العربية السورية"
                                    className="w-10 h-10 drop-shadow-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    المساعد الذكي
                                    {geminiEnabled && (
                                        <span className="text-xs bg-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <span>🤖</span> Gemini
                                        </span>
                                    )}
                                </h3>
                                <p className="text-sm text-white/70 flex items-center gap-2">
                                    مديرية مالية محافظة حلب
                                    {accessibilityMode && (
                                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">♿ وضع إمكانية الوصول</span>
                                    )}
                                </p>
                            </div>

                            {/* حالة الاتصال وأزرار التحكم */}
                            <div className="flex items-center gap-2">
                                {/* مؤشر حالة TTS */}
                                {isTTSEnabled && (
                                    <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-full" title="القراءة الصوتية مفعّلة">
                                        <span className="text-amber-300 text-xs">🔊</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></span>
                                    <span className="text-xs font-medium">متصل</span>
                                </div>
                                <button
                                    onClick={toggleChat}
                                    className="w-8 h-8 bg-white/10 hover:bg-red-500/80 rounded-lg 
                                             flex items-center justify-center transition-colors"
                                    title="إغلاق"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* نافذة إعدادات Gemini */}
                    {showGeminiSettings && (
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 
                                      border-b border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                                    <span>🤖</span> إعدادات Gemini AI
                                </h4>
                                <button
                                    onClick={() => setShowGeminiSettings(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {geminiEnabled ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                        <span>✅</span>
                                        <span className="text-sm font-medium">Gemini AI مفعّل</span>
                                    </div>
                                    <button
                                        onClick={handleDisableGemini}
                                        className="w-full py-2 px-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 
                                                 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
                                    >
                                        إيقاف Gemini AI
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        أدخل مفتاح API من Google AI Studio:
                                    </p>
                                    <input
                                        type="password"
                                        value={geminiApiKey}
                                        onChange={(e) => setGeminiApiKey(e.target.value)}
                                        placeholder="AIza..."
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-purple-200 dark:border-purple-700 
                                                 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        dir="ltr"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveGeminiSettings}
                                            disabled={!geminiApiKey.trim() || isTestingGemini}
                                            className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white 
                                                     rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm
                                                     flex items-center justify-center gap-2"
                                        >
                                            {isTestingGemini ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                    جاري الاختبار...
                                                </>
                                            ) : (
                                                'تفعيل'
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setShowGeminiSettings(false)}
                                            className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 
                                                     rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm"
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                    <a
                                        href="https://makersuite.google.com/app/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-center text-xs text-purple-600 dark:text-purple-400 hover:underline"
                                    >
                                        📝 احصل على مفتاح API مجاني من Google
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* منطقة الرسائل - محسّنة */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 
                                  bg-gradient-to-b from-gray-50 to-gray-100 
                                  dark:from-gray-900/50 dark:to-gray-800/50">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex items-end gap-2 ${message.type === 'user' ? 'flex-row' : 'flex-row-reverse'}`}
                            >
                                {/* أيقونة المرسل */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                                              ${message.type === 'user'
                                        ? 'bg-[#0f3c35] text-white'
                                        : message.isAIResponse
                                            ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700'
                                            : 'bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600'}`}>
                                    {message.type === 'user' ? (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    ) : message.isAIResponse ? (
                                        <span className="text-sm">🤖</span>
                                    ) : (
                                        <img src="https://syrian.zone/syid/materials/logo.ai.svg" alt="" className="w-5 h-5" />
                                    )}
                                </div>

                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm
                                              ${message.type === 'user'
                                            ? 'bg-gradient-to-br from-[#0f3c35] to-[#1a5c4f] text-white rounded-br-sm'
                                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-100 dark:border-gray-700 rounded-bl-sm'
                                        }`}
                                >
                                    <p className="whitespace-pre-line text-sm leading-relaxed">
                                        {message.content}
                                    </p>

                                    {/* الخيارات السريعة - محسّنة */}
                                    {message.options && message.type === 'bot' && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-2">
                                            {message.options.map((option) => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => handleQuickReply(option.action)}
                                                    className="px-3 py-1.5 bg-[#0f3c35]/5 dark:bg-[#0f3c35]/20 
                                                             text-[#0f3c35] dark:text-emerald-400 text-xs font-medium
                                                             rounded-lg hover:bg-[#0f3c35]/10 dark:hover:bg-[#0f3c35]/30
                                                             transition-colors border border-[#0f3c35]/10 dark:border-emerald-500/20"
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* مؤشر الكتابة - محسّن */}
                        {isTyping && (
                            <div className="flex items-end gap-2 flex-row-reverse">
                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 shadow-sm 
                                              border border-gray-100 dark:border-gray-600 flex items-center justify-center">
                                    <img src="https://syrian.zone/syid/materials/logo.ai.svg" alt="" className="w-5 h-5" />
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 
                                              shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-[#0f3c35] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-[#0f3c35] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-[#0f3c35] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* حقل الإدخال - محسّن مع دعم الصوت */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 
                                  bg-white dark:bg-gray-800">
                        <div className="flex gap-2 items-center">
                            {/* زر الميكروفون */}
                            <button
                                onClick={isListening ? stopListening : startListening}
                                className={`w-12 h-12 rounded-xl transition-all duration-300
                                          flex items-center justify-center shadow-lg
                                          ${isListening
                                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                        : 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                                    } text-white`}
                                title={isListening ? 'إيقاف الاستماع' : 'تحدث معي (Alt+V)'}
                                aria-label={isListening ? 'إيقاف الاستماع' : 'بدء التحدث'}
                            >
                                {isListening ? (
                                    // أيقونة إيقاف
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M6 6h12v12H6z" />
                                    </svg>
                                ) : (
                                    // أيقونة ميكروفون
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                                    </svg>
                                )}
                            </button>

                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={isListening ? '🎙️ جاري الاستماع...' : 'اكتب سؤالك أو تحدث...'}
                                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 
                                             text-gray-800 dark:text-white rounded-xl
                                             border transition-all placeholder:text-gray-400
                                             focus:outline-none focus:ring-2 focus:ring-[#0f3c35]/50 
                                             focus:border-[#0f3c35] dark:focus:ring-emerald-500/50
                                             ${isListening
                                            ? 'border-red-400 ring-2 ring-red-200 dark:ring-red-800/50'
                                            : 'border-gray-200 dark:border-gray-600'
                                        }`}
                                    aria-label="حقل الإدخال النصي"
                                    disabled={isListening}
                                />
                                {/* مؤشر الاستماع */}
                                {isListening && (
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1">
                                        <span className="w-1.5 h-4 bg-red-500 rounded-full animate-pulse"></span>
                                        <span className="w-1.5 h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '100ms' }}></span>
                                        <span className="w-1.5 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></span>
                                    </div>
                                )}
                            </div>

                            {/* زر تفعيل/إيقاف الصوت */}
                            <button
                                onClick={() => {
                                    setIsTTSEnabled(!isTTSEnabled);
                                    if (!isTTSEnabled) {
                                        speak('تم تفعيل القراءة الصوتية');
                                    } else if (synthRef.current) {
                                        synthRef.current.cancel();
                                    }
                                }}
                                className={`w-10 h-10 rounded-lg transition-all duration-300
                                          flex items-center justify-center
                                          ${isTTSEnabled
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                    }`}
                                title={isTTSEnabled ? 'إيقاف القراءة الصوتية' : 'تفعيل القراءة الصوتية'}
                                aria-label={isTTSEnabled ? 'إيقاف القراءة الصوتية' : 'تفعيل القراءة الصوتية'}
                            >
                                {isTTSEnabled ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                    </svg>
                                )}
                            </button>

                            {/* زر تفعيل/إيقاف اختصارات لوحة المفاتيح */}
                            <button
                                onClick={() => {
                                    const newValue = !shortcutsEnabled;
                                    setShortcutsEnabled(newValue);
                                    localStorage.setItem('chatbot-shortcuts-enabled', String(newValue));
                                }}
                                className={`w-10 h-10 rounded-lg transition-all duration-300
                                          flex items-center justify-center
                                          ${shortcutsEnabled
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                    }`}
                                title={shortcutsEnabled ? 'إيقاف اختصارات لوحة المفاتيح' : 'تفعيل اختصارات لوحة المفاتيح'}
                                aria-label={shortcutsEnabled ? 'إيقاف اختصارات لوحة المفاتيح' : 'تفعيل اختصارات لوحة المفاتيح'}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                    <rect x="6" y="8" width="12" height="8" rx="1" strokeWidth={1.5} />
                                    <path strokeLinecap="round" strokeWidth={1.5} d="M8 11h2m2 0h2m2 0h2M8 14h8" />
                                </svg>
                            </button>

                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isListening}
                                className="w-12 h-12 bg-gradient-to-br from-[#0f3c35] to-[#1a5c4f] 
                                         hover:from-[#1a5c4f] hover:to-[#0f3c35]
                                         text-white rounded-xl transition-all duration-300
                                         disabled:opacity-40 disabled:cursor-not-allowed
                                         flex items-center justify-center shadow-lg
                                         hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                                aria-label="إرسال الرسالة"
                            >
                                <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>

                        {/* نص المساعدة */}
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                            {isListening
                                ? '🎙️ تحدث الآن... اضغط على المربع للإيقاف'
                                : shortcutsEnabled
                                    ? 'Enter للإرسال • 🎙️ للتحدث • Alt+H لفتح/إغلاق المساعد'
                                    : 'Enter للإرسال • 🎙️ للتحدث • اختصارات لوحة المفاتيح معطّلة'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Chatbot;
