#!/usr/bin/env node

/**
 * Vector-Aware Embedding Regeneration Script
 * 
 * Uses the new consolidated vectorEmbeddingService to regenerate embeddings
 * with vector search prompt enhancement and dynamic learning capabilities.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
function loadEnvironmentVariables() {
  const envPaths = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env')
  ];
  
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            process.env[key] = value;
          }
        }
      }
      
      console.log(`✓ Loaded environment variables from: ${envPath}`);
      break;
    }
  }
}

class VectorEmbeddingRegenerator {
  constructor() {
    this.convexClient = null;
    this.api = null;
  }

  async initialize() {
    console.log('🚀 Initializing Vector-Aware Embedding Regenerator...');
    
    try {
      // Load environment variables
      loadEnvironmentVariables();

      // Initialize Convex client
      const { ConvexHttpClient } = await import('convex/browser');
      const { api } = await import('../convex/_generated/api.js');
      
      if (!process.env.VITE_CONVEX_URL) {
        throw new Error('VITE_CONVEX_URL environment variable not set');
      }

      this.convexClient = new ConvexHttpClient(process.env.VITE_CONVEX_URL);
      this.api = api;
      
      console.log('✓ Convex client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      throw error;
    }
  }

  async analyzeCurrentStatus() {
    console.log('📊 Analyzing current embedding status...');
    
    try {
      // Get current data
      const jobsResult = await this.convexClient.query(this.api.dataManagement.getAllJobPostings, { limit: 5000 });
      const resumesResult = await this.convexClient.query(this.api.dataManagement.getAllResumes, { limit: 5000 });

      const jobs = jobsResult.jobs || [];
      const resumes = resumesResult.resumes || [];

      // Analyze embedding status
      const jobsWithEmbeddings = jobs.filter(job => job.embedding && job.embedding.length > 0);
      const resumesWithEmbeddings = resumes.filter(resume => resume.embedding && resume.embedding.length > 0);
      
      const jobsWithVectorPrompts = jobs.filter(job => job.vectorPromptsUsed && job.vectorPromptsUsed.length > 0);
      const resumesWithVectorPrompts = resumes.filter(resume => resume.vectorPromptsUsed && resume.vectorPromptsUsed.length > 0);

      const analysis = {
        jobs: {
          total: jobs.length,
          withEmbeddings: jobsWithEmbeddings.length,
          withVectorPrompts: jobsWithVectorPrompts.length,
          needsVectorUpgrade: jobsWithEmbeddings.length - jobsWithVectorPrompts.length,
          needsEmbeddings: jobs.length - jobsWithEmbeddings.length
        },
        resumes: {
          total: resumes.length,
          withEmbeddings: resumesWithEmbeddings.length,
          withVectorPrompts: resumesWithVectorPrompts.length,
          needsVectorUpgrade: resumesWithEmbeddings.length - resumesWithVectorPrompts.length,
          needsEmbeddings: resumes.length - resumesWithEmbeddings.length
        }
      };

      console.log('\n📈 Current Status:');
      console.log(`Jobs: ${analysis.jobs.withEmbeddings}/${analysis.jobs.total} have embeddings (${analysis.jobs.withVectorPrompts} vector-enhanced)`);
      console.log(`Resumes: ${analysis.resumes.withEmbeddings}/${analysis.resumes.total} have embeddings (${analysis.resumes.withVectorPrompts} vector-enhanced)`);
      console.log(`Vector upgrades needed: ${analysis.jobs.needsVectorUpgrade + analysis.resumes.needsVectorUpgrade} documents`);
      
      return analysis;
    } catch (error) {
      console.error('❌ Failed to analyze status:', error);
      throw error;
    }
  }

  async regenerateEmbeddings(collections = ['jobpostings', 'resumes'], forceRegenerate = false) {
    console.log(`\n🔄 Starting vector-aware embedding regeneration...`);
    console.log(`Collections: ${collections.join(', ')}`);
    console.log(`Force regenerate: ${forceRegenerate ? 'YES' : 'NO'}`);
    
    const results = {
      startTime: Date.now(),
      collections: {},
      totalProcessed: 0,
      totalSuccessful: 0,
      totalErrors: 0
    };

    for (const collection of collections) {
      console.log(`\n📝 Processing ${collection}...`);
      
      try {
        const result = await this.convexClient.action(
          this.api.vectorEmbeddingService.generateBatchVectorEmbeddings,
          {
            collection,
            batchSize: 5, // Smaller batch size for better monitoring
            forceRegenerate
          }
        );

        results.collections[collection] = result;
        results.totalProcessed += result.total;
        results.totalSuccessful += result.successful;
        results.totalErrors += result.failed;

        console.log(`✓ ${collection}: ${result.successful}/${result.total} successful`);
        if (result.failed > 0) {
          console.log(`⚠️  ${result.failed} failed - check errors:`, result.errors.slice(0, 3));
        }

      } catch (error) {
        console.error(`❌ Failed to process ${collection}:`, error.message);
        results.collections[collection] = { error: error.message };
        results.totalErrors++;
      }
    }

    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;

    return results;
  }

  async validateResults() {
    console.log('\n🔍 Validating regeneration results...');
    
    try {
      // Re-analyze status after regeneration
      const newAnalysis = await this.analyzeCurrentStatus();
      
      // Check for novel user queries
      const novelQueries = await this.convexClient.query(this.api.vectorEmbeddingQueries.getNovelUserQueries, {
        minUsageCount: 2,
        limit: 10
      });

      console.log('\n📊 Post-Regeneration Status:');
      console.log(`Jobs with vector prompts: ${newAnalysis.jobs.withVectorPrompts}/${newAnalysis.jobs.total}`);
      console.log(`Resumes with vector prompts: ${newAnalysis.resumes.withVectorPrompts}/${newAnalysis.resumes.total}`);
      
      if (novelQueries && novelQueries.length > 0) {
        console.log(`\n💡 Found ${novelQueries.length} novel search patterns for prompt enhancement:`);
        novelQueries.slice(0, 5).forEach((query, index) => {
          console.log(`   ${index + 1}. "${query.query}" (used ${query.usageCount} times)`);
        });
      }

      return { newAnalysis, novelQueries };
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  async run(options = {}) {
    const {
      collections = ['jobpostings', 'resumes'],
      forceRegenerate = false,
      validateOnly = false
    } = options;

    try {
      await this.initialize();

      // Phase 1: Analyze current status
      const initialAnalysis = await this.analyzeCurrentStatus();

      if (validateOnly) {
        console.log('\n✅ Validation-only mode completed');
        return { initialAnalysis };
      }

      // Phase 2: Regenerate embeddings
      const regenerationResults = await this.regenerateEmbeddings(collections, forceRegenerate);

      // Phase 3: Validate results
      const validation = await this.validateResults();

      // Phase 4: Summary
      console.log('\n🎉 Vector-aware embedding regeneration completed!');
      console.log(`⏱️  Total time: ${Math.round(regenerationResults.duration / 1000)}s`);
      console.log(`✅ Successful: ${regenerationResults.totalSuccessful}`);
      console.log(`❌ Errors: ${regenerationResults.totalErrors}`);
      
      if (regenerationResults.totalErrors === 0) {
        console.log('\n🚀 All embeddings now include vector prompt enhancement!');
        console.log('💡 Users can now benefit from improved semantic search accuracy.');
      } else {
        console.log('\n⚠️  Some errors occurred. Check the logs above for details.');
      }

      return {
        initialAnalysis,
        regenerationResults,
        validation
      };

    } catch (error) {
      console.error('\n💥 Regeneration failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    forceRegenerate: args.includes('--force'),
    validateOnly: args.includes('--validate-only'),
    collections: ['jobpostings', 'resumes']
  };

  // Parse collection arguments
  if (args.includes('--jobs-only')) {
    options.collections = ['jobpostings'];
  } else if (args.includes('--resumes-only')) {
    options.collections = ['resumes'];
  }

  console.log('🎯 Vector-Aware Embedding Regeneration');
  console.log('=====================================\n');

  if (options.validateOnly) {
    console.log('🔍 Running validation only...');
  } else if (options.forceRegenerate) {
    console.log('⚠️  Force regeneration mode - will regenerate ALL embeddings');
  } else {
    console.log('🔄 Incremental mode - will only upgrade embeddings that need vector enhancement');
  }

  try {
    const regenerator = new VectorEmbeddingRegenerator();
    const results = await regenerator.run(options);
    
    if (!options.validateOnly) {
      console.log('\n📋 Next steps:');
      console.log('1. Test the enhanced search functionality');
      console.log('2. Monitor novel query patterns in the admin interface');
      console.log('3. Consider adding frequent queries to the static prompt library');
    }

    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default VectorEmbeddingRegenerator;

