import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copyKfcDataToPublic() {
  try {
    console.log('📁 Copying KFC data to public directory...');
    
    const sourcePath = path.join(__dirname, '..', 'kfcpoints.json');
    const targetPath = path.join(__dirname, '..', 'public', 'kfcpoints.json');
    
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      console.error('❌ Source file kfcpoints.json not found');
      return;
    }
    
    // Create public directory if it doesn't exist
    const publicDir = path.dirname(targetPath);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
      console.log('📁 Created public directory');
    }
    
    // Copy the file
    fs.copyFileSync(sourcePath, targetPath);
    console.log('✅ Successfully copied kfcpoints.json to public directory');
    
    // Verify the copy
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      console.log(`📊 File size: ${stats.size} bytes`);
    }
    
  } catch (error) {
    console.error('❌ Error copying KFC data:', error.message);
  }
}

// Run the function
copyKfcDataToPublic(); 