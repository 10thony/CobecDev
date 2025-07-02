"use node";
import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { MongoClient, ServerApiVersion } from "mongodb";

// MongoDB credentials
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';

const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

// Nomination interface
export interface Nomination {
  _id?: string;
  nominatedBy: string;
  nominatedEmployee: string;
  nominationType: 'Team' | 'Individual' | 'Growth';
  description: string;
  pointsAwarded: number;
  status: 'pending' | 'approved' | 'declined';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Nomination document for MongoDB insertion (without _id)
export interface NominationDocument {
  nominatedBy: string;
  nominatedEmployee: string;
  nominationType: 'Team' | 'Individual' | 'Growth';
  description: string;
  pointsAwarded: number;
  status: 'pending' | 'approved' | 'declined';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to convert MongoDB ObjectId to string
function convertMongoDocument(doc: any): any {
  if (!doc) return doc;

  if (doc.constructor && doc.constructor.name === 'ObjectId' && doc.toString) {
    return doc.toString();
  }

  if (Array.isArray(doc)) {
    return doc.map(item => convertMongoDocument(item));
  }

  if (typeof doc === 'object') {
    const newDoc: any = {};
    for (const [key, value] of Object.entries(doc)) {
      newDoc[key] = convertMongoDocument(value);
    }
    return newDoc;
  }

  return doc;
}

// Create a new nomination
export const createNomination = action({
  args: {
    nominatedBy: v.string(),
    nominatedEmployee: v.string(),
    nominationType: v.union(v.literal('Team'), v.literal('Individual'), v.literal('Growth')),
    description: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    nominationId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    let client;
    
    try {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      
      // Ensure nominations collection exists
      const collections = await db.listCollections({ name: 'nominations' }).toArray();
      if (collections.length === 0) {
        await db.createCollection('nominations');
      }
      
      const nominationsCollection = db.collection('nominations');
      
      // Calculate points based on nomination type
      const getPointsForNominationType = (type: 'Team' | 'Individual' | 'Growth'): number => {
        switch (type) {
          case 'Team':
            return 10;
          case 'Individual':
            return 20;
          case 'Growth':
            return 30;
          default:
            return 0;
        }
      };
      
      const pointsAwarded = getPointsForNominationType(args.nominationType);
      
      // Create nomination document for MongoDB insertion
      const nomination: NominationDocument = {
        nominatedBy: args.nominatedBy.trim(),
        nominatedEmployee: args.nominatedEmployee.trim(),
        nominationType: args.nominationType,
        description: args.description.trim(),
        pointsAwarded,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await nominationsCollection.insertOne(nomination);
      
      console.log(`✅ Created nomination: ${result.insertedId}`);
      
      return {
        success: true,
        nominationId: result.insertedId.toString(),
      };
      
    } catch (error) {
      console.error('❌ Error creating nomination:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create nomination',
      };
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Get all nominations
export const getAllNominations = action({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    let client;
    
    try {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const nominationsCollection = db.collection('nominations');
      
      const nominations = await nominationsCollection.find({}).sort({ createdAt: -1 }).toArray();
      console.log(`Retrieved ${nominations.length} nominations from MongoDB`);
      
      return nominations.map(convertMongoDocument);
      
    } catch (error) {
      console.error('Error getting nominations:', error);
      throw new Error(`Failed to get nominations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Get pending nominations only
export const getPendingNominations = action({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    let client;
    
    try {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      const nominationsCollection = db.collection('nominations');
      
      const nominations = await nominationsCollection.find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
      console.log(`Retrieved ${nominations.length} pending nominations from MongoDB`);
      
      return nominations.map(convertMongoDocument);
      
    } catch (error) {
      console.error('Error getting pending nominations:', error);
      throw new Error(`Failed to get pending nominations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Approve a nomination
export const approveNomination = action({
  args: {
    nominationId: v.string(),
    approvedBy: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    let client;
    
    try {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      
      // Import ObjectId for MongoDB
      const { ObjectId } = await import('mongodb');
      
      const nominationsCollection = db.collection('nominations');
      const kfcCollection = db.collection('kfcpoints');
      
      // Get the nomination
      const nomination = await nominationsCollection.findOne({ _id: new ObjectId(args.nominationId) });
      
      if (!nomination) {
        return {
          success: false,
          error: 'Nomination not found',
        };
      }
      
      if (nomination.status !== 'pending') {
        return {
          success: false,
          error: 'Nomination is not pending approval',
        };
      }
      
      // Update nomination status
      await nominationsCollection.updateOne(
        { _id: new ObjectId(args.nominationId) },
        {
          $set: {
            status: 'approved',
            approvedBy: args.approvedBy,
            approvedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      // Update KFC points for the nominated employee
      const kfcEntry = await kfcCollection.findOne({ name: nomination.nominatedEmployee });
      
      if (kfcEntry) {
        // Add new event to the employee's KFC entry
        const newEvent = {
          type: nomination.nominationType === 'Growth' ? 'Individ' : nomination.nominationType,
          month: new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase(),
          quantity: 1
        };
        
        const updatedEvents = [...kfcEntry.events, newEvent];
        const newScore = kfcEntry.score + nomination.pointsAwarded;
        
        await kfcCollection.updateOne(
          { _id: kfcEntry._id },
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
        const newKfcEntry = {
          name: nomination.nominatedEmployee,
          events: [{
            type: nomination.nominationType === 'Growth' ? 'Individ' : nomination.nominationType,
            month: new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase(),
            quantity: 1
          }],
          march_status: null,
          score: nomination.pointsAwarded,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await kfcCollection.insertOne(newKfcEntry);
      }
      
      console.log(`✅ Approved nomination: ${args.nominationId}`);
      
      return {
        success: true,
      };
      
    } catch (error) {
      console.error('❌ Error approving nomination:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve nomination',
      };
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Decline a nomination
export const declineNomination = action({
  args: {
    nominationId: v.string(),
    declinedBy: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    let client;
    
    try {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      
      // Import ObjectId for MongoDB
      const { ObjectId } = await import('mongodb');
      
      const nominationsCollection = db.collection('nominations');
      
      // Get the nomination
      const nomination = await nominationsCollection.findOne({ _id: new ObjectId(args.nominationId) });
      
      if (!nomination) {
        return {
          success: false,
          error: 'Nomination not found',
        };
      }
      
      if (nomination.status !== 'pending') {
        return {
          success: false,
          error: 'Nomination is not pending approval',
        };
      }
      
      // Update nomination status to declined
      await nominationsCollection.updateOne(
        { _id: new ObjectId(args.nominationId) },
        {
          $set: {
            status: 'declined',
            approvedBy: args.declinedBy, // Reusing the field for declinedBy
            approvedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`✅ Declined nomination: ${args.nominationId}`);
      
      return {
        success: true,
      };
      
    } catch (error) {
      console.error('❌ Error declining nomination:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decline nomination',
      };
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Delete a nomination
export const deleteNomination = action({
  args: {
    nominationId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    let client;
    
    try {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      });
      
      await client.connect();
      const db = client.db('workdemos');
      
      // Import ObjectId for MongoDB
      const { ObjectId } = await import('mongodb');
      
      const nominationsCollection = db.collection('nominations');
      
      const result = await nominationsCollection.deleteOne({ _id: new ObjectId(args.nominationId) });
      
      if (result.deletedCount === 0) {
        return {
          success: false,
          error: 'Nomination not found',
        };
      }
      
      console.log(`✅ Deleted nomination: ${args.nominationId}`);
      
      return {
        success: true,
      };
      
    } catch (error) {
      console.error('❌ Error deleting nomination:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete nomination',
      };
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
}); 