import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
  <div className={`rounded-xl shadow-md p-6 border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 backdrop-blur ${className}`}>
      {children}
    </div>
  );
};

export default Card;