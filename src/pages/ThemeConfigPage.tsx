import { useTheme } from '../lib/ThemeContext';
import { hexToTailwindClass } from '../lib/ThemeContext';
import { useState, useEffect } from 'react';
import { ArrowLeft, Palette, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CustomColorPicker } from '../components/CustomColorPicker';

// Predefined color options for easy selection
const colorOptions = [
  { name: 'Default', value: 'bg-berkeley-blue-DEFAULT bg-berkeley-blue-DEFAULT' },
  { name: 'Blue', value: 'bg-blue-50 bg-yale-blue-500' },
  { name: 'Green', value: 'bg-green-50' },
  { name: 'Purple', value: 'bg-purple-50' },
  { name: 'Pink', value: 'bg-pink-50' },
  { name: 'Yellow', value: 'bg-yellow-50' },
  { name: 'Red', value: 'bg-red-50' },
  { name: 'Indigo', value: 'bg-indigo-50' },
];

const borderOptions = [
  { name: 'Default', value: 'border-yale-blue-300' },
  { name: 'Blue', value: 'border-blue-200' },
  { name: 'Green', value: 'border-green-200' },
  { name: 'Purple', value: 'border-purple-200' },
  { name: 'Pink', value: 'border-pink-200' },
  { name: 'Yellow', value: 'border-yellow-200' },
  { name: 'Red', value: 'border-red-200' },
  { name: 'Indigo', value: 'border-indigo-200' },
];

const textOptions = [
  { name: 'Default', value: 'text-mint-cream-500' },
  { name: 'Blue', value: 'text-mint-cream-DEFAULT text-mint-cream-DEFAULT' },
  { name: 'Green', value: 'text-green-700' },
  { name: 'Purple', value: 'text-purple-700' },
  { name: 'Pink', value: 'text-pink-700' },
  { name: 'Yellow', value: 'text-yellow-700' },
  { name: 'Red', value: 'text-red-700' },
  { name: 'Indigo', value: 'text-indigo-700' },
];

const hoverOptions = [
  { name: 'Default', value: 'hover:bg-mint-cream-800' },
  { name: 'Blue', value: 'hover:bg-yale-blue-500' },
  { name: 'Green', value: 'hover:bg-green-100' },
  { name: 'Purple', value: 'hover:bg-purple-100' },
  { name: 'Pink', value: 'hover:bg-pink-100' },
  { name: 'Yellow', value: 'hover:bg-yellow-100' },
  { name: 'Red', value: 'hover:bg-red-100' },
  { name: 'Indigo', value: 'hover:bg-indigo-100' },
];

const activeOptions = [
  { name: 'Default', value: 'bg-yale-blue-500 bg-yale-blue-500 text-mint-cream-DEFAULT text-mint-cream-DEFAULT' },
  { name: 'Green', value: 'bg-green-100 text-green-700' },
  { name: 'Purple', value: 'bg-purple-100 text-purple-700' },
  { name: 'Pink', value: 'bg-pink-100 text-pink-700' },
  { name: 'Yellow', value: 'bg-yellow-100 text-yellow-700' },
  { name: 'Red', value: 'bg-red-100 text-red-700' },
  { name: 'Indigo', value: 'bg-indigo-100 text-indigo-700' },
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
        <label className="block text-sm font-medium text-mint-cream-500">
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
              className={`p-3 rounded-lg border-2 transition-all ${ value === option.value ? 'border-powder-blue-600 bg-blue-50 bg-yale-blue-500/20' : 'border-yale-blue-300 hover:border-yale-blue-400' }`}
            >
              <div className="text-xs font-medium text-mint-cream-500">
                {option.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-mint-cream-900 bg-oxford-blue-DEFAULT">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="flex items-center space-x-2 text-mint-cream-600 hover:text-mint-cream-DEFAULT transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Chat</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Palette className="w-6 h-6 text-powder-blue-600" />
              <h1 className="text-2xl font-bold text-mint-cream-DEFAULT">
                Theme Configuration
              </h1>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-4 py-2 text-mint-cream-600 hover:text-mint-cream-DEFAULT transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-yale-blue-DEFAULT text-white rounded-md hover:bg-yale-blue-600 transition-colors font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Sidebar Configuration */}
          <div className="bg-berkeley-blue-DEFAULT rounded-lg border border-yale-blue-300 p-6">
            <h2 className="text-lg font-semibold text-mint-cream-DEFAULT mb-6">
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
          <div className="bg-berkeley-blue-DEFAULT rounded-lg border border-yale-blue-300 p-6">
            <h2 className="text-lg font-semibold text-mint-cream-DEFAULT mb-6">
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
        <div className="bg-blue-50 bg-yale-blue-500/20 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How to Use Custom Colors
          </h3>
          <div className="text-blue-800 space-y-2">
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