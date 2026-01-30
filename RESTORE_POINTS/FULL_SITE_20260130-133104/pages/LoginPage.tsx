import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Employee, MfaFactorType } from '../types';
import MFAVerification from '../components/MFAVerification';

// مكتبة للتعامل مع ملفات Excel
declare const XLSX: any;

const LoginPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [showMfaVerification, setShowMfaVerification] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState<any>(null);
  const [newEmployee, setNewEmployee] = useState({
    username: '',
    password: '',
    name: '',
    department: '',
    role: 'موظف'
  });

  // قائمة الموظفين المخزنة محلياً (يمكن تطويرها لاحقاً لتكون مع قاعدة بيانات)
  const getEmployees = (): Employee[] => {
    const stored = localStorage.getItem('employees');
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  };

  const saveEmployees = (employees: Employee[]) => {
    localStorage.setItem('employees', JSON.stringify(employees));
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError('أدخل اسم المستخدم وكلمة المرور');
      return;
    }
    setIsLoading(true);
    setError(null);
    
    try {
      if (appContext?.backendLogin) {
        const ok = await appContext.backendLogin(username, password);
        if (ok) {
          window.location.hash = '#/dashboard';
        } else {
          setError(appContext.authError || 'تعذر تسجيل الدخول');
        }
      } else {
        // Local login with MFA support
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const employee = employees.find((emp: any) => 
          emp.username === username && emp.password === password
        );
        
        if (!employee) {
          setError('بيانات دخول غير صحيحة');
          return;
        }

        // Check if employee requires MFA
        if (appContext?.requiresMFA && appContext.requiresMFA(employee)) {
          // Store pending employee for MFA verification
          setPendingEmployee(employee);
          setShowMfaVerification(true);
          setPassword(''); // Clear password for security
        } else {
          // Direct login without MFA
          const success = appContext?.employeeLogin(username, password as any);
          if (success) {
            window.location.hash = '#/dashboard';
          } else {
            setError('فشل في تسجيل الدخول');
          }
        }
      }
    } catch (error) {
      setError('حدث خطأ أثناء تسجيل الدخول');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSuccess = () => {
    if (pendingEmployee && appContext?.onMfaSuccess) {
      appContext.onMfaSuccess(pendingEmployee);
      window.location.hash = '#/dashboard';
    }
  };

  const handleMfaCancel = () => {
    setShowMfaVerification(false);
    setPendingEmployee(null);
    setUsername('');
    setPassword('');
    setError(null);
  };

  const handleCreateEmployee = () => {
    if (!newEmployee.username || !newEmployee.password || !newEmployee.name || !newEmployee.department) {
      setError('يرجى ملء جميع الحقول.');
      return;
    }

    const employees = getEmployees();
    const existingEmployee = employees.find(emp => emp.username === newEmployee.username);
    
    if (existingEmployee) {
      setError('اسم المستخدم موجود بالفعل.');
      return;
    }

    const employee: Employee = {
      ...newEmployee,
      lastLogin: undefined
    };

    employees.push(employee);
    saveEmployees(employees);
    
    setNewEmployee({
      username: '',
      password: '',
      name: '',
      department: '',
      role: 'موظف'
    });
    setShowCreateEmployee(false);
    setError(null);
    alert('تم إنشاء حساب الموظف بنجاح!');
  };

  const exportToExcel = () => {
    if (typeof XLSX === 'undefined') {
      alert('مكتبة Excel غير متاحة. يرجى إعادة تحميل الصفحة.');
      return;
    }

    const employees = getEmployees();
    const worksheetData = [
      ['اسم المستخدم', 'الاسم الكامل', 'القسم', 'الدور', 'آخر دخول'],
      ...employees.map(emp => [
        emp.username,
        emp.name,
        emp.department,
        emp.role,
        emp.lastLogin ? new Date(emp.lastLogin).toLocaleString('ar-SY-u-nu-latn') : 'لم يدخل بعد'
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الموظفون');
    XLSX.writeFile(workbook, 'employees.xlsx');
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
        
        // تخطي السطر الأول (العناوين)
        const employees: Employee[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (row.length >= 4) {
            employees.push({
              username: row[0] || '',
              name: row[1] || '',
              department: row[2] || '',
              role: row[3] || 'موظف',
              password: 'temp123', // كلمة مرور مؤقتة
            });
          }
        }
        
        if (employees.length > 0) {
          saveEmployees(employees);
          alert(`تم استيراد ${employees.length} موظف بنجاح!`);
        }
      } catch (error) {
        alert('حدث خطأ في قراءة الملف. يرجى التأكد من صيغة الملف.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <div className="text-center">
            <img 
              src="https://syrian.zone/syid/materials/logo.ai.svg" 
              alt="شعار مديرية مالية حلب" 
              className="mx-auto h-20 w-auto"
            />
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
              دخول الموظفين
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              نظام إدارة الاستعلامات والشكاوى
            </p>
          </div>

          {showMfaVerification ? (
            // MFA Verification Screen
            <div className="mt-8">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  التحقق من الهوية
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  أدخل رمز التحقق للمتابعة
                </p>
              </div>
              
              <MFAVerification
                employee={pendingEmployee}
                onSuccess={handleMfaSuccess}
                onCancel={handleMfaCancel}
              />
            </div>
          ) : !showCreateEmployee ? (
            // Login Form
            <div className="mt-8 space-y-6">
              <div className="space-y-4">
                <Input
                  id="username"
                  label="اسم المستخدم *"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  autoComplete="username"
                />
                <Input
                  id="password"
                  label="كلمة المرور *"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleLogin}
                isLoading={isLoading}
                className="w-full"
              >
                {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </Button>

              <div className="text-center space-y-2">
                <button
                  onClick={() => setShowCreateEmployee(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  إضافة موظف جديد
                </button>
                
                <div className="flex justify-center space-x-4 rtl:space-x-reverse">
                  <button
                    onClick={exportToExcel}
                    className="text-sm text-green-600 dark:text-green-400 hover:underline"
                  >
                    تصدير إلى Excel
                  </button>
                  
                  <label className="text-sm text-purple-600 dark:text-purple-400 hover:underline cursor-pointer">
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

              <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
                <p>بيانات تجريبية:</p>
                <p>المدير: admin / admin123 (يتضمن إدارة الموظفين)</p>
                <p>الموظف: finance1 / finance123</p>
              </div>
            </div>
          ) : (
            // Create Employee Form
            <div className="mt-8 space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">إضافة موظف جديد</h3>
              
              <div className="space-y-4">
                <Input
                  id="newUsername"
                  label="اسم المستخدم *"
                  value={newEmployee.username}
                  onChange={(e) => setNewEmployee({...newEmployee, username: e.target.value})}
                  placeholder="اسم المستخدم"
                />
                <Input
                  id="newPassword"
                  label="كلمة المرور *"
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                  placeholder="كلمة المرور"
                />
                <Input
                  id="newName"
                  label="الاسم الكامل *"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  placeholder="الاسم الكامل"
                />
                <Input
                  id="newDepartment"
                  label="القسم *"
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                  placeholder="اسم القسم"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الدور *
                  </label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="موظف">موظف</option>
                    <option value="مدير">مدير</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button onClick={handleCreateEmployee} className="flex-1">
                  إنشاء الحساب
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowCreateEmployee(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;