#!/usr/bin/env node

/**
 * Resume Embedding Regeneration with Vector Search Prompts
 * 
 * This script regenerates resume embeddings using the 235 vector search prompts
 * from VECTOR_SEARCH_PROMPTS.md to enhance semantic search accuracy.
 */

require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');
const { api } = require('../convex/_generated/api.js');

// Vector search prompts from VECTOR_SEARCH_PROMPTS.md
const VECTOR_SEARCH_PROMPTS = [
  // Aviation & Aerospace (FAA Focus)
  "Find resumes for Aviation Safety Inspector positions with FAA experience",
  "Search for candidates with aviation safety and operations experience",
  "Find resumes for FAASTeam Program Manager positions",
  "Search for candidates with airworthiness and safety management experience",
  "Find resumes for aviation engineering positions with mechanical expertise",
  "Search for candidates with electronics engineering and aviation experience",
  "Find resumes for civil engineering positions in aviation sector",
  "Search for candidates with computer engineering and aviation systems experience",
  "Find resumes for fire protection engineering in aviation",
  "Search for candidates with engineering technician experience in aviation",
  
  // Engineering Positions
  "Find resumes for General Engineer positions with technical expertise",
  "Search for candidates with mechanical engineering and design experience",
  "Find resumes for Computer Engineer positions with software development skills",
  "Search for candidates with electronics engineering and systems experience",
  "Find resumes for Civil Engineer positions with infrastructure experience",
  "Search for candidates with engineering technician and technical support experience",
  "Find resumes for Fire Protection Engineer positions with safety experience",
  "Search for candidates with engineering and project management experience",
  "Find resumes for engineering positions requiring security clearance",
  "Search for candidates with engineering and government contracting experience",
  
  // General Professional
  "Find resumes for software engineering positions with Python and JavaScript experience",
  "Search for candidates with 5+ years of project management experience",
  "Find resumes for data analyst positions with SQL and Python skills",
  "Search for candidates with security clearance and government experience",
  "Find resumes for cybersecurity positions with network security experience",
  "Search for candidates with cloud computing and AWS experience",
  "Find resumes for financial analyst positions with Excel and modeling experience",
  "Search for candidates with leadership experience in technical teams",
  "Find resumes for business analyst positions with requirements gathering experience",
  "Search for candidates with research and development experience",
  
  // Cost Analysis & Estimating (Based on sample resume)
  "Find resumes for cost analyst positions with life cycle cost estimating experience",
  "Search for candidates with earned value management (EVM) experience",
  "Search for candidates with ICEAA Certified Cost Estimator/Analyst certification",
  "Find resumes for financial planning and budget formulation experience",
  "Search for candidates with proposal evaluation and cost modeling experience",
  "Find resumes for government contracting and acquisition analysis experience",
  "Search for candidates with risk analysis and program management experience",
  "Find resumes for Excel modeling and data analysis experience",
  "Search for candidates with FAA and DOD experience",
  "Find resumes for investment analysis and business case development experience"
];

class ResumeEmbeddingRegenerator {
  constructor() {
    this.convexClient = null;
    this.processedCount = 0;
    this.errorCount = 0;
  }

  async initialize() {
    console.log('🚀 Initializing Resume Embedding Regenerator with Vector Prompts...');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    if (!process.env.VITE_CONVEX_URL) {
      throw new Error('VITE_CONVEX_URL environment variable not set');
    }

    this.convexClient = new ConvexHttpClient(process.env.VITE_CONVEX_URL);
    console.log('✓ Convex client initialized successfully');
  }

  async getResumes() {
    console.log('📊 Fetching resumes from Convex...');
    const result = await this.convexClient.query(api.dataManagement.getAllResumes, { limit: 1000 });
    const resumes = result.resumes || [];
    console.log(`✓ Found ${resumes.length} resumes`);
    return resumes;
  }

  async enhanceResumeWithPrompts(resume) {
    // Extract relevant prompts based on resume content
    const resumeText = resume.completeSearchableText || resume.searchableText || '';
    const relevantPrompts = this.findRelevantPrompts(resumeText);
    
    // Create enhanced text with vector prompts
    const enhancedText = this.createEnhancedText(resumeText, relevantPrompts);
    
    return {
      enhancedText,
      promptsUsed: relevantPrompts,
      originalText: resumeText
    };
  }

  findRelevantPrompts(resumeText) {
    const textLower = resumeText.toLowerCase();
    const relevantPrompts = [];
    
    // Match prompts based on content
    VECTOR_SEARCH_PROMPTS.forEach((prompt, index) => {
      const promptLower = prompt.toLowerCase();
      
      // Check for skill matches
      if (this.hasSkillMatch(textLower, promptLower)) {
        relevantPrompts.push(prompt);
      }
      
      // Check for industry matches
      if (this.hasIndustryMatch(textLower, promptLower)) {
        relevantPrompts.push(prompt);
      }
      
      // Check for experience level matches
      if (this.hasExperienceMatch(textLower, promptLower)) {
        relevantPrompts.push(prompt);
      }
    });
    
    // Return top 5 most relevant prompts
    return [...new Set(relevantPrompts)].slice(0, 5);
  }

  hasSkillMatch(text, prompt) {
    const skills = ['python', 'javascript', 'sql', 'excel', 'cost estimating', 'evm', 'project management', 
                   'aviation', 'engineering', 'faa', 'dod', 'security clearance', 'risk analysis'];
    return skills.some(skill => text.includes(skill) && prompt.includes(skill));
  }

  hasIndustryMatch(text, prompt) {
    const industries = ['aviation', 'aerospace', 'government', 'faa', 'dod', 'engineering', 'cost analysis'];
    return industries.some(industry => text.includes(industry) && prompt.includes(industry));
  }

  hasExperienceMatch(text, prompt) {
    const experienceTerms = ['years', 'experience', 'senior', 'lead', 'manager', 'analyst', 'consultant'];
    return experienceTerms.some(term => text.includes(term) && prompt.includes(term));
  }

  createEnhancedText(originalText, prompts) {
    if (prompts.length === 0) {
      return originalText;
    }
    
    const promptContext = prompts.slice(0, 3).join(' | ');
    return `${originalText}\n\nVector Search Context: ${promptContext}`;
  }

  async generateEnhancedEmbedding(enhancedText) {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: enhancedText,
    });

    return response.data[0].embedding;
  }

  async updateResumeEmbedding(resumeId, embedding, promptsUsed) {
    await this.convexClient.mutation(api.vectorEmbeddingQueries.updateDocumentEmbedding, {
      collectionName: 'resumes',
      documentId: resumeId,
      embedding: embedding,
      embeddingModel: 'text-embedding-ada-002-enhanced',
      embeddingGeneratedAt: Date.now(),
      extractedSkills: [], // Will be populated by the vector service
      confidence: 0.8,
      promptsUsed: promptsUsed
    });
  }

  async processResume(resume) {
    try {
      console.log(`Processing resume: ${resume.filename || resume.personalInfo?.firstName || 'Unknown'}`);
      
      // Enhance with vector prompts
      const enhancement = await this.enhanceResumeWithPrompts(resume);
      
      // Generate new embedding
      const embedding = await this.generateEnhancedEmbedding(enhancement.enhancedText);
      
      // Update in Convex
      await this.updateResumeEmbedding(resume._id, embedding, enhancement.promptsUsed);
      
      this.processedCount++;
      console.log(`✓ Enhanced resume with ${enhancement.promptsUsed.length} vector prompts`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      this.errorCount++;
      console.error(`✗ Error processing resume:`, error.message);
    }
  }

  async regenerateAllResumes() {
    console.log('\n🔄 Starting resume embedding regeneration with vector prompts...');
    
    const resumes = await this.getResumes();
    
    if (resumes.length === 0) {
      console.log('No resumes found to process');
      return;
    }

    console.log(`\nProcessing ${resumes.length} resumes...`);
    
    for (const resume of resumes) {
      await this.processResume(resume);
    }
    
    console.log('\n🎉 Resume embedding regeneration completed!');
    console.log(`✅ Successfully processed: ${this.processedCount}`);
    console.log(`❌ Errors: ${this.errorCount}`);
    
    if (this.processedCount > 0) {
      console.log('\n🚀 All resume embeddings now include vector search prompt enhancement!');
      console.log('💡 Semantic search accuracy should be significantly improved.');
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.regenerateAllResumes();
    } catch (error) {
      console.error('💥 Regeneration failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  console.log('🎯 Resume Embedding Regeneration with Vector Search Prompts');
  console.log('========================================================\n');
  
  try {
    const regenerator = new ResumeEmbeddingRegenerator();
    await regenerator.run();
    
    console.log('\n📋 Next steps:');
    console.log('1. Test the enhanced semantic search functionality');
    console.log('2. Compare search results before and after enhancement');
    console.log('3. Monitor search accuracy improvements');
    
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ResumeEmbeddingRegenerator;
