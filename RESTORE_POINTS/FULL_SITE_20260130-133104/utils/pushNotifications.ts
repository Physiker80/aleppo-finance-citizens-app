// =====================================================
// 🔔 Push Notifications Manager
// إدارة إشعارات الدفع للتطبيق
// =====================================================

export interface PushNotificationConfig {
    vapidPublicKey?: string;
    applicationServerKey?: string;
}

export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
    actions?: NotificationAction[];
    requireInteraction?: boolean;
}

export interface NotificationAction {
    action: string;
    title: string;
    icon?: string;
}

class PushNotificationsManager {
    private registration: ServiceWorkerRegistration | null = null;
    private permission: NotificationPermission = 'default';

    constructor() {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    /**
     * التحقق من دعم الإشعارات
     */
    isSupported(): boolean {
        return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    }

    /**
     * الحصول على حالة الإذن
     */
    getPermission(): NotificationPermission {
        return this.permission;
    }

    /**
     * طلب إذن الإشعارات
     */
    async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported()) {
            console.warn('[Push] Notifications not supported');
            return 'denied';
        }

        try {
            this.permission = await Notification.requestPermission();
            console.log('[Push] Permission:', this.permission);
            return this.permission;
        } catch (error) {
            console.error('[Push] Permission request failed:', error);
            return 'denied';
        }
    }

    /**
     * تسجيل للإشعارات
     */
    async subscribe(config?: PushNotificationConfig): Promise<PushSubscription | null> {
        if (this.permission !== 'granted') {
            const permission = await this.requestPermission();
            if (permission !== 'granted') {
                console.log('[Push] Permission not granted');
                return null;
            }
        }

        try {
            this.registration = await navigator.serviceWorker.ready;

            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: config?.applicationServerKey
                    ? this.urlBase64ToUint8Array(config.applicationServerKey)
                    : undefined
            });

            console.log('[Push] Subscribed successfully');
            return subscription;
        } catch (error) {
            console.error('[Push] Subscription failed:', error);
            return null;
        }
    }

    /**
     * إلغاء الاشتراك
     */
    async unsubscribe(): Promise<boolean> {
        try {
            if (!this.registration) {
                this.registration = await navigator.serviceWorker.ready;
            }

            const subscription = await this.registration.pushManager.getSubscription();
            if (subscription) {
                const result = await subscription.unsubscribe();
                console.log('[Push] Unsubscribed:', result);
                return result;
            }
            return true;
        } catch (error) {
            console.error('[Push] Unsubscribe failed:', error);
            return false;
        }
    }

    /**
     * إرسال إشعار محلي
     */
    async showNotification(payload: NotificationPayload): Promise<boolean> {
        if (this.permission !== 'granted') {
            console.warn('[Push] Permission not granted');
            return false;
        }

        try {
            if (this.registration) {
                await this.registration.showNotification(payload.title, {
                    body: payload.body,
                    icon: payload.icon || '/icons/icon-192x192.png',
                    badge: payload.badge || '/icons/badge-72x72.png',
                    tag: payload.tag,
                    data: payload.data,
                    dir: 'rtl',
                    lang: 'ar',
                    vibrate: [100, 50, 100],
                    actions: payload.actions,
                    requireInteraction: payload.requireInteraction
                });
                return true;
            } else {
                // استخدام Notification API مباشرة
                new Notification(payload.title, {
                    body: payload.body,
                    icon: payload.icon || '/icons/icon-192x192.png',
                    tag: payload.tag,
                    data: payload.data,
                    dir: 'rtl',
                    lang: 'ar'
                });
                return true;
            }
        } catch (error) {
            console.error('[Push] Show notification failed:', error);
            return false;
        }
    }

    /**
     * إشعار طلب جديد
     */
    async notifyNewTicket(ticketId: string, ticketType: string): Promise<boolean> {
        return this.showNotification({
            title: '📥 طلب جديد',
            body: `تم استلام ${ticketType} جديد برقم ${ticketId}`,
            tag: `ticket-${ticketId}`,
            data: { type: 'new-ticket', ticketId },
            actions: [
                { action: 'view', title: 'عرض الطلب' },
                { action: 'dismiss', title: 'تجاهل' }
            ]
        });
    }

    /**
     * إشعار تحديث الطلب
     */
    async notifyTicketUpdate(ticketId: string, status: string): Promise<boolean> {
        return this.showNotification({
            title: '🔄 تحديث الطلب',
            body: `تم تحديث حالة الطلب ${ticketId} إلى: ${status}`,
            tag: `ticket-update-${ticketId}`,
            data: { type: 'ticket-update', ticketId, status }
        });
    }

    /**
     * إشعار رد على الطلب
     */
    async notifyTicketResponse(ticketId: string): Promise<boolean> {
        return this.showNotification({
            title: '💬 رد جديد',
            body: `تم الرد على طلبك رقم ${ticketId}`,
            tag: `ticket-response-${ticketId}`,
            data: { type: 'ticket-response', ticketId },
            requireInteraction: true,
            actions: [
                { action: 'view', title: 'عرض الرد' }
            ]
        });
    }

    /**
     * إشعار تحويل الطلب
     */
    async notifyTicketForward(ticketId: string, department: string): Promise<boolean> {
        return this.showNotification({
            title: '➡️ تحويل طلب',
            body: `تم تحويل الطلب ${ticketId} إلى قسم: ${department}`,
            tag: `ticket-forward-${ticketId}`,
            data: { type: 'ticket-forward', ticketId, department }
        });
    }

    /**
     * إشعار عام
     */
    async notifyGeneral(title: string, body: string, data?: Record<string, unknown>): Promise<boolean> {
        return this.showNotification({
            title,
            body,
            data
        });
    }

    /**
     * تحويل VAPID key
     */
    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    }
}

// Export singleton
export const pushNotifications = new PushNotificationsManager();

export default pushNotifications;
