# TRON UI Redesign Plan for HR Dashboard

## Executive Summary

This document outlines a comprehensive plan to transform the HR Dashboard and its child components into a **Tron-inspired design system** - featuring dark backgrounds, neon glowing lines, sharp geometric edges, and an elegant, futuristic aesthetic.

The current UI suffers from:
- Inconsistent color usage (mixing standard Tailwind colors with custom palette)
- Lack of visual hierarchy and depth
- Missing futuristic/Tron visual elements (glows, circuits, geometric patterns)
- Soft, generic styling that doesn't match the desired modern aesthetic

---

## Design Philosophy

### Core Tron Aesthetic Principles

1. **Dark Canvas**: Deep black/dark blue backgrounds that make neon elements pop
2. **Neon Glow Lines**: Cyan, electric blue, and orange accent colors with glow effects
3. **Sharp Geometry**: Angular, precise edges; hexagonal and grid patterns
4. **Circuit Board Patterns**: Subtle line patterns resembling electronic circuits
5. **Light Trails**: Animated glowing borders and transitions
6. **Minimal but Impactful**: Clean layouts with high-contrast focal points
7. **Glass Morphism**: Subtle transparency with blur effects on panels

### Color Palette (Tron-Inspired)

```css
:root {
  /* Primary Dark Backgrounds */
  --tron-bg-deep: #0a0a0f;
  --tron-bg-panel: #0d1117;
  --tron-bg-card: #161b22;
  --tron-bg-elevated: #21262d;
  
  /* Neon Accent Colors */
  --tron-cyan: #00d4ff;
  --tron-cyan-glow: rgba(0, 212, 255, 0.5);
  --tron-blue: #0066ff;
  --tron-blue-glow: rgba(0, 102, 255, 0.4);
  --tron-orange: #ff6600;
  --tron-orange-glow: rgba(255, 102, 0, 0.4);
  --tron-white: #f0f6fc;
  --tron-gray: #8b949e;
  
  /* Status Colors */
  --tron-success: #00ff88;
  --tron-warning: #ffaa00;
  --tron-error: #ff4444;
  --tron-info: #00ccff;
}
```

---

## Components to Redesign

### Primary Components (HR Dashboard Ecosystem)

| Component | File | Priority |
|-----------|------|----------|
| HRDashboard | `src/components/HRDashboard.tsx` | HIGH |
| HRDashboardPage | `src/pages/HRDashboardPage.tsx` | HIGH |
| EnhancedSearchInterface | `src/components/EnhancedSearchInterface.tsx` | HIGH |
| EmbeddingManagement | `src/components/EmbeddingManagement.tsx` | HIGH |
| KfcPointsManager | `src/components/KfcPointsManager.tsx` | MEDIUM |
| KfcNomination | `src/components/KfcNomination.tsx` | MEDIUM |
| LeadsManagement | `src/components/LeadsManagement.tsx` | MEDIUM |
| SearchExplanation | `src/components/SearchExplanation.tsx` | MEDIUM |
| Layout | `src/components/Layout.tsx` | HIGH |
| Sidebar | `src/components/Sidebar.tsx` | HIGH |

### Supporting Files

| File | Purpose |
|------|---------|
| `src/index.css` | Global styles, CSS variables, Tron utilities |
| `tailwind.config.js` | Tailwind theme extension |

---

## Implementation Plan

### Phase 1: Foundation (CSS & Tailwind Setup)

#### 1.1 Update `tailwind.config.js`

Add Tron-specific colors and utilities:

```javascript
module.exports = {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tron Dark Backgrounds
        tron: {
          bg: {
            deep: '#0a0a0f',
            panel: '#0d1117',
            card: '#161b22',
            elevated: '#21262d',
          },
          // Neon Accents
          cyan: {
            DEFAULT: '#00d4ff',
            dim: '#00a8cc',
            bright: '#4de8ff',
          },
          blue: {
            DEFAULT: '#0066ff',
            dim: '#0052cc',
            bright: '#3385ff',
          },
          orange: {
            DEFAULT: '#ff6600',
            dim: '#cc5200',
            bright: '#ff8533',
          },
          // Text
          white: '#f0f6fc',
          gray: '#8b949e',
          muted: '#484f58',
        },
        // Status colors with glow potential
        neon: {
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff4444',
          info: '#00ccff',
        }
      },
      boxShadow: {
        'tron-glow': '0 0 10px rgba(0, 212, 255, 0.5), 0 0 20px rgba(0, 212, 255, 0.3)',
        'tron-glow-blue': '0 0 10px rgba(0, 102, 255, 0.5), 0 0 20px rgba(0, 102, 255, 0.3)',
        'tron-glow-orange': '0 0 10px rgba(255, 102, 0, 0.5), 0 0 20px rgba(255, 102, 0, 0.3)',
        'tron-glow-success': '0 0 10px rgba(0, 255, 136, 0.5)',
        'tron-glow-error': '0 0 10px rgba(255, 68, 68, 0.5)',
        'tron-inset': 'inset 0 0 20px rgba(0, 212, 255, 0.1)',
      },
      borderColor: {
        'tron-glow': 'rgba(0, 212, 255, 0.5)',
      },
      backgroundImage: {
        'tron-grid': 'linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)',
        'tron-circuit': 'radial-gradient(circle at 25px 25px, rgba(0, 212, 255, 0.15) 2%, transparent 0%)',
        'tron-gradient': 'linear-gradient(180deg, rgba(0, 212, 255, 0.1) 0%, transparent 50%)',
      },
      animation: {
        'tron-pulse': 'tron-pulse 2s ease-in-out infinite',
        'tron-glow-pulse': 'tron-glow-pulse 3s ease-in-out infinite',
        'tron-scan': 'tron-scan 4s linear infinite',
        'tron-border': 'tron-border 2s linear infinite',
      },
      keyframes: {
        'tron-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'tron-glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.6)' },
        },
        'tron-scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'tron-border': {
          '0%': { borderColor: 'rgba(0, 212, 255, 0.3)' },
          '50%': { borderColor: 'rgba(0, 212, 255, 0.8)' },
          '100%': { borderColor: 'rgba(0, 212, 255, 0.3)' },
        },
      },
    },
  },
  plugins: [
    // Custom plugin for Tron utilities
    function({ addUtilities }) {
      addUtilities({
        '.tron-border': {
          border: '1px solid rgba(0, 212, 255, 0.3)',
          '&:hover': {
            borderColor: 'rgba(0, 212, 255, 0.6)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)',
          }
        },
        '.tron-panel': {
          backgroundColor: '#0d1117',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: '8px',
        },
        '.tron-card': {
          backgroundColor: '#161b22',
          border: '1px solid rgba(0, 212, 255, 0.15)',
          borderRadius: '6px',
        },
        '.tron-text-glow': {
          textShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
        },
        '.tron-neon-line': {
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
          }
        },
      })
    }
  ],
};
```

#### 1.2 Update `src/index.css`

Add global Tron styles and CSS custom properties:

```css
/* ==========================================
   TRON UI DESIGN SYSTEM
   ========================================== */

/* CSS Custom Properties */
:root {
  /* Tron Color Palette */
  --tron-bg-deep: #0a0a0f;
  --tron-bg-panel: #0d1117;
  --tron-bg-card: #161b22;
  --tron-bg-elevated: #21262d;
  
  --tron-cyan: #00d4ff;
  --tron-cyan-dim: #00a8cc;
  --tron-cyan-glow: rgba(0, 212, 255, 0.5);
  
  --tron-blue: #0066ff;
  --tron-orange: #ff6600;
  
  --tron-text: #f0f6fc;
  --tron-text-muted: #8b949e;
  --tron-text-dim: #484f58;
  
  /* Animation Timing */
  --tron-transition-fast: 150ms;
  --tron-transition-normal: 250ms;
  --tron-transition-slow: 400ms;
}

/* Apply Tron theme to body */
body {
  background: var(--tron-bg-deep);
  color: var(--tron-text);
  font-family: 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Tron Grid Background Pattern */
.tron-grid-bg {
  background-image: 
    linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

/* Tron Panel Component */
.tron-panel {
  background: var(--tron-bg-panel);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.tron-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--tron-cyan), transparent);
  opacity: 0.5;
}

/* Tron Card Component */
.tron-card {
  background: var(--tron-bg-card);
  border: 1px solid rgba(0, 212, 255, 0.15);
  border-radius: 6px;
  transition: all var(--tron-transition-normal) ease;
}

.tron-card:hover {
  border-color: rgba(0, 212, 255, 0.4);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.15);
}

/* Tron Button Styles */
.tron-btn {
  background: transparent;
  border: 1px solid var(--tron-cyan);
  color: var(--tron-cyan);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  transition: all var(--tron-transition-normal) ease;
  position: relative;
  overflow: hidden;
}

.tron-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.tron-btn:hover {
  background: rgba(0, 212, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
}

.tron-btn:hover::before {
  left: 100%;
}

.tron-btn-primary {
  background: var(--tron-cyan);
  color: var(--tron-bg-deep);
  border-color: var(--tron-cyan);
}

.tron-btn-primary:hover {
  background: var(--tron-cyan-dim);
  box-shadow: 0 0 25px var(--tron-cyan-glow);
}

.tron-btn-orange {
  border-color: var(--tron-orange);
  color: var(--tron-orange);
}

.tron-btn-orange:hover {
  background: rgba(255, 102, 0, 0.1);
  box-shadow: 0 0 20px rgba(255, 102, 0, 0.3);
}

/* Tron Input Styles */
.tron-input {
  background: var(--tron-bg-card);
  border: 1px solid rgba(0, 212, 255, 0.2);
  color: var(--tron-text);
  padding: 0.75rem 1rem;
  border-radius: 4px;
  transition: all var(--tron-transition-normal) ease;
}

.tron-input:focus {
  outline: none;
  border-color: var(--tron-cyan);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1), 0 0 15px rgba(0, 212, 255, 0.2);
}

.tron-input::placeholder {
  color: var(--tron-text-dim);
}

/* Tron Select Styles */
.tron-select {
  background: var(--tron-bg-card);
  border: 1px solid rgba(0, 212, 255, 0.2);
  color: var(--tron-text);
  padding: 0.75rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.tron-select:focus {
  outline: none;
  border-color: var(--tron-cyan);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
}

.tron-select option {
  background: var(--tron-bg-panel);
  color: var(--tron-text);
}

/* Tron Progress Bar */
.tron-progress {
  background: var(--tron-bg-elevated);
  border-radius: 4px;
  height: 8px;
  overflow: hidden;
}

.tron-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--tron-cyan-dim), var(--tron-cyan));
  box-shadow: 0 0 10px var(--tron-cyan-glow);
  transition: width 0.3s ease;
}

/* Tron Status Badges */
.tron-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tron-badge-success {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  color: #00ff88;
}

.tron-badge-warning {
  background: rgba(255, 170, 0, 0.1);
  border: 1px solid rgba(255, 170, 0, 0.3);
  color: #ffaa00;
}

.tron-badge-error {
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid rgba(255, 68, 68, 0.3);
  color: #ff4444;
}

.tron-badge-info {
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  color: #00d4ff;
}

/* Tron Stat Card */
.tron-stat-card {
  background: var(--tron-bg-card);
  border: 1px solid rgba(0, 212, 255, 0.15);
  border-radius: 8px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
}

.tron-stat-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 70%);
}

/* Tron Table Styles */
.tron-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.tron-table th {
  background: var(--tron-bg-elevated);
  color: var(--tron-cyan);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}

.tron-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 212, 255, 0.1);
  color: var(--tron-text-muted);
}

.tron-table tr:hover td {
  background: rgba(0, 212, 255, 0.05);
}

/* Tron Divider */
.tron-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent);
  margin: 1.5rem 0;
}

/* Tron Glow Text */
.tron-glow-text {
  text-shadow: 0 0 10px var(--tron-cyan-glow), 0 0 20px rgba(0, 212, 255, 0.3);
}

/* Tron Icon Glow */
.tron-icon-glow {
  filter: drop-shadow(0 0 5px var(--tron-cyan-glow));
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--tron-bg-panel);
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 212, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 212, 255, 0.5);
}

/* Animations */
@keyframes tron-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes tron-glow-pulse {
  0%, 100% { box-shadow: 0 0 5px rgba(0, 212, 255, 0.3); }
  50% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.6); }
}

@keyframes tron-scan-line {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}

@keyframes tron-border-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Utility Classes */
.animate-tron-pulse { animation: tron-pulse 2s ease-in-out infinite; }
.animate-tron-glow { animation: tron-glow-pulse 3s ease-in-out infinite; }
```

---

### Phase 2: Component Redesign

#### 2.1 TronPanel Component (New Reusable Component)

Create `src/components/TronPanel.tsx`:

```tsx
import React from 'react';

interface TronPanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  glowColor?: 'cyan' | 'blue' | 'orange';
  variant?: 'default' | 'elevated' | 'inset';
}

export function TronPanel({
  children,
  className = '',
  title,
  icon,
  glowColor = 'cyan',
  variant = 'default'
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

  return (
    <div 
      className={`
        relative overflow-hidden rounded-lg
        border border-opacity-20
        ${variants[variant]}
        ${className}
      `}
      style={{ borderColor: glowColors[glowColor] }}
    >
      {/* Top Neon Line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, ${glowColor === 'cyan' ? '#00d4ff' : glowColor === 'orange' ? '#ff6600' : '#0066ff'}, transparent)`
        }}
      />
      
      {title && (
        <div className="flex items-center gap-3 px-6 py-4 border-b border-tron-cyan/10">
          {icon && <span className="text-tron-cyan tron-icon-glow">{icon}</span>}
          <h3 className="text-lg font-semibold text-tron-white tron-glow-text">{title}</h3>
        </div>
      )}
      
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
```

#### 2.2 TronButton Component

Create `src/components/TronButton.tsx`:

```tsx
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
        relative overflow-hidden
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
```

#### 2.3 TronStatCard Component

Create `src/components/TronStatCard.tsx`:

```tsx
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
```

---

### Phase 3: Component Migration

#### 3.1 HRDashboard.tsx Redesign

**Key Changes:**

1. Replace all `bg-berkeley-blue-DEFAULT` with `bg-tron-bg-panel`
2. Replace all `border-yale-blue-*` with `border-tron-cyan/20`
3. Replace all `text-mint-cream-*` with `text-tron-white` and `text-tron-gray`
4. Replace standard color backgrounds (blue-50, green-50, etc.) with Tron dark variants
5. Add glow effects to interactive elements
6. Use TronPanel, TronButton, TronStatCard components
7. Add subtle animations and hover effects

**Example Migration:**

Current:
```tsx
<div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-sm border border-yale-blue-300 p-6">
  <h1 className="text-2xl font-bold text-mint-cream-DEFAULT">HR Dashboard</h1>
</div>
```

After:
```tsx
<TronPanel title="HR Dashboard" icon={<Target className="w-6 h-6" />}>
  {/* Content */}
</TronPanel>
```

#### 3.2 Metrics Grid Redesign

Current:
```tsx
<div className="bg-blue-50 bg-yale-blue-500/20 rounded-lg p-4 border border-blue-200">
  {/* ... */}
</div>
```

After:
```tsx
<TronStatCard 
  title="Total Jobs"
  value={totalJobs}
  icon={<Briefcase className="w-6 h-6" />}
  color="cyan"
/>
```

---

### Phase 4: Animation & Effects

#### 4.1 Micro-interactions

- **Hover states**: Subtle glow increase on buttons and cards
- **Focus states**: Neon ring around inputs
- **Loading states**: Cyan spinning loader
- **Transitions**: 250ms ease-out for smooth feel

#### 4.2 Background Effects

- **Grid pattern**: Subtle circuit-board grid
- **Gradient overlays**: Top-to-bottom cyan tint
- **Scan lines**: Optional animated horizontal lines

#### 4.3 Page Transitions

- Use Framer Motion for smooth page transitions
- Fade + scale for modals
- Slide for sidebars

---

## Reference: tron-ui Library Components

The [tron-ui](https://github.com/jasonsilvers/tron-ui) library provides these useful patterns:

### Button Variants
- Basic, Raised, Stroked, Solid variants
- Primary, Secondary, Neutral colors
- Icon support

### Theme Structure
```js
{
  primary: {
    100: '#e7f5ff',
    // ...gradients to...
    900: '#003d99'
  },
  secondary: { /* ... */ },
  neutral: { /* ... */ },
  support: {
    info, warning, error, success
  }
}
```

### Emotion-based Theming
The library uses Emotion for CSS-in-JS theming which can be adapted for our Tailwind-based approach.

---

## Implementation Checklist

### Phase 1: Foundation ✅
- [ ] Update `tailwind.config.js` with Tron colors and utilities
- [ ] Update `src/index.css` with Tron global styles
- [ ] Create CSS custom properties for Tron theme

### Phase 2: Component Library ✅
- [ ] Create `TronPanel` component
- [ ] Create `TronButton` component
- [ ] Create `TronStatCard` component
- [ ] Create `TronInput` component
- [ ] Create `TronSelect` component
- [ ] Create `TronBadge` component
- [ ] Create `TronProgress` component
- [ ] Create `TronTable` component

### Phase 3: HR Dashboard Migration ✅
- [ ] Migrate `HRDashboard.tsx`
- [ ] Migrate `HRDashboardPage.tsx`
- [ ] Migrate `EnhancedSearchInterface.tsx`
- [ ] Migrate `EmbeddingManagement.tsx`
- [ ] Migrate `KfcPointsManager.tsx`
- [ ] Migrate `LeadsManagement.tsx`
- [ ] Migrate `SearchExplanation.tsx`

### Phase 4: Layout & Navigation ✅
- [ ] Migrate `Layout.tsx`
- [ ] Migrate `Sidebar.tsx`
- [ ] Update navigation active states
- [ ] Add page transition effects

### Phase 5: Polish & Testing ✅
- [ ] Cross-browser testing
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Responsive design verification
- [ ] Animation performance check

---

## Visual Mockup Reference

### Color Application

| Element | Current | Tron |
|---------|---------|------|
| Page Background | `oxford_blue-500` | `#0a0a0f` |
| Panel Background | `berkeley_blue-500` | `#0d1117` |
| Card Background | Mixed | `#161b22` |
| Primary Text | `mint_cream-500` | `#f0f6fc` |
| Secondary Text | `mint_cream-600` | `#8b949e` |
| Accent Color | `powder_blue-600` | `#00d4ff` |
| Borders | `yale_blue-300` | `rgba(0, 212, 255, 0.2)` |
| Success | `green-500` | `#00ff88` |
| Warning | `yellow-500` | `#ffaa00` |
| Error | `red-500` | `#ff4444` |

---

## Conclusion

This redesign will transform the HR Dashboard from a standard enterprise UI into a distinctive, futuristic Tron-inspired interface. The dark background with neon accents will create a striking visual identity while maintaining excellent usability and accessibility.

The phased approach ensures we can incrementally update components while maintaining a functional application throughout the migration process.

**Estimated Timeline**: 2-3 sprints (depending on team size)
**Risk Level**: Medium (visual changes only, no functional changes)
**Testing Required**: Visual regression testing, accessibility testing, cross-browser testing
