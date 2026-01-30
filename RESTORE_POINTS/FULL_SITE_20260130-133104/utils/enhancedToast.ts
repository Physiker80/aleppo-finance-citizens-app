// =====================================================
// 🔔 Enhanced Toast Notification System
// نظام إشعارات Toast محسّن مع صوت وأنماط متعددة
// =====================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface ToastOptions {
    id?: string;
    type?: ToastType;
    title?: string;
    message: string;
    duration?: number; // ms, 0 = infinite
    position?: ToastPosition;
    dismissible?: boolean;
    showProgress?: boolean;
    sound?: boolean;
    icon?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    onClose?: () => void;
}

export interface Toast extends Required<Omit<ToastOptions, 'action' | 'onClose'>> {
    id: string;
    createdAt: number;
    action?: ToastOptions['action'];
    onClose?: ToastOptions['onClose'];
}

const DEFAULT_DURATION: Record<ToastType, number> = {
    success: 4000,
    error: 6000,
    warning: 5000,
    info: 4000,
    loading: 0 // infinite
};

const ICONS: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
    loading: '⟳'
};

const SOUNDS: Record<ToastType, string> = {
    success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6djIJ5d36CioqHgXp1dXl+hIeHhYB7d3d5fYKFhoWCfnp3eHt+goWFhIN/fHp5e36Bg4SDgX58enp7fYCCg4KAfXt6ent9gIGCgYB9e3p6e31/gYGAgH17enp7fX+AgIB/fXt6ent9f4CAgH99e3p6e31/gICAf317enp7fX+AgIB/fXt6ent9f4CAgH99e3t7fH1/gIB/f317e3t8fX+Af39/fXt7e3x9f4B/f399e3t7fH1/gH9/f317e3t8fX+Af39/fXt7e3x9f4B/f399fHt7fH1+f39/f318e3x8fX5/f39/fXx7fHx9fn9/f399fHt8fH1+f39/f318e3x8fX5/f39/fXx7fHx9fn9/f399fHx8fH1+f39/f318fHx8fX5/f39/fXx8fHx9fn9/f399fHx8fH1+f39/f318fHx8fX5/f39/fXx8fHx9fn9/f399fHx8fH1+fn9/f318fHx8fX5+f39/fX18fH19fn5/f399fXx8fX1+fn9/f319fHx9fX5+f39/fX18fH19fn5/f399fXx8fX1+fn9/f319fHx9fX5+f39/fX18fH19fn5+f399fXx8fX1+fn5/f319fH19fX5+fn9/fX18fX19fn5+f399fX19fX1+fn5/f319fX19fX5+fn9/fX19fX19fn5+f399fX19fX1+fn5/f319fX19fX5+fn9/fX19fX19fn5+f399fX19fX1+fn5/f319fX19fX5+fn9/fX19fX19fn5+f399fX19fX1+fn5/fX19fX5+fn5+f399fX1+fn5+fn9/fX19fn5+fn5/f319fX5+fn5+f399fX1+fn5+fn9/fX19fn5+fn5/f319fX5+fn5+f399fX1+fn5+fn9/fX19fn5+fn5/f319fX5+fn5+f399fX1+fn5+fn9/fX19fn5+fn5/f319fX5+fn5+f399fX1+fn5+fn9/fX19fn5+fn5/f319fX5+fn5+f399fX1+fn5+fn9/fX19fn5+fn5/f319fX5+fn5+f399fX1+fn5+fn9/fX19fn5+fn5/f319fX5+fn5+f399fX1+fn5+fn9/fX19fn5+fn5/f319fX5+fn5+f399fX1+fn5+fn9/fX19fn5+fn5/f319fn5+fn5+f399fX5+fn5+fn9/fX5+fn5+fn5/fX5+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/f35+fn5+fn5/',
    error: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf35+fX19fH18fHt7e3p6enl5eXh4eHd3d3Z2dnV1dXR0dHNzc3JycnFxcXBwcG9vb25ubm1tbWxsbGtra2pqamlpaWhpaGdnZ2ZmZmVlZWRkZGNjY2JiYmFhYWBgYF9fX15eXl1dXVxcXFtbW1paWllZWVhYWFdXV1ZWVlVVVVRUVFNTU1JSUlFRUVBQUE9PT05OTk1NTUxMTEtLS0pKSklJSUhISEdHR0ZGRkVFRURERENDQ0JCQkFBQUBAQD8/Pz4+Pj09PT09PTw8PDw8PDs7Ozs7Ozo6Ojo6Ojk5OTk5OTg4ODg4ODc3Nzc3NzY2NjY2NjU1NTU1NTQ0NDQ0NDMzMzMzMzIyMjIyMjExMTExMTAwMDAwMC8vLy8vLy4uLi4uLi0tLS0tLSwsLCwsLCsrKysrKyoqKioqKikpKSkpKSgoKCgoKCcnJycnJyYmJiYmJiUlJSUlJSQkJCQkJCMjIyMjIyIiIiIiIiEhISEhISAgICAgIB8fHx8fHx4eHh4eHh0dHR0dHRwcHBwcHBsbGxsbGxoaGhoaGhkZGRkZGRgYGBgYGBcXFxcXFxYWFhYWFhUVFRUVFRQUFBQUFBMTExMTExISEhISEhERERERERAQEBAQEA8PDw8PDw4ODg4ODg0NDQ0NDQwMDAwMDAsLCwsLCwoKCgoKCgkJCQkJCQgICAk=',
    warning: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgH9/fn5+fX19fHx8e3t7enp6eXl5eHh4d3d3dnZ2dXV1dHR0c3NzcnJycXFxcHBwb29vbm5ubW1tbGxsa2trampqaWlpaGhoZ2dnZmZmZWVlZGRkY2NjYmJiYWFhYGBgX19fXl5eXV1dXFxcW1tbWlpaWVlZWFhYV1dXVlZWVVVVVFRUU1NTUlJSUVFRUFBQT09PTk5OTU1NTExMS0tLSkpKSUlJSEhIR0dH',
    info: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAB+fn9/gICBgYKCg4OEhIWFhoaHh4iIiYmKiouLjIyNjY6Oj4+QkJGRkpKTk5SUlZWWlpeXmJiZmZqam5ucnJ2dnp6fn6CgoaGioqOjpKSlpaamp6eoqKmpqqqrq6ysra2urq+vsLCxsbKys7O0tLW1tra3t7i4ubm6uru7vLy9vb6+v7/AwMHBwsLDw8TExcXGxsfHyMjJycrKy8vMzM3Nzs7Pz9DQ0dHS0tPT1NTV1dbW19fY2NnZ2trc',
    loading: ''
};

/**
 * تشغيل صوت الإشعار
 */
function playNotificationSound(type: ToastType): void {
    if (type === 'loading' || !SOUNDS[type]) return;

    try {
        const audio = new Audio(SOUNDS[type]);
        audio.volume = 0.3;
        audio.play().catch(() => { });
    } catch { }
}

/**
 * إنشاء معرف فريد
 */
function generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * مدير الإشعارات
 */
class ToastManager {
    private toasts: Map<string, Toast> = new Map();
    private listeners: Set<(toasts: Toast[]) => void> = new Set();
    private container: HTMLElement | null = null;
    private position: ToastPosition = 'top-right';

    constructor() {
        if (typeof document !== 'undefined') {
            this.createContainer();
        }
    }

    private createContainer(): void {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.updateContainerPosition();
        document.body.appendChild(this.container);
    }

    private updateContainerPosition(): void {
        if (!this.container) return;

        const positions: Record<ToastPosition, string> = {
            'top-right': 'top: 16px; right: 16px;',
            'top-left': 'top: 16px; left: 16px;',
            'bottom-right': 'bottom: 16px; right: 16px;',
            'bottom-left': 'bottom: 16px; left: 16px;',
            'top-center': 'top: 16px; left: 50%; transform: translateX(-50%);',
            'bottom-center': 'bottom: 16px; left: 50%; transform: translateX(-50%);'
        };

        this.container.style.cssText = `
      position: fixed;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
      pointer-events: none;
      ${positions[this.position]}
    `;
    }

    setPosition(position: ToastPosition): void {
        this.position = position;
        this.updateContainerPosition();
    }

    private notify(): void {
        const toastList = Array.from(this.toasts.values());
        this.listeners.forEach(listener => listener(toastList));
    }

    subscribe(listener: (toasts: Toast[]) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    show(options: ToastOptions): string {
        const id = options.id || generateId();
        const type = options.type || 'info';

        const toast: Toast = {
            id,
            type,
            title: options.title || '',
            message: options.message,
            duration: options.duration ?? DEFAULT_DURATION[type],
            position: options.position || this.position,
            dismissible: options.dismissible ?? true,
            showProgress: options.showProgress ?? true,
            sound: options.sound ?? true,
            icon: options.icon || ICONS[type],
            createdAt: Date.now(),
            action: options.action,
            onClose: options.onClose
        };

        this.toasts.set(id, toast);
        this.notify();
        this.renderToast(toast);

        if (toast.sound) {
            playNotificationSound(type);
        }

        if (toast.duration > 0) {
            setTimeout(() => this.dismiss(id), toast.duration);
        }

        return id;
    }

    private renderToast(toast: Toast): void {
        if (!this.container) return;

        const element = document.createElement('div');
        element.id = toast.id;
        element.className = `toast toast-${toast.type}`;
        element.style.cssText = `
      background: ${this.getBackgroundColor(toast.type)};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      pointer-events: auto;
      animation: toastIn 0.3s ease-out forwards;
      position: relative;
      overflow: hidden;
      min-width: 280px;
      direction: rtl;
    `;

        element.innerHTML = `
      <span style="font-size: 18px; ${toast.type === 'loading' ? 'animation: spin 1s linear infinite;' : ''}">${toast.icon}</span>
      <div style="flex: 1;">
        ${toast.title ? `<div style="font-weight: 600; margin-bottom: 4px;">${toast.title}</div>` : ''}
        <div style="font-size: 14px; opacity: 0.95;">${toast.message}</div>
        ${toast.action ? `<button id="${toast.id}-action" style="margin-top: 8px; background: rgba(255,255,255,0.2); border: none; padding: 4px 12px; border-radius: 4px; color: white; cursor: pointer;">${toast.action.label}</button>` : ''}
      </div>
      ${toast.dismissible ? `<button id="${toast.id}-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; opacity: 0.7; padding: 0;">&times;</button>` : ''}
      ${toast.showProgress && toast.duration > 0 ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.3);"><div id="${toast.id}-progress" style="height: 100%; background: white; animation: progressShrink ${toast.duration}ms linear forwards;"></div></div>` : ''}
    `;

        this.container.appendChild(element);

        // Event listeners
        const closeBtn = document.getElementById(`${toast.id}-close`);
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.dismiss(toast.id));
        }

        const actionBtn = document.getElementById(`${toast.id}-action`);
        if (actionBtn && toast.action) {
            actionBtn.addEventListener('click', () => {
                toast.action!.onClick();
                this.dismiss(toast.id);
            });
        }
    }

    private getBackgroundColor(type: ToastType): string {
        const colors: Record<ToastType, string> = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            loading: '#6366f1'
        };
        return colors[type];
    }

    dismiss(id: string): void {
        const toast = this.toasts.get(id);
        if (!toast) return;

        const element = document.getElementById(id);
        if (element) {
            element.style.animation = 'toastOut 0.2s ease-in forwards';
            setTimeout(() => element.remove(), 200);
        }

        toast.onClose?.();
        this.toasts.delete(id);
        this.notify();
    }

    dismissAll(): void {
        this.toasts.forEach((_, id) => this.dismiss(id));
    }

    update(id: string, options: Partial<ToastOptions>): void {
        const toast = this.toasts.get(id);
        if (!toast) return;

        Object.assign(toast, options);
        this.notify();

        // Re-render
        const element = document.getElementById(id);
        if (element) {
            element.remove();
            this.renderToast(toast);
        }
    }

    // Convenience methods
    success(message: string, options?: Partial<ToastOptions>): string {
        return this.show({ ...options, message, type: 'success' });
    }

    error(message: string, options?: Partial<ToastOptions>): string {
        return this.show({ ...options, message, type: 'error' });
    }

    warning(message: string, options?: Partial<ToastOptions>): string {
        return this.show({ ...options, message, type: 'warning' });
    }

    info(message: string, options?: Partial<ToastOptions>): string {
        return this.show({ ...options, message, type: 'info' });
    }

    loading(message: string, options?: Partial<ToastOptions>): string {
        return this.show({ ...options, message, type: 'loading', dismissible: false, showProgress: false });
    }

    promise<T>(
        promise: Promise<T>,
        messages: { loading: string; success: string | ((data: T) => string); error: string | ((err: unknown) => string) }
    ): Promise<T> {
        const id = this.loading(messages.loading);

        return promise
            .then((data) => {
                const successMsg = typeof messages.success === 'function' ? messages.success(data) : messages.success;
                this.update(id, { type: 'success', message: successMsg, dismissible: true, showProgress: true, duration: 4000 });
                return data;
            })
            .catch((err) => {
                const errorMsg = typeof messages.error === 'function' ? messages.error(err) : messages.error;
                this.update(id, { type: 'error', message: errorMsg, dismissible: true, showProgress: true, duration: 6000 });
                throw err;
            });
    }
}

// Singleton instance
export const toast = new ToastManager();

// Inject required CSS
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(100%) scale(0.9); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateX(0) scale(1); }
      to { opacity: 0; transform: translateX(100%) scale(0.9); }
    }
    @keyframes progressShrink {
      from { width: 100%; }
      to { width: 0%; }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
    document.head.appendChild(style);
}

export default toast;
