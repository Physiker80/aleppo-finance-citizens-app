/**
 * خدمة Gemini AI للمساعد الذكي
 * Gemini AI Service for Smart Assistant
 * 
 * تكامل مع Google Gemini API للحصول على إجابات ذكية
 */

// إعدادات Gemini
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// مفتاح API الافتراضي
const DEFAULT_API_KEY = 'AIzaSyAh4KwrrNJQspjxhYT9txJbPK9wGttoCtg';

// السياق العربي السوري للمساعد
const SYSTEM_CONTEXT = `أنت المساعد الذكي لمديرية مالية محافظة حلب في الجمهورية العربية السورية.

معلومات عن المديرية:
- الاسم: مديرية مالية محافظة حلب
- الموقع: حلب - شارع بارون، مبنى المديرية المالية
- أوقات العمل: الأحد - الخميس، 8:00 صباحاً - 2:00 ظهراً
- العطلة الرسمية: الجمعة والسبت

الخدمات المتاحة:
1. حجز المواعيد الإلكترونية
2. تقديم الشكاوى والاستعلامات
3. متابعة حالة الطلبات
4. خدمات الضرائب والرسوم
5. إصدار الشهادات وبراءات الذمة
6. الإعفاءات الضريبية

قواعد الرد:
- تحدث باللغة العربية الفصحى البسيطة
- كن مختصراً ومفيداً
- وجه المستخدم للخدمات المتاحة في الموقع
- إذا كان السؤال خارج نطاق المديرية، اعتذر بلطف
- استخدم الإيموجي بشكل معتدل
- لا تعطي معلومات خاطئة أو غير دقيقة`;

export interface GeminiResponse {
    success: boolean;
    message: string;
    error?: string;
}

export interface GeminiConfig {
    apiKey: string;
    enabled: boolean;
    useDefaultKey: boolean;
}

// الحصول على إعدادات Gemini من localStorage
export const getGeminiConfig = (): GeminiConfig => {
    try {
        const config = localStorage.getItem('geminiConfig');
        if (config) {
            const parsed = JSON.parse(config);
            return {
                apiKey: parsed.apiKey || DEFAULT_API_KEY,
                enabled: parsed.enabled ?? true, // مفعّل افتراضياً
                useDefaultKey: parsed.useDefaultKey ?? true
            };
        }
    } catch (error) {
        console.error('خطأ في قراءة إعدادات Gemini:', error);
    }
    // الإعدادات الافتراضية - مفعّل مع المفتاح الافتراضي
    return { apiKey: DEFAULT_API_KEY, enabled: true, useDefaultKey: true };
};

// حفظ إعدادات Gemini
export const saveGeminiConfig = (config: GeminiConfig): void => {
    try {
        localStorage.setItem('geminiConfig', JSON.stringify(config));
    } catch (error) {
        console.error('خطأ في حفظ إعدادات Gemini:', error);
    }
};

// الحصول على المفتاح الافتراضي
export const getDefaultApiKey = (): string => DEFAULT_API_KEY;

// التحقق من توفر Gemini
export const isGeminiAvailable = (): boolean => {
    const config = getGeminiConfig();
    return config.enabled && config.apiKey.length > 0;
};

// إرسال سؤال إلى Gemini
export const askGemini = async (question: string): Promise<GeminiResponse> => {
    const config = getGeminiConfig();

    if (!config.enabled || !config.apiKey) {
        return {
            success: false,
            message: '',
            error: 'Gemini غير مفعّل. يرجى إضافة مفتاح API من الإعدادات.'
        };
    }

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${config.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `${SYSTEM_CONTEXT}\n\nسؤال المستخدم: ${question}\n\nالرد:`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'خطأ في الاتصال بـ Gemini');
        }

        const data = await response.json();

        // استخراج النص من الرد
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            throw new Error('لم يتم الحصول على رد من Gemini');
        }

        return {
            success: true,
            message: generatedText.trim()
        };

    } catch (error) {
        console.error('خطأ في Gemini:', error);
        return {
            success: false,
            message: '',
            error: error instanceof Error ? error.message : 'خطأ غير معروف'
        };
    }
};

// اختبار اتصال Gemini
export const testGeminiConnection = async (apiKey: string): Promise<boolean> => {
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: 'قل "مرحباً" باللغة العربية فقط.'
                            }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 50,
                }
            })
        });

        return response.ok;
    } catch (error) {
        console.error('فشل اختبار Gemini:', error);
        return false;
    }
};

export default {
    askGemini,
    getGeminiConfig,
    saveGeminiConfig,
    isGeminiAvailable,
    testGeminiConnection
};
