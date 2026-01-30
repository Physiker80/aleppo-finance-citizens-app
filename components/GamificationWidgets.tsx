import React, { useState, useEffect } from 'react';

// ===== تتبع مرئي للشكوى (Timeline) =====
interface TimelineStep {
    id: string;
    title: string;
    description?: string;
    date?: Date | string;
    status: 'completed' | 'current' | 'pending';
    icon?: string;
}

export const TicketTimeline: React.FC<{
    steps: TimelineStep[];
    orientation?: 'vertical' | 'horizontal';
}> = ({ steps, orientation = 'vertical' }) => {
    if (orientation === 'horizontal') {
        return (
            <div className="flex items-center justify-between w-full overflow-x-auto pb-4">
                {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center flex-1 min-w-[120px]">
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${step.status === 'completed' ? 'bg-green-500 text-white' :
                                    step.status === 'current' ? 'bg-blue-500 text-white animate-pulse' :
                                        'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                }`}>
                                {step.status === 'completed' ? '✓' : step.icon || (index + 1)}
                            </div>
                            <div className="mt-2 text-center">
                                <div className={`text-sm font-medium ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-800 dark:text-white'
                                    }`}>
                                    {step.title}
                                </div>
                                {step.date && (
                                    <div className="text-xs text-gray-500">
                                        {typeof step.date === 'string' ? step.date : step.date.toLocaleDateString('ar-SY')}
                                    </div>
                                )}
                            </div>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-1 mx-2 rounded ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                                }`} />
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="relative">
            {steps.map((step, index) => (
                <div key={step.id} className="flex gap-4 pb-8 last:pb-0">
                    {/* الخط العمودي */}
                    <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 transition-all ${step.status === 'completed' ? 'bg-green-500 text-white' :
                                step.status === 'current' ? 'bg-blue-500 text-white animate-pulse shadow-lg shadow-blue-500/50' :
                                    'bg-gray-200 dark:bg-gray-700 text-gray-400'
                            }`}>
                            {step.status === 'completed' ? '✓' : step.icon || (index + 1)}
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`w-0.5 flex-1 mt-2 ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                                }`} />
                        )}
                    </div>

                    {/* المحتوى */}
                    <div className={`flex-1 pb-4 ${step.status === 'pending' ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${step.status === 'current' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white'
                                }`}>
                                {step.title}
                            </h4>
                            {step.status === 'current' && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full">
                                    الحالي
                                </span>
                            )}
                        </div>
                        {step.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                        )}
                        {step.date && (
                            <p className="text-xs text-gray-500 mt-1">
                                {typeof step.date === 'string' ? step.date : step.date.toLocaleDateString('ar-SY-u-nu-latn')}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ===== نظام النقاط والشارات (Gamification) =====
interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    earnedAt?: Date;
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

interface EmployeeStats {
    points: number;
    level: number;
    ticketsSolved: number;
    avgResponseTime: number;
    badges: Badge[];
}

export const PointsDisplay: React.FC<{
    points: number;
    level: number;
    nextLevelPoints: number;
}> = ({ points, level, nextLevelPoints }) => {
    const progress = (points / nextLevelPoints) * 100;

    return (
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-3xl">🏆</span>
                    <div>
                        <div className="text-2xl font-bold">{points.toLocaleString()}</div>
                        <div className="text-xs opacity-80">نقطة</div>
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-sm opacity-80">المستوى</div>
                    <div className="text-3xl font-bold">{level}</div>
                </div>
            </div>
            <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                    className="bg-yellow-400 h-full transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>
            <div className="text-xs mt-1 opacity-80 text-center">
                {nextLevelPoints - points} نقطة للمستوى التالي
            </div>
        </div>
    );
};

export const BadgeCard: React.FC<{ badge: Badge; locked?: boolean }> = ({ badge, locked = false }) => {
    const rarityColors = {
        common: 'from-gray-400 to-gray-500',
        rare: 'from-blue-400 to-blue-600',
        epic: 'from-purple-400 to-purple-600',
        legendary: 'from-yellow-400 to-orange-500',
    };

    return (
        <div className={`relative p-4 rounded-xl text-center transition-all ${locked ? 'grayscale opacity-50' : 'hover:scale-105'
            }`}>
            <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${rarityColors[badge.rarity || 'common']
                } flex items-center justify-center text-3xl shadow-lg ${locked ? '' : 'animate-float'}`}>
                {locked ? '🔒' : badge.icon}
            </div>
            <h4 className="font-medium mt-2 text-gray-800 dark:text-white">{badge.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{badge.description}</p>
            {badge.earnedAt && (
                <p className="text-xs text-green-600 mt-1">
                    🏅 {badge.earnedAt.toLocaleDateString('ar-SY')}
                </p>
            )}
        </div>
    );
};

export const Leaderboard: React.FC<{
    employees: Array<{ name: string; points: number; avatar?: string; rank: number }>;
    currentUserId?: string;
}> = ({ employees, currentUserId }) => {
    const medals = ['🥇', '🥈', '🥉'];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 text-white">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <span>🏆</span> لوحة المتصدرين
                </h3>
            </div>
            <div className="divide-y dark:divide-gray-700">
                {employees.slice(0, 10).map((emp, i) => (
                    <div
                        key={emp.rank}
                        className={`flex items-center gap-3 p-3 ${i < 3 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                            }`}
                    >
                        <div className="w-8 text-center font-bold text-lg">
                            {i < 3 ? medals[i] : `#${emp.rank}`}
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {emp.avatar || emp.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-white">{emp.name}</div>
                        </div>
                        <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                            {emp.points.toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ===== أهداف يومية =====
export const DailyGoals: React.FC<{
    goals: Array<{
        id: string;
        title: string;
        current: number;
        target: number;
        reward: number;
        icon: string;
    }>;
}> = ({ goals }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <span>🎯</span> الأهداف اليومية
            </h3>
            <div className="space-y-4">
                {goals.map(goal => {
                    const progress = Math.min((goal.current / goal.target) * 100, 100);
                    const completed = goal.current >= goal.target;

                    return (
                        <div key={goal.id} className={`p-3 rounded-lg ${completed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-700'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{goal.icon}</span>
                                    <span className={`font-medium ${completed ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {goal.title}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">{goal.current}/{goal.target}</span>
                                    <span className="text-yellow-500 text-sm">+{goal.reward}🪙</span>
                                </div>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${completed ? 'bg-green-500' : 'bg-blue-500'
                                        }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            {completed && (
                                <div className="mt-2 text-center text-green-600 dark:text-green-400 text-sm font-medium">
                                    ✓ تم الإنجاز!
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ===== إحصائيات متحركة =====
export const AnimatedCounter: React.FC<{
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
}> = ({ value, duration = 1000, prefix = '', suffix = '' }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            setDisplayValue(Math.floor(progress * value));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return (
        <span>
            {prefix}{displayValue.toLocaleString()}{suffix}
        </span>
    );
};

// ===== Widget قابل للسحب =====
export const DraggableWidget: React.FC<{
    id: string;
    title: string;
    icon?: string;
    children: React.ReactNode;
    onRemove?: () => void;
    minimized?: boolean;
    onToggleMinimize?: () => void;
}> = ({ id, title, icon, children, onRemove, minimized, onToggleMinimize }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden card-hover">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 cursor-move">
                <div className="flex items-center gap-2">
                    <span className="text-gray-400">⋮⋮</span>
                    {icon && <span className="text-xl">{icon}</span>}
                    <h4 className="font-medium text-gray-800 dark:text-white">{title}</h4>
                </div>
                <div className="flex items-center gap-1">
                    {onToggleMinimize && (
                        <button
                            onClick={onToggleMinimize}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            {minimized ? '▼' : '▲'}
                        </button>
                    )}
                    {onRemove && (
                        <button
                            onClick={onRemove}
                            className="p-1 text-gray-400 hover:text-red-500"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>
            {!minimized && (
                <div className="p-4 animate-fadeIn">
                    {children}
                </div>
            )}
        </div>
    );
};

export default {
    TicketTimeline,
    PointsDisplay,
    BadgeCard,
    Leaderboard,
    DailyGoals,
    AnimatedCounter,
    DraggableWidget,
};
