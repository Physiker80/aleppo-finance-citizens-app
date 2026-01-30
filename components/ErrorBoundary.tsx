import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState { hasError: boolean; error?: any }
interface ErrorBoundaryProps { children: ReactNode; fallback?: ReactNode }

class CustomErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(error: any): ErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // تسجيل آخر خطأ محلياً
    try { localStorage.setItem('last_runtime_error', JSON.stringify({ message: error.message, stack: error.stack, componentStack: info.componentStack, time: new Date().toISOString() })); } catch {}
    console.error('ErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ direction: 'rtl', padding: '2rem', textAlign: 'center' }} role="alert" aria-live="assertive" aria-label="خطأ في التطبيق">
          <h1 style={{ color: '#b91c1c', fontSize: '1.5rem', marginBottom: '1rem' }}>حدث خطأ غير متوقع</h1>
          <p style={{ color: '#374151', marginBottom: '1rem' }}>يرجى إعادة تحميل الصفحة أو المحاولة لاحقاً</p>
          <div style={{ display:'flex', gap:'0.5rem', justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => window.location.reload()} style={{ background: '#0f3c35', color: '#fff', padding: '0.65rem 1.3rem', borderRadius: '0.5rem', fontSize: 14 }}>إعادة التحميل</button>
            <button onClick={() => { try { (this as any).state = { hasError: false }; } catch {}; location.reload(); }} style={{ background: '#0369a1', color: '#fff', padding: '0.65rem 1.3rem', borderRadius: '0.5rem', fontSize: 14 }}>إعادة المحاولة</button>
          </div>
          {this.state.error && (
            <pre style={{ textAlign: 'left', direction: 'ltr', background: '#f3f4f6', marginTop: '1rem', padding: '1rem', borderRadius: '0.5rem', maxHeight: 200, overflow: 'auto', fontSize: '0.7rem' }}>{String(this.state.error)}</pre>
          )}
          <div style={{ marginTop: '0.75rem', fontSize: 11, color:'#6b7280' }}>سُجل آخر خطأ بالمفتاح: last_runtime_error</div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default CustomErrorBoundary;
