# MongoDB Atlas to Local MongoDB Migration Guide

This guide will help you migrate from MongoDB Atlas (cloud) to a locally hosted MongoDB instance.

## 🎯 Migration Overview

**Current State**: Using MongoDB Atlas cluster with connection string format:
```
mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority
```

**Target State**: Using local MongoDB with connection string format:
```
mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}
```

## 🚀 Quick Start Migration

### Step 1: Setup Local MongoDB Configuration

```bash
# Run the setup script to configure local MongoDB
npm run mongodb:setup-local
```

This will:
- Update your `.env.local` file with local MongoDB settings
- Replace Atlas variables with local ones
- Preserve other environment variables (Convex, Clerk, OpenAI)

### Step 2: Test Local MongoDB Connection

```bash
# Test if local MongoDB is accessible
npm run mongodb:test-local
```

### Step 3: Migrate Data from Atlas

```bash
# Copy all data from Atlas to local MongoDB
npm run mongodb:migrate-atlas
```

### Step 4: Verify Migration

```bash
# Check local MongoDB status and collections
npm run mongodb:utils
```

## 📋 Detailed Migration Steps

### Prerequisites

1. **Local MongoDB Installation**
   - Windows: Download and install MongoDB Community Server
   - macOS: `brew install mongodb-community`
   - Linux: Follow MongoDB installation guide for your distribution

2. **MongoDB Service Running**
   - Windows: Start MongoDB service or run `mongod`
   - macOS: `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`

3. **Database Access**
   - Ensure MongoDB is accessible on `localhost:27017`
   - Create a user account if you want authentication (optional for local dev)

### Environment Variables Update

**Before (Atlas)**:
```bash
MONGODB_USERNAME=your_atlas_username
MONGODB_PASSWORD=your_atlas_password
MONGODB_CLUSTER=your_cluster.mongodb.net
```

**After (Local)**:
```bash
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=workdemos
MONGODB_USERNAME=your_local_username  # Optional
MONGODB_PASSWORD=your_local_password  # Optional
```

### Connection String Changes

**Atlas Connection String**:
```javascript
const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;
```

**Local Connection String**:
```javascript
const uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
```

### Client Configuration Changes

**Atlas Client Options** (remove these for local):
```javascript
// Remove these Atlas-specific options
serverApi: {
  version: ServerApiVersion.v1,
  strict: true,
  deprecationErrors: true,
},
tls: true,
tlsAllowInvalidCertificates: false,
tlsAllowInvalidHostnames: false,
```

**Local Client Options**:
```javascript
// Use these simplified options for local MongoDB
connectTimeoutMS: 10000,
socketTimeoutMS: 10000,
maxPoolSize: 1,
minPoolSize: 0,
maxIdleTimeMS: 30000,
// No SSL/TLS needed
// No serverApi version needed
```

## 🔧 Code Updates Required

### Files That Need Updates

The following files currently use Atlas connection strings and need to be updated:

1. **Convex Functions**:
   - `convex/mongoSearch.ts`
   - `convex/vectorSearch.ts`

2. **Scripts**:
   - `scripts/add-cobec-admin.js`
   - `scripts/backup-mongodb.js`
   - `scripts/test-mongodb-kfc-data.js`

3. **Test Files**:
   - `tests/test_mongo_connection.js`
   - `tests/test_mongo_connection.mjs`
   - `tests/analyze_collections.js`
   - `tests/analyze_data.mjs`

4. **Utility Files**:
   - `embedding_generator.js`
   - `vector_search.js`
   - `mongodbscripts.js`
   - `mongodb_jobpostings.js`
   - `mongodb_jobpostings_gemini.js`
   - `text_preprocessor.js`
   - `detailed_analysis.mjs`
   - `resume_export2.js`

### Update Pattern

Replace Atlas connection logic with local connection logic:

```javascript
// OLD: Atlas connection
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'adminuser';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'hnuWXvLBzcDfUbdZ';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'demo.y407omc.mongodb.net';
const uri = `mongodb+srv://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority`;

// NEW: Local connection
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

## 🧪 Testing Your Migration

### 1. Test Local Connection
```bash
npm run mongodb:test-local
```

### 2. Verify Data Migration
```bash
npm run mongodb:utils
```

### 3. Test Application Functionality
- Start your development server
- Test database operations
- Verify vector search functionality
- Check KFC management features

## 🚨 Common Issues and Solutions

### Connection Refused
**Error**: `ECONNREFUSED`
**Solution**: Ensure MongoDB service is running locally

### Authentication Failed
**Error**: `Authentication failed`
**Solution**: Check username/password or disable authentication for local development

### SSL/TLS Errors
**Error**: SSL-related errors
**Solution**: Remove SSL/TLS options from client configuration (not needed for local)

### Port Already in Use
**Error**: `Port 27017 already in use`
**Solution**: Change MongoDB port or stop conflicting service

## 🔄 Rollback Plan

If you need to rollback to Atlas:

1. **Restore Environment Variables**:
   ```bash
   # Restore Atlas variables in .env.local
   MONGODB_USERNAME=your_atlas_username
   MONGODB_PASSWORD=your_atlas_password
   MONGODB_CLUSTER=your_cluster.mongodb.net
   ```

2. **Revert Code Changes**:
   - Restore Atlas connection strings
   - Add back Atlas-specific client options

3. **Test Atlas Connection**:
   ```bash
   npm run test-mongodb-kfc-data
   ```

## 📊 Migration Checklist

- [ ] Install local MongoDB
- [ ] Start MongoDB service
- [ ] Run `npm run mongodb:setup-local`
- [ ] Update `.env.local` with local settings
- [ ] Test local connection with `npm run mongodb:test-local`
- [ ] Migrate data with `npm run mongodb:migrate-atlas`
- [ ] Update application code to use local connection strings
- [ ] Remove Atlas-specific client options
- [ ] Test application functionality
- [ ] Verify data integrity
- [ ] Remove Atlas environment variables
- [ ] Document local MongoDB setup

## 🎉 Benefits of Local MongoDB

1. **Cost Savings**: No more Atlas cluster costs
2. **Performance**: Lower latency for local development
3. **Control**: Full control over database configuration
4. **Offline Development**: Work without internet connection
5. **Data Privacy**: Data stays on your local machine/server

## 🔮 Future Server Migration

When you're ready to move to a private server:

1. Update `MONGODB_HOST` to your server IP/hostname
2. Ensure server firewall allows connections on port 27017
3. Configure MongoDB for network access
4. Update connection strings in your application
5. Consider using SSL/TLS for production security

## 📞 Support

If you encounter issues during migration:

1. Check MongoDB logs for errors
2. Verify network connectivity
3. Test with MongoDB Compass or similar tool
4. Review this migration guide
5. Check MongoDB documentation for your specific setup

---

**Migration Status**: Ready to begin
**Estimated Time**: 30-60 minutes
**Risk Level**: Low (easily reversible)
