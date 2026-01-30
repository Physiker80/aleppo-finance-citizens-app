# GitHub Copilot Instructions

## Project Overview
This is the **Aleppo Directorate of Finance - Complaints and Inquiries System** (`مديرية مالية حلب - نظام الاستعلامات والشكاوى`), a React-based government portal for Syrian citizens to submit and track financial inquiries and complaints.

## Architecture & Key Patterns

### State Management
- **No external state library**: Uses React Context (`AppContext`) for global state in `App.tsx`
- **LocalStorage-first persistence**: All data (tickets, employees, notifications, departments) persists to localStorage with JSON serialization
- **Context pattern**: `AppContext` provides tickets, employees, contactMessages, and business logic functions
- **Hook pattern**: Custom hooks like `useDepartmentNames()` in `utils/departments.ts` for localStorage synchronization

### Data Flow
- **Ticket lifecycle**: New → InProgress → Answered → Closed (see `RequestStatus` enum in `types.ts`)
- **Employee permissions**: Admin role vs department-specific access using `canAccessTicket()` logic in App.tsx
- **Department forwarding**: Tickets can be forwarded to multiple departments via `forwardedTo` array
- **Notifications**: Auto-generated for ticket events (new, forwarded, moved) stored in localStorage

### File Organization
```
components/           # Reusable UI components
  ui/                # Generic form controls (Button, Input, Card, etc.)
pages/               # Route-based page components  
  hrms/              # Human Resources subsystem
utils/               # Business logic utilities
types.ts             # TypeScript definitions and enums
```

### RTL & Internationalization
- **Arabic-first UI**: All text is in Arabic, RTL layout with Tailwind `rtl:` classes
- **Date formatting**: Uses `toLocaleString('ar-SY-u-nu-latn')` for Arabic dates with Latin numerals
- **Typography**: Custom Arabic fonts loaded via index.css

## Development Workflows

### Build & Dev Commands
```bash
npm run dev          # Start Vite dev server (port 3000)
npm run build        # Build for production  
npm run preview      # Preview production build
```

### Mobile Development
- **Capacitor integration**: Android app via `@capacitor/android` 
- **Config**: `capacitor.config.ts` defines app metadata and plugins
- **Build process**: `npm run build` → Capacitor sync for mobile

### Key Dependencies
- **React 19**: Latest React with concurrent features
- **Vite 6**: Build tool and dev server
- **PDF generation**: `jspdf`, `react-pdf`, `svg2pdf.js` for document exports  
- **QR codes**: `@zxing/browser`, `jsqr` for ticket tracking
- **OCR**: `tesseract.js` for document text extraction
- **Charts**: `mermaid` for organizational diagrams

## Critical Code Patterns

### LocalStorage Keys & Structure
```typescript
// Core data stores
'tickets'            // Ticket[] - serialized without File objects
'employees'          // Employee[] - login credentials  
'contactMessages'    // ContactMessage[] - contact form submissions
'notifications'      // DepartmentNotification[] - in-app alerts
'departmentsList'    // {name: string}[] - dynamic org structure

// Feature-specific stores  
'diwanDocs'         // Document management for Diwan pages
'customTemplates'   // User-defined message templates
'tracked_ids'       // Recently viewed ticket IDs
```

### Employee Authentication
```typescript
// Default employees initialized in App.tsx useEffect
const defaultEmployees = [
  { username: 'admin', password: 'admin123', role: 'مدير' },
  { username: 'finance1', password: 'finance123', role: 'موظف' }
];
```

### Permission Patterns
```typescript
// Admin vs department-based access
const isAdmin = currentEmployee?.role === 'مدير';
const canAccessTicket = (ticket) => {
  if (isAdmin) return true;
  const employeeDept = currentEmployee?.department;
  return ticket.department === employeeDept || 
         ticket.forwardedTo?.includes(employeeDept);
};
```

### ID Generation System
- **Ticket IDs**: Generated via `utils/idGenerator.ts` with configurable patterns
- **Manual ID override**: Supports localStorage `manualTicketId` for custom IDs
- **Sequential numbering**: Daily sequence counters stored in localStorage

## Component Conventions

### Page Components
- **Hash-based routing**: Manual routing via `window.location.hash` in App.tsx
- **Authentication gates**: Employee pages redirect to login if not authenticated  
- **Context consumption**: All pages use `useContext(AppContext)` for state access

### UI Components
- **Tailwind-first**: Utility-first CSS with dark mode support via `dark:` classes
- **Component composition**: Base components in `components/ui/` extended by pages
- **File handling**: Components handle File objects but strip them before localStorage persistence

### Form Patterns
```typescript
// Standard form submission pattern
const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  const formData = new FormData(e.target as HTMLFormElement);
  const data = Object.fromEntries(formData.entries());
  // Process and store via AppContext functions
};
```

## Testing & Debugging

### Data Inspection
- **localStorage viewer**: Use browser DevTools Application tab to inspect stored data
- **Context debugging**: AppContext provides direct access to all application state
- **Console helpers**: Import `utils/testMessagesHelper.ts` for generating test data

### Common Issues
- **File persistence**: Files don't survive localStorage - expect session-only file handling
- **Date serialization**: Dates auto-convert to strings in localStorage, recreated in App.tsx
- **Permission debugging**: Check `canAccessTicket()` logic for access control issues

## Theme & Styling

### Color Scheme
- **Primary**: `#0f3c35` (dark teal) for Syrian government branding
- **Dark mode**: Full dark mode support via Tailwind `dark:` variants
- **Background**: Government pattern SVG overlay from `syrian.zone`

### Typography
- **Arabic fonts**: Custom font loading in `index.css`  
- **Icon system**: `react-icons` for consistent iconography
- **Responsive**: Mobile-first design with `md:` breakpoints

## External Integrations

### Syrian Government Systems
- **Logo/branding**: Official Syrian Republic assets from `syrian.zone`
- **Document standards**: Government-compliant PDF generation and forms
- **Regulatory compliance**: Designed for official government use

## Advanced Patterns & Workflows

### Authentication Deep Dive

#### Employee Login Flow
```typescript
// Two authentication paths: LoginModal (header) and LoginPage (standalone)
const employeeLogin = (username: string, password: string): boolean => {
  const employees = JSON.parse(localStorage.getItem('employees') || '[]');
  const employee = employees.find(emp => 
    emp.username === username && emp.password === password
  );
  if (employee) {
    setCurrentEmployee(employee);
    localStorage.setItem('currentUser', JSON.stringify(employee));
    return true;
  }
  return false;
};
```

#### Permission System Architecture
- **Role-based access**: `مدير` (admin) vs `موظف` (employee)  
- **Department-based filtering**: Employees only see tickets for their department
- **Forwarding permissions**: Tickets can be forwarded across departments
- **Access control pattern**:
```typescript
const canAccessTicket = (ticket: Ticket): boolean => {
  if (currentEmployee?.role === 'مدير') return true;
  const dept = currentEmployee?.department;
  return ticket.department === dept || ticket.forwardedTo?.includes(dept);
};
```

#### Session Management
- **Persistent sessions**: Employee login persists in localStorage as `currentUser`
- **Auto-redirect**: Unauthenticated users redirected from protected routes
- **Logout cleanup**: Removes session and redirects from dashboard

### Component Architecture Deep Dive

#### UI Component Hierarchy
```
components/ui/          # Base design system components
├── Button.tsx          # Variant system: primary/secondary + loading states
├── Card.tsx            # Glassmorphism with backdrop-blur
├── Input.tsx           # Forwardable with endAdornment support
├── Select.tsx          # Consistent styling with dark mode
└── TextArea.tsx        # Auto-resize capability
```

#### Component Patterns
- **Forwarded refs**: Input components use `React.forwardRef` for form libraries
- **Variant systems**: Button uses `variant` prop for consistent theming
- **Composition over inheritance**: Card wraps content, doesn't enforce layout
- **RTL support**: Components use `rtl:` classes for Arabic layouts

#### Page Component Structure
```typescript
// Standard page component pattern
const SomePage: React.FC = () => {
  const appContext = useContext(AppContext);
  const [localState, setLocalState] = useState();
  
  // Early return for auth check
  if (!appContext?.isEmployeeLoggedIn) return <LoginPage />;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>{/* Content */}</Card>
    </div>
  );
};
```

### Development Workflows

#### Debugging Strategies
- **localStorage inspection**: Use DevTools Application tab to examine all keys
- **Context debugging**: AppContext provides direct state access in console
- **Test data generation**: Import `utils/testMessagesHelper.ts` for sample data
```typescript
// Console debugging helpers
console.log('Tickets:', JSON.parse(localStorage.getItem('tickets') || '[]'));
console.log('Current user:', JSON.parse(localStorage.getItem('currentUser') || 'null'));
```

#### Error Handling Patterns
- **try/catch localStorage**: All localStorage operations wrapped in try/catch
- **Graceful degradation**: Fallback values when localStorage fails
- **User feedback**: Error states displayed via state variables, not just console

#### Testing Approaches
- **Manual testing**: Use default credentials (admin/admin123, finance1/finance123)
- **Data isolation**: Each feature uses separate localStorage keys
- **Permission testing**: Switch between admin and employee accounts
- **Mobile testing**: Use Capacitor for Android testing

### Data Flow Patterns

#### Ticket Lifecycle Management
```typescript
// 1. Creation - generates ID, sets status to 'New', creates notification
const addTicket = (data) => {
  const newTicket = { id: generateTicketId(), status: RequestStatus.New, ...data };
  setTickets(prev => [...prev, newTicket]);
  // Auto-notification to target department
  addNotification({
    kind: 'ticket-new',
    department: data.department,
    ticketId: newTicket.id
  });
};

// 2. Updates - immutable updates with permission checks
const updateTicketStatus = (id, status, response?) => {
  setTickets(prev => prev.map(ticket => {
    if (ticket.id !== id || !canEditTicket(ticket)) return ticket;
    const updates = { status };
    if (status === RequestStatus.InProgress) updates.startedAt = new Date();
    if (status === RequestStatus.Answered) updates.answeredAt = new Date();
    return { ...ticket, ...updates };
  }));
};
```

#### Notification System Flow
- **Auto-generation**: Notifications created on ticket events (new, moved, forwarded)
- **Department targeting**: Each notification targets specific department
- **Read/unread tracking**: Notifications track read status per department
- **Real-time updates**: Header shows unread count with badge

#### Context Update Propagation
```typescript
// State updates trigger localStorage persistence via useEffect
useEffect(() => {
  const serializable = tickets.map(({responseAttachments, ...rest}) => rest);
  localStorage.setItem('tickets', JSON.stringify(serializable));
}, [tickets]);
```

### Integration Patterns

#### PDF Generation (jsPDF)
```typescript
// Dynamic import pattern for code splitting
const generatePDF = async () => {
  const { jsPDF } = await import('jspdf');
  await import('svg2pdf.js'); // Augments jsPDF prototype
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt' });
  // @ts-ignore - svg2pdf adds .svg() method to jsPDF
  await pdf.svg(svgElement);
};
```

#### QR Code Detection (@zxing/browser + jsqr)
```typescript
// Multi-library approach for better accuracy
const detectQR = async (imageFile: File) => {
  // Try @zxing first (more formats)
  try {
    const reader = new BrowserMultiFormatReader();
    const result = await reader.decodeFromImageUrl(imageUrl);
    return result.getText();
  } catch {
    // Fallback to jsQR for QR codes specifically
    const qrResult = jsQR(imageData.data, width, height);
    return qrResult?.data;
  }
};
```

#### OCR Integration (Tesseract.js)
```typescript
// Arabic + English OCR with custom PSM modes
const extractText = async (canvas: HTMLCanvasElement) => {
  const result = await Tesseract.recognize(canvas, 'ara+eng', {
    psm: 8, // Single uniform block of text
    preserve_interword_spaces: '1'
  });
  return result.data.text;
};
```

#### PDF Viewing (react-pdf)
```typescript
// Lazy loading with error boundaries
const [numPages, setNumPages] = useState<number>();
const [pageNumber, setPageNumber] = useState(1);

return (
  <Document file={pdfFile} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
    <Page pageNumber={pageNumber} />
  </Document>
);
```

#### Organizational Charts (Mermaid)
```typescript
// Component wrapper for Mermaid diagrams
const MermaidChart: React.FC<{chart: string}> = ({chart}) => {
  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
    mermaid.contentLoaded();
  }, [chart]);
  
  return <div className="mermaid">{chart}</div>;
};
```

## Critical Development Guidelines

When working with this codebase:

1. **Always check AppContext** for available state and methods before creating new ones
2. **Use localStorage patterns** established in existing code for data persistence  
3. **Follow RTL conventions** with proper Arabic text handling and Tailwind RTL classes
4. **Test with employee permissions** - both admin and department-level access scenarios
5. **Handle File objects carefully** - they don't persist to localStorage, plan accordingly
6. **Import external libraries dynamically** - Use dynamic imports for large dependencies (jsPDF, Tesseract)
7. **Check permission patterns** - Use `canAccessTicket()` and `canEditTicket()` for access control
8. **Follow notification patterns** - Auto-generate notifications for ticket state changes
9. **Use error boundaries** - Wrap potentially failing operations (OCR, QR detection) in try/catch
10. **Test mobile compatibility** - Verify touch interactions and responsive layouts