import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Info, Filter, CheckCircle2, XCircle } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

// Helper to detect dark mode
const useIsDarkMode = (): boolean => {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const checkDarkMode = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };
    
    // Initial check
    checkDarkMode();
    
    // Listen for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  return isDark;
};

// Types
interface StepMeta {
  title: string;
  description: string;
  details?: string[];
  icon?: React.ReactNode;
  color?: string;
  dependencies?: string[];
  category?: string;
}

interface WorkflowEdge extends Edge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  label?: string;
}

interface WorkflowNode extends Node {
  id: string;
  position: { x: number; y: number };
  data: { label: string; category?: string };
  style?: React.CSSProperties;
  className?: string;
}

// Node metadata map
const detailsMap: Record<string, StepMeta> = {
  entry: {
    title: 'دخول المواطن للنظام',
    description: 'زيارة صفحة تقديم الطلب عبر الموقع أو التطبيق',
    details: [
      'اختيار نوع الطلب (استعلام / شكوى)',
      'عرض الشروط والتعليمات',
      'متابعة إلى نموذج الإدخال'
    ],
    color: '#0ea5e9'
  },
  form: {
    title: 'ملء نموذج الطلب',
    description: 'إدخال البيانات الأساسية ومرفقات الحالة',
    details: [
      'البيانات الشخصية (الاسم، الرقم الوطني إذا توفر)',
      'تفاصيل الطلب / الحالة',
      'تحميل المستندات الداعمة (اختياري)',
      'الموافقة على إقرار صحة البيانات'
    ],
    color: '#2563eb'
  },
  validation: {
    title: 'التحقق الأولي',
    description: 'التدقيق على الحقول المطلوبة وصحة الصيغ',
    details: [
      'التحقق من الحقول الفارغة',
      'تنسيق البريد الإلكتروني',
      'امتدادات وأحجام الملفات',
      'مكافحة الإدخال الضار'
    ],
    color: '#6366f1'
  },
  idgeneration: {
    title: 'توليد رقم التتبع',
    description: 'توليد معرف فريد للطلب (Ticket ID)',
    details: [
      'تسلسل رقمي يعتمد على التاريخ',
      'التأكد من عدم التكرار',
      'تهيئة سجل التاريخ'
    ],
    color: '#7c3aed'
  },
  persistence: {
    title: 'حفظ البيانات',
    description: 'تخزين الطلب في وحدة التخزين المحلية (localStorage)',
    details: [
      'تهيئة الحقول الزمنية',
      'تهيئة الحالة = جديد',
      'إنشاء إشعار للقسم المختص'
    ],
    color: '#9333ea'
  },
  departmentRouting: {
    title: 'توجيه الطلب للقسم',
    description: 'تحديد القسم المسؤول بناءً على نوع الطلب',
    details: [
      'مطابقة نوع الطلب مع القسم',
      'إضافة القسم إلى قائمة المتابعة',
      'توليد إشعار داخلي'
    ],
    color: '#c026d3'
  },
  notification: {
    title: 'الإشعارات',
    description: 'إعلام الأقسام المختصة بوجود طلب جديد',
    details: [
      'توليد عنصر في قائمة notifications',
      'ظهور شارة في الواجهة للموظف',
      'تحديث فوري للحالات'
    ],
    color: '#db2777'
  },
  employeeDashboard: {
    title: 'استعراض الطلبات للموظف',
    description: 'عرض قائمة الطلبات حسب الصلاحيات',
    details: [
      'فلترة حسب القسم',
      'تمييز الحالات الجديدة',
      'دعم البحث والتصفية'
    ],
    color: '#e11d48'
  },
  statusUpdate: {
    title: 'تحديث الحالة',
    description: 'إدارة دورة حياة الطلب (قيد المعالجة، مجاب...)',
    details: [
      'الانتقال من جديد → قيد المعالجة',
      'إضافة الرد والمرفقات',
      'إغلاق الطلب بعد الرد'
    ],
    color: '#f43f5e'
  },
  citizenTracking: {
    title: 'متابعة المواطن',
    description: 'المواطن يتابع حالة الطلب برقم التتبع',
    details: [
      'إدخال رقم التتبع في صفحة التتبع',
      'عرض آخر حالة مُسجلة',
      'عرض تفاصيل الرد عند توفره'
    ],
    color: '#f97316'
  },
  feedback: {
    title: 'التغذية الراجعة',
    description: 'استبيان رضا المواطن بعد إغلاق الطلب',
    details: [
      'تقييم التجربة',
      'التوصية بالخدمة',
      'تعليقات إضافية'
    ],
    color: '#f59e0b'
  },
  analytics: {
    title: 'التحليلات والتقارير',
    description: 'استخراج مؤشرات الأداء من الطلبات',
    details: [
      'معدل زمن الاستجابة',
      'نسب إغلاق الطلبات',
      'مؤشر الرضا'
    ],
    color: '#eab308'
  },
  continuousImprovement: {
    title: 'التحسين المستمر',
    description: 'تحسين الإجراءات بناء على التحليلات',
    details: [
      'تحديد الاختناقات',
      'اقتراح تحسينات',
      'قياس أثر التغييرات'
    ],
    color: '#84cc16'
  }
};

// Layout nodes
const allNodes: WorkflowNode[] = [
  { id: 'entry', position: { x: 0, y: 0 }, data: { label: 'دخول المواطن', category: 'citizen' } },
  { id: 'form', position: { x: -250, y: 150 }, data: { label: 'نموذج الطلب', category: 'citizen' } },
  { id: 'validation', position: { x: 250, y: 150 }, data: { label: 'التحقق الأولي', category: 'internal' } },
  { id: 'idgeneration', position: { x: -400, y: 300 }, data: { label: 'توليد المعرف', category: 'internal' } },
  { id: 'persistence', position: { x: -100, y: 300 }, data: { label: 'تخزين البيانات', category: 'internal' } },
  { id: 'departmentRouting', position: { x: 200, y: 300 }, data: { label: 'توجيه القسم', category: 'internal' } },
  { id: 'notification', position: { x: 450, y: 300 }, data: { label: 'الإشعار الداخلي', category: 'internal' } },
  { id: 'employeeDashboard', position: { x: -300, y: 450 }, data: { label: 'لوحة الموظف', category: 'internal' } },
  { id: 'statusUpdate', position: { x: 50, y: 450 }, data: { label: 'تحديث الحالة', category: 'internal' } },
  { id: 'citizenTracking', position: { x: 350, y: 450 }, data: { label: 'تتبع المواطن', category: 'citizen' } },
  { id: 'feedback', position: { x: 0, y: 600 }, data: { label: 'استبيان الرضا', category: 'citizen' } },
  { id: 'analytics', position: { x: 300, y: 600 }, data: { label: 'التحليلات', category: 'internal' } },
  { id: 'continuousImprovement', position: { x: 0, y: 750 }, data: { label: 'التحسين المستمر', category: 'internal' } }
];

// Edges
const allEdges: WorkflowEdge[] = [
  { id: 'e1', source: 'entry', target: 'form', animated: true },
  { id: 'e2', source: 'entry', target: 'validation', animated: true },
  { id: 'e3', source: 'form', target: 'idgeneration' },
  { id: 'e4', source: 'form', target: 'persistence' },
  { id: 'e5', source: 'validation', target: 'persistence' },
  { id: 'e6', source: 'persistence', target: 'departmentRouting' },
  { id: 'e7', source: 'departmentRouting', target: 'notification' },
  { id: 'e8', source: 'notification', target: 'employeeDashboard' },
  { id: 'e9', source: 'employeeDashboard', target: 'statusUpdate' },
  { id: 'e10', source: 'statusUpdate', target: 'citizenTracking' },
  { id: 'e11', source: 'statusUpdate', target: 'feedback' },
  { id: 'e12', source: 'feedback', target: 'analytics' },
  { id: 'e13', source: 'analytics', target: 'continuousImprovement' },
  { id: 'e14', source: 'continuousImprovement', target: 'entry' }
];

// Self-tests to verify map consistency
function runSelfTests(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set(allNodes.map(n => n.id));

  // 1. Ensure each detailsMap key has a node
  Object.keys(detailsMap).forEach(key => {
    if (!nodeIds.has(key)) errors.push(`لا يوجد عنصر (node) يقابل المفتاح: ${key}`);
  });

  // 2. Ensure each node has details entry
  allNodes.forEach(n => {
    if (!detailsMap[n.id]) errors.push(`العنصر ${n.id} ينقصه وصف في detailsMap`);
  });

  // 3. Basic connectivity check (no isolated nodes)
  const edgeRefs = new Set<string>();
  allEdges.forEach(e => { edgeRefs.add(e.source); edgeRefs.add(e.target); });
  allNodes.forEach(n => { if (!edgeRefs.has(n.id)) errors.push(`العنصر ${n.id} غير متصل بأي حواف`); });

  return { ok: errors.length === 0, errors };
}

// Right side panel with details
const StepDetails: React.FC<{ activeId: string | null; onClose: () => void; }>
 = ({ activeId, onClose }) => {
  if (!activeId) return null;
  const meta = detailsMap[activeId];
  if (!meta) return null;
  return (
    <div className="absolute top-2 left-2 w-80 max-h-[90%] overflow-auto rounded-xl bg-white/95 dark:bg-gray-900/95 shadow-2xl border border-gray-200 dark:border-gray-700 p-4 backdrop-blur z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{meta.title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition" aria-label="إغلاق">✕</button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">{meta.description}</p>
      {meta.details && (
        <ul className="list-disc pr-5 space-y-1 text-sm">
          {meta.details.map((d, i) => (
            <li key={i} className="text-gray-700 dark:text-gray-300 leading-snug">{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

const InteractiveFlowchart: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'citizen' | 'internal'>('all');
  const [testResult, setTestResult] = useState<{ ok: boolean; errors: string[] } | null>(null);
  const [mounted, setMounted] = useState(false);
  const isDarkMode = useIsDarkMode();

  // Dark mode color scheme
  const getDarkModeColors = (baseColor: string) => {
    const colorMap: Record<string, { light: string; dark: string; text: string }> = {
      '#3B82F6': { light: '#3B82F6', dark: '#1E40AF', text: '#F8FAFC' }, // Blue
      '#10B981': { light: '#10B981', dark: '#047857', text: '#F0FDF4' }, // Green
      '#F59E0B': { light: '#F59E0B', dark: '#D97706', text: '#FFFBEB' }, // Amber
      '#EF4444': { light: '#EF4444', dark: '#DC2626', text: '#FEF2F2' }, // Red
      '#8B5CF6': { light: '#8B5CF6', dark: '#7C3AED', text: '#FAF5FF' }, // Purple
      '#06B6D4': { light: '#06B6D4', dark: '#0891B2', text: '#F0F9FF' }, // Cyan
      '#F97316': { light: '#F97316', dark: '#EA580C', text: '#FFF7ED' }, // Orange
      '#84CC16': { light: '#84CC16', dark: '#65A30D', text: '#F7FEE7' }, // Lime
      '#EC4899': { light: '#EC4899', dark: '#DB2777', text: '#FDF2F8' }, // Pink
    };
    
    const mapped = colorMap[baseColor];
    if (mapped) {
      return {
        background: isDarkMode ? mapped.dark : mapped.light,
        color: isDarkMode ? mapped.text : '#FFFFFF',
        border: isDarkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.35)'
      };
    }
    
    // Fallback for unmapped colors
    return {
      background: isDarkMode ? '#374151' : (baseColor || '#334155'),
      color: isDarkMode ? '#F9FAFB' : '#FFFFFF',
      border: isDarkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.35)'
    };
  };

  // Derived nodes/edges by filter
  const { nodes, edges } = useMemo(() => {
    const filtered = filter === 'all' ? allNodes : allNodes.filter(n => n.data.category === filter);
    const styled = filtered.map(n => {
      const meta = detailsMap[n.id];
      const faded = filter !== 'all' && n.data.category !== filter;
      const colors = getDarkModeColors(meta?.color || '#334155');
      
      return {
        ...n,
        style: {
          ...n.style,
          background: colors.background,
          color: colors.color,
          border: colors.border,
          fontWeight: 600,
          boxShadow: isDarkMode 
            ? '0 4px 12px -2px rgba(0,0,0,0.4)' 
            : '0 4px 10px -2px rgba(0,0,0,0.22)',
          borderRadius: 12,
          padding: 8,
          textAlign: 'center',
          opacity: faded ? 0.25 : 1,
          filter: faded ? 'grayscale(70%)' : 'none'
        },
        data: { ...n.data }
      };
    });
    // Keep all edges but fade those connecting hidden nodes when in filter mode
    const edgeStyled = allEdges.map(e => {
      if (filter === 'all') return e;
      const visible = styled.find(n => n.id === e.source) && styled.find(n => n.id === e.target);
      return { ...e, style: visible ? undefined : { opacity: 0.08 } } as Edge;
    });
    return { nodes: styled, edges: edgeStyled };
  }, [filter, isDarkMode, getDarkModeColors]);

  useEffect(() => {
    setMounted(true);
    const r = runSelfTests();
    setTestResult(r);
  }, []);

  const onNodeClick = useCallback((_e: React.MouseEvent, node: any) => {
    setActiveId(node.id);
  }, []);

  const exportAsPng = async () => {
    try {
      const container = document.querySelector('.react-flow');
      if (!container) return;
      // @ts-ignore html2canvas global loaded via index.html
      const canvas = await window.html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      a.download = `flowchart-${ts}.png`;
      a.href = url;
      a.click();
    } catch (err) {
      console.error('PNG export failed', err);
      alert('تعذر تصدير الصورة');
    }
  };

  const exportAsPdf = async () => {
    try {
      const container = document.querySelector('.react-flow');
      if (!container) return;
      // @ts-ignore html2canvas global
      const canvas = await window.html2canvas(container, { backgroundColor: '#ffffff', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const w = canvas.width;
      const h = canvas.height;
      const landscape = w > h;
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: landscape ? 'l' : 'p', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Fit image within page keeping ratio with small margin
      const margin = 24;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;
      let renderW = maxW;
      let renderH = (h / w) * renderW;
      if (renderH > maxH) { renderH = maxH; renderW = (w / h) * renderH; }
      const x = (pageWidth - renderW) / 2;
      const y = (pageHeight - renderH) / 2;
      pdf.addImage(imgData, 'PNG', x, y, renderW, renderH);
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      pdf.save(`flowchart-${ts}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('تعذر تصدير ملف PDF');
    }
  };


  return (
    <div className="relative w-full h-[600px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-xl">
      {!mounted && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse text-gray-500 dark:text-gray-400">... جاري التحميل</div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        fitView
        className="rtl"
        style={{ backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}
      >
        <Background 
          color={isDarkMode ? '#374151' : '#e5e7eb'} 
          gap={16}
          size={1}
        />
        <MiniMap 
          style={{
            backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
            border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`
          }}
          nodeColor={isDarkMode ? '#6b7280' : '#374151'}
        />
        <Controls 
          style={{
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`
          }}
        />
      </ReactFlow>
      <StepDetails activeId={activeId} onClose={() => setActiveId(null)} />

      {/* Floating Controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 z-50">
        <div className="flex gap-2 flex-wrap">
          <Button type="button" variant={filter==='all' ? 'primary':'secondary'} className="!py-2 !px-3 text-xs" onClick={() => setFilter('all')}>الكل</Button>
          <Button type="button" variant={filter==='citizen' ? 'primary':'secondary'} className="!py-2 !px-3 text-xs" onClick={() => setFilter('citizen')}>خطوات المواطن</Button>
          <Button type="button" variant={filter==='internal' ? 'primary':'secondary'} className="!py-2 !px-3 text-xs" onClick={() => setFilter('internal')}>المعالجة الداخلية</Button>
          <Button type="button" variant="secondary" className="!py-2 !px-3 text-xs" onClick={() => setActiveId(null)}>إلغاء التحديد</Button>
          <Button type="button" className="!py-2 !px-3 text-xs" onClick={() => setActiveId('entry')}>البداية</Button>
          <Button type="button" variant="secondary" className="!py-2 !px-3 text-xs" onClick={exportAsPng}>📤 صورة PNG</Button>
          <Button type="button" variant="secondary" className="!py-2 !px-3 text-xs" onClick={exportAsPdf}>📄 ملف PDF</Button>
        </div>
        {testResult && !testResult.ok && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg max-w-[220px]">
            <div className="font-bold mb-1 flex items-center gap-1"><XCircle size={14}/> تحذير بنية</div>
            <ul className="space-y-0.5 list-disc pr-4">
              {testResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
        {testResult && testResult.ok && (
          <div className="text-[11px] text-green-700 bg-green-50 dark:bg-green-900/20 p-1.5 rounded-md flex items-center gap-1"><CheckCircle2 size={14}/> مخطط سليم</div>
        )}
      </div>
    </div>
  );
};

export default InteractiveFlowchart;
