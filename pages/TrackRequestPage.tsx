import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Ticket, RequestStatus } from '../types';

const StatusStep: React.FC<{
  status: RequestStatus;
  isActive: boolean;
  isCompleted: boolean;
}> = ({ status, isActive, isCompleted }) => {
  const baseCircleClasses = "w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300";
  const activeCircleClasses = "bg-blue-600 text-white";
  const completedCircleClasses = "bg-green-500 text-white";
  const inactiveCircleClasses = "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400";

  let circleClass = inactiveCircleClasses;
  if(isActive) circleClass = activeCircleClasses;
  if(isCompleted) circleClass = completedCircleClasses;

  return (
    <div className="flex-1 flex flex-col items-center">
        <div className={circleClass}>
            {isCompleted ? '✓' : '•'}
        </div>
        <p className={`mt-2 text-sm text-center ${isActive || isCompleted ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{status}</p>
    </div>
  );
};

const TrackRequestPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const [trackingId, setTrackingId] = useState('');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for QR code scan parameter on component mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const idFromQR = urlParams.get('id');
    if (idFromQR) {
      setTrackingId(idFromQR);
      // Auto-search when coming from QR code
      setTimeout(() => {
        const foundTicket = appContext?.findTicket(idFromQR);
        if (foundTicket) {
          setTicket(foundTicket);
        } else {
          setError('رقم التتبع غير صحيح أو لم يتم العثور على الطلب.');
        }
      }, 500);
    }
  }, [appContext]);
  
  const handleSearch = () => {
    if (!trackingId) {
      setError('يرجى إدخال رقم التتبع.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setTicket(null);
    
    setTimeout(() => {
        const foundTicket = appContext?.findTicket(trackingId);
        if (foundTicket) {
            setTicket(foundTicket);
        } else {
            setError('رقم التتبع غير صحيح أو لم يتم العثور على الطلب.');
        }
        setIsLoading(false);
    }, 1000);
  };

  const handleDownloadPdf = (ticket: Ticket) => {
    const pdfContent = `
      <html>
        <head>
          <title>تفاصيل الطلب: ${ticket.id}</title>
          <style>
            body { 
              font-family: 'Cairo', sans-serif; 
              direction: rtl;
              margin: 20px;
            }
            h1 { 
              color: #2563EB; 
              border-bottom: 2px solid #2563EB;
              padding-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: right;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .details {
                white-space: pre-wrap;
                word-wrap: break-word;
            }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body>
          <h1>تفاصيل الطلب</h1>
          <table>
            <tr><th>رقم التتبع</th><td>${ticket.id}</td></tr>
            <tr><th>الاسم الكامل</th><td>${ticket.fullName}</td></tr>
            <tr><th>البريد الإلكتروني</th><td>${ticket.email || 'غير متوفر'}</td></tr>
            <tr><th>رقم الهاتف</th><td>${ticket.phone}</td></tr>
            <tr><th>الرقم الوطني</th><td>${ticket.nationalId}</td></tr>
            <tr><th>نوع الطلب</th><td>${ticket.requestType}</td></tr>
            <tr><th>القسم المعني</th><td>${ticket.department}</td></tr>
            <tr><th>تاريخ التقديم</th><td>${ticket.submissionDate.toLocaleDateString('ar-SY')}</td></tr>
            <tr><th>الحالة الحالية</th><td>${ticket.status}</td></tr>
            <tr><th>تفاصيل الطلب</th><td class="details">${ticket.details}</td></tr>
          </table>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    }
  };
  
  const statusOrder = [RequestStatus.New, RequestStatus.InProgress, RequestStatus.Answered, RequestStatus.Closed];

  return (
    <Card>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">متابعة حالة طلب</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">أدخل رقم التتبع الخاص بطلبك للاستعلام عن حالته.</p>
      
      <div className="flex flex-col sm:flex-row items-start space-y-2 sm:space-y-0 sm:space-x-2 rtl:space-x-reverse">
        <div className="flex-grow w-full">
          <Input 
            id="trackingId" 
            label="" 
            placeholder="مثال: ALF-20240815-ABC123" 
            value={trackingId} 
            onChange={(e) => setTrackingId(e.target.value)}
          />
        </div>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button onClick={handleSearch} isLoading={isLoading} className="self-end">
              {isLoading ? 'جاري البحث...' : 'بحث'}
          </Button>
          <Button 
            onClick={() => alert('ميزة مسح الكود QR ستكون متاحة قريباً')} 
            variant="secondary" 
            className="self-end"
            title="مسح كود QR"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h5v5H4V4zm11 14h5v5h-5v-5zM4 15h5v5H4v-5z" />
            </svg>
          </Button>
        </div>
      </div>

      {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
      
      {ticket && (
        <div className="mt-8 border-t dark:border-gray-700 pt-6">
          <h3 className="text-xl font-bold mb-4 dark:text-gray-200">تفاصيل الطلب: <span className="font-mono text-blue-600 dark:text-blue-400">{ticket.id}</span></h3>
          
          <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">الاسم:</strong> {ticket.fullName}</div>
              {ticket.email && <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">البريد الإلكتروني:</strong> {ticket.email}</div>}
              <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">تاريخ التقديم:</strong> {ticket.submissionDate.toLocaleDateString('ar-SY')}</div>
              <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">نوع الطلب:</strong> {ticket.requestType}</div>
              <div className="dark:text-gray-300"><strong className="block text-gray-500 dark:text-gray-400">القسم:</strong> {ticket.department}</div>
          </div>
          
          <h4 className="text-lg font-bold mb-6 dark:text-gray-200">حالة الطلب الحالية:</h4>
          
          <div className="flex items-start">
            {statusOrder.map((status, index) => {
                const currentStatusIndex = statusOrder.indexOf(ticket.status);
                return (
                    <React.Fragment key={status}>
                        <StatusStep 
                            status={status}
                            isActive={currentStatusIndex === index}
                            isCompleted={currentStatusIndex > index}
                        />
                        {index < statusOrder.length -1 && (
                            <div className={`flex-1 h-1 mt-4 ${currentStatusIndex > index ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
          </div>
          
          <div className="mt-8 pt-6 border-t border-dashed dark:border-gray-700 text-center">
            <Button 
                onClick={() => handleDownloadPdf(ticket)}
                variant="secondary"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                تحميل كملف PDF
            </Button>
          </div>

        </div>
      )}
    </Card>
  );
};

export default TrackRequestPage;