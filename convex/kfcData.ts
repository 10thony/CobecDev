import { query } from "./_generated/server";

// KFC data interface
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

// Sample KFC data - in production, this would come from your MongoDB cluster
const SAMPLE_KFC_DATA: KfcEntry[] = [
  {
    name: "John Doe",
    events: [
      { type: "Team", month: "JAN", quantity: 2 },
      { type: "Individ", month: "FEB", quantity: 1 }
    ],
    march_status: "Active",
    score: 150,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Jane Smith",
    events: [
      { type: "Team", month: "JAN", quantity: 1 },
      { type: "Team", month: "MAR", quantity: 3 }
    ],
    march_status: "Active",
    score: 200,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Mike Johnson",
    events: [
      { type: "Individ", month: "FEB", quantity: 1 }
    ],
    march_status: "Inactive",
    score: 50,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Get all KFC entries
export const getAllKfcEntries = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('📊 Fetching KFC entries from Convex backend...');
      
      // In a real implementation, this would query your MongoDB cluster
      // For now, we'll return sample data
      console.log(`✅ Returning ${SAMPLE_KFC_DATA.length} KFC entries`);
      return SAMPLE_KFC_DATA;
    } catch (error) {
      console.error('❌ Error fetching KFC entries:', error);
      throw error;
    }
  },
});

// Get all employees
export const getAllEmployees = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('👥 Fetching employees from Convex backend...');
      
      // Extract unique employee names from KFC data
      const employeeNames = [...new Set(SAMPLE_KFC_DATA.map(entry => entry.name))];
      
      const employees: Employee[] = employeeNames.map(name => ({
        name,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      console.log(`✅ Returning ${employees.length} employees`);
      return employees;
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      throw error;
    }
  },
});

// Get database status
export const getDatabaseStatus = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('📊 Getting database status from Convex backend...');
      
      const kfcCount = SAMPLE_KFC_DATA.length;
      const employeeCount = [...new Set(SAMPLE_KFC_DATA.map(entry => entry.name))].length;
      
      const status = {
        kfcCount,
        employeeCount
      };
      
      console.log(`✅ Database status: ${kfcCount} KFC entries, ${employeeCount} employees`);
      return status;
    } catch (error) {
      console.error('❌ Error getting database status:', error);
      throw error;
    }
  },
}); 