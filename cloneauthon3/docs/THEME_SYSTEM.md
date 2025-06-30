# Custom Theme System

This document explains how to use and extend the custom theme system in the AJ.Chat application.

## Overview

The custom theme system allows users to personalize the appearance of the application by choosing custom colors for different components. The system is built on top of the existing dark/light mode functionality and provides a scalable architecture for adding more customizable components.

## Architecture

### Core Components

1. **ThemeContext** (`src/lib/ThemeContext.tsx`)
   - Manages theme state (light/dark mode)
   - Stores custom color preferences
   - Provides theme switching functionality
   - Persists theme settings in localStorage

2. **Custom Theme Interface** (`src/lib/ThemeContext.tsx`)
   ```typescript
   interface CustomThemeColors {
     sidebar: {
       background: string;
       border: string;
       text: string;
       textSecondary: string;
       hover: string;
       active: string;
     };
     chatBox?: {
       userBackground: string;
       userText: string;
       aiBackground: string;
       aiText: string;
     };
   }
   ```

3. **Theme Utilities** (`src/lib/themeUtils.ts`)
   - Helper functions for applying custom themes
   - Theme validation and merging utilities
   - CSS variable generation

4. **Custom Theme Hook** (`src/lib/useCustomTheme.ts`)
   - Provides easy access to theme utilities
   - Component-specific theme getters
   - Simplified theme application

## Usage

### Basic Usage in Components

```typescript
import { useCustomTheme } from '../lib/useCustomTheme';

function MyComponent() {
  const { getSidebarTheme, getChatBoxTheme } = useCustomTheme();
  const sidebarTheme = getSidebarTheme();
  
  return (
    <div className={`${sidebarTheme.background} ${sidebarTheme.border}`}>
      <h1 className={sidebarTheme.text}>My Component</h1>
    </div>
  );
}
```

### Using Theme Utilities

```typescript
import { applyCustomTheme, getThemeClass } from '../lib/themeUtils';

// Apply custom theme with fallback
const className = applyCustomTheme(
  'bg-white', // base class
  customColors.sidebar.background, // custom class
  'bg-gray-100' // fallback class
);

// Get theme-aware class
const themeClass = getThemeClass(
  'text-gray-900', // light mode class
  'text-white', // dark mode class
  theme // current theme
);
```

## Theme Configuration Page

The theme configuration page (`src/pages/ThemeConfigPage.tsx`) provides a user-friendly interface for customizing theme colors. It includes:

- **Color Selectors**: Predefined color options for each theme property
- **Live Preview**: Real-time preview of theme changes
- **Save/Reset**: Persist or reset custom theme settings
- **Responsive Design**: Works on desktop and mobile devices

## Best Practices

### 1. Use Semantic Class Names

Instead of hardcoding colors, use semantic class names that describe the purpose:

```typescript
// Good
background: 'bg-primary-50 dark:bg-primary-900'

// Avoid
background: 'bg-blue-50 dark:bg-blue-900'
```

### 2. Provide Fallbacks

Always provide fallback classes for components that might not have custom themes:

```typescript
const className = applyCustomTheme(
  'bg-white dark:bg-gray-800', // base class
  customColors.sidebar?.background, // custom class (optional)
  'bg-gray-50 dark:bg-gray-900' // fallback
);
```

### 3. Test Both Themes

Always test your components with both light and dark themes, and with custom theme colors.

## Future Enhancements

### Planned Features

1. **Advanced Color Picker**: Allow users to pick custom colors using a color wheel
2. **Theme Presets**: Pre-built theme collections (e.g., "Ocean", "Forest", "Sunset")
3. **Component-Specific Themes**: Allow different themes for different parts of the app
4. **CSS Custom Properties**: Use CSS variables for more dynamic theming
5. **Theme Export/Import**: Allow users to share their custom themes

## Contributing

When contributing to the theme system:

1. Follow the existing patterns and conventions
2. Add proper TypeScript types for new theme properties
3. Include fallback values for all new theme properties
4. Test with both light and dark modes
5. Update documentation for new features 