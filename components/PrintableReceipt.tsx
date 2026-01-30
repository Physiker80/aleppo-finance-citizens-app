import React from 'react';
import { Ticket } from '../types';

interface PrintableReceiptProps {
  ticket: Ticket | undefined;
  qrCanvas: HTMLCanvasElement | null;
}

const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ ticket, qrCanvas }) => {
  if (!ticket) return null;

  const qrCodeDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : '';

  return (
    <div style={{
      fontFamily: "'Noto Naskh Arabic', serif",
      direction: 'rtl',
      width: '210mm',
      minHeight: '297mm',
      padding: '15mm',
      backgroundColor: 'white',
      color: '#000',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '10px' }}>
        <img 
          src="/ministry-logo.svg" 
          alt="شعار" 
          style={{ height: '70px', width: '70px', margin: '0 auto 10px' }} 
        />
        <h1 style={{ margin: '0', fontSize: '22pt', fontWeight: 'bold' }}>الجمهورية العربية السورية</h1>
        <h2 style={{ margin: '5px 0 0', fontSize: '18pt' }}>وزارة المالية - مديرية مالية حلب</h2>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', margin: '30px 0' }}>
        <p style={{ margin: '0', fontSize: '24pt', fontWeight: 'bold', borderBottom: '2px solid #000', display: 'inline-block', paddingBottom: '5px' }}>
          إيصال استلام طلب
        </p>
      </div>

      {/* Tracking ID */}
      <div style={{ border: '1px solid #ccc', padding: '15px', textAlign: 'center', marginBottom: '25px', backgroundColor: '#f9f9f9' }}>
        <p style={{ margin: '0 0 5px', fontSize: '14pt' }}>رقم التتبع الخاص بالطلب:</p>
        <p style={{ margin: '0', fontSize: '22pt', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px' }}>
          {ticket.id}
        </p>
      </div>

      {/* Ticket Info */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14pt' }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '10px', fontWeight: 'bold' }}>الاسم الكامل:</td>
            <td style={{ padding: '10px' }}>{ticket.fullName}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '10px', fontWeight: 'bold' }}>الرقم الوطني:</td>
            <td style={{ padding: '10px' }}>{ticket.nationalId}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '10px', fontWeight: 'bold' }}>القسم المختص:</td>
            <td style={{ padding: '10px' }}>{ticket.department}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '10px', fontWeight: 'bold' }}>تاريخ التقديم:</td>
            <td style={{ padding: '10px', direction: 'ltr', textAlign: 'right' }}>
              {new Date(ticket.submissionDate).toLocaleString('ar-SY-u-nu-latn')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Details */}
      <div style={{ marginTop: '25px' }}>
        <h3 style={{ fontSize: '16pt', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>تفاصيل الطلب:</h3>
        <p style={{ fontSize: '14pt', lineHeight: '1.6', whiteSpace: 'pre-wrap', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
          {ticket.details}
        </p>
      </div>

      {/* QR Code */}
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        {qrCodeDataUrl && (
          <img src={qrCodeDataUrl} alt="QR Code" style={{ width: '140px', height: '140px' }} />
        )}
        <p style={{ margin: '5px 0 0', fontSize: '12pt' }}>امسح للمتابعة السريعة</p>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '15mm',
        left: '15mm',
        right: '15mm',
        textAlign: 'center',
        fontSize: '10pt',
        color: '#777',
        borderTop: '1px solid #ccc',
        paddingTop: '10px'
      }}>
        <p style={{ margin: '0' }}>هذا الإيصال وثيقة رسمية لتأكيد استلام طلبك.</p>
        <p style={{ margin: '5px 0 0' }}>تاريخ الطباعة: {new Date().toLocaleString('ar-SY-u-nu-latn')}</p>
      </div>
    </div>
  );
};

export default PrintableReceipt;
