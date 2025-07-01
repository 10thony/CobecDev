import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

async function checkJustinResume() {
  let client;
  
  try {
    console.log('🔍 Examining Justin Martinez Resume...\n');
    
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('workdemos');
    const resumesCollection = db.collection('resumes');
    
    // Find Justin Martinez's resume
    const justinResume = await resumesCollection.findOne({
      $or: [
        { 'personalInfo.firstName': 'Justin' },
        { 'personalInfo.lastName': 'Martinez' },
        { 'personalInfo.email': { $regex: 'justin', $options: 'i' } },
        { 'personalInfo.email': { $regex: 'martinez', $options: 'i' } }
      ]
    });
    
    if (!justinResume) {
      console.log('❌ Justin Martinez resume not found');
      return;
    }
    
    console.log('📄 Justin Martinez Resume Details:');
    console.log('='.repeat(50));
    
    // Personal Info
    console.log('\n👤 Personal Information:');
    console.log(`   Name: ${justinResume.personalInfo?.firstName || ''} ${justinResume.personalInfo?.lastName || ''}`);
    console.log(`   Email: ${justinResume.personalInfo?.email || 'N/A'}`);
    console.log(`   Phone: ${justinResume.personalInfo?.phone || 'N/A'}`);
    console.log(`   Years of Experience: ${justinResume.personalInfo?.yearsOfExperience || 'N/A'}`);
    
    // Skills
    if (justinResume.skills && Array.isArray(justinResume.skills)) {
      console.log('\n🛠️  Skills:');
      console.log(`   ${justinResume.skills.join(', ')}`);
      
      // Check for iOS-related skills
      const iosSkills = justinResume.skills.filter(skill => 
        skill.toLowerCase().includes('ios') || 
        skill.toLowerCase().includes('swift') || 
        skill.toLowerCase().includes('objective') ||
        skill.toLowerCase().includes('xcode') ||
        skill.toLowerCase().includes('iphone') ||
        skill.toLowerCase().includes('ipad') ||
        skill.toLowerCase().includes('apple') ||
        skill.toLowerCase().includes('mobile')
      );
      
      if (iosSkills.length > 0) {
        console.log('\n📱 iOS/Mobile Skills Found:');
        iosSkills.forEach(skill => console.log(`   ✅ ${skill}`));
      }
    }
    
    // Professional Summary
    if (justinResume.professionalSummary) {
      console.log('\n📝 Professional Summary:');
      console.log(`   ${justinResume.professionalSummary}`);
    }
    
    // Experience
    if (justinResume.experience && Array.isArray(justinResume.experience)) {
      console.log('\n💼 Experience:');
      justinResume.experience.forEach((exp, index) => {
        console.log(`\n   ${index + 1}. ${exp.title || 'N/A'} at ${exp.company || 'N/A'}`);
        console.log(`      Duration: ${exp.duration || 'N/A'}`);
        if (exp.responsibilities && Array.isArray(exp.responsibilities)) {
          console.log(`      Responsibilities:`);
          exp.responsibilities.forEach(resp => console.log(`        • ${resp}`));
        }
      });
    }
    
    // Education
    if (justinResume.education && Array.isArray(justinResume.education)) {
      console.log('\n🎓 Education:');
      justinResume.education.forEach(edu => console.log(`   • ${edu}`));
    }
    
    // Original Text (first 500 characters)
    if (justinResume.originalText) {
      console.log('\n📄 Original Text Preview:');
      console.log(`   ${justinResume.originalText.substring(0, 500)}...`);
    }
    
    // Check for iOS-related content in original text
    if (justinResume.originalText) {
      const iosTerms = ['ios', 'swift', 'objective-c', 'xcode', 'iphone', 'ipad', 'apple', 'mobile development'];
      const foundTerms = iosTerms.filter(term => 
        justinResume.originalText.toLowerCase().includes(term.toLowerCase())
      );
      
      if (foundTerms.length > 0) {
        console.log('\n🔍 iOS Terms Found in Original Text:');
        foundTerms.forEach(term => console.log(`   ✅ ${term}`));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

checkJustinResume().catch(console.error); 