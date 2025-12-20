import React from 'react';

interface TronStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'cyan' | 'blue' | 'orange' | 'green';
}

export function TronStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'cyan'
}: TronStatCardProps) {
  const colors = {
    cyan: { accent: '#00d4ff', glow: 'rgba(0, 212, 255, 0.15)' },
    blue: { accent: '#0066ff', glow: 'rgba(0, 102, 255, 0.15)' },
    orange: { accent: '#ff6600', glow: 'rgba(255, 102, 0, 0.15)' },
    green: { accent: '#00ff88', glow: 'rgba(0, 255, 136, 0.15)' },
  };

  return (
    <div 
      className="tron-stat-card group hover:border-opacity-40 transition-all duration-300"
      style={{ borderColor: colors[color].accent }}
    >
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle at top right, ${colors[color].glow}, transparent 50%)` }}
      />
      
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-tron-gray uppercase tracking-wide">{title}</p>
          <p 
            className="text-3xl font-bold mt-2"
            style={{ color: colors[color].accent }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-tron-muted mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === 'up' ? 'text-neon-success' : 
              trend === 'down' ? 'text-neon-error' : 
              'text-tron-gray'
            }`}>
              {trend === 'up' && <span>↑</span>}
              {trend === 'down' && <span>↓</span>}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {icon && (
          <div 
            className="p-3 rounded-lg"
            style={{ 
              background: colors[color].glow,
              color: colors[color].accent 
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
