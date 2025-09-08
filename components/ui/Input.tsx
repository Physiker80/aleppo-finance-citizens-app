import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  endAdornment?: React.ReactNode;
  labelClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, id, className, endAdornment, labelClassName, ...props }, ref) => {
  return (
      <div>
  <label htmlFor={id} className={`block font-medium text-gray-700 dark:text-gray-300 mb-1 ${labelClassName ?? 'text-sm'}`}>
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${className}`}
            {...props}
          />
          {endAdornment && (
            <div className="absolute inset-y-0 rtl:left-2 ltr:right-2 flex items-center gap-1">
              {endAdornment}
            </div>
          )}
        </div>
      </div>
  );
});

export default Input;