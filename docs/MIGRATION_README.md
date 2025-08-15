# MongoDB to Convex Migration Guide

This guide provides step-by-step instructions for migrating your MongoDB cluster data to Convex.

## Prerequisites

1. **Convex Setup**: Ensure your Convex project is properly configured
2. **Environment Variables**: Set up your MongoDB credentials
3. **Backup**: Always create a backup before migration

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# MongoDB Credentials
MONGODB_USERNAME=adminuser
MONGODB_PASSWORD=hnuWXvLBzcDfUbdZ
MONGODB_CLUSTER=demo.y407omc.mongodb.net

# Convex URL (get this from your Convex dashboard)
CONVEX_URL=https://your-convex-url.convex.cloud
```

## Migration Steps

### Step 1: Create Backup

**ALWAYS** create a backup before starting the migration:

```bash
# Create a backup of all MongoDB data
node scripts/backup-mongodb.js backup
```

This will create a backup in the `backups/` directory with a timestamp.

### Step 2: Deploy Schema Updates

Deploy the updated Convex schema that includes the new tables:

```bash
# Deploy to Convex
npx convex dev
```

The schema now includes:
- `jobpostings` table
- `resumes` table
- Updated indexes for performance

### Step 3: Run Migration

Execute the migration script:

```bash
# Run the complete migration
node scripts/run-migration.js
```

This script will:
1. Connect to MongoDB and validate data
2. Extract all data using Convex actions
3. Insert data into Convex tables
4. Validate the migration results

### Step 4: Verify Migration

Check that all data was migrated correctly:

```bash
# Check Convex dashboard for data
# Or use the validation function
```

## Migration Scripts

### Backup Script (`scripts/backup-mongodb.js`)

**Create Backup:**
```bash
node scripts/backup-mongodb.js backup
```

**Restore from Backup:**
```bash
node scripts/backup-mongodb.js restore ./backups/mongodb-backup-2024-01-15
```

### Migration Script (`scripts/run-migration.js`)

**Run Complete Migration:**
```bash
node scripts/run-migration.js
```

## Convex Functions

### Migration Actions (`convex/migrations.ts`)

- `migrateKfcData` - Extracts KFC and employee data
- `migrateJobPostings` - Extracts job posting data
- `migrateResumes` - Extracts resume data
- `validateMigration` - Validates migration results

### Migration Insertions (`convex/migrationInsertions.ts`)

- `insertKfcData` - Inserts KFC data into Convex
- `insertJobPostings` - Inserts job postings into Convex
- `insertResumes` - Inserts resumes into Convex
- `insertAllMigratedData` - Inserts all data at once

## Data Structure

### KFC Data
```typescript
// Employees
{
  name: string,
  createdAt: number,
  updatedAt: number
}

// KFC Points
{
  name: string,
  events: Array<{
    type: string,
    month: string,
    quantity: number
  }>,
  march_status?: string,
  score: number,
  createdAt: number,
  updatedAt: number
}
```

### Job Postings
```typescript
{
  jobTitle: string,
  location: string,
  salary: string,
  // ... other fields
  searchableText?: string,
  extractedSkills?: string[],
  embedding?: number[],
  createdAt: number,
  updatedAt: number
}
```

### Resumes
```typescript
{
  filename: string,
  originalText: string,
  personalInfo: {
    firstName: string,
    middleName: string,
    lastName: string,
    email: string,
    phone: string,
    yearsOfExperience: number
  },
  // ... other fields
  searchableText?: string,
  extractedSkills?: string[],
  embedding?: number[],
  createdAt: number,
  updatedAt: number
}
```

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify MongoDB credentials
   - Check network connectivity
   - Ensure MongoDB cluster is accessible

2. **Data Size Limits**
   - The migration script processes data in batches
   - Large datasets are automatically split
   - Monitor console output for batch progress

3. **Schema Validation Errors**
   - Ensure Convex schema is deployed
   - Check data types match schema
   - Verify required fields are present

4. **Memory Issues**
   - Large datasets may cause memory issues
   - The script processes data in batches
   - Monitor system resources during migration

### Error Recovery

If the migration fails:

1. **Check the error message** in the console output
2. **Verify data integrity** using the backup
3. **Restore from backup** if needed:
   ```bash
   node scripts/backup-mongodb.js restore ./backups/mongodb-backup-YYYY-MM-DD
   ```
4. **Fix the issue** and retry the migration

### Validation

After migration, validate the data:

1. **Check record counts** match between MongoDB and Convex
2. **Verify data integrity** by sampling records
3. **Test functionality** with the new Convex data
4. **Monitor performance** of Convex queries

## Post-Migration Steps

### 1. Update Components

Update your React components to use Convex instead of MongoDB:

```typescript
// Before (MongoDB)
import { getKfcMongoService } from '../lib/kfcMongoService';

// After (Convex)
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

// In component
const kfcEntries = useQuery(api.kfcData.getAllKfcEntries);
```

### 2. Test Functionality

- Test all KFC operations
- Test job posting and resume functionality
- Test vector search
- Test file uploads and imports

### 3. Remove MongoDB Dependencies

Once everything is working:

1. Remove MongoDB service files:
   - `src/lib/mongoKfcService.ts`
   - `src/lib/kfcMongoService.ts`
   - `src/lib/cobecAdminsService.ts`
   - `src/lib/mongoClient.ts`

2. Remove MongoDB actions:
   - `convex/mongoSearch.ts` (after migration)

3. Update imports in components

### 4. Update Documentation

- Update API documentation
- Update component documentation
- Update deployment guides

## Performance Considerations

### Convex Optimizations

1. **Indexes**: The schema includes optimized indexes
2. **Batch Processing**: Large datasets are processed in batches
3. **Real-time Updates**: Convex provides real-time updates
4. **Caching**: Convex automatically caches queries

### Monitoring

Monitor the following during and after migration:

1. **Migration Progress**: Watch console output
2. **Data Integrity**: Validate record counts
3. **Performance**: Monitor query response times
4. **Errors**: Check for any failed operations

## Support

If you encounter issues:

1. **Check the logs** in the console output
2. **Verify environment variables** are set correctly
3. **Test with a small dataset** first
4. **Create a backup** before making changes
5. **Check Convex documentation** for troubleshooting

## Rollback Plan

If you need to rollback:

1. **Stop using Convex** in your application
2. **Restore from backup**:
   ```bash
   node scripts/backup-mongodb.js restore ./backups/mongodb-backup-YYYY-MM-DD
   ```
3. **Revert component changes** to use MongoDB
4. **Test functionality** with restored data

## Success Criteria

The migration is successful when:

- [ ] All data is migrated to Convex
- [ ] Record counts match between MongoDB and Convex
- [ ] All functionality works with Convex
- [ ] Performance meets or exceeds previous levels
- [ ] Real-time updates are working
- [ ] No data loss or corruption
- [ ] All components updated to use Convex
- [ ] MongoDB dependencies removed
- [ ] Documentation updated 