import React, { useState, useContext } from 'react';
import { AppContext, AppStoreLinks } from '../App';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

interface AppStoreLinksManagerProps {
    onClose?: () => void;
}

const AppStoreLinksManager: React.FC<AppStoreLinksManagerProps> = ({ onClose }) => {
    const app = useContext(AppContext);
    const isAdmin = app?.currentEmployee?.role === 'مدير';

    const [links, setLinks] = useState<AppStoreLinks>(
        app?.appStoreLinks || {
            android: { enabled: false, url: '', qrCode: '' },
            ios: { enabled: false, url: '', qrCode: '' }
        }
    );
    const [saved, setSaved] = useState(false);

    if (!isAdmin) {
        return (
            <Card className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
                <p className="text-red-600 dark:text-red-400 text-center">
                    عذراً، هذه الصفحة متاحة للمدير فقط
                </p>
            </Card>
        );
    }

    const handleSave = () => {
        if (app?.updateAppStoreLinks) {
            app.updateAppStoreLinks(links);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            if (app?.addToast) {
                app.addToast({ message: 'تم حفظ روابط التطبيقات بنجاح', type: 'success' });
            }
        }
    };

    return (
        <Card className="p-6 bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </span>
                    إدارة روابط تطبيقات الموبايل
                </h2>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
                قم بتحديث روابط تحميل التطبيقات على متاجر Google Play و App Store. عند تفعيل الرابط، سيظهر للمستخدمين زر التحميل النشط بدلاً من "قريباً".
            </p>

            <div className="space-y-8">
                {/* Android Section */}
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700/30">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Google Play Store</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">رابط تحميل تطبيق Android</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={links.android.enabled}
                                onChange={(e) => setLinks({
                                    ...links,
                                    android: { ...links.android, enabled: e.target.checked }
                                })}
                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                            />
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                تفعيل رابط Google Play
                            </span>
                            {links.android.enabled && (
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                                    نشط
                                </span>
                            )}
                        </label>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                رابط التحميل
                            </label>
                            <Input
                                type="url"
                                value={links.android.url}
                                onChange={(e) => setLinks({
                                    ...links,
                                    android: { ...links.android, url: e.target.value }
                                })}
                                placeholder="https://play.google.com/store/apps/details?id=..."
                                className="w-full"
                                dir="ltr"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                رابط صورة QR Code (اختياري)
                            </label>
                            <Input
                                type="url"
                                value={links.android.qrCode || ''}
                                onChange={(e) => setLinks({
                                    ...links,
                                    android: { ...links.android, qrCode: e.target.value }
                                })}
                                placeholder="https://example.com/qr-android.png"
                                className="w-full"
                                dir="ltr"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                يمكنك استخدام أي خدمة لإنشاء QR Code مثل qr-code-generator.com
                            </p>
                        </div>
                    </div>
                </div>

                {/* iOS Section */}
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700/30">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Apple App Store</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">رابط تحميل تطبيق iOS</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={links.ios.enabled}
                                onChange={(e) => setLinks({
                                    ...links,
                                    ios: { ...links.ios, enabled: e.target.checked }
                                })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                تفعيل رابط App Store
                            </span>
                            {links.ios.enabled && (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                                    نشط
                                </span>
                            )}
                        </label>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                رابط التحميل
                            </label>
                            <Input
                                type="url"
                                value={links.ios.url}
                                onChange={(e) => setLinks({
                                    ...links,
                                    ios: { ...links.ios, url: e.target.value }
                                })}
                                placeholder="https://apps.apple.com/app/..."
                                className="w-full"
                                dir="ltr"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                رابط صورة QR Code (اختياري)
                            </label>
                            <Input
                                type="url"
                                value={links.ios.qrCode || ''}
                                onChange={(e) => setLinks({
                                    ...links,
                                    ios: { ...links.ios, qrCode: e.target.value }
                                })}
                                placeholder="https://example.com/qr-ios.png"
                                className="w-full"
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Section */}
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">معاينة الحالة</h4>
                <div className="flex flex-wrap gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${links.android.enabled && links.android.url ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                        </svg>
                        <span className="font-medium">
                            Android: {links.android.enabled && links.android.url ? 'متاح للتحميل' : 'قريباً'}
                        </span>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${links.ios.enabled && links.ios.url ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                        <span className="font-medium">
                            iOS: {links.ios.enabled && links.ios.url ? 'متاح للتحميل' : 'قريباً'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex items-center justify-between">
                <div>
                    {saved && (
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            تم الحفظ بنجاح
                        </span>
                    )}
                </div>
                <Button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    💾 حفظ التغييرات
                </Button>
            </div>
        </Card>
    );
};

export default AppStoreLinksManager;
