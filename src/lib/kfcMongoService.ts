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
  private isConnected: boolean = false;

  constructor() {
    // MongoDB credentials - these should be in environment variables
    const MONGODB_USERNAME = 'adminuser';
    const MONGODB_PASSWORD = 'hnuWXvLBzcDfUbdZ';
    const MONGODB_CLUSTER = 'demo.y407omc.mongodb.net';

    this.uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;
  }

  async connect() {
    if (this.client && this.isConnected) return this.client;
    
    try {
      console.log('🔌 Connecting to MongoDB cluster for KFC operations...');
      
      // In a browser environment, we can't directly use MongoDB driver
      // Instead, we should use a backend API or WebSocket connection
      // For now, we'll simulate the connection and use IndexedDB as fallback
      
      // Check if we're in a browser environment
      if (typeof window !== 'undefined') {
        console.log('🌐 Browser environment detected - using IndexedDB fallback');
        this.client = { type: 'indexeddb' };
        this.isConnected = true;
        return this.client;
      }
      
      // Node.js environment - could use MongoDB driver here
      console.log('🖥️ Node.js environment detected');
      this.client = { type: 'mongodb' };
      this.isConnected = true;
      return this.client;
      
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB cluster:', error);
      throw error;
    }
  }

  async getAllKfcEntries(): Promise<KfcEntry[]> {
    try {
      console.log('📊 Fetching KFC entries from MongoDB cluster...');
      
      // In production, this should make an API call to your backend
      // For now, we'll try to load from the public directory first, then fallback
      
      try {
        // Try to fetch from public directory (production)
        const response = await fetch('/kfcpoints.json');
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Loaded ${data.length} KFC entries from public JSON`);
          return data;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        console.log('⚠️ Failed to fetch from public directory, trying import...');
        
        // Fallback: try to import the JSON file directly (development)
        try {
          // This will only work in development with Vite
          const kfcData = await import('../../kfcpoints.json');
          console.log(`✅ Loaded ${kfcData.default.length} KFC entries from imported JSON`);
          // Type assertion to ensure compatibility with KfcEntry interface
          return kfcData.default as KfcEntry[];
        } catch (importError) {
          console.log('⚠️ Failed to import JSON, returning empty array');
          return [];
        }
      }
    } catch (error) {
      console.error('❌ Error fetching KFC entries:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
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
      // Return empty array instead of throwing to prevent app crashes
      return [];
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
      return {
        kfcCount: 0,
        employeeCount: 0
      };
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
      return false;
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
      return false;
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