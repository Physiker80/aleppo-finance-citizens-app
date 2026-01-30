import React, { useState, useContext, useEffect } from 'react';
import { FaFacebook, FaInstagram, FaTelegram, FaXTwitter, FaTwitter, FaYoutube, FaLinkedin, FaWhatsapp } from 'react-icons/fa6';
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { MdOutlineEmail } from 'react-icons/md';
import { formatNumber } from '../utils/arabicNumerals';
import { AppContext } from '../App';

// Interface for footer content
interface FooterLink {
  id: string;
  text: string;
  href: string;
}

interface FooterSection {
  id: string;
  title: string;
  links: FooterLink[];
}

interface SocialMediaItem {
  id: string;
  name: string;
  url: string;
  icon: string; // Icon identifier
}

interface FooterContent {
  ministry: {
    name: string;
    nameEn: string;
    description: string;
  };
  sections: FooterSection[];
  socialMedia: SocialMediaItem[];
  copyright: string;
}

const Footer: React.FC = () => {
  const appContext = useContext(AppContext);
  const [isEditing, setIsEditing] = useState(false);

  // Drag and drop states
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [draggedLink, setDraggedLink] = useState<{ sectionId: string, linkId: string } | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dragOverLink, setDragOverLink] = useState<{ sectionId: string, linkId: string } | null>(null);

  // Default footer content
  const defaultContent: FooterContent = {
    ministry: {
      name: "وزارة المالية",
      nameEn: "MINISTRY OF FINANCE",
      description: "تسعى وزارة المالية في الجمهورية العربية السورية إلى إدارة المال العام بكفاءة وشفافية، وتحديث الأنظمة المالية والضريبية، ودعم التحول الرقمي للخدمات الحكومية بما يضمن تبسيط الإجراءات ورفع جودة الخدمة المقدّمة للمواطنين، وتحقيق الانضباط المالي والاستدامة في الإنفاق العام."
    },
    sections: [
      {
        id: "important-links",
        title: "روابط مهمة",
        links: [
          { id: "about-system", text: "عن نظام الاستعلامات والشكاوى", href: "#/about" },
          { id: "news", text: "الأخبار", href: "#/news" },
          { id: "faq", text: "الأسئلة الشائعة", href: "#/faq" },
          { id: "departments", text: "الهيكل الإداري", href: "#/departments" },
          { id: "privacy", text: "سياسة الخصوصية", href: "#/privacy" },
          { id: "terms", text: "الشروط والأحكام", href: "#/terms" }
        ]
      },
      {
        id: "citizen-services",
        title: "خدمات المواطنين",
        links: [
          { id: "services", text: "الخدمات", href: "#/services" },
          { id: "contact", text: "تواصل معنا", href: "#/contact" },
          { id: "uploads-demo", text: "تجربة الرفع/التحميل", href: "#/uploads-demo" }
        ]
      }
    ],
    socialMedia: [
      { id: "email", name: "البريد الإلكتروني", url: "mailto:info@syrian-finance.gov.sy", icon: "email" },
      { id: "facebook", name: "فيسبوك", url: "https://www.facebook.com", icon: "facebook" },
      { id: "instagram", name: "إنستغرام", url: "https://www.instagram.com", icon: "instagram" },
      { id: "telegram", name: "تلغرام", url: "https://t.me", icon: "telegram" },
      { id: "x", name: "إكس (تويتر سابقاً)", url: "https://x.com", icon: "x" }
    ],
    copyright: "وزارة المالية - الجمهورية العربية السورية | جميع الحقوق محفوظة"
  };

  const [editableContent, setEditableContent] = useState<FooterContent>(defaultContent);

  // Load saved content from localStorage
  useEffect(() => {
    const savedContent = localStorage.getItem('footerContent');
    if (savedContent) {
      try {
        const parsed = JSON.parse(savedContent);
        setEditableContent({ ...defaultContent, ...parsed });
      } catch (e) {
        console.error('Error loading footer content:', e);
      }
    }
  }, []);

  // Monitor changes to editableContent
  useEffect(() => {
    console.log('Footer content updated:', editableContent.sections.map(s => s.title));
  }, [editableContent]);

  // Check if current user is admin AND logged in (prevents showing during initial mount before flag updates)
  const isAdmin = !!(appContext?.isEmployeeLoggedIn && appContext?.currentEmployee?.role === 'مدير');

  // If user is not admin anymore, force exit editing mode
  useEffect(() => {
    if (!isAdmin && isEditing) {
      setIsEditing(false);
    }
  }, [isAdmin, isEditing]);

  const handleSave = () => {
    localStorage.setItem('footerContent', JSON.stringify(editableContent));
    setIsEditing(false);
  };

  const handleCancel = () => {
    const savedContent = localStorage.getItem('footerContent');
    if (savedContent) {
      try {
        const parsed = JSON.parse(savedContent);
        setEditableContent({ ...defaultContent, ...parsed });
      } catch (e) {
        setEditableContent(defaultContent);
      }
    } else {
      setEditableContent(defaultContent);
    }
    setIsEditing(false);
  };

  // Helper functions for editing
  const addLink = (sectionId: string) => {
    const newLink: FooterLink = {
      id: `link-${Date.now()}`,
      text: "رابط جديد",
      href: "#/"
    };

    setEditableContent(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, links: [...section.links, newLink] }
          : section
      )
    }));
  };

  const removeLink = (sectionId: string, linkId: string) => {
    setEditableContent(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, links: section.links.filter(link => link.id !== linkId) }
          : section
      )
    }));
  };

  const updateLink = (sectionId: string, linkId: string, field: 'text' | 'href', value: string) => {
    setEditableContent(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            links: section.links.map(link =>
              link.id === linkId ? { ...link, [field]: value } : link
            )
          }
          : section
      )
    }));
  };

  const addSection = () => {
    const newSection: FooterSection = {
      id: `section-${Date.now()}`,
      title: "قسم جديد",
      links: []
    };

    setEditableContent(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const removeSection = (sectionId: string) => {
    setEditableContent(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setEditableContent(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, title } : section
      )
    }));
  };

  // Helper functions for social media management
  const addSocialMediaItem = () => {
    const newItem: SocialMediaItem = {
      id: `social-${Date.now()}`,
      name: "منصة جديدة",
      url: "https://",
      icon: "link"
    };

    setEditableContent(prev => ({
      ...prev,
      socialMedia: [...prev.socialMedia, newItem]
    }));
  };

  const removeSocialMediaItem = (itemId: string) => {
    setEditableContent(prev => ({
      ...prev,
      socialMedia: prev.socialMedia.filter(item => item.id !== itemId)
    }));
  };

  const updateSocialMediaItem = (itemId: string, field: 'name' | 'url' | 'icon', value: string) => {
    setEditableContent(prev => ({
      ...prev,
      socialMedia: prev.socialMedia.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  // Function to get icon component
  const getSocialIcon = (iconName: string) => {
    switch (iconName) {
      case 'email': return <MdOutlineEmail />;
      case 'facebook': return <FaFacebook />;
      case 'instagram': return <FaInstagram />;
      case 'telegram': return <FaTelegram />;
      case 'x': return <FaXTwitter />;
      case 'twitter': return <FaTwitter />;
      case 'youtube': return <FaYoutube />;
      case 'linkedin': return <FaLinkedin />;
      case 'whatsapp': return <FaWhatsapp />;
      default: return <MdOutlineEmail />;
    }
  };

  // Drag and Drop functions
  const handleSectionDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSection(sectionId);
  };

  const handleSectionDragLeave = () => {
    setDragOverSection(null);
  };

  const handleSectionDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();

    if (draggedSection && draggedSection !== targetSectionId) {
      console.log('Moving section:', draggedSection, 'to:', targetSectionId);

      setEditableContent(prev => {
        const sections = [...prev.sections];
        const draggedIndex = sections.findIndex(s => s.id === draggedSection);
        const targetIndex = sections.findIndex(s => s.id === targetSectionId);

        console.log('Dragged index:', draggedIndex, 'Target index:', targetIndex);
        console.log('Before move:', sections.map(s => s.title));

        if (draggedIndex !== -1 && targetIndex !== -1) {
          // Remove the dragged section from its original position
          const [draggedItem] = sections.splice(draggedIndex, 1);
          // Insert it at the target position
          sections.splice(targetIndex, 0, draggedItem);

          console.log('After move:', sections.map(s => s.title));
        }

        return {
          ...prev,
          sections
        };
      });
    }

    setDraggedSection(null);
    setDragOverSection(null);
  };

  const handleLinkDragStart = (e: React.DragEvent, sectionId: string, linkId: string) => {
    setDraggedLink({ sectionId, linkId });
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleLinkDragOver = (e: React.DragEvent, sectionId: string, linkId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLink({ sectionId, linkId });
    e.stopPropagation();
  };

  const handleLinkDragLeave = () => {
    setDragOverLink(null);
  };

  const handleLinkDrop = (e: React.DragEvent, targetSectionId: string, targetLinkId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedLink && (draggedLink.sectionId !== targetSectionId || draggedLink.linkId !== targetLinkId)) {
      console.log('Moving link:', draggedLink, 'to section:', targetSectionId, 'at link:', targetLinkId);

      setEditableContent(prev => {
        const sections = [...prev.sections];

        // Find source section and link
        const sourceSectionIndex = sections.findIndex(s => s.id === draggedLink.sectionId);
        const sourceSection = sections[sourceSectionIndex];
        const sourceLinkIndex = sourceSection.links.findIndex(l => l.id === draggedLink.linkId);
        const draggedLinkItem = sourceSection.links[sourceLinkIndex];

        console.log('Source section:', sourceSection.title, 'Source link index:', sourceLinkIndex);
        console.log('Before link move:', sourceSection.links.map(l => l.text));

        // Find target section and link
        const targetSectionIndex = sections.findIndex(s => s.id === targetSectionId);
        const targetSection = sections[targetSectionIndex];
        const targetLinkIndex = targetSection.links.findIndex(l => l.id === targetLinkId);

        console.log('Target section:', targetSection.title, 'Target link index:', targetLinkIndex);

        // Remove from source
        sections[sourceSectionIndex] = {
          ...sourceSection,
          links: sourceSection.links.filter(l => l.id !== draggedLink.linkId)
        };

        // Add to target
        const newTargetLinks = [...targetSection.links];
        newTargetLinks.splice(targetLinkIndex, 0, draggedLinkItem);

        sections[targetSectionIndex] = {
          ...targetSection,
          links: newTargetLinks
        };

        console.log('After link move - source:', sections[sourceSectionIndex].links.map(l => l.text));
        console.log('After link move - target:', sections[targetSectionIndex].links.map(l => l.text));

        return {
          ...prev,
          sections
        };
      });
    }

    setDraggedLink(null);
    setDragOverLink(null);
  };

  // Using the Ministry of Finance logo
  const ministryLogo = '/ministry-logo.png';

  return (
    <footer className="bg-transparent text-gray-500 dark:text-gray-300 font-heading font-kufi mt-auto border-t border-gray-200 dark:border-gray-500/30">
      {/* Admin Edit Controls */}
      {isAdmin && (
        <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-6 py-3 flex justify-between items-center">
            <span className="text-sm font-medium">وضع المدير - تحرير الفووتر</span>
            <div className="flex gap-2">
              {!isEditing ? (
                <button
                  onClick={() => isAdmin && setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
                  title="تحرير محتوى الفووتر"
                >
                  <Edit2 size={14} />
                  تحرير الفووتر
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
                    title="حفظ جميع التغييرات"
                  >
                    <Save size={14} />
                    حفظ التغييرات
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
                    title="إلغاء التحرير"
                  >
                    <X size={14} />
                    إلغاء
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-4 divide-y divide-gray-200 dark:divide-gray-700/40 md:divide-y-0 lg:divide-x lg:rtl:divide-x-reverse">

          {/* Ministry section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-right px-1 lg:px-4 md:col-span-2 lg:col-span-2" dir="rtl">
            <div className="flex flex-col items-center text-center w-full md:w-[280px] md:shrink-0 order-2 md:order-1 p-0">
              <img src={ministryLogo} alt="شعار وزارة المالية" className="h-40 md:h-52 w-auto object-contain" />
            </div>

            <div className="flex-[4] min-w-0 order-1 md:order-2">
              {(isAdmin && isEditing) ? (
                <>
                  <input
                    type="text"
                    value={editableContent.ministry.name}
                    onChange={(e) => setEditableContent(prev => ({
                      ...prev,
                      ministry: { ...prev.ministry, name: e.target.value }
                    }))}
                    className="text-xl md:text-2xl font-bold mb-3 border-b-2 border-green-500 pb-2 inline-block font-kufi bg-transparent outline-none"
                    style={{ minWidth: '200px' }}
                  />
                  <textarea
                    value={editableContent.ministry.description}
                    onChange={(e) => setEditableContent(prev => ({
                      ...prev,
                      ministry: { ...prev.ministry, description: e.target.value }
                    }))}
                    className="w-full h-32 p-3 text-base leading-8 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md resize-none"
                    placeholder="وصف الوزارة..."
                  />
                </>
              ) : (
                <>
                  <h4 className="text-xl md:text-2xl font-bold mb-3 border-b-2 border-green-500 pb-2 inline-block font-kufi">
                    {editableContent.ministry.name}
                  </h4>
                  <p className="text-base leading-8 text-gray-700 dark:text-gray-300 mt-1 text-justify">
                    {editableContent.ministry.description}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Dynamic Sections */}
          {editableContent.sections.map((section) => (
            <div
              key={section.id}
              className={`px-1 lg:px-3 relative transition-all duration-200 ${isEditing ? 'cursor-move' : ''
                } ${dragOverSection === section.id ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 border-dashed rounded-lg' : ''
                } ${draggedSection === section.id ? 'opacity-50' : ''
                }`}
              draggable={isEditing}
              onDragStart={(e) => isEditing && handleSectionDragStart(e, section.id)}
              onDragOver={(e) => isEditing && handleSectionDragOver(e, section.id)}
              onDragLeave={isEditing ? handleSectionDragLeave : undefined}
              onDrop={(e) => isEditing && handleSectionDrop(e, section.id)}
            >
              {(isAdmin && isEditing) && (
                <div className="absolute -top-2 -right-2 flex gap-1 z-10">
                  <div
                    className="w-6 h-6 bg-gray-400 hover:bg-gray-500 text-white rounded-full flex items-center justify-center text-xs cursor-move"
                    title="اسحب لإعادة الترتيب"
                  >
                    <span className="text-xs">⋮⋮</span>
                  </div>
                  <button
                    onClick={() => addLink(section.id)}
                    className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                    title="إضافة رابط"
                  >
                    <Plus size={10} />
                  </button>
                  {editableContent.sections.length > 1 && (
                    <button
                      onClick={() => removeSection(section.id)}
                      className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                      title="حذف القسم"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              )}

              {(isAdmin && isEditing) ? (
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                  className="text-lg font-bold mb-3 border-b-2 border-green-500 pb-2 inline-block font-kufi bg-transparent outline-none w-full"
                />
              ) : (
                <h4 className="text-lg font-bold mb-3 border-b-2 border-green-500 pb-2 inline-block font-kufi">
                  {section.title}
                </h4>
              )}

              <ul className="space-y-2.5">
                {section.links.filter(link => {
                  // Hide uploads demo link for non-admin users unless in editing mode
                  if (!isAdmin && !isEditing && link.id === 'uploads-demo') return false;
                  return true;
                }).map((link) => (
                  <li
                    key={link.id}
                    className={`relative group transition-all duration-200 ${(isAdmin && isEditing) ? 'cursor-move' : ''
                      } ${dragOverLink?.sectionId === section.id && dragOverLink?.linkId === link.id
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-400 border-dashed rounded p-1'
                        : ''
                      } ${draggedLink?.sectionId === section.id && draggedLink?.linkId === link.id
                        ? 'opacity-50'
                        : ''
                      }`}
                    draggable={isAdmin && isEditing}
                    onDragStart={(e) => (isAdmin && isEditing) && handleLinkDragStart(e, section.id, link.id)}
                    onDragOver={(e) => (isAdmin && isEditing) && handleLinkDragOver(e, section.id, link.id)}
                    onDragLeave={(isAdmin && isEditing) ? handleLinkDragLeave : undefined}
                    onDrop={(e) => (isAdmin && isEditing) && handleLinkDrop(e, section.id, link.id)}
                  >
                    {(isAdmin && isEditing) ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <div
                            className="w-6 h-6 bg-gray-300 hover:bg-gray-400 rounded flex items-center justify-center text-xs cursor-move flex-shrink-0"
                            title="اسحب لإعادة الترتيب"
                          >
                            <span className="text-xs">⋮⋮</span>
                          </div>
                          <input
                            type="text"
                            value={link.text}
                            onChange={(e) => updateLink(section.id, link.id, 'text', e.target.value)}
                            className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
                            placeholder="نص الرابط"
                          />
                          <button
                            onClick={() => removeLink(section.id, link.id)}
                            className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center justify-center flex-shrink-0"
                            title="حذف الرابط"
                          >
                            <Trash2 size={8} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={link.href}
                          onChange={(e) => updateLink(section.id, link.id, 'href', e.target.value)}
                          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs ml-7"
                          placeholder="الرابط (URL)"
                        />
                      </div>
                    ) : (
                      <a href={link.href} className="hover:text-black dark:hover:text-white transition-colors">
                        {link.text}
                      </a>
                    )}
                  </li>
                ))}
                {(isAdmin && isEditing) && section.links.length === 0 && (
                  <li className="text-gray-400 italic text-sm">لا توجد روابط - انقر على + لإضافة رابط</li>
                )}
              </ul>
            </div>
          ))}

          {/* Add new section button */}
          {(isAdmin && isEditing) && (
            <div className="px-1 lg:px-3 flex items-center justify-center">
              <button
                onClick={addSection}
                className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                title="إضافة قسم جديد"
              >
                <Plus size={20} />
                <span className="text-sm font-medium">إضافة قسم</span>
              </button>
            </div>
          )}

          {/* Social Media Section */}
          <div className="px-1 lg:px-3">
            {(isAdmin && isEditing) ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value="تابعنا على"
                    className="text-lg font-bold border-b-2 border-green-500 pb-2 inline-block font-kufi bg-transparent outline-none"
                    readOnly
                  />
                  <button
                    onClick={addSocialMediaItem}
                    className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                    title="إضافة منصة تواصل"
                  >
                    <Plus size={10} />
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {editableContent.socialMedia.map((item) => (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-lg">{getSocialIcon(item.icon)}</div>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateSocialMediaItem(item.id, 'name', e.target.value)}
                          className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-medium"
                          placeholder="اسم المنصة"
                        />
                        <button
                          onClick={() => removeSocialMediaItem(item.id)}
                          className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center justify-center"
                          title="حذف المنصة"
                        >
                          <Trash2 size={8} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium mb-1">الأيقونة:</label>
                          <select
                            value={item.icon}
                            onChange={(e) => updateSocialMediaItem(item.id, 'icon', e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
                          >
                            <option value="email">بريد إلكتروني</option>
                            <option value="facebook">فيسبوك</option>
                            <option value="instagram">إنستغرام</option>
                            <option value="telegram">تلغرام</option>
                            <option value="x">X (تويتر سابقاً)</option>
                            <option value="twitter">تويتر</option>
                            <option value="youtube">يوتيوب</option>
                            <option value="linkedin">لينكد إن</option>
                            <option value="whatsapp">واتساب</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1">الرابط:</label>
                          <input
                            type="url"
                            value={item.url}
                            onChange={(e) => updateSocialMediaItem(item.id, 'url', e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {editableContent.socialMedia.length === 0 && (
                    <div className="text-gray-400 italic text-sm text-center py-4">
                      لا توجد منصات تواصل - انقر على + لإضافة منصة
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h4 className="text-lg font-bold mb-3 border-b-2 border-green-500 pb-2 inline-block font-kufi">تابعنا على</h4>
                <div className="flex flex-wrap gap-3 mt-3">
                  {editableContent.socialMedia.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target={item.icon === 'email' ? '_self' : '_blank'}
                      rel={item.icon === 'email' ? '' : 'noopener noreferrer'}
                      className="text-2xl hover:text-black dark:hover:text-white transition-colors"
                      title={item.name}
                    >
                      {getSocialIcon(item.icon)}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Copyright Section */}
      <div className="bg-transparent py-4">
        <div className="container mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
          {(isAdmin && isEditing) ? (
            <div className="max-w-2xl mx-auto">
              <label className="block text-sm font-medium mb-2">نص حقوق الطبع والنشر:</label>
              <input
                type="text"
                value={editableContent.copyright}
                onChange={(e) => setEditableContent(prev => ({
                  ...prev,
                  copyright: e.target.value
                }))}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-center"
                placeholder="نص حقوق الطبع والنشر"
              />
            </div>
          ) : (
            <p>{editableContent.copyright} © {new Date().getFullYear()}</p>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;