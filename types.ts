
export enum RequestType {
  Inquiry = 'استعلام',
  Complaint = 'شكوى',
}

// Department names now come dynamically from the Administrative Structure (localStorage departmentsList)
// Use plain string to avoid drift with enum values.
export type Department = string;

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
  department: Department; // dynamic string
  details: string;
  attachments?: File[];
  status: RequestStatus;
  submissionDate: Date;
  // Lifecycle timestamps for statistics (all optional)
  startedAt?: Date;    // when moved to InProgress
  answeredAt?: Date;   // when moved to Answered
  closedAt?: Date;     // when moved to Closed
  // Optional reply/answer content shown to the citizen
  response?: string;
  // Attachments associated with the response (admin-side, session-only)
  responseAttachments?: File[];
  // Optional internal opinion/notes by the employee (admin)
  opinion?: string;
  // Additional departments the ticket was forwarded to
  forwardedTo?: Department[];
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

export enum ContactMessageStatus {
  New = 'جديد',
  InProgress = 'قيد المعالجة',
  Closed = 'مغلق',
}

export type ContactMessageType = 'طلب' | 'شكوى' | 'اقتراح';

export interface ContactMessage {
  id: string;
  name: string;
  email?: string;
  subject?: string;
  message: string;
  type: ContactMessageType;
  department?: string;
  status: ContactMessageStatus;
  submissionDate: Date;
}

// In-app notifications for departments (new ticket, transfer, forwarding)
export type NotificationKind = 'ticket-new' | 'ticket-forwarded' | 'ticket-moved';

export interface DepartmentNotification {
  id: string; // unique
  kind: NotificationKind;
  ticketId: string;
  department: Department; // recipient department
  message?: string;
  createdAt: Date;
  read?: boolean;
}