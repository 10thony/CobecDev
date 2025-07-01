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

async function findIOSDevelopers() {
  let client;
  
  try {
    console.log('🔍 Finding iOS Developers in Database...\n');
    
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
    
    // Search for iOS-related content
    const iosTerms = ['ios', 'swift', 'objective-c', 'xcode', 'iphone', 'ipad', 'apple', 'mobile development'];
    const iosDevelopers = [];
    
    const resumes = await resumesCollection.find({}).toArray();
    console.log(`📊 Scanning ${resumes.length} resumes for iOS content...`);
    
    for (const resume of resumes) {
      const name = resume.personalInfo?.firstName && resume.personalInfo?.lastName 
        ? `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}`
        : resume.filename || 'Unknown';
      
      const email = resume.personalInfo?.email || 'N/A';
      
      // Check skills
      let iosSkills = [];
      if (resume.skills && Array.isArray(resume.skills)) {
        iosSkills = resume.skills.filter(skill => 
          iosTerms.some(term => skill.toLowerCase().includes(term.toLowerCase()))
        );
      }
      
      // Check original text
      let iosInText = [];
      if (resume.originalText) {
        iosInText = iosTerms.filter(term => 
          resume.originalText.toLowerCase().includes(term.toLowerCase())
        );
      }
      
      // Check professional summary
      let iosInSummary = [];
      if (resume.professionalSummary) {
        iosInSummary = iosTerms.filter(term => 
          resume.professionalSummary.toLowerCase().includes(term.toLowerCase())
        );
      }
      
      // If any iOS content found, add to list
      if (iosSkills.length > 0 || iosInText.length > 0 || iosInSummary.length > 0) {
        iosDevelopers.push({
          name,
          email,
          iosSkills,
          iosInText,
          iosInSummary,
          resume
        });
      }
    }
    
    console.log(`\n📱 Found ${iosDevelopers.length} iOS-related developers:`);
    console.log('='.repeat(80));
    
    iosDevelopers.forEach((dev, index) => {
      console.log(`\n${index + 1}. ${dev.name}`);
      console.log(`   Email: ${dev.email}`);
      
      if (dev.iosSkills.length > 0) {
        console.log(`   iOS Skills: ${dev.iosSkills.join(', ')}`);
      }
      
      if (dev.iosInText.length > 0) {
        console.log(`   iOS Terms in Text: ${dev.iosInText.join(', ')}`);
      }
      
      if (dev.iosInSummary.length > 0) {
        console.log(`   iOS Terms in Summary: ${dev.iosInSummary.join(', ')}`);
      }
      
      // Show a preview of their iOS experience
      if (dev.resume.professionalSummary) {
        const summary = dev.resume.professionalSummary;
        const iosSentences = summary.split('.').filter(sentence => 
          iosTerms.some(term => sentence.toLowerCase().includes(term.toLowerCase()))
        );
        
        if (iosSentences.length > 0) {
          console.log(`   iOS Experience: ${iosSentences[0].trim()}...`);
        }
      }
    });
    
    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total iOS developers found: ${iosDevelopers.length}`);
    console.log(`   Developers with iOS skills: ${iosDevelopers.filter(d => d.iosSkills.length > 0).length}`);
    console.log(`   Developers with iOS in text: ${iosDevelopers.filter(d => d.iosInText.length > 0).length}`);
    console.log(`   Developers with iOS in summary: ${iosDevelopers.filter(d => d.iosInSummary.length > 0).length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

findIOSDevelopers().catch(console.error); 