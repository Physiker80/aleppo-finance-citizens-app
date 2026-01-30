// =====================================================
// 😊 Sentiment Analysis System
// نظام تحليل المشاعر
// =====================================================

export type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed';
export type Emotion = 'happy' | 'sad' | 'angry' | 'frustrated' | 'worried' | 'hopeful' | 'neutral';
export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export interface SentimentResult {
    sentiment: Sentiment;
    score: number; // -1 إلى 1
    confidence: number; // 0 إلى 1
    emotions: Array<{ emotion: Emotion; score: number }>;
    urgency: Urgency;
    keywords: string[];
    suggestions: string[];
}

// قاموس الكلمات الإيجابية
const POSITIVE_WORDS = [
    'شكر', 'شكراً', 'ممتاز', 'رائع', 'جيد', 'أحسنت', 'مميز',
    'سعيد', 'راض', 'مرتاح', 'أشكر', 'تقدير', 'احترام', 'مبدع',
    'متميز', 'فعال', 'سريع', 'مفيد', 'محترم', 'ممتن', 'أمل'
];

// قاموس الكلمات السلبية
const NEGATIVE_WORDS = [
    'سيء', 'فاشل', 'مشكلة', 'خطأ', 'تأخير', 'إهمال', 'سوء',
    'غضب', 'زعل', 'مستاء', 'محبط', 'ظلم', 'فساد', 'رشوة',
    'كارثة', 'فضيحة', 'عار', 'مهمل', 'بطيء', 'معطل', 'مرفوض',
    'ضائع', 'منسي', 'متجاهل', 'لا يوجد', 'لم', 'لن', 'أسوأ'
];

// قاموس الإلحاح
const URGENCY_WORDS: Record<Urgency, string[]> = {
    critical: ['طارئ', 'فوري', 'عاجل جداً', 'كارثة', 'لا يحتمل', 'خطير'],
    high: ['عاجل', 'سريع', 'ضروري', 'مستعجل', 'مهم جداً', 'فوراً'],
    medium: ['مهم', 'قريباً', 'بأقرب وقت', 'مطلوب'],
    low: ['عند الإمكان', 'غير مستعجل', 'روتيني', 'عادي']
};

// قاموس المشاعر
const EMOTION_WORDS: Record<Emotion, string[]> = {
    happy: ['سعيد', 'مسرور', 'راض', 'فرح', 'مبسوط', 'سار'],
    sad: ['حزين', 'مكتئب', 'يائس', 'محبط', 'بائس'],
    angry: ['غاضب', 'زعلان', 'ثائر', 'مستفز', 'متضايق جداً'],
    frustrated: ['محبط', 'متضايق', 'منزعج', 'مستاء', 'متذمر'],
    worried: ['قلق', 'خائف', 'متوتر', 'مضطرب', 'متخوف'],
    hopeful: ['أمل', 'رجاء', 'أتمنى', 'أرجو', 'متفائل'],
    neutral: []
};

// مضخمات
const INTENSIFIERS = ['جداً', 'كثيراً', 'للغاية', 'تماماً', 'أبداً'];
const NEGATORS = ['لا', 'لم', 'لن', 'ما', 'ليس', 'غير'];

/**
 * تحليل المشاعر
 */
export function analyzeSentiment(text: string): SentimentResult {
    const words = tokenize(text);

    let positiveScore = 0;
    let negativeScore = 0;
    const detectedEmotions: Record<Emotion, number> = {
        happy: 0, sad: 0, angry: 0, frustrated: 0, worried: 0, hopeful: 0, neutral: 0
    };
    const foundKeywords: string[] = [];

    let currentIntensifier = 1;
    let isNegated = false;

    words.forEach((word, index) => {
        // فحص المضخمات
        if (INTENSIFIERS.some(i => word.includes(i))) {
            currentIntensifier = 1.5;
            return;
        }

        // فحص النفي
        if (NEGATORS.includes(word)) {
            isNegated = true;
            return;
        }

        // فحص الكلمات الإيجابية
        POSITIVE_WORDS.forEach(pw => {
            if (word.includes(pw)) {
                const score = isNegated ? -1 : 1;
                positiveScore += score * currentIntensifier;
                if (!isNegated) foundKeywords.push(pw);
            }
        });

        // فحص الكلمات السلبية
        NEGATIVE_WORDS.forEach(nw => {
            if (word.includes(nw)) {
                const score = isNegated ? -1 : 1;
                negativeScore += score * currentIntensifier;
                if (!isNegated) foundKeywords.push(nw);
            }
        });

        // فحص المشاعر
        Object.entries(EMOTION_WORDS).forEach(([emotion, words]) => {
            words.forEach(ew => {
                if (word.includes(ew)) {
                    const modifier = isNegated ? -1 : 1;
                    detectedEmotions[emotion as Emotion] += modifier * currentIntensifier;
                }
            });
        });

        // إعادة تعيين بعد كلمتين
        if (index > 0 && (index + 1) % 2 === 0) {
            currentIntensifier = 1;
            isNegated = false;
        }
    });

    // حساب الدرجة الإجمالية
    const totalPositive = Math.max(positiveScore, 0);
    const totalNegative = Math.max(negativeScore, 0);
    const total = totalPositive + totalNegative || 1;

    const score = (totalPositive - totalNegative) / (total);
    const normalizedScore = Math.max(-1, Math.min(1, score));

    // تحديد المشاعر
    let sentiment: Sentiment;
    if (normalizedScore > 0.3) sentiment = 'positive';
    else if (normalizedScore < -0.3) sentiment = 'negative';
    else if (totalPositive > 0 && totalNegative > 0) sentiment = 'mixed';
    else sentiment = 'neutral';

    // حساب الثقة
    const confidence = Math.min(
        (totalPositive + totalNegative) / (words.length * 0.1),
        1
    );

    // ترتيب المشاعر
    const emotions = Object.entries(detectedEmotions)
        .map(([emotion, score]) => ({ emotion: emotion as Emotion, score: Math.abs(score) }))
        .filter(e => e.score > 0)
        .sort((a, b) => b.score - a.score);

    if (emotions.length === 0) {
        emotions.push({ emotion: 'neutral', score: 1 });
    }

    // تحديد الإلحاح
    const urgency = detectUrgency(text);

    // الاقتراحات
    const suggestions = generateSuggestions(sentiment, emotions, urgency);

    return {
        sentiment,
        score: normalizedScore,
        confidence,
        emotions,
        urgency,
        keywords: [...new Set(foundKeywords)],
        suggestions
    };
}

/**
 * تقسيم النص
 */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^\u0600-\u06FFa-zA-Z\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1);
}

/**
 * اكتشاف الإلحاح
 */
function detectUrgency(text: string): Urgency {
    const lowerText = text.toLowerCase();

    for (const [level, words] of Object.entries(URGENCY_WORDS)) {
        for (const word of words) {
            if (lowerText.includes(word)) {
                return level as Urgency;
            }
        }
    }

    return 'medium';
}

/**
 * توليد الاقتراحات
 */
function generateSuggestions(
    sentiment: Sentiment,
    emotions: Array<{ emotion: Emotion; score: number }>,
    urgency: Urgency
): string[] {
    const suggestions: string[] = [];

    // اقتراحات حسب المشاعر
    if (sentiment === 'negative') {
        suggestions.push('يُنصح بالرد بأسلوب متعاطف واعتذاري');
        suggestions.push('التأكيد على أهمية الشكوى والاهتمام بها');
    }

    if (sentiment === 'positive') {
        suggestions.push('يمكن شكر المواطن على ثقته وتقديره');
    }

    // اقتراحات حسب العواطف
    const topEmotion = emotions[0]?.emotion;

    if (topEmotion === 'angry') {
        suggestions.push('التعامل بهدوء وتفهم');
        suggestions.push('تجنب الردود الدفاعية');
    }

    if (topEmotion === 'frustrated') {
        suggestions.push('شرح الإجراءات بوضوح');
        suggestions.push('تقديم جدول زمني واضح');
    }

    if (topEmotion === 'worried') {
        suggestions.push('طمأنة المواطن حول الوضع');
        suggestions.push('توضيح الخطوات القادمة');
    }

    // اقتراحات حسب الإلحاح
    if (urgency === 'critical') {
        suggestions.push('⚠️ يتطلب معالجة فورية');
        suggestions.push('تصعيد للمسؤول المختص');
    }

    if (urgency === 'high') {
        suggestions.push('إعطاء أولوية عالية');
    }

    return suggestions;
}

/**
 * تحليل اتجاه المشاعر عبر الوقت
 */
export function analyzeSentimentTrend(
    items: Array<{ text: string; date: Date }>
): Array<{ date: string; averageScore: number; count: number }> {
    const byDate = new Map<string, { total: number; count: number }>();

    items.forEach(item => {
        const dateKey = item.date.toISOString().split('T')[0];
        const result = analyzeSentiment(item.text);

        const existing = byDate.get(dateKey) || { total: 0, count: 0 };
        existing.total += result.score;
        existing.count++;
        byDate.set(dateKey, existing);
    });

    return [...byDate.entries()]
        .map(([date, data]) => ({
            date,
            averageScore: data.total / data.count,
            count: data.count
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * تحليل المشاعر حسب القسم
 */
export function analyzeSentimentByDepartment(
    items: Array<{ text: string; department: string }>
): Record<string, { average: number; positive: number; negative: number; neutral: number }> {
    const byDept: Record<string, { total: number; count: number; positive: number; negative: number; neutral: number }> = {};

    items.forEach(item => {
        if (!byDept[item.department]) {
            byDept[item.department] = { total: 0, count: 0, positive: 0, negative: 0, neutral: 0 };
        }

        const result = analyzeSentiment(item.text);
        byDept[item.department].total += result.score;
        byDept[item.department].count++;

        if (result.sentiment === 'positive') byDept[item.department].positive++;
        else if (result.sentiment === 'negative') byDept[item.department].negative++;
        else byDept[item.department].neutral++;
    });

    const result: Record<string, { average: number; positive: number; negative: number; neutral: number }> = {};

    Object.entries(byDept).forEach(([dept, data]) => {
        result[dept] = {
            average: data.total / data.count,
            positive: data.positive,
            negative: data.negative,
            neutral: data.neutral
        };
    });

    return result;
}

/**
 * الحصول على ملخص المشاعر
 */
export function getSentimentSummary(results: SentimentResult[]): {
    averageScore: number;
    distribution: Record<Sentiment, number>;
    topEmotions: Array<{ emotion: Emotion; count: number }>;
    urgencyDistribution: Record<Urgency, number>;
    topKeywords: Array<{ word: string; count: number }>;
} {
    const distribution: Record<Sentiment, number> = {
        positive: 0, negative: 0, neutral: 0, mixed: 0
    };

    const urgencyDist: Record<Urgency, number> = {
        low: 0, medium: 0, high: 0, critical: 0
    };

    const emotionCounts = new Map<Emotion, number>();
    const keywordCounts = new Map<string, number>();

    let totalScore = 0;

    results.forEach(result => {
        totalScore += result.score;
        distribution[result.sentiment]++;
        urgencyDist[result.urgency]++;

        result.emotions.forEach(e => {
            emotionCounts.set(e.emotion, (emotionCounts.get(e.emotion) || 0) + 1);
        });

        result.keywords.forEach(k => {
            keywordCounts.set(k, (keywordCounts.get(k) || 0) + 1);
        });
    });

    return {
        averageScore: results.length > 0 ? totalScore / results.length : 0,
        distribution,
        topEmotions: [...emotionCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([emotion, count]) => ({ emotion, count })),
        urgencyDistribution: urgencyDist,
        topKeywords: [...keywordCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }))
    };
}

export default {
    analyzeSentiment,
    analyzeSentimentTrend,
    analyzeSentimentByDepartment,
    getSentimentSummary
};
