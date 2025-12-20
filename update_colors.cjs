const fs = require('fs');
const path = require('path');

// Color mapping for replacing old Tailwind classes with new color scheme
const colorMappings = {
  // Background colors
  'bg-gray-50': 'bg-mint-cream-900',
  'bg-gray-100': 'bg-mint-cream-800',
  'bg-white': 'bg-berkeley-blue-DEFAULT',
  'dark:bg-gray-800': 'bg-berkeley-blue-DEFAULT',
  'dark:bg-gray-900': 'bg-oxford-blue-DEFAULT',
  'bg-gray-800': 'bg-berkeley-blue-DEFAULT',
  'bg-gray-900': 'bg-oxford-blue-DEFAULT',
  
  // Text colors
  'text-gray-600': 'text-mint-cream-600',
  'text-gray-700': 'text-mint-cream-500',
  'text-gray-900': 'text-mint-cream-DEFAULT',
  'text-gray-300': 'text-mint-cream-700',
  'dark:text-gray-300': 'text-mint-cream-600',
  'dark:text-white': 'text-mint-cream-DEFAULT',
  
  // Border colors
  'border-gray-200': 'border-yale-blue-300',
  'border-gray-300': 'border-yale-blue-400',
  'border-gray-700': 'border-yale-blue-300',
  'dark:border-gray-700': 'border-yale-blue-300',
  
  // Hover states
  'hover:bg-gray-50': 'hover:bg-yale-blue-400',
  'hover:bg-gray-100': 'hover:bg-yale-blue-400',
  'hover:bg-gray-700': 'hover:bg-yale-blue-400',
  'dark:hover:bg-gray-700': 'hover:bg-yale-blue-400',
  'hover:text-gray-900': 'hover:text-mint-cream-DEFAULT',
  'hover:text-white': 'hover:text-mint-cream-DEFAULT',
  
  // Blue colors for buttons
  'bg-blue-600': 'bg-yale-blue-DEFAULT',
  'hover:bg-blue-700': 'hover:bg-yale-blue-600',
  'text-blue-600': 'text-powder-blue-600',
  'bg-blue-100': 'bg-yale-blue-500',
  'dark:bg-blue-900': 'bg-yale-blue-500',
  'text-blue-700': 'text-mint-cream-DEFAULT',
  'dark:text-blue-300': 'text-mint-cream-DEFAULT',
};

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const [oldClass, newClass] of Object.entries(colorMappings)) {
      const regex = new RegExp(oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.includes(oldClass)) {
        content = content.replace(regex, newClass);
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('node_modules') && !file.startsWith('.') && file !== 'dist') {
      processDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      processFile(filePath);
    }
  }
}

// Start processing from src directory
const srcDir = path.join(__dirname, 'src');
console.log(`Processing files in ${srcDir}...`);
processDirectory(srcDir);
console.log('Color update complete!');

