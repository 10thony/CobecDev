import { CosmosClient, Database, Container } from '@azure/cosmos';
import { JobPosting, Resume, Nomination } from '../types';

export class CosmosDbService {
  private client: CosmosClient;
  private database: Database;
  private jobPostingsContainer: Container;
  private resumesContainer: Container;
  private nominationsContainer: Container;

  constructor() {
    const endpoint = process.env.COSMOS_DB_ENDPOINT!;
    const key = process.env.COSMOS_DB_KEY!;
    const databaseName = process.env.COSMOS_DB_DATABASE || 'ajai-database';

    this.client = new CosmosClient({ endpoint, key });
    this.database = this.client.database(databaseName);
    this.jobPostingsContainer = this.database.container('jobPostings');
    this.resumesContainer = this.database.container('resumes');
    this.nominationsContainer = this.database.container('nominations');
  }

  // Job Postings Operations
  async getAllJobPostings(): Promise<JobPosting[]> {
    try {
      const { resources } = await this.jobPostingsContainer.items
        .query('SELECT * FROM c')
        .fetchAll();
      return resources as JobPosting[];
    } catch (error) {
      console.error('Error fetching job postings:', error);
      throw new Error('Failed to fetch job postings');
    }
  }

  async searchJobPostings(query: string, filters?: any): Promise<JobPosting[]> {
    try {
      let sqlQuery = 'SELECT * FROM c WHERE CONTAINS(c.searchableText, @query, true)';
      const parameters = [{ name: '@query', value: query }];

      if (filters?.jobTitle) {
        sqlQuery += ' AND CONTAINS(c.jobTitle, @jobTitle, true)';
        parameters.push({ name: '@jobTitle', value: filters.jobTitle });
      }

      if (filters?.location) {
        sqlQuery += ' AND CONTAINS(c.location, @location, true)';
        parameters.push({ name: '@location', value: filters.location });
      }

      if (filters?.department) {
        sqlQuery += ' AND CONTAINS(c.department, @department, true)';
        parameters.push({ name: '@department', value: filters.department });
      }

      const { resources } = await this.jobPostingsContainer.items
        .query(sqlQuery, { parameters })
        .fetchAll();

      return resources as JobPosting[];
    } catch (error) {
      console.error('Error searching job postings:', error);
      throw new Error('Failed to search job postings');
    }
  }

  async createJobPosting(jobPosting: Omit<JobPosting, 'id'>): Promise<JobPosting> {
    try {
      const { resource } = await this.jobPostingsContainer.items.create({
        ...jobPosting,
        id: this.generateId(),
        _metadata: {
          ...jobPosting._metadata,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      return resource as JobPosting;
    } catch (error) {
      console.error('Error creating job posting:', error);
      throw new Error('Failed to create job posting');
    }
  }

  async updateJobPosting(id: string, updates: Partial<JobPosting>): Promise<JobPosting> {
    try {
      const { resource } = await this.jobPostingsContainer.item(id, id).replace({
        ...updates,
        _metadata: {
          ...updates._metadata,
          updatedAt: new Date()
        }
      });
      return resource as JobPosting;
    } catch (error) {
      console.error('Error updating job posting:', error);
      throw new Error('Failed to update job posting');
    }
  }

  async deleteJobPosting(id: string): Promise<void> {
    try {
      await this.jobPostingsContainer.item(id, id).delete();
    } catch (error) {
      console.error('Error deleting job posting:', error);
      throw new Error('Failed to delete job posting');
    }
  }

  // Resumes Operations
  async getAllResumes(): Promise<Resume[]> {
    try {
      const { resources } = await this.resumesContainer.items
        .query('SELECT * FROM c')
        .fetchAll();
      return resources as Resume[];
    } catch (error) {
      console.error('Error fetching resumes:', error);
      throw new Error('Failed to fetch resumes');
    }
  }

  async searchResumes(query: string, filters?: any): Promise<Resume[]> {
    try {
      let sqlQuery = 'SELECT * FROM c WHERE CONTAINS(c.searchableText, @query, true)';
      const parameters = [{ name: '@query', value: query }];

      if (filters?.firstName) {
        sqlQuery += ' AND CONTAINS(c.personalInfo.firstName, @firstName, true)';
        parameters.push({ name: '@firstName', value: filters.firstName });
      }

      if (filters?.lastName) {
        sqlQuery += ' AND CONTAINS(c.personalInfo.lastName, @lastName, true)';
        parameters.push({ name: '@lastName', value: filters.lastName });
      }

      if (filters?.email) {
        sqlQuery += ' AND CONTAINS(c.personalInfo.email, @email, true)';
        parameters.push({ name: '@email', value: filters.email });
      }

      const { resources } = await this.resumesContainer.items
        .query(sqlQuery, { parameters })
        .fetchAll();

      return resources as Resume[];
    } catch (error) {
      console.error('Error searching resumes:', error);
      throw new Error('Failed to search resumes');
    }
  }

  async createResume(resume: Omit<Resume, 'id'>): Promise<Resume> {
    try {
      const { resource } = await this.resumesContainer.items.create({
        ...resume,
        id: this.generateId(),
        _metadata: {
          ...resume._metadata,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      return resource as Resume;
    } catch (error) {
      console.error('Error creating resume:', error);
      throw new Error('Failed to create resume');
    }
  }

  async updateResume(id: string, updates: Partial<Resume>): Promise<Resume> {
    try {
      const { resource } = await this.resumesContainer.item(id, id).replace({
        ...updates,
        _metadata: {
          ...updates._metadata,
          updatedAt: new Date()
        }
      });
      return resource as Resume;
    } catch (error) {
      console.error('Error updating resume:', error);
      throw new Error('Failed to update resume');
    }
  }

  async deleteResume(id: string): Promise<void> {
    try {
      await this.resumesContainer.item(id, id).delete();
    } catch (error) {
      console.error('Error deleting resume:', error);
      throw new Error('Failed to delete resume');
    }
  }

  // Nominations Operations
  async getAllNominations(): Promise<Nomination[]> {
    try {
      const { resources } = await this.nominationsContainer.items
        .query('SELECT * FROM c ORDER BY c.createdAt DESC')
        .fetchAll();
      return resources as Nomination[];
    } catch (error) {
      console.error('Error fetching nominations:', error);
      throw new Error('Failed to fetch nominations');
    }
  }

  async getNominationsByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<Nomination[]> {
    try {
      const { resources } = await this.nominationsContainer.items
        .query('SELECT * FROM c WHERE c.status = @status ORDER BY c.createdAt DESC', {
          parameters: [{ name: '@status', value: status }]
        })
        .fetchAll();
      return resources as Nomination[];
    } catch (error) {
      console.error('Error fetching nominations by status:', error);
      throw new Error('Failed to fetch nominations by status');
    }
  }

  async createNomination(nomination: Omit<Nomination, 'id' | 'createdAt'>): Promise<Nomination> {
    try {
      const { resource } = await this.nominationsContainer.items.create({
        ...nomination,
        id: this.generateId(),
        createdAt: new Date(),
        status: 'pending'
      });
      return resource as Nomination;
    } catch (error) {
      console.error('Error creating nomination:', error);
      throw new Error('Failed to create nomination');
    }
  }

  async updateNomination(id: string, updates: Partial<Nomination>): Promise<Nomination> {
    try {
      const { resource } = await this.nominationsContainer.item(id, id).replace({
        ...updates,
        approvedAt: updates.status === 'approved' ? new Date() : undefined
      });
      return resource as Nomination;
    } catch (error) {
      console.error('Error updating nomination:', error);
      throw new Error('Failed to update nomination');
    }
  }

  async deleteNomination(id: string): Promise<void> {
    try {
      await this.nominationsContainer.item(id, id).delete();
    } catch (error) {
      console.error('Error deleting nomination:', error);
      throw new Error('Failed to delete nomination');
    }
  }

  // Utility Methods
  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async clearAllData(): Promise<void> {
    try {
      // Clear job postings
      const { resources: jobs } = await this.jobPostingsContainer.items
        .query('SELECT c.id FROM c')
        .fetchAll();
      
      for (const job of jobs) {
        await this.jobPostingsContainer.item(job.id, job.id).delete();
      }

      // Clear resumes
      const { resources: resumes } = await this.resumesContainer.items
        .query('SELECT c.id FROM c')
        .fetchAll();
      
      for (const resume of resumes) {
        await this.resumesContainer.item(resume.id, resume.id).delete();
      }

      // Clear nominations
      const { resources: nominations } = await this.nominationsContainer.items
        .query('SELECT c.id FROM c')
        .fetchAll();
      
      for (const nomination of nominations) {
        await this.nominationsContainer.item(nomination.id, nomination.id).delete();
      }

      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error('Failed to clear data');
    }
  }

  async getDataSummary(): Promise<{
    totalJobs: number;
    totalResumes: number;
    totalNominations: number;
    lastUpdated: Date;
  }> {
    try {
      const [jobs, resumes, nominations] = await Promise.all([
        this.getAllJobPostings(),
        this.getAllResumes(),
        this.getAllNominations()
      ]);

      return {
        totalJobs: jobs.length,
        totalResumes: resumes.length,
        totalNominations: nominations.length,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting data summary:', error);
      throw new Error('Failed to get data summary');
    }
  }
}

// Singleton instance
export const cosmosDbService = new CosmosDbService(); 