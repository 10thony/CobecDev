import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

// Utility function to validate hex color
export const isValidHexColor = (color: string): boolean => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

// Utility function to convert hex to Tailwind-like class
export const hexToTailwindClass = (hexColor: string, property: string): string => {
  if (!isValidHexColor(hexColor)) return '';
  
  // Map property names to Tailwind CSS properties with proper prefixes
  const propertyMap: Record<string, string> = {
    background: 'bg',
    border: 'border',
    text: 'text',
    textSecondary: 'text',
    hover: 'hover:bg',
    active: 'bg' // For active state, we'll handle the text color separately
  };
  
  const tailwindProperty = propertyMap[property];
  if (!tailwindProperty) return '';
  
  // Use Tailwind's arbitrary value syntax
  return `${tailwindProperty}-[${hexColor}]`;
};

// Interface for saved custom colors
export interface SavedCustomColor {
  id: string;
  hexColor: string;
  name: string;
  property: string;
  component: string;
  createdAt: number;
}

export interface CustomThemeColors {
  sidebar: {
    background: string;
    border: string;
    text: string;
    textSecondary: string;
    hover: string;
    active: string;
  };
  // Future expansion for other components
  chatBox?: {
    userBackground: string;
    userText: string;
    aiBackground: string;
    aiText: string;
  };
  // Add more component themes as needed
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  customColors: CustomThemeColors;
  updateCustomColors: (colors: Partial<CustomThemeColors>) => void;
  resetCustomColors: () => void;
  // New methods for hex color handling
  updateHexColor: (component: keyof CustomThemeColors, property: string, hexColor: string) => void;
  getHexColor: (component: keyof CustomThemeColors, property: string) => string | null;
  // New methods for saved custom colors
  savedCustomColors: SavedCustomColor[];
  saveCustomColor: (hexColor: string, name: string, property: string, component: string) => void;
  removeSavedColor: (id: string) => void;
  getSavedColorsForProperty: (property: string, component: string) => SavedCustomColor[];
}

const defaultCustomColors: CustomThemeColors = {
  sidebar: {
    background: 'bg-white dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    textSecondary: 'text-gray-500 dark:text-gray-400',
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    active: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // If no saved theme, check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [customColors, setCustomColors] = useState<CustomThemeColors>(() => {
    const savedColors = localStorage.getItem('customThemeColors');
    if (savedColors) {
      try {
        return { ...defaultCustomColors, ...JSON.parse(savedColors) };
      } catch {
        return defaultCustomColors;
      }
    }
    return defaultCustomColors;
  });

  // Store hex colors separately
  const [hexColors, setHexColors] = useState<Record<string, string>>(() => {
    const savedHexColors = localStorage.getItem('hexColors');
    if (savedHexColors) {
      try {
        return JSON.parse(savedHexColors);
      } catch {
        return {};
      }
    }
    return {};
  });

  // Store saved custom colors
  const [savedCustomColors, setSavedCustomColors] = useState<SavedCustomColor[]>(() => {
    const savedColors = localStorage.getItem('savedCustomColors');
    if (savedColors) {
      try {
        return JSON.parse(savedColors);
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove both classes first
    root.classList.remove('light', 'dark');
    // Add the current theme class
    root.classList.add(theme);
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Save custom colors to localStorage
    localStorage.setItem('customThemeColors', JSON.stringify(customColors));
  }, [customColors]);

  useEffect(() => {
    // Save hex colors to localStorage
    localStorage.setItem('hexColors', JSON.stringify(hexColors));
  }, [hexColors]);

  useEffect(() => {
    // Save custom colors to localStorage
    localStorage.setItem('savedCustomColors', JSON.stringify(savedCustomColors));
  }, [savedCustomColors]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const updateCustomColors = (colors: Partial<CustomThemeColors>) => {
    setCustomColors(prev => ({ ...prev, ...colors }));
  };

  const resetCustomColors = () => {
    setCustomColors(defaultCustomColors);
    setHexColors({});
  };

  const updateHexColor = (component: keyof CustomThemeColors, property: string, hexColor: string) => {
    if (isValidHexColor(hexColor)) {
      const key = `${component}.${property}`;
      setHexColors(prev => ({ ...prev, [key]: hexColor }));
      
      // Special handling for active state which contains both background and text
      if (property === 'active' && component === 'sidebar') {
        // For active state, we need to preserve the text color part
        const currentActive = customColors.sidebar.active;
        const textColorMatch = currentActive.match(/text-[^\s]+/);
        const textColor = textColorMatch ? textColorMatch[0] : 'text-blue-700 dark:text-blue-300';
        
        const newActiveClass = `${hexToTailwindClass(hexColor, 'active')} ${textColor}`;
        
        const newColors = {
          ...customColors,
          sidebar: {
            ...customColors.sidebar,
            [property]: newActiveClass,
          },
        };
        setCustomColors(newColors);
      } else {
        // For other properties, use the standard approach
        const newColors = {
          ...customColors,
          [component]: {
            ...customColors[component],
            [property]: hexToTailwindClass(hexColor, property),
          },
        };
        setCustomColors(newColors);
      }
    }
  };

  const getHexColor = (component: keyof CustomThemeColors, property: string): string | null => {
    const key = `${component}.${property}`;
    return hexColors[key] || null;
  };

  const saveCustomColor = (hexColor: string, name: string, property: string, component: string) => {
    if (!isValidHexColor(hexColor)) return;

    const newColor: SavedCustomColor = {
      id: `${component}-${property}-${Date.now()}`,
      hexColor,
      name,
      property,
      component,
      createdAt: Date.now(),
    };

    setSavedCustomColors(prev => {
      // Check if a color with the same hex already exists for this property and component
      const existingIndex = prev.findIndex(
        color => color.hexColor === hexColor && 
                 color.property === property && 
                 color.component === component
      );

      if (existingIndex >= 0) {
        // Update existing color
        const updated = [...prev];
        updated[existingIndex] = newColor;
        return updated;
      } else {
        // Add new color
        return [...prev, newColor];
      }
    });
  };

  const removeSavedColor = (id: string) => {
    setSavedCustomColors(prev => prev.filter(color => color.id !== id));
  };

  const getSavedColorsForProperty = (property: string, component: string): SavedCustomColor[] => {
    return savedCustomColors.filter(
      color => color.property === property && color.component === component
    );
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      customColors, 
      updateCustomColors, 
      resetCustomColors,
      updateHexColor,
      getHexColor,
      savedCustomColors,
      saveCustomColor,
      removeSavedColor,
      getSavedColorsForProperty
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 