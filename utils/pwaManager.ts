// =====================================================
// 📱 PWA Service Worker Registration
// تسجيل Service Worker وإدارة التحديثات
// =====================================================

export interface PWAConfig {
    onSuccess?: () => void;
    onUpdate?: (registration: ServiceWorkerRegistration) => void;
    onOffline?: () => void;
    onOnline?: () => void;
}

class PWAManager {
    private registration: ServiceWorkerRegistration | null = null;
    private config: PWAConfig = {};

    /**
     * تسجيل Service Worker
     */
    async register(config: PWAConfig = {}): Promise<boolean> {
        this.config = config;

        if (!('serviceWorker' in navigator)) {
            console.warn('[PWA] Service Worker not supported');
            return false;
        }

        // انتظار تحميل الصفحة
        if (document.readyState !== 'complete') {
            await new Promise(resolve => window.addEventListener('load', resolve));
        }

        try {
            this.registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('[PWA] Service Worker registered successfully');

            // التحقق من التحديثات
            this.registration.addEventListener('updatefound', () => {
                this.handleUpdate();
            });

            // مراقبة حالة الاتصال
            this.setupNetworkListeners();

            // التحقق من التحديثات كل ساعة
            setInterval(() => this.checkForUpdates(), 3600000);

            return true;
        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
            return false;
        }
    }

    /**
     * إلغاء تسجيل Service Worker
     */
    async unregister(): Promise<boolean> {
        if (!this.registration) return false;

        try {
            const result = await this.registration.unregister();
            if (result) {
                console.log('[PWA] Service Worker unregistered');
                this.registration = null;
            }
            return result;
        } catch (error) {
            console.error('[PWA] Unregister failed:', error);
            return false;
        }
    }

    /**
     * التعامل مع التحديثات
     */
    private handleUpdate(): void {
        if (!this.registration) return;

        const newWorker = this.registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available');
                this.config.onUpdate?.(this.registration!);
            } else if (newWorker.state === 'activated') {
                console.log('[PWA] Service Worker activated');
                this.config.onSuccess?.();
            }
        });
    }

    /**
     * إعداد مستمعي الشبكة
     */
    private setupNetworkListeners(): void {
        window.addEventListener('online', () => {
            console.log('[PWA] Back online');
            this.config.onOnline?.();
        });

        window.addEventListener('offline', () => {
            console.log('[PWA] Gone offline');
            this.config.onOffline?.();
        });
    }

    /**
     * التحقق من التحديثات
     */
    async checkForUpdates(): Promise<void> {
        if (!this.registration) return;

        try {
            await this.registration.update();
            console.log('[PWA] Checked for updates');
        } catch (error) {
            console.error('[PWA] Update check failed:', error);
        }
    }

    /**
     * تطبيق التحديث الجديد
     */
    async skipWaiting(): Promise<void> {
        if (!this.registration?.waiting) return;

        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
    }

    /**
     * التحقق من إمكانية التثبيت
     */
    isInstallable(): boolean {
        return 'BeforeInstallPromptEvent' in window;
    }

    /**
     * التحقق من حالة الاتصال
     */
    isOnline(): boolean {
        return navigator.onLine;
    }

    /**
     * الحصول على حالة Service Worker
     */
    getStatus(): 'unsupported' | 'unregistered' | 'installing' | 'waiting' | 'active' {
        if (!('serviceWorker' in navigator)) return 'unsupported';
        if (!this.registration) return 'unregistered';
        if (this.registration.installing) return 'installing';
        if (this.registration.waiting) return 'waiting';
        if (this.registration.active) return 'active';
        return 'unregistered';
    }
}

// Export singleton
export const pwaManager = new PWAManager();

// تسجيل تلقائي عند تحميل الملف
if (typeof window !== 'undefined') {
    pwaManager.register({
        onSuccess: () => {
            console.log('[PWA] App is ready for offline use');
        },
        onUpdate: (registration) => {
            // عرض إشعار للمستخدم
            const shouldUpdate = window.confirm('تتوفر نسخة جديدة من التطبيق. هل تريد التحديث الآن؟');
            if (shouldUpdate) {
                registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            }
        },
        onOffline: () => {
            console.log('[PWA] App is now offline');
        },
        onOnline: () => {
            console.log('[PWA] App is back online');
        }
    });
}

export default pwaManager;
