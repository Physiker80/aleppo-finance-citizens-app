import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const appContext = useContext(AppContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Reset form when modal is closed
    if (!isOpen) {
      setTimeout(() => {
        setUsername('');
        setPassword('');
        setError(null);
        setIsLoading(false);
      }, 300); // Delay to allow for exit animation
    }
  }, [isOpen]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const success = appContext?.employeeLogin(username, password);
    
    setIsLoading(false);

    if (success) {
      onClose();
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"></div>
      <div 
        className={`relative w-full max-w-md mx-4 transition-transform duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">دخول الموظفين</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close login modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              id="username"
              label="اسم المستخدم"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
            <Input 
              id="password"
              label="كلمة المرور"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button type="submit" isLoading={isLoading} className="w-full">
              {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </Button>
          </form>
          
          {/* Footer with security notice - no background */}
          <div className="mt-4 p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              للموظفين المخولين فقط، عملية التسجيل مراقبة و مسجلة
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginModal;
