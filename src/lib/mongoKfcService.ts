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
  status?: 'pending' | 'approved' | 'declined';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class MongoKfcService {
  private client: any = null;
  private readonly uri: string;

  constructor() {
    // Get MongoDB credentials - handle both browser and Node.js environments
    let MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_CLUSTER;
    
    if (typeof window !== 'undefined') {
      // Browser environment - use hardcoded values or import.meta.env
      MONGODB_USERNAME = '';
      MONGODB_PASSWORD = '';
      MONGODB_CLUSTER = '';
    } else {
      // Node.js environment - use process.env
      MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
      MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
      MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';
    }

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

  async updateNomination(nominationId: string, updates: Partial<Nomination>): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('nominations');
      
      const result = await collection.updateOne(
        { _id: nominationId },
        { 
          $set: { 
            ...updates,
            updatedAt: new Date()
          }
        }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('❌ Error updating nomination:', error);
      throw error;
    }
  }

  async approveNomination(nominationId: string, approvedBy: string): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('nominations');
      
      // Get the nomination first
      const nomination = await collection.findOne({ _id: nominationId });
      if (!nomination) {
        throw new Error('Nomination not found');
      }
      
      const now = new Date();
      
      // Update nomination status
      const result = await collection.updateOne(
        { _id: nominationId },
        { 
          $set: { 
            status: 'approved',
            approvedBy,
            approvedAt: now,
            updatedAt: now
          }
        }
      );
      
      // Update KFC points for the nominated employee
      if (result.modifiedCount > 0) {
        await this.updateKfcPointsForNomination(nomination.nominatedEmployee, nomination.pointsAwarded, nomination.nominationType);
      }
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('❌ Error approving nomination:', error);
      throw error;
    }
  }

  async declineNomination(nominationId: string, declinedBy: string): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('nominations');
      
      const result = await collection.updateOne(
        { _id: nominationId },
        { 
          $set: { 
            status: 'declined',
            approvedBy: declinedBy, // Reusing the field for declinedBy
            approvedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('❌ Error declining nomination:', error);
      throw error;
    }
  }

  async deleteNomination(nominationId: string): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('nominations');
      
      const result = await collection.deleteOne({ _id: nominationId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('❌ Error deleting nomination:', error);
      throw error;
    }
  }

  private async updateKfcPointsForNomination(employeeName: string, pointsAwarded: number, nominationType: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection('kfcpoints');
      
      // Find existing KFC entry
      const kfcEntry = await collection.findOne({ name: employeeName });
      
      if (kfcEntry) {
        // Add new event to the employee's KFC entry
        const newEvent = {
          type: nominationType === 'Growth' ? 'Individ' : nominationType,
          month: new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase(),
          quantity: 1
        };
        
        const updatedEvents = [...(kfcEntry.events || []), newEvent];
        const newScore = (kfcEntry.score || 0) + pointsAwarded;
        
        await collection.updateOne(
          { name: employeeName },
          {
            $set: {
              events: updatedEvents,
              score: newScore,
              updatedAt: new Date()
            }
          }
        );
      } else {
        // Create new KFC entry if it doesn't exist
        await collection.insertOne({
          name: employeeName,
          events: [{
            type: nominationType === 'Growth' ? 'Individ' : nominationType,
            month: new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase(),
            quantity: 1
          }],
          march_status: undefined,
          score: pointsAwarded,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Error updating KFC points:', error);
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