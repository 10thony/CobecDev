#!/usr/bin/env node

/**
 * AJAI HR Vector Search System - Embedding Regeneration Agent
 * 
 * This script regenerates embeddings for all documents (resumes and job postings)
 * using Google Gemini AI and dynamic skill mapping to ensure accurate semantic search.
 * 
 * Features:
 * - Pre-regeneration assessment of current embedding status
 * - Skill taxonomy building and validation
 * - Batch processing with progress tracking
 * - Error handling and fallback mechanisms
 * - Comprehensive validation and reporting
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local or .env
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
      
      console.log(`Loaded environment variables from: ${envPath}`);
      break;
    }
  }
}

// Load environment variables before any other operations
loadEnvironmentVariables();

// Configuration
const CONFIG = {
  BATCH_SIZE: 10,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  LOG_LEVEL: 'INFO', // DEBUG, INFO, WARN, ERROR
  EMBEDDING_DIMENSIONS: 2048,
  MIN_CONFIDENCE_THRESHOLD: 0.7,
  SKILL_CONSISTENCY_THRESHOLD: 0.8
};

// Logging utility
class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    console.log(`[${timestamp}] ${level}: ${message}`);
    if (data && CONFIG.LOG_LEVEL === 'DEBUG') {
      console.log(JSON.stringify(data, null, 2));
    }
    
    // Save to log file
    this.saveToFile(logEntry);
  }
  
  static info(message, data = null) {
    this.log('INFO', message, data);
  }
  
  static warn(message, data = null) {
    this.log('WARN', message, data);
  }
  
  static error(message, data = null) {
    this.log('ERROR', message, data);
  }
  
  static debug(message, data = null) {
    if (CONFIG.LOG_LEVEL === 'DEBUG') {
      this.log('DEBUG', message, data);
    }
  }
  
  static saveToFile(logEntry) {
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, `embedding-regeneration-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }
}

// Progress tracking
class ProgressTracker {
  constructor(total, description = 'Processing') {
    this.total = total;
    this.current = 0;
    this.description = description;
    this.startTime = Date.now();
    this.errors = [];
    this.warnings = [];
    this.successes = 0;
  }
  
  update(increment = 1, message = '') {
    this.current += increment;
    this.successes += increment;
    
    const percentage = Math.round((this.current / this.total) * 100);
    const elapsed = Date.now() - this.startTime;
    const estimatedTotal = elapsed * (this.total / this.current);
    const remaining = estimatedTotal - elapsed;
    
    process.stdout.write(`\r${this.description}: ${this.current}/${this.total} (${percentage}%) - ${this.formatTime(remaining)} remaining`);
    
    if (message) {
      process.stdout.write(` - ${message}`);
    }
    
    if (this.current >= this.total) {
      process.stdout.write('\n');
    }
  }
  
  addError(error) {
    this.errors.push(error);
  }
  
  addWarning(warning) {
    this.warnings.push(warning);
  }
  
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  getSummary() {
    const elapsed = Date.now() - this.startTime;
    return {
      total: this.total,
      processed: this.current,
      successes: this.successes,
      errors: this.errors.length,
      warnings: this.warnings.length,
      elapsed: elapsed,
      averageTimePerItem: elapsed / this.current
    };
  }
}

// Environment validation
class EnvironmentValidator {
  static validate() {
    Logger.info('Validating environment setup...');
    
    const requiredVars = [
      'GOOGLE_AI_API_KEY',
      'VITE_CONVEX_URL'
    ];
    
    const missing = [];
    const config = {};
    
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value) {
        missing.push(varName);
      } else {
        config[varName] = varName.includes('KEY') ? '***' + value.slice(-4) : value;
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    Logger.info('Environment validation passed', config);
    return true;
  }
}

// Convex client setup
class ConvexClient {
  constructor(agent = null) {
    this.convexUrl = process.env.VITE_CONVEX_URL;
    if (!this.convexUrl) {
      throw new Error('VITE_CONVEX_URL environment variable not set');
    }
    
    // Store reference to agent for dry-run checks
    this.agent = agent;
    
    // Initialize Convex client
    this.client = null;
    this.api = null;
    this.initializeClient();
  }
  
  async initializeClient() {
    try {
      // Dynamic import for Convex client and API
      const { ConvexHttpClient } = await import('convex/browser');
      const { api } = await import('../convex/_generated/api.js');
      
      this.client = new ConvexHttpClient(this.convexUrl);
      this.api = api;
      
      Logger.info('Convex client initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize Convex client', error);
      throw error;
    }
  }
  
  async query(queryFunction, args = {}) {
    if (!this.client || !this.api) {
      await this.initializeClient();
    }
    
    try {
      return await this.client.query(queryFunction, args);
    } catch (error) {
      Logger.error(`Query failed: ${queryFunction}`, error);
      throw error;
    }
  }
  
  async mutation(mutationFunction, args = {}) {
    if (!this.client || !this.api) {
      await this.initializeClient();
    }
    
    try {
      return await this.client.mutation(mutationFunction, args);
    } catch (error) {
      Logger.error(`Mutation failed: ${mutationFunction}`, error);
      throw error;
    }
  }
  
  async action(actionFunction, args = {}) {
    if (!this.client || !this.api) {
      await this.initializeClient();
    }
    
    try {
      return await this.client.action(actionFunction, args);
    } catch (error) {
      Logger.error(`Action failed: ${actionFunction}`, error);
      throw error;
    }
  }
}

// Document analyzer
class DocumentAnalyzer {
  constructor(convexClient) {
    this.client = convexClient;
  }
  
  async analyzeCollection(collectionName) {
    Logger.info(`Analyzing ${collectionName} collection...`);
    
    try {
      // Get collection stats
      const stats = await this.client.query(this.client.api.dataManagement.getCollectionStats, {
        collectionName
      });
      
      // Get documents without embeddings
      const documentsWithoutEmbeddings = await this.client.query(this.client.api.dataManagement.getDocumentsWithoutEmbeddings, {
        collectionName
      });
      
      // Get documents with outdated embeddings
      const outdatedEmbeddings = await this.client.query(this.client.api.dataManagement.getDocumentsWithOutdatedEmbeddings, {
        collectionName,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      // Get documents with low confidence embeddings
      const lowConfidenceEmbeddings = await this.client.query(this.client.api.dataManagement.getDocumentsWithLowConfidenceEmbeddings, {
        collectionName,
        minConfidence: CONFIG.MIN_CONFIDENCE_THRESHOLD
      });
      
      return {
        total: stats.total,
        withEmbeddings: stats.total - documentsWithoutEmbeddings.length,
        withoutEmbeddings: documentsWithoutEmbeddings.length,
        outdated: outdatedEmbeddings.length,
        lowConfidence: lowConfidenceEmbeddings.length,
        needsUpdate: documentsWithoutEmbeddings.length + outdatedEmbeddings.length + lowConfidenceEmbeddings.length
      };
    } catch (error) {
      Logger.error(`Failed to analyze ${collectionName} collection`, error);
      throw error;
    }
  }
  
  async getDocumentsForUpdate(collectionName, limit = 100) {
    try {
      return await this.client.query(this.client.api.dataManagement.getDocumentsForEmbeddingUpdate, {
        collectionName,
        limit
      });
    } catch (error) {
      Logger.error(`Failed to get documents for update from ${collectionName}`, error);
      throw error;
    }
  }
}

// Skill taxonomy manager
class SkillTaxonomyManager {
  constructor(convexClient) {
    this.client = convexClient;
  }
  
  async buildSkillTaxonomy() {
    Logger.info('Building unified skill taxonomy...');
    
    try {
      const result = await this.client.action(this.client.api.dynamicSkillMapping.buildSkillTaxonomy, {});
      
      Logger.info('Skill taxonomy built successfully', {
        totalSkills: result.totalSkills,
        categories: result.categories,
        crossReferences: result.crossReferences
      });
      
      return result;
    } catch (error) {
      Logger.error('Failed to build skill taxonomy', error);
      throw error;
    }
  }
  
  async validateSkillConsistency() {
    Logger.info('Validating skill consistency across collections...');
    
    try {
      const result = await this.client.action(this.client.api.enhancedEmbeddingService.validateEmbeddingsForRegeneration, {
        collections: ['resumes', 'jobpostings']
      });
      
      Logger.info('Skill consistency validation completed', {
        overallScore: result.overallScore,
        collectionScores: result.collectionScores,
        inconsistencies: result.inconsistencies
      });
      
      return result;
    } catch (error) {
      Logger.error('Failed to validate skill consistency', error);
      throw error;
    }
  }
}

// Embedding generator
class EmbeddingGenerator {
  constructor(convexClient) {
    this.client = convexClient;
  }
  
  async generateEmbeddingForDocument(document, collectionName) {
    try {
      // Extract searchable text
      const searchableText = this.extractSearchableText(document, collectionName);
      if (!searchableText || searchableText.trim().length === 0) {
        throw new Error('No searchable text available');
      }
      
      // Generate enhanced embedding
      const embeddingResult = await this.client.action(this.client.api.enhancedEmbeddingService.generateEnhancedEmbedding, {
        text: searchableText,
        context: collectionName === 'resumes' ? 'resume' : 'job_posting',
        useSkillEnhancement: true,
        model: 'gemini-mrl-2048'
      });
      
      // Validate embedding
      this.validateEmbedding(embeddingResult);
      
      return embeddingResult;
    } catch (error) {
      Logger.error(`Failed to generate embedding for document ${document._id || document.filename}`, error);
      throw error;
    }
  }
  
  extractSearchableText(document, collectionName) {
    if (collectionName === 'resumes') {
      return [
        document.personalInfo?.firstName || '',
        document.personalInfo?.lastName || '',
        document.professionalSummary || '',
        document.skills?.join(' ') || '',
        document.experience?.map(exp => `${exp.title} ${exp.company} ${exp.responsibilities?.join(' ')}`).join(' ') || '',
        document.education?.join(' ') || '',
        document.certifications || '',
        document.professionalMemberships || '',
        document.securityClearance || ''
      ].filter(Boolean).join(' ');
    } else if (collectionName === 'jobpostings') {
      return [
        document.jobTitle || '',
        document.department || '',
        document.description || '',
        document.requirements || '',
        document.responsibilities || '',
        document.skills || '',
        document.location || '',
        document.company || ''
      ].filter(Boolean).join(' ');
    }
    
    return '';
  }
  
  validateEmbedding(embeddingResult) {
    if (!embeddingResult.embedding || !Array.isArray(embeddingResult.embedding)) {
      throw new Error('Invalid embedding format');
    }
    
    if (embeddingResult.dimensions !== CONFIG.EMBEDDING_DIMENSIONS) {
      throw new Error(`Invalid embedding dimensions. Expected ${CONFIG.EMBEDDING_DIMENSIONS}, got ${embeddingResult.dimensions}`);
    }
    
    if (embeddingResult.confidence < CONFIG.MIN_CONFIDENCE_THRESHOLD) {
      Logger.warn(`Low confidence embedding generated: ${embeddingResult.confidence}`);
    }
  }
  
  async updateDocumentEmbedding(documentId, collectionName, embeddingResult) {
    try {
      // Check if this is a dry run
      if (this.client.agent && this.client.agent.isDryRun) {
        Logger.info(`[DRY-RUN] Would update embedding for document ${documentId}`);
        return;
      }
      
      await this.client.mutation(this.client.api.enhancedEmbeddingService.updateDocumentEmbedding, {
        documentId,
        collectionName,
        embedding: embeddingResult.embedding,
        model: embeddingResult.model,
        dimensions: embeddingResult.dimensions,
        enhancedText: embeddingResult.enhancedText,
        extractedSkills: embeddingResult.extractedSkills,
        skillCategories: embeddingResult.skillCategories,
        confidence: embeddingResult.confidence
      });
      
      Logger.debug(`Updated embedding for document ${documentId}`);
    } catch (error) {
      Logger.error(`Failed to update document embedding for ${documentId}`, error);
      throw error;
    }
  }
}

// Batch processor
class BatchProcessor {
  constructor(convexClient, embeddingGenerator) {
    this.client = convexClient;
    this.embeddingGenerator = embeddingGenerator;
  }
  
  async processBatch(documents, collectionName, progressTracker) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for (const document of documents) {
      try {
        // Generate embedding
        const embeddingResult = await this.embeddingGenerator.generateEmbeddingForDocument(document, collectionName);
        
        // Update document
        await this.embeddingGenerator.updateDocumentEmbedding(document._id, collectionName, embeddingResult);
        
        results.successful++;
        progressTracker.update(1, `Updated ${document._id || document.filename}`);
        
        // Add delay to avoid rate limiting
        await this.delay(100);
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          documentId: document._id || document.filename,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        progressTracker.addError({
          documentId: document._id || document.filename,
          error: error.message
        });
        
        Logger.error(`Failed to process document ${document._id || document.filename}`, error);
        
        // Continue with next document
        continue;
      }
    }
    
    return results;
  }
  
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Validation engine
class ValidationEngine {
  constructor(convexClient) {
    this.client = convexClient;
  }
  
  async validateEmbeddings(collectionName) {
    Logger.info(`Validating embeddings for ${collectionName}...`);
    
    try {
      const validationResult = await this.client.query(this.client.api.enhancedEmbeddingService.validateEmbeddings, {
        collectionName
      });
      
      Logger.info(`Validation completed for ${collectionName}`, {
        total: validationResult.total,
        valid: validationResult.valid,
        invalid: validationResult.invalid,
        averageConfidence: validationResult.averageConfidence
      });
      
      return validationResult;
    } catch (error) {
      Logger.error(`Failed to validate embeddings for ${collectionName}`, error);
      throw error;
    }
  }
  
  async testSemanticSearch(collectionName, testQueries) {
    Logger.info(`Testing semantic search for ${collectionName}...`);
    
    const results = [];
    
    for (const query of testQueries) {
      try {
        const searchResult = await this.client.action(this.client.api.enhancedEmbeddingService.semanticSearch, {
          query: query.text,
          collectionName,
          limit: 5,
          minSimilarity: 0.7
        });
        
        results.push({
          query: query.text,
          expectedSkills: query.expectedSkills,
          results: searchResult.results,
          topResultSimilarity: searchResult.results[0]?.similarity || 0,
          hasExpectedSkills: this.checkExpectedSkills(searchResult.results, query.expectedSkills)
        });
        
        Logger.debug(`Search test for "${query.text}": ${searchResult.results.length} results, top similarity: ${searchResult.results[0]?.similarity || 0}`);
        
      } catch (error) {
        Logger.error(`Failed to test search query: "${query.text}"`, error);
        results.push({
          query: query.text,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  checkExpectedSkills(searchResults, expectedSkills) {
    if (!expectedSkills || expectedSkills.length === 0) return true;
    
    const foundSkills = new Set();
    searchResults.forEach(result => {
      if (result.extractedSkills) {
        result.extractedSkills.forEach(skill => foundSkills.add(skill.toLowerCase()));
      }
    });
    
    const expectedSkillsLower = expectedSkills.map(s => s.toLowerCase());
    const found = expectedSkillsLower.filter(skill => foundSkills.has(skill));
    
    return found.length / expectedSkillsLower.length;
  }
}

// Report generator
class ReportGenerator {
  static generateRegenerationReport(assessment, skillTaxonomy, processingResults, validationResults, searchTestResults) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDocuments: assessment.resumes.total + assessment.jobpostings.total,
        documentsProcessed: processingResults.totalProcessed,
        documentsUpdated: processingResults.totalUpdated,
        errors: processingResults.totalErrors,
        warnings: processingResults.totalWarnings
      },
      collections: {
        resumes: assessment.resumes,
        jobpostings: assessment.jobpostings
      },
      skillTaxonomy: {
        totalSkills: skillTaxonomy.totalSkills,
        categories: skillTaxonomy.categories,
        crossReferences: skillTaxonomy.crossReferences
      },
      processing: {
        batches: processingResults.batches,
        averageTimePerDocument: processingResults.averageTimePerDocument,
        successRate: (processingResults.totalUpdated / processingResults.totalProcessed) * 100
      },
      validation: {
        resumes: validationResults.resumes,
        jobpostings: validationResults.jobpostings
      },
      searchTests: searchTestResults,
      recommendations: this.generateRecommendations(assessment, processingResults, validationResults)
    };
    
    return report;
  }
  
  static generateRecommendations(assessment, processingResults, validationResults) {
    const recommendations = [];
    
    // Check coverage
    const totalNeedsUpdate = assessment.resumes.needsUpdate + assessment.jobpostings.needsUpdate;
    if (totalNeedsUpdate > 0) {
      recommendations.push(`Consider running regeneration again to process ${totalNeedsUpdate} remaining documents`);
    }
    
    // Check error rate
    const errorRate = (processingResults.totalErrors / processingResults.totalProcessed) * 100;
    if (errorRate > 5) {
      recommendations.push(`High error rate (${errorRate.toFixed(1)}%). Review failed documents and consider retry`);
    }
    
    // Check skill consistency
    if (validationResults.resumes && validationResults.jobpostings) {
      const avgConsistency = (validationResults.resumes.averageConfidence + validationResults.jobpostings.averageConfidence) / 2;
      if (avgConsistency < CONFIG.SKILL_CONSISTENCY_THRESHOLD) {
        recommendations.push(`Low skill consistency (${avgConsistency.toFixed(2)}). Consider rebuilding skill taxonomy`);
      }
    }
    
    // Check performance
    if (processingResults.averageTimePerDocument > 5000) {
      recommendations.push('Slow processing detected. Consider optimizing batch size or API rate limits');
    }
    
    return recommendations;
  }
  
  static saveReport(report, filename = null) {
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    if (!filename) {
      filename = `embedding-regeneration-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    }
    
    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    Logger.info(`Report saved to: ${filepath}`);
    return filepath;
  }
}

// Main regeneration agent
class EmbeddingRegenerationAgent {
  constructor(options = {}) {
    this.convexClient = null;
    this.documentAnalyzer = null;
    this.skillTaxonomyManager = null;
    this.embeddingGenerator = null;
    this.batchProcessor = null;
    this.validationEngine = null;
    this.isDryRun = options.isDryRun || false;
    this.isValidateOnly = options.isValidateOnly || false;
  }
  
  async initialize() {
    Logger.info('Initializing Embedding Regeneration Agent...');
    
    try {
      // Validate environment
      EnvironmentValidator.validate();
      
      // Initialize Convex client
      this.convexClient = new ConvexClient(this);
      await this.convexClient.initializeClient();
      
      // Initialize components
      this.documentAnalyzer = new DocumentAnalyzer(this.convexClient);
      this.skillTaxonomyManager = new SkillTaxonomyManager(this.convexClient);
      this.embeddingGenerator = new EmbeddingGenerator(this.convexClient);
      this.batchProcessor = new BatchProcessor(this.convexClient, this.embeddingGenerator);
      this.validationEngine = new ValidationEngine(this.convexClient);
      
      Logger.info('Agent initialized successfully');
      
    } catch (error) {
      Logger.error('Failed to initialize agent', error);
      throw error;
    }
  }
  
  async runPreRegenerationAssessment() {
    Logger.info('Running pre-regeneration assessment...');
    
    try {
      const resumesAssessment = await this.documentAnalyzer.analyzeCollection('resumes');
      const jobpostingsAssessment = await this.documentAnalyzer.analyzeCollection('jobpostings');
      
      const assessment = {
        resumes: resumesAssessment,
        jobpostings: jobpostingsAssessment,
        total: {
          total: resumesAssessment.total + jobpostingsAssessment.total,
          needsUpdate: resumesAssessment.needsUpdate + jobpostingsAssessment.needsUpdate
        }
      };
      
      Logger.info('Assessment completed', assessment);
      return assessment;
      
    } catch (error) {
      Logger.error('Failed to complete assessment', error);
      throw error;
    }
  }
  
  async buildSkillTaxonomy() {
    Logger.info('Building skill taxonomy...');
    
    try {
      const skillTaxonomy = await this.skillTaxonomyManager.buildSkillTaxonomy();
      return skillTaxonomy;
    } catch (error) {
      Logger.error('Failed to build skill taxonomy', error);
      throw error;
    }
  }
  
  async regenerateEmbeddings(collectionName, assessment) {
    Logger.info(`Starting embedding regeneration for ${collectionName}...`);
    
    const collectionAssessment = assessment[collectionName];
    const totalToProcess = collectionAssessment.needsUpdate;
    
    if (totalToProcess === 0) {
      Logger.info(`No documents need updating in ${collectionName}`);
      return { totalProcessed: 0, totalUpdated: 0, totalErrors: 0, batches: [] };
    }
    
    const progressTracker = new ProgressTracker(totalToProcess, `Regenerating ${collectionName}`);
    const batches = [];
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    
    try {
      // Process in batches
      for (let offset = 0; offset < totalToProcess; offset += CONFIG.BATCH_SIZE) {
        const batchDocuments = await this.documentAnalyzer.getDocumentsForUpdate(
          collectionName, 
          Math.min(CONFIG.BATCH_SIZE, totalToProcess - offset)
        );
        
        if (batchDocuments.length === 0) break;
        
        Logger.info(`Processing batch ${Math.floor(offset / CONFIG.BATCH_SIZE) + 1} (${batchDocuments.length} documents)`);
        
        const batchStartTime = Date.now();
        const batchResult = await this.batchProcessor.processBatch(
          batchDocuments, 
          collectionName, 
          progressTracker
        );
        
        const batchTime = Date.now() - batchStartTime;
        
        batches.push({
          batchNumber: Math.floor(offset / CONFIG.BATCH_SIZE) + 1,
          documentsProcessed: batchDocuments.length,
          successful: batchResult.successful,
          failed: batchResult.failed,
          processingTime: batchTime,
          errors: batchResult.errors
        });
        
        totalProcessed += batchDocuments.length;
        totalUpdated += batchResult.successful;
        totalErrors += batchResult.failed;
        
        // Add delay between batches
        if (offset + CONFIG.BATCH_SIZE < totalToProcess) {
          await this.batchProcessor.delay(1000);
        }
      }
      
      const summary = progressTracker.getSummary();
      Logger.info(`Completed regeneration for ${collectionName}`, summary);
      
      return {
        totalProcessed,
        totalUpdated,
        totalErrors,
        batches,
        averageTimePerDocument: summary.averageTimePerItem
      };
      
    } catch (error) {
      Logger.error(`Failed to complete regeneration for ${collectionName}`, error);
      throw error;
    }
  }
  
  async validateResults() {
    Logger.info('Validating regeneration results...');
    
    try {
      const resumesValidation = await this.validationEngine.validateEmbeddings('resumes');
      const jobpostingsValidation = await this.validationEngine.validateEmbeddings('jobpostings');
      
      const validationResults = {
        resumes: resumesValidation,
        jobpostings: jobpostingsValidation
      };
      
      Logger.info('Validation completed', validationResults);
      return validationResults;
      
    } catch (error) {
      Logger.error('Failed to validate results', error);
      throw error;
    }
  }
  
  async testSemanticSearch() {
    Logger.info('Testing semantic search accuracy...');
    
    const testQueries = [
      {
        text: "who can build apps for the iphone",
        expectedSkills: ["iOS", "Swift", "iPhone", "mobile development"]
      },
      {
        text: "experienced React developer",
        expectedSkills: ["React", "JavaScript", "frontend", "web development"]
      },
      {
        text: "Python data scientist",
        expectedSkills: ["Python", "data science", "machine learning", "pandas"]
      },
      {
        text: "DevOps engineer with AWS experience",
        expectedSkills: ["DevOps", "AWS", "cloud", "infrastructure"]
      }
    ];
    
    try {
      const resumesSearchResults = await this.validationEngine.testSemanticSearch('resumes', testQueries);
      const jobpostingsSearchResults = await this.validationEngine.testSemanticSearch('jobpostings', testQueries);
      
      const searchTestResults = {
        resumes: resumesSearchResults,
        jobpostings: jobpostingsSearchResults,
        overall: {
          totalQueries: testQueries.length,
          successfulQueries: testQueries.length - resumesSearchResults.filter(r => r.error).length
        }
      };
      
      Logger.info('Semantic search testing completed', searchTestResults);
      return searchTestResults;
      
    } catch (error) {
      Logger.error('Failed to test semantic search', error);
      throw error;
    }
  }
  
  async run() {
    const startTime = Date.now();
    
    try {
      Logger.info('🚀 Starting AJAI HR Vector Search System Embedding Regeneration');
      
      // Initialize agent
      await this.initialize();
      
      // Phase 1: Pre-regeneration assessment
      const assessment = await this.runPreRegenerationAssessment();
      
      if (assessment.total.needsUpdate === 0) {
        Logger.info('✅ All documents already have up-to-date embeddings. No regeneration needed.');
        return;
      }
      
      // Phase 2: Build skill taxonomy
      const skillTaxonomy = await this.buildSkillTaxonomy();
      
      // Phase 3: Regenerate embeddings
      const resumesResults = await this.regenerateEmbeddings('resumes', assessment);
      const jobpostingsResults = await this.regenerateEmbeddings('jobpostings', assessment);
      
      const processingResults = {
        totalProcessed: resumesResults.totalProcessed + jobpostingsResults.totalProcessed,
        totalUpdated: resumesResults.totalUpdated + jobpostingsResults.totalUpdated,
        totalErrors: resumesResults.totalErrors + jobpostingsResults.totalErrors,
        resumes: resumesResults,
        jobpostings: jobpostingsResults,
        averageTimePerDocument: (resumesResults.averageTimePerDocument + jobpostingsResults.averageTimePerDocument) / 2
      };
      
      // Phase 4: Validate results
      const validationResults = await this.validateResults();
      
      // Phase 5: Test semantic search
      const searchTestResults = await this.testSemanticSearch();
      
      // Generate and save report
      const report = ReportGenerator.generateRegenerationReport(
        assessment,
        skillTaxonomy,
        processingResults,
        validationResults,
        searchTestResults
      );
      
      const reportPath = ReportGenerator.saveReport(report);
      
      const totalTime = Date.now() - startTime;
      
      Logger.info('🎉 Embedding regeneration completed successfully!', {
        totalTime: `${Math.round(totalTime / 1000)}s`,
        documentsUpdated: processingResults.totalUpdated,
        errorRate: `${((processingResults.totalErrors / processingResults.totalProcessed) * 100).toFixed(1)}%`,
        reportPath
      });
      
      return report;
      
    } catch (error) {
      Logger.error('❌ Embedding regeneration failed', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  try {
    console.log('🔍 AJAI HR Vector Search System - Embedding Regeneration Agent');
    console.log('================================================================\n');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const isValidateOnly = args.includes('--validate-only');
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isDryRun) {
      console.log('🧪 Running in DRY-RUN mode. No actual changes will be made to the database.');
    } else if (isValidateOnly) {
      console.log('🔍 Running in VALIDATE-ONLY mode. Only validation and testing will be performed.');
    } else if (isProduction) {
      console.log('⚠️  Running in PRODUCTION mode. This will update all document embeddings.');
      const confirm = await question('Are you sure you want to continue? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        process.exit(0);
      }
    } else {
      console.log('🔄 Running in DEVELOPMENT mode. This will update all document embeddings.');
    }
    
    // Initialize and run agent
    const agent = new EmbeddingRegenerationAgent({
      isDryRun,
      isValidateOnly
    });
    
    if (isValidateOnly) {
      // Only run validation and testing
      await agent.initialize();
      const assessment = await agent.runPreRegenerationAssessment();
      const skillTaxonomy = await agent.buildSkillTaxonomy();
      const validationResults = await agent.validateResults();
      const searchTestResults = await agent.testSemanticSearch();
      
      console.log('\n📊 Validation Summary:');
      console.log(`   • Total documents: ${assessment.resumes.total + assessment.jobpostings.total}`);
      console.log(`   • Documents needing updates: ${assessment.total.needsUpdate}`);
      console.log(`   • Skill taxonomy: ${skillTaxonomy.totalSkills || 'N/A'} skills`);
      console.log(`   • Validation completed successfully`);
      console.log(`   • Search testing completed successfully`);
      
    } else {
      // Run full regeneration (with dry-run protection if enabled)
      const report = await agent.run();
      
      if (report) {
        console.log('\n📊 Regeneration Summary:');
        console.log(`   • Total documents processed: ${report.summary.totalDocuments}`);
        console.log(`   • Documents updated: ${report.summary.documentsUpdated}`);
        console.log(`   • Success rate: ${report.summary.documentsUpdated / report.summary.totalDocuments * 100}%`);
        console.log(`   • Errors: ${report.summary.errors}`);
        console.log(`   • Report saved to: ${report.reportPath}`);
        
        if (report.recommendations.length > 0) {
          console.log('\n💡 Recommendations:');
          report.recommendations.forEach((rec, index) => {
            console.log(`   ${index + 1}. ${rec}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Run if called directly
main().catch(console.error);

export {
  EmbeddingRegenerationAgent,
  Logger,
  ProgressTracker,
  EnvironmentValidator,
  ConvexClient,
  DocumentAnalyzer,
  SkillTaxonomyManager,
  EmbeddingGenerator,
  BatchProcessor,
  ValidationEngine,
  ReportGenerator
};
