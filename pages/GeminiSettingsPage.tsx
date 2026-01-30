/**
 * صفحة إعدادات Gemini AI
 * Gemini AI Settings Page
 * 
 * إدارة إعدادات الذكاء الاصطناعي Gemini في لوحة التحكم
 */

import React, { useState, useEffect } from 'react';
import {
    getGeminiConfig,
    saveGeminiConfig,
    testGeminiConnection,
    getDefaultApiKey,
    GeminiConfig
} from '../services/geminiService';

interface GeminiSettingsPageProps {
    onBack?: () => void;
}

const GeminiSettingsPage: React.FC<GeminiSettingsPageProps> = ({ onBack }) => {
    const [config, setConfig] = useState<GeminiConfig>({
        apiKey: '',
        enabled: true,
        useDefaultKey: true
    });
    const [showApiKey, setShowApiKey] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [customApiKey, setCustomApiKey] = useState('');

    // تحميل الإعدادات
    useEffect(() => {
        const savedConfig = getGeminiConfig();
        setConfig(savedConfig);
        if (!savedConfig.useDefaultKey && savedConfig.apiKey !== getDefaultApiKey()) {
            setCustomApiKey(savedConfig.apiKey);
        }
    }, []);

    // اختبار الاتصال
    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        const apiKeyToTest = config.useDefaultKey ? getDefaultApiKey() : customApiKey;
        const isValid = await testGeminiConnection(apiKeyToTest);

        setTestResult(isValid ? 'success' : 'error');
        setIsTesting(false);
    };

    // حفظ الإعدادات
    const handleSave = async () => {
        setIsSaving(true);

        const newConfig: GeminiConfig = {
            apiKey: config.useDefaultKey ? getDefaultApiKey() : customApiKey,
            enabled: config.enabled,
            useDefaultKey: config.useDefaultKey
        };

        saveGeminiConfig(newConfig);
        setConfig(newConfig);

        setTimeout(() => {
            setIsSaving(false);
            setTestResult('success');
        }, 500);
    };

    // إعادة تعيين للافتراضي
    const handleResetToDefault = () => {
        const defaultConfig: GeminiConfig = {
            apiKey: getDefaultApiKey(),
            enabled: true,
            useDefaultKey: true
        };
        setConfig(defaultConfig);
        setCustomApiKey('');
        saveGeminiConfig(defaultConfig);
        setTestResult(null);
    };

    // تبديل استخدام المفتاح المخصص
    const handleToggleCustomKey = (useCustom: boolean) => {
        setConfig(prev => ({
            ...prev,
            useDefaultKey: !useCustom
        }));
        setTestResult(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
            <div className="max-w-2xl mx-auto">
                {/* الهيدر */}
                <div className="flex items-center gap-4 mb-8">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                        >
                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <span className="text-3xl">🤖</span>
                            إعدادات Gemini AI
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            إدارة تكامل الذكاء الاصطناعي مع المساعد الذكي
                        </p>
                    </div>
                </div>

                {/* البطاقة الرئيسية */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                    {/* حالة التفعيل */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                                              ${config.enabled
                                        ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                        : 'bg-gray-200 dark:bg-gray-700'}`}>
                                    <span className="text-2xl">{config.enabled ? '✨' : '💤'}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white">
                                        حالة Gemini AI
                                    </h3>
                                    <p className={`text-sm ${config.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                                        {config.enabled ? 'مفعّل ويعمل' : 'معطّل'}
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.enabled}
                                    onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                                              peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer 
                                              dark:bg-gray-700 peer-checked:after:translate-x-full 
                                              peer-checked:after:border-white after:content-[''] after:absolute 
                                              after:top-0.5 after:right-[4px] after:bg-white after:border-gray-300 
                                              after:border after:rounded-full after:h-6 after:w-6 after:transition-all 
                                              dark:border-gray-600 peer-checked:bg-purple-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* إعدادات مفتاح API */}
                    <div className="p-6 space-y-6">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span>🔑</span> مفتاح API
                        </h3>

                        {/* خيار المفتاح الافتراضي */}
                        <div
                            onClick={() => handleToggleCustomKey(false)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all
                                      ${config.useDefaultKey
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                                              ${config.useDefaultKey
                                        ? 'border-purple-500 bg-purple-500'
                                        : 'border-gray-300 dark:border-gray-600'}`}>
                                    {config.useDefaultKey && (
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800 dark:text-white">
                                        استخدام المفتاح الافتراضي
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        مفتاح API مُعدّ مسبقاً وجاهز للاستخدام
                                    </p>
                                </div>
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 
                                               text-xs font-medium rounded-full">
                                    موصى به
                                </span>
                            </div>

                            {config.useDefaultKey && (
                                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <code className="text-sm text-gray-600 dark:text-gray-300 font-mono" dir="ltr">
                                            {showApiKey ? getDefaultApiKey() : '••••••••••••••••••••••••••••••••••••'}
                                        </code>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowApiKey(!showApiKey);
                                            }}
                                            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                        >
                                            {showApiKey ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* خيار المفتاح المخصص */}
                        <div
                            onClick={() => handleToggleCustomKey(true)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all
                                      ${!config.useDefaultKey
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                                              ${!config.useDefaultKey
                                        ? 'border-purple-500 bg-purple-500'
                                        : 'border-gray-300 dark:border-gray-600'}`}>
                                    {!config.useDefaultKey && (
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800 dark:text-white">
                                        استخدام مفتاح مخصص
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        أدخل مفتاح API الخاص بك من Google AI Studio
                                    </p>
                                </div>
                            </div>

                            {!config.useDefaultKey && (
                                <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={customApiKey}
                                        onChange={(e) => setCustomApiKey(e.target.value)}
                                        placeholder="AIza..."
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 
                                                 dark:border-gray-600 rounded-lg font-mono text-sm
                                                 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        dir="ltr"
                                    />
                                    <a
                                        href="https://makersuite.google.com/app/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                                    >
                                        <span>📝</span> احصل على مفتاح API مجاني من Google
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* نتيجة الاختبار */}
                        {testResult && (
                            <div className={`p-4 rounded-xl flex items-center gap-3
                                          ${testResult === 'success'
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                                <span className="text-2xl">{testResult === 'success' ? '✅' : '❌'}</span>
                                <p className="font-medium">
                                    {testResult === 'success'
                                        ? 'تم التحقق بنجاح! Gemini AI جاهز للعمل.'
                                        : 'فشل الاتصال. تحقق من صحة مفتاح API.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleTestConnection}
                                disabled={isTesting || (!config.useDefaultKey && !customApiKey)}
                                className="flex-1 py-3 px-6 bg-white dark:bg-gray-600 border border-gray-200 
                                         dark:border-gray-500 text-gray-700 dark:text-gray-200 rounded-xl
                                         hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors
                                         disabled:opacity-50 disabled:cursor-not-allowed
                                         flex items-center justify-center gap-2"
                            >
                                {isTesting ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                                        جاري الاختبار...
                                    </>
                                ) : (
                                    <>
                                        <span>🔌</span> اختبار الاتصال
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={isSaving || (!config.useDefaultKey && !customApiKey)}
                                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 
                                         hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl
                                         transition-all disabled:opacity-50 disabled:cursor-not-allowed
                                         flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                            >
                                {isSaving ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        جاري الحفظ...
                                    </>
                                ) : (
                                    <>
                                        <span>💾</span> حفظ الإعدادات
                                    </>
                                )}
                            </button>
                        </div>

                        <button
                            onClick={handleResetToDefault}
                            className="w-full mt-3 py-2 text-sm text-gray-500 dark:text-gray-400 
                                     hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            🔄 إعادة تعيين للإعدادات الافتراضية
                        </button>
                    </div>
                </div>

                {/* معلومات إضافية */}
                <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span>ℹ️</span> معلومات عن Gemini AI
                    </h3>
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                        <p>
                            <strong>• ما هو Gemini AI؟</strong><br />
                            نموذج ذكاء اصطناعي متطور من Google يساعد في الإجابة على استفسارات المواطنين بشكل ذكي.
                        </p>
                        <p>
                            <strong>• كيف يعمل؟</strong><br />
                            عندما لا يجد المساعد إجابة في قاعدة المعرفة المحلية، يستخدم Gemini للحصول على إجابة مناسبة.
                        </p>
                        <p>
                            <strong>• هل هو آمن؟</strong><br />
                            نعم، Gemini مُعدّ للرد بشكل مناسب لسياق مديرية المالية ولا يشارك معلومات حساسة.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeminiSettingsPage;
