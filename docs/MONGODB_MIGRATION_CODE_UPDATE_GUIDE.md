# MongoDB Atlas to Local MongoDB Migration - Code Update Guide

## 🎯 System Prompt: Complete MongoDB Migration Code Updates

You are tasked with migrating a Node.js/TypeScript application from MongoDB Atlas (cloud) to a locally hosted MongoDB instance. The data migration has already been completed manually. Now you need to update all code files to use local MongoDB connection strings and remove Atlas-specific configurations.

## 📋 Current State Analysis

**Before (Atlas Configuration)**:
- Environment variables: `MONGODB_USERNAME`, `MONGODB_PASSWORD`, `MONGODB_CLUSTER`
- Connection string format: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`
- Client options: SSL/TLS, server API version, Atlas-specific timeouts

**After (Local Configuration)**:
- Environment variables: `MONGODB_HOST`, `MONGODB_PORT`, `MONGODB_DATABASE`, `MONGODB_USERNAME` (optional), `MONGODB_PASSWORD` (optional)
- Connection string format: `mongodb://host:port/database` or `mongodb://username:password@host:port/database`
- Client options: Simplified, no SSL/TLS, no server API version

## 🔧 Required Code Changes

### 1. Environment Variable Updates

**Replace these Atlas variables**:
```javascript
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';
```

**With these local variables**:
```javascript
const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
```

### 2. Connection String Updates

**Replace Atlas connection strings**:
```javascript
const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;
```

**With local connection strings**:
```javascript
let uri;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  uri = `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
} else {
  uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}
```

### 3. MongoDB Client Configuration Updates

**Remove these Atlas-specific options**:
```javascript
// REMOVE these options
serverApi: {
  version: ServerApiVersion.v1,
  strict: true,
  deprecationErrors: true,
},
tls: true,
tlsAllowInvalidCertificates: false,
tlsAllowInvalidHostnames: false,
retryWrites: true,
w: 'majority',
```

**Replace with simplified local options**:
```javascript
// USE these simplified options
connectTimeoutMS: 10000,
socketTimeoutMS: 10000,
maxPoolSize: 1,
minPoolSize: 0,
maxIdleTimeMS: 30000,
// No SSL/TLS needed for local MongoDB
// No serverApi version needed for local MongoDB
```

### 4. Import Statement Updates

**Remove Atlas-specific imports**:
```typescript
// REMOVE this import
import { ServerApiVersion } from "mongodb";
```

**Keep only the essential import**:
```typescript
import { MongoClient } from "mongodb";
```

## 📁 Files Requiring Updates

### Priority 1: Core Application Files
1. `convex/mongoSearch.ts` - Main MongoDB search functionality
2. `convex/vectorSearch.ts` - Vector search operations
3. `src/lib/mongoChatService.ts` - Chat service database operations

### Priority 2: Scripts and Utilities
4. `scripts/add-cobec-admin.js` - Admin user management
5. `scripts/backup-mongodb.js` - Database backup operations
6. `scripts/test-mongodb-kfc-data.js` - KFC data testing
7. `embedding_generator.js` - AI embedding generation
8. `vector_search.js` - Vector search implementation
9. `mongodbscripts.js` - General MongoDB operations
10. `mongodb_jobpostings.js` - Job posting operations
11. `mongodb_jobpostings_gemini.js` - Gemini AI job operations
12. `text_preprocessor.js` - Text processing utilities
13. `detailed_analysis.mjs` - Data analysis scripts
14. `resume_export2.js` - Resume export functionality

### Priority 3: Test Files
15. `tests/test_mongo_connection.js` - Connection testing
16. `tests/test_mongo_connection.mjs` - ES module connection testing
17. `tests/analyze_collections.js` - Collection analysis
18. `tests/analyze_data.mjs` - Data analysis testing

## 🔄 Update Patterns by File Type

### Pattern 1: Simple Script Files (.js)
```javascript
// BEFORE: Atlas configuration
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';
const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// AFTER: Local configuration
const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

let uri;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  uri = `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
} else {
  uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}

const client = new MongoClient(uri, {
  connectTimeoutMS: 10000,
  socketTimeoutMS: 10000,
  maxPoolSize: 1,
  minPoolSize: 0,
  maxIdleTimeMS: 30000,
});
```

### Pattern 2: TypeScript Files (.ts)
```typescript
// BEFORE: Atlas configuration with ServerApiVersion
import { MongoClient, ServerApiVersion } from "mongodb";

const MONGODB_USERNAME = process.env.MONGODB_USERNAME || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || '';
const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/workdemos?retryWrites=true&w=majority`;

function createMongoClient() {
  return new MongoClient(uri, {
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
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    retryWrites: true,
    w: 'majority',
  });
}

// AFTER: Local configuration without ServerApiVersion
import { MongoClient } from "mongodb";

const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

let uri: string;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  uri = `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
} else {
  uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}

function createMongoClient() {
  return new MongoClient(uri, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    maxPoolSize: 1,
    minPoolSize: 0,
    maxIdleTimeMS: 30000,
    // No SSL/TLS needed for local MongoDB
    // No serverApi version needed for local MongoDB
  });
}
```

### Pattern 3: ES Module Files (.mjs)
```javascript
// BEFORE: Atlas configuration in ES module
import { MongoClient, ServerApiVersion } from 'mongodb';

const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';
const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

// AFTER: Local configuration in ES module
import { MongoClient } from 'mongodb';

const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

let uri;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  uri = `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
} else {
  uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}
```

## 🚨 Special Considerations

### 1. Database Name in Connection String
- **Atlas**: Database name was often omitted or specified separately
- **Local**: Database name should be included in the connection string: `mongodb://host:port/database`

### 2. Authentication Handling
- **Atlas**: Always required authentication
- **Local**: Authentication is optional for development
- Use conditional logic to handle both authenticated and non-authenticated connections

### 3. Error Handling
- Update error messages to reflect local MongoDB context
- Remove Atlas-specific error handling (network timeouts, cluster issues)
- Add local-specific error handling (connection refused, port issues)

### 4. Testing and Validation
- After each file update, test the connection
- Verify that database operations still work
- Check that error handling is appropriate for local MongoDB

## 📝 Update Checklist for Each File

For each file that needs updating, ensure you:

- [ ] Update environment variable references
- [ ] Replace connection string format
- [ ] Remove Atlas-specific client options
- [ ] Add local MongoDB client options
- [ ] Remove unused imports (ServerApiVersion)
- [ ] Update error handling if needed
- [ ] Test the updated code
- [ ] Verify database operations work correctly

## 🔍 Testing After Updates

### 1. Connection Test
```bash
npm run mongodb:test-local
```

### 2. Functionality Test
- Test each updated file individually
- Verify database read/write operations
- Check that error handling works correctly

### 3. Integration Test
- Start the application
- Test end-to-end functionality
- Verify that all MongoDB-dependent features work

## 🎯 Migration Completion Criteria

The migration is complete when:

1. ✅ All files use local MongoDB connection strings
2. ✅ Atlas-specific client options are removed
3. ✅ Environment variables are updated to local format
4. ✅ All database operations work with local MongoDB
5. ✅ Error handling is appropriate for local environment
6. ✅ Application functionality is fully restored
7. ✅ No references to Atlas remain in the codebase

## 🚀 Next Steps After Code Updates

1. **Remove Atlas Environment Variables**: Delete `MONGODB_CLUSTER` from `.env.local`
2. **Update Documentation**: Reflect local MongoDB setup in README files
3. **Test Application**: Run full application tests
4. **Monitor Performance**: Ensure local MongoDB performance meets expectations
5. **Plan Future Migration**: Document steps for moving to private server later

---

**Migration Status**: Code Updates Required
**Estimated Time**: 2-4 hours
**Risk Level**: Medium (requires careful testing)
**Rollback Plan**: Keep Atlas environment variables until testing is complete
