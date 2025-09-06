
export enum RequestType {
  Inquiry = 'استعلام',
  Complaint = 'شكوى',
}

export enum Department {
  Income = 'قسم الدخل',
  Companies = 'قسم الشركات',
  RealEstate = 'قسم العقارات',
  Stamps = 'قسم الطوابع',
  General = 'قسم عام',
}

export enum RequestStatus {
  New = 'جديد',
  InProgress = 'قيد المعالجة',
  Answered = 'تم الرد',
  Closed = 'مغلق',
}

export interface Ticket {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  nationalId: string;
  requestType: RequestType;
  department: Department;
  details: string;
  attachments?: File[];
  status: RequestStatus;
  submissionDate: Date;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface NewsItem {
  title: string;
  date: string;
  content: string;
}

export interface Employee {
  username: string;
  password: string;
  name: string;
  department: string;
  role: string;
  lastLogin?: string;
}