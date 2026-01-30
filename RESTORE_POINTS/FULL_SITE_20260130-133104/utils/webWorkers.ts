// =====================================================
// ⚡ Web Workers Manager
// مدير Web Workers
// =====================================================

export interface WorkerTask<T = unknown, R = unknown> {
    id: string;
    type: string;
    data: T;
    priority: 'high' | 'normal' | 'low';
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: R;
    error?: string;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
}

export interface WorkerStats {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageTime: number;
    activeWorkers: number;
}

type TaskHandler<T, R> = (data: T) => R | Promise<R>;

// خريطة المعالجات
const handlers = new Map<string, TaskHandler<unknown, unknown>>();

// قائمة المهام
const taskQueue: WorkerTask[] = [];

// Workers النشطة
const activeWorkers = new Map<string, Worker>();

// الإحصائيات
let stats: WorkerStats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageTime: 0,
    activeWorkers: 0
};

// عدد Workers المسموح
const MAX_WORKERS = navigator.hardwareConcurrency || 4;

/**
 * تسجيل معالج مهمة
 */
export function registerHandler<T, R>(
    type: string,
    handler: TaskHandler<T, R>
): void {
    handlers.set(type, handler as TaskHandler<unknown, unknown>);
}

/**
 * إنشاء مهمة جديدة
 */
export function createTask<T, R>(
    type: string,
    data: T,
    priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<R> {
    return new Promise((resolve, reject) => {
        const task: WorkerTask<T, R> = {
            id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type,
            data,
            priority,
            status: 'pending',
            createdAt: Date.now()
        };

        // إضافة للقائمة حسب الأولوية
        if (priority === 'high') {
            taskQueue.unshift(task);
        } else if (priority === 'low') {
            taskQueue.push(task);
        } else {
            const highCount = taskQueue.filter(t => t.priority === 'high').length;
            taskQueue.splice(highCount, 0, task);
        }

        stats.totalTasks++;

        // محاولة تنفيذ المهمة
        processQueue()
            .then(() => {
                const completed = taskQueue.find(t => t.id === task.id);
                if (completed?.status === 'completed') {
                    resolve(completed.result as R);
                } else if (completed?.status === 'failed') {
                    reject(new Error(completed.error || 'فشلت المهمة'));
                }
            })
            .catch(reject);
    });
}

/**
 * معالجة قائمة المهام
 */
async function processQueue(): Promise<void> {
    const pendingTasks = taskQueue.filter(t => t.status === 'pending');

    for (const task of pendingTasks) {
        if (activeWorkers.size >= MAX_WORKERS) {
            await waitForWorker();
        }

        executeTask(task);
    }
}

/**
 * انتظار worker فارغ
 */
function waitForWorker(): Promise<void> {
    return new Promise(resolve => {
        const check = () => {
            if (activeWorkers.size < MAX_WORKERS) {
                resolve();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

/**
 * تنفيذ مهمة
 */
async function executeTask(task: WorkerTask): Promise<void> {
    task.status = 'running';
    task.startedAt = Date.now();

    const handler = handlers.get(task.type);

    if (!handler) {
        task.status = 'failed';
        task.error = `لا يوجد معالج للنوع: ${task.type}`;
        stats.failedTasks++;
        return;
    }

    try {
        // محاولة استخدام Worker إذا كان متاحاً
        if (typeof Worker !== 'undefined' && canUseWorker(task.type)) {
            task.result = await executeInWorker(task);
        } else {
            // تنفيذ في الخيط الرئيسي
            task.result = await handler(task.data);
        }

        task.status = 'completed';
        task.completedAt = Date.now();
        stats.completedTasks++;

        // تحديث متوسط الوقت
        const time = task.completedAt - (task.startedAt || task.createdAt);
        stats.averageTime = (stats.averageTime * (stats.completedTasks - 1) + time) / stats.completedTasks;

    } catch (error) {
        task.status = 'failed';
        task.error = String(error);
        stats.failedTasks++;
    }
}

/**
 * التحقق من إمكانية استخدام Worker
 */
function canUseWorker(type: string): boolean {
    // قائمة المهام التي تدعم Workers
    const workerTypes = [
        'data-processing',
        'text-analysis',
        'sorting',
        'filtering',
        'calculation',
        'encryption',
        'compression'
    ];

    return workerTypes.includes(type);
}

/**
 * تنفيذ في Worker
 */
async function executeInWorker(task: WorkerTask): Promise<unknown> {
    return new Promise((resolve, reject) => {
        // إنشاء Worker من Blob
        const workerCode = `
      self.onmessage = async function(e) {
        const { type, data, handlerCode } = e.data;
        
        try {
          // تنفيذ المعالج
          const handler = new Function('data', handlerCode);
          const result = await handler(data);
          self.postMessage({ success: true, result });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };
    `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));

        activeWorkers.set(task.id, worker);
        stats.activeWorkers = activeWorkers.size;

        worker.onmessage = (e) => {
            activeWorkers.delete(task.id);
            stats.activeWorkers = activeWorkers.size;
            worker.terminate();

            if (e.data.success) {
                resolve(e.data.result);
            } else {
                reject(new Error(e.data.error));
            }
        };

        worker.onerror = (error) => {
            activeWorkers.delete(task.id);
            stats.activeWorkers = activeWorkers.size;
            worker.terminate();
            reject(error);
        };

        const handler = handlers.get(task.type);
        const handlerCode = handler?.toString() || '';

        worker.postMessage({
            type: task.type,
            data: task.data,
            handlerCode
        });
    });
}

/**
 * إلغاء مهمة
 */
export function cancelTask(taskId: string): boolean {
    const taskIndex = taskQueue.findIndex(t => t.id === taskId);

    if (taskIndex === -1) return false;

    const task = taskQueue[taskIndex];

    if (task.status === 'pending') {
        taskQueue.splice(taskIndex, 1);
        return true;
    }

    if (task.status === 'running') {
        const worker = activeWorkers.get(taskId);
        if (worker) {
            worker.terminate();
            activeWorkers.delete(taskId);
            stats.activeWorkers = activeWorkers.size;
        }
        task.status = 'failed';
        task.error = 'تم إلغاء المهمة';
        return true;
    }

    return false;
}

/**
 * الحصول على الإحصائيات
 */
export function getStats(): WorkerStats {
    return { ...stats };
}

/**
 * تنظيف المهام المكتملة
 */
export function clearCompletedTasks(): void {
    const remaining = taskQueue.filter(t =>
        t.status === 'pending' || t.status === 'running'
    );
    taskQueue.length = 0;
    taskQueue.push(...remaining);
}

/**
 * إعادة تعيين الإحصائيات
 */
export function resetStats(): void {
    stats = {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageTime: 0,
        activeWorkers: activeWorkers.size
    };
}

// ===== معالجات مدمجة =====

/**
 * معالج فرز البيانات
 */
registerHandler<{ data: unknown[]; key: string; order: 'asc' | 'desc' }, unknown[]>(
    'sorting',
    ({ data, key, order }) => {
        return [...data].sort((a, b) => {
            const aVal = (a as Record<string, unknown>)[key];
            const bVal = (b as Record<string, unknown>)[key];

            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }
);

/**
 * معالج تصفية البيانات
 */
registerHandler<{ data: unknown[]; filters: Record<string, unknown> }, unknown[]>(
    'filtering',
    ({ data, filters }) => {
        return data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                const itemValue = (item as Record<string, unknown>)[key];

                if (typeof value === 'string') {
                    return String(itemValue).toLowerCase().includes(value.toLowerCase());
                }

                return itemValue === value;
            });
        });
    }
);

/**
 * معالج تحليل النص
 */
registerHandler<{ text: string }, { wordCount: number; charCount: number; sentences: number }>(
    'text-analysis',
    ({ text }) => {
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        const sentences = text.split(/[.!?؟]+/).filter(s => s.trim().length > 0);

        return {
            wordCount: words.length,
            charCount: text.length,
            sentences: sentences.length
        };
    }
);

/**
 * معالج العمليات الحسابية
 */
registerHandler<{ numbers: number[]; operation: 'sum' | 'avg' | 'min' | 'max' }, number>(
    'calculation',
    ({ numbers, operation }) => {
        if (numbers.length === 0) return 0;

        switch (operation) {
            case 'sum':
                return numbers.reduce((a, b) => a + b, 0);
            case 'avg':
                return numbers.reduce((a, b) => a + b, 0) / numbers.length;
            case 'min':
                return Math.min(...numbers);
            case 'max':
                return Math.max(...numbers);
            default:
                return 0;
        }
    }
);

/**
 * معالج ضغط البيانات
 */
registerHandler<{ data: string }, string>(
    'compression',
    ({ data }) => {
        // خوارزمية ضغط بسيطة (RLE)
        let compressed = '';
        let count = 1;

        for (let i = 0; i < data.length; i++) {
            if (data[i] === data[i + 1]) {
                count++;
            } else {
                compressed += count > 1 ? `${count}${data[i]}` : data[i];
                count = 1;
            }
        }

        return compressed;
    }
);

/**
 * تشغيل مهمة في الخلفية
 */
export function runInBackground<T, R>(
    handler: (data: T) => R | Promise<R>,
    data: T
): Promise<R> {
    const type = `dynamic-${Date.now()}`;
    registerHandler(type, handler as TaskHandler<unknown, unknown>);
    return createTask<T, R>(type, data);
}

/**
 * معالجة مجموعة بيانات في الخلفية
 */
export async function processBatch<T, R>(
    items: T[],
    processor: (item: T) => R | Promise<R>,
    batchSize: number = 100
): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(item => runInBackground(processor, item))
        );
        results.push(...batchResults);
    }

    return results;
}

/**
 * Debounced Worker Task
 */
export function createDebouncedTask<T, R>(
    type: string,
    delay: number = 300
): (data: T) => Promise<R> {
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingResolve: ((value: R) => void) | null = null;
    let pendingReject: ((error: Error) => void) | null = null;

    return (data: T): Promise<R> => {
        return new Promise((resolve, reject) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            pendingResolve = resolve;
            pendingReject = reject;

            timeoutId = setTimeout(async () => {
                try {
                    const result = await createTask<T, R>(type, data);
                    pendingResolve?.(result);
                } catch (error) {
                    pendingReject?.(error as Error);
                }
            }, delay);
        });
    };
}

export default {
    registerHandler,
    createTask,
    cancelTask,
    getStats,
    clearCompletedTasks,
    resetStats,
    runInBackground,
    processBatch,
    createDebouncedTask
};
