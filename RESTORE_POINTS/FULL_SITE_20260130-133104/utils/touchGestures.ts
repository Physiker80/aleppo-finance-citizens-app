// =====================================================
// 👆 Touch Gestures System
// نظام إيماءات اللمس المتقدمة
// =====================================================

export type GestureType =
    | 'tap'
    | 'double-tap'
    | 'long-press'
    | 'swipe-left'
    | 'swipe-right'
    | 'swipe-up'
    | 'swipe-down'
    | 'pinch-in'
    | 'pinch-out'
    | 'rotate'
    | 'pan';

export interface GestureEvent {
    type: GestureType;
    target: HTMLElement;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    deltaX: number;
    deltaY: number;
    distance: number;
    direction: 'up' | 'down' | 'left' | 'right' | 'none';
    velocity: number;
    duration: number;
    scale?: number;
    rotation?: number;
    fingers: number;
    timestamp: number;
}

export interface GestureConfig {
    swipeThreshold: number; // الحد الأدنى للمسافة (بالبكسل)
    swipeVelocity: number; // الحد الأدنى للسرعة
    longPressDelay: number; // مدة الضغط المطول (مللي ثانية)
    doubleTapDelay: number; // الفاصل الأقصى بين النقرتين
    pinchThreshold: number; // الحد الأدنى لتغيير المقياس
    preventDefault: boolean;
    stopPropagation: boolean;
}

type GestureHandler = (event: GestureEvent) => void;

const DEFAULT_CONFIG: GestureConfig = {
    swipeThreshold: 50,
    swipeVelocity: 0.3,
    longPressDelay: 500,
    doubleTapDelay: 300,
    pinchThreshold: 0.1,
    preventDefault: true,
    stopPropagation: false
};

/**
 * مدير الإيماءات
 */
export class GestureManager {
    private element: HTMLElement;
    private config: GestureConfig;
    private handlers: Map<GestureType, GestureHandler[]> = new Map();

    private touchStartX = 0;
    private touchStartY = 0;
    private touchStartTime = 0;
    private lastTapTime = 0;
    private longPressTimer: ReturnType<typeof setTimeout> | null = null;
    private initialDistance = 0;
    private initialAngle = 0;

    private boundHandlers: {
        touchstart: (e: TouchEvent) => void;
        touchmove: (e: TouchEvent) => void;
        touchend: (e: TouchEvent) => void;
        touchcancel: (e: TouchEvent) => void;
    };

    constructor(element: HTMLElement, config: Partial<GestureConfig> = {}) {
        this.element = element;
        this.config = { ...DEFAULT_CONFIG, ...config };

        this.boundHandlers = {
            touchstart: this.handleTouchStart.bind(this),
            touchmove: this.handleTouchMove.bind(this),
            touchend: this.handleTouchEnd.bind(this),
            touchcancel: this.handleTouchCancel.bind(this)
        };

        this.attach();
    }

    /**
     * ربط مستمعي الأحداث
     */
    private attach(): void {
        this.element.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: !this.config.preventDefault });
        this.element.addEventListener('touchmove', this.boundHandlers.touchmove, { passive: !this.config.preventDefault });
        this.element.addEventListener('touchend', this.boundHandlers.touchend);
        this.element.addEventListener('touchcancel', this.boundHandlers.touchcancel);
    }

    /**
     * فصل مستمعي الأحداث
     */
    public detach(): void {
        this.element.removeEventListener('touchstart', this.boundHandlers.touchstart);
        this.element.removeEventListener('touchmove', this.boundHandlers.touchmove);
        this.element.removeEventListener('touchend', this.boundHandlers.touchend);
        this.element.removeEventListener('touchcancel', this.boundHandlers.touchcancel);

        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
    }

    /**
     * إضافة معالج إيماءة
     */
    public on(gesture: GestureType, handler: GestureHandler): this {
        if (!this.handlers.has(gesture)) {
            this.handlers.set(gesture, []);
        }
        this.handlers.get(gesture)!.push(handler);
        return this;
    }

    /**
     * إزالة معالج إيماءة
     */
    public off(gesture: GestureType, handler?: GestureHandler): this {
        if (!handler) {
            this.handlers.delete(gesture);
        } else {
            const handlers = this.handlers.get(gesture);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        }
        return this;
    }

    /**
     * تنفيذ المعالجات
     */
    private emit(event: GestureEvent): void {
        const handlers = this.handlers.get(event.type);
        if (handlers) {
            handlers.forEach(handler => handler(event));
        }
    }

    /**
     * حساب المسافة بين إصبعين
     */
    private getDistance(touches: TouchList): number {
        if (touches.length < 2) return 0;

        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * حساب الزاوية بين إصبعين
     */
    private getAngle(touches: TouchList): number {
        if (touches.length < 2) return 0;

        return Math.atan2(
            touches[1].clientY - touches[0].clientY,
            touches[1].clientX - touches[0].clientX
        ) * (180 / Math.PI);
    }

    /**
     * معالجة بداية اللمس
     */
    private handleTouchStart(e: TouchEvent): void {
        if (this.config.preventDefault) {
            e.preventDefault();
        }

        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();

        // الضغط المطول
        this.longPressTimer = setTimeout(() => {
            this.emit({
                type: 'long-press',
                target: this.element,
                startX: this.touchStartX,
                startY: this.touchStartY,
                endX: this.touchStartX,
                endY: this.touchStartY,
                deltaX: 0,
                deltaY: 0,
                distance: 0,
                direction: 'none',
                velocity: 0,
                duration: this.config.longPressDelay,
                fingers: e.touches.length,
                timestamp: Date.now()
            });
        }, this.config.longPressDelay);

        // حفظ المسافة والزاوية الأولية للـ pinch/rotate
        if (e.touches.length >= 2) {
            this.initialDistance = this.getDistance(e.touches);
            this.initialAngle = this.getAngle(e.touches);
        }
    }

    /**
     * معالجة حركة اللمس
     */
    private handleTouchMove(e: TouchEvent): void {
        if (this.config.preventDefault) {
            e.preventDefault();
        }

        // إلغاء الضغط المطول
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;

        // Pan event
        this.emit({
            type: 'pan',
            target: this.element,
            startX: this.touchStartX,
            startY: this.touchStartY,
            endX: touch.clientX,
            endY: touch.clientY,
            deltaX,
            deltaY,
            distance: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            direction: this.getDirection(deltaX, deltaY),
            velocity: 0,
            duration: Date.now() - this.touchStartTime,
            fingers: e.touches.length,
            timestamp: Date.now()
        });

        // Pinch/Rotate
        if (e.touches.length >= 2 && this.initialDistance > 0) {
            const currentDistance = this.getDistance(e.touches);
            const currentAngle = this.getAngle(e.touches);

            const scale = currentDistance / this.initialDistance;
            const rotation = currentAngle - this.initialAngle;

            if (Math.abs(1 - scale) > this.config.pinchThreshold) {
                this.emit({
                    type: scale > 1 ? 'pinch-out' : 'pinch-in',
                    target: this.element,
                    startX: this.touchStartX,
                    startY: this.touchStartY,
                    endX: touch.clientX,
                    endY: touch.clientY,
                    deltaX,
                    deltaY,
                    distance: currentDistance,
                    direction: 'none',
                    velocity: 0,
                    duration: Date.now() - this.touchStartTime,
                    scale,
                    fingers: e.touches.length,
                    timestamp: Date.now()
                });
            }

            if (Math.abs(rotation) > 10) {
                this.emit({
                    type: 'rotate',
                    target: this.element,
                    startX: this.touchStartX,
                    startY: this.touchStartY,
                    endX: touch.clientX,
                    endY: touch.clientY,
                    deltaX,
                    deltaY,
                    distance: currentDistance,
                    direction: 'none',
                    velocity: 0,
                    duration: Date.now() - this.touchStartTime,
                    rotation,
                    fingers: e.touches.length,
                    timestamp: Date.now()
                });
            }
        }
    }

    /**
     * معالجة نهاية اللمس
     */
    private handleTouchEnd(e: TouchEvent): void {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        const touch = e.changedTouches[0];
        const endX = touch.clientX;
        const endY = touch.clientY;
        const deltaX = endX - this.touchStartX;
        const deltaY = endY - this.touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = Date.now() - this.touchStartTime;
        const velocity = distance / duration;
        const direction = this.getDirection(deltaX, deltaY);

        const baseEvent: GestureEvent = {
            type: 'tap',
            target: this.element,
            startX: this.touchStartX,
            startY: this.touchStartY,
            endX,
            endY,
            deltaX,
            deltaY,
            distance,
            direction,
            velocity,
            duration,
            fingers: e.changedTouches.length,
            timestamp: Date.now()
        };

        // التحقق من السحب
        if (distance >= this.config.swipeThreshold && velocity >= this.config.swipeVelocity) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                baseEvent.type = deltaX > 0 ? 'swipe-right' : 'swipe-left';
            } else {
                baseEvent.type = deltaY > 0 ? 'swipe-down' : 'swipe-up';
            }
            this.emit(baseEvent);
        } else if (distance < 10 && duration < this.config.longPressDelay) {
            // النقر
            const now = Date.now();

            if (now - this.lastTapTime < this.config.doubleTapDelay) {
                baseEvent.type = 'double-tap';
                this.lastTapTime = 0;
            } else {
                baseEvent.type = 'tap';
                this.lastTapTime = now;
            }

            this.emit(baseEvent);
        }

        // إعادة تعيين
        this.initialDistance = 0;
        this.initialAngle = 0;
    }

    /**
     * معالجة إلغاء اللمس
     */
    private handleTouchCancel(): void {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        this.initialDistance = 0;
        this.initialAngle = 0;
    }

    /**
     * تحديد الاتجاه
     */
    private getDirection(deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' | 'none' {
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            return 'none';
        }

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            return deltaX > 0 ? 'right' : 'left';
        } else {
            return deltaY > 0 ? 'down' : 'up';
        }
    }
}

/**
 * إنشاء مدير إيماءات
 */
export function createGestureManager(
    element: HTMLElement | string,
    config?: Partial<GestureConfig>
): GestureManager {
    const el = typeof element === 'string'
        ? document.querySelector<HTMLElement>(element)
        : element;

    if (!el) {
        throw new Error('Element not found');
    }

    return new GestureManager(el, config);
}

/**
 * إضافة سحب للتحديث (Pull to Refresh)
 */
export function addPullToRefresh(
    container: HTMLElement,
    onRefresh: () => Promise<void>,
    options: {
        threshold?: number;
        indicatorClass?: string;
    } = {}
): () => void {
    const threshold = options.threshold || 80;
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let isRefreshing = false;

    // إنشاء المؤشر
    const indicator = document.createElement('div');
    indicator.className = options.indicatorClass || 'pull-refresh-indicator';
    indicator.innerHTML = `
    <svg class="pull-refresh-spinner" viewBox="0 0 24 24" width="24" height="24">
      <path fill="currentColor" d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>
    </svg>
    <span class="pull-refresh-text">اسحب للتحديث</span>
  `;
    indicator.style.cssText = `
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--primary-color, #0f3c35);
    color: white;
    border-radius: 20px;
    transition: top 0.3s;
    z-index: 1000;
  `;
    container.style.position = 'relative';
    container.appendChild(indicator);

    const handleTouchStart = (e: TouchEvent) => {
        if (container.scrollTop === 0 && !isRefreshing) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isPulling || isRefreshing) return;

        currentY = e.touches[0].clientY;
        const delta = currentY - startY;

        if (delta > 0 && delta <= threshold * 2) {
            e.preventDefault();
            const progress = Math.min(delta / threshold, 1);
            indicator.style.top = `${-60 + delta * 0.5}px`;
            indicator.style.opacity = String(progress);

            const text = indicator.querySelector('.pull-refresh-text');
            if (text) {
                text.textContent = delta >= threshold ? 'أفلت للتحديث' : 'اسحب للتحديث';
            }
        }
    };

    const handleTouchEnd = async () => {
        if (!isPulling) return;

        const delta = currentY - startY;

        if (delta >= threshold && !isRefreshing) {
            isRefreshing = true;
            indicator.style.top = '10px';
            const text = indicator.querySelector('.pull-refresh-text');
            if (text) {
                text.textContent = 'جاري التحديث...';
            }
            indicator.querySelector('.pull-refresh-spinner')?.classList.add('spinning');

            try {
                await onRefresh();
            } finally {
                isRefreshing = false;
                indicator.style.top = '-60px';
                indicator.querySelector('.pull-refresh-spinner')?.classList.remove('spinning');
            }
        } else {
            indicator.style.top = '-60px';
        }

        isPulling = false;
        startY = 0;
        currentY = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    // إضافة أنماط الدوران
    const style = document.createElement('style');
    style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .pull-refresh-spinner.spinning {
      animation: spin 1s linear infinite;
    }
  `;
    document.head.appendChild(style);

    // إرجاع دالة التنظيف
    return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        indicator.remove();
        style.remove();
    };
}

/**
 * إضافة سحب قابل للرفض (Swipe to Dismiss)
 */
export function addSwipeToDismiss(
    element: HTMLElement,
    onDismiss: (direction: 'left' | 'right') => void,
    options: {
        threshold?: number;
        direction?: 'left' | 'right' | 'both';
    } = {}
): () => void {
    const threshold = options.threshold || 100;
    const allowedDirection = options.direction || 'both';

    const manager = new GestureManager(element, {
        preventDefault: false
    });

    let startTransform = '';

    manager.on('pan', (e) => {
        if (allowedDirection === 'left' && e.deltaX > 0) return;
        if (allowedDirection === 'right' && e.deltaX < 0) return;

        element.style.transform = `translateX(${e.deltaX}px)`;
        element.style.opacity = String(1 - Math.abs(e.deltaX) / (threshold * 2));
    });

    const handleSwipe = (direction: 'left' | 'right') => {
        element.style.transition = 'all 0.3s ease';
        element.style.transform = `translateX(${direction === 'left' ? '-100%' : '100%'})`;
        element.style.opacity = '0';

        setTimeout(() => {
            onDismiss(direction);
        }, 300);
    };

    manager.on('swipe-left', () => {
        if (allowedDirection === 'right') return;
        handleSwipe('left');
    });

    manager.on('swipe-right', () => {
        if (allowedDirection === 'left') return;
        handleSwipe('right');
    });

    // إعادة التعيين عند عدم تجاوز الحد
    element.addEventListener('touchend', () => {
        const currentX = parseFloat(element.style.transform.replace(/[^-\d.]/g, '') || '0');
        if (Math.abs(currentX) < threshold) {
            element.style.transition = 'all 0.2s ease';
            element.style.transform = startTransform;
            element.style.opacity = '1';
        }
    });

    return () => manager.detach();
}

export default {
    GestureManager,
    createGestureManager,
    addPullToRefresh,
    addSwipeToDismiss
};
