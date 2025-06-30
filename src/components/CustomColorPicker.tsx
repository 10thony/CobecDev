import { useState, useEffect } from 'react';
import { Eye, EyeOff, Palette, Save, Trash2 } from 'lucide-react';
import { isValidHexColor, SavedCustomColor, hexToTailwindClass } from '../lib/ThemeContext';

interface CustomColorPickerProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onHexChange?: (hexColor: string) => void;
  currentHexColor?: string | null;
  savedColors?: SavedCustomColor[];
  onSaveColor?: (hexColor: string, name: string) => void;
  onRemoveColor?: (id: string) => void;
  property: string;
  component: string;
}

export function CustomColorPicker({ 
  title, 
  value, 
  onChange, 
  onHexChange,
  currentHexColor,
  savedColors = [],
  onSaveColor,
  onRemoveColor,
  property,
  component
}: CustomColorPickerProps) {
  const [hexInput, setHexInput] = useState(currentHexColor || '');
  const [isValidHex, setIsValidHex] = useState(true);
  const [showHexInput, setShowHexInput] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [colorName, setColorName] = useState('');

  useEffect(() => {
    setHexInput(currentHexColor || '');
  }, [currentHexColor]);

  const handleHexInputChange = (input: string) => {
    setHexInput(input);
    
    // Validate hex color
    const isValid = input === '' || isValidHexColor(input);
    setIsValidHex(isValid);
  };

  const handleHexInputBlur = () => {
    if (hexInput && !isValidHexColor(hexInput)) {
      setHexInput(currentHexColor || '');
      setIsValidHex(true);
    }
  };

  const handleApplyHexColor = () => {
    if (hexInput && isValidHexColor(hexInput)) {
      onHexChange?.(hexInput);
      // Also apply the color immediately to the live preview
      onChange(hexToTailwindClass(hexInput, property));
    }
  };

  const handleClearHexColor = () => {
    setHexInput('');
    setIsValidHex(true);
    onHexChange?.('');
  };

  const handleSaveColor = () => {
    if (hexInput && isValidHexColor(hexInput) && colorName.trim() && onSaveColor) {
      onSaveColor(hexInput, colorName.trim());
      setColorName('');
      setShowSaveDialog(false);
    }
  };

  const handleSavedColorClick = (savedColor: SavedCustomColor) => {
    setHexInput(savedColor.hexColor);
    setIsValidHex(true);
    onHexChange?.(savedColor.hexColor);
    // Also apply the color immediately
    onChange(hexToTailwindClass(savedColor.hexColor, property));
  };

  const getPreviewStyle = () => {
    if (hexInput && isValidHexColor(hexInput)) {
      return { backgroundColor: hexInput };
    }
    return {};
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {title}
      </label>
      
      {/* Hex Color Input Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowHexInput(!showHexInput)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1 transition-colors"
          >
            <Palette className="w-4 h-4" />
            <span>Custom Color</span>
            {showHexInput ? <EyeOff className="w-4 h-4 ml-1" /> : <Eye className="w-4 h-4 ml-1" />}
          </button>
        </div>
        
        {showHexInput && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => handleHexInputChange(e.target.value)}
                  onBlur={handleHexInputBlur}
                  placeholder="#000000"
                  className={`w-24 px-3 py-2 text-sm border rounded-md transition-colors ${
                    isValidHex 
                      ? 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                      : 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                />
                {!isValidHex && (
                  <div className="absolute -bottom-6 left-0 text-xs text-red-500">
                    Invalid hex color
                  </div>
                )}
              </div>
              
              {/* Color Preview */}
              <div 
                className="w-10 h-10 rounded-md border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 shadow-sm"
                style={getPreviewStyle()}
              />
              
              {/* Apply Button */}
              {hexInput && isValidHexColor(hexInput) && (
                <button
                  type="button"
                  onClick={handleApplyHexColor}
                  className="px-3 py-2 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Apply
                </button>
              )}

              {/* Save Button */}
              {hexInput && isValidHexColor(hexInput) && onSaveColor && (
                <button
                  type="button"
                  onClick={() => setShowSaveDialog(true)}
                  className="px-3 py-2 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium flex items-center space-x-1"
                >
                  <Save className="w-3 h-3" />
                  <span>Save</span>
                </button>
              )}
            </div>
            
            {/* Clear Button */}
            {hexInput && (
              <button
                type="button"
                onClick={handleClearHexColor}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Clear custom color
              </button>
            )}
            
            {/* Help Text */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Enter a hex color code (e.g., #FF5733) to create a custom color
            </div>
          </div>
        )}
      </div>

      {/* Saved Colors Section */}
      {savedColors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Saved Colors
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {savedColors.map((savedColor) => (
              <div
                key={savedColor.id}
                className="relative group cursor-pointer"
                onClick={() => handleSavedColorClick(savedColor)}
              >
                <div
                  className="w-full h-12 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                  style={{ backgroundColor: savedColor.hexColor }}
                  title={savedColor.name}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {savedColor.name}
                  </div>
                </div>
                {onRemoveColor && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveColor(savedColor.id);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Color Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80 max-w-sm">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Save Custom Color
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color Name
                </label>
                <input
                  type="text"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="Enter a name for this color"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: hexInput }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{hexInput}</span>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleSaveColor}
                  disabled={!colorName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setColorName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 