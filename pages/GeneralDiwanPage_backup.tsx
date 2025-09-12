import React, { useEffect, useMemo, useRef, useState } from 'react';
import Card from '../components/ui/Card';
import Mermaid from '../components/Mermaid';
import { DIWAN_WORKFLOW_DIAGRAM } from '../diagrams/diwan';
import Button from '../components/ui/Button';

const GeneralDiwanPage: React.FC<{ 
  defaultDepartment?: string; 
  title?: string; 
  description?: string; 
}> = ({ defaultDepartment, title = 'إدارة الديوان العام', description = 'إدارة الوثائق والمحاضر الإدارية' }) => {
  const [tab, setTab] = useState<'workflow' | 'responsibilities' | 'mailbox'>('workflow');
  const [activePanel, setActivePanel] = useState<null | 'doc' | 'research' | 'archive' | 'inbox' | 'outbox'>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showResponsibilitiesModal, setShowResponsibilitiesModal] = useState(false);
  const workflowContainerRef = useRef<HTMLDivElement | null>(null);

  // Stats state
  const [docStats, setDocStats] = useState<{ 
    total: number; 
    approved: number; 
    byType: Record<'محضر'|'تقرير'|'خطاب'|'تعميم'|'كتاب رسمي', number>;
    byPriority: Record<'عادي'|'هام'|'عاجل'|'سري', number>;
    recent: number;
  }>({ 
    total: 0, 
    approved: 0, 
    byType: { 'محضر': 0, 'تقرير': 0, 'خطاب': 0, 'تعميم': 0, 'كتاب رسمي': 0 },
    byPriority: { 'عادي': 0, 'هام': 0, 'عاجل': 0, 'سري': 0 },
    recent: 0
  });
  const [researchStats, setResearchStats] = useState<{ total: number; week: number }>({ total: 0, week: 0 });
  const [archiveStats, setArchiveStats] = useState<{ total: number; permanent: number; destroySoon: number }>({ total: 0, permanent: 0, destroySoon: 0 });
  const [mailStats, setMailStats] = useState<{ 
    inbox: { total: number; unread: number; fromGeneral: number; fromRequests: number; fromContact: number };
    outbox: { total: number; pending: number; sent: number; draft: number };
  }>({
    inbox: { total: 0, unread: 0, fromGeneral: 0, fromRequests: 0, fromContact: 0 },
    outbox: { total: 0, pending: 0, sent: 0, draft: 0 }
  });

  const recomputeStats = () => {
    try {
      const docs = JSON.parse(localStorage.getItem('diwanDocs') || '[]') as Array<{ 
        type: 'محضر'|'تقرير'|'خطاب'|'تعميم'|'كتاب رسمي'; 
        approved: boolean; 
        dateISO: string;
        priority?: 'عادي'|'هام'|'عاجل'|'سري';
      }>;
      
      const byType: Record<'محضر'|'تقرير'|'خطاب'|'تعميم'|'كتاب رسمي', number> = { 'محضر': 0, 'تقرير': 0, 'خطاب': 0, 'تعميم': 0, 'كتاب رسمي': 0 };
      const byPriority: Record<'عادي'|'هام'|'عاجل'|'سري', number> = { 'عادي': 0, 'هام': 0, 'عاجل': 0, 'سري': 0 };
      
      let approved = 0;
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7*24*60*60*1000);
      let recent = 0;
      
      docs.forEach(d => { 
        byType[d.type] = (byType[d.type] || 0) + 1; 
        byPriority[d.priority || 'عادي'] = (byPriority[d.priority || 'عادي'] || 0) + 1;
        if (d.approved) approved++;
        if (new Date(d.dateISO) >= last7Days) recent++;
      });
      
      setDocStats({ total: docs.length, approved, byType, byPriority, recent });
    } catch { /* ignore */ }

    try {
      const research = JSON.parse(localStorage.getItem('diwanResearch') || '[]') as Array<{ dateISO: string }>;
      const total = research.length;
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7*24*60*60*1000);
      const week = research.filter(r => { const d = new Date(r.dateISO); return d >= weekAgo; }).length;
      setResearchStats({ total, week });
    } catch { /* ignore */ }

    try {
      const archive = JSON.parse(localStorage.getItem('diwanArchive') || '[]') as Array<{ retention: string; destroyAt?: string }>;
      const total = archive.length;
      const permanent = archive.filter(a => a.retention === 'دائم').length;
      const now = new Date();
      const in30 = new Date(now.getTime() + 30*24*60*60*1000);
      const destroySoon = archive.filter(a => a.destroyAt && new Date(a.destroyAt) <= in30).length;
      setArchiveStats({ total, permanent, destroySoon });
    } catch { /* ignore */ }

    // حساب إحصائيات البريد
    try {
      const storageKey = defaultDepartment ? `diwanInbox_${defaultDepartment.replace(/\s/g, '_')}` : 'diwanInbox';
      const inbox = JSON.parse(localStorage.getItem(storageKey) || '[]') as Array<{ 
        source: 'الطلبات' | 'الشكاوى' | 'تواصل معنا'; 
        read: boolean;
      }>;
      const outboxKey = defaultDepartment ? `diwanOutbox_${defaultDepartment.replace(/\s/g, '_')}` : 'diwanOutbox';
      const outbox = JSON.parse(localStorage.getItem(outboxKey) || '[]') as Array<{ 
        status: 'مسودة' | 'قيد الإرسال' | 'مرسل';
      }>;
      
      setMailStats({
        inbox: {
          total: inbox.length,
          unread: inbox.filter(m => !m.read).length,
          fromGeneral: 0, // لا يوجد بريد من الديوان العام
          fromRequests: inbox.filter(m => m.source === 'الطلبات').length,
          fromContact: inbox.filter(m => m.source === 'تواصل معنا').length
        },
        outbox: {
          total: outbox.length,
          pending: outbox.filter(m => m.status === 'قيد الإرسال').length,
          sent: outbox.filter(m => m.status === 'مرسل').length,
          draft: outbox.filter(m => m.status === 'مسودة').length
        }
      });
    } catch { /* ignore */ }
  };

  useEffect(() => { recomputeStats(); }, []);

  const downloadText = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateClassificationId = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0,10).replace(/-/g, '');
    const timePart = now.toTimeString().slice(0,8).replace(/:/g, '');
    const rand = Math.random().toString(36).slice(2,6).toUpperCase();
    return `ECM-${datePart}-${timePart}-${rand}`;
  };
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1.5 rounded border text-sm transition ${tab === 'workflow' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            onClick={() => { setTab('workflow'); setShowWorkflowModal(true); }}
          >
            مخطط سير العمل
          </button>
          <button
            className={`px-3 py-1.5 rounded border text-sm transition ${tab === 'responsibilities' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            onClick={() => { setTab('responsibilities'); setShowResponsibilitiesModal(true); }}
          >
            مسؤوليات الديوان
          </button>
          <button
            className={`px-3 py-1.5 rounded border text-sm transition ${tab === 'mailbox' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            onClick={() => setTab('mailbox')}
          >
            صندوق البريد
          </button>
        </div>
      </div>
      {/* Responsibility Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Documentation */}
        <div
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-4 cursor-pointer hover:shadow-md hover:bg-white/80 dark:hover:bg-gray-800/80 transition"
          role="button"
          tabIndex={0}
          onClick={() => setActivePanel('doc')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePanel('doc'); } }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-500 flex items-center justify-center text-xl">✎</div>
              <h3 className="mt-2 font-semibold">التوثيق</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">إعداد المحاضر والتقارير والخطابات وتوحيد النماذج واعتماد المعلومات.</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">الإجمالي {docStats.total}</span>
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">المعتمدة {docStats.approved}</span>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">الأسبوع {docStats.recent}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200">محاضر {docStats.byType['محضر']}</span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200">تقارير {docStats.byType['تقرير']}</span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200">خطابات {docStats.byType['خطاب']}</span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200">تعاميم {docStats.byType['تعميم']}</span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200">كتب رسمية {docStats.byType['كتاب رسمي']}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1 text-xs">
                {docStats.byPriority['عاجل'] > 0 && <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">عاجل {docStats.byPriority['عاجل']}</span>}
                {docStats.byPriority['سري'] > 0 && <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">سري {docStats.byPriority['سري']}</span>}
                {docStats.byPriority['هام'] > 0 && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">هام {docStats.byPriority['هام']}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Research */}
        <div
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-4 cursor-pointer hover:shadow-md hover:bg-white/80 dark:hover:bg-gray-800/80 transition"
          role="button"
          tabIndex={0}
          onClick={() => setActivePanel('research')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePanel('research'); } }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="w-10 h-10 rounded-full bg-emerald-600/10 text-emerald-500 flex items-center justify-center text-xl">🔎</div>
              <h3 className="mt-2 font-semibold">البحث</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">جمع البيانات وتحليلها وإجراء المقارنات وتوفير مذكرات معلوماتية.</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">المذكرات {researchStats.total}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">هذا الأسبوع {researchStats.week}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Archiving */}
        <div
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-4 cursor-pointer hover:shadow-md hover:bg-white/80 dark:hover:bg-gray-800/80 transition"
          role="button"
          tabIndex={0}
          onClick={() => setActivePanel('archive')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePanel('archive'); } }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl">🗂️</div>
              <h3 className="mt-2 font-semibold">الأرشفة</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">تنظيم وحفظ السجلات وسياسات الاحتفاظ والإتلاف والاسترجاع السريع.</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">السجلات {archiveStats.total}</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">دائم {archiveStats.permanent}</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">إتلاف قريب {archiveStats.destroySoon}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* إضافة كارتات البريد */}
      {tab === 'mailbox' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* البريد الوارد */}
          <div
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-4 cursor-pointer hover:shadow-md hover:bg-white/80 dark:hover:bg-gray-800/80 transition"
            role="button"
            tabIndex={0}
            onClick={() => setActivePanel('inbox')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePanel('inbox'); } }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="w-10 h-10 rounded-full bg-green-600/10 text-green-500 flex items-center justify-center text-xl">📥</div>
                <h3 className="mt-2 font-semibold">البريد الوارد</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">رسائل واردة من الطلبات والشكاوى وتواصل معنا.</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">الإجمالي {mailStats.inbox.total}</span>
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">غير مقروءة {mailStats.inbox.unread}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">الطلبات {mailStats.inbox.fromRequests}</span>
                  <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">تواصل معنا {mailStats.inbox.fromContact}</span>
                </div>
              </div>
            </div>
          </div>

          {/* البريد الصادر */}
          <div
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-4 cursor-pointer hover:shadow-md hover:bg-white/80 dark:hover:bg-gray-800/80 transition"
            role="button"
            tabIndex={0}
            onClick={() => setActivePanel('outbox')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePanel('outbox'); } }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="w-10 h-10 rounded-full bg-indigo-600/10 text-indigo-500 flex items-center justify-center text-xl">📤</div>
                <h3 className="mt-2 font-semibold">البريد الصادر</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">إدارة الرسائل الصادرة والمسودات والمراسلات الرسمية.</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">الإجمالي {mailStats.outbox.total}</span>
                  <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">قيد الإرسال {mailStats.outbox.pending}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200">مسودات {mailStats.outbox.draft}</span>
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">مرسلة {mailStats.outbox.sent}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* محتويات تبويب مخطط سير العمل ومسؤوليات الديوان تعرض الآن عبر نوافذ منبثقة من الأزرار أعلى الصفحة */}

      {/* Inline fixed panel for cards */}
      {activePanel && (
        <div
          className="relative mt-2 rounded-xl overflow-hidden border border-white/20 bg-white/90 dark:bg-gray-900/90 shadow-xl h-auto"
          role="dialog"
          aria-modal="false"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95">
            <h3 className="text-base font-semibold">
              {activePanel === 'doc' && 'وحدة التوثيق'}
              {activePanel === 'research' && 'وحدة البحث'}
              {activePanel === 'archive' && 'وحدة الأرشفة'}
              {activePanel === 'inbox' && 'البريد الوارد'}
              {activePanel === 'outbox' && 'البريد الصادر'}
            </h3>
            <button
              className="w-8 h-8 rounded hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="إغلاق"
              onClick={() => setActivePanel(null)}
            >
              ✕
            </button>
          </div>
          <div className="p-0">
            {activePanel === 'doc' && (
              <DocumentationTool 
                onDownload={downloadText} 
                onSaved={recomputeStats} 
                defaultDepartment={defaultDepartment}
              />
            )}
            {activePanel === 'research' && (
              <ResearchTool onDownload={downloadText} onSaved={recomputeStats} />
            )}
            {activePanel === 'archive' && (
              <ArchiveTool onDownload={downloadText} generateClassificationId={generateClassificationId} onSaved={recomputeStats} />
            )}
            {activePanel === 'inbox' && (
              <InboxTool onSaved={recomputeStats} department={defaultDepartment} />
            )}
            {activePanel === 'outbox' && (
              <OutboxTool onDownload={downloadText} onSaved={recomputeStats} department={defaultDepartment} />
            )}
          </div>
        </div>
      )}
      {/* Workflow Popup */}
      {showWorkflowModal && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowWorkflowModal(false)}>
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[94vw] max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-xl overflow-hidden border border-white/20 bg-white dark:bg-gray-900 shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold">مخطط سير العمل</h3>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={async () => {
                      try {
                        const container = workflowContainerRef.current;
                        if (!container) return;
                        const svgEl = container.querySelector('svg');
                        if (!svgEl) return;
                        const { jsPDF } = await import('jspdf');
                        await import('svg2pdf.js');
                        const svgWidth = svgEl.viewBox.baseVal.width || svgEl.getBoundingClientRect().width;
                        const svgHeight = svgEl.viewBox.baseVal.height || svgEl.getBoundingClientRect().height;
                        const orientation = svgWidth > svgHeight ? 'l' : 'p';
                        const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        const scale = Math.min(pageWidth / svgWidth, pageHeight / svgHeight) * 0.95;
                        // @ts-ignore svg2pdf global plugin augments jsPDF
                        pdf.svg(svgEl as any, { x: (pageWidth - svgWidth * scale) / 2, y: 20, width: svgWidth * scale, height: svgHeight * scale });
                        pdf.save(`مخطط-سير-العمل-${new Date().toISOString().slice(0,10)}.pdf`);
                      } catch (e) {
                        alert('تعذر توليد ملف PDF للمخطط');
                      }
                    }}
                  >
                    تنزيل PDF
                  </button>
                  <button className="w-8 h-8 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setShowWorkflowModal(false)}>✕</button>
                </div>
              </div>
              <div className="p-4 max-h-[78vh] overflow-auto">
                <div ref={workflowContainerRef} className="rounded border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                  <Mermaid chart={DIWAN_WORKFLOW_DIAGRAM} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsibilities Popup */}
      {showResponsibilitiesModal && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowResponsibilitiesModal(false)}>
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[92vw] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-xl overflow-hidden border border-white/20 bg-white dark:bg-gray-900 shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold">مسؤوليات الديوان</h3>
                <button className="w-8 h-8 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setShowResponsibilitiesModal(false)}>✕</button>
              </div>
              <div className="p-4 space-y-6 max-h-[78vh] overflow-auto">
                <p className="text-gray-600 dark:text-gray-400">تتولى إدارة الديوان العام مسؤولية التوثيق والبحث والأرشفة على النحو الآتي:</p>
                <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                  <h3 className="text-lg font-semibold mb-2">التوثيق</h3>
                  <ul className="list-disc pr-5 space-y-1 text-gray-700 dark:text-gray-200">
                    <li>إعداد المحاضر والتقارير والخطابات.</li>
                    <li>توحيد النماذج.</li>
                    <li>ضمان دقة المعلومات واعتمادها.</li>
                  </ul>
                </section>
                <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                  <h3 className="text-lg font-semibold mb-2">البحث</h3>
                  <ul className="list-disc pr-5 space-y-1 text-gray-700 dark:text-gray-200">
                    <li>جمع البيانات وتحليلها.</li>
                    <li>إجراء الدراسات والمقارنات.</li>
                    <li>توفير المذكرات المعلوماتية لدعم القرار.</li>
                  </ul>
                </section>
                <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                  <h3 className="text-lg font-semibold mb-2">الأرشفة</h3>
                  <ul className="list-disc pr-5 space-y-1 text-gray-700 dark:text-gray-200">
                    <li>تنظيم وحفظ السجلات ورقمنتها.</li>
                    <li>وضع سياسات الاحتفاظ والإتلاف.</li>
                    <li>تسهيل الاسترجاع السريع للمعلومات.</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
  {/* Archive modal removed; handled by inline panel above */}
    </Card>
  );
};

// Download Button Component with Dropdown
interface DownloadButtonProps {
  onWordDownload: () => void;
  onPDFDownload: () => void;
  disabled?: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ onWordDownload, onPDFDownload, disabled }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleDownloadOption = (type: 'word' | 'pdf') => {
    setShowDropdown(false);
    if (type === 'word') {
      onWordDownload();
    } else {
      onPDFDownload();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled}
        className={`
          group flex items-center gap-3 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-md
          ${disabled 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-lg hover:scale-105 active:scale-95'
          }
        `}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <span>تنزيل الوثيقة</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''} ${!disabled && 'group-hover:scale-110'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && !disabled && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 bg-white/90 dark:bg-gray-800/90">
            <button
              onClick={() => handleDownloadOption('word')}
              className="w-full flex items-center gap-4 px-4 py-3 text-right hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 transition-all duration-200 rounded-lg group border border-transparent hover:border-blue-200 dark:hover:border-blue-700"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center text-sm font-bold shadow-md group-hover:shadow-lg transition-shadow border border-blue-200 dark:border-blue-700">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">مستند Word</div>
                <div className="text-xs text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">ملف .doc قابل للتحرير والتعديل</div>
              </div>
              <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <div className="my-3 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
            
            <button
              onClick={() => handleDownloadOption('pdf')}
              className="w-full flex items-center gap-4 px-4 py-3 text-right hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/30 dark:hover:to-red-800/30 transition-all duration-200 rounded-lg group border border-transparent hover:border-red-200 dark:hover:border-red-700"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center text-xs font-bold shadow-md group-hover:shadow-lg transition-shadow border border-red-200 dark:border-red-700">
                PDF
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">مستند PDF</div>
                <div className="text-xs text-gray-600 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">ملف محمي وجاهز للطباعة والأرشفة</div>
              </div>
              <svg className="w-4 h-4 text-gray-500 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Enhanced overlay with backdrop blur effect */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

// Documentation Tool Component
const DocumentationTool: React.FC<{ 
  onDownload: (filename: string, content: string) => void; 
  onSaved?: () => void;
  defaultDepartment?: string;
}> = ({ onDownload, onSaved, defaultDepartment }) => {
  // Helper functions for Arabic numerals and dates
  const convertToArabicNumerals = (text: string | number) => {
    const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
  };

  const formatGregorianDateText = (date: Date) => {
    const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
    const day = convertToArabicNumerals(date.getDate().toString());
    const month = months[date.getMonth()];
    const year = convertToArabicNumerals(date.getFullYear().toString());
    return `${day} ${month} ${year}`;
  };

  // More accurate Hijri date conversion
  const formatHijriDate = (date: Date) => {
    // Hijri conversion formula (more accurate)
    const gregorianYear = date.getFullYear();
    const gregorianMonth = date.getMonth() + 1;
    const gregorianDay = date.getDate();
    
    // Convert Gregorian to Julian Day Number
    let a = Math.floor((14 - gregorianMonth) / 12);
    let y = gregorianYear - a;
    let m = gregorianMonth + 12 * a - 3;
    let jd = gregorianDay + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + 1721119;
    
    // Convert Julian Day to Hijri
    jd = Math.floor(jd - 0.5) + 0.5;
    let l = jd - 1948439.5;
    let n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    let j = (Math.floor((10985 - l) / 5316)) * (Math.floor(((50 * l) / 17719))) + (Math.floor(l / 5670)) * (Math.floor(((43 * l) / 15238)));
    l = l - (Math.floor((30 - j) / 15)) * (Math.floor(((17719 * j) / 50))) - (Math.floor(j / 16)) * (Math.floor(((15238 * j) / 43))) + 29;
    m = Math.floor((24 * l) / 709);
    let d = l - Math.floor((709 * m) / 24);
    y = 30 * n + j - 30;

    const hijriMonths = [
      'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
      'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];
    
    const hijriDay = convertToArabicNumerals(Math.floor(d));
    const hijriYear = convertToArabicNumerals(Math.floor(y));
    const monthName = hijriMonths[Math.floor(m) - 1] || hijriMonths[0];
    
    return `${hijriDay} ${monthName} ${hijriYear}هـ`;
  };

  // دالة تنسيق التاريخ الشامل (هجري وميلادي)
  const getFormattedDate = () => {
    const today = new Date();
    const hijriDate = formatHijriDate(today);
    const gregorianDate = formatGregorianDateText(today);
    return `${hijriDate} الموافق لـ ${gregorianDate}م`;
  };

  const [docType, setDocType] = useState<'محضر' | 'تقرير' | 'خطاب' | 'تعميم' | 'كتاب رسمي'>('محضر');
  const [template, setTemplate] = useState<'نموذج موحّد' | 'مخصص'>('نموذج موحّد');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [department, setDepartment] = useState(defaultDepartment || '');
  const [author, setAuthor] = useState('');
  const [responsibleEmployee, setResponsibleEmployee] = useState('');
  const [participants, setParticipants] = useState('');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [diwanNumber, setDiwanNumber] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [approved, setApproved] = useState(false);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number; data: string; type: string }>>([]);
  const [priority, setPriority] = useState<'عادي' | 'هام' | 'عاجل' | 'سري'>('عادي');
  const [errors, setErrors] = useState<string[]>([]);
  const [sentToDepartments, setSentToDepartments] = useState<string[]>([]);

  // حقول جديدة محسنة للتوثيق
  const [recipientName, setRecipientName] = useState(''); // اسم المستلم
  const [recipientPosition, setRecipientPosition] = useState(''); // منصب المستلم
  const [referenceNumber, setReferenceNumber] = useState(''); // رقم المرجع
  const [urgencyLevel, setUrgencyLevel] = useState<'عادي' | 'مستعجل' | 'عاجل جداً'>('عادي'); // مستوى الاستعجال
  const [followUpRequired, setFollowUpRequired] = useState(false); // يتطلب متابعة
  const [followUpDate, setFollowUpDate] = useState(''); // تاريخ المتابعة المطلوبة
  const [confidentialityLevel, setConfidentialityLevel] = useState<'عام' | 'محدود' | 'سري' | 'سري جداً'>('عام'); // مستوى السرية
  const [keywords, setKeywords] = useState(''); // كلمات مفتاحية للبحث
  const [relatedDocuments, setRelatedDocuments] = useState(''); // وثائق ذات صلة
  const [actionRequired, setActionRequired] = useState(''); // إجراء مطلوب
  const [deadline, setDeadline] = useState(''); // الموعد النهائي
  const [budgetAmount, setBudgetAmount] = useState(''); // المبلغ المالي (إن وجد)
  const [legalReference, setLegalReference] = useState(''); // المرجع القانوني

  // قائمة الأقسام المتاحة - الهيكل الإداري الفعلي
  const availableDepartments = [
    'قسم الإدارة العامة',
    'قسم الدخل',
    'قسم كبار ومتوسطي المكلفين',
    'قسم المتابعة وإدارة الديون',
    'قسم الواردات',
    'قسم الرقابة الداخلية',
    'قسم المعلوماتية',
    'قسم التنمية الإدارية',
    'قسم الاستعلام',
    'قسم الخزينة'
  ];

  // مستويات الأولوية المحسنة
  const priorityLevels = [
    { value: 'عادي', color: '#10b981', label: 'عادي' },
    { value: 'هام', color: '#f59e0b', label: 'هام' },
    { value: 'عاجل', color: '#ef4444', label: 'عاجل' },
    { value: 'سري', color: '#8b5cf6', label: 'سري' }
  ];

  // الجهات الصادرة المتاحة - حسب الهيكل الإداري الفعلي
  const issuingAuthorities = [
    'مكتب المدير العام',
    'قسم الإدارة العامة',
    'قسم الدخل',
    'قسم كبار ومتوسطي المكلفين',
    'قسم المتابعة وإدارة الديون',
    'قسم الواردات',
    'قسم الرقابة الداخلية',
    'قسم المعلوماتية',
    'قسم التنمية الإدارية',
    'قسم الاستعلام',
    'قسم الخزينة',
    'دائرة خدمة الجمهور والنافذة الواحدة',
    'دائرة مكتب المدير',
    'دائرة الشؤون القانونية',
    'دائرة الموارد البشرية',
    'دائرة الشؤون المالية والإدارية'
  ];

  // دالة تحديد نص حقل الرقم
  const getDocNumberLabel = () => {
    switch (docType) {
      case 'محضر': return 'رقم المحضر';
      case 'تقرير': return 'رقم التقرير';
      case 'خطاب': return 'رقم الخطاب';
      case 'تعميم': return 'رقم التعميم';
      case 'كتاب رسمي': return 'رقم الكتاب الرسمي';
      default: return 'رقم المستند';
    }
  };

  // الحصول على قائمة الأقسام من localStorage
  const getDepartmentsList = () => {
    try {
      const stored = localStorage.getItem('departmentsList');
      if (stored) {
        const departments = JSON.parse(stored);
        return departments.map((dept: any) => dept.name);
      }
    } catch (error) {
      console.error('Error reading departments:', error);
    }
    
    // قائمة افتراضية في حالة عدم وجود بيانات
    return [
      'قسم الإدارة العامة',
      'قسم الدخل',
      'قسم كبار ومتوسطي المكلفين',
      'قسم المتابعة وإدارة الديون',
      'قسم الواردات',
      'قسم الرقابة الداخلية',
      'قسم المعلوماتية',
      'قسم التنمية الإدارية',
      'قسم الاستعلام',
      'قسم الخزينة'
    ];
  };

  // دوال إدارة الأقسام المرسل إليها
  const handleDepartmentToggle = (departmentName: string) => {
    setSentToDepartments(prev => {
      if (prev.includes(departmentName)) {
        return prev.filter(d => d !== departmentName);
      } else {
        return [...prev, departmentName];
      }
    });
  };

  const handleSelectAllDepartments = () => {
    const allDepartments = getDepartmentsList();
    setSentToDepartments(allDepartments);
  };

  const handleClearAllDepartments = () => {
    setSentToDepartments([]);
  };
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [editableTemplates, setEditableTemplates] = useState<{[key: string]: string}>({});
  const [templateName, setTemplateName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [contentHeight, setContentHeight] = useState(120); // الارتفاع الافتراضي
  const [docId, setDocId] = useState(() => `DOC-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`);

  // إدارة النفاذ والتعديلات والتصنيفات
  const [accessUsers, setAccessUsers] = useState<Array<{
    name: string;
    role: 'قراءة' | 'كتابة' | 'مدير';
    department: string;
    dateAdded: string;
  }>>([]);
  
  const [revisions, setRevisions] = useState<Array<{
    version: string;
    author: string;
    date: string;
    changes: string;
    type: 'تعديل جزئي' | 'تعديل شامل' | 'مراجعة' | 'تصحيح';
  }>>([]);
  
  const [classifications, setClassifications] = useState<Array<{
    category: string;
    level: 'عام' | 'محدود' | 'سري' | 'سري جداً';
    tags: string[];
    validUntil: string;
  }>>([]);

  const generateId = () => {
    setDocId(`DOC-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`);
  };

  // دوال إدارة النفاذ
  const addAccessUser = (name: string, role: 'قراءة' | 'كتابة' | 'مدير', department: string) => {
    const newUser = {
      name,
      role,
      department,
      dateAdded: new Date().toISOString()
    };
    setAccessUsers(prev => [...prev, newUser]);
  };

  const removeAccessUser = (index: number) => {
    setAccessUsers(prev => prev.filter((_, i) => i !== index));
  };

  // دوال إدارة التعديلات
  const addRevision = (changes: string, type: 'تعديل جزئي' | 'تعديل شامل' | 'مراجعة' | 'تصحيح') => {
    const newRevision = {
      version: `v${revisions.length + 1}.${Math.floor(Math.random() * 10)}`,
      author: author || 'غير محدد',
      date: new Date().toISOString(),
      changes,
      type
    };
    setRevisions(prev => [...prev, newRevision]);
  };

  // دوال إدارة التصنيفات
  const addClassification = (category: string, level: 'عام' | 'محدود' | 'سري' | 'سري جداً', tags: string[], validUntil: string) => {
    const newClassification = {
      category,
      level,
      tags,
      validUntil
    };
    setClassifications(prev => [...prev, newClassification]);
  };

  const removeClassification = (index: number) => {
    setClassifications(prev => prev.filter((_, i) => i !== index));
  };

  // QR Code generation
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Messaging states
  const [showMessagingModal, setShowMessagingModal] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messagePriority, setMessagePriority] = useState<'عادي' | 'هام' | 'عاجل'>('عادي');
  
  const generateQR = async (text: string) => {
    try {
      // Using a simple online QR service as fallback
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(text)}`;
      setQrDataUrl(qrUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            const fileData = {
              name: file.name,
              size: file.size,
              data: result,
              type: file.type
            };
            setUploadedFiles(prev => [...prev, fileData]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const downloadFile = (file: { name: string; data: string }) => {
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    generateQR(docId);
  }, [docId]);

  const copyDocId = () => {
    navigator.clipboard.writeText(docId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const sendMessage = () => {
    if (!messageSubject.trim() || selectedDepartments.length === 0) {
      alert('يرجى تعبئة موضوع الرسالة واختيار قسم واحد على الأقل');
      return;
    }

    const messageData = {
      id: `MSG-${Date.now()}`,
      documentId: docId,
      documentType: docType,
      documentTitle: title,
      subject: messageSubject,
      body: messageBody,
      priority: messagePriority,
      toDepartments: selectedDepartments,
      fromDepartment: department || 'الديوان العام',
      sender: author || 'غير محدد',
      timestamp: new Date().toISOString(),
      status: 'مرسل',
      attachedDocument: {
        id: docId,
        type: docType,
        title: title,
        content: content
      }
    };

    try {
      // Save to internal messaging system
      const existingMessages = JSON.parse(localStorage.getItem('internalMessages') || '[]');
      existingMessages.unshift(messageData);
      localStorage.setItem('internalMessages', JSON.stringify(existingMessages));

      // Create notification for each department
      selectedDepartments.forEach(dept => {
        const notification = {
          id: `NOTIF-${Date.now()}-${dept}`,
          type: 'document_message',
          title: `مراسلة جديدة: ${messageSubject}`,
          message: `تم استلام مراسلة من ${department || 'الديوان العام'} بخصوص الوثيقة: ${title}`,
          department: dept,
          priority: messagePriority,
          timestamp: new Date().toISOString(),
          read: false,
          relatedDocumentId: docId
        };

        const existingNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        existingNotifications.unshift(notification);
        localStorage.setItem('notifications', JSON.stringify(existingNotifications));
      });

      alert(`تم إرسال المراسلة بنجاح إلى ${selectedDepartments.length} قسم`);
      
      // Reset messaging form
      setShowMessagingModal(false);
      setSelectedDepartments([]);
      setMessageSubject('');
      setMessageBody('');
      setMessagePriority('عادي');
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('حدث خطأ في إرسال المراسلة. يرجى المحاولة مرة أخرى.');
    }
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev => 
      prev.includes(dept) 
        ? prev.filter(d => d !== dept)
        : [...prev, dept]
    );
  };

  const templates = {
    'محضر': `محضر اجتماع

    التاريخ: ${(() => {
      const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
      const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
      const date = new Date(docDate);
      const day = convertToArabic(date.getDate().toString());
      const month = months[date.getMonth()];
      const year = convertToArabic(date.getFullYear().toString());
      return `${day} ${month} ${year}`;
    })()}
    الوقت: ${(() => {
      const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
      const now = new Date();
      const hour = convertToArabic(now.getHours().toString().padStart(2, '0'));
      const minute = convertToArabic(now.getMinutes().toString().padStart(2, '0'));
      
      // تحديد فترة النهار
      const hours24 = now.getHours();
      let period = '';
      if (hours24 >= 6 && hours24 < 12) {
        period = 'صباحاً';
      } else if (hours24 >= 12 && hours24 < 17) {
        period = 'ظهراً';
      } else if (hours24 >= 17 && hours24 < 20) {
        period = 'مساءً';
      } else {
        period = 'ليلاً';
      }
      
      return `${hour}:${minute} ${period}`;
    })()}
    رقم الديوان: ${diwanNumber || '[رقم الديوان]'}
    رقم الوثيقة: ${docId}
    المكان: [مكان الاجتماع]
    
    الحضور:
    - ${participants || '[أسماء الحضور]'}
    
    جدول الأعمال:
    1. [بند أول]
    2. [بند ثاني]
    3. [بند ثالث]
    
    المناقشات والقرارات:
    [تفاصيل المناقشات والقرارات المتخذة]
    
    التوصيات:
    - [توصية أولى]
    - [توصية ثانية]
    
    الإجراءات التالية:
    - [إجراء أول] - المسؤول: [الاسم] - الموعد: [التاريخ]
    - [إجراء ثاني] - المسؤول: [الاسم] - الموعد: [التاريخ]`,
    
    'تقرير': `تقرير ${subtitle || '[موضوع التقرير]'}

    التاريخ: ${new Date(docDate).toLocaleDateString('ar-SY-u-nu-latn')}
    رقم الديوان: ${diwanNumber || '[رقم الديوان]'}
    رقم التقرير: ${docId}
    إعداد: ${author || '[اسم المُعد]'}
    الجهة الصادرة: ${department || '[اسم الجهة الصادرة]'}

    الملخص التنفيذي:
    [ملخص مختصر للنقاط الرئيسية والتوصيات]
    
    المقدمة:
    [خلفية الموضوع والهدف من التقرير]
    
    المنهجية:
    [الطرق المستخدمة في جمع وتحليل البيانات]
    
    النتائج الرئيسية:
    1. [نتيجة أولى]
    2. [نتيجة ثانية]
    3. [نتيجة ثالثة]
    
    التحليل والمناقشة:
    [تحليل مفصل للنتائج ومناقشة الآثار]
    
    التوصيات:
    1. [توصية أولى] - الأولوية: [عالية/متوسطة/منخفضة]
    2. [توصية ثانية] - الأولوية: [عالية/متوسطة/منخفضة]
    
    الخاتمة:
    [خلاصة نهائية والخطوات التالية]`,
    
    'خطاب': `خطاب ${priority !== 'عادي' ? `[${priority}]` : ''}

    ${department || '[الجهة المرسلة]'}
    
    التاريخ: ${(() => {
      const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
      const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
      const date = new Date(docDate);
      const day = convertToArabic(date.getDate().toString());
      const month = months[date.getMonth()];
      const year = convertToArabic(date.getFullYear().toString());
      return `${day} ${month} ${year}`;
    })()}
    رقم الديوان: ${diwanNumber || '[رقم الديوان]'}
    رقم الخطاب: ${docId}
    
    إلى: [الجهة المرسل إليها]
    من: ${department || '[الجهة المرسلة]'}
    الموضوع: ${subtitle || '[موضوع الخطاب]'}
    
    تحية طيبة وبعد،
    
    [نص الخطاب الرئيسي]
    
    [الطلب أو التوضيح المطلوب]
    
    شاكرين لكم حسن تعاونكم،
    
    مع فائق الاحترام والتقدير
    
    ${author || '[اسم المرسل]'}
    ${department || '[المنصب/الجهة الصادرة]'}`,
    
    'تعميم': `تعميم ${priority !== 'عادي' ? `[${priority}]` : ''}

    ${department || '[اسم الجهة/الوزارة]'}
    
    التاريخ: ${(() => {
      const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
      const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
      const date = new Date(docDate);
      const day = convertToArabic(date.getDate().toString());
      const month = months[date.getMonth()];
      const year = convertToArabic(date.getFullYear().toString());
      return `${day} ${month} ${year}`;
    })()}
    رقم الديوان: ${diwanNumber || '[رقم الديوان]'}
    رقم التعميم: ${docId}
    الموضوع: ${subtitle || '[موضوع التعميم]'}
    
    إلى: جميع [الجهات المعنية/الأقسام/الموظفين]
    
    تحية طيبة وبعد،
    
    [السياق والخلفية]
    
    بناءً على [القرار/التوجيه/القانون المرجعي]، ونظراً لـ [الحاجة/الضرورة]، يُعمم على الجميع ما يلي:
    
    أولاً: [البند الأول من التعميم]
    
    ثانياً: [البند الثاني من التعميم]
    
    ثالثاً: [البند الثالث من التعميم]
    
    التزامات ومسؤوليات:
    - [الالتزام الأول]
    - [الالتزام الثاني]
    - [الالتزام الثالث]
    
    مواعيد التنفيذ:
    - بدء التطبيق: [التاريخ]
    - آخر موعد للامتثال: [التاريخ]
    
    للاستفسار والمتابعة:
    ${author || '[جهة الاتصال]'}
    ${department || '[الجهة المصدرة]'}
    
    يُرجى اتخاذ الإجراءات اللازمة للتطبيق والإعلام.
    
    مع التقدير
    
    ${author || '[المسؤول المختص]'}
    ${department || '[المنصب]'}`
  };

  const validate = () => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('العنوان مطلوب');
    if (!content.trim()) errs.push('المحتوى مطلوب');
    if (!responsibleEmployee.trim()) errs.push('اسم المسؤول عن الإدخال مطلوب');
    if (!department.trim()) errs.push('الجهة الصادرة مطلوبة');
    if (docType === 'محضر' && !participants.trim()) errs.push('أسماء المشاركين مطلوبة للمحضر');
    if ((docType === 'خطاب' || docType === 'تعميم') && !author.trim()) errs.push('اسم المؤلف مطلوب للخطاب والتعميم');
    
    // التحقق من التواريخ
    if (deadline && new Date(deadline) < new Date()) {
      errs.push('الموعد النهائي لا يمكن أن يكون في الماضي');
    }
    if (followUpRequired && followUpDate && new Date(followUpDate) < new Date()) {
      errs.push('تاريخ المتابعة لا يمكن أن يكون في الماضي');
    }
    
    // التحقق من المبلغ المالي
    if (budgetAmount && (isNaN(parseFloat(budgetAmount)) || parseFloat(budgetAmount) < 0)) {
      errs.push('المبلغ المالي يجب أن يكون رقماً صحيحاً وإيجابياً');
    }
    
    setErrors(errs);
    if (errs.length === 0) {
      setApproved(true);
      alert('تم التحقق بنجاح من جميع البيانات ✓');
    } else {
      alert(`يرجى تصحيح الأخطاء التالية:\n${errs.join('\n')}`);
    }
  };

  const loadTemplate = () => {
    setContent(templates[docType]);
    setShowTemplates(false);
  };

  const editTemplate = () => {
    setEditingTemplate(true);
    // إذا كان النموذج معدل مسبقاً، استخدم النسخة المعدلة
    const templateContent = editableTemplates[docType] || templates[docType];
    setContent(templateContent);
    setShowTemplates(false);
  };

  const saveTemplate = () => {
    if (!templateName.trim()) {
      alert('يرجى إدخال اسم للنموذج');
      return;
    }
    
    // حفظ النموذج المحرر
    const updatedTemplates = {
      ...editableTemplates,
      [templateName]: content
    };
    setEditableTemplates(updatedTemplates);
    
    // حفظ في Local Storage للاحتفاظ بالنماذج
    localStorage.setItem('customTemplates', JSON.stringify(updatedTemplates));
    
    setShowSaveDialog(false);
    setTemplateName('');
    setEditingTemplate(false);
    
    alert(`تم حفظ النموذج باسم: ${templateName}`);
  };

  const loadCustomTemplate = (templateKey: string) => {
    setContent(editableTemplates[templateKey]);
    setShowTemplates(false);
  };

  // تحميل النماذج المحفوظة عند بدء التطبيق
  React.useEffect(() => {
    const savedTemplates = localStorage.getItem('customTemplates');
    if (savedTemplates) {
      setEditableTemplates(JSON.parse(savedTemplates));
    }
  }, []);

  // حساب الارتفاع التلقائي للمحتوى
  const calculateContentHeight = (text: string) => {
    const lineHeight = 24; // ارتفاع السطر بالبكسل
    const minHeight = 120; // الحد الأدنى للارتفاع
    const maxHeight = 600; // الحد الأقصى للارتفاع
    const padding = 16; // المساحة العلوية والسفلية
    
    const lines = text.split('\n').length;
    const calculatedHeight = Math.max(minHeight, Math.min(maxHeight, lines * lineHeight + padding));
    
    return calculatedHeight;
  };

  // تحديث ارتفاع المحتوى عند تغيير النص
  React.useEffect(() => {
    const newHeight = calculateContentHeight(content);
    setContentHeight(newHeight);
  }, [content]);

  // وظائف مساعدة للتحرير
  const insertText = (textToInsert: string) => {
    const textarea = document.querySelector('textarea[placeholder="النص الكامل للوثيقة..."]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + textToInsert + content.substring(end);
      setContent(newContent);
      
      // إعادة تحديد موضع المؤشر
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      }, 0);
    }
  };

  const formatContent = () => {
    // تنسيق أساسي للمحتوى
    const formatted = content
      .replace(/\n{3,}/g, '\n\n') // إزالة الأسطر الفارغة الزائدة
      .replace(/[ \t]+$/gm, '') // إزالة المسافات في نهاية الأسطر
      .replace(/^[ \t]+/gm, '') // إزالة المسافات في بداية الأسطر
      .trim();
    setContent(formatted);
  };

  // دالة الملء التلقائي للاختبار
  const fillSampleData = () => {
    setTitle('اجتماع اللجنة الفنية لمراجعة المشاريع الجارية');
    setSubtitle('مناقشة التقدم المحرز والتحديات والخطوات القادمة');
    setDepartment('قسم الإدارة العامة');
    setAuthor('أحمد محمد علي');
    setResponsibleEmployee('سارة يوسف الأحمد');
    setParticipants('أحمد محمد علي، سارة يوسف الأحمد، محمد أحمد حسن، فاطمة علي محمود');
    setRecipientName('مدير قسم الشؤون المالية');
    setRecipientPosition('رئيس قسم');
    setReferenceNumber('REF-2024-001');
    setUrgencyLevel('مستعجل');
    setConfidentialityLevel('محدود');
    setKeywords('اجتماع، لجنة، مشاريع، مراجعة، تقييم');
    setActionRequired('اتخاذ قرار بشأن الميزانية الإضافية المطلوبة');
    setBudgetAmount('5000000');
    setLegalReference('قرار وزاري رقم 245 لعام 2024');
    setSentToDepartments(['قسم الإدارة العامة', 'قسم الخزينة', 'قسم التنمية الإدارية']);
    setContent(`
تم عقد اجتماع اللجنة الفنية لمراجعة المشاريع الجارية بتاريخ اليوم بحضور الأعضاء المذكورين أعلاه.

أولاً: مراجعة الوضع الحالي للمشاريع
- تم استعراض التقدم المحرز في المشاريع قيد التنفيذ
- تم تحديد التحديات الرئيسية التي تواجه الفرق
- تم مناقشة الحلول المقترحة للتغلب على العقبات

ثانياً: مناقشة الميزانية والموارد
- تم تقديم عرض مفصل عن الاحتياجات المالية
- تم تحديد الأولويات للفترة القادمة
- تم اقتراح إعادة توزيع بعض الموارد لتحسين الكفاءة

ثالثاً: القرارات المتخذة
- الموافقة على طلب ميزانية إضافية بقيمة 5 مليون ليرة سورية
- تشكيل فريق متابعة للإشراف على تنفيذ القرارات
- تحديد موعد الاجتماع القادم خلال أسبوعين

وقد انتهى الاجتماع في تمام الساعة الثانية والنصف بعد الظهر.
    `.trim());
    
    alert('تم ملء النموذج ببيانات تجريبية للاختبار ✓');
  };

  const insertEmployeeSignature = () => {
    // التحقق من وجود اسم المسؤول عن الإدخال
    if (!responsibleEmployee.trim()) {
      alert('يرجى إدخال اسم المسؤول عن الإدخال أولاً');
      return;
    }
    
    // أولاً: إزالة الأيقونات من المحتوى الحالي
    const cleanedContent = content
      .replace(/📝|📅|✍️|🔧|💼|📄|🗑️|📋|📊|📌|🎯|⚡|🔒|🌟|💡|🔔|📈|📉|📦|🎨|🛠️|⭐|🚀|💯|🔥|⚙️|📍|🎪|🎭||🎬|🎮|🎲||🎖️|🏅|🥇|🥈|🥉/g, '') // إزالة الأيقونات الشائعة
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '') // إزالة الإيموجي
      .replace(/\s+/g, ' ') // تنظيف المسافات الزائدة
      .trim();
    
    // تحديث المحتوى بالنص المنظف
    setContent(cleanedContent);
    
    // استخدام اسم المسؤول عن الإدخال المدخل في النموذج
    const employeeName = responsibleEmployee || '[اسم الموظف غير محدد]';
    const currentDate = getFormattedDate();
    
    const signatureText = `


━━━━━━━━━━━━━━━━━━━━

المسؤول عن الإدخال:
${employeeName}

تاريخ الإدخال: ${currentDate}

التوقيع الإلكتروني: ${employeeName}
   [تم الإدخال إلكترونياً في نظام الديوان العام]

━━━━━━━━━━━━━━━━━━━━`;

    // إضافة التوقيع بعد تأخير قصير للسماح بتحديث المحتوى
    setTimeout(() => {
      insertText(signatureText);
    }, 100);
  };

  // دالة لتوليد التوقيع الإلكتروني للتحميل
  const generateElectronicSignature = () => {
    const employeeName = responsibleEmployee || '[اسم الموظف غير محدد]';
    const currentDate = getFormattedDate();
    const now = new Date();
    const sessionId = now.getTime().toString(36).toUpperCase();
    
    return `
    <div style="margin-top: 40px; padding-top: 25px; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(5, 66, 57, 0.1);">
        <div style="text-align: center; margin-bottom: 25px;">
            <h3 style="color: #054239; margin: 0; font-size: 20px; font-family: 'Fustat', serif; font-weight: 600;">التوقيع الإلكتروني</h3>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 20px;">
            <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #054239;">
                <strong style="color: #054239; font-size: 14px;">المسؤول عن الإدخال:</strong><br>
                <span style="font-size: 16px; color: #1f2937; font-weight: 500;">${employeeName}</span><br>
                <small style="color: #6b7280; font-style: italic;">موظف معتمد في النظام الإلكتروني</small>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #059669;">
                <strong style="color: #054239; font-size: 14px;">تاريخ ووقت الإدخال:</strong><br>
                <span style="font-size: 14px; color: #1f2937; font-weight: 500;">${currentDate} - الساعة ${(() => {
                  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                  const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                  const hour = convertToArabic(now.getHours().toString().padStart(2, '0'));
                  const minute = convertToArabic(now.getMinutes().toString().padStart(2, '0'));
                  return `${hour}:${minute}`;
                })()}</span><br>
                <small style="color: #6b7280; font-style: italic;">تم في نفس جلسة الإدخال</small>
            </div>
        </div>
        <div style="text-align: center; padding: 20px; background: white; border: 2px solid #e5e7eb; border-radius: 10px; position: relative;">
            <div style="margin: 10px 0; padding: 8px 15px; background: #f0f9ff; border-radius: 6px; display: inline-block;">
                <span style="color: #0369a1; font-weight: bold; font-size: 18px;">${employeeName}</span>
            </div><br>
            <small style="color: #6b7280; font-style: italic; display: block; margin-top: 8px;">تم الإدخال والتوقيع إلكترونياً في نظام الديوان العام الرسمي</small>
            <small style="color: #9ca3af; font-family: 'Courier New', monospace; display: block; margin-top: 5px;">
                معرف الجلسة: <span style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">${sessionId}</span>
            </small>
            <div style="margin-top: 15px; padding-top: 10px;">
                <small style="color: #374151; font-weight: 500;">
                    🛡️ هذا التوقيع محمي رقمياً ومعتمد من النظام الإلكتروني الحكومي
                </small>
            </div>
        </div>
    </div>`;
  };

  // دالة لتوليد نموذج الكتاب الصادر الاحترافي
  const generateOfficialDocumentTemplate = () => {
    const now = new Date();
    const selectedDate = new Date(docDate);
    
    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${docType} - ${title}</title>
    <style>
        /* Enhanced Typography - Official Syrian Government Documents with Fustat (Kufi) and Noto Naskh Arabic */
        @import url('https://fonts.googleapis.com/css2?family=Fustat:wght@200;300;400;500;600;700;800&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap');
        
        @page {
            size: A4;
            margin: 2cm 1.5cm;
        }
        
        body {
            font-family: 'Noto Naskh Arabic', 'Traditional Arabic', 'Arabic Typesetting', 'Times New Roman', serif;
            direction: rtl;
            text-align: right;
            line-height: 1.8;
            margin: 0;
            padding: 0;
            background: white;
            color: #1f2937;
            font-size: 14px;
            letter-spacing: 0.2px;
        }
        
        /* Enhanced Fustat Typography for Official Documents */
        .font-kufi, .official-header, h1, h2, h3, h4, h5, h6 {
            font-family: 'Fustat', 'Traditional Arabic', 'Arabic Typesetting', serif !important;
            font-weight: 500;
            letter-spacing: 0.4px;
            color: #054239;
        }
        
        /* Enhanced Header Styling */
        .document-header {
            text-align: center;
            border-bottom: 4px double #054239;
            padding-bottom: 20px;
            margin-bottom: 30px;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 8px 8px 0 0;
        }
        
        .republic-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #054239;
            text-shadow: 0 1px 2px rgba(5, 66, 57, 0.1);
        }
        
        .ministry-name {
            font-size: 16px;
            margin-bottom: 6px;
            color: #054239;
            font-weight: 500;
        }
        
        .department-name {
            font-size: 14px;
            color: #374151;
            font-weight: 400;
        }
        
        /* Enhanced Document Info Table */
        .document-info {
            display: table;
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .info-row {
            display: table-row;
        }
        
        .info-cell {
            display: table-cell;
            padding: 12px 15px;
            border: 1px solid #e5e7eb;
            vertical-align: middle;
            font-size: 13px;
        }
        
        .info-label {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            font-weight: bold;
            width: 140px;
            text-align: center;
            color: #054239;
            font-family: 'Fustat', serif;
            border-left: 3px solid #054239;
        }
        
        .info-value {
            background: white;
            min-width: 160px;
            color: #1f2937;
            font-weight: 500;
        }
        
        /* Enhanced Priority Badges */
        .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: bold;
            margin-right: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .priority-عاجل { 
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); 
            color: #dc2626; 
            border: 2px solid #fecaca; 
            box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
        }
        
        .priority-سري { 
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); 
            color: #d97706; 
            border: 2px solid #fed7aa;
            box-shadow: 0 2px 4px rgba(217, 119, 6, 0.2);
        }
        
        .priority-هام { 
            background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); 
            color: #ea580c; 
            border: 2px solid #fdba74;
            box-shadow: 0 2px 4px rgba(234, 88, 12, 0.2);
        }
        
        .priority-عادي { 
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); 
            color: #0369a1; 
            border: 2px solid #bae6fd;
            box-shadow: 0 2px 4px rgba(3, 105, 161, 0.2);
        }
        
        /* Enhanced Content Area */
        .content-area {
            min-height: 350px;
            white-space: pre-wrap;
            line-height: 2.2;
            text-align: justify;
            padding: 25px 20px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            margin: 25px 0;
            background: linear-gradient(135deg, #ffffff 0%, #fefefe 100%);
            font-size: 15px;
            color: #1f2937;
            text-indent: 20px;
        }
        
        /* Enhanced Departments Section */
        .departments-section {
            margin: 25px 0;
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .departments-title {
            font-weight: bold;
            margin-bottom: 15px;
            color: #054239;
            font-family: 'Fustat', serif;
            font-size: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #054239;
            display: inline-block;
        }
        
        .departments-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
        }
        
        .department-item {
            padding: 8px 15px;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            color: #374151;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
        }
        
        .department-item:hover {
            background: #f9fafb;
            transform: translateY(-1px);
        }
        
        /* Enhanced Footer */
        .document-footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            font-size: 11px;
            color: #6b7280;
            text-align: center;
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            padding: 20px;
            border-radius: 0 0 8px 8px;
        }
        
        /* Print Optimization */
        @media print {
            body { 
                font-size: 12px; 
                line-height: 1.6;
            }
            .document-header { 
                break-after: avoid; 
                page-break-after: avoid;
            }
            .content-area { 
                break-inside: avoid; 
                page-break-inside: avoid;
            }
            .departments-section {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <!-- Document Header - Official Syrian Header with Logo -->
    <div class="document-header">
        <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 15px;">
            <!-- Official Syrian Header SVG -->
            <div style="text-align: center; width: 100%; max-width: 900px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" style="width: 100%; max-width: 800px; height: auto;">
                    <defs>
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Fustat:wght@200;300;400;500;600;700;800&amp;family=Noto+Naskh+Arabic:wght@400;500;600;700&amp;display=swap');
                        </style>
                    </defs>
                    <!-- Background -->
                    <rect width="800" height="200" fill="#ffffff"/>
                    
                    <!-- Left Side - English -->
                    <g font-family="Times New Roman, serif" fill="#054239">
                        <text x="40" y="45" font-size="16" font-weight="bold">SYRIAN ARAB REPUBLIC</text>
                        <text x="40" y="65" font-size="13">MINISTRY OF FINANCE</text>
                        <text x="40" y="83" font-size="13">FINANCE DIRECTORATE</text>
                        <text x="40" y="101" font-size="13">ALEPPO GOVERNORATE</text>
                        <text x="40" y="119" font-size="11">General Administration</text>
                    </g>
                    
                    <!-- Center - Syrian Eagle (Official Logo) -->
                    <g transform="translate(340, 25)">
                        <!-- Official Syrian Logo -->
                        <g transform="scale(0.085, 0.085)">
                            <!-- Official Syrian coat of arms -->
                            <g id="layer-MC0">
                                <path
                                   id="path1"
                                   d="m 0,0 42.785,42.933 4.326,26.679 c 19.492,30.995 41.28,60.661 60.416,91.872 3.336,5.44 11.84,17.853 13.358,23.156 1.525,5.331 -2.901,14.377 -4.849,19.851 -5.09,14.31 -11.333,29.286 -18.467,42.63 L 87.564,196.037 C 82.557,170.469 81.532,151.746 60.158,134.076 46.933,123.143 28.033,119.952 11.403,117.64 L 46.87,268.399 c -0.528,1.685 -10.558,5.968 -11.724,5.15 L -0.016,143.184 c -8.679,-27.642 -45.852,-41.028 -72.147,-42.762 -1.88,-0.124 -5.545,-0.925 -5.457,1.769 l 60.538,180.074 c -12.523,9.771 -15.141,-4.712 -18.71,-13.938 -17.039,-44.042 -30.153,-89.806 -47.875,-133.593 -13.679,-33.796 -24.337,-39.83 -59.203,-48.401 -4.123,-1.014 -31.381,-7.275 -32.666,-6.081 6.303,18.103 14.11,35.868 21.72,53.502 23.831,55.218 49.582,109.674 72.934,165.072 0.073,3.765 -8.494,5.537 -11.586,5.683 L -182.966,109.102 C -198.6,78.924 -209.895,73.916 -242.097,66.1 c -5.472,-1.328 -44.611,-10.041 -46.519,-8.641 L -140.4,328.303 c -2.556,2.263 -7.615,7.4 -10.968,4.534 -2.257,-1.931 -10.787,-16.914 -13.055,-20.686 -27.301,-45.419 -51.613,-96.162 -80.6,-140.08 -13.581,-20.577 -24.938,-25.938 -48.898,-30.438 -13.564,-2.547 -31.708,-5.521 -45.321,-6.657 -2.86,-0.239 -5.789,0.116 -8.648,-0.006 l 153.668,230.752 c 1.727,2.794 -7.482,10.907 -9.591,9.585 -14.328,-21.453 -29,-42.697 -43.936,-63.725 -15.112,-21.277 -34.747,-52.936 -51.836,-71.27 -17.655,-18.94 -60.723,-19.168 -85.226,-19.638 -3.034,-0.058 -6.459,-2.283 -9.577,0.452 l 154.83,194.39 -7.572,10.338 c -25.473,-30.036 -49.38,-61.86 -75.67,-91.199 -21.935,-24.48 -30.599,-34.883 -65.626,-36.507 -12.917,-0.599 -31.127,-0.953 -43.853,0.005 -2.023,0.152 -3.892,0.773 -5.888,0.96 8.451,10.322 17.696,20.329 26.887,30.096 63.878,67.88 128.991,134.977 193.768,201.997 19.352,20.023 58.977,66.336 82.124,76.546 21.046,9.284 69.64,8.412 93.485,6.913 38.992,-2.45 30.626,-37.779 32.29,-66.194 1.481,-25.272 4.916,-41.369 17.893,-63.266 24.114,-40.688 72.673,-65.884 120.185,-60.146 23.874,2.882 24.318,8.887 31.115,29.983 4.538,14.086 8.647,29.89 12.242,44.295 1.554,6.227 6.693,22.553 5.124,27.784 -4.656,15.523 -34.725,12.577 -45.471,4.357 -1.889,-1.445 -5.347,-6.649 -7.027,-5.819 -8.418,12.129 -8.991,30.563 4.286,39.564 23.282,12.315 44.184,29.553 71.084,32.872 27.757,3.425 75.528,-5.451 83.966,-37.093 9.685,-36.312 8.228,-80.779 16.959,-118.003 3.488,-14.873 12.192,-17.108 26.592,-18.091 70.653,-4.822 129.691,50.14 133.622,119.962 1.617,28.735 -8.888,66.817 31.434,69.786 17.727,1.306 44.144,0.988 62.036,-0.044 42.487,-2.45 55.667,-24.196 82.512,-51.537 44.888,-45.718 88.818,-92.319 133.137,-138.609 39.549,-41.307 79.898,-81.861 118.561,-124.01 0.789,-1.829 -3.175,-2.192 -4.087,-2.271 -13.064,-1.127 -33.191,-0.694 -46.504,0.016 -23.252,1.239 -37.043,6.885 -52.912,23.687 -29.437,31.169 -54.591,69.658 -83.871,100.33 -1.025,1.074 -2.296,3.243 -4.104,2.325 -1.374,-0.697 -7.417,-8.403 -6.869,-9.633 L 844.866,222.033 c 0.238,-1.856 -0.075,-1.186 -1.341,-1.355 -13.059,-1.741 -39.151,0.95 -52.79,2.855 -18.985,2.651 -31.573,6.54 -44.317,21.34 l -92.682,130.791 -9.083,-8.167 C 695,289.772 748.562,214.103 797.451,135.411 c -11.138,0.326 -22.867,1.753 -34.06,3.328 -38.125,5.366 -50.539,7.208 -71.539,40.625 -25.074,39.899 -46.546,82.219 -70.567,122.756 -5.104,8.614 -11.097,19.953 -16.944,27.74 -5.525,7.359 -6.732,2.732 -12.843,-0.807 l 146.68,-271.6 c -33.807,8.617 -80.504,6.777 -98.955,41.925 l -95.407,205.056 c -4.862,1.064 -8.426,-3.004 -12.586,-4.496 l 0.073,-1.108 95.624,-218.578 c -1.054,-0.975 -24.692,4.182 -28.275,5 -40.744,9.309 -51.071,15.748 -66.33,54.953 -18.63,47.871 -33.15,97.408 -52.354,145.062 -2.458,0.264 -12.672,0.012 -12.483,-2.847 L 529.358,99.406 c -26.332,4.965 -57.204,7.862 -72.423,32.892 -5.297,8.712 -8.949,20.25 -11.925,30.022 -11.163,36.643 -18.586,74.569 -29.651,111.254 -3.011,-0.723 -10.407,-2.656 -10.972,-5.954 l 35.605,-149.976 c -2.438,-1.756 -32.545,6.944 -37.094,8.948 -13.204,5.819 -27.531,21.498 -32.245,35.236 l -16.831,85.293 c -1.458,-1.136 -2.245,-2.618 -3.086,-4.209 -5.87,-11.097 -11.982,-27.344 -16.296,-39.33 -5.144,-14.294 -7.146,-14.158 0.527,-28.198 20.846,-38.145 50.272,-71.804 70.144,-110.412 L 407.633,43.785 451.391,0 h 107.148 v -45.595 c -2.187,1.896 -4.713,3.515 -6.863,5.447 -2.868,2.578 -14.032,15.527 -16.39,15.527 H 511.12 l 22.781,-23.254 -23.708,-22.808 -1.808,0.923 v 21.885 l -22.292,22.391 -24.198,0.39 -22.815,-22.781 v -20.518 l -27.291,27.027 22.715,23.584 -40.513,40.629 -23.05,1.572 -84.61,55.822 -0.44,-1.347 c 43.568,-59.963 88.43,-118.99 132.049,-178.914 7.156,-9.831 20.487,-25.549 25.722,-35.375 0.588,-1.103 1.235,-1.726 0.89,-3.214 h -45.139 c -24.466,0 -41.092,17.782 -51.998,37.368 -13.912,24.983 -23.389,53.278 -37.352,78.35 -2.515,-1.655 -8.35,-3.364 -8.689,-6.77 l 57.462,-148.149 c -1.672,-0.441 -3.216,-0.837 -4.977,-0.968 -18.996,-1.406 -39.909,3.403 -54.728,15.575 -14.891,12.23 -17.724,24.886 -21.923,42.822 -6.255,26.721 -10.09,54.175 -15.046,81.159 -3.41,0.191 -10.104,0.263 -10.507,-4.057 l 13.244,-105.826 c 1.447,-26.67 -11.319,-43.305 -30.072,-60.189 -1.247,-1.123 -7.721,-7.076 -8.227,-7.336 -0.703,-0.361 -1.122,-0.612 -1.811,-0.002 -12.064,10.937 -26.75,22.328 -33.616,37.574 -6.515,14.467 -4.283,34.421 -2.861,50.02 2.636,28.927 7.942,57.748 11.022,86.641 l -0.615,1.465 c -7.778,2.151 -8.847,3.709 -10.9,-4.63 -13.31,-54.054 -4.104,-129.005 -78.4,-133.162 -2.522,-0.141 -14.806,-0.417 -15.995,0.398 -1.313,0.899 -1.011,2.861 -0.441,4.163 l 57.94,146.796 -10.464,4.591 C 127.231,-48.65 117.048,-77.541 102.745,-102.745 91.917,-121.825 74.68,-138.609 51.066,-138.609 H 5.927 L 165.499,78.895 164.157,80.237 79.752,24.204 57.4,22.847 16.887,-17.782 39.602,-41.366 12.311,-68.393 v 20.518 l -22.815,22.781 -23.961,0.286 -22.056,-22.628 c -1.549,-7.154 0.828,-15.406 -1.359,-22.365 -0.314,-1.001 0.615,-1.622 -1.381,-1.319 l -23.044,23.258 13.013,13.197 6.824,9.125 -23.064,0.732 -21.616,-20.787 V 0 Z"
                                   style="fill:#988561;fill-opacity:1;fill-rule:nonzero;stroke:none"
                                   transform="matrix(1.3333333,0,0,-1.3333333,609.8816,1285.1571)" />
                                <path
                                   id="path3"
                                   d="m 0,0 -20.631,-35.096 24.274,-34.194 -38.574,8.054 c -4.7,-1.106 -19.438,-28.76 -23.219,-34.225 -0.555,-0.802 0.152,-1.688 -2.031,-1.192 l -4.686,42.735 c -10.981,3.628 -23.475,5.251 -34.332,8.982 -0.929,0.32 -7.259,2.152 -5.666,3.895 12.984,4.907 26.009,10.029 37.852,17.328 l -1.37,41.048 27.05,-30.91 z"
                                   style="fill:#988561;fill-opacity:1;fill-rule:nonzero;stroke:none"
                                   transform="matrix(1.3333333,0,0,-1.3333333,762.47293,316.12293)" />
                                <path
                                   id="path5"
                                   d="m 0,0 -41.736,-12.053 -4.778,-43.562 -24.317,37.291 -41.326,-9.017 27.265,33.406 -21.798,37.708 40.393,-15.359 c 10.785,9.511 17.922,23.73 29.814,31.782 l -3.231,-43.784 z"
                                   style="fill:#988561;fill-opacity:1;fill-rule:nonzero;stroke:none"
                                   transform="matrix(1.3333333,0,0,-1.3333333,1201.3984,372.05507)" />
                                <path
                                   id="path7"
                                   d="m 0,0 -1.381,-2.723 -32.077,-24.152 12.48,-40.6 -36.025,24.444 -34.634,-24.459 11.293,41.34 L -114.899,0 h 43.315 L -57.44,41.946 -41.492,0 Z"
                                   style="fill:#988561;fill-opacity:1;fill-rule:nonzero;stroke:none"
                                   transform="matrix(1.3333333,0,0,-1.3333333,986.19267,301.52)" />
                            </g>
                        </g>
                    </g>
                    
                    <!-- Right Side - Arabic -->
                    <g font-family="Fustat, Traditional Arabic, Arabic Typesetting, serif" text-anchor="end" fill="#054239">
                        <text x="760" y="45" font-size="18" font-weight="bold">الجمهورية العربية السورية</text>
                        <text x="760" y="65" font-size="15">وزارة المالية</text>
                        <text x="760" y="83" font-size="15">مديرية المالية</text>
                        <text x="760" y="101" font-size="15">محافظة حلب</text>
                        <text x="760" y="119" font-size="13">إدارة الديوان العام</text>
                    </g>
                    
                    <!-- Bottom border -->
                    <line x1="0" y1="180" x2="800" y2="180" stroke="#054239" stroke-width="2"/>
                </svg>
            </div>
        </div>
    </div>
    
    <!-- Document Info Table -->
    <div class="document-info">
        <div class="info-row">
            <div class="info-cell info-label">نوع الوثيقة</div>
            <div class="info-cell info-value">
                ${docType}
                ${priority !== 'عادي' ? `<span class="priority-badge priority-${priority}">${priority}</span>` : ''}
            </div>
            <div class="info-cell info-label">رقم الديوان</div>
            <div class="info-cell info-value">${diwanNumber || '___________'}</div>
        </div>
        <div class="info-row">
            <div class="info-cell info-label">${getDocNumberLabel()}</div>
            <div class="info-cell info-value">${docId}</div>
            <div class="info-cell info-label">التاريخ</div>
            <div class="info-cell info-value">${(() => {
              const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
              const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
              const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
              const date = new Date(docDate);
              const day = convertToArabic(date.getDate().toString());
              const month = months[date.getMonth()];
              const year = convertToArabic(date.getFullYear().toString());
              return `${day} ${month} ${year}`;
            })()}</div>
        </div>
        <div class="info-row">
            <div class="info-cell info-label">الجهة الصادرة</div>
            <div class="info-cell info-value">${department || '___________'}</div>
            <div class="info-cell info-label">الحالة</div>
            <div class="info-cell info-value">${approved ? '<span style="color: #16a34a; font-weight: bold;">معتمد ✓</span>' : '<span style="color: #dc2626;">مسودة</span>'}</div>
        </div>
        ${responsibleEmployee ? `
        <div class="info-row">
            <div class="info-cell info-label">المسؤول عن الإدخال</div>
            <div class="info-cell info-value" colspan="3" style="font-weight: bold; color: #054239;">${responsibleEmployee}</div>
        </div>` : ''}
        ${title ? `
        <div class="info-row">
            <div class="info-cell info-label">الموضوع</div>
            <div class="info-cell info-value" colspan="3" style="font-weight: bold;">${title}</div>
        </div>` : ''}
        ${subtitle ? `
        <div class="info-row">
            <div class="info-cell info-label">العنوان الفرعي</div>
            <div class="info-cell info-value" colspan="3">${subtitle}</div>
        </div>` : ''}
    </div>
    
    <!-- Document Content -->
    <div class="content-area">${content}</div>
    
    <!-- Departments Section -->
    ${sentToDepartments && sentToDepartments.length > 0 ? `
    <div class="departments-section">
        <div class="departments-title">الأقسام المرسل إليها:</div>
        <div class="departments-list">
            ${sentToDepartments.map(dept => `<div class="department-item">${dept}</div>`).join('')}
        </div>
    </div>` : ''}
    
    ${generateElectronicSignature()}
    
    <!-- Document Footer -->
    <div class="document-footer">
        تم إنشاء هذه الوثيقة في: ${(() => {
          const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
          const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
          const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
          
          const day = convertToArabic(now.getDate().toString());
          const month = months[now.getMonth()];
          const year = convertToArabic(now.getFullYear().toString());
          const hour = convertToArabic(now.getHours().toString().padStart(2, '0'));
          const minute = convertToArabic(now.getMinutes().toString().padStart(2, '0'));
          
          let period = '';
          const hours24 = now.getHours();
          if (hours24 >= 6 && hours24 < 12) {
            period = 'صباحاً';
          } else if (hours24 >= 12 && hours24 < 17) {
            period = 'ظهراً';
          } else if (hours24 >= 17 && hours24 < 20) {
            period = 'مساءً';
          } else {
            period = 'ليلاً';
          }
          
          return `${day} ${month} ${year} في ${hour}:${minute} ${period}`;
        })()}
        <br>
        نظام الديوان الإلكتروني - الجمهورية العربية السورية
    </div>
</body>
</html>`;
  };

  const download = () => {
    // استخدام النموذج الاحترافي الجديد
    const wordContent = generateOfficialDocumentTemplate();
    
    // persist detailed record for stats
    try {
      const list = JSON.parse(localStorage.getItem('diwanDocs') || '[]');
      list.unshift({ 
        id: docId, 
        type: docType, 
        template, 
        title, 
        subtitle,
        department,
        author,
        responsibleEmployee,
        participants,
        docDate,
        diwanNumber,
        priority,
        approved, 
        dateISO: new Date().toISOString(),
        attachments: attachments ? attachments.split(',').map(s => s.trim()) : [],
        uploadedFiles: uploadedFiles,
        accessUsers: accessUsers,
        revisions: revisions,
        classifications: classifications,
        // المعلومات الإضافية الجديدة
        recipientName,
        recipientPosition,
        referenceNumber,
        urgencyLevel,
        followUpRequired,
        followUpDate,
        confidentialityLevel,
        keywords: keywords ? keywords.split(',').map(s => s.trim()) : [],
        relatedDocuments: relatedDocuments ? relatedDocuments.split(',').map(s => s.trim()) : [],
        actionRequired,
        deadline,
        budgetAmount: budgetAmount ? parseFloat(budgetAmount) : null,
        legalReference,
        sentToDepartments
      });
      localStorage.setItem('diwanDocs', JSON.stringify(list));
    } catch { /* ignore */ }
    onSaved?.();
    
    // Create and download Word file
    const blob = new Blob([wordContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType}-${title.replace(/[^\w\u0600-\u06FF]/g, '-').substring(0, 30)}-${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Reset form after successful download
    setTitle('');
    setSubtitle('');
    setDepartment('');
    setAuthor('');
    setResponsibleEmployee('');
    setParticipants('');
    setDocDate(new Date().toISOString().slice(0, 10));
    setDiwanNumber('');
    setContent('');
    setAttachments('');
    setUploadedFiles([]);
    setApproved(false);
    setAccessUsers([]);
    setRevisions([]);
    setClassifications([]);
    // إعادة تعيين المعلومات الإضافية الجديدة
    setRecipientName('');
    setRecipientPosition('');
    setReferenceNumber('');
    setUrgencyLevel('عادي');
    setFollowUpRequired(false);
    setFollowUpDate('');
    setConfidentialityLevel('عام');
    setKeywords('');
    setRelatedDocuments('');
    setActionRequired('');
    setDeadline('');
    setBudgetAmount('');
    setLegalReference('');
    setSentToDepartments([]);
    generateId();
  };

  const downloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');

      // Create a temporary div with the document content
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: 800px;
        background: white;
        padding: 40px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: black;
        direction: rtl;
        text-align: right;
      `;

      const now = new Date();
      const selectedDate = new Date(docDate);
      
      // Create HTML content for PDF
      const pdfContent = `
        <!-- Enhanced Official Header -->
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px double #054239; padding-bottom: 15px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 150" style="width: 100%; max-width: 700px; height: auto;">
                <!-- Left Side - English -->
                <g font-family="Times New Roman, serif" fill="#054239">
                    <text x="40" y="30" font-size="11" font-weight="bold">SYRIAN ARAB REPUBLIC</text>
                    <text x="40" y="45" font-size="9">MINISTRY OF FINANCE</text>
                    <text x="40" y="58" font-size="9">FINANCE DIRECTORATE</text>
                    <text x="40" y="71" font-size="9">ALEPPO GOVERNORATE</text>
                    <text x="40" y="84" font-size="8">General Administration</text>
                </g>
                
                <!-- Center - Syrian Eagle (Official Logo) -->
                <g transform="translate(350, 10)">
                    <!-- Official Syrian Logo -->
                    <image x="15" y="15" width="70" height="70" href="https://syrian.zone/syid/materials/logo.ai.svg" />
                    
                    <!-- Fallback if image doesn't load -->
                    <g style="display: none;">
                        <!-- Three stars -->
                        <g fill="#054239">
                            <polygon points="25,12 27,18 33,18 29,22 31,28 25,24 19,28 21,22 17,18 23,18"/>
                            <polygon points="50,8 52,14 58,14 54,18 56,24 50,20 44,24 46,18 42,14 48,14"/>
                            <polygon points="75,12 77,18 83,18 79,22 81,28 75,24 69,28 71,22 67,18 73,18"/>
                        </g>
                        
                        <!-- Eagle body -->
                        <g fill="#054239">
                            <!-- Main body -->
                            <path d="M50 40 L40 48 L35 52 L30 60 L28 68 L30 76 L35 80 L40 84 L50 88 L60 84 L65 80 L70 76 L72 68 L70 60 L65 52 L60 48 Z"/>
                            <!-- Left wing -->
                            <path d="M30 60 L18 64 L8 72 L5 80 L8 84 L18 86 L30 84 Z"/>
                            <!-- Right wing -->
                            <path d="M70 60 L82 64 L92 72 L95 80 L92 84 L82 86 L70 84 Z"/>
                            <!-- Head -->
                            <ellipse cx="50" cy="48" rx="6" ry="8"/>
                            <!-- Beak -->
                            <path d="M44 48 L38 50 L40 52 L46 51 Z"/>
                        </g>
                    </g>
                </g>
                
                <!-- Right Side - Arabic -->
                <g font-family="Fustat, Traditional Arabic, Arabic Typesetting, serif" text-anchor="end" fill="#054239">
                    <text x="760" y="30" font-size="13" font-weight="bold">الجمهورية العربية السورية</text>
                    <text x="760" y="45" font-size="11">وزارة المالية</text>
                    <text x="760" y="58" font-size="11">مديرية المالية</text>
                    <text x="760" y="71" font-size="11">محافظة حلب</text>
                    <text x="760" y="84" font-size="10">إدارة الديوان العام</text>
                </g>
            </svg>
        </div>
        
        <!-- Document Title and QR -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h1 style="color: #054239; margin: 0; font-size: 24px; font-weight: bold; font-family: 'Fustat', 'Traditional Arabic', serif;">${docType}</h1>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">${title}</p>
          </div>
          <div style="text-align: center;">
            <img src="${qrDataUrl}" style="width: 50px; height: 50px; border: 1px solid #ddd;" />
            <p style="font-size: 8px; margin: 3px 0 0 0; color: #666;">رمز الاستعلام</p>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 12px; background: #f8fafc; padding: 15px; border-radius: 8px;">
          <div><strong>رقم الوثيقة:</strong> ${docId}</div>
          <div><strong>رقم الديوان:</strong> ${diwanNumber || 'غير محدد'}</div>
          <div><strong>التاريخ الميلادي:</strong> ${(() => {
            const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
            const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
            const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
            const day = convertToArabic(selectedDate.getDate().toString());
            const month = months[selectedDate.getMonth()];
            const year = convertToArabic(selectedDate.getFullYear().toString());
            return `${day} ${month} ${year}`;
          })()}</div>
            <div><strong>التاريخ الهجري:</strong> ${(() => {
              const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
              const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
              
              // Accurate Hijri conversion
              const gYear = selectedDate.getFullYear();
              const gMonth = selectedDate.getMonth() + 1;
              const gDay = selectedDate.getDate();
              
              let a = Math.floor((14 - gMonth) / 12);
              let y = gYear - a;
              let m = gMonth + 12 * a - 3;
              let jd = gDay + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + 1721119;
              
              jd = Math.floor(jd - 0.5) + 0.5;
              let l = jd - 1948439.5;
              let n = Math.floor((l - 1) / 10631);
              l = l - 10631 * n + 354;
              let j = (Math.floor((10985 - l) / 5316)) * (Math.floor(((50 * l) / 17719))) + (Math.floor(l / 5670)) * (Math.floor(((43 * l) / 15238)));
              l = l - (Math.floor((30 - j) / 15)) * (Math.floor(((17719 * j) / 50))) - (Math.floor(j / 16)) * (Math.floor(((15238 * j) / 43))) + 29;
              m = Math.floor((24 * l) / 709);
              let d = l - Math.floor((709 * m) / 24);
              y = 30 * n + j - 30;

              const hijriMonths = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
              
              const hijriDay = convertToArabic(Math.floor(d));
              const hijriYear = convertToArabic(Math.floor(y));
              const monthName = hijriMonths[Math.floor(m) - 1] || hijriMonths[0];
              
              return `${hijriDay} ${monthName} ${hijriYear}هـ`;
            })()}</div>
            <div><strong>النوع:</strong> ${docType}</div>
            <div><strong>الأولوية:</strong> ${priority}</div>
            <div><strong>الحالة:</strong> ${approved ? 'معتمد ✓' : 'مسودة'}</div>
            ${department ? `<div><strong>الجهة الصادرة:</strong> ${department}</div>` : ''}
            ${author ? `<div><strong>المؤلف:</strong> ${author}</div>` : ''}
            ${responsibleEmployee ? `<div><strong>المسؤول عن الإدخال:</strong> ${responsibleEmployee}</div>` : ''}
            ${participants ? `<div><strong>المشاركون:</strong> ${participants}</div>` : ''}
            ${attachments ? `<div><strong>ملاحظات المرفقات:</strong> ${attachments}</div>` : ''}
            ${uploadedFiles.length > 0 ? `<div><strong>الملفات المرفقة:</strong> ${uploadedFiles.map(file => `${file.name} (${formatFileSize(file.size)})`).join(', ')}</div>` : ''}
            
            ${accessUsers.length > 0 ? `
            <div style="margin-top: 15px;">
              <strong>إدارة النفاذ:</strong>
              <ul style="margin: 5px 0; padding-right: 20px;">
                ${accessUsers.map(user => `
                  <li>${user.name} - ${user.role} (${user.department}) - ${(() => {
                    const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                    const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                    return convertToArabic(new Date(user.dateAdded).toLocaleDateString('ar-SY'));
                  })()}</li>
                `).join('')}
              </ul>
            </div>` : ''}
            
            ${revisions.length > 0 ? `
            <div style="margin-top: 15px;">
              <strong>سجل التعديلات:</strong>
              <ul style="margin: 5px 0; padding-right: 20px;">
                ${revisions.map(revision => `
                  <li>${revision.version} - ${revision.type} - ${revision.changes} (${revision.author} - ${(() => {
                    const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                    const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                    return convertToArabic(new Date(revision.date).toLocaleDateString('ar-SY'));
                  })()})</li>
                `).join('')}
              </ul>
            </div>` : ''}
            
            ${classifications.length > 0 ? `
            <div style="margin-top: 15px;">
              <strong>التصنيفات:</strong>
              <ul style="margin: 5px 0; padding-right: 20px;">
                ${classifications.map(classification => `
                  <li>${classification.category} - ${classification.level} ${classification.tags.length > 0 ? `(العلامات: ${classification.tags.join(', ')})` : ''} - صالح حتى: ${(() => {
                    const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                    const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                    return convertToArabic(new Date(classification.validUntil).toLocaleDateString('ar-SY'));
                  })()}</li>
                `).join('')}
              </ul>
            </div>` : ''}
          </div>
        </div>
        
        <div style="white-space: pre-wrap; line-height: 1.8; font-size: 14px;">
${content}
        </div>
        
        ${generateElectronicSignature()}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #666; text-align: center;">
          تم إنشاء هذه الوثيقة في: ${(() => {
            const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
            const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
            const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
            
            const day = convertToArabic(now.getDate().toString());
            const month = months[now.getMonth()];
            const year = convertToArabic(now.getFullYear().toString());
            const hour = convertToArabic(now.getHours().toString().padStart(2, '0'));
            const minute = convertToArabic(now.getMinutes().toString().padStart(2, '0'));
            
            // تحديد فترة النهار
            const hours24 = now.getHours();
            let period = '';
            if (hours24 >= 6 && hours24 < 12) {
              period = 'صباحاً';
            } else if (hours24 >= 12 && hours24 < 17) {
              period = 'ظهراً';
            } else if (hours24 >= 17 && hours24 < 20) {
              period = 'مساءً';
            } else {
              period = 'ليلاً';
            }
            
            return `${day} ${month} ${year} في ${hour}:${minute} ${period}`;
          })()}
        </div>
      `;

      tempDiv.innerHTML = pdfContent;
      document.body.appendChild(tempDiv);

      // Convert to canvas
      const canvas = await html2canvas.default(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Remove temp div
      document.body.removeChild(tempDiv);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      const pdfFilename = `${docType}-${title.replace(/[^\w\u0600-\u06FF]/g, '-').substring(0, 30)}-${new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(pdfFilename);

      // Update storage same as regular download
      try {
        const list = JSON.parse(localStorage.getItem('diwanDocs') || '[]');
        list.unshift({ 
          id: docId, 
          type: docType, 
          template, 
          title, 
          subtitle,
          department,
          author,
          participants,
          docDate,
          diwanNumber,
          priority,
          approved, 
          dateISO: now.toISOString(),
          attachments: attachments ? attachments.split(',').map(s => s.trim()) : [],
          uploadedFiles: uploadedFiles,
          accessUsers: accessUsers,
          revisions: revisions,
          classifications: classifications
        });
        localStorage.setItem('diwanDocs', JSON.stringify(list));
      } catch { /* ignore */ }
      onSaved?.();

      // Reset form after successful download
      setTitle('');
      setSubtitle('');
      setDepartment('');
      setAuthor('');
      setParticipants('');
      setDocDate(new Date().toISOString().slice(0, 10));
      setDiwanNumber('');
      setContent('');
      setAttachments('');
      setUploadedFiles([]);
      setApproved(false);
      setAccessUsers([]);
      setRevisions([]);
      setClassifications([]);
      generateId();

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ في إنشاء ملف PDF. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Document ID and Templates */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">معلومات الوثيقة والتوقيت</h3>
        
        {/* Document Info Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">رقم الوثيقة</span>
            <code className="bg-blue-100 dark:bg-blue-900/50 px-3 py-2 rounded text-blue-600 dark:text-blue-400 font-medium text-sm">{docId}</code>
          </div>
          
          {qrDataUrl && (
            <div className="flex flex-col items-center relative">
              <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">رمز الاستعلام</span>
              <img 
                src={qrDataUrl} 
                alt={`QR Code for ${docId}`}
                className="w-16 h-16 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:border-blue-400 transition-colors"
                title={`انقر لنسخ رقم الوثيقة: ${docId}`}
                onClick={copyDocId}
              />
              {copied && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-md whitespace-nowrap">
                  تم النسخ!
                </div>
              )}
            </div>
          )}
          
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">التاريخ الميلادي</span>
            <span className="bg-green-100 dark:bg-green-900/50 px-3 py-2 rounded text-green-600 dark:text-green-400 font-medium text-sm">
              {(() => {
                const now = new Date();
                const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
                const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                const day = convertToArabic(now.getDate().toString());
                const month = months[now.getMonth()];
                const year = convertToArabic(now.getFullYear().toString());
                return `${day} ${month} ${year}`;
              })()}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">التاريخ الهجري</span>
            <span className="bg-purple-100 dark:bg-purple-900/50 px-3 py-2 rounded text-purple-600 dark:text-purple-400 font-medium text-sm">
              {(() => {
                const now = new Date();
                const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                const convertToArabic = (text) => text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                
                // Accurate Hijri conversion using Julian Day algorithm
                const gYear = now.getFullYear();
                const gMonth = now.getMonth() + 1;
                const gDay = now.getDate();
                
                let a = Math.floor((14 - gMonth) / 12);
                let y = gYear - a;
                let m = gMonth + 12 * a - 3;
                let jd = gDay + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + 1721119;
                
                jd = Math.floor(jd - 0.5) + 0.5;
                let l = jd - 1948439.5;
                let n = Math.floor((l - 1) / 10631);
                l = l - 10631 * n + 354;
                let j = (Math.floor((10985 - l) / 5316)) * (Math.floor(((50 * l) / 17719))) + (Math.floor(l / 5670)) * (Math.floor(((43 * l) / 15238)));
                l = l - (Math.floor((30 - j) / 15)) * (Math.floor(((17719 * j) / 50))) - (Math.floor(j / 16)) * (Math.floor(((15238 * j) / 43))) + 29;
                m = Math.floor((24 * l) / 709);
                let d = l - Math.floor((709 * m) / 24);
                y = 30 * n + j - 30;

                const hijriMonths = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
                
                const hijriDay = convertToArabic(Math.floor(d));
                const hijriYear = convertToArabic(Math.floor(y));
                const monthName = hijriMonths[Math.floor(m) - 1] || hijriMonths[0];
                
                return `${hijriDay} ${monthName} ${hijriYear}هـ`;
              })()}
            </span>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">الوقت</span>
            <span className="bg-orange-100 dark:bg-orange-900/50 px-3 py-2 rounded text-orange-600 dark:text-orange-400 font-medium text-sm">
              {(() => {
                const now = new Date();
                const convertToArabic = (text: string) => {
                  const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                  return text.toString().replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                };
                const hour = convertToArabic(now.getHours().toString().padStart(2, '0'));
                const minute = convertToArabic(now.getMinutes().toString().padStart(2, '0'));
                
                // تحديد فترة النهار
                const hours24 = now.getHours();
                let period = '';
                if (hours24 >= 6 && hours24 < 12) {
                  period = 'صباحاً';
                } else if (hours24 >= 12 && hours24 < 17) {
                  period = 'ظهراً';
                } else if (hours24 >= 17 && hours24 < 20) {
                  period = 'مساءً';
                } else {
                  period = 'ليلاً';
                }
                
                return `${hour}:${minute} ${period}`;
              })()}
            </span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left Side - Templates */}
          <div className="flex-1">
            <Button 
              variant="secondary" 
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-fit mb-3"
            >
              {showTemplates ? 'إخفاء النماذج' : 'النماذج الجاهزة'}
            </Button>
            
            {/* Enhanced Template Display */}
            {showTemplates && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">نماذج {docType}</h4>
                  <div className="flex gap-2">
                    <Button 
                      onClick={loadTemplate} 
                      className="text-sm px-4 py-2"
                      variant="primary"
                    >
                      استخدام النموذج
                    </Button>
                    <Button 
                      onClick={editTemplate} 
                      className="text-sm px-4 py-2"
                      variant="secondary"
                    >
                      تحرير النموذج
                    </Button>
                    <Button 
                      onClick={() => setShowTemplates(false)}
                      variant="secondary"
                      className="text-sm px-3 py-2"
                    >
                      إغلاق
                    </Button>
                  </div>
                </div>
                
                {/* Template Content with better display */}
                <div className="space-y-3">
                  <div className="bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 overflow-hidden">
                    <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 border-b border-gray-300 dark:border-gray-600">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">معاينة النموذج الأساسي</span>
                    </div>
                    <div className="p-4 max-h-80 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed font-mono">
                        {templates[docType]}
                      </pre>
                    </div>
                  </div>

                  {/* Custom Templates Section */}
                  {Object.keys(editableTemplates).length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 overflow-hidden">
                      <div className="bg-blue-100 dark:bg-blue-800 px-3 py-2 border-b border-gray-300 dark:border-gray-600">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">النماذج المحفوظة</span>
                      </div>
                      <div className="p-4 space-y-2">
                        {Object.entries(editableTemplates).map(([key, template]) => (
                          <div key={key} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{key}</span>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => loadCustomTemplate(key)}
                                className="text-xs px-3 py-1"
                                variant="primary"
                              >
                                استخدام
                              </Button>
                              <Button 
                                onClick={() => {
                                  setContent(template);
                                  setEditingTemplate(true);
                                  setShowTemplates(false);
                                }}
                                className="text-xs px-3 py-1"
                                variant="secondary"
                              >
                                تحرير
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">إجراءات سريعة:</span>
                    <Button 
                      variant="secondary" 
                      className="text-xs px-3 py-1"
                      onClick={() => {
                        navigator.clipboard.writeText(templates[docType]);
                        alert('تم نسخ النموذج إلى الحافظة');
                      }}
                    >
                      نسخ النموذج
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="text-xs px-3 py-1"
                      onClick={() => {
                        setContent(templates[docType]);
                        alert('تم تحميل النموذج في محرر المحتوى');
                      }}
                    >
                      تحميل مباشر
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Right Side - Utility Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" onClick={generateId} className="text-sm px-3 py-2">
              🔄 توليد رقم جديد
            </Button>
            <Button variant="secondary" onClick={fillSampleData} className="text-sm px-3 py-2 bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300">
              📝 ملء تجريبي
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => {
                if (confirm('هل تريد مسح جميع البيانات وإعادة تعيين النموذج؟')) {
                  // مسح جميع الحقول
                  setTitle('');
                  setSubtitle('');
                  setDepartment('');
                  setAuthor('');
                  setResponsibleEmployee('');
                  setParticipants('');
                  setDocDate(new Date().toISOString().slice(0, 10));
                  setDiwanNumber('');
                  setContent('');
                  setAttachments('');
                  setUploadedFiles([]);
                  setApproved(false);
                  setRecipientName('');
                  setRecipientPosition('');
                  setReferenceNumber('');
                  setUrgencyLevel('عادي');
                  setFollowUpRequired(false);
                  setFollowUpDate('');
                  setConfidentialityLevel('عام');
                  setKeywords('');
                  setRelatedDocuments('');
                  setActionRequired('');
                  setDeadline('');
                  setBudgetAmount('');
                  setLegalReference('');
                  setSentToDepartments([]);
                  setErrors([]);
                  generateId();
                  alert('تم مسح جميع البيانات بنجاح');
                }
              }} 
              className="text-sm px-3 py-2 bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300"
            >
              🗑️ مسح النموذج
            </Button>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 text-sm">
          <ul className="list-disc pr-4">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <label className="text-sm">
          النوع
          <select className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={docType} onChange={(e) => setDocType(e.target.value as any)}>
            <option>محضر</option>
            <option>تقرير</option>
            <option>خطاب</option>
            <option>تعميم</option>
            <option>كتاب رسمي</option>
          </select>
        </label>
        <label className="text-sm">
          النموذج
          <select className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={template} onChange={(e) => setTemplate(e.target.value as any)}>
            <option>نموذج موحّد</option>
            <option>مخصص</option>
          </select>
        </label>
        <label className="text-sm">
          الأولوية
          <div className="relative">
            <select 
              className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700 appearance-none" 
              value={priority} 
              onChange={(e) => setPriority(e.target.value as any)}
              style={{
                color: priorityLevels.find(p => p.value === priority)?.color || '#374151'
              }}
            >
              {priorityLevels.map((level) => (
                <option key={level.value} value={level.value} style={{ color: level.color }}>
                  {level.label}
                </option>
              ))}
            </select>
            <div 
              className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full"
              style={{
                backgroundColor: priorityLevels.find(p => p.value === priority)?.color || '#10b981'
              }}
            ></div>
          </div>
        </label>
        
        <label className="text-sm">
          {getDocNumberLabel()}
          <input 
            type="text" 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={docNumber} 
            onChange={(e) => setDocNumber(e.target.value)} 
            placeholder={`أدخل ${getDocNumberLabel()}`}
          />
        </label>
        
        <label className="text-sm">
          تاريخ الوثيقة
          <input 
            type="date" 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={docDate} 
            onChange={(e) => setDocDate(e.target.value)} 
          />
        </label>
        
        <label className="text-sm">
          رقم الديوان
          <input 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={diwanNumber} 
            onChange={(e) => setDiwanNumber(e.target.value)} 
            placeholder="رقم الديوان المرجعي" 
          />
        </label>
        
        <label className="text-sm md:col-span-2 lg:col-span-3">
          العنوان الرئيسي *
          <input className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="العنوان الرئيسي للوثيقة" />
        </label>
        
        <label className="text-sm md:col-span-2">
          العنوان الفرعي/الموضوع
          <input className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="تفصيل إضافي للموضوع" />
        </label>
        
        <label className="text-sm">
          الجهة الصادرة *
          <div className="mt-1 space-y-2">
            <select 
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">اختر من القائمة أو أدخل يدوياً...</option>
              {issuingAuthorities.map((authority, index) => (
                <option key={index} value={authority}>{authority}</option>
              ))}
            </select>
            <input 
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700 text-sm" 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)} 
              placeholder="أو اكتب اسم الجهة الصادرة يدوياً..."
            />
          </div>
        </label>
        
        {docType === 'محضر' && (
          <label className="text-sm md:col-span-2">
            المشاركون *
            <input className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="أسماء المشاركين في الاجتماع (مفصولة بفواصل)" />
          </label>
        )}
        
        {(docType === 'تقرير' || docType === 'خطاب' || docType === 'تعميم') && (
          <label className="text-sm">
            المؤلف/المُعد {(docType === 'خطاب' || docType === 'تعميم') ? '*' : ''}
            <input className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="اسم معد الوثيقة" />
          </label>
        )}
        
        <label className="text-sm">
          المسؤول عن الإدخال *
          <input 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={responsibleEmployee} 
            onChange={(e) => setResponsibleEmployee(e.target.value)} 
            placeholder="اسم الموظف المسؤول عن إدخال البيانات" 
            required
          />
        </label>

        {/* حقول إضافية محسنة للتوثيق */}
        <label className="text-sm">
          اسم المستلم
          <input 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={recipientName} 
            onChange={(e) => setRecipientName(e.target.value)} 
            placeholder="اسم الشخص أو الجهة المستلمة" 
          />
        </label>

        <label className="text-sm">
          منصب المستلم
          <input 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={recipientPosition} 
            onChange={(e) => setRecipientPosition(e.target.value)} 
            placeholder="المنصب أو الدرجة الوظيفية" 
          />
        </label>

        <label className="text-sm">
          رقم المرجع
          <input 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={referenceNumber} 
            onChange={(e) => setReferenceNumber(e.target.value)} 
            placeholder="رقم الوثيقة المرجعية" 
          />
        </label>

        <label className="text-sm">
          مستوى الاستعجال
          <select 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={urgencyLevel} 
            onChange={(e) => setUrgencyLevel(e.target.value as any)}
          >
            <option value="عادي">عادي</option>
            <option value="مستعجل">مستعجل</option>
            <option value="عاجل جداً">عاجل جداً</option>
          </select>
        </label>

        <label className="text-sm">
          مستوى السرية
          <select 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={confidentialityLevel} 
            onChange={(e) => setConfidentialityLevel(e.target.value as any)}
          >
            <option value="عام">عام</option>
            <option value="محدود">محدود</option>
            <option value="سري">سري</option>
            <option value="سري جداً">سري جداً</option>
          </select>
        </label>

        <label className="text-sm">
          الموعد النهائي
          <input 
            type="date"
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={deadline} 
            onChange={(e) => setDeadline(e.target.value)} 
          />
        </label>

        <label className="text-sm">
          تاريخ المتابعة المطلوبة
          <input 
            type="date"
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={followUpDate} 
            onChange={(e) => setFollowUpDate(e.target.value)} 
            disabled={!followUpRequired}
          />
        </label>

        <div className="text-sm flex items-center space-x-2">
          <input 
            type="checkbox" 
            id="followUpRequired"
            checked={followUpRequired} 
            onChange={(e) => setFollowUpRequired(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <label htmlFor="followUpRequired" className="text-sm cursor-pointer">
            يتطلب متابعة
          </label>
        </div>

        <label className="text-sm md:col-span-2">
          الكلمات المفتاحية
          <input 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={keywords} 
            onChange={(e) => setKeywords(e.target.value)} 
            placeholder="كلمات مفتاحية للبحث (مفصولة بفواصل)" 
          />
        </label>

        <label className="text-sm md:col-span-2">
          الوثائق ذات الصلة
          <input 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={relatedDocuments} 
            onChange={(e) => setRelatedDocuments(e.target.value)} 
            placeholder="أرقام الوثائق المرتبطة (مفصولة بفواصل)" 
          />
        </label>

        <label className="text-sm md:col-span-2">
          الإجراء المطلوب
          <textarea 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={actionRequired} 
            onChange={(e) => setActionRequired(e.target.value)} 
            placeholder="وصف الإجراء أو القرار المطلوب اتخاذه"
            rows={2}
          />
        </label>

        <label className="text-sm">
          المبلغ المالي (إن وجد)
          <input 
            type="number"
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={budgetAmount} 
            onChange={(e) => setBudgetAmount(e.target.value)} 
            placeholder="المبلغ بالليرة السورية" 
          />
        </label>

        <label className="text-sm">
          المرجع القانوني
          <input 
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
            value={legalReference} 
            onChange={(e) => setLegalReference(e.target.value)} 
            placeholder="رقم القانون أو التعليمات" 
          />
        </label>
        
        <div className="text-sm md:col-span-2 lg:col-span-3">
          <label className="block mb-2">المرفقات</label>
          <div className="space-y-3">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xls,.xlsx"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  اضغط لرفع الملفات أو اسحبها هنا
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  PDF, DOC, DOCX, TXT, JPG, PNG, XLS, XLSX
                </span>
              </label>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">الملفات المرفوعة:</h4>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex items-center justify-center text-xs font-bold">
                        {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadFile(file)}
                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="تحميل الملف"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="حذف الملف"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Text Input for Additional Notes */}
            <input 
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
              value={attachments} 
              onChange={(e) => setAttachments(e.target.value)} 
              placeholder="ملاحظات إضافية حول المرفقات (اختياري)" 
            />
          </div>
        </div>
        
        <label className="text-sm md:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <span>المحتوى *</span>
            {editingTemplate && (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  🔧 تحرير النموذج
                </span>
                <Button 
                  onClick={() => setShowSaveDialog(true)}
                  className="text-xs px-3 py-1"
                  variant="primary"
                >
                  حفظ باسم
                </Button>
                <Button 
                  onClick={() => setEditingTemplate(false)}
                  className="text-xs px-3 py-1"
                  variant="secondary"
                >
                  إنهاء التحرير
                </Button>
              </div>
            )}
          </div>
          
          {/* شريط أدوات التحرير */}
          <div className="flex flex-wrap items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">إدراج:</span>
              <button
                onClick={() => insertText('• ')}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                title="نقطة تعداد"
              >
                •
              </button>
              <button
                onClick={() => insertText('1. ')}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                title="ترقيم"
              >
                1.
              </button>
              <button
                onClick={() => insertText('━━━━━━━━━━━━━━━━━━━━\n')}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                title="خط فاصل"
              >
                ──
              </button>
              <button
                onClick={() => insertText(`\n${getFormattedDate()}\n`)}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                title="تاريخ اليوم"
              >
                تاريخ
              </button>
              <button
                onClick={insertEmployeeSignature}
                className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                title="إضافة التوقيع الإلكتروني للمسؤول عن الإدخال"
              >
                توقيع
              </button>
            </div>
            
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">أدوات:</span>
              <button
                onClick={formatContent}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                title="تنسيق المحتوى"
              >
                تنسيق
              </button>
              <button
                onClick={() => setContent('')}
                className="text-xs px-2 py-1 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-600 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                title="مسح المحتوى"
              >
                مسح
              </button>
            </div>
          </div>
          
          <div className="relative">
            <textarea 
              className="mt-1 w-full border rounded p-3 dark:bg-gray-800 dark:border-gray-700 resize-none transition-all duration-200 leading-6 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              style={{ height: `${contentHeight}px` }}
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="النص الكامل للوثيقة..."
              dir="rtl"
            />
            
            {/* مؤشر عدد الأسطر والكلمات */}
            <div className="absolute bottom-2 left-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
              الأسطر: {content.split('\n').length} | الكلمات: {content.trim() ? content.trim().split(/\s+/).length : 0} | الأحرف: {content.length}
            </div>
            
            {/* أزرار التحكم في الحجم */}
            <div className="absolute top-2 left-2 flex gap-1">
              <button
                onClick={() => setContentHeight(Math.max(120, contentHeight - 60))}
                className="w-6 h-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs flex items-center justify-center text-gray-600 dark:text-gray-300"
                title="تصغير المحرر"
              >
                −
              </button>
              <button
                onClick={() => setContentHeight(Math.min(800, contentHeight + 60))}
                className="w-6 h-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs flex items-center justify-center text-gray-600 dark:text-gray-300"
                title="تكبير المحرر"
              >
                +
              </button>
              <button
                onClick={() => setContentHeight(calculateContentHeight(content))}
                className="w-6 h-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs flex items-center justify-center text-gray-600 dark:text-gray-300"
                title="ضبط تلقائي"
              >
                ↕
              </button>
            </div>
          </div>
        </label>

        {/* الأقسام المرسل إليها - محسن */}
        <div className="col-span-full">
          <label className="text-sm block">
            الأقسام المرسل إليها
            <div className="mt-2 flex gap-2 mb-3 flex-wrap">
              <button
                type="button"
                onClick={() => setSentToDepartments([...availableDepartments])}
                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={() => setSentToDepartments([])}
                className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
              >
                إلغاء الكل
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  محدد: {sentToDepartments.length} من {availableDepartments.length} قسم
                </span>
                {sentToDepartments.length > 0 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {sentToDepartments.slice(0, 2).join('، ')}
                    {sentToDepartments.length > 2 && `... و ${sentToDepartments.length - 2} آخرين`}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-1 max-h-48 overflow-y-auto border rounded p-3 dark:bg-gray-800 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {availableDepartments.map((dept, index) => (
                <label key={index} className="flex items-center space-x-2 space-x-reverse text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={sentToDepartments.includes(dept)}
                    onChange={() => {
                      setSentToDepartments(prev => {
                        if (prev.includes(dept)) {
                          return prev.filter(d => d !== dept);
                        } else {
                          return [...prev, dept];
                        }
                      });
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 text-gray-700 dark:text-gray-300">{dept}</span>
                  {sentToDepartments.includes(dept) && (
                    <span className="text-blue-500 text-xs">✓</span>
                  )}
                </label>
              ))}
            </div>
          </label>
        </div>

        {/* قسم النفاذ والتعديلات والتصنيفات */}
        <div className="md:col-span-2 lg:col-span-3 space-y-6">
          {/* إدارة النفاذ */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/20">
            <h4 className="text-md font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
              إدارة النفاذ
            </h4>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <input 
                  type="text" 
                  placeholder="اسم المستخدم" 
                  className="flex-1 min-w-[120px] border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      const roleSelect = target.nextElementSibling as HTMLSelectElement;
                      const deptInput = roleSelect?.nextElementSibling as HTMLInputElement;
                      if (target.value.trim() && roleSelect?.value && deptInput?.value.trim()) {
                        addAccessUser(target.value.trim(), roleSelect.value as any, deptInput.value.trim());
                        target.value = '';
                        roleSelect.value = 'قراءة';
                        deptInput.value = '';
                      }
                    }
                  }}
                />
                <select className="border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700">
                  <option value="قراءة">قراءة</option>
                  <option value="كتابة">كتابة</option>
                  <option value="مدير">مدير</option>
                </select>
                <input 
                  type="text" 
                  placeholder="الجهة الصادرة" 
                  className="flex-1 min-w-[100px] border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                />
                <button 
                  type="button"
                  onClick={(e) => {
                    const parent = (e.target as HTMLElement).parentElement;
                    const inputs = parent?.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
                    const selects = parent?.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
                    const nameInput = inputs[0];
                    const roleSelect = selects[0];
                    const deptInput = inputs[1];
                    if (nameInput?.value.trim() && roleSelect?.value && deptInput?.value.trim()) {
                      addAccessUser(nameInput.value.trim(), roleSelect.value as any, deptInput.value.trim());
                      nameInput.value = '';
                      roleSelect.value = 'قراءة';
                      deptInput.value = '';
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  إضافة
                </button>
              </div>
              
              {accessUsers.length > 0 && (
                <div className="space-y-2">
                  {accessUsers.map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-medium">{user.name}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.role === 'مدير' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                          user.role === 'كتابة' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                        }`}>
                          {user.role}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">{user.department}</span>
                        <span className="text-xs text-gray-500">
                          {(() => {
                            const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                            const convertToArabic = (text: string) => text.replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                            return convertToArabic(new Date(user.dateAdded).toLocaleDateString('ar-SY'));
                          })()}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeAccessUser(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* إدارة التعديلات */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-green-50/50 dark:bg-green-900/20">
            <h4 className="text-md font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
              إدارة التعديلات
            </h4>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <input 
                  type="text" 
                  placeholder="وصف التعديل" 
                  className="flex-1 min-w-[200px] border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                />
                <select className="border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700">
                  <option value="تعديل جزئي">تعديل جزئي</option>
                  <option value="تعديل شامل">تعديل شامل</option>
                  <option value="مراجعة">مراجعة</option>
                  <option value="تصحيح">تصحيح</option>
                </select>
                <button 
                  type="button"
                  onClick={(e) => {
                    const parent = (e.target as HTMLElement).parentElement;
                    const inputs = parent?.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
                    const selects = parent?.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
                    const changesInput = inputs[0];
                    const typeSelect = selects[0];
                    if (changesInput?.value.trim()) {
                      addRevision(changesInput.value.trim(), typeSelect?.value as any);
                      changesInput.value = '';
                      if (typeSelect) typeSelect.value = 'تعديل جزئي';
                    }
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  إضافة تعديل
                </button>
              </div>
              
              {revisions.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    سجل التعديلات ({(() => {
                      const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                      const convertToArabic = (text: string) => text.replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                      return convertToArabic(revisions.length.toString());
                    })()})
                  </h5>
                  {revisions.map((revision, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded border">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-blue-600">{revision.version}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            revision.type === 'تعديل شامل' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                            revision.type === 'مراجعة' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' :
                            revision.type === 'تصحيح' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                          }`}>
                            {revision.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{revision.changes}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>بواسطة: {revision.author}</span>
                          <span>{(() => {
                            const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                            const convertToArabic = (text: string) => text.replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                            return convertToArabic(new Date(revision.date).toLocaleDateString('ar-SY'));
                          })()}</span>
                          <span>{(() => {
                            const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                            const convertToArabic = (text: string) => text.replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                            return convertToArabic(new Date(revision.date).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }));
                          })()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* إدارة التصنيفات */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-900/20">
            <h4 className="text-md font-semibold text-purple-800 dark:text-purple-200 mb-3 flex items-center gap-2">
              إدارة التصنيفات
            </h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                <input 
                  type="text" 
                  placeholder="فئة التصنيف" 
                  className="border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                />
                <select className="border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700">
                  <option value="عام">عام</option>
                  <option value="محدود">محدود</option>
                  <option value="سري">سري</option>
                  <option value="سري جداً">سري جداً</option>
                </select>
                <input 
                  type="text" 
                  placeholder="العلامات (مفصولة بفواصل)" 
                  className="border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                />
                <input 
                  type="date" 
                  placeholder="صالح حتى" 
                  className="border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  const parent = (e.target as HTMLElement).parentElement;
                  const inputs = parent?.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
                  const selects = parent?.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
                  const categoryInput = inputs[0];
                  const levelSelect = selects[0];
                  const tagsInput = inputs[1];
                  const validInput = inputs[2];
                  if (categoryInput?.value.trim() && validInput?.value) {
                    const tags = tagsInput?.value.split(',').map(tag => tag.trim()).filter(tag => tag) || [];
                    addClassification(categoryInput.value.trim(), levelSelect?.value as any, tags, validInput.value);
                    categoryInput.value = '';
                    levelSelect.value = 'عام';
                    if (tagsInput) tagsInput.value = '';
                    validInput.value = '';
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
              >
                إضافة تصنيف
              </button>
              
              {classifications.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    التصنيفات الحالية ({(() => {
                      const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                      const convertToArabic = (text: string) => text.replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                      return convertToArabic(classifications.length.toString());
                    })()})
                  </h5>
                  {classifications.map((classification, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{classification.category}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            classification.level === 'سري جداً' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                            classification.level === 'سري' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' :
                            classification.level === 'محدود' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                          }`}>
                            {classification.level}
                          </span>
                        </div>
                        {classification.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {classification.tags.map((tag, tagIndex) => (
                              <span key={tagIndex} className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          صالح حتى: {(() => {
                            const arabicNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                            const convertToArabic = (text: string) => text.replace(/[0-9]/g, (w) => arabicNumerals[parseInt(w)]);
                            return convertToArabic(new Date(classification.validUntil).toLocaleDateString('ar-SY'));
                          })()}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeClassification(index)}
                        className="text-red-600 hover:text-red-800 text-sm ml-2"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* ملخص المعلومات الإضافية */}
        {(recipientName || urgencyLevel !== 'عادي' || confidentialityLevel !== 'عام' || deadline || followUpRequired || keywords || budgetAmount || legalReference) && (
          <div className="md:col-span-2 lg:col-span-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="text-md font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
              📋 ملخص المعلومات الإضافية
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {recipientName && (
                <div className="flex gap-2">
                  <span className="font-medium text-amber-700 dark:text-amber-300">المستلم:</span>
                  <span className="text-amber-600 dark:text-amber-400">{recipientName}</span>
                </div>
              )}
              {recipientPosition && (
                <div className="flex gap-2">
                  <span className="font-medium text-amber-700 dark:text-amber-300">المنصب:</span>
                  <span className="text-amber-600 dark:text-amber-400">{recipientPosition}</span>
                </div>
              )}
              {urgencyLevel !== 'عادي' && (
                <div className="flex gap-2">
                  <span className="font-medium text-amber-700 dark:text-amber-300">الاستعجال:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    urgencyLevel === 'عاجل جداً' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                    urgencyLevel === 'مستعجل' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
                  }`}>
                    {urgencyLevel}
                  </span>
                </div>
              )}
              {confidentialityLevel !== 'عام' && (
                <div className="flex gap-2">
                  <span className="font-medium text-amber-700 dark:text-amber-300">السرية:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    confidentialityLevel === 'سري جداً' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                    confidentialityLevel === 'سري' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
                  }`}>
                    {confidentialityLevel}
                  </span>
                </div>
              )}
              {deadline && (
                <div className="flex gap-2">
                  <span className="font-medium text-amber-700 dark:text-amber-300">الموعد النهائي:</span>
                  <span className="text-amber-600 dark:text-amber-400">{deadline}</span>
                </div>
              )}
              {followUpRequired && (
                <div className="flex gap-2">
                  <span className="font-medium text-amber-700 dark:text-amber-300">المتابعة:</span>
                  <span className="text-green-600 dark:text-green-400">
                    مطلوبة {followUpDate && `- ${followUpDate}`}
                  </span>
                </div>
              )}
              {keywords && (
                <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                  <span className="font-medium text-amber-700 dark:text-amber-300">الكلمات المفتاحية:</span>
                  <div className="flex flex-wrap gap-1">
                    {keywords.split(',').map((keyword, idx) => (
                      <span key={idx} className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-1 rounded text-xs">
                        {keyword.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {budgetAmount && (
                <div className="flex gap-2">
                  <span className="font-medium text-amber-700 dark:text-amber-300">المبلغ:</span>
                  <span className="text-amber-600 dark:text-amber-400">{Number(budgetAmount).toLocaleString('ar-SY')} ل.س</span>
                </div>
              )}
              {legalReference && (
                <div className="flex gap-2">
                  <span className="font-medium text-amber-700 dark:text-amber-300">المرجع القانوني:</span>
                  <span className="text-amber-600 dark:text-amber-400">{legalReference}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Action Section - Integrated */}
        <div className="md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-lg">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
            <span className="flex items-center gap-1">
              اعتماد دقة المعلومات
              {approved && <span className="text-green-600">✓</span>}
            </span>
          </label>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={validate} className="text-sm">
              تحقق من البيانات
            </Button>
            <Button 
              onClick={() => setShowMessagingModal(true)} 
              disabled={!title.trim() || !content.trim()} 
              className="bg-green-600 hover:bg-green-700 text-sm"
            >
              مراسلة الأقسام
            </Button>
            <DownloadButton onWordDownload={download} onPDFDownload={downloadPDF} disabled={errors.length > 0} />
          </div>
        </div>
      </div>

      {/* Messaging Modal */}
      {showMessagingModal && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowMessagingModal(false)}>
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[92vw] max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-xl overflow-hidden border border-white/20 bg-white dark:bg-gray-900 shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
                <h3 className="text-base font-semibold text-green-800 dark:text-green-200">مراسلة الأقسام</h3>
                <button className="w-8 h-8 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setShowMessagingModal(false)}>✕</button>
              </div>
              
              <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Document Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">الوثيقة المرفقة:</span>
                    <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-blue-600 text-xs">{docId}</code>
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>{docType}:</strong> {title}
                    {subtitle && <div className="text-xs mt-1">{subtitle}</div>}
                  </div>
                </div>

                {/* Message Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-sm md:col-span-2">
                    موضوع الرسالة *
                    <input 
                      className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
                      value={messageSubject} 
                      onChange={(e) => setMessageSubject(e.target.value)} 
                      placeholder="موضوع الرسالة"
                    />
                  </label>
                  
                  <label className="text-sm">
                    الأولوية
                    <select className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={messagePriority} onChange={(e) => setMessagePriority(e.target.value as any)}>
                      <option>عادي</option>
                      <option>هام</option>
                      <option>عاجل</option>
                    </select>
                  </label>
                  
                  <div className="text-sm">
                    <label>من الجهة</label>
                    <input 
                      className="mt-1 w-full border rounded p-2 bg-gray-100 dark:bg-gray-700 dark:border-gray-600" 
                      value={department || 'الديوان العام'} 
                      readOnly
                    />
                  </div>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">اختيار الأقسام المستلمة *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded p-3 bg-gray-50 dark:bg-gray-800">
                    {getDepartmentsList().map(dept => (
                      <label key={dept} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white dark:hover:bg-gray-700 p-1 rounded">
                        <input 
                          type="checkbox" 
                          checked={selectedDepartments.includes(dept)}
                          onChange={() => toggleDepartment(dept)}
                        />
                        <span className={selectedDepartments.includes(dept) ? 'font-medium text-green-700 dark:text-green-300' : ''}>{dept}</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    تم اختيار {selectedDepartments.length} من {getDepartmentsList().length} أقسام
                  </div>
                </div>

                {/* Message Body */}
                <label className="text-sm">
                  نص الرسالة
                  <textarea 
                    className="mt-1 w-full min-h-[100px] border rounded p-2 dark:bg-gray-800 dark:border-gray-700" 
                    value={messageBody} 
                    onChange={(e) => setMessageBody(e.target.value)} 
                    placeholder="نص الرسالة (اختياري - سيتم إرفاق الوثيقة كاملة)"
                  />
                </label>

                {/* Selected Departments Summary */}
                {selectedDepartments.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                    <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">الأقسام المختارة:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedDepartments.map(dept => (
                        <span key={dept} className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded text-xs">
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="secondary" onClick={() => setShowMessagingModal(false)}>
                    إلغاء
                  </Button>
                  <Button 
                    onClick={sendMessage} 
                    disabled={!messageSubject.trim() || selectedDepartments.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    إرسال المراسلة
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مربع حوار حفظ النموذج */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
              حفظ النموذج المحرر
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم النموذج
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-gray-200"
                  placeholder="مثال: نموذج محضر محدث، نموذج تقرير مخصص..."
                  autoFocus
                />
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  💡 <strong>ملاحظة:</strong> سيتم حفظ النموذج المحرر ليصبح متاحاً للاستخدام في المستقبل. 
                  يمكنك الوصول إليه من قائمة "النماذج المحفوظة".
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowSaveDialog(false);
                  setTemplateName('');
                }}
                variant="secondary"
              >
                إلغاء
              </Button>
              <Button
                onClick={saveTemplate}
                variant="primary"
                disabled={!templateName.trim()}
              >
                حفظ النموذج
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Research Tool Component
const ResearchTool: React.FC<{ onDownload: (filename: string, content: string) => void; onSaved?: () => void }> = ({ onDownload, onSaved }) => {
  const [keywords, setKeywords] = useState('');
  const [objective, setObjective] = useState('');
  const [notes, setNotes] = useState('');
  const memo = useMemo(() => {
  const today = new Date().toLocaleDateString('ar-SY-u-nu-latn');
    return `مذكرة معلومات\nالتاريخ: ${today}\n\nالموضوع: ${objective || '—'}\nالكلمات المفتاحية: ${keywords || '—'}\n\nالملخص التنفيذي:\n- ...\n\nالتحليل والمقارنات:\n- ...\n\nملاحظات إضافية:\n${notes || '—'}\n\nالتوصيات:\n- ...`;
  }, [keywords, objective, notes]);

  const download = () => {
    // persist record for stats
    try {
      const list = JSON.parse(localStorage.getItem('diwanResearch') || '[]');
      list.unshift({ id: `RSC-${Date.now()}`, objective, keywords, dateISO: new Date().toISOString() });
      localStorage.setItem('diwanResearch', JSON.stringify(list));
    } catch { /* ignore */ }
    onSaved?.();
    onDownload(`مذكرة-معلومات-${new Date().toISOString().slice(0,10)}.md`, memo);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm">
          الكلمات المفتاحية
          <input className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="أدخل كلمات البحث" />
        </label>
        <label className="text-sm">
          الهدف/الموضوع
          <input className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="ما الهدف من الدراسة؟" />
        </label>
        <label className="text-sm md:col-span-2">
          ملاحظات أولية
          <textarea className="mt-1 w-full min-h-[120px] border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="نقاط أساسية، مصادر، قيود..." />
        </label>
      </div>
      <div>
        <h4 className="font-semibold mb-2">معاينة مذكرة المعلومات</h4>
        <pre className="whitespace-pre-wrap text-sm rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">{memo}</pre>
      </div>
      <div className="flex items-center justify-end">
        <Button onClick={download}>تنزيل المذكرة</Button>
      </div>
    </div>
  );
};

// Archive Tool Component
type Retention = 'سنة' | '3 سنوات' | '5 سنوات' | 'دائم';
const ArchiveTool: React.FC<{ onDownload: (filename: string, content: string) => void; generateClassificationId: () => string; onSaved?: () => void }> = ({ onDownload, generateClassificationId, onSaved }) => {
  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState<string>(generateClassificationId());
  const [retention, setRetention] = useState<Retention>('5 سنوات');
  const [list, setList] = useState<Array<{ id: string; title: string; retention: Retention; destroyAt?: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('diwanArchive') || '[]'); } catch { return []; }
  });
  const [query, setQuery] = useState('');

  const calcDestroyAt = (ret: Retention) => {
    if (ret === 'دائم') return undefined;
    const years = ret === 'سنة' ? 1 : ret === '3 سنوات' ? 3 : 5;
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().slice(0,10);
  };

  const save = () => {
    if (!title.trim()) return;
    const item = { id: classification, title, retention, destroyAt: calcDestroyAt(retention) };
    const next = [item, ...list];
    setList(next);
  localStorage.setItem('diwanArchive', JSON.stringify(next));
    const meta = `رقم التصنيف: ${item.id}\nالعنوان: ${item.title}\nسياسة الاحتفاظ: ${item.retention}${item.destroyAt ? `\nتاريخ الإتلاف المتوقع: ${item.destroyAt}` : ''}`;
    onDownload(`Archive-${item.id}.txt`, meta);
  onSaved?.();
    // reset for next entry
    setTitle('');
    setClassification(generateClassificationId());
  };

  const filtered = useMemo(() => list.filter(i => i.title.includes(query)), [list, query]);

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="text-sm md:col-span-2">
          عنوان السجل
          <input className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: كتاب وارد من الجهة X" />
        </label>
        <label className="text-sm">
          رقم/تصنيف
          <div className="mt-1 flex items-center gap-2">
            <input className="flex-1 border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={classification} onChange={(e) => setClassification(e.target.value)} />
            <Button variant="secondary" onClick={() => setClassification(generateClassificationId())}>توليد</Button>
          </div>
        </label>
        <label className="text-sm">
          سياسة الاحتفاظ
          <select className="mt-1 w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={retention} onChange={(e) => setRetention(e.target.value as Retention)}>
            <option>سنة</option>
            <option>3 سنوات</option>
            <option>5 سنوات</option>
            <option>دائم</option>
          </select>
        </label>
        <div className="md:col-span-2 flex items-end">
          <Button onClick={save}>حفظ كأرشيف</Button>
        </div>
      </div>
      <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold">استرجاع سريع</h4>
          <input className="w-64 border rounded p-2 dark:bg-gray-800 dark:border-gray-700" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث بالعنوان" />
        </div>
        {filtered.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">لا توجد سجلات مطابقة.</div>
        ) : (
          <ul className="text-sm space-y-2">
            {filtered.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{i.id} • {i.retention}{i.destroyAt ? ` • إتلاف: ${i.destroyAt}` : ''}</div>
                </div>
                <Button variant="secondary" onClick={() => onDownload(`Archive-${i.id}.txt`, `رقم التصنيف: ${i.id}\nالعنوان: ${i.title}\nسياسة الاحتفاظ: ${i.retention}${i.destroyAt ? `\nتاريخ الإتلاف المتوقع: ${i.destroyAt}` : ''}`)}>تنزيل</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// مكون البريد الوارد المحسن
const InboxTool: React.FC<{ onSaved?: () => void; department?: string }> = ({ onSaved, department }) => {
  const [mails, setMails] = useState<Array<{
    id: string;
    mailNumber: string;
    sender: string;
    subject: string;
    content: string;
    source: 'الطلبات' | 'الشكاوى' | 'تواصل معنا';
    priority: 'عادي' | 'هام' | 'عاجل';
    read: boolean;
    dateISO: string;
    attachments?: string[];
    responseRequired?: boolean;
    category?: string;
    dueDate?: string;
    reminderDate?: string;
    status: 'جديد' | 'قيد المراجعة' | 'مكتمل' | 'متأخر';
    assignedTo?: string;
    tags?: string[];
  }>>([]);
  const [selectedMail, setSelectedMail] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'priority' | 'source' | 'overdue' | 'due-today'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'sender' | 'mailNumber' | 'dueDate'>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderMailId, setReminderMailId] = useState<string | null>(null);
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [activeReminders, setActiveReminders] = useState<Array<{
    id: string;
    mailId: string;
    mailSubject: string;
    reminderDateTime: string;
    note: string;
    dismissed: boolean;
  }>>([]);
  const [selectedMailForReminder, setSelectedMailForReminder] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    mailId: string;
    type: 'due-soon' | 'overdue' | 'reminder';
    message: string;
    dateISO: string;
    dismissed: boolean;
  }>>([]);

  // إنشاء مفتاح التخزين المنفصل لكل قسم
  const storageKey = department ? `diwanInbox_${department.replace(/\s/g, '_')}` : 'diwanInbox_general';
  const remindersKey = department ? `diwanReminders_${department.replace(/\s/g, '_')}` : 'diwanReminders_general';

  // دالة فحص التنبيهات والتذكيرات
  const checkNotifications = () => {
    const now = new Date();
    const today = now.toDateString();
    const newNotifications: typeof notifications = [];

    mails.forEach(mail => {
      // فحص الرسائل المتأخرة
      if (mail.dueDate) {
        const dueDate = new Date(mail.dueDate);
        if (dueDate < now && mail.status !== 'مكتمل') {
          newNotifications.push({
            id: `overdue-${mail.id}`,
            mailId: mail.id,
            type: 'overdue',
            message: `الرسالة رقم ${mail.mailNumber} متأخرة - ${mail.subject}`,
            dateISO: now.toISOString(),
            dismissed: false
          });
        }
        // فحص الرسائل المستحقة قريباً (خلال يومين)
        else if (dueDate.getTime() - now.getTime() <= 2 * 24 * 60 * 60 * 1000 && dueDate >= now) {
          newNotifications.push({
            id: `due-soon-${mail.id}`,
            mailId: mail.id,
            type: 'due-soon',
            message: `الرسالة رقم ${mail.mailNumber} مستحقة قريباً - ${mail.subject}`,
            dateISO: now.toISOString(),
            dismissed: false
          });
        }
      }
    });

    // فحص التذكيرات المجدولة
    activeReminders.forEach(reminder => {
      const reminderDate = new Date(reminder.reminderDateTime);
      if (reminderDate <= now && !reminder.dismissed) {
        newNotifications.push({
          id: `reminder-${reminder.id}`,
          mailId: reminder.mailId,
          type: 'reminder',
          message: `تذكير: ${reminder.mailSubject} - ${reminder.note}`,
          dateISO: now.toISOString(),
          dismissed: false
        });
      }
    });

    setNotifications(prev => [...prev.filter(n => n.dismissed), ...newNotifications]);
  };

  // دالة إضافة تذكير
  const addReminder = () => {
    if (!reminderMailId || !reminderDateTime) return;
    
    const mail = mails.find(m => m.id === reminderMailId);
    if (!mail) return;

    const newReminder = {
      id: `reminder-${Date.now()}`,
      mailId: reminderMailId,
      mailSubject: mail.subject,
      reminderDateTime,
      note: reminderNote,
      dismissed: false
    };

    const updatedReminders = [...activeReminders, newReminder];
    setActiveReminders(updatedReminders);
    localStorage.setItem(remindersKey, JSON.stringify(updatedReminders));
    
    // إعادة تعيين النموذج
    setReminderMailId(null);
    setReminderDateTime('');
    setReminderNote('');
    setShowReminderModal(false);
  };

  // دالة تحديث رقم الرسالة
  const updateMailNumber = (mailId: string, newNumber: string) => {
    const updatedMails = mails.map(mail => 
      mail.id === mailId ? { ...mail, mailNumber: newNumber } : mail
    );
    setMails(updatedMails);
    localStorage.setItem(storageKey, JSON.stringify(updatedMails));
    onSaved?.();
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMails(parsed);
      } else {
        // إضافة بيانات تجريبية محسنة ومختلفة لكل قسم
        const departmentName = department || 'القسم العام';
        const currentYear = new Date().getFullYear();
        const sampleMails = [
          {
            id: `mail-${Date.now()}-1`,
            mailNumber: `IN-${currentYear}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            sender: 'أحمد محمد علي',
            subject: `طلب استعلام عن حالة المعاملة - ${departmentName}`,
            content: `السلام عليكم ورحمة الله وبركاته\n\nأتقدم بطلب الاستعلام عن حالة المعاملة رقم INQ-2024-${Math.floor(Math.random() * 10000)} المقدمة لـ ${departmentName} بتاريخ 2024/09/01.\n\nأرجو التكرم بإفادتي عن الوضع الحالي للمعاملة والإجراءات المطلوبة إن وجدت.\n\nمع فائق الاحترام والتقدير\nأحمد محمد علي\nالرقم الوطني: 12345678901`,
            source: 'الطلبات' as const,
            priority: 'عادي' as const,
            read: false,
            dateISO: new Date().toISOString(),
            attachments: ['صورة_الهوية.pdf', 'وثيقة_المعاملة.pdf'],
            responseRequired: true,
            category: 'استعلامات',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            reminderDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'جديد' as const,
            assignedTo: 'موظف الاستعلامات',
            tags: ['استعلام', 'معاملة', 'متابعة']
          },
          {
            id: `mail-${Date.now()}-2`,
            mailNumber: `IN-${currentYear}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            sender: 'فاطمة علي حسن',
            subject: `شكوى عاجلة - تأخير في الخدمة بـ ${departmentName}`,
            content: `السادة المحترمون في ${departmentName}\n\nأتقدم بشكوى رسمية بخصوص التأخير الغير مبرر في تقديم الخدمة المطلوبة.\n\nتفاصيل الشكوى:\n- تاريخ تقديم الطلب: 2024/08/15\n- رقم المعاملة: COM-2024-${Math.floor(Math.random() * 10000)}\n- نوع الخدمة: إصدار شهادة ضريبية\n- مدة التأخير: 25 يوم\n\nأرجو النظر في الموضوع واتخاذ الإجراءات اللازمة.\n\nشكراً لتعاونكم`,
            source: 'الشكاوى' as const,
            priority: 'عاجل' as const,
            read: false,
            dateISO: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            responseRequired: true,
            category: 'شكاوى الخدمة',
            dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // متأخرة
            status: 'متأخر' as const,
            assignedTo: 'مسؤول الشكاوى',
            tags: ['شكوى', 'تأخير', 'عاجل', 'متأخر']
          },
          {
            id: `mail-${Date.now()}-3`,
            mailNumber: `IN-${currentYear}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            sender: 'محمد خالد إبراهيم',
            subject: `استفسار حول الإجراءات المطلوبة - ${departmentName}`,
            content: `تحية طيبة\n\nأرجو التكرم بإفادتي عن الإجراءات والوثائق المطلوبة لإتمام المعاملة التالية:\n- نوع المعاملة: تحديث البيانات الضريبية\n- حالة المكلف: شركة محدودة المسؤولية\n\nكما أرجو توضيح الرسوم المترتبة والمدة الزمنية المتوقعة.\n\nوشكراً مقدماً`,
            source: 'تواصل معنا' as const,
            priority: 'هام' as const,
            read: true,
            dateISO: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            responseRequired: true,
            category: 'استفسارات',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'قيد المراجعة' as const,
            assignedTo: 'موظف الاستفسارات',
            tags: ['استفسار', 'إجراءات', 'شركة']
          },
          {
            id: `mail-${Date.now()}-4`,
            mailNumber: `IN-${currentYear}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            sender: 'سارة أحمد محمود',
            subject: `طلب موعد - ${departmentName}`,
            content: `السلام عليكم\n\nأرغب في حجز موعد للمراجعة الشخصية بخصوص:\n- تقديم إقرار ضريبي معدل\n- مراجعة الحسابات الضريبية\n\nالأوقات المناسبة لي:\n- الأحد إلى الأربعاء من 9:00 - 12:00\n- أو الخميس من 13:00 - 15:00\n\nأرجو التأكيد على الموعد\n\nمع التقدير`,
            source: 'الطلبات' as const,
            priority: 'عادي' as const,
            read: false,
            dateISO: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            responseRequired: true,
            category: 'مواعيد',
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // غداً
            status: 'جديد' as const,
            assignedTo: 'موظف المواعيد',
            tags: ['موعد', 'مراجعة', 'إقرار']
          }
        ];
        setMails(sampleMails);
        localStorage.setItem(storageKey, JSON.stringify(sampleMails));

        // إنشاء تنبيهات تجريبية
        const sampleNotifications = [
          {
            id: `notif-${Date.now()}-1`,
            mailId: sampleMails[1].id,
            type: 'overdue' as const,
            message: `الرسالة رقم "${sampleMails[1].mailNumber}" متأخرة عن موعد الاستحقاق`,
            dateISO: new Date().toISOString(),
            dismissed: false
          },
          {
            id: `notif-${Date.now()}-2`, 
            mailId: sampleMails[3].id,
            type: 'due-soon' as const,
            message: `الرسالة رقم "${sampleMails[3].mailNumber}" موعد استحقاقها غداً`,
            dateISO: new Date().toISOString(),
            dismissed: false
          }
        ];
        setNotifications(sampleNotifications);
        localStorage.setItem(`${storageKey}_notifications`, JSON.stringify(sampleNotifications));
      }
    } catch { /* ignore */ }
  }, [storageKey, department]);

  // تحميل التنبيهات من localStorage
  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem(`${storageKey}_notifications`);
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }
      
      const savedReminders = localStorage.getItem(remindersKey);
      if (savedReminders) {
        setActiveReminders(JSON.parse(savedReminders));
      }
    } catch { /* ignore */ }
  }, [storageKey, remindersKey]);

  // فحص التنبيهات كل دقيقة
  useEffect(() => {
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000); // كل دقيقة
    return () => clearInterval(interval);
  }, [mails, activeReminders]);

  const markAsRead = (id: string) => {
    const updated = mails.map(m => m.id === id ? { ...m, read: true } : m);
    setMails(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    onSaved?.();
  };

  const updateMailStatus = (id: string, status: 'جديد' | 'قيد المراجعة' | 'مكتمل' | 'متأخر') => {
    const updated = mails.map(m => m.id === id ? { ...m, status } : m);
    setMails(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    onSaved?.();
  };

  const dismissNotification = (notificationId: string) => {
    const updated = notifications.map(n => n.id === notificationId ? { ...n, dismissed: true } : n);
    setNotifications(updated);
    localStorage.setItem(`${storageKey}_notifications`, JSON.stringify(updated));
  };

  const checkForDueReminders = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    mails.forEach(mail => {
      if (!mail.dueDate) return;
      
      const dueDate = new Date(mail.dueDate);
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      
      // التحقق من الرسائل المتأخرة
      if (dueDateOnly < today && mail.status !== 'متأخر') {
        updateMailStatus(mail.id, 'متأخر');
      }
      
      // التحقق من الرسائل المستحقة قريباً
      if (dueDateOnly.getTime() === tomorrow.getTime()) {
        const existingNotification = notifications.find(n => n.mailId === mail.id && n.type === 'due-soon');
        if (!existingNotification) {
          const newNotification = {
            id: `notif-${Date.now()}-${Math.random()}`,
            mailId: mail.id,
            type: 'due-soon' as const,
            message: `الرسالة رقم "${mail.mailNumber}" موعد استحقاقها غداً`,
            dateISO: new Date().toISOString(),
            dismissed: false
          };
          setNotifications(prev => [...prev, newNotification]);
        }
      }
    });
  };

  // فحص التنبيهات كل دقيقة
  useEffect(() => {
    checkForDueReminders();
    const interval = setInterval(checkForDueReminders, 60000);
    return () => clearInterval(interval);
  }, [mails]);

  const getFilteredMails = () => {
    let filtered = [...mails];
    
    // تطبيق الفلتر
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(m => !m.read);
        break;
      case 'priority':
        filtered = filtered.filter(m => m.priority === 'عاجل' || m.priority === 'هام');
        break;
      case 'source':
        // يمكن تخصيصه لاحقاً لفلترة حسب مصدر معين
        break;
      case 'overdue':
        filtered = filtered.filter(m => m.status === 'متأخر');
        break;
      case 'due-today':
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        filtered = filtered.filter(m => 
          m.dueDate && m.dueDate.split('T')[0] === todayString
        );
        break;
    }

    // تطبيق البحث
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.subject.toLowerCase().includes(term) ||
        m.sender.toLowerCase().includes(term) ||
        m.content.toLowerCase().includes(term) ||
        m.mailNumber.toLowerCase().includes(term) ||
        m.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // تطبيق الترتيب
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
        break;
      case 'priority':
        const priorityOrder = { 'عاجل': 3, 'هام': 2, 'عادي': 1 };
        filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        break;
      case 'sender':
        filtered.sort((a, b) => a.sender.localeCompare(b.sender, 'ar'));
        break;
      case 'mailNumber':
        filtered.sort((a, b) => a.mailNumber.localeCompare(b.mailNumber));
        break;
      case 'dueDate':
        filtered.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
    }

    return filtered;
  };

  const markAllAsRead = () => {
    const updated = mails.map(m => ({ ...m, read: true }));
    setMails(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    onSaved?.();
  };

  const deleteMail = (id: string) => {
    if (!confirm('هل تريد حذف هذه الرسالة؟')) return;
    const updated = mails.filter(m => m.id !== id);
    setMails(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    onSaved?.();
    if (selectedMail === id) setSelectedMail(null);
  };

  const archiveMail = (id: string) => {
    // يمكن إضافة وظيفة الأرشفة لاحقاً
    alert('تم أرشفة الرسالة بنجاح');
  };

  const flagMail = (id: string) => {
    const updated = mails.map(m => 
      m.id === id ? { ...m, priority: m.priority === 'هام' ? 'عادي' : 'هام' } : m
    );
    setMails(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    onSaved?.();
  };

  const sendReply = () => {
    if (!replyContent.trim()) {
      alert('يرجى كتابة محتوى الرد');
      return;
    }
    
    // هنا يمكن إضافة منطق إرسال الرد الفعلي
    alert('تم إرسال الرد بنجاح');
    setReplyContent('');
    setShowReplyForm(false);
  };

  // تصفية وترتيب الرسائل
  const filteredMails = mails.filter(mail => {
    const matchesSearch = !searchTerm || 
      mail.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mail.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mail.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'unread' && !mail.read) ||
      (filter === 'priority' && mail.priority !== 'عادي') ||
      (filter === 'source' && mail.source === 'الشكاوى');
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime();
    } else if (sortBy === 'priority') {
      const priorityOrder = { 'عاجل': 3, 'هام': 2, 'عادي': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    } else if (sortBy === 'sender') {
      return a.sender.localeCompare(b.sender);
    }
    return 0;
  });

  const unreadCount = mails.filter(m => !m.read).length;
  const priorityCount = mails.filter(m => m.priority !== 'عادي').length;
  const overdueCount = mails.filter(m => m.status === 'متأخر').length;
  const dueTodayCount = (() => {
    const today = new Date().toISOString().split('T')[0];
    return mails.filter(m => m.dueDate && m.dueDate.split('T')[0] === today).length;
  })();

  const activeNotifications = notifications.filter(n => !n.dismissed);

  const selectedMailData = mails.find(m => m.id === selectedMail);

  return (
    <div className="p-4 space-y-4">
      {/* شريط التنبيهات */}
      {activeNotifications.length > 0 && (
        <div className="space-y-2">
          {activeNotifications.map(notification => (
            <div
              key={notification.id}
              className={`flex items-center justify-between p-3 rounded-lg border-r-4 ${
                notification.type === 'overdue' ? 'bg-red-50 border-red-500 text-red-800' :
                notification.type === 'due-soon' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                'bg-blue-50 border-blue-500 text-blue-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`text-xl ${
                  notification.type === 'overdue' ? '⚠️' :
                  notification.type === 'due-soon' ? '⏰' :
                  '🔔'
                }`}>
                </div>
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600"
                title="إخفاء التنبيه"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* لوحة التذكيرات النشطة */}
      {activeReminders.filter(r => !r.dismissed).length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
            🔔 التذكيرات النشطة ({activeReminders.filter(r => !r.dismissed).length})
          </h4>
          <div className="space-y-2">
            {activeReminders.filter(r => !r.dismissed).map(reminder => (
              <div key={reminder.id} className="flex items-start justify-between bg-white rounded p-3 border">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{reminder.mailSubject}</div>
                  <div className="text-sm text-gray-600 mt-1">{reminder.note}</div>
                  <div className="text-xs text-purple-600 mt-1">
                    📅 {new Date(reminder.reminderDateTime).toLocaleString('ar-SY')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const updatedReminders = activeReminders.map(r => 
                      r.id === reminder.id ? { ...r, dismissed: true } : r
                    );
                    setActiveReminders(updatedReminders);
                    localStorage.setItem(remindersKey, JSON.stringify(updatedReminders));
                  }}
                  className="text-gray-400 hover:text-gray-600 ml-3"
                  title="إخفاء التذكير"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* لوحة الإحصائيات المحسنة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{mails.length}</div>
          <div className="text-sm text-blue-800 font-medium">إجمالي الرسائل</div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
          <div className="text-sm text-orange-800 font-medium">غير مقروءة</div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          <div className="text-sm text-red-800 font-medium">متأخرة</div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">{dueTodayCount}</div>
          <div className="text-sm text-yellow-800 font-medium">مستحقة اليوم</div>
        </div>
      </div>

      {/* شريط الأدوات العلوي */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            البريد الوارد
          </div>
          {activeNotifications.length > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">
              {activeNotifications.length} تنبيه
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            disabled={unreadCount === 0}
          >
            تحديد الكل كمقروء
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-xs border rounded px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="all">جميع الرسائل ({mails.length})</option>
            <option value="unread">غير المقروءة ({unreadCount})</option>
            <option value="priority">الهامة ({priorityCount})</option>
            <option value="overdue">متأخرة ({overdueCount})</option>
            <option value="due-today">مستحقة اليوم ({dueTodayCount})</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border rounded px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="date">ترتيب حسب التاريخ</option>
            <option value="priority">ترتيب حسب الأولوية</option>
            <option value="sender">ترتيب حسب المرسل</option>
            <option value="mailNumber">ترتيب حسب رقم الرسالة</option>
            <option value="dueDate">ترتيب حسب تاريخ الاستحقاق</option>
          </select>
        </div>
      </div>

      {/* شريط البحث */}
      <div className="relative">
        <input
          type="text"
          placeholder="ابحث في الرسائل (المرسل، الموضوع، المحتوى)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
        />
        <div className="absolute right-3 top-2.5 text-gray-400">
          🔍
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* قائمة الرسائل */}
        <div className="lg:col-span-1 border rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b">
            <h4 className="font-semibold text-sm">
              نتائج البحث ({filteredMails.length})
            </h4>
          </div>
          <div className="overflow-y-auto max-h-[520px]">
            {filteredMails.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد رسائل'}
              </div>
            ) : (
              <ul className="divide-y">
                {filteredMails.map(mail => (
                  <li
                    key={mail.id}
                    className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!mail.read ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-500' : ''} ${selectedMail === mail.id ? 'bg-blue-100 dark:bg-blue-800/30' : ''}`}
                    onClick={() => {
                      setSelectedMail(mail.id);
                      if (!mail.read) markAsRead(mail.id);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium truncate ${!mail.read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                            {mail.sender}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                            mail.priority === 'عاجل' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                            mail.priority === 'هام' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {mail.priority}
                          </span>
                        </div>
                        <div className={`text-sm mb-2 truncate ${!mail.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {mail.subject}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            mail.source === 'الطلبات' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                            mail.source === 'الشكاوى' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' :
                            'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                          }`}>
                            {mail.source}
                          </span>
                          {mail.category && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              {mail.category}
                            </span>
                          )}
                          {mail.responseRequired && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200">
                              يتطلب رد
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {new Date(mail.dateISO).toLocaleDateString('ar')}
                            </span>
                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                              #{mail.mailNumber}
                            </span>
                            {mail.dueDate && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                new Date(mail.dueDate) < new Date() ? 'bg-red-100 text-red-800' :
                                new Date(mail.dueDate).getTime() - Date.now() <= 24 * 60 * 60 * 1000 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                📅 {new Date(mail.dueDate).toLocaleDateString('ar')}
                              </span>
                            )}
                          </div>
                          {mail.attachments && mail.attachments.length > 0 && (
                            <span className="text-xs text-gray-500">📎 {mail.attachments.length}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        {!mail.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReminderMailId(mail.id);
                            setShowReminderModal(true);
                          }}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="إضافة تذكير"
                        >
                          🔔
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newNumber = prompt('أدخل رقم الرسالة الجديد:', mail.mailNumber);
                            if (newNumber && newNumber !== mail.mailNumber) {
                              updateMailNumber(mail.id, newNumber);
                            }
                          }}
                          className="text-gray-400 hover:text-green-500 transition-colors"
                          title="تحرير رقم الرسالة"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            flagMail(mail.id);
                          }}
                          className="text-gray-400 hover:text-yellow-500 transition-colors"
                          title="تمييز كمهم"
                        >
                          ⭐
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* عرض الرسالة المحددة */}
        <div className="lg:col-span-2 border rounded-lg">
          {!selectedMailData ? (
            <div className="flex items-center justify-center h-full text-gray-500 flex-col space-y-4">
              <div className="text-6xl">📧</div>
              <div>اختر رسالة للعرض</div>
              <div className="text-sm text-gray-400">
                {filteredMails.length > 0 ? 'انقر على أي رسالة من القائمة' : 'لا توجد رسائل للعرض'}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* رأس الرسالة */}
              <div className="border-b p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                      {selectedMailData.subject}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>من: <span className="font-medium">{selectedMailData.sender}</span></div>
                      <div>التاريخ: {new Date(selectedMailData.dateISO).toLocaleString('ar')}</div>
                      <div>المصدر: <span className={`px-2 py-0.5 rounded text-xs ${
                        selectedMailData.source === 'الطلبات' ? 'bg-green-100 text-green-800' :
                        selectedMailData.source === 'الشكاوى' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {selectedMailData.source}
                      </span></div>
                      {selectedMailData.category && (
                        <div>الفئة: <span className="font-medium">{selectedMailData.category}</span></div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      selectedMailData.priority === 'عاجل' ? 'bg-red-100 text-red-800' :
                      selectedMailData.priority === 'هام' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedMailData.priority}
                    </span>
                    {selectedMailData.responseRequired && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                        يتطلب رد
                      </span>
                    )}
                  </div>
                </div>
                
                {/* المرفقات */}
                {selectedMailData.attachments && selectedMailData.attachments.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-sm font-medium mb-2">المرفقات ({selectedMailData.attachments.length}):</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMailData.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1 rounded border text-sm">
                          <span>📎</span>
                          <span>{attachment}</span>
                          <button className="text-blue-600 hover:text-blue-800 text-xs">تحميل</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* أدوات الرسالة */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowReplyForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2"
                  >
                    <span>↩️</span> رد
                  </button>
                  <button
                    onClick={() => archiveMail(selectedMailData.id)}
                    className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 flex items-center gap-2"
                  >
                    <span>📁</span> أرشفة
                  </button>
                  <button
                    onClick={() => flagMail(selectedMailData.id)}
                    className="px-4 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 flex items-center gap-2"
                  >
                    <span>⭐</span> تمييز
                  </button>
                  <button
                    onClick={() => deleteMail(selectedMailData.id)}
                    className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 flex items-center gap-2"
                  >
                    <span>🗑️</span> حذف
                  </button>
                </div>
              </div>
              
              {/* محتوى الرسالة */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="prose max-w-none dark:prose-invert">
                  <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedMailData.content}
                  </p>
                </div>
              </div>
              
              {/* نموذج الرد */}
              {showReplyForm && (
                <div className="border-t p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">رد على: {selectedMailData.subject}</h4>
                    <button
                      onClick={() => setShowReplyForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={sendReply}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      إرسال الرد
                    </button>
                    <button
                      onClick={() => setShowReplyForm(false)}
                      className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* نموذج إضافة التذكير */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">إضافة تذكير</h3>
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تاريخ ووقت التذكير
                </label>
                <input
                  type="datetime-local"
                  value={reminderDateTime}
                  onChange={(e) => setReminderDateTime(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظة التذكير
                </label>
                <textarea
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  placeholder="أدخل ملاحظة للتذكير..."
                  className="w-full h-20 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 resize-none dark:bg-gray-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowReminderModal(false);
                    setReminderDateTime('');
                    setReminderNote('');
                    setReminderMailId(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={addReminder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={!reminderDateTime}
                >
                  إضافة التذكير
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// مكون البريد الصادر المحسن
const OutboxTool: React.FC<{ onDownload?: (filename: string, content: string) => void; onSaved?: () => void; department?: string }> = ({ onDownload, onSaved, department }) => {
  const [mails, setMails] = useState<Array<{
    id: string;
    recipient: string;
    subject: string;
    content: string;
    status: 'مسودة' | 'قيد الإرسال' | 'مرسل' | 'فشل الإرسال';
    priority: 'عادي' | 'هام' | 'عاجل';
    dateISO: string;
    type: 'رد' | 'رسالة جديدة' | 'تعميم' | 'إشعار';
    recipientEmail?: string;
    cc?: string[];
    attachments?: string[];
  }>>([]);
  const [newMail, setNewMail] = useState({
    recipient: '',
    subject: '',
    content: '',
    priority: 'عادي' as const,
    type: 'رسالة جديدة' as const,
    recipientEmail: '',
    cc: [] as string[]
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [filter, setFilter] = useState<'all' | 'drafts' | 'sent' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // إنشاء مفتاح التخزين المنفصل لكل قسم
  const storageKey = department ? `diwanOutbox_${department.replace(/\s/g, '_')}` : 'diwanOutbox_general';

  // قوالب الرسائل الجاهزة
  const messageTemplates = [
    {
      id: 'acknowledgment',
      name: 'إقرار الاستلام',
      subject: 'إقرار استلام المعاملة',
      content: `السيد/السيدة المحترم/ة

نشكركم على مراسلتكم وتقديمكم المعاملة المطلوبة.

نؤكد لكم استلام المعاملة وهي قيد الدراسة والمعالجة. سيتم إشعاركم بالنتيجة في أقرب وقت ممكن.

في حال وجود أي استفسار، يرجى التواصل معنا.

مع فائق الاحترام والتقدير
${department || 'إدارة الديوان العام'}`
    },
    {
      id: 'request_documents',
      name: 'طلب وثائق إضافية',
      subject: 'مطلوب وثائق إضافية لاستكمال المعاملة',
      content: `السيد/السيدة المحترم/ة

بعد مراجعة المعاملة المقدمة، نحيطكم علماً بأنه مطلوب تقديم الوثائق التالية لاستكمال الإجراءات:

• [قائمة بالوثائق المطلوبة]

يرجى تقديم الوثائق المذكورة في أقرب وقت ممكن لتجنب التأخير.

شكراً لتعاونكم
${department || 'إدارة الديوان العام'}`
    },
    {
      id: 'completion_notification',
      name: 'إشعار إنجاز المعاملة',
      subject: 'تم إنجاز معاملتكم بنجاح',
      content: `السيد/السيدة المحترم/ة

يسرنا إعلامكم بأنه تم إنجاز معاملتكم بنجاح.

يمكنكم مراجعة المكتب لاستلام النتيجة أو المتابعة عبر الوسائل الإلكترونية المتاحة.

أوقات المراجعة: من الأحد إلى الخميس، من 8:00 صباحاً إلى 2:00 ظهراً

شكراً لثقتكم
${department || 'إدارة الديوان العام'}`
    },
    {
      id: 'appointment_confirmation',
      name: 'تأكيد الموعد',
      subject: 'تأكيد موعد المراجعة',
      content: `السيد/السيدة المحترم/ة

نؤكد لكم حجز موعد المراجعة كما يلي:

التاريخ: [التاريخ]
الوقت: [الوقت]
المكان: ${department || 'إدارة الديوان العام'}

يرجى الحضور في الوقت المحدد واصطحاب الوثائق المطلوبة.

مع التقدير
${department || 'إدارة الديوان العام'}`
    }
  ];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setMails(JSON.parse(saved));
      } else {
        // إضافة بيانات تجريبية محسنة
        const departmentName = department || 'القسم العام';
        const sampleMails = [
          {
            id: `outmail-${Date.now()}-1`,
            recipient: 'أحمد محمد علي',
            recipientEmail: 'ahmed@example.com',
            subject: `إقرار استلام معاملتكم - ${departmentName}`,
            content: `السيد أحمد المحترم\n\nنشكركم على تقديم المعاملة رقم REQ-2024-${Math.floor(Math.random() * 10000)}.\nتم استلام المعاملة وهي قيد المراجعة.\n\nسيتم إشعاركم بالنتيجة خلال 7 أيام عمل.\n\nمع فائق الاحترام\n${departmentName}`,
            type: 'رد' as const,
            priority: 'عادي' as const,
            status: 'مرسل' as const,
            dateISO: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            attachments: ['نموذج_الاستلام.pdf']
          },
          {
            id: `outmail-${Date.now()}-2`,
            recipient: 'فاطمة علي حسن',
            recipientEmail: 'fatima@example.com',
            subject: `رد على شكواكم - ${departmentName}`,
            content: `السيدة فاطمة المحترمة\n\nبخصوص شكواكم المقدمة بتاريخ [التاريخ]:\n\nتم دراسة الموضوع واتخاذ الإجراءات التصحيحية اللازمة.\nنعتذر عن أي إزعاج قد تكونوا تعرضتم له.\n\nتم تحسين إجراءات الخدمة لتجنب تكرار المشكلة.\n\nشكراً لصبركم وتفهمكم\n${departmentName}`,
            type: 'رد' as const,
            priority: 'هام' as const,
            status: 'قيد الإرسال' as const,
            dateISO: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            cc: ['supervisor@dept.gov.sy']
          },
          {
            id: `outmail-${Date.now()}-3`,
            recipient: 'جميع الموظفين',
            subject: `تعميم: تحديث إجراءات العمل - ${departmentName}`,
            content: `الإخوة الموظفون المحترمون\n\nنحيطكم علماً بتحديث إجراءات العمل التالية اعتباراً من تاريخ [التاريخ]:\n\n1. تحديث نموذج طلب الخدمة\n2. تعديل مواعيد استقبال الجمهور\n3. تطبيق النظام الإلكتروني الجديد\n\nيرجى الاطلاع والالتزام بالإجراءات الجديدة.\n\nإدارة ${departmentName}`,
            type: 'تعميم' as const,
            priority: 'هام' as const,
            status: 'مسودة' as const,
            dateISO: new Date().toISOString(),
            attachments: ['الإجراءات_المحدثة.pdf', 'دليل_النظام_الجديد.pdf']
          }
        ];
        setMails(sampleMails);
        localStorage.setItem(storageKey, JSON.stringify(sampleMails));
      }
    } catch { /* ignore */ }
  }, [storageKey, department]);

  const saveMail = (asDraft = true) => {
    if (!newMail.recipient || !newMail.subject || !newMail.content) {
      alert('يرجى تعبئة جميع الحقول');
      return;
    }

    const mail = {
      id: editingId || `mail-${Date.now()}`,
      ...newMail,
      status: asDraft ? 'مسودة' : 'قيد الإرسال' as const,
      dateISO: new Date().toISOString()
    };

    let updated;
    if (editingId) {
      updated = mails.map(m => m.id === editingId ? mail : m);
      setEditingId(null);
    } else {
      updated = [...mails, mail];
    }

    setMails(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setNewMail({ recipient: '', subject: '', content: '', priority: 'عادي' });
    onSaved?.();

    if (!asDraft) {
      // محاكاة الإرسال
      setTimeout(() => {
        const finalUpdate = updated.map(m => m.id === mail.id ? { ...m, status: 'مرسل' as const } : m);
        setMails(finalUpdate);
        localStorage.setItem(storageKey, JSON.stringify(finalUpdate));
        onSaved?.();
      }, 2000);
    }
  };

  const editMail = (mail: typeof mails[0]) => {
    setNewMail({
      recipient: mail.recipient,
      subject: mail.subject,
      content: mail.content,
      priority: mail.priority
    });
    setEditingId(mail.id);
  };

  const deleteMail = (id: string) => {
    if (!confirm('هل تريد حذف هذه الرسالة؟')) return;
    const updated = mails.filter(m => m.id !== id);
    setMails(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    onSaved?.();
  };

  const downloadMail = (mail: typeof mails[0]) => {
    const content = `المرسل إليه: ${mail.recipient}
الموضوع: ${mail.subject}
التاريخ: ${new Date(mail.dateISO).toLocaleString('ar')}
الأولوية: ${mail.priority}
الحالة: ${mail.status}

المحتوى:
${mail.content}`;
    onDownload?.(`${mail.subject}-${mail.id}.txt`, content);
  };

  return (
    <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
      {/* نموذج الرسالة الجديدة */}
      <div className="border rounded-lg p-4 bg-blue-50/30 dark:bg-blue-900/20">
        <h4 className="font-semibold mb-3">{editingId ? 'تعديل الرسالة' : 'رسالة جديدة'}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="المرسل إليه"
            value={newMail.recipient}
            onChange={(e) => setNewMail({ ...newMail, recipient: e.target.value })}
            className="border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
          />
          <select
            value={newMail.priority}
            onChange={(e) => setNewMail({ ...newMail, priority: e.target.value as 'عادي' | 'هام' | 'عاجل' })}
            className="border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="عادي">عادي</option>
            <option value="هام">هام</option>
            <option value="عاجل">عاجل</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="الموضوع"
          value={newMail.subject}
          onChange={(e) => setNewMail({ ...newMail, subject: e.target.value })}
          className="mt-3 w-full border rounded p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
        />
        <textarea
          placeholder="محتوى الرسالة"
          value={newMail.content}
          onChange={(e) => setNewMail({ ...newMail, content: e.target.value })}
          className="mt-3 w-full border rounded p-2 text-sm h-32 dark:bg-gray-800 dark:border-gray-700"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => saveMail(true)}
            className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
          >
            حفظ كمسودة
          </button>
          <button
            onClick={() => saveMail(false)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            إرسال
          </button>
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setNewMail({ recipient: '', subject: '', content: '', priority: 'عادي' });
              }}
              className="px-4 py-2 border text-sm rounded"
            >
              إلغاء
            </button>
          )}
        </div>
      </div>

      {/* قائمة الرسائل */}
      <div>
        <h4 className="font-semibold mb-3">الرسائل الصادرة ({mails.length})</h4>
        {mails.length === 0 ? (
          <div className="text-center text-gray-500 py-8">لا توجد رسائل صادرة</div>
        ) : (
          <div className="space-y-3">
            {mails.map(mail => (
              <div key={mail.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{mail.subject}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        mail.status === 'مرسل' ? 'bg-green-100 text-green-800' :
                        mail.status === 'قيد الإرسال' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {mail.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        mail.priority === 'عاجل' ? 'bg-red-100 text-red-800' :
                        mail.priority === 'هام' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {mail.priority}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      إلى: {mail.recipient} • {new Date(mail.dateISO).toLocaleString('ar')}
                    </div>
                    <div className="text-sm text-gray-700 mt-1 line-clamp-2">
                      {mail.content}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {mail.status === 'مسودة' && (
                      <button
                        onClick={() => editMail(mail)}
                        className="px-2 py-1 text-blue-600 text-xs hover:underline"
                      >
                        تعديل
                      </button>
                    )}
                    <button
                      onClick={() => downloadMail(mail)}
                      className="px-2 py-1 text-green-600 text-xs hover:underline"
                    >
                      تحميل
                    </button>
                    <button
                      onClick={() => deleteMail(mail.id)}
                      className="px-2 py-1 text-red-600 text-xs hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralDiwanPage;
