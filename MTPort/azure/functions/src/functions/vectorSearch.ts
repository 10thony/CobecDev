import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { cosmosDbService } from '../services/cosmosDbService';
import { aiService } from '../services/aiService';
import { SearchRequest, SearchResponse } from '../types';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    const searchRequest: SearchRequest = req.body;
    
    if (!searchRequest.query || !searchRequest.type) {
      context.res = {
        status: 400,
        body: {
          error: 'Missing required fields: query and type'
        }
      };
      return;
    }

    const startTime = Date.now();
    let jobs: any[] = [];
    let resumes: any[] = [];

    // Search based on type
    if (searchRequest.type === 'jobs' || searchRequest.type === 'both') {
      const jobResults = await cosmosDbService.searchJobPostings(searchRequest.query, searchRequest.filters);
      
      // Process jobs with AI for similarity scoring
      const processedJobs = await Promise.all(
        jobResults.map(async (job) => {
          const processed = await aiService.processDocument(
            `${job.jobTitle} ${job.jobSummary} ${job.requirements} ${job.qualifications}`
          );
          
          return {
            ...job,
            searchableText: processed.searchableText,
            extractedSkills: processed.extractedSkills,
            embedding: processed.embedding
          };
        })
      );

      // Perform vector search
      const vectorResults = await aiService.searchSimilarDocuments(
        searchRequest.query,
        processedJobs.map(job => ({
          id: job.id,
          content: job.searchableText,
          metadata: job,
          embedding: job.embedding
        })),
        searchRequest.limit || 10
      );

      jobs = vectorResults.results.map(result => ({
        ...result.metadata,
        similarity: result.score
      }));
    }

    if (searchRequest.type === 'resumes' || searchRequest.type === 'both') {
      const resumeResults = await cosmosDbService.searchResumes(searchRequest.query, searchRequest.filters);
      
      // Process resumes with AI for similarity scoring
      const processedResumes = await Promise.all(
        resumeResults.map(async (resume) => {
          const processed = await aiService.processDocument(
            `${resume.personalInfo.firstName} ${resume.personalInfo.lastName} ${resume.professionalSummary} ${resume.skills.join(' ')}`
          );
          
          return {
            ...resume,
            searchableText: processed.searchableText,
            extractedSkills: processed.extractedSkills,
            embedding: processed.embedding
          };
        })
      );

      // Perform vector search
      const vectorResults = await aiService.searchSimilarDocuments(
        searchRequest.query,
        processedResumes.map(resume => ({
          id: resume.id,
          content: resume.searchableText,
          metadata: resume,
          embedding: resume.embedding
        })),
        searchRequest.limit || 10
      );

      resumes = vectorResults.results.map(result => ({
        ...result.metadata,
        similarity: result.score
      }));
    }

    const response: SearchResponse = {
      jobs: searchRequest.type === 'jobs' || searchRequest.type === 'both' ? jobs : undefined,
      resumes: searchRequest.type === 'resumes' || searchRequest.type === 'both' ? resumes : undefined,
      totalResults: jobs.length + resumes.length,
      query: searchRequest.query,
      executionTime: Date.now() - startTime
    };

    context.res = {
      status: 200,
      body: response
    };

  } catch (error) {
    console.error('Vector search error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

export default httpTrigger; 