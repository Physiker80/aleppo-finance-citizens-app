import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import FileInput from '../components/ui/FileInput';
import Button from '../components/ui/Button';
import { DEPARTMENTS, REQUEST_TYPES } from '../constants';
import { Department, RequestType } from '../types';

const SubmitRequestPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    nationalId: '',
    requestType: REQUEST_TYPES[0],
    department: DEPARTMENTS[0],
    details: '',
  });
  const [attachment, setAttachment] = useState<File>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.nationalId || !formData.details || !formData.email) {
        setError('يرجى ملء جميع الحقول الإلزامية.');
        return;
    }
    setError(null);
    setIsSubmitting(true);
    
    setTimeout(() => {
        const newTicketId = appContext?.addTicket({
            ...formData,
            requestType: formData.requestType as RequestType,
            department: formData.department as Department,
            attachment,
            submissionDate: new Date(),
        });
        
        setIsSubmitting(false);
        if(newTicketId) {
            window.location.hash = '#/confirmation';
        }
    }, 1500);
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">تقديم طلب جديد</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">يرجى ملء البيانات التالية بدقة. الحقول التي تحمل علامة * إلزامية.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
            <Input id="fullName" label="الاسم الكامل *" value={formData.fullName} onChange={handleChange} required />
            <Input id="nationalId" label="الرقم الوطني *" value={formData.nationalId} onChange={handleChange} required />
        </div>
         <div className="grid md:grid-cols-2 gap-6">
            <Input id="phone" label="رقم الهاتف *" type="tel" value={formData.phone} onChange={handleChange} required />
            <Input id="email" label="البريد الإلكتروني *" type="email" value={formData.email} onChange={handleChange} required />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
            <Select id="requestType" label="نوع الطلب *" value={formData.requestType} onChange={handleChange}>
                {REQUEST_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </Select>
            <Select id="department" label="القسم المعني *" value={formData.department} onChange={handleChange}>
                {DEPARTMENTS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
            </Select>
        </div>
        
        <TextArea id="details" label="تفاصيل الطلب *" value={formData.details} onChange={handleChange} required />
        
        <FileInput id="attachment" label="إرفاق ملفات (اختياري)" onFileChange={setAttachment} accept=".pdf,.png,.jpg,.jpeg,.docx" />
        
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="text-left">
            <Button type="submit" isLoading={isSubmitting}>
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </Button>
        </div>
      </form>
    </Card>
  );
};

export default SubmitRequestPage;