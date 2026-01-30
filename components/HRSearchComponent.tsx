import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { Employee } from '../types';
import { FiSearch, FiUser, FiX } from 'react-icons/fi';

interface HRSearchComponentProps {
  onEmployeeSelect: (employee: Employee) => void;
  selectedEmployee: Employee | null;
  onClearSelection: () => void;
}

const HRSearchComponent: React.FC<HRSearchComponentProps> = ({
  onEmployeeSelect,
  selectedEmployee,
  onClearSelection
}) => {
  const appContext = useContext(AppContext);
  const [searchType, setSearchType] = useState<'name' | 'nationalId'>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!appContext || !searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    
    // إضافة delay بسيط لجعل التجربة أكثر سلاسة
    setTimeout(() => {
      if (searchType === 'name') {
        const results = appContext.searchEmployeeByName(searchQuery.trim());
        setSearchResults(results);
        setShowResults(true);
      } else {
        const result = appContext.searchEmployeeByNationalId(searchQuery.trim());
        if (result) {
          setSearchResults([result]);
          setShowResults(true);
          // للرقم الوطني، نقوم بالتحديد التلقائي
          onEmployeeSelect(result);
          setSearchQuery('');
          setShowResults(false);
        } else {
          setSearchResults([]);
          setShowResults(true);
        }
      }
      setIsSearching(false);
    }, 300);
  };

  const handleEmployeeClick = (employee: Employee) => {
    onEmployeeSelect(employee);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const handleClearSelection = () => {
    onClearSelection();
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="space-y-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-blue-600 dark:text-blue-400">
          <FiUser size={20} />
        </div>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">البحث في قاعدة بيانات الموظفين</h3>
      </div>

      {selectedEmployee ? (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">تم تحديد الموظف:</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">الاسم:</span> {selectedEmployee.name}</p>
                <p><span className="font-medium">القسم:</span> {selectedEmployee.department}</p>
                <p><span className="font-medium">رقم الموظف:</span> {selectedEmployee.employeeNumber || 'غير محدد'}</p>
                <p><span className="font-medium">الرقم الوطني:</span> {selectedEmployee.nationalId || 'غير محدد'}</p>
                <p><span className="font-medium">الصلاحية:</span> {selectedEmployee.role}</p>
              </div>
            </div>
            <button
              onClick={handleClearSelection}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              title="إلغاء التحديد"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="name"
                checked={searchType === 'name'}
                onChange={(e) => setSearchType(e.target.value as 'name' | 'nationalId')}
                className="text-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">البحث بالاسم</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="nationalId"
                checked={searchType === 'nationalId'}
                onChange={(e) => setSearchType(e.target.value as 'name' | 'nationalId')}
                className="text-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">البحث بالرقم الوطني</span>
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchType === 'name' ? 'أدخل اسم الموظف...' : 'أدخل الرقم الوطني...'}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-200"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>جاري البحث...</span>
                </>
              ) : (
                <>
                  <div className="text-white">
                    <FiSearch size={16} />
                  </div>
                  <span>بحث</span>
                </>
              )}
            </button>
            {(searchQuery || showResults) && (
              <button
                onClick={handleClearSearch}
                className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                <FiX size={16} />
              </button>
            )}
          </div>

          {showResults && (
            <div className="mt-3">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">نتائج البحث ({searchResults.length}):</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {searchResults.map((employee, index) => (
                      <div
                        key={`${employee.username}-${index}`}
                        onClick={() => handleEmployeeClick(employee)}
                        className="p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 hover:shadow-md"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                              {employee.name}
                              {employee.employeeNumber && (
                                <span className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                  #{employee.employeeNumber}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{employee.department}</p>
                            {employee.nationalId && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">الرقم الوطني: {employee.nationalId}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            employee.role === 'مدير' 
                              ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' 
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          }`}>
                            {employee.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">
                    {searchType === 'name' 
                      ? 'لم يتم العثور على موظفين يحملون هذا الاسم'
                      : 'لم يتم العثور على موظف بهذا الرقم الوطني'
                    }
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    تأكد من صحة البيانات المدخلة وحاول مرة أخرى
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HRSearchComponent;