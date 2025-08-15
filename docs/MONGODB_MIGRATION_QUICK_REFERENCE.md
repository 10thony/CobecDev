# MongoDB Migration Quick Reference Card

## 🔄 Quick Code Transformation

### Environment Variables
```javascript
// OLD (Atlas)
MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_CLUSTER

// NEW (Local)
MONGODB_HOST, MONGODB_PORT, MONGODB_DATABASE, MONGODB_USERNAME, MONGODB_PASSWORD
```

### Connection String
```javascript
// OLD (Atlas)
mongodb+srv://${username}:${password}@${cluster}/?retryWrites=true&w=majority

// NEW (Local)
mongodb://${host}:${port}/${database}
// OR with auth:
mongodb://${username}:${password}@${host}:${port}/${database}
```

### Client Options
```javascript
// REMOVE (Atlas-specific)
serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
tls: true
retryWrites: true
w: 'majority'

// USE (Local)
connectTimeoutMS: 10000
socketTimeoutMS: 10000
maxPoolSize: 1
minPoolSize: 0
maxIdleTimeMS: 30000
```

### Imports
```typescript
// REMOVE
import { ServerApiVersion } from "mongodb";

// KEEP
import { MongoClient } from "mongodb";
```

## 📁 Files to Update (Priority Order)

### High Priority
1. `convex/mongoSearch.ts`
2. `convex/vectorSearch.ts`
3. `src/lib/mongoChatService.ts`

### Medium Priority
4. `scripts/add-cobec-admin.js`
5. `scripts/backup-mongodb.js`
6. `embedding_generator.js`
7. `vector_search.js`

### Low Priority
8. `tests/test_mongo_connection.js`
9. `tests/analyze_collections.js`
10. Other utility scripts

## ⚡ Quick Commands

```bash
# Test local connection
npm run mongodb:test-local

# Check local MongoDB status
npm run mongodb:utils

# Setup local configuration
npm run mongodb:setup-local
```

## 🚨 Common Issues

- **Connection Refused**: MongoDB not running locally
- **Authentication Failed**: Check username/password or disable auth
- **SSL Errors**: Remove all SSL/TLS options
- **Import Errors**: Remove ServerApiVersion import

## ✅ Migration Checklist

- [ ] Update environment variables
- [ ] Change connection strings
- [ ] Remove Atlas client options
- [ ] Add local client options
- [ ] Remove ServerApiVersion imports
- [ ] Test each file
- [ ] Verify functionality
- [ ] Remove Atlas env vars

---

**Remember**: Test after each file update to catch issues early!
