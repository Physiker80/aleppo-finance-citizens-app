import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { Info, Filter, CheckCircle2, XCircle } from 'lucide-react';

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

// Base style for nodes - now supports dark mode
const getNodeBaseStyle = (isDarkMode: boolean): any => ({
  style: {
    borderRadius: 16,
    padding: 12,
    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
    background: isDarkMode ? '#1f2937' : 'white',
    color: isDarkMode ? '#f9fafb' : '#111827',
    boxShadow: isDarkMode 
      ? '0 1px 3px rgba(0,0,0,0.6)' 
      : '0 1px 2px rgba(0,0,0,0.04)',
    fontSize: 12,
    lineHeight: 1.3,
    whiteSpace: 'pre-line'
  }
});

const CONFIG = {
  sla: {
    inquiry_first_response: '15 دقيقة',
    inquiry_resolution: '4 ساعات',
    complaint_p1_response: '30 دقيقة',
    complaint_p1_resolution: '8 ساعات',
    complaint_p2_response: '4 ساعات',
    complaint_p2_resolution: '48 ساعة'
  },
  teams: ['خدمة العملاء','الدعم الفني','الفوترة','الجودة','العمليات','المنتج'],
  integrations: {
    crm: 'Salesforce/HubSpot',
    ivr: 'IVR/OTP',
    email: 'IMAP/SMTP',
    ticketing: 'Jira/ServiceNow'
  }
};

const allEdges = [
  { id: 'e1', source: 'channels', target: 'intake' },
  { id: 'e1b', source: 'channels', target: 'ivr_auth', label: 'هاتف/IVR' },
  { id: 'e1c', source: 'ivr_auth', target: 'intake' },
  { id: 'e1d', source: 'channels', target: 'email_gateway', label: 'بريد' },
  { id: 'e1e', source: 'email_gateway', target: 'intake' },
  { id: 'e2', source: 'intake', target: 'crm_sync', label: 'CRM' },
  { id: 'e2b', source: 'crm_sync', target: 'classify' },
  { id: 'e3', source: 'classify', target: 'inq_title', label: 'استعلام', type: 'smoothstep' },
  { id: 'e4', source: 'classify', target: 'cmp_title', label: 'شكوى', type: 'smoothstep' },
  { id: 'e4a', source: 'inq_title', target: 'sla_inq', label: 'مراقبة SLA' },
  { id: 'e5', source: 'sla_inq', target: 'inq_topic' },
  { id: 'e6', source: 'inq_topic', target: 'inq_kb' },
  { id: 'e7', source: 'inq_kb', target: 'inq_answer' },
  { id: 'e8', source: 'inq_kb', target: 'inq_escalate', label: 'لا توجد إجابة' },
  { id: 'e9', source: 'inq_escalate', target: 'inq_answer', label: 'تقديم الرد' },
  { id: 'e10', source: 'inq_answer', target: 'inq_close' },
  { id: 'e11', source: 'inq_close', target: 'inq_csat' },
  { id: 'e12', source: 'cmp_title', target: 'cmp_ticket' },
  { id: 'e13', source: 'cmp_ticket', target: 'cmp_severity' },
  { id: 'e13a', source: 'cmp_severity', target: 'sla_cmp', label: 'مراقبة SLA' },
  { id: 'e14', source: 'sla_cmp', target: 'cmp_assign' },
  { id: 'e14a', source: 'cmp_assign', target: 'cmp_team_router' },
  { id: 'e14b', source: 'cmp_team_router', target: 'cmp_investigate' },
  { id: 'e15', source: 'cmp_assign', target: 'cmp_investigate', label: 'تخطي الموجه', type: 'smoothstep' },
  { id: 'e16', source: 'cmp_investigate', target: 'cmp_propose' },
  { id: 'e17', source: 'cmp_propose', target: 'cmp_implement', label: 'موافقة' },
  { id: 'e18', source: 'cmp_propose', target: 'cmp_investigate', label: 'رفض/تعليقات', type: 'smoothstep' },
  { id: 'e19', source: 'cmp_implement', target: 'cmp_verify' },
  { id: 'e20', source: 'cmp_verify', target: 'cmp_rca', label: 'فشل التحقق', type: 'smoothstep' },
  { id: 'e21', source: 'cmp_verify', target: 'cmp_kb', label: 'تم التحقق' },
  { id: 'e22', source: 'cmp_rca', target: 'cmp_kb' },
  { id: 'e23', source: 'cmp_kb', target: 'cmp_close' }
];

interface DetailMeta { title: string; desc: string; inputs: string[]; outputs: string[] }
const detailsMap: Record<string, DetailMeta> = {
  intake: { title: 'استقبال/تسجيل الطلب', desc: 'تجميع بيانات العميل والموضوع، إنشاء رقم مرجعي، التحقق من صحة البيانات.', inputs: ['قناة الدخول','بيانات العميل','وصف موجز'], outputs: ['رقم تذكرة/طلب','تأكيد للعميل'] },
  channels: { title: 'قنوات الدخول', desc: 'الويب، الهاتف، البريد، الحضور المباشر.', inputs: ['نوع القناة'], outputs: ['طلب مُسجل'] },
  ivr_auth: { title: 'IVR/OTP تحقق الهوية', desc: 'للأعمال الهاتفية: تحقق هوية المتصل عبر IVR أو OTP.', inputs: ['رقم الهاتف','رمز تحقق'], outputs: ['هوية موثقة'] },
  email_gateway: { title: 'بوابة البريد', desc: 'التقاط الرسائل من صندوق بريد مشترك وربطها بالتذاكر.', inputs: ['عنوان البريد','هوية العميل'], outputs: ['سجل بريد مرتبط'] },
  crm_sync: { title: 'تكامل CRM', desc: 'تحديث أو إنشاء سجل عميل في CRM.', inputs: ['بيانات العميل'], outputs: ['سجل CRM محدث'] },
  classify: { title: 'تصنيف وتحديد النوع', desc: 'تمييز استعلام معلوماتي عن شكوى تحتاج معالجة.', inputs: ['الوصف'], outputs: ['مسار مناسب'] },
  inq_kb: { title: 'البحث في قاعدة المعرفة', desc: 'جلب إجابات من مقالات موثقة.', inputs: ['كلمات مفتاحية'], outputs: ['إجابة'] },
  inq_escalate: { title: 'تصعيد إلى خبير', desc: 'إرسال الاستعلام لمختص.', inputs: ['تفاصيل الاستعلام'], outputs: ['إجابة معتمدة'] },
  inq_close: { title: 'إغلاق مع ملاحظات', desc: 'توثيق ما تم تزويده وتسجيل الملاحظات.', inputs: ['الإجابة'], outputs: ['سجل إغلاق'] },
  inq_csat: { title: 'استبيان رضا العميل', desc: 'قياس جودة الخدمة المقدمة.', inputs: ['رابط الاستبيان'], outputs: ['نتيجة الرضا'] },
  sla_inq: { title: 'مراقبة SLA للاستعلام', desc: `الاستجابة الأولى ${CONFIG.sla.inquiry_first_response} / الحل ${CONFIG.sla.inquiry_resolution}.`, inputs: ['وقت الفتح'], outputs: ['حالة SLA'] },
  cmp_ticket: { title: 'فتح تذكرة شكوى', desc: 'إنشاء تذكرة رسمية.', inputs: ['عميل','وصف','مرفقات'], outputs: ['رقم تذكرة'] },
  cmp_severity: { title: 'تقييم الأولوية', desc: 'تحديد الشدة والأثر.', inputs: ['الشدة','الأثر'], outputs: ['أولوية/SLA'] },
  sla_cmp: { title: 'مراقبة SLA للشكوى', desc: 'تنبيهات زمنية حسب الأولوية.', inputs: ['أولوية'], outputs: ['تنبيهات/تصعيد'] },
  cmp_assign: { title: 'تعيين فريق المعالجة', desc: 'إسناد التذكرة للفريق الأنسب.', inputs: ['الفئة','الأولوية'], outputs: ['فريق مالك'] },
  cmp_team_router: { title: 'توجيه حسب الفريق', desc: 'قواعد توزيع حسب التخصص.', inputs: ['الفئة'], outputs: ['فريق مستلم'] },
  cmp_investigate: { title: 'تحقيق/جمع أدلة', desc: 'تحليل الأسباب وجمع السجلات.', inputs: ['سجلات','خطوات إعادة'], outputs: ['نتائج التحقيق'] },
  cmp_propose: { title: 'اقتراح حل', desc: 'صياغة خطة حل.', inputs: ['نتائج التحقيق'], outputs: ['خطة حل'] },
  cmp_implement: { title: 'تنفيذ الحل', desc: 'تطبيق التغييرات.', inputs: ['خطة الحل'], outputs: ['تغيير مطبق'] },
  cmp_verify: { title: 'تأكيد/التحقق', desc: 'التأكد من زوال المشكلة.', inputs: ['نتائج التطبيق'], outputs: ['قبول/رفض'] },
  cmp_rca: { title: 'تحليل جذري', desc: 'تحليل أسباب متكررة.', inputs: ['بيانات الحوادث'], outputs: ['أسباب جذرية'] },
  cmp_kb: { title: 'تحديث قاعدة المعرفة', desc: 'إضافة أو تعديل مقالات.', inputs: ['نتائج الحل'], outputs: ['مقال جديد'] },
  cmp_close: { title: 'إغلاق وقياس الرضا', desc: 'إغلاق رسمي وقياس رضا.', inputs: ['تأكيد العميل'], outputs: ['حالة مغلقة','نتيجة رضا'] }
};

function runSelfTests() {
  const results: {name: string; pass: boolean; detail?: string}[] = [];
  // We'll do basic validation on edges only now since nodes are generated dynamically
  const sourceIds = new Set(allEdges.map(e => e.source));
  const targetIds = new Set(allEdges.map(e => e.target));
  const allIds = new Set([...sourceIds, ...targetIds]);
  results.push({ name: 'وجود معرفات الحواف', pass: allIds.size > 0 });
  
  const critical = ['intake','classify'];
  const hasCritical = critical.some(c => allIds.has(c));
  results.push({ name: 'العقد الأساسية', pass: hasCritical });
  
  return results;
}

const StepDetails: React.FC<{ id: string }> = ({ id }) => {
  const d = detailsMap[id];
  if (!d) return <p className="text-xs text-gray-500">لا توجد تفاصيل.</p>;
  return (
    <div className="space-y-3 text-xs leading-relaxed">
      <div>
        <div className="font-semibold">{d.title}</div>
        <div className="text-gray-600 mt-1">{d.desc}</div>
      </div>
      <div>
        <div className="font-semibold">المدخلات</div>
        <ul className="list-disc pr-4 text-gray-600">
          {d.inputs.map((x,i) => <li key={i}>{x}</li>)}
        </ul>
      </div>
      <div>
        <div className="font-semibold">المخرجات</div>
        <ul className="list-disc pr-4 text-gray-600">
          {d.outputs.map((x,i) => <li key={i}>{x}</li>)}
        </ul>
      </div>
    </div>
  );
};

const InquiryComplaintFlowchart: React.FC = () => {
  const [filter, setFilter] = useState<'all'|'inquiry'|'complaint'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const isDarkMode = useIsDarkMode();
  
  // Create nodes with dark mode support
  const allNodesWithDarkMode = useMemo(() => {
    const nodeBase = getNodeBaseStyle(isDarkMode);
    
    return [
      { id: 'intake', position: { x: 0, y: 0 }, data: { label: 'استقبال/تسجيل الطلب' }, ...nodeBase },
      { id: 'channels', position: { x: -260, y: -120 }, data: { label: 'قنوات الدخول:\nالويب • الهاتف • البريد • الحضور' }, ...nodeBase },
      { id: 'ivr_auth', position: { x: -520, y: -40 }, data: { label: 'IVR/OTP تحقق الهوية' }, ...nodeBase },
      { id: 'email_gateway', position: { x: -520, y: -120 }, data: { label: 'بوابة البريد/IMAP' }, ...nodeBase },
      { id: 'crm_sync', position: { x: 0, y: 60 }, data: { label: 'تكامل CRM: إنشاء/تحديث العميل' }, ...nodeBase },
      { id: 'classify', position: { x: 0, y: 120 }, data: { label: 'تصنيف وتحديد النوع' }, ...nodeBase },
      // Inquiry path
      { id: 'inq_title', position: { x: -340, y: 220 }, data: { label: 'مسار الاستعلام' }, style: { 
        ...nodeBase.style, 
        background: isDarkMode ? '#1E3A8A' : '#F0F9FF', 
        borderColor: isDarkMode ? '#3B82F6' : '#BAE6FD',
        color: isDarkMode ? '#DBEAFE' : '#1E40AF'
      }},
      { id: 'sla_inq', position: { x: -560, y: 260 }, data: { label: 'مراقبة SLA للاستعلام' }, ...nodeBase },
      { id: 'inq_topic', position: { x: -340, y: 300 }, data: { label: 'تحديد الموضوع/الفئة' }, ...nodeBase },
      { id: 'inq_kb', position: { x: -340, y: 420 }, data: { label: 'البحث في قاعدة المعرفة' }, ...nodeBase },
      { id: 'inq_answer', position: { x: -340, y: 540 }, data: { label: 'إجابة فورية للعميل' }, ...nodeBase },
      { id: 'inq_escalate', position: { x: -120, y: 420 }, data: { label: 'تصعيد إلى خبير (إن لزم)' }, ...nodeBase },
      { id: 'inq_close', position: { x: -340, y: 660 }, data: { label: 'إغلاق مع ملاحظات' }, ...nodeBase },
      { id: 'inq_csat', position: { x: -340, y: 780 }, data: { label: 'استبيان رضا العميل' }, ...nodeBase },
      // Complaint path
      { id: 'cmp_title', position: { x: 340, y: 220 }, data: { label: 'مسار الشكوى' }, style: { 
        ...nodeBase.style, 
        background: isDarkMode ? '#A16207' : '#FEFCE8', 
        borderColor: isDarkMode ? '#EAB308' : '#FDE68A',
        color: isDarkMode ? '#FEF3C7' : '#92400E'
      }},
      { id: 'cmp_ticket', position: { x: 340, y: 300 }, data: { label: 'فتح تذكرة شكوى' }, ...nodeBase },
      { id: 'cmp_severity', position: { x: 340, y: 420 }, data: { label: 'تقييم الأولوية (شدة/أثر) ⏱ SLA' }, ...nodeBase },
      { id: 'sla_cmp', position: { x: 580, y: 420 }, data: { label: 'مراقبة SLA للشكوى' }, ...nodeBase },
      { id: 'cmp_assign', position: { x: 340, y: 540 }, data: { label: 'تعيين فريق المعالجة' }, ...nodeBase },
      { id: 'cmp_team_router', position: { x: 580, y: 540 }, data: { label: 'توجيه حسب الفريق' }, ...nodeBase },
      { id: 'cmp_investigate', position: { x: 340, y: 660 }, data: { label: 'التحقيق وجمع الأدلة' }, ...nodeBase },
      { id: 'cmp_propose', position: { x: 340, y: 780 }, data: { label: 'اقتراح الحل' }, ...nodeBase },
      { id: 'cmp_implement', position: { x: 340, y: 900 }, data: { label: 'تنفيذ الحل' }, ...nodeBase },
      { id: 'cmp_verify', position: { x: 340, y: 1020 }, data: { label: 'التحقق من الحل' }, ...nodeBase },
      { id: 'cmp_rca', position: { x: 580, y: 660 }, data: { label: 'تحليل السبب الجذري' }, ...nodeBase },
      { id: 'cmp_kb', position: { x: 580, y: 780 }, data: { label: 'إضافة لقاعدة المعرفة' }, ...nodeBase },
      { id: 'cmp_close', position: { x: 340, y: 1140 }, data: { label: 'إغلاق الشكوى' }, ...nodeBase }
    ];
  }, [isDarkMode]);

  const { nodes, edges } = useMemo(() => {
    const inquiry = new Set(['inq_title','sla_inq','inq_topic','inq_kb','inq_answer','inq_escalate','inq_close','inq_csat']);
    const complaint = new Set(['cmp_title','cmp_ticket','cmp_severity','sla_cmp','cmp_assign','cmp_team_router','cmp_investigate','cmp_propose','cmp_implement','cmp_verify','cmp_rca','cmp_kb','cmp_close']);
    const keep = allNodesWithDarkMode.filter(n => {
      if (filter === 'all') return true;
      if (filter === 'inquiry') return inquiry.has(n.id) || ['intake','classify','channels','crm_sync','ivr_auth','email_gateway'].includes(n.id);
      if (filter === 'complaint') return complaint.has(n.id) || ['intake','classify','channels','crm_sync','ivr_auth','email_gateway'].includes(n.id);
      return true;
    });
    const keepIds = new Set(keep.map(n=>n.id));
    const filteredEdges = allEdges.filter(e => keepIds.has(e.source) && keepIds.has(e.target));
    return { nodes: keep, edges: filteredEdges };
  }, [filter, allNodesWithDarkMode]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  React.useEffect(() => { setNodes(nodes); setEdges(edges); }, [nodes, edges, setNodes, setEdges]);

  const onNodeClick = useCallback((_e: any, node: any) => { setSelected(node.id); }, []);

  const tests = useMemo(() => runSelfTests(), []);

  const exportAsPng = async () => {
    try {
      const wrapper = document.querySelector('.inquiry-complaint-flow .react-flow');
      if (!wrapper) return;
      // @ts-ignore html2canvas global
      const canvas = await window.html2canvas(wrapper, { backgroundColor: '#ffffff', scale: 2 });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      a.download = `inquiry-complaint-${ts}.png`;
      a.href = url;
      a.click();
    } catch (e) {
      console.error('PNG export failed', e);
      alert('تعذر تصدير الصورة');
    }
  };

  const exportAsPdf = async () => {
    try {
      const wrapper = document.querySelector('.inquiry-complaint-flow .react-flow');
      if (!wrapper) return;
      // @ts-ignore html2canvas global
      const canvas = await window.html2canvas(wrapper, { backgroundColor: '#ffffff', scale: 2 });
      const img = canvas.toDataURL('image/png');
      const { jsPDF } = await import('jspdf');
      const w = canvas.width;
      const h = canvas.height;
      const landscape = w > h;
      const pdf = new jsPDF({ orientation: landscape ? 'l' : 'p', unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const maxW = pageW - margin*2;
      const maxH = pageH - margin*2;
      let renderW = maxW;
      let renderH = (h / w) * renderW;
      if (renderH > maxH) { renderH = maxH; renderW = (w / h) * renderH; }
      const x = (pageW - renderW)/2;
      const y = (pageH - renderH)/2;
      pdf.addImage(img, 'PNG', x, y, renderW, renderH);
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      pdf.save(`inquiry-complaint-${ts}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
      alert('تعذر تصدير ملف PDF');
    }
  };


  return (
    <div className="w-full h-[600px] grid grid-cols-12 gap-4 inquiry-complaint-flow">
      <div className="col-span-12 lg:col-span-9 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gradient-to-r from-slate-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"><Filter size={14}/> تصفية المسار</div>
          <div className="flex flex-wrap gap-2">
            <Button variant={filter==='all' ? 'primary':'secondary'} className="!py-1.5 !px-3 text-xs" onClick={() => setFilter('all')}>كلاهما</Button>
            <Button variant={filter==='inquiry' ? 'primary':'secondary'} className="!py-1.5 !px-3 text-xs" onClick={() => setFilter('inquiry')}>استعلامات</Button>
            <Button variant={filter==='complaint' ? 'primary':'secondary'} className="!py-1.5 !px-3 text-xs" onClick={() => setFilter('complaint')}>شكاوى</Button>
            <Button variant="secondary" className="!py-1.5 !px-3 text-xs" onClick={exportAsPng}>📤 PNG</Button>
            <Button variant="secondary" className="!py-1.5 !px-3 text-xs" onClick={exportAsPdf}>📄 PDF</Button>
          </div>
        </div>
        <div className="flex-1">
          <ReactFlow 
            nodes={nodesState} 
            edges={edgesState} 
            onNodesChange={onNodesChange} 
            onEdgesChange={onEdgesChange} 
            onNodeClick={onNodeClick} 
            fitView
            style={{ backgroundColor: isDarkMode ? '#111827' : '#ffffff' }}
          >
            <MiniMap 
              pannable 
              zoomable 
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
            <Background 
              gap={20} 
              color={isDarkMode ? '#374151' : '#e5e7eb'} 
              size={1}
            />
          </ReactFlow>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-3 space-y-3">
        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-sm">دليل الاستخدام</h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-2">يوضح هذا المخطط الفروقات التشغيلية بين مسار الاستعلام ومسار الشكوى من لحظة الاستقبال حتى الإغلاق.</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="secondary">⏱ SLA</Badge>
            <Badge variant="secondary">RCA</Badge>
            <Badge variant="secondary">تصعيد</Badge>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">استخدم الفلاتر أعلى اليسار للتركيز على مسار محدد.</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-sm flex items-center gap-1"><Info size={14}/> تفاصيل الخطوة</h3>
          {selected ? <StepDetails id={selected}/> : <p className="text-xs text-gray-500">اختر عقدة...</p>}
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-sm">اختبارات سلامة المخطط</h3>
          <div className="space-y-1">
            {tests.map((t,i) => (
              <div key={i} className="flex items-start gap-1 text-[11px]">
                {t.pass ? <CheckCircle2 size={14} className="text-green-600"/> : <XCircle size={14} className="text-red-600"/>}
                <div>{t.name}{t.detail && <span className="text-gray-500"> — {t.detail}</span>}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-sm">إعدادات SLA والفرق</h3>
          <ul className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed space-y-1 mb-2">
            <li>استعلام: استجابة {CONFIG.sla.inquiry_first_response} / حل {CONFIG.sla.inquiry_resolution}</li>
            <li>شكوى P1: استجابة {CONFIG.sla.complaint_p1_response} / حل {CONFIG.sla.complaint_p1_resolution}</li>
            <li>شكوى P2: استجابة {CONFIG.sla.complaint_p2_response} / حل {CONFIG.sla.complaint_p2_resolution}</li>
          </ul>
          <div className="flex flex-wrap gap-1">
            {CONFIG.teams.map(t => <Badge key={t} variant="outline" className="text-[10px] px-2 py-0.5">{t}</Badge>)}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InquiryComplaintFlowchart;
