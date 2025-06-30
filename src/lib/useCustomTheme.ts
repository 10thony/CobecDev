import { useTheme } from './ThemeContext';
import { applyCustomTheme, getThemeClass } from './themeUtils';

/**
 * Custom hook that provides easy access to theme utilities
 */
export function useCustomTheme() {
  const { theme, customColors, updateCustomColors, resetCustomColors } = useTheme();

  /**
   * Get a theme-aware class name
   */
  const getThemeAwareClass = (lightClass: string, darkClass: string) => {
    return getThemeClass(lightClass, darkClass, theme);
  };

  /**
   * Apply custom theme to a component
   */
  const applyTheme = (
    component: keyof typeof customColors,
    property: string,
    baseClass: string = '',
    fallbackClass: string = ''
  ) => {
    const componentColors = customColors[component];
    if (!componentColors) return baseClass || fallbackClass;

    const customClass = (componentColors as any)[property];
    return applyCustomTheme(baseClass, customClass, fallbackClass);
  };

  /**
   * Get sidebar theme classes
   */
  const getSidebarTheme = () => ({
    background: customColors.sidebar.background,
    border: customColors.sidebar.border,
    text: customColors.sidebar.text,
    textSecondary: customColors.sidebar.textSecondary,
    hover: customColors.sidebar.hover,
    active: customColors.sidebar.active,
  });

  /**
   * Get chat box theme classes (if available)
   */
  const getChatBoxTheme = () => {
    if (!customColors.chatBox) return null;
    
    return {
      userBackground: customColors.chatBox.userBackground,
      userText: customColors.chatBox.userText,
      aiBackground: customColors.chatBox.aiBackground,
      aiText: customColors.chatBox.aiText,
    };
  };

  return {
    theme,
    customColors,
    updateCustomColors,
    resetCustomColors,
    getThemeAwareClass,
    applyTheme,
    getSidebarTheme,
    getChatBoxTheme,
  };
} 