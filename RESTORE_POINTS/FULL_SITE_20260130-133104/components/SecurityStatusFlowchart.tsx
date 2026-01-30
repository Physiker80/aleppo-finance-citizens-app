import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CheckCircle, XCircle, Zap, Shield, Server, Database, KeyRound, Link2, GitMerge, Forward } from 'lucide-react';

// --- Types ---
interface SecurityNodeData {
  label: string;
  type: 'positive' | 'negative' | 'improvement' | 'category';
  details: string;
  icon?: React.ReactNode;
  [key: string]: unknown;
}

type SecurityNode = Node<SecurityNodeData>;

// --- Node Definitions ---
const initialNodes: SecurityNode[] = [
  // Categories
  {
    id: 'positives',
    type: 'category',
    position: { x: -400, y: 0 },
    data: { label: 'الإيجابيات', type: 'category', details: 'النقاط المضيئة في الوضع الأمني الحالي.', icon: <CheckCircle /> },
    style: { width: 180, height: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: '#22c55e', color: 'white', fontSize: '1.2rem' },
  },
  {
    id: 'negatives',
    type: 'category',
    position: { x: 400, y: 0 },
    data: { label: 'السلبيات', type: 'category', details: 'نقاط الضعف التي تتطلب معالجة.', icon: <XCircle /> },
    style: { width: 180, height: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ef4444', color: 'white', fontSize: '1.2rem' },
  },

  // Positives
  {
    id: 'csrf',
    type: 'positive',
    position: { x: -750, y: 150 },
    data: { label: 'حماية CSRF شاملة', type: 'positive', details: 'تطبيق حماية Double-Submit Token الشاملة لمنع هجمات تزوير الطلبات عبر المواقع.' },
  },
  {
    id: 'csp',
    type: 'positive',
    position: { x: -550, y: 150 },
    data: { label: 'CSP مع تقارير', type: 'positive', details: 'تفعيل CSP في وضع Report-Only مع وجود لوحة مراقبة للتحليل تمهيداً للتطبيق الكامل.' },
  },
  {
    id: 'session',
    type: 'positive',
    position: { x: -350, y: 150 },
    data: { label: 'إدارة جلسات قوية', type: 'positive', details: 'جلسات آمنة مع انتهاء صلاحية منزلق، تدوير، وسمات كوكي محصنة.' },
  },
  {
    id: 'lockout',
    type: 'positive',
    position: { x: -150, y: 150 },
    data: { label: 'سياسة Lockout', type: 'positive', details: 'سياسة قفل الحسابات بعد محاولات دخول فاشلة، مع وجود تحديد لمعدل الطلبات.' },
  },
  {
    id: 'ci_sec',
    type: 'positive',
    position: { x: 50, y: 150 },
    data: { label: 'CI أمني', type: 'positive', details: 'الفحص الأمني المستمر (CodeQL + npm audit) يكشف الثغرات مبكراً.' },
  },
  {
    id: 'siem_hook',
    type: 'positive',
    position: { x: 250, y: 150 },
    data: { label: 'قابلية دمج SIEM', type: 'positive', details: 'وجود Webhook مخصص لإرسال سجلات التدقيق إلى نظام SIEM مركزي.' },
  },

  // Negatives
  {
    id: 'no_db',
    type: 'negative',
    position: { x: -50, y: 350 },
    data: { label: 'غياب قاعدة بيانات مركزية', type: 'negative', details: 'الاعتماد على التخزين المحلي في المتصفح يعرض البيانات لخطر التلاعب.' },
  },
  {
    id: 'rbac',
    type: 'negative',
    position: { x: 200, y: 350 },
    data: { label: 'نقص التحكم بالوصول (RBAC)', type: 'negative', details: 'بعض منطق التحقق من الصلاحيات ما زال على العميل، مما يسمح بتجاوزه.' },
  },
  {
    id: 'no_encryption',
    type: 'negative',
    position: { x: 450, y: 350 },
    data: { label: 'غياب تشفير البيانات', type: 'negative', details: 'البيانات وملفاتها غير مشفرة (At-Rest)، مما يعرضها للكشف في حال اختراق الخادم.' },
  },
  {
    id: 'no_mfa',
    type: 'negative',
    position: { x: 700, y: 350 },
    data: { label: 'غياب المصادقة متعددة العوامل', type: 'negative', details: 'الحسابات الهامة (مثل حسابات المدراء) غير محمية بطبقة مصادقة إضافية.' },
  },
  {
    id: 'audit_chain',
    type: 'negative',
    position: { x: 950, y: 350 },
    data: { label: 'سلسلة تدقيق غير مكتملة', type: 'negative', details: 'سلسلة التجزئة (Hash Chain) لسجلات التدقيق غير معممة على كافة العمليات.' },
  },

  // Improvements
  {
    id: 'imp_db',
    type: 'improvement',
    position: { x: -50, y: 550 },
    data: { label: 'بناء قاعدة بيانات وهوية مركزية', type: 'improvement', details: 'ترحيل كافة البيانات إلى قاعدة بيانات خادمية (Server-side) مع تجزئة كلمات المرور.' },
  },
  {
    id: 'imp_rbac',
    type: 'improvement',
    position: { x: 200, y: 550 },
    data: { label: 'تطبيق RBAC على الخادم', type: 'improvement', details: 'نقل كافة عمليات التحقق من الصلاحيات لتتم على الخادم بشكل كامل عبر Middleware.' },
  },
  {
    id: 'imp_encryption',
    type: 'improvement',
    position: { x: 450, y: 550 },
    data: { label: 'تفعيل تشفير At-Rest', type: 'improvement', details: 'تشفير البيانات المخزنة على القرص لحمايتها من الوصول غير المصرح به.' },
  },
  {
    id: 'imp_mfa',
    type: 'improvement',
    position: { x: 700, y: 550 },
    data: { label: 'تفعيل المصادقة متعددة العوامل', type: 'improvement', details: 'إضافة طبقة حماية إضافية (مثل TOTP) للحسابات ذات الصلاحيات العالية.' },
  },
  {
    id: 'imp_audit_chain',
    type: 'improvement',
    position: { x: 950, y: 550 },
    data: { label: 'تعميم سلسلة التدقيق', type: 'improvement', details: 'توسيع سلسلة التجزئة لتشمل جميع العمليات الحساسة لضمان نزاهة السجلات.' },
  },
];

// --- Edge Definitions ---
const initialEdges: Edge[] = [
  // Connections to categories
  { id: 'e-pos-csrf', source: 'positives', target: 'csrf', animated: true },
  { id: 'e-pos-csp', source: 'positives', target: 'csp', animated: true },
  { id: 'e-pos-session', source: 'positives', target: 'session', animated: true },
  { id: 'e-pos-lockout', source: 'positives', target: 'lockout', animated: true },
  { id: 'e-pos-ci_sec', source: 'positives', target: 'ci_sec', animated: true },
  { id: 'e-pos-siem_hook', source: 'positives', target: 'siem_hook', animated: true },
  
  { id: 'e-neg-nodb', source: 'negatives', target: 'no_db', animated: true },
  { id: 'e-neg-rbac', source: 'negatives', target: 'rbac', animated: true },
  { id: 'e-neg-no_encryption', source: 'negatives', target: 'no_encryption', animated: true },
  { id: 'e-neg-nomfa', source: 'negatives', target: 'no_mfa', animated: true },
  { id: 'e-neg-audit_chain', source: 'negatives', target: 'audit_chain', animated: true },

  // Connections from negatives to improvements
  { id: 'e-imp-db', source: 'no_db', target: 'imp_db', label: 'تحسين', style: { stroke: '#f59e0b', strokeWidth: 2 } },
  { id: 'e-imp-rbac', source: 'rbac', target: 'imp_rbac', label: 'تحسين', style: { stroke: '#f59e0b', strokeWidth: 2 } },
  { id: 'e-imp-encryption', source: 'no_encryption', target: 'imp_encryption', label: 'تحسين', style: { stroke: '#f59e0b', strokeWidth: 2 } },
  { id: 'e-imp-mfa', source: 'no_mfa', target: 'imp_mfa', label: 'تحسين', style: { stroke: '#f59e0b', strokeWidth: 2 } },
  { id: 'e-imp-audit_chain', source: 'audit_chain', target: 'imp_audit_chain', label: 'تحسين', style: { stroke: '#f59e0b', strokeWidth: 2 } },
];

const iconMap = {
    positive: <Shield />,
    negative: <Server />,
    improvement: <Zap />,
    category: <CheckCircle />,
    csrf: <Shield />,
    csp: <Shield />,
    session: <KeyRound />,
    lockout: <KeyRound />,
    ci_sec: <GitMerge />,
    siem_hook: <Forward />,
    no_db: <Database />,
    rbac: <Server />,
    no_encryption: <Database />,
    no_mfa: <KeyRound />,
    audit_chain: <Link2 />,
    imp_db: <Zap />,
    imp_rbac: <Zap />,
    imp_encryption: <Zap />,
    imp_mfa: <Zap />,
    imp_audit_chain: <Zap />,
};

// --- Custom Node Component ---
const CustomNode: React.FC<{ data: SecurityNodeData, id: string }> = ({ data, id }) => {
  const baseStyle = 'p-3 rounded-lg border-2 shadow-md flex items-center gap-3 min-w-[220px]';
  const typeStyles = {
    positive: 'bg-green-100 border-green-500',
    negative: 'bg-red-100 border-red-500',
    improvement: 'bg-yellow-100 border-yellow-500',
    category: 'bg-gray-200 border-gray-400 text-lg font-bold',
  };

  const icon = iconMap[id as keyof typeof iconMap] || iconMap[data.type as keyof typeof iconMap];

  return (
    <div className={`${baseStyle} ${typeStyles[data.type]}`} dir="rtl">
      {icon}
      <span className="font-semibold break-words whitespace-pre-line leading-snug">{data.label}</span>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const nodeTypes = {
  positive: (props: any) => <CustomNode {...props} />,
  negative: (props: any) => <CustomNode {...props} />,
  improvement: (props: any) => <CustomNode {...props} />,
  category: (props: any) => <CustomNode {...props} />,
};

// --- Details Panel ---
const DetailsPanel: React.FC<{ activeNode: SecurityNode | null; onClose: () => void }> = ({ activeNode, onClose }) => {
  if (!activeNode) return null;
  
  const icon = iconMap[activeNode.id as keyof typeof iconMap] || iconMap[activeNode.data.type as keyof typeof iconMap];

  return (
    <div className="absolute top-4 left-4 w-80 max-w-sm max-h-80 overflow-y-auto bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 z-10" dir="rtl">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          {icon}
          {activeNode.data.label}
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
      </div>
      <p className="text-gray-700 break-words whitespace-pre-line leading-snug">{activeNode.data.details}</p>
    </div>
  );
};

// --- Main Flowchart Component ---
const SecurityStatusFlowchart: React.FC = () => {
  const [activeNode, setActiveNode] = useState<SecurityNode | null>(null);

  // Live security snapshot
  const [secLoading, setSecLoading] = useState(false);
  const [secErr, setSecErr] = useState<string | null>(null);
  const [secState, setSecState] = useState<{
    counts: { CRITICAL: number; HIGH: number; WARN: number; INFO: number };
    totalRecent: number;
    blocklistCount: number;
    cspCount: number;
    lastUpdated?: number;
  }>({ counts: { CRITICAL: 0, HIGH: 0, WARN: 0, INFO: 0 }, totalRecent: 0, blocklistCount: 0, cspCount: 0 });

  // Resolve x-api-key from localStorage (optional)
  const readApiKey = () => {
    try {
      const a = (localStorage.getItem('secmon_api_key') || '').trim();
      if (a) return a;
      const b = (localStorage.getItem('csp_panel_api_key') || '').trim();
      if (b) return b;
      const c = (localStorage.getItem('obs_api_key') || '').trim();
      if (c) return c;
    } catch {}
    return '';
  };

  const fetchSnapshot = useCallback(async () => {
    setSecLoading(true); setSecErr(null);
    const hk = readApiKey();
    const headers = hk ? { 'x-api-key': hk } as Record<string,string> : undefined;
    try {
      // Try relative first then localhost fallback
      const urlsAlerts = ['/api/security/alerts','http://localhost:4000/api/security/alerts'];
      const urlsBlock = ['/api/security/blocklist','http://localhost:4000/api/security/blocklist'];
      const urlsCsp = ['/api/csp-violations?limit=200&sinceMs=' + (6*60*60*1000), 'http://localhost:4000/api/csp-violations?limit=200&sinceMs=' + (6*60*60*1000)];
      let alerts: any[] = [];
      let blocklist: any[] = [];
      let cspItems: any[] = [];
      // Alerts
      for (const u of urlsAlerts) {
        try { const r = await fetch(u, { headers }); if (r.ok) { const j = await r.json(); alerts = Array.isArray(j.alerts) ? j.alerts : (Array.isArray(j.items) ? j.items : []); break; } } catch {}
      }
      // Blocklist
      for (const u of urlsBlock) {
        try { const r = await fetch(u, { headers }); if (r.ok) { const j = await r.json(); blocklist = Array.isArray(j.items) ? j.items : []; break; } } catch {}
      }
      // CSP
      for (const u of urlsCsp) {
        try { const r = await fetch(u, { headers }); if (r.ok) { const j = await r.json(); cspItems = Array.isArray(j.items) ? j.items : []; break; } } catch {}
      }

      // Compute recent (last 60 minutes) counts
      const now = Date.now();
      const recentAlerts = alerts.filter((a: any) => {
        const atVal = (a.at ?? a.time ?? a.timestamp ?? a.createdAt);
        const t = atVal ? new Date(atVal).getTime() : NaN;
        if (!isFinite(t)) return true; // if no timestamp, include
        return (now - t) <= 60*60*1000;
      });
  const counts: { CRITICAL: number; HIGH: number; WARN: number; INFO: number } = { CRITICAL: 0, HIGH: 0, WARN: 0, INFO: 0 };
      for (const a of recentAlerts) {
        const sev = String(a.severity || a.level || 'INFO').toUpperCase();
        if (sev === 'CRITICAL') counts.CRITICAL++;
        else if (sev === 'HIGH') counts.HIGH++;
        else if (sev === 'WARN' || sev === 'MEDIUM') counts.WARN++;
        else counts.INFO++;
      }
      setSecState({ counts, totalRecent: recentAlerts.length, blocklistCount: blocklist.length, cspCount: cspItems.length, lastUpdated: now });
    } catch (e:any) {
      setSecErr(e?.message || String(e));
    } finally {
      setSecLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
    const id = setInterval(fetchSnapshot, 20000);
    return () => clearInterval(id);
  }, [fetchSnapshot]);

  // Build dynamic nodes based on current state
  const dynamic = useMemo(() => {
    const statusType: 'positive'|'improvement'|'negative' = secState.counts.CRITICAL > 0 ? 'negative' : ((secState.counts.HIGH + secState.counts.WARN) > 0 ? 'improvement' : 'positive');
    const statusText = statusType === 'negative' ? 'خطر' : statusType === 'improvement' ? 'تحذير' : 'آمن';
    const nodes: SecurityNode[] = [
      {
        id: 'status_now',
        type: statusType,
        position: { x: 0, y: -120 },
        data: { label: `الحالة الأمنية الآن: ${statusText}`, type: statusType, details: `حرج: ${secState.counts.CRITICAL}، مرتفع: ${secState.counts.HIGH}، تحذير: ${secState.counts.WARN}، معلومات: ${secState.counts.INFO} — محظورون: ${secState.blocklistCount} — مخالفات CSP: ${secState.cspCount}` },
      },
      {
        id: 'status_alerts',
        type: 'category',
        position: { x: -250, y: 20 },
        data: { label: `تنبيهات (آخر 60 دقيقة): ${secState.totalRecent}`, type: 'category', details: `CRITICAL: ${secState.counts.CRITICAL}, HIGH: ${secState.counts.HIGH}, WARN: ${secState.counts.WARN}, INFO: ${secState.counts.INFO}` },
      },
      {
        id: 'status_block',
        type: 'category',
        position: { x: 0, y: 20 },
        data: { label: `عناوين IP المحجوبة: ${secState.blocklistCount}`, type: 'category', details: 'عدد العناوين المحجوبة حالياً بواسطة SecurityMonitor' },
      },
      {
        id: 'status_csp',
        type: 'category',
        position: { x: 250, y: 20 },
        data: { label: `مخالفات CSP (٦ ساعات): ${secState.cspCount}`, type: 'category', details: 'عدد مخالفات سياسة أمان المحتوى المسجلة خلال آخر 6 ساعات' },
      },
    ];
    const edges: Edge[] = [
      { id: 'e-status-alerts', source: 'status_now', target: 'status_alerts', animated: true },
      { id: 'e-status-block', source: 'status_now', target: 'status_block', animated: true },
      { id: 'e-status-csp', source: 'status_now', target: 'status_csp', animated: true },
      // Link to categories for context
      { id: 'e-status-pos', source: 'status_now', target: 'positives', style: { stroke: '#22c55e' } },
      { id: 'e-status-neg', source: 'status_now', target: 'negatives', style: { stroke: '#ef4444' } },
    ];
    return { nodes, edges };
  }, [secState]);

  const nodes = useMemo(() => ([...initialNodes, ...dynamic.nodes]), [dynamic.nodes]);
  const edges = useMemo(() => ([...initialEdges, ...dynamic.edges]), [dynamic.edges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<SecurityNodeData>) => {
    setActiveNode(node);
  }, []);

  return (
    <div style={{ height: '700px', width: '100%' }} className="sec-flow rounded-lg border border-gray-300 relative">
      {/* Header status pill */}
      <div className="absolute top-2 right-2 z-20 text-xs px-2 py-1 rounded bg-gray-800/80 text-gray-100" dir="rtl">
        {secLoading ? 'جارٍ التحديث…' : secErr ? `خطأ: ${secErr}` : `آخر تحديث: ${secState.lastUpdated ? new Date(secState.lastUpdated).toLocaleTimeString('ar-SY-u-nu-latn') : '—'}`}
      </div>
      <div className="h-full" style={{ direction: 'ltr' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          disableKeyboardA11y={true}
          proOptions={{ hideAttribution: true } as any}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          onInit={(instance) => {
            try { instance.fitView({ padding: 0.2 }); } catch {}
          }}
        >
          <Background />
          <Controls />
          {/* MiniMap removed to avoid visible accessibility label in RTL; can be re-enabled with custom a11y CSS */}
        </ReactFlow>
      </div>
      <DetailsPanel activeNode={activeNode} onClose={() => setActiveNode(null)} />
    </div>
  );
};

export default SecurityStatusFlowchart;