import React from 'react';

interface TronPanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  glowColor?: 'cyan' | 'blue' | 'orange';
  variant?: 'default' | 'elevated' | 'inset';
  headerAction?: React.ReactNode;
}

export function TronPanel({
  children,
  className = '',
  title,
  icon,
  glowColor = 'cyan',
  variant = 'default',
  headerAction
}: TronPanelProps) {
  const glowColors = {
    cyan: 'rgba(0, 212, 255, 0.2)',
    blue: 'rgba(0, 102, 255, 0.2)',
    orange: 'rgba(255, 102, 0, 0.2)',
  };

  const variants = {
    default: 'bg-tron-bg-panel',
    elevated: 'bg-tron-bg-elevated',
    inset: 'bg-tron-bg-deep',
  };

  const neonColors = {
    cyan: '#00d4ff',
    blue: '#0066ff',
    orange: '#ff6600',
  };

  return (
    <div 
      className={`
        relative overflow-hidden rounded-xl
        border border-opacity-20
        transition-all duration-300 ease-out
        hover:scale-[1.01]
        hover:shadow-lg
        ${variants[variant]}
        ${className}
      `}
      style={{ borderColor: glowColors[glowColor], zIndex: 1 }}
    >
      {/* Top Neon Line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, ${neonColors[glowColor]}, transparent)`
        }}
      />
      
      {title && (
        <div className="flex items-center justify-between gap-3 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-tron-cyan/10 min-w-0 relative z-50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            {icon && <span className="text-tron-cyan tron-icon-glow flex-shrink-0">{icon}</span>}
            <h3 className="text-base sm:text-lg font-semibold text-tron-white tron-glow-text truncate">{title}</h3>
          </div>
          {headerAction && <div className="flex-shrink-0 relative z-50">{headerAction}</div>}
        </div>
      )}
      
      <div className="p-6 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}
