// Client-side MongoDB-like service for browser
// This provides the same interface as server-side MongoDB functions
// but uses browser storage (localStorage + IndexedDB) for data persistence

export interface JobPosting {
  _id?: string;
  jobTitle: string;
  location: string;
  salary: string;
  openDate: string;
  closeDate: string;
  jobLink: string;
  jobType: string;
  jobSummary: string;
  duties: string;
  requirements: string;
  qualifications: string;
  education: string;
  howToApply: string;
  additionalInformation: string;
  department: string;
  seriesGrade: string;
  travelRequired: string;
  workSchedule: string;
  securityClearance: string;
  experienceRequired: string;
  educationRequired: string;
  applicationDeadline: string;
  contactInfo: string;
  searchableText?: string;
  extractedSkills?: string[];
  embedding?: number[];
  _metadata?: {
    originalIndex?: number;
    importedAt: Date;
    sourceFile?: string;
    dataType: string;
  };
}

export interface Resume {
  _id?: string;
  filename: string;
  originalText: string;
  personalInfo: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phone: string;
    yearsOfExperience: number;
  };
  professionalSummary: string;
  education: string[];
  experience: Array<{
    title: string;
    company: string;
    location: string;
    duration: string;
    responsibilities: string[];
  }>;
  skills: string[];
  certifications: string;
  professionalMemberships: string;
  securityClearance: string;
  searchableText?: string;
  extractedSkills?: string[];
  embedding?: number[];
  _metadata?: {
    filePath?: string;
    fileName: string;
    importedAt: Date;
    parsedAt: Date;
  };
}

export interface SearchCriteria {
  jobTitle?: string;
  location?: string;
  jobType?: string;
  department?: string;
}

interface RegexQuery {
  $regex: string;
  $options?: string;
}

class MongoClient {
  private database: IDBDatabase | null = null;
  private readonly dbName = 'workdemos';
  private readonly version = 1;
  private isConnecting: boolean = false;

  async connect(): Promise<void> {
    if (this.database) {
      return; // Already connected
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return;
    }

    this.isConnecting = true;
    
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = () => {
          this.isConnecting = false;
          reject(request.error);
        };
        
        request.onsuccess = () => {
          this.database = request.result;
          this.isConnecting = false;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create collections (object stores)
          if (!db.objectStoreNames.contains('jobpostings')) {
            const jobStore = db.createObjectStore('jobpostings', { keyPath: '_id', autoIncrement: true });
            jobStore.createIndex('jobTitle', 'jobTitle', { unique: false });
            jobStore.createIndex('location', 'location', { unique: false });
            jobStore.createIndex('department', 'department', { unique: false });
          }

          if (!db.objectStoreNames.contains('resumes')) {
            const resumeStore = db.createObjectStore('resumes', { keyPath: '_id', autoIncrement: true });
            resumeStore.createIndex('filename', 'filename', { unique: false });
          }
        };
      });
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.database) {
      this.database.close();
      this.database = null;
    }
  }

  getDatabase(name: string): Database {
    if (!this.database) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return new Database(this.database, name);
  }

  isConnected(): boolean {
    return this.database !== null;
  }
}

class Database {
  constructor(private db: IDBDatabase, private name: string) {}

  collection(name: string): Collection {
    return new Collection(this.db, name);
  }
}

class Collection {
  constructor(private db: IDBDatabase, private name: string) {}

  async insertOne(document: any): Promise<{ insertedId: string }> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.name], 'readwrite');
        const store = transaction.objectStore(this.name);
        
        // Generate a unique ID if not provided
        if (!document._id) {
          document._id = this.generateId();
        }

        const request = store.add(document);
        
        request.onsuccess = () => resolve({ insertedId: document._id });
        request.onerror = () => reject(new Error(`Failed to insert document: ${request.error}`));
        
        transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`));
      } catch (error) {
        reject(new Error(`Collection operation failed: ${error}`));
      }
    });
  }

  async find(query: any = {}): Promise<Cursor> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.name], 'readonly');
        const store = transaction.objectStore(this.name);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const documents = request.result;
          const filteredDocs = this.filterDocuments(documents, query);
          resolve(new Cursor(filteredDocs));
        };
        request.onerror = () => reject(new Error(`Failed to fetch documents: ${request.error}`));
        
        transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`));
      } catch (error) {
        reject(new Error(`Collection operation failed: ${error}`));
      }
    });
  }

  async findOne(query: any = {}): Promise<any> {
    const cursor = await this.find(query);
    const documents = await cursor.toArray();
    return documents[0] || null;
  }

  async countDocuments(query: any = {}): Promise<number> {
    const cursor = await this.find(query);
    const documents = await cursor.toArray();
    return documents.length;
  }

  async updateOne(filter: any, update: any): Promise<{ modifiedCount: number }> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.name], 'readwrite');
      const store = transaction.objectStore(this.name);
      
      // First find the document
      const getRequest = store.get(filter._id);
      
      getRequest.onsuccess = () => {
        const document = getRequest.result;
        if (!document) {
          resolve({ modifiedCount: 0 });
          return;
        }

        // Apply the update
        const updatedDoc = { ...document, ...update.$set };
        const putRequest = store.put(updatedDoc);
        
        putRequest.onsuccess = () => resolve({ modifiedCount: 1 });
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  private filterDocuments(documents: any[], query: any): any[] {
    return documents.filter(doc => {
      for (const [key, value] of Object.entries(query)) {
        if (key === '_id') {
          if (doc._id !== value) return false;
        } else if (typeof value === 'object' && value !== null && '$regex' in value) {
          const regexQuery = value as RegexQuery;
          const regex = new RegExp(regexQuery.$regex, regexQuery.$options || '');
          if (!regex.test(doc[key])) return false;
        } else {
          if (doc[key] !== value) return false;
        }
      }
      return true;
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

class Cursor {
  constructor(private documents: any[]) {}

  async toArray(): Promise<any[]> {
    return this.documents;
  }
}

// Create a singleton client instance
let clientInstance: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!clientInstance) {
    clientInstance = new MongoClient();
  }
  
  // Ensure connection is established
  if (!clientInstance.isConnected()) {
    try {
      await clientInstance.connect();
    } catch (error) {
      console.error('Failed to connect to IndexedDB:', error);
      // Reset the instance so we can try again
      clientInstance = null;
      throw new Error(`Database connection failed: ${error}`);
    }
  }
  
  return clientInstance;
}

// Function to reset the database connection (useful for troubleshooting)
export async function resetDatabaseConnection(): Promise<void> {
  if (clientInstance) {
    await clientInstance.close();
    clientInstance = null;
  }
}

// Debug function to check database status
export async function debugDatabaseStatus(): Promise<{
  isConnected: boolean;
  hasClient: boolean;
  databaseName: string;
  error?: string;
}> {
  try {
    if (!clientInstance) {
      return {
        isConnected: false,
        hasClient: false,
        databaseName: 'workdemos'
      };
    }

    return {
      isConnected: clientInstance.isConnected(),
      hasClient: true,
      databaseName: 'workdemos'
    };
  } catch (error) {
    return {
      isConnected: false,
      hasClient: !!clientInstance,
      databaseName: 'workdemos',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Export the main functions that match the server-side interface
export async function getAllJobPostings(): Promise<JobPosting[]> {
  const client = await getMongoClient();
  const db = client.getDatabase('workdemos');
  const collection = db.collection('jobpostings');
  const cursor = await collection.find({});
  return await cursor.toArray();
}

export async function searchJobPostings(searchCriteria: SearchCriteria): Promise<JobPosting[]> {
  const client = await getMongoClient();
  const db = client.getDatabase('workdemos');
  const collection = db.collection('jobpostings');
  const cursor = await collection.find(searchCriteria);
  return await cursor.toArray();
}

export async function insertJobData(collection: Collection, jobData: JobPosting, index: number): Promise<boolean> {
  try {
    const result = await collection.insertOne(jobData);
    console.log(`✓ Inserted job ${index + 1}: ${jobData.jobTitle} with ID: ${result.insertedId}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to insert job ${index + 1}: ${jobData.jobTitle}`, error);
    return false;
  }
}

export async function getAllJsonData(): Promise<Resume[]> {
  const client = await getMongoClient();
  const db = client.getDatabase('workdemos');
  const collection = db.collection('resumes');
  const cursor = await collection.find({});
  return await cursor.toArray();
}

export async function insertJsonData(collection: Collection, jsonData: Resume, filePath: string): Promise<boolean> {
  try {
    const result = await collection.insertOne(jsonData);
    console.log(`✓ Inserted ${filePath} with ID: ${result.insertedId}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to insert ${filePath}:`, error);
    return false;
  }
} 