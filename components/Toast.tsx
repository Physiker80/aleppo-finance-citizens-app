import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

// أنواع الإشعارات
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Hook لاستخدام الإشعارات
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        // إرجاع دوال وهمية إذا لم يكن هناك Provider
        return {
            showToast: () => { },
            success: () => { },
            error: () => { },
            warning: () => { },
            info: () => { },
        };
    }
    return context;
};

// مكون الإشعار الفردي
const ToastItem: React.FC<{ toast: ToastMessage; onClose: (id: string) => void }> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(toast.id);
        }, toast.duration || 4000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onClose]);

    const icons: Record<ToastType, string> = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
    };

    const colors: Record<ToastType, string> = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500',
    };

    return (
        <div
            className={`${colors[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in min-w-[280px] max-w-md`}
            role="alert"
        >
            <span className="text-xl">{icons[toast.type]}</span>
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
                onClick={() => onClose(toast.id)}
                className="text-white/80 hover:text-white transition-colors"
            >
                ✕
            </button>
        </div>
    );
};

// مكون Container للإشعارات
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
    const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
    const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
    const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}
            {/* Container للإشعارات */}
            <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} onClose={removeToast} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// CSS للتحريك
const style = document.createElement('style');
style.textContent = `
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
`;
if (typeof document !== 'undefined' && !document.querySelector('#toast-styles')) {
    style.id = 'toast-styles';
    document.head.appendChild(style);
}

export default ToastProvider;
