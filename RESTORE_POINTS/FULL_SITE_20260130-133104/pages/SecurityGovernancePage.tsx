import React, { useContext, useMemo, useState } from 'react';
import { formatArabicNumber } from '../constants';
import Badge from '../components/ui/Badge';
import { AppContext } from '../App';
import SecurityInfoButton from '../components/SecurityInfoButton';

const SecurityGovernancePage: React.FC = () => {
  const ctx = useContext(AppContext);
  const isAdmin = ctx?.currentEmployee?.role === 'مدير';
  const gov = ctx?.governanceState;
  const [busy, setBusy] = useState(false);
  const [newExc, setNewExc] = useState<{ policy: 'accessControl'|'passwordPolicy'|'encryptionPolicy'|'incidentResponse'; scope?: string; reason?: string; expiresAt?: string; } | null>(null);
  const [lifecycleEdit, setLifecycleEdit] = useState<{ policy: 'accessControl'|'passwordPolicy'|'encryptionPolicy'|'incidentResponse'; owner?: string; nextReviewDate?: string; status?: 'draft'|'active'|'under_review'; version?: string; approversText?: string; } | null>(null);
  const [violationsSearch, setViolationsSearch] = useState('');
  const [exceptionsSearch, setExceptionsSearch] = useState('');
  const [exceptionsPolicyFilter, setExceptionsPolicyFilter] = useState<'all'|'accessControl'|'passwordPolicy'|'encryptionPolicy'|'incidentResponse'>('all');
  const [exceptionsStatusFilter, setExceptionsStatusFilter] = useState<'all'|'pending'|'approved'|'revoked'>('all');
  const [legendOpen, setLegendOpen] = useState(false);

  // Counts for inline badges
  const violationsCount = useMemo(() => (ctx?.listViolations?.() || []).length, [ctx]);
  const approvedExceptionsCount = useMemo(() => (
    (ctx?.listExceptions?.() || []).filter(e => e.status === 'approved').length
  ), [ctx]);

  const runSample = async () => {
    if (busy) return; setBusy(true);
    try {
      await ctx?.enforcePolicy?.('accessControl', { requestedPrivilege: 'admin', justification: '' });
      await ctx?.enforcePolicy?.('passwordPolicy', { password: 'weak' });
      await ctx?.enforcePolicy?.('encryptionPolicy', { proto: 'TLS 1.2' });
      await ctx?.enforcePolicy?.('incidentResponse', { detectionTimeMinutes: 60 });
    } finally { setBusy(false); }
  };

  const downloadCSV = async () => {
    const csv = await ctx?.exportGovernance?.('csv');
    if (typeof csv === 'string') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'governance.csv';
      a.click();
    }
  };
  const downloadPDF = async () => {
    const blob = await ctx?.exportGovernance?.('pdf');
    if (blob instanceof Blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'governance.pdf';
      a.click();
    }
  };

  const runRealEncryptionCheck = async () => {
    if (!ctx?.securityStatus) {
      await ctx?.refreshSecurityStatus?.();
    }
    const s = ctx?.securityStatus || null;
    await ctx?.enforcePolicy?.('encryptionPolicy', {
      tlsVersion: s?.tlsVersion,
      hstsEnabled: s?.hstsEnabled,
      weakCiphers: s?.weakCiphers || []
    });
  };

  const renderOrg = (node: any, depth = 0) => (
    <div className="ml-2" style={{ marginRight: depth * 12 }}>
      <div className="text-sm">{node.name}</div>
      {(node.children || []).map((ch: any, i: number) => (
        <div key={i} className="border-r border-gray-300 dark:border-gray-700 pr-3 mt-1">{renderOrg(ch, depth + 1)}</div>
      ))}
    </div>
  );

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">إطار الحوكمة الأمنية (8.x)</h1>
          <SecurityInfoButton context="governance" />
        </div>
      </div>
      {/* Collapsible color legend at top */}
      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={() => setLegendOpen(o => !o)}
          className="text-[13px] font-medium flex items-center gap-2"
          aria-expanded={legendOpen}
          aria-controls="gov-legend"
        >
          <span>{legendOpen ? 'إخفاء دليل الألوان' : 'إظهار دليل الألوان'}</span>
          <span className={`transition-transform ${legendOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {legendOpen && (
          <div id="gov-legend" className="mt-3 text-[12px]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-red-600" aria-hidden="true"></span>
                <span className="text-gray-600 dark:text-gray-300">الانتهاكات</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-indigo-600" aria-hidden="true"></span>
                <span className="text-gray-600 dark:text-gray-300">استثناءات موافق عليها</span>
              </div>
            </div>
          </div>
        )}
      </div>
  {/* Main heading moved above with info button */}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-3">الهيكل التنظيمي</h2>
          {!gov && <div className="text-sm text-gray-500">لا تتوفر بيانات</div>}
          {gov && (
            <div className="text-sm">{renderOrg(gov.orgStructure)}</div>
          )}
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-3">السياسات الأساسية</h2>
          {!gov && <div className="text-sm text-gray-500">لا تتوفر بيانات</div>}
          {gov && (
            <div className="text-sm space-y-3">
              <div>
                <div className="font-medium">{gov.policies.accessControl.title} <span className="text-gray-500 text-xs">v{gov.policies.accessControl.version}</span></div>
                <ul className="list-disc pr-6 text-xs text-gray-400">
                  {gov.policies.accessControl.rules.map((r,i)=>(<li key={i}>{r}</li>))}
                </ul>
                <div className="text-[11px] text-gray-400 mt-1">المالك: {gov.policies.accessControl.owner} | الحالة: {gov.policies.accessControl.status} | المراجعة القادمة: {gov.policies.accessControl.nextReviewDate}</div>
                <button className="mt-1 text-[11px] underline" onClick={() => setLifecycleEdit({ policy: 'accessControl', owner: gov.policies.accessControl.owner, nextReviewDate: gov.policies.accessControl.nextReviewDate, status: gov.policies.accessControl.status as any, version: gov.policies.accessControl.version, approversText: (gov.policies.accessControl.approvers||[]).join(',') })}>تعديل دورة الحياة</button>
              </div>
              <div>
                <div className="font-medium">{gov.policies.passwordPolicy.title} <span className="text-gray-500 text-xs">v{gov.policies.passwordPolicy.version}</span></div>
                <div className="text-xs text-gray-400">الحد الأدنى: {gov.policies.passwordPolicy.requirements.minLength} | انتهاء: {gov.policies.passwordPolicy.requirements.expiry} يوم | تاريخ: {gov.policies.passwordPolicy.requirements.history}</div>
                <div className="text-[11px] text-gray-400 mt-1">المالك: {gov.policies.passwordPolicy.owner} | الحالة: {gov.policies.passwordPolicy.status} | المراجعة القادمة: {gov.policies.passwordPolicy.nextReviewDate}</div>
                <button className="mt-1 text-[11px] underline" onClick={() => setLifecycleEdit({ policy: 'passwordPolicy', owner: gov.policies.passwordPolicy.owner, nextReviewDate: gov.policies.passwordPolicy.nextReviewDate, status: gov.policies.passwordPolicy.status as any, version: gov.policies.passwordPolicy.version, approversText: (gov.policies.passwordPolicy.approvers||[]).join(',') })}>تعديل دورة الحياة</button>
              </div>
              <div>
                <div className="font-medium">{gov.policies.encryptionPolicy.title} <span className="text-gray-500 text-xs">v{gov.policies.encryptionPolicy.version}</span></div>
                <div className="text-xs text-gray-400">النقل: {gov.policies.encryptionPolicy.standards.inTransit} | التخزين: {gov.policies.encryptionPolicy.standards.atRest}</div>
                <div className="text-[11px] text-gray-400 mt-1">المالك: {gov.policies.encryptionPolicy.owner} | الحالة: {gov.policies.encryptionPolicy.status} | المراجعة القادمة: {gov.policies.encryptionPolicy.nextReviewDate}</div>
                <button className="mt-1 text-[11px] underline" onClick={() => setLifecycleEdit({ policy: 'encryptionPolicy', owner: gov.policies.encryptionPolicy.owner, nextReviewDate: gov.policies.encryptionPolicy.nextReviewDate, status: gov.policies.encryptionPolicy.status as any, version: gov.policies.encryptionPolicy.version, approversText: (gov.policies.encryptionPolicy.approvers||[]).join(',') })}>تعديل دورة الحياة</button>
              </div>
              <div>
                <div className="font-medium">{gov.policies.incidentResponse.title} <span className="text-gray-500 text-xs">v{gov.policies.incidentResponse.version}</span></div>
                <div className="text-xs text-gray-400">الاكتشاف: {gov.policies.incidentResponse.procedures.detection} | الاحتواء: {gov.policies.incidentResponse.procedures.containment}</div>
                <div className="text-[11px] text-gray-400 mt-1">المالك: {gov.policies.incidentResponse.owner} | الحالة: {gov.policies.incidentResponse.status} | المراجعة القادمة: {gov.policies.incidentResponse.nextReviewDate}</div>
                <button className="mt-1 text-[11px] underline" onClick={() => setLifecycleEdit({ policy: 'incidentResponse', owner: gov.policies.incidentResponse.owner, nextReviewDate: gov.policies.incidentResponse.nextReviewDate, status: gov.policies.incidentResponse.status as any, version: gov.policies.incidentResponse.version, approversText: (gov.policies.incidentResponse.approvers||[]).join(',') })}>تعديل دورة الحياة</button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={runSample} disabled={busy} className={`px-3 py-1.5 rounded-md text-white text-xs ${busy?'bg-gray-500':'bg-emerald-700'}`}>تشغيل اختبار امتثال</button>
                <button onClick={downloadCSV} className="px-3 py-1.5 rounded-md bg-sky-700 text-white text-xs">تصدير CSV</button>
                <button onClick={downloadPDF} className="px-3 py-1.5 rounded-md bg-purple-700 text-white text-xs">تصدير PDF</button>
                <button onClick={runRealEncryptionCheck} className="px-3 py-1.5 rounded-md bg-indigo-700 text-white text-xs">فحص تشفير الخادم</button>
              </div>
              {/* Security posture snapshot */}
              <div className="mt-2 text-[11px] text-gray-400">
                الحالة الأمنية: TLS = {ctx?.securityStatus?.tlsVersion || 'غير معروف'} | HSTS = {String(ctx?.securityStatus?.hstsEnabled ?? 'غير معروف')} | خوارزميات ضعيفة = {(ctx?.securityStatus?.weakCiphers||[]).join(',') || '—'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h2 className="font-medium mb-3 flex items-center gap-2">
          <span>سجل الانتهاكات</span>
          {violationsCount > 0 && (
            <Badge
              variant="default"
              className="!px-1.5 !py-0.5 !text-[11px] bg-red-600 text-white leading-none"
              title="الانتهاكات"
              aria-label={`الانتهاكات: ${formatArabicNumber(violationsCount)}`}
            >{formatArabicNumber(violationsCount)}</Badge>
          )}
        </h2>
        <div className="flex items-center gap-2 mb-3">
          <input value={violationsSearch} onChange={e=>setViolationsSearch(e.target.value)} className="w-full max-w-xs bg-transparent border rounded p-2 text-xs" placeholder="بحث في السياسة/التفاصيل" />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-right text-sm">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="py-2 px-3 font-medium">المعرف</th>
                <th className="py-2 px-3 font-medium">معرف التدقيق</th>
                <th className="py-2 px-3 font-medium">السياسة</th>
                <th className="py-2 px-3 font-medium">الانتهاكات</th>
                <th className="py-2 px-3 font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {(ctx?.listViolations?.() || []).filter(v => {
                const q = violationsSearch.trim();
                if (!q) return true;
                const hay = `${v.id} ${v.auditId||''} ${v.policy} ${v.violations.join(' ')}`.toLowerCase();
                return hay.includes(q.toLowerCase());
              }).map(v => (
                <tr key={v.id} className="border-b border-gray-700/30">
                  <td className="py-2 px-3 text-xs">{v.id}</td>
                  <td className="py-2 px-3 text-xs">{v.auditId ? (
                    <a className="text-sky-500 underline" href={`#/observability?auditId=${encodeURIComponent(v.auditId)}`}>{v.auditId}</a>
                  ) : '-'}</td>
                  <td className="py-2 px-3 text-xs">{v.policy}</td>
                  <td className="py-2 px-3 text-xs">{v.violations.join('؛ ')}</td>
                  <td className="py-2 px-3 text-xs">{new Date(v.timestamp).toLocaleString('ar-SY-u-nu-latn')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exceptions Registry */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium flex items-center gap-2">
            <span>سجل الاستثناءات</span>
            {approvedExceptionsCount > 0 && (
              <Badge
                variant="default"
                className="!px-1.5 !py-0.5 !text-[11px] bg-indigo-600 text-white leading-none"
                title="استثناءات موافق عليها"
                aria-label={`استثناءات موافق عليها: ${formatArabicNumber(approvedExceptionsCount)}`}
              >{formatArabicNumber(approvedExceptionsCount)}</Badge>
            )}
          </h2>
          <button className="px-3 py-1.5 rounded-md bg-amber-700 text-white text-xs" onClick={() => setNewExc({ policy: 'accessControl' })}>إضافة استثناء</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <input value={exceptionsSearch} onChange={e=>setExceptionsSearch(e.target.value)} className="w-full max-w-xs bg-transparent border rounded p-2" placeholder="بحث في السبب/النطاق/المعرف" />
          <select className="bg-transparent border rounded p-2" value={exceptionsPolicyFilter} onChange={e=>setExceptionsPolicyFilter(e.target.value as any)}>
            <option value="all">كل السياسات</option>
            <option value="accessControl">التحكم بالوصول</option>
            <option value="passwordPolicy">كلمات المرور</option>
            <option value="encryptionPolicy">التشفير</option>
            <option value="incidentResponse">الاستجابة للحوادث</option>
          </select>
          <select className="bg-transparent border rounded p-2" value={exceptionsStatusFilter} onChange={e=>setExceptionsStatusFilter(e.target.value as any)}>
            <option value="all">كل الحالات</option>
            <option value="pending">بانتظار الاعتماد</option>
            <option value="approved">معتمد</option>
            <option value="revoked">مسحوب</option>
          </select>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-right text-sm">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="py-2 px-3 font-medium">المعرف</th>
                <th className="py-2 px-3 font-medium">السياسة</th>
                <th className="py-2 px-3 font-medium">النطاق</th>
                <th className="py-2 px-3 font-medium">الحالة</th>
                <th className="py-2 px-3 font-medium">ينتهي في</th>
                <th className="py-2 px-3 font-medium">السبب</th>
                <th className="py-2 px-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {(ctx?.listExceptions?.() || []).filter(ex => {
                if (exceptionsPolicyFilter !== 'all' && String(ex.policy) !== exceptionsPolicyFilter) return false;
                if (exceptionsStatusFilter !== 'all' && ex.status !== exceptionsStatusFilter) return false;
                const q = exceptionsSearch.trim();
                if (!q) return true;
                const hay = `${ex.id} ${ex.policy} ${ex.scope||'*'} ${ex.status} ${ex.reason||''}`.toLowerCase();
                return hay.includes(q.toLowerCase());
              }).map(ex => (
                <tr key={ex.id} className="border-b border-gray-700/30">
                  <td className="py-2 px-3 text-xs">{ex.id}</td>
                  <td className="py-2 px-3 text-xs">{String(ex.policy)}</td>
                  <td className="py-2 px-3 text-xs">{ex.scope || '*'}</td>
                  <td className="py-2 px-3 text-xs">{ex.status}</td>
                  <td className="py-2 px-3 text-xs">{ex.expiresAt || '-'}</td>
                  <td className="py-2 px-3 text-xs">{ex.reason || '-'}</td>
                  <td className="py-2 px-3 text-xs">
                    {ex.status !== 'approved' && (
                      <button className="px-2 py-1 rounded bg-emerald-700 text-white text-[11px] ml-2" onClick={() => ctx?.approveException?.(ex.id, 'CISO')}>اعتماد</button>
                    )}
                    {ex.status !== 'revoked' && (
                      <button className="px-2 py-1 rounded bg-red-700 text-white text-[11px]" onClick={() => ctx?.revokeException?.(ex.id, 'انتهت الحاجة')}>سحب</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Exception Modal (simple inline) */}
      {newExc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm">
            <div className="font-medium mb-2">إضافة استثناء</div>
            <div className="space-y-2">
              <label className="block">السياسة
                <select className="w-full mt-1 bg-transparent border rounded p-2" value={newExc.policy} onChange={e => setNewExc({...newExc, policy: e.target.value as any})}>
                  <option value="accessControl">التحكم بالوصول</option>
                  <option value="passwordPolicy">كلمات المرور</option>
                  <option value="encryptionPolicy">التشفير</option>
                  <option value="incidentResponse">الاستجابة للحوادث</option>
                </select>
              </label>
              <label className="block">النطاق (اختياري)
                <input className="w-full mt-1 bg-transparent border rounded p-2" placeholder="* أو اسم مستخدم/مسار" value={newExc.scope||''} onChange={e => setNewExc({...newExc, scope: e.target.value})} />
              </label>
              <label className="block">سبب الاستثناء
                <input className="w-full mt-1 bg-transparent border rounded p-2" value={newExc.reason||''} onChange={e => setNewExc({...newExc, reason: e.target.value})} />
              </label>
              <label className="block">تاريخ الانتهاء (اختياري)
                <input type="date" className="w-full mt-1 bg-transparent border rounded p-2" value={newExc.expiresAt||''} onChange={e => setNewExc({...newExc, expiresAt: e.target.value})} />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button className="px-3 py-1.5 rounded bg-gray-600 text-white text-xs" onClick={() => setNewExc(null)}>إلغاء</button>
              <button className="px-3 py-1.5 rounded bg-amber-700 text-white text-xs" onClick={() => { ctx?.addException?.(newExc as any); setNewExc(null); }}>حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Lifecycle Edit Modal */}
      {lifecycleEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm">
            <div className="font-medium mb-2">تعديل دورة حياة السياسة</div>
            <div className="space-y-2">
              <div>السياسة: {lifecycleEdit.policy}</div>
              <label className="block">المالك
                <input className="w-full mt-1 bg-transparent border rounded p-2" value={lifecycleEdit.owner||''} onChange={e => setLifecycleEdit({ ...lifecycleEdit, owner: e.target.value })} />
              </label>
              <label className="block">الحالة
                <select className="w-full mt-1 bg-transparent border rounded p-2" value={lifecycleEdit.status} onChange={e => setLifecycleEdit({ ...lifecycleEdit, status: e.target.value as any })}>
                  <option value="draft">مسودة</option>
                  <option value="active">فعالة</option>
                  <option value="under_review">قيد المراجعة</option>
                </select>
              </label>
              <label className="block">الإصدار
                <input className="w-full mt-1 bg-transparent border rounded p-2" value={lifecycleEdit.version||''} onChange={e => setLifecycleEdit({ ...lifecycleEdit, version: e.target.value })} />
              </label>
              <label className="block">المراجعة القادمة
                <input type="date" className="w-full mt-1 bg-transparent border rounded p-2" value={lifecycleEdit.nextReviewDate||''} onChange={e => setLifecycleEdit({ ...lifecycleEdit, nextReviewDate: e.target.value })} />
              </label>
              <label className="block">المعتمدون (مفصولة بفاصلة)
                <input className="w-full mt-1 bg-transparent border rounded p-2" value={lifecycleEdit.approversText||''} onChange={e => setLifecycleEdit({ ...lifecycleEdit, approversText: e.target.value })} />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button className="px-3 py-1.5 rounded bg-gray-600 text-white text-xs" onClick={() => setLifecycleEdit(null)}>إلغاء</button>
              <button className="px-3 py-1.5 rounded bg-emerald-700 text-white text-xs" onClick={() => { ctx?.updatePolicyLifecycle?.(lifecycleEdit.policy, { owner: lifecycleEdit.owner, status: lifecycleEdit.status, version: lifecycleEdit.version, nextReviewDate: lifecycleEdit.nextReviewDate, approvers: (lifecycleEdit.approversText||'').split(',').map(s=>s.trim()).filter(Boolean) }); setLifecycleEdit(null); }}>حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Legend: color codes for badges */}
      <div className="mt-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[12px]">
        <div className="font-medium mb-2">دليل الألوان</div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-600" aria-hidden="true"></span>
            <span className="text-gray-600 dark:text-gray-300">الانتهاكات</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-indigo-600" aria-hidden="true"></span>
            <span className="text-gray-600 dark:text-gray-300">استثناءات موافق عليها</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityGovernancePage;
