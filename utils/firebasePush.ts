// =====================================================
// 🔔 Firebase Push Notifications
// إشعارات Firebase Push
// =====================================================

/**
 * ملاحظة: هذا الملف يتطلب تكوين Firebase
 * يجب إضافة ملف firebase-config.ts مع بيانات المشروع
 */

export interface PushNotificationConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    vapidKey: string;
}

export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    tag?: string;
    data?: Record<string, unknown>;
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
}

export interface PushSubscription {
    token: string;
    userId: string;
    deviceId: string;
    platform: 'web' | 'android' | 'ios';
    createdAt: number;
    lastUsed: number;
}

const STORAGE_KEY = 'push-subscriptions';
const TOKEN_KEY = 'fcm-token';

/**
 * التحقق من دعم الإشعارات
 */
export function isPushSupported(): boolean {
    return 'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;
}

/**
 * الحصول على حالة الإذن
 */
export function getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) {
        return 'denied';
    }
    return Notification.permission;
}

/**
 * طلب إذن الإشعارات
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (!isPushSupported()) {
        console.warn('Push notifications are not supported');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
}

/**
 * تهيئة Firebase (محاكاة)
 * في الإنتاج، استخدم Firebase SDK الحقيقي
 */
let firebaseInitialized = false;
let messagingInstance: unknown = null;

export async function initializeFirebase(config: PushNotificationConfig): Promise<boolean> {
    if (firebaseInitialized) {
        return true;
    }

    try {
        // في الإنتاج، استخدم:
        // import { initializeApp } from 'firebase/app';
        // import { getMessaging, getToken, onMessage } from 'firebase/messaging';
        // const app = initializeApp(config);
        // messagingInstance = getMessaging(app);

        console.log('Firebase initialized with config:', config.projectId);
        firebaseInitialized = true;

        // تسجيل Service Worker
        if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        }

        return true;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        return false;
    }
}

/**
 * الحصول على FCM Token
 */
export async function getFCMToken(vapidKey?: string): Promise<string | null> {
    if (!firebaseInitialized) {
        console.warn('Firebase not initialized');
        return null;
    }

    // التحقق من الإذن
    if (Notification.permission !== 'granted') {
        const granted = await requestNotificationPermission();
        if (!granted) {
            return null;
        }
    }

    try {
        // في الإنتاج، استخدم:
        // const token = await getToken(messagingInstance, { vapidKey });

        // محاكاة Token
        let token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            token = 'fcm-' + Date.now() + '-' + Math.random().toString(36).slice(2);
            localStorage.setItem(TOKEN_KEY, token);
        }

        return token;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
}

/**
 * حفظ اشتراك
 */
export function saveSubscription(subscription: PushSubscription): void {
    const subscriptions = loadSubscriptions();

    // تحديث أو إضافة
    const existingIndex = subscriptions.findIndex(
        s => s.userId === subscription.userId && s.deviceId === subscription.deviceId
    );

    if (existingIndex >= 0) {
        subscriptions[existingIndex] = subscription;
    } else {
        subscriptions.push(subscription);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

/**
 * تحميل الاشتراكات
 */
export function loadSubscriptions(): PushSubscription[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * الحصول على اشتراكات مستخدم
 */
export function getUserSubscriptions(userId: string): PushSubscription[] {
    return loadSubscriptions().filter(s => s.userId === userId);
}

/**
 * حذف اشتراك
 */
export function removeSubscription(token: string): boolean {
    const subscriptions = loadSubscriptions();
    const index = subscriptions.findIndex(s => s.token === token);

    if (index >= 0) {
        subscriptions.splice(index, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
        return true;
    }

    return false;
}

/**
 * الاستماع للرسائل الواردة
 */
export function onForegroundMessage(callback: (payload: NotificationPayload) => void): () => void {
    // في الإنتاج، استخدم:
    // return onMessage(messagingInstance, (payload) => {
    //   callback(payload.notification);
    // });

    // محاكاة - استخدام BroadcastChannel
    const channel = new BroadcastChannel('fcm-messages');

    const handler = (event: MessageEvent) => {
        callback(event.data);
    };

    channel.addEventListener('message', handler);

    return () => {
        channel.removeEventListener('message', handler);
        channel.close();
    };
}

/**
 * عرض إشعار محلي
 */
export async function showLocalNotification(
    payload: NotificationPayload
): Promise<Notification | null> {
    if (Notification.permission !== 'granted') {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        await registration.showNotification(payload.title, {
            body: payload.body,
            icon: payload.icon || '/icons/icon-192.png',
            badge: payload.badge || '/icons/badge-72.png',
            image: payload.image,
            tag: payload.tag,
            data: payload.data,
            actions: payload.actions,
            dir: 'rtl',
            lang: 'ar',
            vibrate: [200, 100, 200],
            requireInteraction: false
        });

        return null;
    } catch {
        // Fallback للإشعار العادي
        return new Notification(payload.title, {
            body: payload.body,
            icon: payload.icon || '/icons/icon-192.png',
            tag: payload.tag,
            data: payload.data,
            dir: 'rtl',
            lang: 'ar'
        });
    }
}

/**
 * إرسال إشعار إلى المستخدم (من الخادم)
 * ملاحظة: هذا يتطلب خادم للإرسال الفعلي
 */
export async function sendPushNotification(
    userId: string,
    notification: NotificationPayload
): Promise<boolean> {
    const subscriptions = getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
        console.warn('No subscriptions found for user:', userId);
        return false;
    }

    // في الإنتاج، أرسل إلى الخادم:
    // await fetch('/api/send-notification', {
    //   method: 'POST',
    //   body: JSON.stringify({ tokens: subscriptions.map(s => s.token), notification })
    // });

    // محاكاة - عرض إشعار محلي
    await showLocalNotification(notification);

    return true;
}

/**
 * إشعارات الشكاوى
 */
export const ticketNotifications = {
    /**
     * إشعار شكوى جديدة
     */
    async newTicket(ticketId: string, department: string): Promise<void> {
        await showLocalNotification({
            title: 'شكوى جديدة',
            body: `تم استلام شكوى جديدة رقم ${ticketId} في قسم ${department}`,
            icon: '/icons/new-ticket.png',
            tag: `ticket-${ticketId}`,
            data: { type: 'new-ticket', ticketId }
        });
    },

    /**
     * إشعار رد على شكوى
     */
    async ticketResponse(ticketId: string): Promise<void> {
        await showLocalNotification({
            title: 'رد على شكواك',
            body: `تم الرد على شكواك رقم ${ticketId}`,
            icon: '/icons/response.png',
            tag: `response-${ticketId}`,
            data: { type: 'response', ticketId }
        });
    },

    /**
     * إشعار تغيير حالة
     */
    async statusChange(ticketId: string, newStatus: string): Promise<void> {
        await showLocalNotification({
            title: 'تحديث حالة الشكوى',
            body: `تم تغيير حالة شكواك رقم ${ticketId} إلى: ${newStatus}`,
            icon: '/icons/status.png',
            tag: `status-${ticketId}`,
            data: { type: 'status-change', ticketId, newStatus }
        });
    },

    /**
     * إشعار تحويل شكوى
     */
    async ticketForwarded(ticketId: string, toDepartment: string): Promise<void> {
        await showLocalNotification({
            title: 'تحويل شكوى',
            body: `تم تحويل الشكوى رقم ${ticketId} إلى قسم ${toDepartment}`,
            icon: '/icons/forward.png',
            tag: `forward-${ticketId}`,
            data: { type: 'forward', ticketId, toDepartment }
        });
    }
};

/**
 * تسجيل الجهاز الحالي
 */
export async function registerDevice(userId: string): Promise<PushSubscription | null> {
    const token = await getFCMToken();

    if (!token) {
        return null;
    }

    const deviceId = getDeviceId();
    const platform = detectPlatform();

    const subscription: PushSubscription = {
        token,
        userId,
        deviceId,
        platform,
        createdAt: Date.now(),
        lastUsed: Date.now()
    };

    saveSubscription(subscription);

    return subscription;
}

/**
 * الحصول على معرف الجهاز
 */
function getDeviceId(): string {
    let deviceId = localStorage.getItem('device-id');

    if (!deviceId) {
        deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        localStorage.setItem('device-id', deviceId);
    }

    return deviceId;
}

/**
 * اكتشاف المنصة
 */
function detectPlatform(): 'web' | 'android' | 'ios' {
    const ua = navigator.userAgent.toLowerCase();

    if (/android/i.test(ua)) {
        return 'android';
    }

    if (/iphone|ipad|ipod/i.test(ua)) {
        return 'ios';
    }

    return 'web';
}

/**
 * إلغاء تسجيل الجهاز
 */
export async function unregisterDevice(): Promise<boolean> {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
        return false;
    }

    removeSubscription(token);
    localStorage.removeItem(TOKEN_KEY);

    return true;
}

export default {
    isPushSupported,
    getNotificationPermission,
    requestNotificationPermission,
    initializeFirebase,
    getFCMToken,
    saveSubscription,
    loadSubscriptions,
    getUserSubscriptions,
    removeSubscription,
    onForegroundMessage,
    showLocalNotification,
    sendPushNotification,
    ticketNotifications,
    registerDevice,
    unregisterDevice
};
