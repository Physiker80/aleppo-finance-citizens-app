import React, { useState, useRef, useCallback } from 'react';

// ===== معالج خطوة بخطوة (Wizard) =====
interface WizardStep {
    id: string;
    title: string;
    icon?: string;
    component: React.ReactNode;
    validate?: () => boolean;
}

export const StepWizard: React.FC<{
    steps: WizardStep[];
    onComplete: () => void;
    onCancel?: () => void;
}> = ({ steps, onComplete, onCancel }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

    const goNext = () => {
        const step = steps[currentStep];
        if (step.validate && !step.validate()) return;

        setCompletedSteps(prev => new Set([...prev, currentStep]));

        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const goPrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const goToStep = (index: number) => {
        if (index <= currentStep || completedSteps.has(index - 1)) {
            setCurrentStep(index);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* شريط الخطوات */}
            <div className="bg-gradient-to-r from-[#0f3c35] to-emerald-600 p-4">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className="flex items-center cursor-pointer"
                            onClick={() => goToStep(index)}
                        >
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${index < currentStep || completedSteps.has(index)
                                    ? 'bg-white text-[#0f3c35] border-white'
                                    : index === currentStep
                                        ? 'bg-white/20 text-white border-white'
                                        : 'bg-transparent text-white/50 border-white/30'
                                }`}>
                                {completedSteps.has(index) ? '✓' : step.icon || (index + 1)}
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`w-16 h-0.5 mx-2 ${completedSteps.has(index) ? 'bg-white' : 'bg-white/30'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>
                <div className="text-center mt-3">
                    <h3 className="text-xl font-bold text-white">{steps[currentStep].title}</h3>
                    <p className="text-white/70 text-sm">الخطوة {currentStep + 1} من {steps.length}</p>
                </div>
            </div>

            {/* محتوى الخطوة */}
            <div className="p-6 min-h-[300px] animate-fadeIn">
                {steps[currentStep].component}
            </div>

            {/* أزرار التنقل */}
            <div className="flex items-center justify-between p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                            إلغاء
                        </button>
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={goPrev}
                        disabled={currentStep === 0}
                        className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        السابق
                    </button>
                    <button
                        onClick={goNext}
                        className="px-6 py-2 bg-[#0f3c35] text-white rounded-lg hover:bg-[#0c302a] transition-colors flex items-center gap-2"
                    >
                        {currentStep === steps.length - 1 ? 'إرسال ✓' : 'التالي ←'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===== السحب والإفلات للملفات =====
export const DragDropZone: React.FC<{
    onFilesAdded: (files: File[]) => void;
    accept?: string;
    maxFiles?: number;
    maxSize?: number;
    children?: React.ReactNode;
}> = ({ onFilesAdded, accept, maxFiles = 5, maxSize = 10 * 1024 * 1024, children }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragIn = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragOut = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const validateAndAddFiles = useCallback((files: FileList | null) => {
        if (!files) return;

        const validFiles: File[] = [];
        setError(null);

        Array.from(files).forEach(file => {
            if (validFiles.length >= maxFiles) {
                setError(`الحد الأقصى ${maxFiles} ملفات`);
                return;
            }
            if (file.size > maxSize) {
                setError(`الملف ${file.name} أكبر من الحد المسموح`);
                return;
            }
            validFiles.push(file);
        });

        if (validFiles.length > 0) {
            onFilesAdded(validFiles);
        }
    }, [maxFiles, maxSize, onFilesAdded]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        validateAndAddFiles(e.dataTransfer.files);
    }, [validateAndAddFiles]);

    return (
        <div
            onClick={() => inputRef.current?.click()}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
        >
            <input
                ref={inputRef}
                type="file"
                multiple
                accept={accept}
                onChange={e => validateAndAddFiles(e.target.files)}
                className="hidden"
            />

            {children || (
                <div className="space-y-3">
                    <div className={`text-5xl transition-transform ${isDragging ? 'scale-110' : ''}`}>
                        {isDragging ? '📥' : '📁'}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-blue-600 dark:text-blue-400">انقر للاختيار</span>
                        {' '}أو اسحب الملفات هنا
                    </div>
                    <div className="text-xs text-gray-500">
                        الحد الأقصى: {maxFiles} ملفات، {Math.round(maxSize / 1024 / 1024)}MB لكل ملف
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-3 text-red-500 text-sm">⚠️ {error}</div>
            )}
        </div>
    );
};

// ===== معاينة الملفات المرفقة =====
export const FilePreviewList: React.FC<{
    files: File[];
    onRemove: (index: number) => void;
}> = ({ files, onRemove }) => {
    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return '🖼️';
        if (type.startsWith('video/')) return '🎬';
        if (type.includes('pdf')) return '📕';
        if (type.includes('word') || type.includes('document')) return '📄';
        if (type.includes('excel') || type.includes('sheet')) return '📊';
        return '📎';
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    };

    if (files.length === 0) return null;

    return (
        <div className="space-y-2 mt-4">
            {files.map((file, index) => (
                <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors animate-fadeInUp"
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <span className="text-2xl">{getFileIcon(file.type)}</span>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 dark:text-white truncate">
                            {file.name}
                        </div>
                        <div className="text-xs text-gray-500">{formatSize(file.size)}</div>
                    </div>
                    <button
                        onClick={() => onRemove(index)}
                        className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        🗑️
                    </button>
                </div>
            ))}
        </div>
    );
};

// ===== مكون اختيار اللون =====
export const ColorPicker: React.FC<{
    value: string;
    onChange: (color: string) => void;
    presets?: string[];
}> = ({ value, onChange, presets }) => {
    const defaultPresets = [
        '#0f3c35', '#1e3a8a', '#7c3aed', '#dc2626',
        '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
        '#6366f1', '#db2777', '#4f46e5', '#059669'
    ];

    const colors = presets || defaultPresets;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {colors.map(color => (
                    <button
                        key={color}
                        onClick={() => onChange(color)}
                        className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${value === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                            }`}
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="#000000"
                    className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                />
            </div>
        </div>
    );
};

// ===== شريط التقدم المتعدد =====
export const MultiProgressBar: React.FC<{
    segments: Array<{
        value: number;
        color: string;
        label?: string;
    }>;
    height?: number;
    showLabels?: boolean;
}> = ({ segments, height = 8, showLabels = true }) => {
    const total = segments.reduce((sum, s) => sum + s.value, 0);

    return (
        <div>
            <div
                className="flex rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700"
                style={{ height }}
            >
                {segments.map((segment, i) => (
                    <div
                        key={i}
                        className="transition-all duration-500"
                        style={{
                            width: `${(segment.value / total) * 100}%`,
                            backgroundColor: segment.color,
                        }}
                    />
                ))}
            </div>
            {showLabels && (
                <div className="flex flex-wrap gap-3 mt-2">
                    {segments.map((segment, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: segment.color }}
                            />
                            <span className="text-gray-600 dark:text-gray-400">
                                {segment.label || `قسم ${i + 1}`}: {segment.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ===== مفتاح التبديل المحسن =====
export const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg';
}> = ({ checked, onChange, label, description, size = 'md' }) => {
    const sizes = {
        sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
        md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
        lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' },
    };

    const s = sizes[size];

    return (
        <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                    className="sr-only"
                />
                <div className={`${s.track} rounded-full transition-colors ${checked ? 'bg-[#0f3c35]' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                <div className={`absolute top-0.5 left-0.5 ${s.thumb} bg-white rounded-full shadow-md transition-transform ${checked ? s.translate : 'translate-x-0'
                    }`} />
            </div>
            {(label || description) && (
                <div>
                    {label && <div className="font-medium text-gray-800 dark:text-white">{label}</div>}
                    {description && <div className="text-xs text-gray-500">{description}</div>}
                </div>
            )}
        </label>
    );
};

export default {
    StepWizard,
    DragDropZone,
    FilePreviewList,
    ColorPicker,
    MultiProgressBar,
    ToggleSwitch,
};
