import { useTheme } from '../lib/ThemeContext';
import { hexToTailwindClass } from '../lib/ThemeContext';
import { useState, useEffect } from 'react';
import { ArrowLeft, Palette, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CustomColorPicker } from '../components/CustomColorPicker';

// Predefined color options for easy selection
const colorOptions = [
  { name: 'Default', value: 'bg-white dark:bg-gray-800' },
  { name: 'Blue', value: 'bg-blue-50 dark:bg-blue-900' },
  { name: 'Green', value: 'bg-green-50 dark:bg-green-900' },
  { name: 'Purple', value: 'bg-purple-50 dark:bg-purple-900' },
  { name: 'Pink', value: 'bg-pink-50 dark:bg-pink-900' },
  { name: 'Yellow', value: 'bg-yellow-50 dark:bg-yellow-900' },
  { name: 'Red', value: 'bg-red-50 dark:bg-red-900' },
  { name: 'Indigo', value: 'bg-indigo-50 dark:bg-indigo-900' },
];

const borderOptions = [
  { name: 'Default', value: 'border-gray-200 dark:border-gray-700' },
  { name: 'Blue', value: 'border-blue-200 dark:border-blue-700' },
  { name: 'Green', value: 'border-green-200 dark:border-green-700' },
  { name: 'Purple', value: 'border-purple-200 dark:border-purple-700' },
  { name: 'Pink', value: 'border-pink-200 dark:border-pink-700' },
  { name: 'Yellow', value: 'border-yellow-200 dark:border-yellow-700' },
  { name: 'Red', value: 'border-red-200 dark:border-red-700' },
  { name: 'Indigo', value: 'border-indigo-200 dark:border-indigo-700' },
];

const textOptions = [
  { name: 'Default', value: 'text-gray-700 dark:text-gray-300' },
  { name: 'Blue', value: 'text-blue-700 dark:text-blue-300' },
  { name: 'Green', value: 'text-green-700 dark:text-green-300' },
  { name: 'Purple', value: 'text-purple-700 dark:text-purple-300' },
  { name: 'Pink', value: 'text-pink-700 dark:text-pink-300' },
  { name: 'Yellow', value: 'text-yellow-700 dark:text-yellow-300' },
  { name: 'Red', value: 'text-red-700 dark:text-red-300' },
  { name: 'Indigo', value: 'text-indigo-700 dark:text-indigo-300' },
];

const hoverOptions = [
  { name: 'Default', value: 'hover:bg-gray-100 dark:hover:bg-gray-700' },
  { name: 'Blue', value: 'hover:bg-blue-100 dark:hover:bg-blue-800' },
  { name: 'Green', value: 'hover:bg-green-100 dark:hover:bg-green-800' },
  { name: 'Purple', value: 'hover:bg-purple-100 dark:hover:bg-purple-800' },
  { name: 'Pink', value: 'hover:bg-pink-100 dark:hover:bg-pink-800' },
  { name: 'Yellow', value: 'hover:bg-yellow-100 dark:hover:bg-yellow-800' },
  { name: 'Red', value: 'hover:bg-red-100 dark:hover:bg-red-800' },
  { name: 'Indigo', value: 'hover:bg-indigo-100 dark:hover:bg-indigo-800' },
];

const activeOptions = [
  { name: 'Default', value: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  { name: 'Green', value: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  { name: 'Purple', value: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
  { name: 'Pink', value: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300' },
  { name: 'Yellow', value: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' },
  { name: 'Red', value: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
  { name: 'Indigo', value: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' },
];

export function ThemeConfigPage() {
  const { 
    customColors, 
    updateCustomColors, 
    resetCustomColors, 
    updateHexColor, 
    getHexColor,
    saveCustomColor,
    removeSavedColor,
    getSavedColorsForProperty
  } = useTheme();
  const [localColors, setLocalColors] = useState(customColors);

  // Sync localColors when customColors change from context
  useEffect(() => {
    setLocalColors(customColors);
  }, [customColors]);

  const handleColorChange = (property: keyof typeof customColors.sidebar, value: string) => {
    const newColors = {
      ...localColors,
      sidebar: {
        ...localColors.sidebar,
        [property]: value,
      },
    };
    setLocalColors(newColors);
  };

  const handleHexColorChange = (property: keyof typeof customColors.sidebar, hexColor: string) => {
    if (hexColor) {
      // Use the proper hexToTailwindClass function to generate the correct Tailwind class
      const tailwindClass = hexToTailwindClass(hexColor, property);
      
      // Update the hex color in the context
      updateHexColor('sidebar', property, hexColor);
      
      // Update local colors with the proper Tailwind class
      const newColors = {
        ...localColors,
        sidebar: {
          ...localColors.sidebar,
          [property]: tailwindClass,
        },
      };
      setLocalColors(newColors);
    } else {
      // If hex color is cleared, revert to the original custom color or default
      const originalColor = customColors.sidebar[property];
      const newColors = {
        ...localColors,
        sidebar: {
          ...localColors.sidebar,
          [property]: originalColor,
        },
      };
      setLocalColors(newColors);
    }
  };

  const handleSaveColor = (hexColor: string, name: string, property: keyof typeof customColors.sidebar) => {
    saveCustomColor(hexColor, name, property, 'sidebar');
  };

  const handleRemoveColor = (id: string) => {
    removeSavedColor(id);
  };

  const handleSave = () => {
    updateCustomColors(localColors);
  };

  const handleReset = () => {
    setLocalColors(customColors);
    resetCustomColors();
  };

  const ColorSelector = ({ 
    title, 
    value, 
    options, 
    onChange,
    property
  }: { 
    title: string; 
    value: string; 
    options: typeof colorOptions; 
    onChange: (value: string) => void;
    property: keyof typeof customColors.sidebar;
  }) => {
    const savedColors = getSavedColorsForProperty(property, 'sidebar');
    
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </label>
        
        {/* Custom Color Picker */}
        <CustomColorPicker
          title=""
          value={value}
          onChange={onChange}
          onHexChange={(hexColor) => handleHexColorChange(property, hexColor)}
          currentHexColor={getHexColor('sidebar', property)}
          savedColors={savedColors}
          onSaveColor={(hexColor, name) => handleSaveColor(hexColor, name, property)}
          onRemoveColor={handleRemoveColor}
          property={property}
          component="sidebar"
        />
        
        {/* Predefined Options */}
        <div className="grid grid-cols-4 gap-2">
          {options.map((option) => (
            <button
              key={option.name}
              onClick={() => onChange(option.value)}
              className={`p-3 rounded-lg border-2 transition-all ${
                value === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {option.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Chat</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Palette className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Theme Configuration
              </h1>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Sidebar Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Sidebar Colors
            </h2>
            <div className="space-y-6">
              <ColorSelector
                title="Background"
                value={localColors.sidebar.background}
                options={colorOptions}
                onChange={(value) => handleColorChange('background', value)}
                property="background"
              />
              
              <ColorSelector
                title="Border"
                value={localColors.sidebar.border}
                options={borderOptions}
                onChange={(value) => handleColorChange('border', value)}
                property="border"
              />
              
              <ColorSelector
                title="Text Color"
                value={localColors.sidebar.text}
                options={textOptions}
                onChange={(value) => handleColorChange('text', value)}
                property="text"
              />
              
              <ColorSelector
                title="Secondary Text"
                value={localColors.sidebar.textSecondary}
                options={textOptions}
                onChange={(value) => handleColorChange('textSecondary', value)}
                property="textSecondary"
              />
              
              <ColorSelector
                title="Hover State"
                value={localColors.sidebar.hover}
                options={hoverOptions}
                onChange={(value) => handleColorChange('hover', value)}
                property="hover"
              />
              
              <ColorSelector
                title="Active State"
                value={localColors.sidebar.active}
                options={activeOptions}
                onChange={(value) => handleColorChange('active', value)}
                property="active"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Live Preview
            </h2>
            <div className={`w-full min-h-96 rounded-lg border ${localColors.sidebar.border} ${localColors.sidebar.background} p-4`}>
              <div className="space-y-3">
                <h3 className={`text-sm font-medium ${localColors.sidebar.textSecondary}`}>
                  Recent Chats
                </h3>
                
                {/* Sample Chat Items */}
                <div className="space-y-2">
                  <div className={`p-3 rounded-md text-sm ${localColors.sidebar.text} ${localColors.sidebar.hover} cursor-pointer`}>
                    <div className="font-medium">Sample Chat 1</div>
                    <div className={`text-xs ${localColors.sidebar.textSecondary} mt-1`}>
                      GPT-4
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-md text-sm ${localColors.sidebar.active} cursor-pointer`}>
                    <div className="font-medium">Sample Chat 2 (Active)</div>
                    <div className={`text-xs ${localColors.sidebar.textSecondary} mt-1`}>
                      Claude-3
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-md text-sm ${localColors.sidebar.text} ${localColors.sidebar.hover} cursor-pointer`}>
                    <div className="font-medium">Sample Chat 3</div>
                    <div className={`text-xs ${localColors.sidebar.textSecondary} mt-1`}>
                      Gemini Pro
                    </div>
                  </div>
                </div>
                
                {/* Sample Model Info */}
                <div className={`pt-4 border-t ${localColors.sidebar.border}`}>
                  <h3 className={`text-sm font-medium ${localColors.sidebar.textSecondary} mb-2`}>
                    Available Models
                  </h3>
                  <div className="space-y-1">
                    <div className={`text-xs ${localColors.sidebar.text}`}>GPT-4</div>
                    <div className={`text-xs ${localColors.sidebar.text}`}>Claude-3</div>
                    <div className={`text-xs ${localColors.sidebar.text}`}>Gemini Pro</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            How to Use Custom Colors
          </h3>
          <div className="text-blue-800 dark:text-blue-200 space-y-2">
            <p>• Click "Custom Color" to enter a hex color code (e.g., #FF5733)</p>
            <p>• Use the "Save" button to save custom colors for future use</p>
            <p>• Saved colors will appear as selectable options in the "Saved Colors" section</p>
            <p>• Click on any saved color to apply it instantly</p>
            <p>• Use the trash icon to remove saved colors you no longer need</p>
          </div>
        </div>
      </div>
    </div>
  );
} 