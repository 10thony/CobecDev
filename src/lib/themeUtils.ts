import { CustomThemeColors } from './ThemeContext';

/**
 * Utility function to apply custom theme classes to an element
 * This function takes a base class and custom theme classes and merges them
 */
export function applyCustomTheme(
  baseClass: string,
  customClass: string,
  fallbackClass: string = ''
): string {
  // If custom class is provided, use it; otherwise use fallback or base class
  return customClass || fallbackClass || baseClass;
}

/**
 * Utility function to get theme-aware class names
 * This helps with applying different styles based on light/dark mode
 */
export function getThemeClass(
  lightClass: string,
  darkClass: string,
  theme: 'light' | 'dark'
): string {
  return theme === 'light' ? lightClass : darkClass;
}

/**
 * Utility function to merge custom theme colors with defaults
 */
export function mergeThemeColors(
  customColors: Partial<CustomThemeColors>,
  defaultColors: CustomThemeColors
): CustomThemeColors {
  const merged = {
    ...defaultColors,
    ...customColors,
    sidebar: {
      ...defaultColors.sidebar,
      ...customColors.sidebar,
    },
  };

  // Handle chatBox separately since it's optional
  if (customColors.chatBox && defaultColors.chatBox) {
    merged.chatBox = {
      ...defaultColors.chatBox,
      ...customColors.chatBox,
    };
  } else if (customColors.chatBox) {
    merged.chatBox = customColors.chatBox;
  }

  return merged;
}

/**
 * Utility function to validate theme color classes
 * This ensures that the custom classes are valid Tailwind classes
 */
export function validateThemeClass(className: string): boolean {
  // Basic validation - you can expand this as needed
  const validPrefixes = [
    'bg-', 'text-', 'border-', 'hover:', 'focus:', 'active:', 'dark:'
  ];
  
  return validPrefixes.some(prefix => className.includes(prefix));
}

/**
 * Utility function to generate CSS custom properties from theme colors
 * This can be used for more advanced theming scenarios
 */
export function generateCSSVariables(colors: CustomThemeColors): Record<string, string> {
  const variables: Record<string, string> = {};
  
  // Convert sidebar colors to CSS variables
  Object.entries(colors.sidebar).forEach(([key, value]) => {
    variables[`--sidebar-${key}`] = value;
  });
  
  // Convert chat box colors to CSS variables if they exist
  if (colors.chatBox) {
    Object.entries(colors.chatBox).forEach(([key, value]) => {
      variables[`--chatbox-${key}`] = value;
    });
  }
  
  return variables;
} 