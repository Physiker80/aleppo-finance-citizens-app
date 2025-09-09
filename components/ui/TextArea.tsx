import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  id: string;
  endAdornment?: React.ReactNode;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(({ label, id, className = '', endAdornment, ...props }, ref) => {
  const hasAdornment = Boolean(endAdornment);
  const paddingForAdornment = hasAdornment ? 'pr-28 rtl:pl-28' : '';
  return (
    <div>
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <textarea
          id={id}
          rows={5}
          ref={ref}
          className={`w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${paddingForAdornment} ${className}`}
          {...props}
        />
        {hasAdornment ? (
          <div className="absolute inset-y-0 rtl:left-2 ltr:right-2 flex items-center gap-1 pointer-events-none">
            <div className="pointer-events-auto">
              {endAdornment}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
});

TextArea.displayName = 'TextArea';

export default TextArea;