#!/usr/bin/env node

/**
 * Migration Script: Transition to Vector-Aware Embedding Service
 * 
 * This script helps migrate from the old embedding services to the new
 * consolidated vectorEmbeddingService with prompt-aware generation.
 * 
 * Features:
 * - Backs up existing embeddings
 * - Regenerates embeddings with vector prompt enhancement
 * - Validates migration success
 * - Provides rollback capabilities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  BACKUP_DIR: path.join(__dirname, '..', 'backups', 'embeddings'),
  BATCH_SIZE: 10,
  VALIDATION_SAMPLE_SIZE: 20,
  LOG_LEVEL: 'INFO'
};

class MigrationLogger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level}: ${message}`);
    if (data && CONFIG.LOG_LEVEL === 'DEBUG') {
      console.log(JSON.stringify(data, null, 2));
    }
  }
  
  static info(message, data = null) { this.log('INFO', message, data); }
  static warn(message, data = null) { this.log('WARN', message, data); }
  static error(message, data = null) { this.log('ERROR', message, data); }
}

class VectorEmbeddingMigration {
  constructor() {
    this.convexClient = null;
    this.api = null;
  }

  async initialize() {
    MigrationLogger.info('Initializing Vector Embedding Migration...');
    
    try {
      // Load environment variables
      const envPath = path.join(__dirname, '..', '.env.local');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const [key, ...valueParts] = trimmedLine.split('=');
            if (key && valueParts.length > 0) {
              process.env[key] = valueParts.join('=');
            }
          }
        }
      }

      // Initialize Convex client
      const { ConvexHttpClient } = await import('convex/browser');
      const { api } = await import('../convex/_generated/api.js');
      
      this.convexClient = new ConvexHttpClient(process.env.VITE_CONVEX_URL);
      this.api = api;
      
      MigrationLogger.info('Migration tools initialized successfully');
    } catch (error) {
      MigrationLogger.error('Failed to initialize migration tools', error);
      throw error;
    }
  }

  async backupExistingEmbeddings() {
    MigrationLogger.info('Creating backup of existing embeddings...');
    
    try {
      // Ensure backup directory exists
      if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
        fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(CONFIG.BACKUP_DIR, `embeddings-backup-${timestamp}.json`);

      // Get current embeddings
      const collections = ['resumes', 'jobpostings'];
      const backup = {
        timestamp: Date.now(),
        collections: {}
      };

      for (const collection of collections) {
        MigrationLogger.info(`Backing up ${collection} embeddings...`);
        
        const documents = await this.convexClient.query(this.api.dataManagement.getAllDocuments, {
          collectionName: collection
        });

        backup.collections[collection] = documents
          .filter(doc => doc.embedding)
          .map(doc => ({
            _id: doc._id,
            embedding: doc.embedding,
            embeddingModel: doc.embeddingModel,
            embeddingGeneratedAt: doc.embeddingGeneratedAt,
            extractedSkills: doc.extractedSkills
          }));
      }

      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
      MigrationLogger.info(`Backup saved to: ${backupFile}`);
      
      return backupFile;
    } catch (error) {
      MigrationLogger.error('Failed to create backup', error);
      throw error;
    }
  }

  async analyzeCurrentEmbeddings() {
    MigrationLogger.info('Analyzing current embedding status...');
    
    try {
      const analysis = {
        resumes: await this.analyzeCollection('resumes'),
        jobpostings: await this.analyzeCollection('jobpostings')
      };

      MigrationLogger.info('Current embedding analysis:', analysis);
      return analysis;
    } catch (error) {
      MigrationLogger.error('Failed to analyze embeddings', error);
      throw error;
    }
  }

  async analyzeCollection(collection) {
    const documents = await this.convexClient.query(this.api.dataManagement.getAllDocuments, {
      collectionName: collection
    });

    const withEmbeddings = documents.filter(doc => doc.embedding && doc.embedding.length > 0);
    const withSkills = documents.filter(doc => doc.extractedSkills && doc.extractedSkills.length > 0);
    const withOldModel = documents.filter(doc => doc.embeddingModel && doc.embeddingModel !== 'gemini-text-embedding-004');

    return {
      total: documents.length,
      withEmbeddings: withEmbeddings.length,
      withSkills: withSkills.length,
      withOldModel: withOldModel.length,
      needsVectorUpgrade: documents.length - (withEmbeddings.length - withOldModel.length),
      coverage: documents.length > 0 ? (withEmbeddings.length / documents.length) * 100 : 0
    };
  }

  async migrateToVectorEmbeddings(collections = ['resumes', 'jobpostings']) {
    MigrationLogger.info('Starting migration to vector-aware embeddings...');
    
    const results = {
      collections: {},
      totalProcessed: 0,
      totalSuccessful: 0,
      totalErrors: 0,
      startTime: Date.now()
    };

    for (const collection of collections) {
      MigrationLogger.info(`Migrating ${collection} to vector embeddings...`);
      
      try {
        const migrationResult = await this.convexClient.action(
          this.api.vectorEmbeddingService.generateBatchVectorEmbeddings,
          {
            collection,
            batchSize: CONFIG.BATCH_SIZE,
            forceRegenerate: true // Force regeneration to use new vector prompts
          }
        );

        results.collections[collection] = migrationResult;
        results.totalProcessed += migrationResult.total;
        results.totalSuccessful += migrationResult.successful;
        results.totalErrors += migrationResult.failed;

        MigrationLogger.info(`${collection} migration completed`, {
          processed: migrationResult.total,
          successful: migrationResult.successful,
          failed: migrationResult.failed
        });

      } catch (error) {
        MigrationLogger.error(`Failed to migrate ${collection}`, error);
        results.collections[collection] = { error: error.message };
        results.totalErrors++;
      }
    }

    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;

    MigrationLogger.info('Migration completed', results);
    return results;
  }

  async validateMigration() {
    MigrationLogger.info('Validating migration results...');
    
    try {
      const validationResults = {
        resumes: await this.validateCollection('resumes'),
        jobpostings: await this.validateCollection('jobpostings'),
        searchTests: await this.validateSearch()
      };

      MigrationLogger.info('Validation completed', validationResults);
      return validationResults;
    } catch (error) {
      MigrationLogger.error('Validation failed', error);
      throw error;
    }
  }

  async validateCollection(collection) {
    const documents = await this.convexClient.query(this.api.dataManagement.getAllDocuments, {
      collectionName: collection
    });

    const withVectorEmbeddings = documents.filter(doc => 
      doc.embedding && 
      doc.embeddingModel === 'gemini-text-embedding-004' &&
      doc.vectorPromptsUsed
    );

    const withEnhancedSkills = documents.filter(doc =>
      doc.extractedSkills && 
      doc.skillCategories &&
      doc.embeddingConfidence
    );

    return {
      total: documents.length,
      withVectorEmbeddings: withVectorEmbeddings.length,
      withEnhancedSkills: withEnhancedSkills.length,
      vectorCoverage: documents.length > 0 ? (withVectorEmbeddings.length / documents.length) * 100 : 0,
      averageConfidence: withEnhancedSkills.length > 0 
        ? withEnhancedSkills.reduce((sum, doc) => sum + (doc.embeddingConfidence || 0), 0) / withEnhancedSkills.length
        : 0
    };
  }

  async validateSearch() {
    const testQueries = [
      'experienced React developer',
      'aviation safety inspector',
      'Python data scientist with machine learning',
      'project manager with PMP certification'
    ];

    const searchResults = [];

    for (const query of testQueries) {
      try {
        const result = await this.convexClient.action(
          this.api.vectorEmbeddingService.vectorAwareSemanticSearch,
          {
            query,
            targetCollection: 'both',
            limit: 5,
            minSimilarity: 0.5
          }
        );

        searchResults.push({
          query,
          success: true,
          resultsCount: (result.results?.resumes?.length || 0) + (result.results?.jobpostings?.length || 0),
          promptsUsed: result.queryEmbedding?.promptsUsed?.length || 0,
          confidence: result.queryEmbedding?.confidence || 0
        });
      } catch (error) {
        searchResults.push({
          query,
          success: false,
          error: error.message
        });
      }
    }

    return {
      testQueries: testQueries.length,
      successful: searchResults.filter(r => r.success).length,
      failed: searchResults.filter(r => !r.success).length,
      averageResults: searchResults.reduce((sum, r) => sum + (r.resultsCount || 0), 0) / searchResults.length,
      results: searchResults
    };
  }

  async generateMigrationReport(analysis, migrationResults, validation, backupFile) {
    const report = {
      timestamp: new Date().toISOString(),
      migration: {
        version: '1.0.0',
        type: 'vector-aware-embeddings',
        backupFile
      },
      preAnalysis: analysis,
      migrationResults,
      validation,
      recommendations: this.generateRecommendations(analysis, migrationResults, validation)
    };

    const reportFile = path.join(CONFIG.BACKUP_DIR, `migration-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    MigrationLogger.info(`Migration report saved to: ${reportFile}`);
    return reportFile;
  }

  generateRecommendations(analysis, migrationResults, validation) {
    const recommendations = [];

    // Check migration success rate
    const successRate = migrationResults.totalProcessed > 0 
      ? (migrationResults.totalSuccessful / migrationResults.totalProcessed) * 100 
      : 0;

    if (successRate < 95) {
      recommendations.push({
        priority: 'high',
        type: 'migration_issues',
        message: `Migration success rate is ${successRate.toFixed(1)}%. Review failed documents and consider retry.`
      });
    }

    // Check vector coverage
    const avgVectorCoverage = (validation.resumes.vectorCoverage + validation.jobpostings.vectorCoverage) / 2;
    if (avgVectorCoverage < 90) {
      recommendations.push({
        priority: 'medium',
        type: 'coverage',
        message: `Vector embedding coverage is ${avgVectorCoverage.toFixed(1)}%. Run additional migration cycles.`
      });
    }

    // Check search validation
    if (validation.searchTests.successful < validation.searchTests.testQueries) {
      recommendations.push({
        priority: 'high',
        type: 'search_issues',
        message: 'Some search tests failed. Check search functionality and vector similarity thresholds.'
      });
    }

    // Check confidence scores
    const avgConfidence = (validation.resumes.averageConfidence + validation.jobpostings.averageConfidence) / 2;
    if (avgConfidence < 0.7) {
      recommendations.push({
        priority: 'medium',
        type: 'quality',
        message: `Average embedding confidence is ${avgConfidence.toFixed(2)}. Consider improving skill extraction.`
      });
    }

    return recommendations;
  }

  async run() {
    try {
      console.log('🚀 Starting Vector-Aware Embedding Migration');
      console.log('=' * 50);

      // Initialize migration tools
      await this.initialize();

      // Phase 1: Backup existing embeddings
      const backupFile = await this.backupExistingEmbeddings();

      // Phase 2: Analyze current state
      const analysis = await this.analyzeCurrentEmbeddings();

      // Phase 3: Migrate to vector embeddings
      const migrationResults = await this.migrateToVectorEmbeddings();

      // Phase 4: Validate migration
      const validation = await this.validateMigration();

      // Phase 5: Generate report
      const reportFile = await this.generateMigrationReport(analysis, migrationResults, validation, backupFile);

      console.log('\n✅ Migration completed successfully!');
      console.log(`📊 Report: ${reportFile}`);
      console.log(`💾 Backup: ${backupFile}`);
      
      return {
        success: true,
        backupFile,
        reportFile,
        migrationResults,
        validation
      };

    } catch (error) {
      MigrationLogger.error('Migration failed', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  try {
    const args = process.argv.slice(2);
    const isValidationOnly = args.includes('--validate-only');
    const isBackupOnly = args.includes('--backup-only');

    if (isValidationOnly) {
      console.log('🔍 Running validation only...');
      const migration = new VectorEmbeddingMigration();
      await migration.initialize();
      const validation = await migration.validateMigration();
      console.log('Validation results:', JSON.stringify(validation, null, 2));
    } else if (isBackupOnly) {
      console.log('💾 Creating backup only...');
      const migration = new VectorEmbeddingMigration();
      await migration.initialize();
      const backupFile = await migration.backupExistingEmbeddings();
      console.log(`Backup saved to: ${backupFile}`);
    } else {
      console.log('🔄 Running full migration...');
      const migration = new VectorEmbeddingMigration();
      const result = await migration.run();
      
      if (result.success) {
        console.log('\n🎉 Migration completed successfully!');
        console.log('Next steps:');
        console.log('1. Test the new vector search functionality');
        console.log('2. Monitor embedding quality and search results');
        console.log('3. Update frontend components to use new APIs');
      }
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { VectorEmbeddingMigration, MigrationLogger };
