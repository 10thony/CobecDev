# Workdemos Data Migration to Convex

This document describes the comprehensive migration system for porting data from the workdemos JSON files into the Convex database.

## Overview

The migration system consists of two main components:

1. **Migration Scripts**: Node.js scripts that read workdemos JSON files and migrate data to Convex
2. **Updated Data Management Page**: React component that now uses Convex instead of MongoDB

## Migration Scripts

### Main Migration Script

**File**: `scripts/migrate-workdemos-data.js`

**Usage**:
```bash
# Migrate all data types
npm run migrate:workdemos

# Dry run (show what would be migrated without actually doing it)
npm run migrate:workdemos:dry-run

# Migrate specific data types
npm run migrate:workdemos:jobs
npm run migrate:workdemos:resumes
npm run migrate:workdemos:cobecadmins
npm run migrate:workdemos:employees
npm run migrate:workdemos:kfcpoints
```

**Command Line Options**:
- `--type <type>`: Data type to migrate (all, jobs, resumes, cobecadmins, employees, kfcpoints)
- `--batch-size <n>`: Batch size for large datasets (default: 100)
- `--dry-run`: Show what would be migrated without actually doing it
- `--help`: Show help message

### Convex Migration Functions

**File**: `convex/migrations.ts`

The following migration functions are available:

- `migrateCobecAdmins()`: Migrate cobecadmins data
- `migrateEmployees()`: Migrate employees data  
- `migrateKfcPoints()`: Migrate KFC points data
- `migrateJobPostings(batchSize, startFrom)`: Migrate job postings with batching
- `migrateResumes(batchSize, startFrom)`: Migrate resumes with batching
- `runFullMigration(options)`: Run comprehensive migration for all data types

## Data Types and Structure

### 1. Cobec Admins
- **Source**: `workdemos.cobecadmins.json`
- **Structure**: Array of objects with `clerkUserId` fields
- **Target Table**: `cobecadmins`

### 2. Employees
- **Source**: `workdemos.employees.json`
- **Structure**: Array of objects with `name`, `createdAt`, `updatedAt` fields
- **Target Table**: `employees`

### 3. KFC Points
- **Source**: `workdemos.kfcpoints.json`
- **Structure**: Array of objects with `name`, `events`, `march_status`, `score` fields
- **Target Table**: `kfcpoints`

### 4. Job Postings
- **Source**: `workdemos.jobpostings.json`
- **Structure**: Array of job posting objects with comprehensive fields
- **Target Table**: `jobpostings`
- **Features**: Vector embeddings, searchable text, extracted skills

### 5. Resumes
- **Source**: `workdemos.resumes.json`
- **Structure**: Array of resume objects with personal info, experience, skills
- **Target Table**: `resumes`
- **Features**: Vector embeddings, searchable text, extracted skills

## Migration Process

### 1. Data Analysis
The migration script analyzes each JSON file to:
- Count total records
- Identify data structure and field types
- Validate data integrity

### 2. Data Transformation
- Converts MongoDB ObjectId fields to strings
- Converts MongoDB date fields to timestamps
- Handles nested data structures
- Generates vector embeddings for searchable content

### 3. Convex Insertion
- Checks for existing records to avoid duplicates
- Inserts data with proper metadata
- Handles errors gracefully with detailed logging

### 4. Progress Tracking
- Shows migration progress in real-time
- Reports success/error counts
- Provides detailed error messages for troubleshooting

## Updated Data Management Page

**File**: `src/pages/DataManagementPage.tsx`

### Key Changes

1. **Replaced MongoDB operations with Convex functions**:
   - `getAllJobPostings` → `api.dataManagement.getAllJobPostings`
   - `getAllResumes` → `api.dataManagement.getAllResumes`
   - `searchJobPostings` → `api.dataManagement.searchJobPostings`
   - `searchResumes` → `api.dataManagement.searchResumes`

2. **Removed IndexedDB caching**:
   - No more complex caching logic
   - Direct Convex queries for real-time data
   - Simplified data loading and refresh

3. **Enhanced import/export**:
   - JSON file import with automatic data type detection
   - Excel file import (placeholder for future implementation)
   - Comprehensive data export from Convex

4. **Real-time data summary**:
   - Shows counts for all data types
   - Displays recent records
   - Updates automatically

### New Convex Functions

**File**: `convex/dataManagement.ts`

- `getAllJobPostings(limit, offset, search, filters)`: Paginated job postings with search
- `getAllResumes(limit, offset, search, filters)`: Paginated resumes with search
- `searchJobPostings(query, limit, filters)`: Vector-aware job search
- `searchResumes(query, limit, filters)`: Vector-aware resume search
- `getDataSummary()`: Comprehensive data statistics
- `clearAllData(confirm)`: Admin-only data clearing
- `exportData(dataType)`: Export data to JSON
- `importData(data, dataType, overwrite)`: Import data from JSON

## Security Features

### Authentication & Authorization
- All operations require valid Clerk authentication
- Admin-only functions (data clearing) check user roles
- Secure data import with validation

### Data Validation
- Input sanitization for all user-provided data
- Type checking for imported data
- Error handling prevents data corruption

### Environment Variables
- Database credentials stored securely
- API keys managed through environment variables
- No hardcoded secrets in source code

## Usage Examples

### Running a Full Migration

```bash
# Start Convex backend
npm run dev:backend

# In another terminal, run migration
npm run migrate:workdemos

# Check migration status
npm run convex:migrate:status
```

### Migrating Specific Data Types

```bash
# Migrate only job postings
npm run migrate:workdemos:jobs

# Migrate with custom batch size
npm run migrate:workdemos:jobs --batch-size 50

# Dry run to see what would be migrated
npm run migrate:workdemos:jobs --dry-run
```

### Using the Data Management Page

1. Navigate to `/data-management` in the application
2. View real-time data summary
3. Import new data using JSON or Excel files
4. Search and filter existing data
5. Export data for backup or analysis

## Troubleshooting

### Common Issues

1. **Migration fails with "Connection refused"**
   - Ensure Convex backend is running (`npm run dev:backend`)
   - Check `CONVEX_URL` environment variable

2. **Data not appearing after migration**
   - Check browser console for errors
   - Verify Convex functions are properly deployed
   - Check data summary display for record counts

3. **Import fails with "Invalid data type"**
   - Ensure JSON file has correct structure
   - Check that data arrays contain valid objects
   - Verify required fields are present

### Debug Mode

Enable detailed logging by setting environment variables:
```bash
export DEBUG_MIGRATION=true
export DEBUG_CONVEX=true
```

### Error Recovery

If migration fails partway through:
1. Check error logs for specific issues
2. Fix data format issues in source files
3. Re-run migration (duplicates will be skipped)
4. Use `--start-from` option to resume from specific point

## Performance Considerations

### Batch Processing
- Large datasets are processed in configurable batches
- Default batch size: 100 records
- Adjust based on available memory and network capacity

### Vector Embeddings
- Generated for job postings and resumes
- Enables semantic search capabilities
- May increase migration time for large datasets

### Memory Usage
- Script processes data in streams to minimize memory usage
- Large files are handled efficiently
- Progress reporting shows memory usage statistics

## Future Enhancements

### Planned Features
1. **Excel Import**: Full Excel file parsing and import
2. **PDF Processing**: AI-powered PDF parsing with embeddings
3. **Incremental Updates**: Delta migration for changed records
4. **Data Validation**: Enhanced schema validation and data quality checks
5. **Migration Rollback**: Ability to undo migrations if needed

### API Improvements
1. **Real-time Updates**: WebSocket-based live data updates
2. **Advanced Search**: Full-text search with relevance scoring
3. **Data Analytics**: Built-in reporting and analytics
4. **Bulk Operations**: Batch import/export operations

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Convex logs for detailed error information
3. Check browser console for frontend errors
4. Verify environment variables and configuration

## Contributing

When adding new data types or migration features:
1. Update the migration script to handle new data structures
2. Add corresponding Convex schema definitions
3. Update the DataManagementPage UI
4. Add comprehensive tests
5. Update this documentation
