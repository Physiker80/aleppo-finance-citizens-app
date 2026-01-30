import React from 'react';
import { formatDateTime } from './utils/arabicNumerals';

const TestApp: React.FC = () => {
  console.log('🧪 TestApp component rendering...');
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '3rem', margin: '20px 0' }}>
        🎉 النظام يعمل بنجاح!
      </h1>
      
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '10px',
        margin: '20px auto',
        maxWidth: '600px'
      }}>
        <h2>✅ اختبار React Component</h2>
        <p>React يعمل بشكل طبيعي</p>
        <p>التاريخ: {formatDateTime(new Date())}</p>
        
        <button 
          onClick={() => alert('✅ التفاعل يعمل!')}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            margin: '10px'
          }}
        >
          اختبار التفاعل
        </button>
        
        <button 
          onClick={() => window.location.href = '/debug.html'}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            margin: '10px'
          }}
        >
          صفحة التشخيص
        </button>
      </div>
      
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        padding: '15px', 
        borderRadius: '8px',
        margin: '20px auto',
        maxWidth: '800px',
        textAlign: 'left'
      }}>
        <h3>🔍 معلومات التشخيص:</h3>
        <ul>
          <li>✅ React: تم التحميل بنجاح</li>
          <li>✅ TypeScript: يعمل</li>
          <li>✅ Vite: خادم التطوير نشط</li>
          <li>✅ الخطوط: تم تحميلها</li>
        </ul>
      </div>
    </div>
  );
};

export default TestApp;