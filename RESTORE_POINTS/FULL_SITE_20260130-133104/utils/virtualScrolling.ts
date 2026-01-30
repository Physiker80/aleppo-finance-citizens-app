// =====================================================
// 📜 Virtual Scrolling
// التمرير الافتراضي
// =====================================================

export interface VirtualScrollConfig {
    itemHeight: number;
    bufferSize: number;
    containerHeight?: number;
    overscan: number;
}

export interface VirtualItem<T> {
    index: number;
    item: T;
    style: {
        position: 'absolute';
        top: number;
        left: number;
        right: number;
        height: number;
    };
}

export interface VirtualScrollState {
    scrollTop: number;
    viewportHeight: number;
    totalHeight: number;
    startIndex: number;
    endIndex: number;
    visibleItems: number[];
}

const DEFAULT_CONFIG: VirtualScrollConfig = {
    itemHeight: 60,
    bufferSize: 5,
    overscan: 3
};

/**
 * إنشاء Virtual Scroller
 */
export function createVirtualScroller<T>(
    items: T[],
    config: Partial<VirtualScrollConfig> = {}
) {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    let state: VirtualScrollState = {
        scrollTop: 0,
        viewportHeight: cfg.containerHeight || 600,
        totalHeight: items.length * cfg.itemHeight,
        startIndex: 0,
        endIndex: 0,
        visibleItems: []
    };

    const listeners = new Set<(state: VirtualScrollState) => void>();

    /**
     * حساب العناصر المرئية
     */
    function calculateVisibleRange() {
        const start = Math.max(0, Math.floor(state.scrollTop / cfg.itemHeight) - cfg.overscan);
        const visibleCount = Math.ceil(state.viewportHeight / cfg.itemHeight);
        const end = Math.min(items.length - 1, start + visibleCount + cfg.overscan * 2);

        state.startIndex = start;
        state.endIndex = end;
        state.visibleItems = [];

        for (let i = start; i <= end; i++) {
            state.visibleItems.push(i);
        }

        notifyListeners();
    }

    /**
     * إشعار المستمعين
     */
    function notifyListeners() {
        listeners.forEach(listener => listener({ ...state }));
    }

    /**
     * تحديث موضع التمرير
     */
    function setScrollTop(scrollTop: number) {
        state.scrollTop = scrollTop;
        calculateVisibleRange();
    }

    /**
     * تحديث ارتفاع العرض
     */
    function setViewportHeight(height: number) {
        state.viewportHeight = height;
        calculateVisibleRange();
    }

    /**
     * تحديث العناصر
     */
    function setItems(newItems: T[]) {
        items = newItems;
        state.totalHeight = items.length * cfg.itemHeight;
        calculateVisibleRange();
    }

    /**
     * الحصول على العناصر المرئية مع الأنماط
     */
    function getVirtualItems(): VirtualItem<T>[] {
        return state.visibleItems.map(index => ({
            index,
            item: items[index],
            style: {
                position: 'absolute' as const,
                top: index * cfg.itemHeight,
                left: 0,
                right: 0,
                height: cfg.itemHeight
            }
        }));
    }

    /**
     * التمرير إلى عنصر
     */
    function scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start') {
        let scrollTop: number;

        switch (align) {
            case 'center':
                scrollTop = index * cfg.itemHeight - state.viewportHeight / 2 + cfg.itemHeight / 2;
                break;
            case 'end':
                scrollTop = (index + 1) * cfg.itemHeight - state.viewportHeight;
                break;
            default:
                scrollTop = index * cfg.itemHeight;
        }

        return Math.max(0, Math.min(scrollTop, state.totalHeight - state.viewportHeight));
    }

    /**
     * البحث عن عنصر
     */
    function findItemIndex(predicate: (item: T) => boolean): number {
        return items.findIndex(predicate);
    }

    /**
     * الاشتراك في التحديثات
     */
    function subscribe(listener: (state: VirtualScrollState) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    /**
     * الحصول على الحالة
     */
    function getState() {
        return { ...state };
    }

    // التهيئة الأولية
    calculateVisibleRange();

    return {
        setScrollTop,
        setViewportHeight,
        setItems,
        getVirtualItems,
        scrollToIndex,
        findItemIndex,
        subscribe,
        getState,
        getTotalHeight: () => state.totalHeight,
        getItemCount: () => items.length
    };
}

/**
 * Virtual Scroller للجداول
 */
export function createVirtualTableScroller<T>(
    items: T[],
    config: {
        rowHeight: number;
        headerHeight: number;
        containerHeight: number;
    }
) {
    const scroller = createVirtualScroller(items, {
        itemHeight: config.rowHeight,
        containerHeight: config.containerHeight - config.headerHeight
    });

    return {
        ...scroller,
        getHeaderStyle: () => ({
            position: 'sticky' as const,
            top: 0,
            zIndex: 1,
            height: config.headerHeight
        }),
        getBodyStyle: () => ({
            height: scroller.getTotalHeight(),
            position: 'relative' as const
        })
    };
}

/**
 * Virtual Scroller ثنائي الاتجاه
 */
export function createBidirectionalScroller<T>(
    items: T[],
    config: {
        itemWidth: number;
        itemHeight: number;
        containerWidth: number;
        containerHeight: number;
    }
) {
    const columns = Math.floor(config.containerWidth / config.itemWidth);
    const rows = Math.ceil(items.length / columns);

    let state = {
        scrollTop: 0,
        scrollLeft: 0,
        visibleItems: [] as number[]
    };

    function calculateVisible() {
        const startRow = Math.max(0, Math.floor(state.scrollTop / config.itemHeight) - 1);
        const endRow = Math.min(rows, startRow + Math.ceil(config.containerHeight / config.itemHeight) + 2);

        state.visibleItems = [];

        for (let row = startRow; row < endRow; row++) {
            for (let col = 0; col < columns; col++) {
                const index = row * columns + col;
                if (index < items.length) {
                    state.visibleItems.push(index);
                }
            }
        }
    }

    function getGridItems() {
        return state.visibleItems.map(index => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            return {
                index,
                item: items[index],
                style: {
                    position: 'absolute' as const,
                    top: row * config.itemHeight,
                    left: col * config.itemWidth,
                    width: config.itemWidth,
                    height: config.itemHeight
                }
            };
        });
    }

    function setScroll(scrollTop: number, scrollLeft: number) {
        state.scrollTop = scrollTop;
        state.scrollLeft = scrollLeft;
        calculateVisible();
    }

    calculateVisible();

    return {
        getGridItems,
        setScroll,
        getTotalHeight: () => rows * config.itemHeight,
        getTotalWidth: () => columns * config.itemWidth
    };
}

/**
 * Infinite Scroll Manager
 */
export function createInfiniteScroller<T>(
    config: {
        itemHeight: number;
        containerHeight: number;
        loadMoreThreshold: number;
        pageSize: number;
    }
) {
    let items: T[] = [];
    let isLoading = false;
    let hasMore = true;
    let currentPage = 0;

    const scroller = createVirtualScroller<T>(items, {
        itemHeight: config.itemHeight,
        containerHeight: config.containerHeight
    });

    const loadListeners = new Set<() => Promise<T[]>>();

    function onLoadMore(loader: () => Promise<T[]>) {
        loadListeners.add(loader);
        return () => loadListeners.delete(loader);
    }

    async function checkAndLoad(scrollTop: number) {
        if (isLoading || !hasMore) return;

        const totalHeight = items.length * config.itemHeight;
        const scrolledDistance = scrollTop + config.containerHeight;
        const threshold = totalHeight - config.loadMoreThreshold;

        if (scrolledDistance >= threshold) {
            isLoading = true;

            try {
                for (const loader of loadListeners) {
                    const newItems = await loader();

                    if (newItems.length < config.pageSize) {
                        hasMore = false;
                    }

                    items = [...items, ...newItems];
                    currentPage++;
                    scroller.setItems(items);
                }
            } finally {
                isLoading = false;
            }
        }
    }

    function reset() {
        items = [];
        isLoading = false;
        hasMore = true;
        currentPage = 0;
        scroller.setItems([]);
    }

    function setInitialItems(initialItems: T[]) {
        items = initialItems;
        scroller.setItems(items);
    }

    return {
        ...scroller,
        onLoadMore,
        checkAndLoad,
        reset,
        setInitialItems,
        isLoading: () => isLoading,
        hasMore: () => hasMore,
        getCurrentPage: () => currentPage
    };
}

/**
 * مكونات الأنماط المساعدة
 */
export const virtualScrollStyles = {
    container: {
        overflow: 'auto' as const,
        position: 'relative' as const
    },
    content: (height: number) => ({
        height,
        position: 'relative' as const
    }),
    item: (top: number, height: number) => ({
        position: 'absolute' as const,
        top,
        left: 0,
        right: 0,
        height
    })
};

/**
 * حساب الارتفاع الديناميكي
 */
export function createDynamicHeightScroller<T>(
    items: T[],
    measureItem: (item: T, index: number) => number,
    config: { containerHeight: number; overscan: number }
) {
    // حساب الارتفاعات والمواضع
    const heights: number[] = [];
    const positions: number[] = [];
    let totalHeight = 0;

    items.forEach((item, index) => {
        const height = measureItem(item, index);
        heights.push(height);
        positions.push(totalHeight);
        totalHeight += height;
    });

    function getVisibleRange(scrollTop: number) {
        // البحث الثنائي للعثور على العنصر الأول المرئي
        let start = 0;
        let end = positions.length - 1;

        while (start < end) {
            const mid = Math.floor((start + end) / 2);
            if (positions[mid] < scrollTop) {
                start = mid + 1;
            } else {
                end = mid;
            }
        }

        const startIndex = Math.max(0, start - config.overscan);

        // إيجاد العنصر الأخير المرئي
        let endIndex = startIndex;
        let currentPosition = positions[startIndex];
        const viewportEnd = scrollTop + config.containerHeight;

        while (endIndex < items.length && currentPosition < viewportEnd + config.overscan * 50) {
            currentPosition += heights[endIndex];
            endIndex++;
        }

        return { startIndex, endIndex: Math.min(endIndex, items.length - 1) };
    }

    function getVirtualItems(scrollTop: number) {
        const { startIndex, endIndex } = getVisibleRange(scrollTop);
        const virtualItems: VirtualItem<T>[] = [];

        for (let i = startIndex; i <= endIndex; i++) {
            virtualItems.push({
                index: i,
                item: items[i],
                style: {
                    position: 'absolute' as const,
                    top: positions[i],
                    left: 0,
                    right: 0,
                    height: heights[i]
                }
            });
        }

        return virtualItems;
    }

    return {
        getVirtualItems,
        getTotalHeight: () => totalHeight,
        getItemPosition: (index: number) => positions[index],
        getItemHeight: (index: number) => heights[index]
    };
}

export default {
    createVirtualScroller,
    createVirtualTableScroller,
    createBidirectionalScroller,
    createInfiniteScroller,
    createDynamicHeightScroller,
    virtualScrollStyles
};
