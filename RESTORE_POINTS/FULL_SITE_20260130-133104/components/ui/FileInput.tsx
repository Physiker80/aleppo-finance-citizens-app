import React, { useState, useRef } from 'react';

interface FileInputProps {
  label: string;
  id: string;
  onFileChange: (files: File[] | undefined) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number; // default 5
}

const FileInput: React.FC<FileInputProps> = ({ label, id, onFileChange, accept, multiple = false, maxFiles = 5 }) => {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const filesList: File[] = event.target.files ? Array.from(event.target.files) : [];
  const limited: File[] = multiple ? filesList.slice(0, maxFiles) : filesList.slice(0, 1);
  setFileNames(limited.map((f: File) => f.name));
  onFileChange(limited.length ? limited : undefined);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex text-sm text-gray-600 dark:text-gray-400">
            <button
                type="button"
                onClick={handleButtonClick}
                className="relative cursor-pointer bg-transparent dark:bg-transparent rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
                <span>ارفع ملفاً</span>
                <input ref={fileInputRef} id={id} name={id} type="file" className="sr-only" onChange={handleFileChange} accept={accept} multiple={multiple} />
            </button>
            <p className="pr-1">أو اسحبه وأفلته هنا</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            PDF, PNG, JPG, DOCX حتى 100MB — بحد أقصى {multiple ? maxFiles : 1} ملف
          </p>
          {fileNames.length > 0 && (
            <ul className="text-sm text-green-600 dark:text-green-400 mt-2 space-y-1 text-right">
              {fileNames.map((n, idx) => (
                <li key={idx}>• {n}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileInput;