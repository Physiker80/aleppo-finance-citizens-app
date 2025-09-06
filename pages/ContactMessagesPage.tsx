import React, { useContext } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import { ContactMessageStatus } from '../types';

const contactStatusColors: { [key in ContactMessageStatus]: string } = {
  [ContactMessageStatus.New]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  [ContactMessageStatus.InProgress]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  [ContactMessageStatus.Closed]: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
};

const ContactStatusBadge: React.FC<{ status: ContactMessageStatus }> = ({ status }) => (
  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${contactStatusColors[status]}`}>
    {status}
  </span>
);

const ContactMessagesPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const contactMessages = appContext?.contactMessages || [];
  const updateStatus = appContext?.updateContactMessageStatus;

  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">رسائل التواصل</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">استعراض الرسائل الواردة عبر نموذج التواصل وإدارة حالتها.</p>
        </div>
        <button
          className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
          onClick={() => { window.location.hash = '#/dashboard'; }}
        >
          العودة للوحة التحكم
        </button>
      </div>

      {contactMessages.length === 0 ? (
        <div className="text-center py-16 text-gray-600 dark:text-gray-300">لا توجد رسائل تواصل</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الرقم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">التاريخ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الاسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">البريد</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">النوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">القسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الرسالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {contactMessages.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">{m.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{m.submissionDate.toLocaleDateString('ar-SY')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{m.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{m.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{m.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{m.department || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm"><ContactStatusBadge status={m.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-[40ch] truncate" title={m.message}>{m.message}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={m.status}
                      onChange={(e) => updateStatus && updateStatus(m.id, e.target.value as ContactMessageStatus)}
                      className="w-auto p-1.5 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    >
                      {Object.values(ContactMessageStatus).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default ContactMessagesPage;
