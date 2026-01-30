// =====================================================
// 📊 Customizable Dashboard System
// نظام لوحة تحكم مخصصة مع widgets قابلة للسحب
// =====================================================

import { useState, useCallback, useEffect } from 'react';

export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title: string;
    size: 'small' | 'medium' | 'large' | 'full';
    position: { x: number; y: number };
    visible: boolean;
    config?: Record<string, unknown>;
}

export type WidgetType =
    | 'tickets-count'
    | 'tickets-chart'
    | 'recent-tickets'
    | 'department-stats'
    | 'status-distribution'
    | 'response-time'
    | 'employee-performance'
    | 'notifications'
    | 'calendar'
    | 'quick-actions'
    | 'sla-status'
    | 'custom';

export interface DashboardLayout {
    id: string;
    name: string;
    widgets: DashboardWidget[];
    columns: number;
    createdAt: number;
    isDefault: boolean;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
    { id: 'w1', type: 'tickets-count', title: 'إحصائيات الشكاوى', size: 'medium', position: { x: 0, y: 0 }, visible: true },
    { id: 'w2', type: 'status-distribution', title: 'توزيع الحالات', size: 'medium', position: { x: 1, y: 0 }, visible: true },
    { id: 'w3', type: 'recent-tickets', title: 'أحدث الشكاوى', size: 'large', position: { x: 0, y: 1 }, visible: true },
    { id: 'w4', type: 'department-stats', title: 'إحصائيات الأقسام', size: 'medium', position: { x: 2, y: 0 }, visible: true },
    { id: 'w5', type: 'quick-actions', title: 'إجراءات سريعة', size: 'small', position: { x: 2, y: 1 }, visible: true },
    { id: 'w6', type: 'sla-status', title: 'حالة SLA', size: 'medium', position: { x: 0, y: 2 }, visible: true },
    { id: 'w7', type: 'notifications', title: 'الإشعارات', size: 'small', position: { x: 1, y: 2 }, visible: true },
    { id: 'w8', type: 'response-time', title: 'متوسط وقت الاستجابة', size: 'small', position: { x: 2, y: 2 }, visible: true },
];

const STORAGE_KEY = 'dashboard-layouts';

/**
 * حفظ تخطيطات لوحة التحكم
 */
export function saveLayouts(layouts: DashboardLayout[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    } catch { }
}

/**
 * تحميل تخطيطات لوحة التحكم
 */
export function loadLayouts(): DashboardLayout[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch { }

    // Default layout
    return [{
        id: 'default',
        name: 'التخطيط الافتراضي',
        widgets: DEFAULT_WIDGETS,
        columns: 3,
        createdAt: Date.now(),
        isDefault: true
    }];
}

/**
 * إنشاء تخطيط جديد
 */
export function createLayout(name: string, widgets?: DashboardWidget[]): DashboardLayout {
    return {
        id: `layout-${Date.now()}`,
        name,
        widgets: widgets || [...DEFAULT_WIDGETS],
        columns: 3,
        createdAt: Date.now(),
        isDefault: false
    };
}

/**
 * أحجام الـ widgets بالـ CSS
 */
export const WIDGET_SIZES: Record<DashboardWidget['size'], { cols: number; rows: number }> = {
    small: { cols: 1, rows: 1 },
    medium: { cols: 1, rows: 2 },
    large: { cols: 2, rows: 2 },
    full: { cols: 3, rows: 2 }
};

/**
 * تخطيط الـ widgets في CSS Grid
 */
export function getWidgetStyle(widget: DashboardWidget, columns: number): React.CSSProperties {
    const size = WIDGET_SIZES[widget.size];
    return {
        gridColumn: `span ${Math.min(size.cols, columns)}`,
        gridRow: `span ${size.rows}`,
        minHeight: size.rows * 150 + (size.rows - 1) * 16
    };
}

/**
 * Hook لإدارة لوحة التحكم
 */
export function useDashboard() {
    const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
    const [activeLayoutId, setActiveLayoutId] = useState<string>('default');
    const [editMode, setEditMode] = useState(false);

    // Load on mount
    useEffect(() => {
        const saved = loadLayouts();
        setLayouts(saved);
        const activeId = localStorage.getItem('active-dashboard-layout') || 'default';
        setActiveLayoutId(activeId);
    }, []);

    // Save on change
    useEffect(() => {
        if (layouts.length > 0) {
            saveLayouts(layouts);
        }
    }, [layouts]);

    useEffect(() => {
        localStorage.setItem('active-dashboard-layout', activeLayoutId);
    }, [activeLayoutId]);

    const activeLayout = layouts.find(l => l.id === activeLayoutId) || layouts[0];

    const updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
        setLayouts(prev => prev.map(layout => {
            if (layout.id !== activeLayoutId) return layout;
            return {
                ...layout,
                widgets: layout.widgets.map(w =>
                    w.id === widgetId ? { ...w, ...updates } : w
                )
            };
        }));
    }, [activeLayoutId]);

    const toggleWidgetVisibility = useCallback((widgetId: string) => {
        setLayouts(prev => prev.map(layout => {
            if (layout.id !== activeLayoutId) return layout;
            return {
                ...layout,
                widgets: layout.widgets.map(w =>
                    w.id === widgetId ? { ...w, visible: !w.visible } : w
                )
            };
        }));
    }, [activeLayoutId]);

    const moveWidget = useCallback((widgetId: string, newPosition: { x: number; y: number }) => {
        updateWidget(widgetId, { position: newPosition });
    }, [updateWidget]);

    const resizeWidget = useCallback((widgetId: string, newSize: DashboardWidget['size']) => {
        updateWidget(widgetId, { size: newSize });
    }, [updateWidget]);

    const addWidget = useCallback((widget: Omit<DashboardWidget, 'id'>) => {
        const newWidget: DashboardWidget = {
            ...widget,
            id: `widget-${Date.now()}`
        };
        setLayouts(prev => prev.map(layout => {
            if (layout.id !== activeLayoutId) return layout;
            return { ...layout, widgets: [...layout.widgets, newWidget] };
        }));
    }, [activeLayoutId]);

    const removeWidget = useCallback((widgetId: string) => {
        setLayouts(prev => prev.map(layout => {
            if (layout.id !== activeLayoutId) return layout;
            return { ...layout, widgets: layout.widgets.filter(w => w.id !== widgetId) };
        }));
    }, [activeLayoutId]);

    const createNewLayout = useCallback((name: string) => {
        const newLayout = createLayout(name, activeLayout?.widgets);
        setLayouts(prev => [...prev, newLayout]);
        setActiveLayoutId(newLayout.id);
    }, [activeLayout]);

    const deleteLayout = useCallback((layoutId: string) => {
        if (layouts.length <= 1) return;
        setLayouts(prev => prev.filter(l => l.id !== layoutId));
        if (activeLayoutId === layoutId) {
            setActiveLayoutId(layouts[0]?.id || 'default');
        }
    }, [layouts, activeLayoutId]);

    const resetLayout = useCallback(() => {
        setLayouts(prev => prev.map(layout => {
            if (layout.id !== activeLayoutId) return layout;
            return { ...layout, widgets: [...DEFAULT_WIDGETS] };
        }));
    }, [activeLayoutId]);

    const setColumns = useCallback((columns: number) => {
        setLayouts(prev => prev.map(layout => {
            if (layout.id !== activeLayoutId) return layout;
            return { ...layout, columns };
        }));
    }, [activeLayoutId]);

    return {
        layouts,
        activeLayout,
        activeLayoutId,
        setActiveLayoutId,
        editMode,
        setEditMode,
        updateWidget,
        toggleWidgetVisibility,
        moveWidget,
        resizeWidget,
        addWidget,
        removeWidget,
        createNewLayout,
        deleteLayout,
        resetLayout,
        setColumns
    };
}

/**
 * مكون لـ Widget فارغ
 */
export function getWidgetPlaceholder(type: WidgetType): string {
    const placeholders: Record<WidgetType, string> = {
        'tickets-count': '📊 عدد الشكاوى',
        'tickets-chart': '📈 رسم بياني',
        'recent-tickets': '🎫 أحدث الشكاوى',
        'department-stats': '🏢 إحصائيات الأقسام',
        'status-distribution': '🔄 توزيع الحالات',
        'response-time': '⏱️ وقت الاستجابة',
        'employee-performance': '👤 أداء الموظفين',
        'notifications': '🔔 الإشعارات',
        'calendar': '📅 التقويم',
        'quick-actions': '⚡ إجراءات سريعة',
        'sla-status': '📋 حالة SLA',
        'custom': '🔧 مخصص'
    };
    return placeholders[type];
}

/**
 * الحصول على أيقونة Widget
 */
export function getWidgetIcon(type: WidgetType): string {
    const icons: Record<WidgetType, string> = {
        'tickets-count': '📊',
        'tickets-chart': '📈',
        'recent-tickets': '🎫',
        'department-stats': '🏢',
        'status-distribution': '🔄',
        'response-time': '⏱️',
        'employee-performance': '👤',
        'notifications': '🔔',
        'calendar': '📅',
        'quick-actions': '⚡',
        'sla-status': '📋',
        'custom': '🔧'
    };
    return icons[type];
}

/**
 * قائمة الـ widgets المتاحة
 */
export const AVAILABLE_WIDGETS: { type: WidgetType; name: string; description: string }[] = [
    { type: 'tickets-count', name: 'إحصائيات الشكاوى', description: 'عرض إجمالي عدد الشكاوى حسب الحالة' },
    { type: 'tickets-chart', name: 'رسم بياني للشكاوى', description: 'رسم بياني يوضح تطور الشكاوى' },
    { type: 'recent-tickets', name: 'أحدث الشكاوى', description: 'قائمة بآخر الشكاوى المستلمة' },
    { type: 'department-stats', name: 'إحصائيات الأقسام', description: 'توزيع الشكاوى على الأقسام' },
    { type: 'status-distribution', name: 'توزيع الحالات', description: 'رسم دائري لحالات الشكاوى' },
    { type: 'response-time', name: 'وقت الاستجابة', description: 'متوسط وقت الرد على الشكاوى' },
    { type: 'employee-performance', name: 'أداء الموظفين', description: 'إحصائيات أداء كل موظف' },
    { type: 'notifications', name: 'الإشعارات', description: 'آخر الإشعارات والتنبيهات' },
    { type: 'calendar', name: 'التقويم', description: 'تقويم المواعيد والمهام' },
    { type: 'quick-actions', name: 'إجراءات سريعة', description: 'أزرار للإجراءات الشائعة' },
    { type: 'sla-status', name: 'حالة SLA', description: 'مؤشرات اتفاقية مستوى الخدمة' },
    { type: 'custom', name: 'مخصص', description: 'widget مخصص' }
];

export default useDashboard;
