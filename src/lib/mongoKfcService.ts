// Server-side MongoDB service for KFC operations
// This connects to the actual MongoDB cluster, not IndexedDB

export interface KfcEvent {
  type: 'Team' | 'Individ';
  month: string;
  quantity?: number;
}

export interface KfcEntry {
  _id?: string;
  name: string;
  events: KfcEvent[];
  march_status: string | null;
  score: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Employee {
  _id?: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Nomination {
  _id?: string;
  nominatedBy: string;
  nominatedEmployee: string;
  nominationType: 'Team' | 'Individual' | 'Growth';
  description: string;
  pointsAwarded: number;
  createdAt: Date;
  updatedAt: Date;
}

class MongoKfcService {
  private client: any = null;
  private readonly uri: string;

  constructor() {
    // Get MongoDB credentials from environment variables
    const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
    const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
    const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

    this.uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;
  }

  async connect() {
    if (this.client) return this.client;
    
    try {
      console.log('🔌 Connecting to MongoDB cluster for KFC operations...');
      
      // Import MongoDB client dynamically for browser compatibility
      const { MongoClient, ServerApiVersion } = await import('mongodb');
      
      this.client = new MongoClient(this.uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });
      
      await this.client.connect();
      console.log('✅ Connected to MongoDB cluster successfully');
      return this.client;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB cluster:', error);
      throw error;
    }
  }

  async getDatabase() {
    if (!this.client) {
      await this.connect();
    }
    return this.client.db('workdemos');
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      console.log('🔌 MongoDB cluster connection closed');
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  // KFC Points operations
  async getAllKfcEntries(): Promise<KfcEntry[]> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('kfcpoints');
      return await collection.find({}).toArray();
    } catch (error) {
      console.error('❌ Error fetching KFC entries:', error);
      throw error;
    }
  }

  async getKfcEntryByName(name: string): Promise<KfcEntry | null> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('kfcpoints');
      return await collection.findOne({ name });
    } catch (error) {
      console.error('❌ Error fetching KFC entry:', error);
      throw error;
    }
  }

  async updateKfcEntry(name: string, updates: Partial<KfcEntry>): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('kfcpoints');
      
      const result = await collection.updateOne(
        { name },
        { 
          $set: { 
            ...updates,
            updatedAt: new Date()
          }
        }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('❌ Error updating KFC entry:', error);
      throw error;
    }
  }

  async insertKfcEntry(entry: KfcEntry): Promise<string> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('kfcpoints');
      
      const kfcEntry = {
        ...entry,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(kfcEntry);
      return result.insertedId.toString();
    } catch (error) {
      console.error('❌ Error inserting KFC entry:', error);
      throw error;
    }
  }

  // Employee operations
  async getAllEmployees(): Promise<Employee[]> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('employees');
      return await collection.find({}).toArray();
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      throw error;
    }
  }

  async insertEmployee(employee: Employee): Promise<string> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('employees');
      
      const newEmployee = {
        ...employee,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(newEmployee);
      return result.insertedId.toString();
    } catch (error) {
      console.error('❌ Error inserting employee:', error);
      throw error;
    }
  }

  async deleteEmployee(employeeId: string): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('employees');
      
      const result = await collection.deleteOne({ _id: employeeId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('❌ Error deleting employee:', error);
      throw error;
    }
  }

  // Nomination operations
  async getAllNominations(): Promise<Nomination[]> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('nominations');
      return await collection.find({}).toArray();
    } catch (error) {
      console.error('❌ Error fetching nominations:', error);
      throw error;
    }
  }

  async insertNomination(nomination: Nomination): Promise<string> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('nominations');
      
      const newNomination = {
        ...nomination,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(newNomination);
      return result.insertedId.toString();
    } catch (error) {
      console.error('❌ Error inserting nomination:', error);
      throw error;
    }
  }

  // Database status
  async getDatabaseStatus(): Promise<{
    kfcCount: number;
    employeeCount: number;
    nominationCount: number;
  }> {
    try {
      const db = await this.getDatabase();
      const kfcCollection = db.collection('kfcpoints');
      const employeesCollection = db.collection('employees');
      const nominationsCollection = db.collection('nominations');
      
      const [kfcCount, employeeCount, nominationCount] = await Promise.all([
        kfcCollection.countDocuments(),
        employeesCollection.countDocuments(),
        nominationsCollection.countDocuments()
      ]);
      
      return { kfcCount, employeeCount, nominationCount };
    } catch (error) {
      console.error('❌ Error getting database status:', error);
      throw error;
    }
  }
}

// Create a singleton instance
let kfcServiceInstance: MongoKfcService | null = null;

export async function getMongoKfcService(): Promise<MongoKfcService> {
  if (!kfcServiceInstance) {
    kfcServiceInstance = new MongoKfcService();
  }
  
  // Ensure connection is established
  if (!kfcServiceInstance.isConnected()) {
    await kfcServiceInstance.connect();
  }
  
  return kfcServiceInstance;
}

export async function closeMongoKfcService(): Promise<void> {
  if (kfcServiceInstance) {
    await kfcServiceInstance.close();
    kfcServiceInstance = null;
  }
} 