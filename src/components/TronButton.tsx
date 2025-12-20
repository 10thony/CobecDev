import React from 'react';

interface TronButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  color?: 'cyan' | 'orange' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export function TronButton({
  children,
  variant = 'outline',
  color = 'cyan',
  size = 'md',
  icon,
  loading,
  className = '',
  disabled,
  ...props
}: TronButtonProps) {
  const colors = {
    cyan: {
      border: 'border-tron-cyan',
      text: 'text-tron-cyan',
      bg: 'bg-tron-cyan',
      hover: 'hover:bg-tron-cyan/10',
      glow: 'hover:shadow-tron-glow',
    },
    orange: {
      border: 'border-tron-orange',
      text: 'text-tron-orange',
      bg: 'bg-tron-orange',
      hover: 'hover:bg-tron-orange/10',
      glow: 'hover:shadow-tron-glow-orange',
    },
    blue: {
      border: 'border-tron-blue',
      text: 'text-tron-blue',
      bg: 'bg-tron-blue',
      hover: 'hover:bg-tron-blue/10',
      glow: 'hover:shadow-tron-glow-blue',
    },
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const variants = {
    primary: `${colors[color].bg} text-tron-bg-deep border-transparent`,
    secondary: `bg-tron-bg-elevated ${colors[color].text} ${colors[color].border}`,
    outline: `bg-transparent ${colors[color].text} ${colors[color].border}`,
    ghost: `bg-transparent ${colors[color].text} border-transparent`,
  };

  return (
    <button
      className={`
        relative overflow-hidden group
        inline-flex items-center justify-center gap-2
        border font-medium rounded
        transition-all duration-250 ease-out
        ${sizes[size]}
        ${variants[variant]}
        ${colors[color].hover}
        ${colors[color].glow}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {/* Hover sweep effect */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
      
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && icon}
      {children}
    </button>
  );
}
