import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800/50 dark:border dark:border-gray-700/50 rounded-lg shadow-md p-6 ${className}`}>
      {children}
    </div>
  );
};

export default Card;