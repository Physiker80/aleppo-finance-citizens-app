// =====================================================
// 📱 Mobile App Shortcuts
// اختصارات تطبيق الموبايل
// =====================================================

export interface AppShortcut {
    id: string;
    title: string;
    description: string;
    icon: string;
    url: string;
    action?: string;
}

export interface ShortcutConfig {
    enabled: boolean;
    shortcuts: AppShortcut[];
    maxShortcuts: number;
}

const CONFIG_KEY = 'app-shortcuts-config';

const DEFAULT_SHORTCUTS: AppShortcut[] = [
    {
        id: 'new-ticket',
        title: 'شكوى جديدة',
        description: 'تقديم شكوى جديدة',
        icon: '/icons/new-ticket.png',
        url: '#/submit',
        action: 'new-ticket'
    },
    {
        id: 'track-ticket',
        title: 'تتبع شكوى',
        description: 'متابعة حالة الشكوى',
        icon: '/icons/track.png',
        url: '#/track',
        action: 'track-ticket'
    },
    {
        id: 'dashboard',
        title: 'لوحة التحكم',
        description: 'الوصول السريع للوحة التحكم',
        icon: '/icons/dashboard.png',
        url: '#/employee-dashboard',
        action: 'dashboard'
    },
    {
        id: 'contact',
        title: 'اتصل بنا',
        description: 'التواصل مع الدعم',
        icon: '/icons/contact.png',
        url: '#/contact',
        action: 'contact'
    }
];

/**
 * تحميل الإعدادات
 */
export function loadConfig(): ShortcutConfig {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch { }

    return {
        enabled: true,
        shortcuts: DEFAULT_SHORTCUTS,
        maxShortcuts: 4
    };
}

/**
 * حفظ الإعدادات
 */
export function saveConfig(config: Partial<ShortcutConfig>): void {
    const current = loadConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/**
 * التحقق من دعم Web App Manifest Shortcuts
 */
export function isShortcutsSupported(): boolean {
    return 'BeforeInstallPromptEvent' in window ||
        ('getInstalledRelatedApps' in navigator);
}

/**
 * التحقق من التثبيت كـ PWA
 */
export function isPWAInstalled(): boolean {
    // التحقق من وضع العرض
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }

    // التحقق من iOS
    if ((navigator as unknown as { standalone?: boolean }).standalone === true) {
        return true;
    }

    return false;
}

/**
 * الحصول على الاختصارات النشطة
 */
export function getActiveShortcuts(): AppShortcut[] {
    const config = loadConfig();

    if (!config.enabled) {
        return [];
    }

    return config.shortcuts.slice(0, config.maxShortcuts);
}

/**
 * إضافة اختصار
 */
export function addShortcut(shortcut: AppShortcut): boolean {
    const config = loadConfig();

    // التحقق من عدم وجود الاختصار
    if (config.shortcuts.some(s => s.id === shortcut.id)) {
        return false;
    }

    config.shortcuts.push(shortcut);
    saveConfig(config);

    return true;
}

/**
 * إزالة اختصار
 */
export function removeShortcut(shortcutId: string): boolean {
    const config = loadConfig();
    const index = config.shortcuts.findIndex(s => s.id === shortcutId);

    if (index === -1) {
        return false;
    }

    config.shortcuts.splice(index, 1);
    saveConfig(config);

    return true;
}

/**
 * تحديث اختصار
 */
export function updateShortcut(shortcutId: string, updates: Partial<AppShortcut>): boolean {
    const config = loadConfig();
    const index = config.shortcuts.findIndex(s => s.id === shortcutId);

    if (index === -1) {
        return false;
    }

    config.shortcuts[index] = { ...config.shortcuts[index], ...updates };
    saveConfig(config);

    return true;
}

/**
 * إعادة ترتيب الاختصارات
 */
export function reorderShortcuts(orderedIds: string[]): void {
    const config = loadConfig();
    const newOrder: AppShortcut[] = [];

    orderedIds.forEach(id => {
        const shortcut = config.shortcuts.find(s => s.id === id);
        if (shortcut) {
            newOrder.push(shortcut);
        }
    });

    // إضافة أي اختصارات غير مضمنة في الترتيب الجديد
    config.shortcuts.forEach(s => {
        if (!newOrder.some(n => n.id === s.id)) {
            newOrder.push(s);
        }
    });

    config.shortcuts = newOrder;
    saveConfig(config);
}

/**
 * إعادة تعيين الاختصارات الافتراضية
 */
export function resetToDefault(): void {
    saveConfig({
        enabled: true,
        shortcuts: [...DEFAULT_SHORTCUTS],
        maxShortcuts: 4
    });
}

/**
 * تحديث manifest.json ديناميكياً
 */
export function updateManifestShortcuts(): void {
    const shortcuts = getActiveShortcuts();

    // البحث عن العنصر الموجود
    let manifestLink = document.querySelector('link[rel="manifest"]');

    if (!manifestLink) {
        return;
    }

    // إنشاء manifest جديد مع الاختصارات
    const manifestContent = {
        shortcuts: shortcuts.map(s => ({
            name: s.title,
            short_name: s.title,
            description: s.description,
            url: s.url,
            icons: [{
                src: s.icon,
                sizes: '96x96'
            }]
        }))
    };

    // يمكن إرسال هذا إلى الخادم لتحديث manifest.json
    console.log('Manifest shortcuts update:', manifestContent);
}

/**
 * تنفيذ إجراء الاختصار
 */
export function executeShortcutAction(shortcutId: string): void {
    const config = loadConfig();
    const shortcut = config.shortcuts.find(s => s.id === shortcutId);

    if (!shortcut) {
        return;
    }

    // تسجيل الاستخدام
    logShortcutUsage(shortcutId);

    // التنقل
    if (shortcut.url.startsWith('#')) {
        window.location.hash = shortcut.url.slice(1);
    } else {
        window.location.href = shortcut.url;
    }
}

/**
 * تسجيل استخدام الاختصار
 */
const USAGE_KEY = 'shortcut-usage';

function logShortcutUsage(shortcutId: string): void {
    const usage = getShortcutUsage();
    usage[shortcutId] = (usage[shortcutId] || 0) + 1;
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

/**
 * الحصول على إحصائيات الاستخدام
 */
export function getShortcutUsage(): Record<string, number> {
    try {
        const saved = localStorage.getItem(USAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

/**
 * الحصول على الاختصارات الأكثر استخداماً
 */
export function getMostUsedShortcuts(limit: number = 4): AppShortcut[] {
    const config = loadConfig();
    const usage = getShortcutUsage();

    return [...config.shortcuts]
        .sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0))
        .slice(0, limit);
}

/**
 * إنشاء عنصر واجهة اختصارات للشاشة الرئيسية
 */
export function createShortcutsWidget(): HTMLElement {
    const shortcuts = getActiveShortcuts();

    const widget = document.createElement('div');
    widget.className = 'shortcuts-widget';
    widget.style.cssText = `
    display: grid;
    grid-template-columns: repeat(${Math.min(shortcuts.length, 4)}, 1fr);
    gap: 12px;
    padding: 16px;
    background: var(--card-bg, white);
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  `;

    shortcuts.forEach(shortcut => {
        const item = document.createElement('button');
        item.className = 'shortcut-item';
        item.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 12px;
      transition: all 0.2s;
    `;

        item.innerHTML = `
      <img src="${shortcut.icon}" alt="${shortcut.title}" 
           style="width: 48px; height: 48px; border-radius: 12px;"
           onerror="this.style.display='none'">
      <span style="font-size: 12px; color: var(--text-color, #333);">
        ${shortcut.title}
      </span>
    `;

        item.addEventListener('click', () => executeShortcutAction(shortcut.id));

        // تأثيرات hover
        item.addEventListener('mouseenter', () => {
            item.style.background = 'rgba(0,0,0,0.05)';
        });
        item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
        });

        widget.appendChild(item);
    });

    return widget;
}

/**
 * تكامل مع Capacitor للتطبيق الأصلي
 */
export async function setupNativeShortcuts(): Promise<void> {
    // التحقق من وجود Capacitor
    if (typeof (window as unknown as { Capacitor?: unknown }).Capacitor === 'undefined') {
        return;
    }

    try {
        // استخدام App Shortcuts plugin إذا كان متاحاً
        // import { AppShortcuts } from '@nicholasaziz/app-shortcuts';

        const shortcuts = getActiveShortcuts();

        console.log('Setting up native shortcuts:', shortcuts);

        // في الإنتاج، استخدم:
        // await AppShortcuts.setShortcuts({
        //   shortcuts: shortcuts.map(s => ({
        //     id: s.id,
        //     shortLabel: s.title,
        //     longLabel: s.description,
        //     icon: s.icon,
        //     data: { url: s.url }
        //   }))
        // });
    } catch (error) {
        console.warn('Native shortcuts not available:', error);
    }
}

/**
 * معالجة اختصار من الرابط العميق
 */
export function handleDeepLink(url: string): boolean {
    const shortcuts = getActiveShortcuts();
    const shortcut = shortcuts.find(s => url.includes(s.action || s.id));

    if (shortcut) {
        executeShortcutAction(shortcut.id);
        return true;
    }

    return false;
}

export default {
    loadConfig,
    saveConfig,
    isShortcutsSupported,
    isPWAInstalled,
    getActiveShortcuts,
    addShortcut,
    removeShortcut,
    updateShortcut,
    reorderShortcuts,
    resetToDefault,
    executeShortcutAction,
    getShortcutUsage,
    getMostUsedShortcuts,
    createShortcutsWidget,
    setupNativeShortcuts,
    handleDeepLink
};
