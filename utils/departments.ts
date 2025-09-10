// Shared departments utilities: read from localStorage and provide a hook
import { useEffect, useState } from 'react';

const FALLBACK_DEPARTMENT_NAMES: string[] = [
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
];

export function getDepartmentNames(): string[] {
  try {
    const raw = localStorage.getItem('departmentsList');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        const names = arr
          .map((d: any) => String(d?.name || '').trim())
          .filter((n: string) => n.length > 0);
        if (names.length) return names;
      }
    }
  } catch { /* noop */ }
  return FALLBACK_DEPARTMENT_NAMES;
}

export function useDepartmentNames(): string[] {
  const [names, setNames] = useState<string[]>(() => getDepartmentNames());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'departmentsList') setNames(getDepartmentNames());
    };
    const onCustom = () => setNames(getDepartmentNames());
    window.addEventListener('storage', onStorage);
    window.addEventListener('departmentsListUpdated', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('departmentsListUpdated', onCustom as EventListener);
    };
  }, []);

  return names;
}
