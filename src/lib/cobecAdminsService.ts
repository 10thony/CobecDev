// Client-side service for cobecadmins collection operations
// This service checks if a user is in the cobecadmins collection

export interface CobecAdmin {
  _id?: string;
  clerkUserId: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class CobecAdminsService {
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
      console.log('🔌 Connecting to MongoDB cluster for cobecadmins operations...');
      
      // For client-side, we'll use a different approach
      // Since we can't directly import MongoDB in the browser, we'll use fetch
      console.log('✅ Using fetch-based approach for MongoDB cluster');
      return this.client = { type: 'fetch' };
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB cluster:', error);
      throw error;
    }
  }

  async checkIfUserIsAdmin(clerkUserId: string): Promise<boolean> {
    try {
      console.log(`🔍 Checking if user ${clerkUserId} is in cobecadmins collection...`);
      
      // In a real implementation, this would make an API call to your backend
      // For now, we'll simulate the check by making a request to a backend endpoint
      // or by checking against a predefined list of admin user IDs
      
      // For demonstration purposes, let's assume we have some admin user IDs
      // In production, this would be fetched from the cobecadmins collection
      const adminUserIds = [
        // Add actual admin user IDs here
        'user_2abc123def456', // Example Clerk user ID
        'user_2xyz789ghi012', // Example Clerk user ID
      ];
      
      const isAdmin = adminUserIds.includes(clerkUserId);
      console.log(`✅ User ${clerkUserId} admin status: ${isAdmin}`);
      
      return isAdmin;
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
      // Default to false if there's an error
      return false;
    }
  }

  async getAdminUser(clerkUserId: string): Promise<CobecAdmin | null> {
    try {
      console.log(`👤 Fetching admin user: ${clerkUserId}`);
      
      // In a real implementation, this would make an API call to your backend
      // For now, we'll return null since we don't have the actual data
      console.log('✅ Admin user fetch completed (simulated)');
      return null;
    } catch (error) {
      console.error('❌ Error fetching admin user:', error);
      return null;
    }
  }

  async getAllAdmins(): Promise<CobecAdmin[]> {
    try {
      console.log('👥 Fetching all cobecadmins...');
      
      // In a real implementation, this would make an API call to your backend
      // For now, we'll return an empty array
      console.log('✅ All admins fetched (simulated)');
      return [];
    } catch (error) {
      console.error('❌ Error fetching all admins:', error);
      return [];
    }
  }
}

// Create a singleton instance
let cobecAdminsServiceInstance: CobecAdminsService | null = null;

export async function getCobecAdminsService(): Promise<CobecAdminsService> {
  if (!cobecAdminsServiceInstance) {
    cobecAdminsServiceInstance = new CobecAdminsService();
  }
  
  // Ensure connection is established
  await cobecAdminsServiceInstance.connect();
  
  return cobecAdminsServiceInstance;
} 