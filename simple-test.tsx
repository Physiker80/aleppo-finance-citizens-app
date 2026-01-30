import React from 'react';
import ReactDOM from 'react-dom/client';

// تطبيق مبسط جداً للاختبار
const SimpleTestApp: React.FC = () => {
  return (
    <div style={{
      padding: '50px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
      minHeight: '100vh',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>
        ✅ React يعمل!
      </h1>
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '30px',
        borderRadius: '15px',
        backdropFilter: 'blur(10px)',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h2>اختبار React أساسي</h2>
        
        <p>إذا رأيت هذه الرسالة، فهذا يعني أن:</p>
        <ul style={{ textAlign: 'right', lineHeight: '2' }}>
          <li>✅ React يعمل بشكل طبيعي</li>
          <li>✅ JavaScript يعمل</li>
          <li>✅ التطبيق يتم تحميله بنجاح</li>
          <li>✅ المشكلة في التطبيق الأصلي وليس React</li>
        </ul>
        
        <button 
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            margin: '20px 10px'
          }}
          onClick={() => alert('✅ JavaScript والتفاعل يعملان!')}
        >
          اختبار التفاعل
        </button>
        
        <button 
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            margin: '20px 10px'
          }}
          onClick={() => window.location.href = '/'}
        >
          العودة للتطبيق الأصلي
        </button>
      </div>
      
      <div style={{ marginTop: '30px', fontSize: '14px', opacity: '0.8' }}>
        إذا كان هذا يعمل والتطبيق الأصلي لا يعمل، فالمشكلة في الكود الأصلي
      </div>
    </div>
  );
};

// تشغيل التطبيق المبسط
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<SimpleTestApp />);

console.log('🎉 Simple React app loaded successfully!');
console.log('📍 If you see this message, React is working properly');
console.log('🐛 The issue is likely in the main App.tsx or its dependencies');