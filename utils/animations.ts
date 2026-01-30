// =====================================================
// 🎬 Animation Utilities
// رسوم متحركة وانتقالات سلسة
// =====================================================

/**
 * إعدادات الحركة الافتراضية
 */
export const ANIMATION_DURATION = {
    fast: 150,
    normal: 300,
    slow: 500,
    verySlow: 800
};

/**
 * منحنيات الحركة (Easing)
 */
export const EASING = {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    // Custom bezier curves
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)'
};

/**
 * أنماط CSS للرسوم المتحركة
 */
export const animationStyles = `
/* ===== Fade Animations ===== */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ===== Scale Animations ===== */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scaleOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  70% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* ===== Slide Animations ===== */
@keyframes slideInUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slideInDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes slideInLeft {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes slideOutUp {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-100%);
  }
}

@keyframes slideOutDown {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

/* ===== Bounce Animations ===== */
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-15px);
  }
  60% {
    transform: translateY(-7px);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}

/* ===== Shake Animation ===== */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

/* ===== Pulse Animation ===== */
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes pulseRing {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* ===== Spin Animation ===== */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ===== Ripple Animation ===== */
@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* ===== Glow Animation ===== */
@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(15, 60, 53, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(15, 60, 53, 0.6);
  }
}

/* ===== Skeleton Loading ===== */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* ===== Modal/Dialog Animations ===== */
@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modalOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
}

@keyframes backdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes backdropOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* ===== Notification Toast Animations ===== */
@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
}

/* ===== Progress Bar ===== */
@keyframes progressIndeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

/* ===== Utility Classes ===== */
.animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
.animate-fadeOut { animation: fadeOut 0.3s ease-out forwards; }
.animate-fadeInUp { animation: fadeInUp 0.3s ease-out forwards; }
.animate-fadeInDown { animation: fadeInDown 0.3s ease-out forwards; }
.animate-fadeInRight { animation: fadeInRight 0.3s ease-out forwards; }
.animate-fadeInLeft { animation: fadeInLeft 0.3s ease-out forwards; }
.animate-scaleIn { animation: scaleIn 0.3s ease-out forwards; }
.animate-scaleOut { animation: scaleOut 0.3s ease-out forwards; }
.animate-popIn { animation: popIn 0.4s ease-out forwards; }
.animate-slideInUp { animation: slideInUp 0.3s ease-out forwards; }
.animate-slideInDown { animation: slideInDown 0.3s ease-out forwards; }
.animate-slideInRight { animation: slideInRight 0.3s ease-out forwards; }
.animate-slideInLeft { animation: slideInLeft 0.3s ease-out forwards; }
.animate-bounce { animation: bounce 1s ease infinite; }
.animate-bounceIn { animation: bounceIn 0.5s ease-out forwards; }
.animate-shake { animation: shake 0.5s ease-out; }
.animate-pulse { animation: pulse 2s ease-in-out infinite; }
.animate-spin { animation: spin 1s linear infinite; }
.animate-glow { animation: glow 2s ease-in-out infinite; }
.animate-modalIn { animation: modalIn 0.3s ease-out forwards; }
.animate-modalOut { animation: modalOut 0.2s ease-in forwards; }
.animate-toastIn { animation: toastIn 0.3s ease-out forwards; }
.animate-toastOut { animation: toastOut 0.2s ease-in forwards; }

/* Transition utilities */
.transition-fast { transition: all 0.15s ease; }
.transition-normal { transition: all 0.3s ease; }
.transition-slow { transition: all 0.5s ease; }

/* Hover effects */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.hover-scale {
  transition: transform 0.2s ease;
}
.hover-scale:hover {
  transform: scale(1.02);
}

.hover-glow {
  transition: box-shadow 0.3s ease;
}
.hover-glow:hover {
  box-shadow: 0 0 15px rgba(15, 60, 53, 0.3);
}
`;

/**
 * إضافة أنماط الحركة للصفحة
 */
export function injectAnimationStyles(): void {
    if (typeof document === 'undefined') return;

    const styleId = 'animation-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = animationStyles;
    document.head.appendChild(style);
}

/**
 * تطبيق حركة على عنصر
 */
export function animate(
    element: HTMLElement,
    animation: string,
    duration: number = ANIMATION_DURATION.normal,
    onComplete?: () => void
): void {
    element.style.animation = `${animation} ${duration}ms ${EASING.smooth} forwards`;

    if (onComplete) {
        setTimeout(onComplete, duration);
    }
}

/**
 * إخفاء عنصر بحركة
 */
export async function hideWithAnimation(
    element: HTMLElement,
    animation: string = 'fadeOut',
    duration: number = ANIMATION_DURATION.normal
): Promise<void> {
    return new Promise((resolve) => {
        animate(element, animation, duration, () => {
            element.style.display = 'none';
            resolve();
        });
    });
}

/**
 * إظهار عنصر بحركة
 */
export async function showWithAnimation(
    element: HTMLElement,
    animation: string = 'fadeIn',
    duration: number = ANIMATION_DURATION.normal
): Promise<void> {
    return new Promise((resolve) => {
        element.style.display = '';
        animate(element, animation, duration, resolve);
    });
}

/**
 * Staggered animation للقوائم
 */
export function staggerAnimation(
    elements: HTMLElement[],
    animation: string,
    staggerDelay: number = 50,
    duration: number = ANIMATION_DURATION.normal
): void {
    elements.forEach((el, index) => {
        setTimeout(() => {
            animate(el, animation, duration);
        }, index * staggerDelay);
    });
}

/**
 * تأثير Ripple للأزرار
 */
export function createRipple(event: MouseEvent): void {
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    const ripple = document.createElement('span');
    const diameter = Math.max(rect.width, rect.height);
    const radius = diameter / 2;

    ripple.style.cssText = `
    position: absolute;
    width: ${diameter}px;
    height: ${diameter}px;
    left: ${event.clientX - rect.left - radius}px;
    top: ${event.clientY - rect.top - radius}px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: scale(0);
    animation: ripple 0.6s ease-out;
    pointer-events: none;
  `;

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
}

export default {
    ANIMATION_DURATION,
    EASING,
    animationStyles,
    injectAnimationStyles,
    animate,
    hideWithAnimation,
    showWithAnimation,
    staggerAnimation,
    createRipple
};
