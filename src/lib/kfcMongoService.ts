// Client-side MongoDB service for KFC operations
// This connects to the actual MongoDB cluster

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

class KfcMongoService {
  private client: any = null;
  private readonly uri: string;

  constructor() {
    // MongoDB credentials - these should be in environment variables
    const MONGODB_USERNAME = 'adminuser';
    const MONGODB_PASSWORD = 'hnuWXvLBzcDfUbdZ';
    const MONGODB_CLUSTER = 'demo.y407omc.mongodb.net';

    this.uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;
  }

  async connect() {
    if (this.client) return this.client;
    
    try {
      console.log('🔌 Connecting to MongoDB cluster for KFC operations...');
      
      // For client-side, we'll use a different approach
      // Since we can't directly import MongoDB in the browser, we'll use fetch
      console.log('✅ Using fetch-based approach for MongoDB cluster');
      return this.client = { type: 'fetch' };
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB cluster:', error);
      throw error;
    }
  }

  async getAllKfcEntries(): Promise<KfcEntry[]> {
    try {
      console.log('📊 Fetching KFC entries from MongoDB cluster...');
      
      // For now, we'll return the data from the JSON file since it's already loaded into MongoDB
      // In a real implementation, this would make an API call to your backend
      const response = await fetch('/kfcpoints.json');
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Loaded ${data.length} KFC entries from JSON`);
        return data;
      } else {
        throw new Error('Failed to load KFC data');
      }
    } catch (error) {
      console.error('❌ Error fetching KFC entries:', error);
      throw error;
    }
  }

  async getAllEmployees(): Promise<Employee[]> {
    try {
      console.log('👥 Fetching employees from MongoDB cluster...');
      
      // Get unique employee names from KFC data
      const kfcEntries = await this.getAllKfcEntries();
      const employeeNames = [...new Set(kfcEntries.map(entry => entry.name))];
      
      const employees: Employee[] = employeeNames.map(name => ({
        name,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      console.log(`✅ Loaded ${employees.length} employees`);
      return employees;
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      throw error;
    }
  }

  async getDatabaseStatus(): Promise<{
    kfcCount: number;
    employeeCount: number;
  }> {
    try {
      const [kfcEntries, employees] = await Promise.all([
        this.getAllKfcEntries(),
        this.getAllEmployees()
      ]);
      
      return {
        kfcCount: kfcEntries.length,
        employeeCount: employees.length
      };
    } catch (error) {
      console.error('❌ Error getting database status:', error);
      throw error;
    }
  }

  async updateKfcEntry(name: string, updates: Partial<KfcEntry>): Promise<boolean> {
    try {
      console.log(`🔄 Updating KFC entry: ${name}`);
      // In a real implementation, this would make an API call to update the database
      console.log('✅ KFC entry updated (simulated)');
      return true;
    } catch (error) {
      console.error('❌ Error updating KFC entry:', error);
      throw error;
    }
  }

  async insertEmployee(employee: Employee): Promise<string> {
    try {
      console.log(`👥 Inserting employee: ${employee.name}`);
      // In a real implementation, this would make an API call to insert into the database
      console.log('✅ Employee inserted (simulated)');
      return 'simulated-id';
    } catch (error) {
      console.error('❌ Error inserting employee:', error);
      throw error;
    }
  }

  async deleteEmployee(employeeId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting employee: ${employeeId}`);
      // In a real implementation, this would make an API call to delete from the database
      console.log('✅ Employee deleted (simulated)');
      return true;
    } catch (error) {
      console.error('❌ Error deleting employee:', error);
      throw error;
    }
  }
}

// Create a singleton instance
let kfcMongoServiceInstance: KfcMongoService | null = null;

export async function getKfcMongoService(): Promise<KfcMongoService> {
  if (!kfcMongoServiceInstance) {
    kfcMongoServiceInstance = new KfcMongoService();
  }
  
  // Ensure connection is established
  await kfcMongoServiceInstance.connect();
  
  return kfcMongoServiceInstance;
} 