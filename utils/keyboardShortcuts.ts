// =====================================================
// ⌨️ Keyboard Shortcuts Manager
// نظام اختصارات لوحة المفاتيح للمستخدمين المتقدمين
// =====================================================

export interface Shortcut {
    /** المفاتيح (مثل: 'ctrl+k', 'alt+n') */
    keys: string;
    /** وصف الاختصار */
    description: string;
    /** الفئة */
    category: ShortcutCategory;
    /** الدالة المنفذة */
    action: () => void;
    /** تعطيل/تفعيل */
    enabled?: boolean;
    /** يعمل فقط عند تسجيل الدخول */
    requiresAuth?: boolean;
}

export type ShortcutCategory =
    | 'navigation'
    | 'actions'
    | 'search'
    | 'modals'
    | 'accessibility';

interface KeyboardShortcutsConfig {
    /** تفعيل الاختصارات */
    enabled: boolean;
    /** إظهار تلميحات الاختصارات */
    showHints: boolean;
    /** تأخير إظهار التلميحات (ms) */
    hintDelay: number;
}

const DEFAULT_CONFIG: KeyboardShortcutsConfig = {
    enabled: true,
    showHints: true,
    hintDelay: 500
};

class KeyboardShortcutsManager {
    private shortcuts: Map<string, Shortcut> = new Map();
    private config: KeyboardShortcutsConfig;
    private isAuthenticated: boolean = false;
    private helpModal: HTMLElement | null = null;

    constructor(config: Partial<KeyboardShortcutsConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * تهيئة المدير
     */
    init(): void {
        document.addEventListener('keydown', this.handleKeyDown);
        this.registerDefaultShortcuts();
        console.log('[Shortcuts] Keyboard shortcuts initialized');
    }

    /**
     * إيقاف المدير
     */
    destroy(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        this.shortcuts.clear();
    }

    /**
     * تسجيل اختصار
     */
    register(shortcut: Shortcut): void {
        const normalizedKeys = this.normalizeKeys(shortcut.keys);
        this.shortcuts.set(normalizedKeys, {
            ...shortcut,
            keys: normalizedKeys,
            enabled: shortcut.enabled !== false
        });
    }

    /**
     * إلغاء تسجيل اختصار
     */
    unregister(keys: string): void {
        const normalizedKeys = this.normalizeKeys(keys);
        this.shortcuts.delete(normalizedKeys);
    }

    /**
     * تعيين حالة المصادقة
     */
    setAuthenticated(authenticated: boolean): void {
        this.isAuthenticated = authenticated;
    }

    /**
     * التعامل مع ضغط المفاتيح
     */
    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.config.enabled) return;

        // تجاهل الضغط في حقول الإدخال
        const target = event.target as HTMLElement;
        if (this.isInputElement(target)) return;

        const pressedKeys = this.getPressedKeys(event);
        const shortcut = this.shortcuts.get(pressedKeys);

        if (shortcut && shortcut.enabled) {
            // التحقق من المصادقة
            if (shortcut.requiresAuth && !this.isAuthenticated) return;

            event.preventDefault();
            shortcut.action();
        }
    }

    /**
     * التحقق من عنصر الإدخال
     */
    private isInputElement(element: HTMLElement): boolean {
        const tagName = element.tagName.toLowerCase();
        const isEditable = element.isContentEditable;
        const isInput = ['input', 'textarea', 'select'].includes(tagName);
        return isEditable || isInput;
    }

    /**
     * الحصول على المفاتيح المضغوطة
     */
    private getPressedKeys(event: KeyboardEvent): string {
        const parts: string[] = [];

        if (event.ctrlKey) parts.push('ctrl');
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');
        if (event.metaKey) parts.push('meta');

        const key = event.key.toLowerCase();
        if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
            parts.push(key);
        }

        return parts.join('+');
    }

    /**
     * تطبيع المفاتيح
     */
    private normalizeKeys(keys: string): string {
        return keys
            .toLowerCase()
            .split('+')
            .map(k => k.trim())
            .sort((a, b) => {
                const order = ['ctrl', 'alt', 'shift', 'meta'];
                const aIndex = order.indexOf(a);
                const bIndex = order.indexOf(b);
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                return 0;
            })
            .join('+');
    }

    /**
     * تسجيل الاختصارات الافتراضية
     */
    private registerDefaultShortcuts(): void {
        // اختصارات التنقل
        this.register({
            keys: 'alt+h',
            description: 'الذهاب للصفحة الرئيسية',
            category: 'navigation',
            action: () => window.location.hash = '#/'
        });

        this.register({
            keys: 'alt+d',
            description: 'الذهاب للوحة التحكم',
            category: 'navigation',
            requiresAuth: true,
            action: () => window.location.hash = '#/dashboard'
        });

        this.register({
            keys: 'alt+n',
            description: 'تقديم طلب جديد',
            category: 'navigation',
            action: () => window.location.hash = '#/submit'
        });

        this.register({
            keys: 'alt+t',
            description: 'متابعة طلب',
            category: 'navigation',
            action: () => window.location.hash = '#/track'
        });

        this.register({
            keys: 'alt+f',
            description: 'الأسئلة الشائعة',
            category: 'navigation',
            action: () => window.location.hash = '#/faq'
        });

        this.register({
            keys: 'alt+c',
            description: 'اتصل بنا',
            category: 'navigation',
            action: () => window.location.hash = '#/contact'
        });

        // اختصارات البحث
        this.register({
            keys: 'ctrl+k',
            description: 'فتح البحث السريع',
            category: 'search',
            action: () => this.triggerGlobalSearch()
        });

        this.register({
            keys: '/',
            description: 'البحث (بديل)',
            category: 'search',
            action: () => this.triggerGlobalSearch()
        });

        // اختصارات إمكانية الوصول
        this.register({
            keys: 'alt+1',
            description: 'تبديل الوضع الداكن',
            category: 'accessibility',
            action: () => this.toggleDarkMode()
        });

        this.register({
            keys: 'alt+0',
            description: 'العودة للأعلى',
            category: 'accessibility',
            action: () => window.scrollTo({ top: 0, behavior: 'smooth' })
        });

        // اختصار المساعدة
        this.register({
            keys: '?',
            description: 'إظهار قائمة الاختصارات',
            category: 'modals',
            action: () => this.showHelp()
        });

        this.register({
            keys: 'escape',
            description: 'إغلاق النوافذ المنبثقة',
            category: 'modals',
            action: () => this.closeModals()
        });

        // اختصارات الإجراءات
        this.register({
            keys: 'alt+r',
            description: 'تحديث الصفحة',
            category: 'actions',
            action: () => window.location.reload()
        });

        this.register({
            keys: 'alt+b',
            description: 'العودة للخلف',
            category: 'actions',
            action: () => window.history.back()
        });
    }

    /**
     * تشغيل البحث العام
     */
    private triggerGlobalSearch(): void {
        // البحث عن حقل البحث وتركيز عليه
        const searchInput = document.querySelector<HTMLInputElement>(
            'input[type="search"], input[placeholder*="بحث"], .search-input'
        );
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        } else {
            // إنشاء حدث مخصص
            window.dispatchEvent(new CustomEvent('open-global-search'));
        }
    }

    /**
     * تبديل الوضع الداكن
     */
    private toggleDarkMode(): void {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: isDark ? 'dark' : 'light' } }));
    }

    /**
     * إغلاق النوافذ المنبثقة
     */
    private closeModals(): void {
        // إغلاق المساعدة إذا كانت مفتوحة
        if (this.helpModal) {
            this.hideHelp();
            return;
        }

        // إرسال حدث إغلاق
        window.dispatchEvent(new CustomEvent('close-modals'));

        // النقر على أزرار الإغلاق
        const closeButtons = document.querySelectorAll<HTMLButtonElement>(
            '[data-dismiss="modal"], .modal-close, [aria-label="Close"]'
        );
        closeButtons.forEach(btn => btn.click());
    }

    /**
     * إظهار قائمة المساعدة
     */
    showHelp(): void {
        if (this.helpModal) {
            this.hideHelp();
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm';
        modal.id = 'keyboard-shortcuts-help';

        const content = document.createElement('div');
        content.className = 'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-2xl mx-4 max-h-[80vh] overflow-auto';

        // العنوان
        content.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">⌨️ اختصارات لوحة المفاتيح</h2>
        <button id="close-shortcuts-help" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl">&times;</button>
      </div>
    `;

        // تجميع الاختصارات حسب الفئة
        const byCategory = new Map<ShortcutCategory, Shortcut[]>();
        this.shortcuts.forEach(shortcut => {
            if (!byCategory.has(shortcut.category)) {
                byCategory.set(shortcut.category, []);
            }
            byCategory.get(shortcut.category)!.push(shortcut);
        });

        const categoryNames: Record<ShortcutCategory, string> = {
            'navigation': '🧭 التنقل',
            'actions': '⚡ الإجراءات',
            'search': '🔍 البحث',
            'modals': '📦 النوافذ',
            'accessibility': '♿ إمكانية الوصول'
        };

        byCategory.forEach((shortcuts, category) => {
            const section = document.createElement('div');
            section.className = 'mb-6';
            section.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
          ${categoryNames[category]}
        </h3>
        <div class="space-y-2">
          ${shortcuts.map(s => `
            <div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span class="text-gray-600 dark:text-gray-400">${s.description}</span>
              <kbd class="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                ${s.keys.replace(/\+/g, ' + ')}
              </kbd>
            </div>
          `).join('')}
        </div>
      `;
            content.appendChild(section);
        });

        modal.appendChild(content);
        document.body.appendChild(modal);
        this.helpModal = modal;

        // إغلاق عند النقر خارجاً
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideHelp();
        });

        // إغلاق بالزر
        document.getElementById('close-shortcuts-help')?.addEventListener('click', () => this.hideHelp());
    }

    /**
     * إخفاء قائمة المساعدة
     */
    hideHelp(): void {
        if (this.helpModal) {
            this.helpModal.remove();
            this.helpModal = null;
        }
    }

    /**
     * الحصول على جميع الاختصارات
     */
    getAll(): Shortcut[] {
        return Array.from(this.shortcuts.values());
    }

    /**
     * تحديث الإعدادات
     */
    updateConfig(config: Partial<KeyboardShortcutsConfig>): void {
        this.config = { ...this.config, ...config };
    }
}

// Export singleton
export const keyboardShortcuts = new KeyboardShortcutsManager();

// التهيئة التلقائية
if (typeof window !== 'undefined') {
    keyboardShortcuts.init();
}

export default keyboardShortcuts;
