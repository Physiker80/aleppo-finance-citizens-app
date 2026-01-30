// =====================================================
// 📴 Offline Sync System
// نظام المزامنة دون اتصال
// =====================================================

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface SyncItem<T = unknown> {
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: string; // tickets, responses, etc.
    data: T;
    localData?: T; // البيانات المحلية في حالة التعارض
    serverData?: T; // بيانات الخادم في حالة التعارض
    status: SyncStatus;
    retries: number;
    createdAt: number;
    lastAttempt?: number;
    error?: string;
}

export interface SyncConfig {
    maxRetries: number;
    retryDelay: number; // مللي ثانية
    batchSize: number;
    syncInterval: number; // مللي ثانية
    conflictResolution: 'local' | 'server' | 'manual' | 'latest';
}

export interface ConflictResolution<T> {
    itemId: string;
    resolution: 'local' | 'server' | 'merged';
    mergedData?: T;
}

const QUEUE_KEY = 'sync-queue';
const CONFIG_KEY = 'sync-config';

const DEFAULT_CONFIG: SyncConfig = {
    maxRetries: 5,
    retryDelay: 5000,
    batchSize: 10,
    syncInterval: 30000,
    conflictResolution: 'latest'
};

/**
 * تحميل قائمة المزامنة
 */
function loadQueue(): SyncItem[] {
    try {
        const saved = localStorage.getItem(QUEUE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ قائمة المزامنة
 */
function saveQueue(queue: SyncItem[]): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * تحميل الإعدادات
 */
export function loadConfig(): SyncConfig {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
        return DEFAULT_CONFIG;
    }
}

/**
 * حفظ الإعدادات
 */
export function saveConfig(config: Partial<SyncConfig>): void {
    const current = loadConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/**
 * التحقق من الاتصال
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * الاستماع لتغيرات الاتصال
 */
export function onConnectionChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}

/**
 * إضافة عنصر للمزامنة
 */
export function addToSyncQueue<T>(
    entity: string,
    type: 'create' | 'update' | 'delete',
    data: T,
    id?: string
): SyncItem<T> {
    const queue = loadQueue();

    const item: SyncItem<T> = {
        id: id || `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        entity,
        data,
        status: 'pending',
        retries: 0,
        createdAt: Date.now()
    };

    // دمج التحديثات لنفس العنصر
    const existingIndex = queue.findIndex(
        i => i.entity === entity && (i.data as Record<string, unknown>)?.id === (data as Record<string, unknown>)?.id
    );

    if (existingIndex >= 0 && type === 'update') {
        // تحديث العنصر الموجود بدلاً من إضافة جديد
        queue[existingIndex] = {
            ...queue[existingIndex],
            data,
            status: 'pending',
            lastAttempt: undefined,
            error: undefined
        };
    } else if (existingIndex >= 0 && type === 'delete') {
        // إذا كان العنصر للإنشاء ولم يتم مزامنته، احذفه مباشرة
        if (queue[existingIndex].type === 'create' && queue[existingIndex].status === 'pending') {
            queue.splice(existingIndex, 1);
            saveQueue(queue);
            return item;
        }
        queue.push(item as SyncItem);
    } else {
        queue.push(item as SyncItem);
    }

    saveQueue(queue);

    // محاولة المزامنة إذا كنا متصلين
    if (isOnline()) {
        triggerSync();
    }

    return item;
}

/**
 * الحصول على قائمة المزامنة المعلقة
 */
export function getPendingItems(): SyncItem[] {
    return loadQueue().filter(item => item.status === 'pending' || item.status === 'failed');
}

/**
 * الحصول على عناصر بحالة معينة
 */
export function getItemsByStatus(status: SyncStatus): SyncItem[] {
    return loadQueue().filter(item => item.status === status);
}

/**
 * الحصول على التعارضات
 */
export function getConflicts(): SyncItem[] {
    return loadQueue().filter(item => item.status === 'conflict');
}

/**
 * حل تعارض
 */
export function resolveConflict<T>(
    itemId: string,
    resolution: ConflictResolution<T>
): boolean {
    const queue = loadQueue();
    const index = queue.findIndex(i => i.id === itemId);

    if (index === -1) {
        return false;
    }

    const item = queue[index];

    switch (resolution.resolution) {
        case 'local':
            item.status = 'pending';
            break;
        case 'server':
            item.data = item.serverData;
            item.status = 'synced';
            break;
        case 'merged':
            if (resolution.mergedData) {
                item.data = resolution.mergedData;
                item.status = 'pending';
            }
            break;
    }

    item.localData = undefined;
    item.serverData = undefined;

    queue[index] = item;
    saveQueue(queue);

    return true;
}

/**
 * إزالة عنصر من القائمة
 */
export function removeFromQueue(itemId: string): boolean {
    const queue = loadQueue();
    const index = queue.findIndex(i => i.id === itemId);

    if (index === -1) {
        return false;
    }

    queue.splice(index, 1);
    saveQueue(queue);

    return true;
}

/**
 * مسح القائمة
 */
export function clearQueue(): void {
    localStorage.removeItem(QUEUE_KEY);
}

// متغيرات المزامنة
let syncInProgress = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let syncListeners: Array<(status: { pending: number; syncing: number; synced: number; failed: number; conflicts: number }) => void> = [];

/**
 * تشغيل المزامنة
 */
export async function triggerSync(): Promise<void> {
    if (syncInProgress || !isOnline()) {
        return;
    }

    syncInProgress = true;
    notifyListeners();

    try {
        const config = loadConfig();
        const queue = loadQueue();
        const pending = queue.filter(i => i.status === 'pending' || i.status === 'failed');

        // معالجة بدفعات
        for (let i = 0; i < pending.length; i += config.batchSize) {
            const batch = pending.slice(i, i + config.batchSize);
            await Promise.all(batch.map(item => syncItem(item)));
        }
    } finally {
        syncInProgress = false;
        notifyListeners();
    }
}

/**
 * مزامنة عنصر واحد
 */
async function syncItem(item: SyncItem): Promise<void> {
    const config = loadConfig();
    const queue = loadQueue();
    const index = queue.findIndex(i => i.id === item.id);

    if (index === -1) return;

    if (item.retries >= config.maxRetries) {
        queue[index].status = 'failed';
        queue[index].error = 'تجاوز الحد الأقصى للمحاولات';
        saveQueue(queue);
        return;
    }

    queue[index].status = 'syncing';
    queue[index].lastAttempt = Date.now();
    queue[index].retries++;
    saveQueue(queue);

    try {
        // محاكاة الاتصال بالخادم
        // في الإنتاج، استبدل هذا بالاتصال الفعلي
        await simulateServerSync(item);

        queue[index].status = 'synced';
        queue[index].error = undefined;
        saveQueue(queue);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';

        // التحقق من التعارض
        if (errorMessage.includes('conflict')) {
            queue[index].status = 'conflict';
            queue[index].error = 'تعارض في البيانات';
            // في الإنتاج، احصل على بيانات الخادم هنا
        } else {
            queue[index].status = 'failed';
            queue[index].error = errorMessage;
        }

        saveQueue(queue);
    }
}

/**
 * محاكاة المزامنة مع الخادم
 */
async function simulateServerSync(item: SyncItem): Promise<void> {
    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // محاكاة نجاح أو فشل عشوائي (10% فشل)
    if (Math.random() < 0.1) {
        throw new Error('فشل الاتصال بالخادم');
    }

    console.log('[Sync] Item synced:', item.entity, item.type, item.id);
}

/**
 * بدء المزامنة التلقائية
 */
export function startAutoSync(): void {
    if (syncInterval) return;

    const config = loadConfig();

    // مزامنة فورية عند الاتصال
    onConnectionChange((online) => {
        if (online) {
            triggerSync();
        }
    });

    // مزامنة دورية
    syncInterval = setInterval(() => {
        if (isOnline()) {
            triggerSync();
        }
    }, config.syncInterval);

    // مزامنة أولية
    if (isOnline()) {
        triggerSync();
    }
}

/**
 * إيقاف المزامنة التلقائية
 */
export function stopAutoSync(): void {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

/**
 * الاستماع لتغيرات المزامنة
 */
export function onSyncStatusChange(
    callback: (status: { pending: number; syncing: number; synced: number; failed: number; conflicts: number }) => void
): () => void {
    syncListeners.push(callback);

    // إشعار فوري
    notifyListeners();

    return () => {
        const index = syncListeners.indexOf(callback);
        if (index > -1) {
            syncListeners.splice(index, 1);
        }
    };
}

/**
 * إشعار المستمعين
 */
function notifyListeners(): void {
    const queue = loadQueue();

    const status = {
        pending: queue.filter(i => i.status === 'pending').length,
        syncing: queue.filter(i => i.status === 'syncing').length,
        synced: queue.filter(i => i.status === 'synced').length,
        failed: queue.filter(i => i.status === 'failed').length,
        conflicts: queue.filter(i => i.status === 'conflict').length
    };

    syncListeners.forEach(callback => callback(status));
}

/**
 * الحصول على إحصائيات المزامنة
 */
export function getSyncStats(): {
    total: number;
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
    conflicts: number;
    lastSync?: number;
    isOnline: boolean;
} {
    const queue = loadQueue();
    const lastSynced = queue
        .filter(i => i.status === 'synced' && i.lastAttempt)
        .sort((a, b) => (b.lastAttempt || 0) - (a.lastAttempt || 0))[0];

    return {
        total: queue.length,
        pending: queue.filter(i => i.status === 'pending').length,
        syncing: queue.filter(i => i.status === 'syncing').length,
        synced: queue.filter(i => i.status === 'synced').length,
        failed: queue.filter(i => i.status === 'failed').length,
        conflicts: queue.filter(i => i.status === 'conflict').length,
        lastSync: lastSynced?.lastAttempt,
        isOnline: isOnline()
    };
}

/**
 * إعادة المحاولة للعناصر الفاشلة
 */
export function retryFailed(): void {
    const queue = loadQueue();

    queue.forEach(item => {
        if (item.status === 'failed') {
            item.status = 'pending';
            item.retries = 0;
            item.error = undefined;
        }
    });

    saveQueue(queue);
    triggerSync();
}

/**
 * تصدير البيانات غير المزامنة
 */
export function exportPendingData(): string {
    const pending = getPendingItems();
    return JSON.stringify(pending, null, 2);
}

/**
 * استيراد بيانات للمزامنة
 */
export function importPendingData(jsonData: string): number {
    try {
        const items: SyncItem[] = JSON.parse(jsonData);
        const queue = loadQueue();

        let imported = 0;
        items.forEach(item => {
            if (!queue.some(i => i.id === item.id)) {
                item.status = 'pending';
                queue.push(item);
                imported++;
            }
        });

        saveQueue(queue);
        return imported;
    } catch {
        return 0;
    }
}

export default {
    isOnline,
    onConnectionChange,
    addToSyncQueue,
    getPendingItems,
    getItemsByStatus,
    getConflicts,
    resolveConflict,
    removeFromQueue,
    clearQueue,
    triggerSync,
    startAutoSync,
    stopAutoSync,
    onSyncStatusChange,
    getSyncStats,
    retryFailed,
    loadConfig,
    saveConfig,
    exportPendingData,
    importPendingData
};
