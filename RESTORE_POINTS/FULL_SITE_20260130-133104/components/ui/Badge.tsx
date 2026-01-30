import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline';
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ variant='default', className='', children, ...rest }) => {
  const base = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium select-none';
  const variants: Record<string,string> = {
    default: 'bg-[#002623] text-white',
    secondary: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
  };
  return <span className={`${base} ${variants[variant] || ''} ${className}`} {...rest}>{children}</span>;
};

export default Badge;
