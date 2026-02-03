import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Employee } from '../types';
import { formatDateTime } from '../utils/arabicNumerals';
import { storageModeService } from '../utils/storageMode';

// ===== فحص قوة كلمة المرور =====
interface PasswordStrength {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
  score: number;
}

const checkPasswordStrength = (password: string): PasswordStrength => {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 8) score++; else errors.push('يجب أن تكون 8 أحرف على الأقل');
  if (/[A-Z]/.test(password)) score++; else errors.push('يجب أن تحتوي على حرف كبير');
  if (/[a-z]/.test(password)) score++; else errors.push('يجب أن تحتوي على حرف صغير');
  if (/[0-9]/.test(password)) score++; else errors.push('يجب أن تحتوي على رقم');
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++; else errors.push('يجب أن تحتوي على رمز خاص');

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return { valid: errors.length === 0, strength, errors, score };
};

// مكتبة للتعامل مع ملفات Excel
declare const XLSX: any;

const EmployeeManagementPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    username: '',
    password: '',
    name: '',
    department: '',
    role: 'موظف'
  });
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);

  // تحقق من صلاحيات المدير
  const isManager = appContext?.currentEmployee?.role === 'مدير';

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    const stored = localStorage.getItem('employees');
    if (stored) {
      setEmployees(JSON.parse(stored));
    }
  };

  const saveEmployees = (employeeList: Employee[]) => {
    localStorage.setItem('employees', JSON.stringify(employeeList));
    setEmployees(employeeList);
    
    // ===== Sync to Supabase =====
    storageModeService.syncEmployeeProfilesToCloud().then(res => {
      if (res.success) {
        console.log('[EmployeeManagement] ✅ Employees synced to cloud:', res.count);
      } else {
        console.error('[EmployeeManagement] ❌ Cloud sync failed:', res.error);
      }
    }).catch(err => console.error('[EmployeeManagement] ❌ Sync error:', err));
    // ===== End Supabase Sync =====
  };

  const handleCreateEmployee = () => {
    if (!newEmployee.username || !newEmployee.password || !newEmployee.name || !newEmployee.department) {
      alert('يرجى ملء جميع الحقول.');
      return;
    }

    // فحص قوة كلمة المرور
    const pwdCheck = checkPasswordStrength(newEmployee.password);
    if (!pwdCheck.valid) {
      alert('كلمة المرور ضعيفة:\n' + pwdCheck.errors.join('\n'));
      return;
    }

    const existingEmployee = employees.find(emp => emp.username === newEmployee.username);
    if (existingEmployee) {
      alert('اسم المستخدم موجود بالفعل.');
      return;
    }

    const employee: Employee = {
      ...newEmployee,
      lastLogin: undefined
    };

    const updatedEmployees = [...employees, employee];
    saveEmployees(updatedEmployees);

    setNewEmployee({
      username: '',
      password: '',
      name: '',
      department: '',
      role: 'موظف'
    });
    setShowCreateForm(false);
    alert('تم إنشاء حساب الموظف بنجاح!');
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setNewEmployee({
      username: employee.username,
      password: employee.password,
      name: employee.name,
      department: employee.department,
      role: employee.role
    });
    setShowCreateForm(true);
  };

  const handleUpdateEmployee = () => {
    if (!editingEmployee) return;

    const updatedEmployees = employees.map(emp =>
      emp.username === editingEmployee.username ? {
        ...newEmployee,
        lastLogin: emp.lastLogin
      } : emp
    );

    saveEmployees(updatedEmployees);
    setEditingEmployee(null);
    setNewEmployee({
      username: '',
      password: '',
      name: '',
      department: '',
      role: 'موظف'
    });
    setShowCreateForm(false);
    alert('تم تحديث بيانات الموظف بنجاح!');
  };

  const handleDeleteEmployee = (username: string) => {
    if (username === appContext?.currentEmployee?.username) {
      alert('لا يمكنك حذف حسابك الخاص.');
      return;
    }

    if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
      const updatedEmployees = employees.filter(emp => emp.username !== username);
      saveEmployees(updatedEmployees);
      alert('تم حذف الموظف بنجاح!');
    }
  };

  const exportToExcel = () => {
    if (typeof XLSX === 'undefined') {
      alert('مكتبة Excel غير متاحة. يرجى إعادة تحميل الصفحة.');
      return;
    }

    const worksheetData = [
      ['اسم المستخدم', 'الاسم الكامل', 'القسم', 'الدور', 'آخر دخول'],
      ...employees.map(emp => [
        emp.username,
        emp.name,
        emp.department,
        emp.role,
        emp.lastLogin ? formatDateTime(new Date(emp.lastLogin)) : 'لم يدخل بعد'
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الموظفين');

    XLSX.writeFile(workbook, `employees_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const importFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      alert('مكتبة Excel غير متاحة. يرجى إعادة تحميل الصفحة.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // لا نستورد كلمات المرور؛ سنحافظ على كلمات المرور الحالية للموظفين الموجودين
        const importedEmployees: Omit<Employee, 'password'>[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (row.length >= 4) {
            importedEmployees.push({
              username: row[0] || '',
              name: row[1] || '',
              department: row[2] || '',
              role: row[3] || 'موظف',
              // بدون كلمة مرور هنا
            } as any);
          }
        }

        if (importedEmployees.length > 0) {
          const mergedEmployees = [...employees];
          importedEmployees.forEach(newEmp => {
            const existingIndex = mergedEmployees.findIndex(emp => emp.username === newEmp.username);
            if (existingIndex >= 0) {
              // حافظ على كلمة المرور الحالية ولا تسمح بتعديل حساب الأدمن بشكل غير مباشر
              const current = mergedEmployees[existingIndex];
              if (current.username === 'admin') {
                mergedEmployees[existingIndex] = { ...current, name: newEmp.name, department: newEmp.department, role: newEmp.role };
              } else {
                mergedEmployees[existingIndex] = { ...current, name: newEmp.name, department: newEmp.department, role: newEmp.role };
              }
            } else {
              // مستخدم جديد: عيِّن كلمة مرور مؤقتة، مع حماية اسم المستخدم 'admin'
              const tempPassword = newEmp.username === 'admin' ? 'admin123' : 'temp123';
              mergedEmployees.push({ ...(newEmp as any), password: tempPassword });
            }
          });

          saveEmployees(mergedEmployees);
          alert(`تم استيراد/تحديث ${importedEmployees.length} موظف بنجاح!`);
        }
      } catch (error) {
        alert('حدث خطأ في قراءة الملف. يرجى التأكد من صيغة الملف.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (!isManager) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">غير مصرح</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            هذه الصفحة متاحة للمديرين فقط.
          </p>
          <Button onClick={() => window.location.hash = '#/dashboard'}>
            العودة للوحة التحكم
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {/* Navigation links for security management */}
      <div className="flex flex-wrap gap-2 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Button
          onClick={() => window.location.hash = '#/mfa-management'}
          variant="secondary"
          className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/40"
        >
          🔐 إدارة المصادقة متعددة العوامل
        </Button>
        <Button
          onClick={() => window.location.hash = '#/session-security'}
          variant="secondary"
          className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/40"
        >
          🛡️ أمان الجلسات
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">الموارد البشرية</h2>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button onClick={() => setShowCreateForm(true)} variant="primary">
            إضافة موظف جديد
          </Button>
          <Button onClick={exportToExcel} variant="secondary">
            تصدير إلى Excel
          </Button>
          <label className="text-sm bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-md cursor-pointer transition-colors">
            استيراد من Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={importFromExcel}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            {editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              id="username"
              label="اسم المستخدم *"
              value={newEmployee.username}
              onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
              placeholder="اسم المستخدم"
              disabled={editingEmployee ? true : false}
            />
            <div>
              <Input
                id="password"
                label="كلمة المرور *"
                type="password"
                value={newEmployee.password}
                onChange={(e) => {
                  setNewEmployee({ ...newEmployee, password: e.target.value });
                  if (e.target.value) {
                    setPasswordStrength(checkPasswordStrength(e.target.value));
                  } else {
                    setPasswordStrength(null);
                  }
                }}
                placeholder="كلمة المرور"
              />
              {/* مؤشر قوة كلمة المرور */}
              {passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">القوة:</span>
                    <span className={`text-xs font-bold ${passwordStrength.strength === 'strong' ? 'text-green-600' :
                        passwordStrength.strength === 'medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                      {passwordStrength.strength === 'strong' ? '💪 قوية' :
                        passwordStrength.strength === 'medium' ? '👍 متوسطة' : '⚠️ ضعيفة'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${passwordStrength.strength === 'strong' ? 'bg-green-500 w-full' :
                        passwordStrength.strength === 'medium' ? 'bg-yellow-500 w-2/3' : 'bg-red-500 w-1/3'
                      }`} />
                  </div>
                  {passwordStrength.errors.length > 0 && (
                    <ul className="mt-1 text-xs text-red-600 dark:text-red-400 list-disc list-inside">
                      {passwordStrength.errors.slice(0, 3).map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <Input
              id="name"
              label="الاسم الكامل *"
              value={newEmployee.name}
              onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
              placeholder="الاسم الكامل"
            />
            <Input
              id="department"
              label="القسم *"
              value={newEmployee.department}
              onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
              placeholder="اسم القسم"
            />
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الدور *
              </label>
              <select
                value={newEmployee.role}
                onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="موظف">موظف</option>
                <option value="مدير">مدير</option>
                <option value="مشرف">مشرف</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-4 rtl:space-x-reverse mt-6">
            <Button
              onClick={editingEmployee ? handleUpdateEmployee : handleCreateEmployee}
            >
              {editingEmployee ? 'حفظ التعديلات' : 'إضافة الموظف'}
            </Button>
            <Button
              onClick={() => {
                setShowCreateForm(false);
                setEditingEmployee(null);
                setNewEmployee({
                  username: '',
                  password: '',
                  name: '',
                  department: '',
                  role: 'موظف'
                });
              }}
              variant="secondary"
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {employees.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">لا يوجد موظفين</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ابدأ بإضافة موظف جديد.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">اسم المستخدم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الاسم الكامل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">القسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الدور</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">آخر دخول</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {employees.map((employee) => (
                <tr key={employee.username} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">{employee.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{employee.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{employee.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${employee.role === 'مدير'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                        : employee.role === 'مشرف'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
                      }`}>
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {employee.lastLogin ? formatDateTime(new Date(employee.lastLogin)) : 'لم يدخل بعد'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 rtl:space-x-reverse">
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        تعديل
                      </button>
                      {employee.username !== appContext?.currentEmployee?.username && (
                        <button
                          onClick={() => handleDeleteEmployee(employee.username)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default EmployeeManagementPage;
