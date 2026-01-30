import React, { useState, useEffect } from 'react';
import { FaCookie, FaTimes, FaShieldAlt, FaCog, FaChartBar, FaExclamationTriangle, FaInfoCircle, FaCheck } from 'react-icons/fa';
import { CookieManager } from '../utils/cookieManager';
import { CookieCategory, CookiePreferences } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';

interface CookieBannerProps {
  onAcceptAll?: () => void;
  onAcceptEssential?: () => void;
  onShowPrivacyPolicy?: () => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({
  onAcceptAll,
  onAcceptEssential, 
  onShowPrivacyPolicy
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const cookieManager = CookieManager.getInstance();

  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = cookieManager.hasValidConsent();
    setIsVisible(!hasConsent);
    
    if (hasConsent) {
      setPreferences(cookieManager.loadPreferences());
    }
    
    setCategories(cookieManager.getCookieCategories());
  }, []);

  const handleAcceptAll = () => {
    cookieManager.acceptAll();
    setIsVisible(false);
    onAcceptAll?.();
  };

  const handleAcceptEssential = () => {
    cookieManager.acceptEssential();
    setIsVisible(false);
    onAcceptEssential?.();
  };

  const handleCustomizeSettings = () => {
    setShowDetails(true);
  };

  const handleSaveCustomPreferences = () => {
    const newPreferences = cookieManager.createDefaultPreferences();
    
    categories.forEach(category => {
      if (category.id in newPreferences.categories) {
        newPreferences.categories[category.id as keyof typeof newPreferences.categories] = category.enabled;
      }
    });

    cookieManager.savePreferences(newPreferences);
    setPreferences(newPreferences);
    setIsVisible(false);
    setShowDetails(false);
  };

  const handleToggleCategory = (categoryId: string, enabled: boolean) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, enabled: enabled }
          : cat
      )
    );
  };

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'essential': return <FaExclamationTriangle className="text-red-500" />;
      case 'security': return <FaShieldAlt className="text-blue-500" />;
      case 'functional': return <FaCog className="text-green-500" />;
      case 'analytics': return <FaChartBar className="text-purple-500" />;
      default: return <FaInfoCircle className="text-gray-500" />;
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
        <Card className="mx-auto max-w-4xl">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <FaCookie className="text-3xl text-amber-600" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    ملفات تعريف الارتباط وحماية البيانات
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    مديرية مالية حلب - الجمهورية العربية السورية
                  </p>
                </div>
              </div>
              {!showDetails && (
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {!showDetails ? (
              // Simple view
              <div className="space-y-4">
                <div className="text-right">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    نحن نستخدم ملفات تعريف الارتباط (الكوكيز) وتقنيات مماثلة لضمان الأمان وتحسين تجربة استخدامك لنظام الاستعلامات والشكاوى. 
                    تشمل البيانات المجمعة: معلومات الجلسة، البيانات الأمنية، وتفضيلات المستخدم.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    بموجب القوانين السورية، نحتاج لموافقتك على استخدام هذه التقنيات.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    <FaShieldAlt className="inline ml-2" />
                    البيانات التي نجمعها:
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 text-right">
                    <li>• معرفات الجلسة الآمنة لحماية حسابك</li>
                    <li>• بيانات المصادقة ومكافحة التزوير</li>
                    <li>• عناوين IP وبيانات المتصفح لأغراض أمنية</li>
                    <li>• تفضيلات المستخدم وإعدادات النظام</li>
                    <li>• السجلات الأمنية ومراقبة الأنشطة المشبوهة</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={handleAcceptAll}
                    variant="primary"
                    className="flex-1"
                  >
                    <FaCheck className="ml-2" />
                    قبول جميع ملفات تعريف الارتباط
                  </Button>
                  <Button
                    onClick={handleAcceptEssential}
                    variant="secondary"
                    className="flex-1"
                  >
                    قبول الأساسية فقط
                  </Button>
                  <Button
                    onClick={handleCustomizeSettings}
                    variant="secondary"
                    className="flex-1"
                  >
                    <FaCog className="ml-2" />
                    تخصيص الإعدادات
                  </Button>
                </div>

                <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={onShowPrivacyPolicy}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                  >
                    اقرأ سياسة الخصوصية وحماية البيانات
                  </button>
                </div>
              </div>
            ) : (
              // Detailed view
              <div className="space-y-6 max-h-96 overflow-y-auto">
                <div className="text-right">
                  <h4 className="font-bold text-lg mb-3">تخصيص إعدادات ملفات تعريف الارتباط</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    يمكنك التحكم في أنواع ملفات تعريف الارتباط التي نستخدمها. بعض الملفات ضرورية لعمل النظام ولا يمكن تعطيلها.
                  </p>
                </div>

                <div className="space-y-4">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          {getCategoryIcon(category.id)}
                          <div>
                            <h5 className="font-semibold text-gray-900 dark:text-white">
                              {category.name}
                            </h5>
                            {category.required && (
                              <span className="text-xs text-red-600 dark:text-red-400">
                                (مطلوب)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={category.enabled}
                            disabled={category.required}
                            onChange={(e) => handleToggleCategory(category.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 text-right">
                        {category.description}
                      </p>

                      <div className="space-y-2">
                        <h6 className="font-medium text-sm text-gray-800 dark:text-gray-200">
                          ملفات تعريف الارتباط المتضمنة:
                        </h6>
                        {category.cookies.map((cookie, index) => (
                          <div key={index} className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
                            <div className="flex justify-between items-start">
                              <div className="text-right flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {cookie.name}
                                </div>
                                <div className="text-gray-600 dark:text-gray-300 mt-1">
                                  {cookie.description}
                                </div>
                              </div>
                              <div className="text-left text-gray-500 dark:text-gray-400 min-w-0 mr-3">
                                {cookie.duration}
                              </div>
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 mt-1 text-right">
                              الغرض: {cookie.purpose}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={handleSaveCustomPreferences}
                    variant="primary"
                    className="flex-1"
                  >
                    <FaCheck className="ml-2" />
                    حفظ التفضيلات
                  </Button>
                  <Button
                    onClick={() => setShowDetails(false)}
                    variant="secondary"
                    className="flex-1"
                  >
                    العودة
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
};

export default CookieBanner;