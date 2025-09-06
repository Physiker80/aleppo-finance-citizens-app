import React, { useContext, useState } from 'react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import Button from '../components/ui/Button';
import { AppContext } from '../App';
import { ContactMessageType } from '../types';

const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ContactMessageType>('طلب');
  const [department, setDepartment] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const app = useContext(AppContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  if (!name || !message || !type) return;
    setIsLoading(true);
    // Simulate send
    setTimeout(() => {
      const id = app?.addContactMessage ? app.addContactMessage({
        name,
        email,
        subject,
        message,
        type,
        department: department || undefined,
      }) : null;
      setIsLoading(false);
      setSent(true);
    }, 500);
  };

  if (sent) {
    return (
      <Card>
        <h2 className="text-2xl font-bold mb-2">تم إرسال رسالتك</h2>
        <p className="text-gray-600 dark:text-gray-400">شكرًا لتواصلك معنا. سنقوم بالرد في أقرب وقت ممكن.</p>
        <Button className="mt-4" onClick={() => setSent(false)}>إرسال رسالة جديدة</Button>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-1">تواصل معنا</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">أرسل لنا رسالة وسنعاود الاتصال بك.</p>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-1">
          <Select id="type" label="نوع الرسالة" value={type} onChange={(e) => setType(e.target.value as ContactMessageType)} required>
            <option value="طلب">طلب</option>
            <option value="شكوى">شكوى</option>
            <option value="اقتراح">اقتراح</option>
          </Select>
        </div>
        <div className="md:col-span-1">
          <Select id="department" label="القسم المستهدف (اختياري)" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">بدون تحديد</option>
            <option value="الإدارة">الإدارة</option>
            <option value="المالية">المالية</option>
            <option value="الموارد البشرية">الموارد البشرية</option>
            <option value="الخدمة الذاتية">الخدمة الذاتية</option>
            <option value="خدمة المواطنين">خدمة المواطنين</option>
          </Select>
        </div>
        <div className="md:col-span-1">
          <Input id="name" label="الاسم" placeholder="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="md:col-span-1">
          <Input id="email" label="البريد الإلكتروني" type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Input id="subject" label="الموضوع" placeholder="عنوان الرسالة" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <TextArea id="message" label="نص الرسالة" placeholder="اكتب رسالتك هنا" value={message} onChange={(e) => setMessage(e.target.value)} required />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" isLoading={isLoading}>إرسال</Button>
        </div>
      </form>
    </Card>
  );
};

export default ContactPage;