import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Employee, InternalMessage } from '../types';
import UiBadge from '../components/ui/Badge';

// Simple labeled field component
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block mb-3">
    <div className="mb-1 text-sm text-gray-700 dark:text-gray-300">{label}</div>
    {children}
  </label>
);

const EmployeeProfilePage: React.FC = () => {
  const app = useContext(AppContext);
  const current = app?.currentEmployee;

  // Guard: must be logged in
  if (!app?.isEmployeeLoggedIn || !current) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 p-4">
          <div className="text-sm">يلزم تسجيل الدخول للوصول إلى صفحة الملف الشخصي.</div>
        </div>
      </div>
    );
  }

  const [form, setForm] = useState<Employee>({ ...current });
  const [saving, setSaving] = useState(false);
  const getInitialTab = (): 'info'|'security'|'inbox' => {
    try {
      const hash = window.location.hash || '';
      const qIndex = hash.indexOf('?');
      if (qIndex >= 0) {
        const qs = new URLSearchParams(hash.slice(qIndex + 1));
        const t = qs.get('tab');
        if (t === 'security' || t === 'inbox' || t === 'info') return t;
      }
    } catch {}
    return 'info';
  };
  const [tab, setTab] = useState<'info'|'security'|'inbox'>(getInitialTab());
  useEffect(() => {
    const onHash = () => {
      const next = getInitialTab();
      setTab(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const mfaOn = app?.requiresMFA ? app.requiresMFA(current) : !!current.mfaEnabled;
  const [errors, setErrors] = useState<{ phone?: string; nationalId?: string }>({});
  const [uploadBusy, setUploadBusy] = useState(false);

  const validatePhone = (v?: string): string | undefined => {
    const raw = (v || '').trim();
    if (!raw) return undefined; // optional field
    const s = raw.replace(/[\s-]/g, '');
    // Accept formats: 09XXXXXXXX or +9639XXXXXXXX or 009639XXXXXXXX
    if (/^09\d{8}$/.test(s)) return undefined;
    if (/^\+9639\d{8}$/.test(s)) return undefined;
    if (/^009639\d{8}$/.test(s)) return undefined;
    return 'رقم الهاتف غير صحيح. الصيغ المقبولة: 09XXXXXXXX أو +9639XXXXXXXX أو 009639XXXXXXXX';
  };

  const validateAll = (): boolean => {
    const phoneErr = validatePhone(form.phone);
    const natErr = validateNationalId(form.nationalId);
    setErrors({ phone: phoneErr, nationalId: natErr });
    return !phoneErr && !natErr;
  };

  const validateNationalId = (v?: string): string | undefined => {
    const raw = (v || '').trim();
    if (!raw) return undefined; // optional field in UI; adjust to required if needed
    // Syrian national ID: 11 digits
    if (!/^\d{11}$/.test(raw)) return 'الرقم الوطني يجب أن يتكون من 11 رقماً';
    return undefined;
  };

  useEffect(() => {
    setForm({ ...current });
  }, [current?.username]);

  const handleSave = () => {
    if (!app?.updateEmployee) return;
    // Basic validation
    if (!validateAll()) {
      app.addToast?.({ message: 'يرجى تصحيح رقم الهاتف قبل الحفظ', type: 'error' });
      return;
    }
    setSaving(true);
    // Persist to employees store via context helper
    try {
      app.updateEmployee({ ...form });
      app.addToast?.({ message: 'تم حفظ معلومات الملف الشخصي', type: 'success' });
    } catch {
      app.addToast?.({ message: 'فشل حفظ التغييرات', type: 'error' });
    } finally {
      setTimeout(() => setSaving(false), 300);
    }
  };

  // --- Avatar upload helpers ---
  const handleAvatarFile = async (file: File) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      app?.addToast?.({ message: 'يرجى اختيار صورة (PNG أو JPEG)', type: 'error' });
      return;
    }
    setUploadBusy(true);
    try {
      // Resize on client to max 256x256 to keep localStorage small
      const dataUrl = await resizeImageToDataUrl(file, 256, 256, 0.85);
      setForm(prev => ({ ...prev, avatarDataUrl: dataUrl }));
      // Auto-save avatar immediately to persist it
      app?.updateEmployee?.({ ...form, avatarDataUrl: dataUrl });
      app?.addToast?.({ message: 'تم تحديث صورة الملف الشخصي', type: 'success' });
    } catch (e) {
      app?.addToast?.({ message: 'فشل تحميل الصورة', type: 'error' });
    } finally {
      setUploadBusy(false);
    }
  };

  const removeAvatar = () => {
    setForm(prev => ({ ...prev, avatarDataUrl: undefined }));
    app?.updateEmployee?.({ ...form, avatarDataUrl: undefined });
  };

  const resizeImageToDataUrl = (file: File, maxW: number, maxH: number, quality = 0.9): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          try {
            let { width, height } = img;
            const scale = Math.min(maxW / width, maxH / height, 1);
            width = Math.floor(width * scale);
            height = Math.floor(height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('no ctx'));
            ctx.drawImage(img, 0, 0, width, height);
            const out = canvas.toDataURL(file.type.includes('png') ? 'image/png' : 'image/jpeg', quality);
            resolve(out);
          } catch (err) { reject(err); }
        };
        img.onerror = () => reject(new Error('image load error'));
        img.src = String(reader.result);
      };
      reader.onerror = () => reject(new Error('read error'));
      reader.readAsDataURL(file);
    });
  };

  // Internal messages view
  const myMessages = useMemo<InternalMessage[]>(() => {
    const list = (app?.internalMessages || []) as InternalMessage[];
    const uname = current.username;
    const dept = current.department;
    return list
      .filter(m => (
        m.toEmployee === uname ||
        m.fromEmployee === uname ||
        m.toDepartment === dept ||
        (m.toDepartments || []).includes(dept) ||
        m.fromDepartment === dept
      ))
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }, [app?.internalMessages, current.username, current.department]);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composePriority, setComposePriority] = useState<'عادي'|'هام'|'عاجل'>('عادي');
  const [composeToType, setComposeToType] = useState<'employee'|'department'>('department');
  const [composeToValue, setComposeToValue] = useState('');
  const [sending, setSending] = useState(false);

  const employeesList: Employee[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('employees') || '[]'); } catch { return []; }
  }, []);
  const departmentsList: string[] = useMemo(() => {
    try {
      const raw = localStorage.getItem('departmentsList');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map((d: any) => String(d?.name || '').trim()).filter(Boolean);
      return [];
    } catch { return []; }
  }, []);

  const handleSendInternal = async () => {
    if (!app?.sendInternalMessage) return;
    if (!composeSubject.trim() || !composeBody.trim()) {
      app.addToast?.({ message: 'الموضوع والمحتوى مطلوبان', type: 'error' });
      return;
    }
    if (!composeToValue.trim()) {
      app.addToast?.({ message: 'يرجى تحديد المستلم', type: 'error' });
      return;
    }
    setSending(true);
    try {
      const payload: any = {
        subject: composeSubject.trim(),
        body: composeBody.trim(),
        priority: composePriority,
        fromEmployee: current.username,
        fromDepartment: current.department,
      };
      if (composeToType === 'employee') {
        payload.toEmployee = composeToValue;
      } else {
        payload.toDepartment = composeToValue;
      }
      const id = app.sendInternalMessage(payload);
      if (id) {
        setComposeSubject(''); setComposeBody(''); setComposeToValue(''); setComposePriority('عادي'); setComposeOpen(false);
      }
    } finally {
      setTimeout(() => setSending(false), 200);
    }
  };

  return (
    <div className="rtl text-right">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0f3c35]">
            مرحباً، {current.name || current.username}
          </h1>
          <div className="mt-1 text-sm md:text-base text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <span>{(current.role || 'موظف')}{current.department ? ` — قسم ${current.department}` : ''}</span>
            <UiBadge
              variant="default"
              className={`!px-2 !py-0.5 !text-xs ${mfaOn ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'}`}
              title={mfaOn ? 'حالة المصادقة متعددة العوامل: مفعّلة' : 'حالة المصادقة متعددة العوامل: غير مفعّلة'}
              aria-label={mfaOn ? 'حالة المصادقة متعددة العوامل: مفعّلة' : 'حالة المصادقة متعددة العوامل: غير مفعّلة'}
            >
              {mfaOn ? 'المصادقة متعددة العوامل مفعّلة' : 'المصادقة متعددة العوامل غير مفعّلة'}
            </UiBadge>
          </div>
          <div className="mt-2 h-1 w-24 bg-[#0f3c35]/80 rounded-full" />
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            يمكنك تعديل معلوماتك الأساسية، إدارة إعدادات الأمان، واستعراض رسائلك الداخلية.
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {[
            { k: 'info', label: 'المعلومات الشخصية' },
            { k: 'security', label: 'أمان الحساب' },
            { k: 'inbox', label: 'الرسائل الداخلية' },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
                tab === t.k
                  ? 'border-[#0f3c35] text-[#0f3c35] font-semibold'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 md:p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* الصورة الشخصية */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
                    {form.avatarDataUrl ? (
                      <img src={form.avatarDataUrl} alt="صورة الموظف" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        {/* fallback user icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10">
                          <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.761-3.582-5-8-5Z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm cursor-pointer ${uploadBusy ? 'opacity-60 pointer-events-none' : 'bg-[#0f3c35] text-white hover:bg-[#0d342e]'}`}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleAvatarFile(f);
                          e.currentTarget.value = '';
                        }}
                      />
                      {uploadBusy ? 'جارٍ التحميل…' : 'تغيير الصورة'}
                    </label>
                    {form.avatarDataUrl && (
                      <button onClick={removeAvatar} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                        إزالة الصورة
                      </button>
                    )}
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      الصيغ المدعومة: PNG, JPEG — سيتم تقليص الحجم تلقائياً
                    </div>
                  </div>
                </div>
              </div>
              <Field label="اسم المستخدم">
                <input
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  readOnly
                />
              </Field>
              <Field label="الاسم الثلاثي">
                <input
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.name || ''}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="العنوان">
                <input
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.address || ''}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </Field>
              <Field label="رقم الهاتف">
                <input
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.phone || ''}
                  onChange={e => {
                    const value = e.target.value;
                    setForm({ ...form, phone: value });
                    const err = validatePhone(value);
                    setErrors(prev => ({ ...prev, phone: err }));
                  }}
                  inputMode="tel"
                />
                {errors.phone && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone}</div>
                )}
              </Field>
              <Field label="الرقم الوطني">
                <input
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.nationalId || ''}
                  onChange={e => {
                    const value = e.target.value;
                    setForm({ ...form, nationalId: value });
                    const err = validateNationalId(value);
                    setErrors(prev => ({ ...prev, nationalId: err }));
                  }}
                />
                <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">مثال: 01234567890 (11 رقمًا)</div>
                {errors.nationalId && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.nationalId}</div>
                )}
              </Field>
              <Field label="الرقم الوظيفي">
                <input
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.employeeNumber || ''}
                  onChange={e => setForm({ ...form, employeeNumber: e.target.value })}
                />
              </Field>
              <Field label="القسم">
                <input
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.department || ''}
                  onChange={e => setForm({ ...form, department: e.target.value as any })}
                />
              </Field>
              <Field label="الدور الوظيفي">
                <input
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.role || ''}
                  onChange={e => setForm({ ...form, role: e.target.value as any })}
                />
              </Field>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-white bg-[#0f3c35] hover:bg-[#0d342e] disabled:opacity-60`}
              >
                {saving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
              </button>
              <button
                onClick={() => setForm({ ...current })}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
              >
                تراجع
              </button>
            </div>
          </section>
        )}

        {tab === 'security' && (
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 md:p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">المصادقة متعددة العوامل</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  عزز أمان حسابك بتفعيل المصادقة متعددة العوامل.
                </p>
                <button
                  onClick={() => app?.navigateTo('#/mfa-management')}
                  className="rounded-xl bg-[#0f3c35] text-white px-4 py-2 text-sm hover:bg-[#0d342e]"
                >
                  إدارة المصادقة متعددة العوامل
                </button>
              </div>
              <div>
                <h3 className="font-semibold mb-2">تغيير كلمة المرور</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  لأغراض العرض فقط: غيّر كلمة المرور المخزنة محلياً لهذا المستخدم.
                </p>
                <PasswordChanger employee={current} onChanged={(emp) => {
                  app?.updateEmployee?.(emp);
                  app?.addToast?.({ message: 'تم تحديث كلمة المرور', type: 'success' });
                }} />
              </div>
            </div>
          </section>
        )}

        {tab === 'inbox' && (
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 md:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">الرسائل المرتبطة بك: {myMessages.length}</div>
              <button
                onClick={() => setComposeOpen(v => !v)}
                className="rounded-xl bg-[#0f3c35] text-white px-3 py-2 text-xs hover:bg-[#0d342e]"
              >{composeOpen ? 'إلغاء' : 'رسالة جديدة'}</button>
            </div>

            {composeOpen && (
              <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1">نوع المستلم</label>
                    <div className="flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-1">
                        <input type="radio" checked={composeToType==='department'} onChange={()=> setComposeToType('department')} /> قسم
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="radio" checked={composeToType==='employee'} onChange={()=> setComposeToType('employee')} /> موظف
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1">الأولوية</label>
                    <select value={composePriority} onChange={e=> setComposePriority(e.target.value as any)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm">
                      <option value="عادي">عادي</option>
                      <option value="هام">هام</option>
                      <option value="عاجل">عاجل</option>
                    </select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs mb-1">المستلم</label>
                    {composeToType === 'employee' ? (
                      <select value={composeToValue} onChange={e=> setComposeToValue(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm">
                        <option value="">— اختر موظف —</option>
                        {employeesList.map(emp => (
                          <option key={emp.username} value={emp.username}>{emp.name || emp.username} ({emp.department || '—'})</option>
                        ))}
                      </select>
                    ) : (
                      <select value={composeToValue} onChange={e=> setComposeToValue(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm">
                        <option value="">— اختر قسم —</option>
                        {[current.department, ...departmentsList.filter(d => d && d !== current.department)].map(dep => (
                          <option key={dep} value={dep}>{dep}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs mb-1">الموضوع</label>
                    <input value={composeSubject} onChange={e=> setComposeSubject(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs mb-1">المحتوى</label>
                  <textarea value={composeBody} onChange={e=> setComposeBody(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm" rows={4} />
                </div>
                <div className="mt-3 flex items-center gap-2 justify-end">
                  <button onClick={()=> setComposeOpen(false)} className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-xs">إلغاء</button>
                  <button onClick={handleSendInternal} disabled={sending} className="rounded-xl bg-[#0f3c35] text-white px-3 py-2 text-xs disabled:opacity-60">{sending?'جارٍ الإرسال…':'إرسال'}</button>
                </div>
              </div>
            )}

            {myMessages.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">لا توجد رسائل داخلية مرتبطة بك حالياً.</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {myMessages.map((m) => (
                  <li key={m.id} className="py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">{m.title || m.subject || 'مراسلة داخلية'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          من: {m.fromEmployee || m.fromDepartment || '—'}؛ إلى: {m.toEmployee || m.toDepartment || (m.toDepartments||[])[0] || '—'}
                        </div>
                        {m.body && (
                          <div className="mt-2 text-sm leading-6 whitespace-pre-wrap">{m.body}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString('ar-SY-u-nu-latn') : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <button
                onClick={() => app?.navigateTo('#/internal-messages')}
                className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm"
              >
                فتح صندوق الرسائل المتقدم
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const PasswordChanger: React.FC<{ employee: Employee; onChanged: (emp: Employee) => void }>
  = ({ employee, onChanged }) => {
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!pwd || pwd.length < 6) return alert('كلمة المرور يجب أن لا تقل عن 6 محارف');
    if (pwd !== pwd2) return alert('كلمتا المرور غير متطابقتين');
    setBusy(true);
    setTimeout(() => {
      onChanged({ ...employee, password: pwd });
      setPwd(''); setPwd2(''); setBusy(false);
    }, 200);
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="grid grid-cols-1 gap-3">
        <input
          type="password"
          placeholder="كلمة المرور الجديدة"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
        />
        <input
          type="password"
          placeholder="تأكيد كلمة المرور"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800 px-3 py-2 text-sm"
          value={pwd2}
          onChange={e => setPwd2(e.target.value)}
        />
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-xl bg-[#0f3c35] text-white px-4 py-2 text-sm hover:bg-[#0d342e] disabled:opacity-60"
        >
          {busy ? 'جارٍ التحديث…' : 'تحديث كلمة المرور'}
        </button>
      </div>
    </div>
  );
};

export default EmployeeProfilePage;
