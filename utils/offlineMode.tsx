/**
 * نظام وضع عدم الاتصال (Offline Mode)
 * يتيح العمل بدون إنترنت مع مزامنة لاحقة
 */

// التحقق من حالة الاتصال
export const isOnline = (): boolean => {
    return navigator.onLine;
};

// الاستماع لتغييرات حالة الاتصال
export const onConnectionChange = (callback: (isOnline: boolean) => void): (() => void) => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
};

// قائمة انتظار المزامنة
interface SyncQueueItem {
    id: string;
    type: 'ticket' | 'message' | 'update';
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
    retries: number;
}

const SYNC_QUEUE_KEY = 'offlineSyncQueue';
const MAX_RETRIES = 3;

// الحصول على قائمة الانتظار
export const getSyncQueue = (): SyncQueueItem[] => {
    try {
        const stored = localStorage.getItem(SYNC_QUEUE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error reading sync queue:', e);
        return [];
    }
};

// إضافة عنصر لقائمة الانتظار
export const addToSyncQueue = (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): void => {
    try {
        const queue = getSyncQueue();
        const newItem: SyncQueueItem = {
            ...item,
            id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            retries: 0
        };
        queue.push(newItem);
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('Error adding to sync queue:', e);
    }
};

// إزالة عنصر من قائمة الانتظار
export const removeFromSyncQueue = (id: string): void => {
    try {
        const queue = getSyncQueue();
        const filtered = queue.filter(item => item.id !== id);
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('Error removing from sync queue:', e);
    }
};

// مسح قائمة الانتظار
export const clearSyncQueue = (): void => {
    localStorage.removeItem(SYNC_QUEUE_KEY);
};

// تخزين البيانات للوصول دون اتصال
const OFFLINE_DATA_KEY = 'offlineDataCache';

interface OfflineDataCache {
    tickets: any[];
    contactMessages: any[];
    employees: any[];
    lastSync: number;
}

export const cacheDataForOffline = (data: Partial<OfflineDataCache>): void => {
    try {
        const current = getOfflineData();
        const updated = {
            ...current,
            ...data,
            lastSync: Date.now()
        };
        localStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Error caching offline data:', e);
    }
};

export const getOfflineData = (): OfflineDataCache => {
    try {
        const stored = localStorage.getItem(OFFLINE_DATA_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error reading offline data:', e);
    }
    return {
        tickets: [],
        contactMessages: [],
        employees: [],
        lastSync: 0
    };
};

// مكون React للتعامل مع حالة الاتصال
import { useState, useEffect } from 'react';

export const useOnlineStatus = () => {
    const [online, setOnline] = useState(isOnline());
    const [syncPending, setSyncPending] = useState(getSyncQueue().length);

    useEffect(() => {
        const cleanup = onConnectionChange((status) => {
            setOnline(status);
            if (status) {
                // محاولة المزامنة عند العودة للاتصال
                processSyncQueue();
            }
        });

        return cleanup;
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setSyncPending(getSyncQueue().length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return { online, syncPending };
};

// معالجة قائمة المزامنة
export const processSyncQueue = async (): Promise<{ success: number; failed: number }> => {
    const queue = getSyncQueue();
    let success = 0;
    let failed = 0;

    for (const item of queue) {
        try {
            // هنا يتم الاتصال بالـ API لمزامنة البيانات
            // في الوقت الحالي نقوم بالمعالجة المحلية فقط
            console.log('Processing sync item:', item);

            // محاكاة نجاح المزامنة
            removeFromSyncQueue(item.id);
            success++;
        } catch (e) {
            console.error('Error syncing item:', item.id, e);

            // زيادة عدد المحاولات
            const queue = getSyncQueue();
            const itemIndex = queue.findIndex(q => q.id === item.id);
            if (itemIndex !== -1) {
                queue[itemIndex].retries++;
                if (queue[itemIndex].retries >= MAX_RETRIES) {
                    // حذف العنصر بعد استنفاد المحاولات
                    queue.splice(itemIndex, 1);
                    failed++;
                }
                localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
            }
        }
    }

    return { success, failed };
};

// مكون شريط حالة الاتصال
export const OfflineStatusBar: React.FC = () => {
    const { online, syncPending } = useOnlineStatus();

    if (online && syncPending === 0) return null;

    return (
        <div className= {`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 ${online ? 'bg-yellow-500 text-yellow-900' : 'bg-red-500 text-white'
            }`
}>
    {!online ? (
        <>
        <span className= "w-2 h-2 bg-white rounded-full animate-pulse" > </span>
        < span > أنت غير متصل بالإنترنت </span>
            </>
      ) : syncPending > 0 ? (
    <>
    <span className= "w-2 h-2 bg-yellow-900 rounded-full animate-pulse" > </span>
    < span > جاري المزامنة... ({ syncPending } عناصر)</span>
        </>
      ) : null}
</div>
  );
};

// تصدير المكون كـ React component
import React from 'react';
