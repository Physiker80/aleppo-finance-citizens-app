import React from 'react';
import { IconType } from 'react-icons';

interface DiwanCardTitleProps {
  children: React.ReactNode;
  icon?: React.ReactNode | IconType;
  className?: string;
  small?: boolean;
}

const DiwanCardTitle: React.FC<DiwanCardTitleProps> = ({ children, icon, className = '', small }) => {
  const IconComp = typeof icon === 'function' ? icon : null;
  return (
    <div className={`select-none ${className}`}>
      <h3 className={`relative font-bold tracking-tight bg-gradient-to-l from-teal-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2 ${small ? 'text-sm' : 'text-base'}`}>
        {IconComp && <IconComp className="text-teal-600 dark:text-teal-400" />}
        {!IconComp && icon}
        <span>{children}</span>
      </h3>
      <div className="h-0.5 mt-1 w-40 max-w-full bg-gradient-to-l from-teal-600 to-blue-600 rounded-full" />
    </div>
  );
};

export default DiwanCardTitle;