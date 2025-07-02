import { getKfcMongoService } from './kfcMongoService';
import { getMongoClient } from './mongoClient';

// Global data types
export interface GlobalDataState {
  kfcEntries: any[];
  employees: any[];
  jobPostings: any[];
  resumes: any[];
  nominations: any[];
  isLoading: boolean;
  error: string | null;
  lastLoaded: Date | null;
}

// Global data service class
class GlobalDataService {
  private state: GlobalDataState = {
    kfcEntries: [],
    employees: [],
    jobPostings: [],
    resumes: [],
    nominations: [],
    isLoading: false,
    error: null,
    lastLoaded: null
  };

  private listeners: ((state: GlobalDataState) => void)[] = [];
  private loadingPromise: Promise<void> | null = null;

  // Subscribe to data changes
  subscribe(listener: (state: GlobalDataState) => void) {
    this.listeners.push(listener);
    // Immediately call with current state
    listener(this.state);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Update state
  private updateState(updates: Partial<GlobalDataState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  // Load all data from MongoDB
  async loadAllData(forceRefresh = false): Promise<void> {
    // If already loading, return the existing promise
    if (this.loadingPromise && !forceRefresh) {
      return this.loadingPromise;
    }

    // Check if we should use cached data (cache for 5 minutes)
    if (!forceRefresh && this.state.lastLoaded) {
      const cacheAge = Date.now() - this.state.lastLoaded.getTime();
      const maxCacheAge = 5 * 60 * 1000; // 5 minutes
      
      if (cacheAge < maxCacheAge && this.state.kfcEntries.length > 0) {
        console.log('📦 Using cached global data');
        return;
      }
    }

    this.loadingPromise = this.performDataLoad();
    return this.loadingPromise;
  }

  private async performDataLoad(): Promise<void> {
    try {
      console.log('🔄 Loading all global data from MongoDB...');
      this.updateState({ isLoading: true, error: null });

      // Try to load from MongoDB cluster first
      try {
        const kfcService = await getKfcMongoService();
        console.log('✅ Connected to KFC MongoDB service');

        // Load KFC data and employees
        const [kfcEntries, employees] = await Promise.all([
          kfcService.getAllKfcEntries(),
          kfcService.getAllEmployees()
        ]);

        console.log(`✅ Loaded ${kfcEntries.length} KFC entries and ${employees.length} employees from MongoDB cluster`);

        this.updateState({
          kfcEntries,
          employees,
          lastLoaded: new Date()
        });

      } catch (mongoError) {
        console.log('⚠️ MongoDB cluster not available, falling back to IndexedDB:', mongoError);
        
        // Fallback to IndexedDB
        const client = await getMongoClient();
        const db = await client.getDatabase('workdemos');

        // Load KFC data
        const kfcCollection = db.collection('kfcpoints');
        const kfcEntries = await kfcCollection.findToArray({});

        // Load employees
        const employeesCollection = db.collection('employees');
        const employees = await employeesCollection.findToArray({});

        // Load nominations
        const nominationsCollection = db.collection('nominations');
        const nominations = await nominationsCollection.findToArray({});

        console.log(`✅ Loaded from IndexedDB: ${kfcEntries.length} KFC entries, ${employees.length} employees, ${nominations.length} nominations`);

        this.updateState({
          kfcEntries,
          employees,
          nominations,
          lastLoaded: new Date()
        });
      }

      // Note: Job postings and resumes are loaded separately by DataManagementPage
      // since they use Convex actions and have their own caching

      console.log('🎉 Global data loading completed successfully');

    } catch (error) {
      console.error('❌ Error loading global data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      this.updateState({ error: errorMessage });
    } finally {
      this.updateState({ isLoading: false });
      this.loadingPromise = null;
    }
  }

  // Get current state
  getState(): GlobalDataState {
    return this.state;
  }

  // Refresh specific data types
  async refreshKfcData(): Promise<void> {
    try {
      this.updateState({ isLoading: true, error: null });

      const kfcService = await getKfcMongoService();
      const [kfcEntries, employees] = await Promise.all([
        kfcService.getAllKfcEntries(),
        kfcService.getAllEmployees()
      ]);

      this.updateState({
        kfcEntries,
        employees,
        lastLoaded: new Date()
      });

    } catch (error) {
      console.error('❌ Error refreshing KFC data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh KFC data';
      this.updateState({ error: errorMessage });
    } finally {
      this.updateState({ isLoading: false });
    }
  }

  // Add new employee
  async addEmployee(name: string): Promise<void> {
    try {
      const newEmployee = {
        _id: Date.now().toString(),
        name,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add to local state immediately for optimistic update
      this.updateState({
        employees: [...this.state.employees, newEmployee]
      });

      // Try to save to MongoDB cluster
      try {
        const kfcService = await getKfcMongoService();
        await kfcService.insertEmployee(newEmployee);
      } catch (mongoError) {
        console.log('⚠️ Failed to save to MongoDB cluster, using IndexedDB fallback');
        
        // Fallback to IndexedDB
        const client = await getMongoClient();
        const db = await client.getDatabase('workdemos');
        const employeesCollection = db.collection('employees');
        await employeesCollection.insertOne(newEmployee);
      }

    } catch (error) {
      console.error('❌ Error adding employee:', error);
      // Revert optimistic update
      this.updateState({
        employees: this.state.employees.filter(emp => emp.name !== name)
      });
      throw error;
    }
  }

  // Remove employee
  async removeEmployee(employeeId: string): Promise<void> {
    const employeeToRemove = this.state.employees.find(emp => emp._id === employeeId);
    
    try {
      // Remove from local state immediately for optimistic update
      this.updateState({
        employees: this.state.employees.filter(emp => emp._id !== employeeId)
      });

      // Try to remove from MongoDB cluster
      try {
        const kfcService = await getKfcMongoService();
        await kfcService.deleteEmployee(employeeId);
      } catch (mongoError) {
        console.log('⚠️ Failed to remove from MongoDB cluster, using IndexedDB fallback');
        
        // Fallback to IndexedDB
        const client = await getMongoClient();
        const db = await client.getDatabase('workdemos');
        const employeesCollection = db.collection('employees');
        await employeesCollection.deleteOne({ _id: employeeId });
      }

    } catch (error) {
      console.error('❌ Error removing employee:', error);
      // Revert optimistic update
      if (employeeToRemove) {
        this.updateState({
          employees: [...this.state.employees, employeeToRemove]
        });
      }
      throw error;
    }
  }
}

// Create singleton instance
const globalDataService = new GlobalDataService();

export default globalDataService; 