import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text = 'Loading...',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400 ${sizeClasses[size]}`}></div>
      {text && (
        <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">
          {text}
        </p>
      )}
    </div>
  );
};

export const PageLoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading page...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
};

export const SectionLoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading data...' }) => {
  return (
    <div className="flex justify-center items-center h-64">
      <LoadingSpinner size="md" text={text} />
    </div>
  );
}; 