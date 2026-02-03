/**
 * 🗄️ خدمة التخزين للعمل بدون اتصال
 * تخزين الطلبات محلياً عند عدم وجود اتصال بالإنترنت
 */

import { Preferences } from '@capacitor/preferences';
import { Ticket } from '../types';
import { isOnline, onConnectivityChange } from '../utils/platform';

// ============================================
// 📦 أنواع البيانات
// ============================================

interface PendingRequest {
  id: string;
  type: 'ticket' | 'appointment' | 'contact';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// ============================================
// 🔑 مفاتيح التخزين
// ============================================

const STORAGE_KEYS = {
  PENDING_REQUESTS: 'offline_pending_requests',
  CACHED_TICKETS: 'offline_cached_tickets',
  TRACKED_TICKETS: 'offline_tracked_tickets',
  LAST_SYNC: 'offline_last_sync',
  OFFLINE_MODE: 'offline_mode',
} as const;

// مدة صلاحية الكاش (24 ساعة)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// ============================================
// 💾 دوال التخزين الأساسية
// ============================================

/**
 * حفظ البيانات في التخزين المحلي
 */
export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await Preferences.set({
      key,
      value: JSON.stringify(value),
    });
  } catch (error) {
    console.error('[OfflineStorage] Error setting item:', key, error);
    // Fallback to localStorage
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('[OfflineStorage] LocalStorage fallback failed:', e);
    }
  }
}

/**
 * جلب البيانات من التخزين المحلي
 */
export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const result = await Preferences.get({ key });
    if (result.value) {
      return JSON.parse(result.value) as T;
    }
  } catch (error) {
    console.error('[OfflineStorage] Error getting item:', key, error);
    // Fallback to localStorage
    try {
      const value = localStorage.getItem(key);
      if (value) {
        return JSON.parse(value) as T;
      }
    } catch (e) {
      console.error('[OfflineStorage] LocalStorage fallback failed:', e);
    }
  }
  return null;
}

/**
 * حذف البيانات من التخزين المحلي
 */
export async function removeItem(key: string): Promise<void> {
  try {
    await Preferences.remove({ key });
  } catch (error) {
    console.error('[OfflineStorage] Error removing item:', key, error);
    localStorage.removeItem(key);
  }
}

// ============================================
// 📝 إدارة الطلبات المعلقة
// ============================================

/**
 * إضافة طلب جديد للقائمة المعلقة
 */
export async function addPendingRequest(
  type: PendingRequest['type'],
  data: Record<string, unknown>
): Promise<string> {
  const requests = await getPendingRequests();
  
  const newRequest: PendingRequest = {
    id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };
  
  requests.push(newRequest);
  await setItem(STORAGE_KEYS.PENDING_REQUESTS, requests);
  
  // إرسال للـ Service Worker
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const messageChannel = new MessageChannel();
    navigator.serviceWorker.controller.postMessage(
      { type: 'QUEUE_REQUEST', payload: newRequest },
      [messageChannel.port2]
    );
  }
  
  console.log('[OfflineStorage] Added pending request:', newRequest.id);
  return newRequest.id;
}

/**
 * جلب جميع الطلبات المعلقة
 */
export async function getPendingRequests(): Promise<PendingRequest[]> {
  const requests = await getItem<PendingRequest[]>(STORAGE_KEYS.PENDING_REQUESTS);
  return requests || [];
}

/**
 * حذف طلب من القائمة المعلقة
 */
export async function removePendingRequest(id: string): Promise<void> {
  const requests = await getPendingRequests();
  const filtered = requests.filter(r => r.id !== id);
  await setItem(STORAGE_KEYS.PENDING_REQUESTS, filtered);
  console.log('[OfflineStorage] Removed pending request:', id);
}

/**
 * زيادة عداد المحاولات
 */
export async function incrementRetryCount(id: string): Promise<void> {
  const requests = await getPendingRequests();
  const updated = requests.map(r => 
    r.id === id ? { ...r, retryCount: r.retryCount + 1 } : r
  );
  await setItem(STORAGE_KEYS.PENDING_REQUESTS, updated);
}

/**
 * الحصول على عدد الطلبات المعلقة
 */
export async function getPendingCount(): Promise<number> {
  const requests = await getPendingRequests();
  return requests.length;
}

// ============================================
// 🎫 تخزين التذاكر المتابعة
// ============================================

/**
 * حفظ تذكرة للمتابعة (offline tracking)
 */
export async function cacheTrackedTicket(ticket: Ticket): Promise<void> {
  const cached = await getItem<CachedData<Ticket>[]>(STORAGE_KEYS.TRACKED_TICKETS) || [];
  
  // تحديث أو إضافة
  const existingIndex = cached.findIndex(c => c.data.id === ticket.id);
  const newCache: CachedData<Ticket> = {
    data: ticket,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_DURATION,
  };
  
  if (existingIndex >= 0) {
    cached[existingIndex] = newCache;
  } else {
    cached.push(newCache);
  }
  
  // الاحتفاظ بآخر 10 تذاكر فقط
  const trimmed = cached.slice(-10);
  await setItem(STORAGE_KEYS.TRACKED_TICKETS, trimmed);
}

/**
 * جلب تذكرة من الكاش
 */
export async function getCachedTicket(ticketId: string): Promise<Ticket | null> {
  const cached = await getItem<CachedData<Ticket>[]>(STORAGE_KEYS.TRACKED_TICKETS) || [];
  const found = cached.find(c => c.data.id === ticketId);
  
  if (found && found.expiresAt > Date.now()) {
    return found.data;
  }
  
  return null;
}

/**
 * جلب جميع التذاكر المخزنة مؤقتاً
 */
export async function getAllCachedTickets(): Promise<Ticket[]> {
  const cached = await getItem<CachedData<Ticket>[]>(STORAGE_KEYS.TRACKED_TICKETS) || [];
  const now = Date.now();
  
  // فلترة المنتهية الصلاحية
  const valid = cached.filter(c => c.expiresAt > now);
  
  // تنظيف المنتهية
  if (valid.length !== cached.length) {
    await setItem(STORAGE_KEYS.TRACKED_TICKETS, valid);
  }
  
  return valid.map(c => c.data);
}

// ============================================
// 🔄 مزامنة البيانات
// ============================================

/**
 * مزامنة الطلبات المعلقة عند عودة الاتصال
 */
export async function syncPendingRequests(
  submitHandler: (type: string, data: Record<string, unknown>) => Promise<boolean>
): Promise<{ success: number; failed: number }> {
  if (!isOnline()) {
    console.log('[OfflineStorage] Cannot sync - offline');
    return { success: 0, failed: 0 };
  }
  
  const requests = await getPendingRequests();
  let success = 0;
  let failed = 0;
  
  for (const request of requests) {
    try {
      const result = await submitHandler(request.type, request.data);
      if (result) {
        await removePendingRequest(request.id);
        success++;
      } else {
        await incrementRetryCount(request.id);
        failed++;
      }
    } catch (error) {
      console.error('[OfflineStorage] Sync failed for request:', request.id, error);
      await incrementRetryCount(request.id);
      failed++;
    }
  }
  
  // تحديث وقت آخر مزامنة
  await setItem(STORAGE_KEYS.LAST_SYNC, Date.now());
  
  console.log(`[OfflineStorage] Sync complete: ${success} success, ${failed} failed`);
  return { success, failed };
}

/**
 * جلب وقت آخر مزامنة
 */
export async function getLastSyncTime(): Promise<number | null> {
  return await getItem<number>(STORAGE_KEYS.LAST_SYNC);
}

// ============================================
// 🎛️ إعدادات الوضع القطع
// ============================================

/**
 * تفعيل/تعطيل وضع العمل بدون اتصال
 */
export async function setOfflineMode(enabled: boolean): Promise<void> {
  await setItem(STORAGE_KEYS.OFFLINE_MODE, enabled);
}

/**
 * التحقق من وضع العمل بدون اتصال
 */
export async function isOfflineModeEnabled(): Promise<boolean> {
  const enabled = await getItem<boolean>(STORAGE_KEYS.OFFLINE_MODE);
  return enabled ?? false;
}

// ============================================
// 🔔 مراقبة الاتصال
// ============================================

let syncCallback: (() => void) | null = null;

/**
 * تسجيل callback للمزامنة التلقائية عند عودة الاتصال
 */
export function registerSyncOnReconnect(callback: () => void): () => void {
  syncCallback = callback;
  
  const cleanup = onConnectivityChange((online) => {
    if (online && syncCallback) {
      console.log('[OfflineStorage] Connection restored - triggering sync');
      syncCallback();
    }
  });
  
  return () => {
    syncCallback = null;
    cleanup();
  };
}

// ============================================
// 🧹 تنظيف التخزين
// ============================================

/**
 * تنظيف البيانات المنتهية الصلاحية
 */
export async function cleanupExpiredData(): Promise<void> {
  // تنظيف التذاكر المخزنة
  await getAllCachedTickets(); // هذا يقوم بالتنظيف تلقائياً
  
  // تنظيف الطلبات القديمة جداً (أكثر من 7 أيام)
  const requests = await getPendingRequests();
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const filtered = requests.filter(r => r.timestamp > sevenDaysAgo);
  
  if (filtered.length !== requests.length) {
    await setItem(STORAGE_KEYS.PENDING_REQUESTS, filtered);
    console.log(`[OfflineStorage] Cleaned up ${requests.length - filtered.length} old requests`);
  }
}

/**
 * مسح جميع البيانات المخزنة
 */
export async function clearAllOfflineData(): Promise<void> {
  await removeItem(STORAGE_KEYS.PENDING_REQUESTS);
  await removeItem(STORAGE_KEYS.CACHED_TICKETS);
  await removeItem(STORAGE_KEYS.TRACKED_TICKETS);
  await removeItem(STORAGE_KEYS.LAST_SYNC);
  await removeItem(STORAGE_KEYS.OFFLINE_MODE);
  console.log('[OfflineStorage] All offline data cleared');
}

// ============================================
// 📊 إحصائيات التخزين
// ============================================

export interface StorageStats {
  pendingRequests: number;
  cachedTickets: number;
  lastSyncTime: number | null;
  offlineModeEnabled: boolean;
}

/**
 * جلب إحصائيات التخزين
 */
export async function getStorageStats(): Promise<StorageStats> {
  const [pending, tickets, lastSync, offlineMode] = await Promise.all([
    getPendingRequests(),
    getAllCachedTickets(),
    getLastSyncTime(),
    isOfflineModeEnabled(),
  ]);
  
  return {
    pendingRequests: pending.length,
    cachedTickets: tickets.length,
    lastSyncTime: lastSync,
    offlineModeEnabled: offlineMode,
  };
}
