/**
 * 🔔 Notification Bridge Service
 * ربط الإشعارات بين الموقع والتطبيق
 * 
 * يعمل على:
 * - تخزين tokens الأجهزة في Supabase
 * - إرسال إشعارات عند تحديث التذاكر
 * - استقبال إشعارات من المستخدمين الآخرين
 */

import { getDynamicSupabaseClient } from '../utils/supabaseClient';
import { isNativeMobile, isAndroid, isIOS } from '../utils/platform';
import { getSavedToken, registerForPushNotifications } from './mobilePushNotifications';
import { pushNotifications } from '../utils/pushNotifications';

// =====================================================
// 📝 Interfaces
// =====================================================

export interface DeviceRegistration {
  id?: string;
  token: string;
  platform: 'web' | 'android' | 'ios';
  user_id?: string;
  employee_username?: string;
  department?: string;
  is_active: boolean;
  created_at?: string;
  last_seen_at?: string;
}

export interface NotificationMessage {
  id?: string;
  type: 'ticket-new' | 'ticket-update' | 'ticket-response' | 'ticket-forward' | 'general';
  title: string;
  body: string;
  data?: Record<string, any>;
  target_tokens?: string[];
  target_department?: string;
  target_user_id?: string;
  created_at?: string;
  sent_at?: string;
  read_at?: string;
}

// =====================================================
// 👤 Device Registration
// =====================================================

const DEVICE_ID_KEY = 'device_registration_id';
const NOTIFICATION_TOKEN_KEY = 'notification_token';

/**
 * الحصول على معرف الجهاز المحلي
 */
function getLocalDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * تحديد منصة الجهاز
 */
function detectPlatform(): 'web' | 'android' | 'ios' {
  if (isNativeMobile()) {
    return isAndroid() ? 'android' : isIOS() ? 'ios' : 'android';
  }
  return 'web';
}

/**
 * تسجيل الجهاز في Supabase
 */
export async function registerDeviceForNotifications(
  employeeUsername?: string,
  department?: string
): Promise<boolean> {
  const supabase = getDynamicSupabaseClient();
  if (!supabase) {
    console.warn('[NotificationBridge] Supabase not available');
    return false;
  }

  try {
    // الحصول على token الإشعارات
    let token: string | null = null;
    
    if (isNativeMobile()) {
      // على الموبايل - استخدم FCM token
      token = getSavedToken() || await registerForPushNotifications();
    } else {
      // على الويب - استخدم device ID كـ token مؤقت
      token = getLocalDeviceId();
    }

    if (!token) {
      console.warn('[NotificationBridge] No notification token available');
      return false;
    }

    const registration: DeviceRegistration = {
      token,
      platform: detectPlatform(),
      employee_username: employeeUsername,
      department,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    };

    // Upsert في جدول device_registrations
    const { error } = await supabase
      .from('device_registrations')
      .upsert(registration, { 
        onConflict: 'token',
        ignoreDuplicates: false 
      });

    if (error) {
      // إذا الجدول غير موجود، ننشئه
      if (error.code === '42P01') {
        console.log('[NotificationBridge] Table does not exist, using local storage fallback');
        saveLocalRegistration(registration);
        return true;
      }
      console.error('[NotificationBridge] Registration error:', error);
      return false;
    }

    localStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
    console.log('[NotificationBridge] Device registered successfully');
    return true;

  } catch (err) {
    console.error('[NotificationBridge] Registration failed:', err);
    return false;
  }
}

/**
 * حفظ التسجيل محلياً كـ fallback
 */
function saveLocalRegistration(registration: DeviceRegistration): void {
  try {
    const registrations = JSON.parse(localStorage.getItem('device_registrations') || '[]');
    const existingIndex = registrations.findIndex((r: any) => r.token === registration.token);
    if (existingIndex >= 0) {
      registrations[existingIndex] = { ...registrations[existingIndex], ...registration };
    } else {
      registrations.push(registration);
    }
    localStorage.setItem('device_registrations', JSON.stringify(registrations));
  } catch (e) {
    console.error('[NotificationBridge] Failed to save local registration:', e);
  }
}

/**
 * إلغاء تسجيل الجهاز
 */
export async function unregisterDevice(): Promise<void> {
  const token = localStorage.getItem(NOTIFICATION_TOKEN_KEY);
  if (!token) return;

  const supabase = getDynamicSupabaseClient();
  if (supabase) {
    await supabase
      .from('device_registrations')
      .update({ is_active: false })
      .eq('token', token);
  }

  localStorage.removeItem(NOTIFICATION_TOKEN_KEY);
}

// =====================================================
// 📤 Send Notifications
// =====================================================

/**
 * إرسال إشعار لقسم معين
 */
export async function sendNotificationToDepartment(
  department: string,
  notification: Omit<NotificationMessage, 'target_department'>
): Promise<boolean> {
  const supabase = getDynamicSupabaseClient();
  if (!supabase) {
    // Fallback: عرض إشعار محلي فقط
    await showLocalNotification(notification);
    return true;
  }

  try {
    const message: NotificationMessage = {
      ...notification,
      target_department: department,
      created_at: new Date().toISOString(),
    };

    // حفظ الإشعار في Supabase
    const { error } = await supabase
      .from('notification_messages')
      .insert(message);

    if (error) {
      console.error('[NotificationBridge] Send error:', error);
      // Fallback محلي
      await showLocalNotification(notification);
    }

    return true;
  } catch (err) {
    console.error('[NotificationBridge] Send failed:', err);
    return false;
  }
}

/**
 * إشعار تذكرة جديدة
 */
export async function notifyNewTicket(
  ticketId: string,
  department: string,
  ticketType: string
): Promise<void> {
  const notification: NotificationMessage = {
    type: 'ticket-new',
    title: '📥 طلب جديد',
    body: `تم استلام ${ticketType} جديد برقم ${ticketId}`,
    data: { ticketId, department, type: ticketType },
  };

  await sendNotificationToDepartment(department, notification);
}

/**
 * إشعار تحديث حالة التذكرة
 */
export async function notifyTicketStatusUpdate(
  ticketId: string,
  department: string,
  newStatus: string
): Promise<void> {
  const notification: NotificationMessage = {
    type: 'ticket-update',
    title: '🔄 تحديث حالة الطلب',
    body: `تم تغيير حالة الطلب ${ticketId} إلى: ${newStatus}`,
    data: { ticketId, newStatus },
  };

  await sendNotificationToDepartment(department, notification);
}

/**
 * إشعار رد على التذكرة
 */
export async function notifyTicketResponse(
  ticketId: string,
  citizenPhone?: string
): Promise<void> {
  const notification: NotificationMessage = {
    type: 'ticket-response',
    title: '💬 رد جديد على طلبك',
    body: `تم الرد على طلبك رقم ${ticketId}`,
    data: { ticketId },
  };

  // إذا كان هناك رقم هاتف، يمكن إرسال SMS (اختياري)
  
  // حفظ في Supabase للـ real-time
  const supabase = getDynamicSupabaseClient();
  if (supabase) {
    await supabase.from('notification_messages').insert({
      ...notification,
      target_user_id: citizenPhone,
      created_at: new Date().toISOString(),
    });
  }

  // عرض محلي أيضاً
  await showLocalNotification(notification);
}

/**
 * إشعار تحويل التذكرة
 */
export async function notifyTicketForward(
  ticketId: string,
  fromDepartment: string,
  toDepartment: string
): Promise<void> {
  const notification: NotificationMessage = {
    type: 'ticket-forward',
    title: '➡️ تحويل طلب',
    body: `تم تحويل الطلب ${ticketId} من ${fromDepartment} إلى ${toDepartment}`,
    data: { ticketId, fromDepartment, toDepartment },
  };

  await sendNotificationToDepartment(toDepartment, notification);
}

// =====================================================
// 📥 Receive Notifications (Real-time)
// =====================================================

type NotificationCallback = (notification: NotificationMessage) => void;
let notificationListeners: NotificationCallback[] = [];
let realtimeChannel: any = null;

/**
 * بدء الاستماع للإشعارات الجديدة
 */
export function startListeningForNotifications(
  employeeUsername?: string,
  department?: string
): void {
  const supabase = getDynamicSupabaseClient();
  if (!supabase) {
    console.warn('[NotificationBridge] Supabase not available for real-time');
    return;
  }

  // إيقاف الاستماع السابق
  stopListeningForNotifications();

  console.log('[NotificationBridge] Starting real-time notification listener...');

  realtimeChannel = supabase
    .channel('notifications-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_messages',
      },
      (payload: any) => {
        const notification = payload.new as NotificationMessage;
        
        // التحقق من أن الإشعار موجه لهذا الجهاز/القسم
        if (department && notification.target_department && 
            notification.target_department !== department) {
          return;
        }

        console.log('[NotificationBridge] New notification received:', notification);

        // عرض الإشعار
        showLocalNotification(notification);

        // إشعار المستمعين
        notificationListeners.forEach(cb => cb(notification));
      }
    )
    .subscribe();
}

/**
 * إيقاف الاستماع للإشعارات
 */
export function stopListeningForNotifications(): void {
  if (realtimeChannel) {
    const supabase = getDynamicSupabaseClient();
    if (supabase) {
      supabase.removeChannel(realtimeChannel);
    }
    realtimeChannel = null;
  }
}

/**
 * إضافة مستمع للإشعارات
 */
export function onNotificationReceived(callback: NotificationCallback): () => void {
  notificationListeners.push(callback);
  return () => {
    notificationListeners = notificationListeners.filter(cb => cb !== callback);
  };
}

// =====================================================
// 🔔 Local Notification Display
// =====================================================

/**
 * عرض إشعار محلي
 */
async function showLocalNotification(notification: NotificationMessage | Omit<NotificationMessage, 'target_department'>): Promise<void> {
  // على الموبايل
  if (isNativeMobile()) {
    // الإشعارات المحلية عبر Capacitor (Push Notifications)
    try {
      // Use push notifications for mobile since local notifications may not be available
      const { PushNotifications } = await import('@capacitor/push-notifications');
      // On mobile, we rely on real-time sync to trigger local UI updates
      // Push notifications are handled by FCM when app is in background
      console.log('[NotificationBridge] Mobile notification prepared:', notification.title);
    } catch (e) {
      console.warn('[NotificationBridge] Mobile notification not available:', e);
    }
    return;
  }

  // على الويب
  try {
    await pushNotifications.showNotification({
      title: notification.title,
      body: notification.body,
      data: notification.data,
      tag: notification.data?.ticketId ? `ticket-${notification.data.ticketId}` : undefined,
    });
  } catch (e) {
    console.warn('[NotificationBridge] Web notification failed:', e);
  }
}

// =====================================================
// 📜 Notification History
// =====================================================

/**
 * جلب سجل الإشعارات
 */
export async function getNotificationHistory(limit: number = 50): Promise<NotificationMessage[]> {
  const supabase = getDynamicSupabaseClient();
  if (!supabase) {
    // Fallback محلي
    try {
      const raw = localStorage.getItem('notificationHistory') || '[]';
      return JSON.parse(raw).slice(0, limit);
    } catch {
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from('notification_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[NotificationBridge] History fetch error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[NotificationBridge] History fetch failed:', err);
    return [];
  }
}

/**
 * تحديد الإشعار كمقروء
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const supabase = getDynamicSupabaseClient();
  if (supabase) {
    await supabase
      .from('notification_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);
  }
}

// =====================================================
// 🚀 Export
// =====================================================

export default {
  registerDeviceForNotifications,
  unregisterDevice,
  sendNotificationToDepartment,
  notifyNewTicket,
  notifyTicketStatusUpdate,
  notifyTicketResponse,
  notifyTicketForward,
  startListeningForNotifications,
  stopListeningForNotifications,
  onNotificationReceived,
  getNotificationHistory,
  markNotificationAsRead,
};
