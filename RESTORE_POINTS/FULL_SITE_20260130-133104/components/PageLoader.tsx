import React from 'react';

/**
 * 🔄 مكون التحميل للصفحات
 * يظهر أثناء تحميل الصفحات بشكل كسول (Lazy Loading)
 */
const PageLoader: React.FC<{ message?: string }> = ({ message = 'جارٍ التحميل...' }) => {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
                {/* Spinner Animation */}
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full animate-spin border-t-emerald-600 dark:border-t-emerald-400 mx-auto"></div>
                    {/* Inner pulse */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-full animate-pulse"></div>
                    </div>
                </div>

                {/* Loading Text */}
                <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg font-medium animate-pulse">
                    {message}
                </p>

                {/* Progress Bar */}
                <div className="mt-4 w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mx-auto">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-loading-bar"></div>
                </div>
            </div>
        </div>
    );
};

export default PageLoader;
