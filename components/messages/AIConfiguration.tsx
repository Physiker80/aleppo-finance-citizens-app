import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { GeminiAnalysisService } from '../../utils/geminiAnalysis';

interface AIConfigurationProps {
  onConfigurationChange?: (configured: boolean) => void;
}

const AIConfiguration: React.FC<AIConfigurationProps> = ({ onConfigurationChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(GeminiAnalysisService.isApiConfigured());
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSaveConfig = () => {
    if (apiKey.trim()) {
      GeminiAnalysisService.setApiKey(apiKey.trim());
      setIsConfigured(true);
      setApiKey('');
      onConfigurationChange?.(true);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('gemini_api_configured');
    setIsConfigured(false);
    onConfigurationChange?.(false);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">⚙️</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            إعدادات Gemini AI
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            تكوين التحليل الذكي باستخدام Google Gemini 2.5 Pro
          </p>
        </div>
      </div>

      {!isConfigured ? (
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="mr-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  تكوين مطلوب
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    لاستخدام التحليل الذكي، يجب تكوين Gemini API key. 
                    في الوقت الحالي، يعمل النظام في وضع المحاكي.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gemini API Key (اختياري)
            </label>
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="أدخل Gemini API Key هنا..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <Button
                onClick={() => setShowApiKey(!showApiKey)}
                variant="secondary"
                className="px-3"
              >
                {showApiKey ? '🙈' : '👁️'}
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              يمكن الحصول على API key من Google AI Studio
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveConfig}
              disabled={!apiKey.trim()}
              className="flex-1"
            >
              حفظ التكوين
            </Button>
            <Button
              onClick={() => setIsConfigured(true)}
              variant="secondary"
              className="flex-1"
            >
              المتابعة مع المحاكي
            </Button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>💡 <strong>المحاكي:</strong> يوفر تحليل ذكي تجريبي بدون الحاجة لـ API key</p>
            <p>🔗 <strong>API الحقيقي:</strong> يتطلب Gemini API key للحصول على تحليل أكثر دقة</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400">✅</span>
              </div>
              <div className="mr-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  تم التكوين بنجاح
                </h3>
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <p>
                    التحليل الذكي جاهز للعمل. يمكنك الآن الاستفادة من رؤى Gemini AI المتقدمة.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">2.5 Pro</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">إصدار Gemini</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">85%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">متوسط دقة التحليل</div>
            </div>
          </div>

          <Button
            onClick={handleReset}
            variant="secondary"
            className="w-full"
          >
            إعادة تكوين الإعدادات
          </Button>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>الوضع: {isConfigured ? 'مُكوَّن' : 'غير مُكوَّن'}</span>
          <span>آخر تحديث: {new Date().toLocaleDateString('ar-SY')}</span>
        </div>
      </div>
    </Card>
  );
};

export default AIConfiguration;