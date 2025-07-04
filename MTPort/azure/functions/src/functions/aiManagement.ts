import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AIService } from '../services/aiService';
import { CosmosDbService } from '../services/cosmosDbService';

const aiService = new AIService();
const cosmosService = new CosmosDbService();

// Generate embeddings for text
app.http('generateEmbeddings', {
  methods: ['POST'],
  authLevel: 'function',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await request.json();
      const { text, model = 'gemini' } = body;

      if (!text) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Text is required' })
        };
      }

      let embeddingResponse;
      if (model === 'openai') {
        embeddingResponse = await aiService.generateOpenAIEmbedding(text);
      } else {
        embeddingResponse = await aiService.generateGeminiEmbedding(text);
      }

      return {
        status: 200,
        body: JSON.stringify(embeddingResponse)
      };
    } catch (error) {
      context.error('Error generating embeddings:', error);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to generate embeddings' })
      };
    }
  }
});

// Enhanced vector search
app.http('enhancedVectorSearch', {
  methods: ['POST'],
  authLevel: 'function',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await request.json();
      const { 
        query, 
        searchType = 'both',
        embeddingType = 'combined',
        limit = 10,
        minSimilarity = 0.3,
        skillFilter = []
      } = body;

      if (!query) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Query is required' })
        };
      }

      // Get documents from Cosmos DB
      let documents: any[] = [];
      
      if (searchType === 'jobs' || searchType === 'both') {
        const jobs = await cosmosService.getAllJobPostings();
        documents.push(...jobs.map(job => ({
          id: job.id,
          content: `${job.jobTitle} ${job.jobSummary} ${job.requirements} ${job.duties}`,
          metadata: {
            type: 'job',
            jobTitle: job.jobTitle,
            location: job.location,
            department: job.department,
            skills: job.extractedSkills || []
          },
          embeddings: {
            combinedEmbedding: job.embedding
          }
        })));
      }

      if (searchType === 'resumes' || searchType === 'both') {
        const resumes = await cosmosService.getAllResumes();
        documents.push(...resumes.map(resume => ({
          id: resume.id,
          content: `${resume.personalInfo.firstName} ${resume.personalInfo.lastName} ${resume.professionalSummary} ${resume.skills.join(' ')}`,
          metadata: {
            type: 'resume',
            name: `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}`,
            email: resume.personalInfo.email,
            skills: resume.skills || []
          },
          embeddings: {
            combinedEmbedding: resume.embedding
          }
        })));
      }

      // Perform enhanced vector search
      const searchResults = await aiService.enhancedVectorSearch(query, documents, {
        embeddingType,
        limit,
        minSimilarity,
        skillFilter,
        searchType
      });

      return {
        status: 200,
        body: JSON.stringify(searchResults)
      };
    } catch (error) {
      context.error('Error performing enhanced vector search:', error);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to perform vector search' })
      };
    }
  }
});

// Process document and generate embeddings
app.http('processDocument', {
  methods: ['POST'],
  authLevel: 'function',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await request.json();
      const { content, documentType, metadata = {} } = body;

      if (!content || !documentType) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Content and documentType are required' })
        };
      }

      // Process document content
      const processedDocument = await aiService.processDocument(content);

      // Generate embeddings based on document type
      let embeddings;
      if (documentType === 'job') {
        embeddings = await aiService.generateJobEmbeddings({
          jobTitle: metadata.jobTitle || '',
          jobSummary: content,
          requirements: metadata.requirements || '',
          duties: metadata.duties || ''
        });
      } else if (documentType === 'resume') {
        embeddings = await aiService.generateResumeEmbeddings({
          name: metadata.name || '',
          summary: content,
          skills: metadata.skills || [],
          experience: metadata.experience || '',
          education: metadata.education || ''
        });
      }

      return {
        status: 200,
        body: JSON.stringify({
          processedDocument,
          embeddings,
          documentType
        })
      };
    } catch (error) {
      context.error('Error processing document:', error);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to process document' })
      };
    }
  }
});

// Extract skills from text
app.http('extractSkills', {
  methods: ['POST'],
  authLevel: 'function',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await request.json();
      const { text } = body;

      if (!text) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Text is required' })
        };
      }

      const skills = await aiService.extractSkills(text);

      return {
        status: 200,
        body: JSON.stringify({ skills })
      };
    } catch (error) {
      context.error('Error extracting skills:', error);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to extract skills' })
      };
    }
  }
});

// Analyze sentiment
app.http('analyzeSentiment', {
  methods: ['POST'],
  authLevel: 'function',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await request.json();
      const { text } = body;

      if (!text) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Text is required' })
        };
      }

      const sentiment = await aiService.analyzeSentiment(text);

      return {
        status: 200,
        body: JSON.stringify(sentiment)
      };
    } catch (error) {
      context.error('Error analyzing sentiment:', error);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to analyze sentiment' })
      };
    }
  }
});

// Search Azure Cognitive Search
app.http('searchAzureSearch', {
  methods: ['POST'],
  authLevel: 'function',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await request.json();
      const { query, filters } = body;

      if (!query) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Query is required' })
        };
      }

      const results = await aiService.searchAzureSearch(query, filters);

      return {
        status: 200,
        body: JSON.stringify({ results })
      };
    } catch (error) {
      context.error('Error searching Azure Search:', error);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to search Azure Search' })
      };
    }
  }
});

// Batch process documents for embeddings
app.http('batchProcessEmbeddings', {
  methods: ['POST'],
  authLevel: 'function',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await request.json();
      const { documents, documentType } = body;

      if (!documents || !Array.isArray(documents) || !documentType) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Documents array and documentType are required' })
        };
      }

      const results: Array<{
        id: any;
        success: boolean;
        embeddings?: any;
        error?: string;
      }> = [];
      const batchSize = 5; // Process in batches to avoid rate limits

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (doc) => {
          try {
            let embeddings;
            if (documentType === 'job') {
              embeddings = await aiService.generateJobEmbeddings(doc);
            } else if (documentType === 'resume') {
              embeddings = await aiService.generateResumeEmbeddings(doc);
            }

            return {
              id: doc.id,
              success: true,
              embeddings
            };
          } catch (error) {
            return {
              id: doc.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches to respect rate limits
        if (i + batchSize < documents.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        status: 200,
        body: JSON.stringify({ results })
      };
    } catch (error) {
      context.error('Error batch processing embeddings:', error);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to batch process embeddings' })
      };
    }
  }
}); 