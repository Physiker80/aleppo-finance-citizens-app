import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
}

const TextArea: React.FC<TextAreaProps> = ({ label, id, className, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <textarea
        id={id}
        rows={5}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${className}`}
        {...props}
      />
    </div>
  );
};

export default TextArea;