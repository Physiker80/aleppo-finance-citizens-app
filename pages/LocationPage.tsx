import React, { useContext, useState } from 'react';
import Card from '../components/ui/Card';
import { LocationMap } from '../components/IntegrationComponents';
import { AppContext } from '../App';
// @ts-ignore
import { FaPhone, FaClock, FaMapMarkerAlt, FaEnvelope, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const LocationPage: React.FC = () => {
  const context = useContext(AppContext);
  const config = context?.siteConfig;
  const isAdmin = !!(context?.isEmployeeLoggedIn && context?.currentEmployee?.role === 'مدير');

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    directorateName: config?.directorateName || '',
    address: config?.address || '',
    phone: config?.phone || '',
    workingHours: config?.workingHours || '',
    whatsapp: config?.whatsapp || '',
    lat: config?.location?.lat || 36.208306,
    lng: config?.location?.lng || 37.140639
  });

  // Default Info (used when not editing and no config)
  const info = {
    directorateName: config?.directorateName || 'مديرية مالية محافظة حلب',
    address: config?.address || 'حلب - الجميلية - شارع خير الدين الأسدي (مقابل جسر المالية)',
    phone: config?.phone || '021-2123456',
    workingHours: config?.workingHours || 'الأحد - الخميس: 8:00 صباحاً - 3:00 عصراً',
    email: 'info@finance.gov.sy', // This is not in SiteConfig currently, keeping hardcoded or need to add to type
    whatsapp: config?.whatsapp || ''
  };

  const handleSave = () => {
    if (context?.updateSiteConfig) {
      context.updateSiteConfig({
        ...config!, // preserve other existing config
        directorateName: editForm.directorateName,
        address: editForm.address,
        phone: editForm.phone,
        workingHours: editForm.workingHours,
        whatsapp: editForm.whatsapp,
        location: {
          lat: parseFloat(editForm.lat.toString()),
          lng: parseFloat(editForm.lng.toString())
        },
        governorate: config?.governorate || 'حلب' // Ensure required fields
      });
      context.addToast?.({ message: 'تم حفظ إعدادات الموقع بنجاح', type: 'success' });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form
    setEditForm({
      directorateName: config?.directorateName || '',
      address: config?.address || '',
      phone: config?.phone || '',
      workingHours: config?.workingHours || '',
      whatsapp: config?.whatsapp || '',
      lat: config?.location?.lat || 36.208306,
      lng: config?.location?.lng || 37.140639
    });
  };

  return (
    <div className="min-h-screen py-10 bg-gray-50 dark:bg-gray-900 transition-colors duration-200"
         style={{
           backgroundImage: 'url("https://syrian.zone/syid/materials/bg.svg")',
           backgroundSize: 'cover',
           backgroundAttachment: 'fixed'
         }}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-10 relative">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">
              أين تجدنا
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              معلومات التواصل وموقع المديرية
            </p>
            {isAdmin && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute top-0 right-0 md:right-1/4 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110"
                title="تعديل المعلومات"
              >
                <FaEdit />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Contact Info Card */}
            <Card className="md:col-span-1 h-full shadow-xl dark:bg-gray-800/90 backdrop-blur-sm relative">
               {isEditing ? (
                 <div className="space-y-4">
                    <h3 className="font-bold text-lg mb-4 text-center">تعديل البيانات</h3>
                    
                    <Input 
                      label="اسم المديرية"
                      value={editForm.directorateName}
                      onChange={e => setEditForm({...editForm, directorateName: e.target.value})}
                    />
                    <Input 
                      label="العنوان"
                      value={editForm.address}
                      onChange={e => setEditForm({...editForm, address: e.target.value})}
                    />
                    <Input 
                      label="الهاتف"
                      value={editForm.phone}
                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                      dir="ltr"
                    />
                    <Input 
                      label="أوقات الدوام"
                      value={editForm.workingHours}
                      onChange={e => setEditForm({...editForm, workingHours: e.target.value})}
                    />
                     <Input 
                      label="واتساب"
                      value={editForm.whatsapp}
                      onChange={e => setEditForm({...editForm, whatsapp: e.target.value})}
                      dir="ltr"
                    />

                    <div className="border-t pt-4 mt-4">
                       <label className="block text-sm font-medium mb-2">إحداثيات الخريطة</label>
                       <div className="grid grid-cols-2 gap-2">
                         <Input 
                            label="خط العرض (Lat)"
                            type="number"
                            value={editForm.lat}
                            onChange={e => setEditForm({...editForm, lat: parseFloat(e.target.value)})}
                            dir="ltr"
                          />
                          <Input 
                            label="خط الطول (Lng)"
                            type="number"
                            value={editForm.lng}
                            onChange={e => setEditForm({...editForm, lng: parseFloat(e.target.value)})}
                            dir="ltr"
                          />
                       </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700" variant="primary">
                        <FaSave className="ml-2" /> حفظ
                      </Button>
                      <Button onClick={handleCancel} className="flex-1 bg-gray-500 hover:bg-gray-600" variant="secondary">
                        <FaTimes className="ml-2" /> إلغاء
                      </Button>
                    </div>
                 </div>
               ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b pb-2 border-green-500 inline-block">
                      معلومات التواصل
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-600 dark:text-green-400">
                          <FaMapMarkerAlt size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200">العنوان</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {info.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                          <FaPhone size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200">الهاتف</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400" dir="ltr">
                            {info.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                          <FaClock size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200">أوقات الدوام</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {info.workingHours}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400">
                          <FaEnvelope size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200">البريد الإلكتروني</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {info.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="font-bold text-gray-800 dark:text-white mb-2">ملاحظة هامة</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      يرجى اصطحاب الهوية الشخصية عند مراجعة المديرية. يفضل حجز موعد مسبق عبر الموقع لتجنب الانتظار.
                    </p>
                  </div>
                </div>
               )}
            </Card>

            {/* Map Card */}
            <div className="md:col-span-2 h-full flex flex-col">
              <Card className="flex-1 shadow-xl p-0 overflow-hidden dark:bg-gray-800/90 backdrop-blur-sm">
                 {/* Force remount map when config changes using key */}
                 <LocationMap 
                    key={`${config?.location?.lat}-${config?.location?.lng}`}
                    className="h-full w-full min-h-[400px]" 
                    showDirections={true} 
                  />
              </Card>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPage;
