# MongoDB to Convex Migration Plan

## Overview

This document outlines the comprehensive plan to migrate all MongoDB cluster functionality to Convex, consolidating our database operations into a single, real-time platform. The migration will eliminate the need for direct MongoDB connections and provide better performance, real-time updates, and simplified architecture.

## Current State Analysis

### MongoDB Usage Patterns

#### 1. **Direct MongoDB Cluster Connections**
- **File**: `src/lib/mongoKfcService.ts` - KFC operations
- **File**: `src/lib/kfcMongoService.ts` - KFC operations (client-side)
- **File**: `src/lib/cobecAdminsService.ts` - Admin operations
- **File**: `src/lib/mongoClient.ts` - IndexedDB fallback

#### 2. **Convex Actions with MongoDB**
- **File**: `convex/mongoSearch.ts` - Job postings, resumes, vector search
- **Collections**: `jobpostings`, `resumes`
- **Operations**: CRUD, vector search, file imports

#### 3. **Existing Convex Schema**
- **File**: `convex/schema.ts` - Already has tables for:
  - `kfcpoints` - KFC points tracking
  - `employees` - Employee management
  - `nominations` - Nomination system
  - `cobecadmins` - Admin access control

#### 4. **Components Using MongoDB**
- `KfcPointsManager.tsx` - Uses `getKfcMongoService()`
- `KfcNomination.tsx` - Uses `mongoClient`
- `KfcManagementPage.tsx` - Uses `getMongoClient()`
- `DataManagementPage.tsx` - Uses Convex actions from `mongoSearch.ts`
- `VectorSearchPage.tsx` - Uses Convex actions from `vectorSearch.ts`

## Migration Strategy

### Phase 1: Schema Consolidation and Enhancement

#### 1.1 Update Convex Schema
**Priority**: HIGH
**Dependencies**: None

**Actions**:
- Add missing collections to `convex/schema.ts`:
  - `jobpostings` - Job posting data
  - `resumes` - Resume data with embeddings
  - `vectorIndexes` - Vector search indexes
- Add proper indexes for performance
- Ensure all existing tables have correct field types

#### 1.2 Create Migration Functions
**Priority**: HIGH
**Dependencies**: Schema updates

**Actions**:
- Create `convex/migrations.ts` for data migration
- Implement functions to migrate existing MongoDB data
- Add validation and rollback capabilities

### Phase 2: Core Data Migration

#### 2.1 Migrate KFC Data
**Priority**: HIGH
**Dependencies**: Schema consolidation

**Actions**:
- Create `convex/kfcData.ts` functions to replace MongoDB operations
- Migrate existing KFC points data from MongoDB cluster
- Update components to use Convex queries/mutations
- Implement real-time updates for KFC points

#### 2.2 Migrate Job Postings and Resumes
**Priority**: HIGH
**Dependencies**: Schema consolidation

**Actions**:
- Migrate `jobpostings` collection data
- Migrate `resumes` collection data with embeddings
- Update vector search functions to use Convex
- Ensure file import functionality works with Convex

#### 2.3 Migrate Admin Data
**Priority**: MEDIUM
**Dependencies**: Schema consolidation

**Actions**:
- Migrate `cobecadmins` collection data
- Update admin authentication and authorization
- Ensure role-based access control works

### Phase 3: Component Updates

#### 3.1 Update KFC Components
**Priority**: HIGH
**Dependencies**: Core data migration

**Actions**:
- Update `KfcPointsManager.tsx` to use Convex queries/mutations
- Update `KfcNomination.tsx` to use Convex
- Update `KfcManagementPage.tsx` to use Convex
- Remove MongoDB service dependencies

#### 3.2 Update Data Management
**Priority**: MEDIUM
**Dependencies**: Core data migration

**Actions**:
- Update `DataManagementPage.tsx` to use new Convex functions
- Ensure file upload and import functionality works
- Update search and filter operations

#### 3.3 Update Vector Search
**Priority**: MEDIUM
**Dependencies**: Core data migration

**Actions**:
- Update `VectorSearchPage.tsx` to use Convex vector search
- Ensure embedding generation works with Convex
- Update cross-matching functionality

### Phase 4: Cleanup and Optimization

#### 4.1 Remove MongoDB Dependencies
**Priority**: LOW
**Dependencies**: All component updates

**Actions**:
- Remove `src/lib/mongoKfcService.ts`
- Remove `src/lib/kfcMongoService.ts`
- Remove `src/lib/cobecAdminsService.ts`
- Remove `src/lib/mongoClient.ts`
- Remove `convex/mongoSearch.ts` (after migration)

#### 4.2 Performance Optimization
**Priority**: LOW
**Dependencies**: All migrations complete

**Actions**:
- Optimize Convex queries and indexes
- Implement caching where appropriate
- Monitor and tune performance

## Detailed Migration Steps

### Step 1: Schema Updates

```typescript
// convex/schema.ts additions
jobpostings: defineTable({
  jobTitle: v.string(),
  location: v.string(),
  salary: v.string(),
  openDate: v.string(),
  closeDate: v.string(),
  jobLink: v.string(),
  jobType: v.string(),
  jobSummary: v.string(),
  duties: v.string(),
  requirements: v.string(),
  qualifications: v.string(),
  education: v.string(),
  howToApply: v.string(),
  additionalInformation: v.string(),
  department: v.string(),
  seriesGrade: v.string(),
  travelRequired: v.string(),
  workSchedule: v.string(),
  securityClearance: v.string(),
  experienceRequired: v.string(),
  educationRequired: v.string(),
  applicationDeadline: v.string(),
  contactInfo: v.string(),
  searchableText: v.optional(v.string()),
  extractedSkills: v.optional(v.array(v.string())),
  embedding: v.optional(v.array(v.number())),
  _metadata: v.optional(v.object({
    originalIndex: v.optional(v.number()),
    importedAt: v.number(),
    sourceFile: v.optional(v.string()),
    dataType: v.string(),
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_jobTitle", ["jobTitle"])
  .index("by_location", ["location"])
  .index("by_department", ["department"])
  .index("by_creation", ["createdAt"]),

resumes: defineTable({
  filename: v.string(),
  originalText: v.string(),
  personalInfo: v.object({
    firstName: v.string(),
    middleName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    yearsOfExperience: v.number(),
  }),
  professionalSummary: v.string(),
  education: v.array(v.string()),
  experience: v.array(v.object({
    title: v.string(),
    company: v.string(),
    location: v.string(),
    duration: v.string(),
    responsibilities: v.array(v.string()),
  })),
  skills: v.array(v.string()),
  certifications: v.string(),
  professionalMemberships: v.string(),
  securityClearance: v.string(),
  searchableText: v.optional(v.string()),
  extractedSkills: v.optional(v.array(v.string())),
  embedding: v.optional(v.array(v.number())),
  _metadata: v.optional(v.object({
    filePath: v.optional(v.string()),
    fileName: v.string(),
    importedAt: v.number(),
    parsedAt: v.number(),
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_filename", ["filename"])
  .index("by_email", ["personalInfo.email"])
  .index("by_creation", ["createdAt"]),
```

### Step 2: Migration Functions

```typescript
// convex/migrations.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const migrateKfcData = action({
  args: {
    kfcData: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // Migration logic for KFC data
  },
});

export const migrateJobPostings = action({
  args: {
    jobPostings: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // Migration logic for job postings
  },
});

export const migrateResumes = action({
  args: {
    resumes: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // Migration logic for resumes
  },
});
```

### Step 3: Updated KFC Functions

```typescript
// convex/kfcData.ts (updated)
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAllKfcEntries = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("kfcpoints")
      .withIndex("by_score")
      .order("desc")
      .collect();
  },
});

export const updateKfcEntry = mutation({
  args: {
    name: v.string(),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    const kfcEntry = await ctx.db
      .query("kfcpoints")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (kfcEntry) {
      await ctx.db.patch(kfcEntry._id, {
        ...args.updates,
        updatedAt: Date.now(),
      });
      return true;
    }
    return false;
  },
});
```

## Risk Assessment and Mitigation

### High-Risk Areas

1. **Data Loss During Migration**
   - **Risk**: Data corruption or loss during transfer
   - **Mitigation**: Create comprehensive backups, implement validation, test with small datasets first

2. **Performance Degradation**
   - **Risk**: Convex queries may be slower than direct MongoDB
   - **Mitigation**: Optimize indexes, implement caching, monitor performance metrics

3. **Real-time Updates**
   - **Risk**: Components may not update in real-time
   - **Mitigation**: Use Convex real-time queries, implement proper subscription management

### Medium-Risk Areas

1. **Vector Search Performance**
   - **Risk**: Vector search may be slower in Convex
   - **Mitigation**: Optimize embedding storage, implement efficient similarity calculations

2. **File Upload Functionality**
   - **Risk**: File uploads may not work as expected
   - **Mitigation**: Test thoroughly, implement proper error handling

## Testing Strategy

### Unit Testing
- Test all Convex functions individually
- Validate data transformations
- Test error handling

### Integration Testing
- Test component interactions with Convex
- Validate real-time updates
- Test file upload and import functionality

### Performance Testing
- Compare query performance with MongoDB
- Test with large datasets
- Monitor memory usage

### User Acceptance Testing
- Test all user workflows
- Validate UI responsiveness
- Test error scenarios

## Rollback Plan

### Immediate Rollback
- Keep MongoDB cluster running during migration
- Maintain dual-write capability during transition
- Implement feature flags for gradual rollout

### Data Recovery
- Maintain MongoDB backups throughout migration
- Implement data validation scripts
- Create rollback scripts for each phase

## Success Criteria

### Phase 1 Success
- [ ] Schema updated and deployed
- [ ] Migration functions created and tested
- [ ] No breaking changes to existing functionality

### Phase 2 Success
- [ ] All data migrated successfully
- [ ] Data integrity validated
- [ ] Performance meets or exceeds current levels

### Phase 3 Success
- [ ] All components updated and working
- [ ] Real-time updates functioning
- [ ] User workflows tested and validated

### Phase 4 Success
- [ ] MongoDB dependencies removed
- [ ] Performance optimized
- [ ] Documentation updated

## Timeline Estimate

- **Phase 1**: 1-2 weeks
- **Phase 2**: 2-3 weeks
- **Phase 3**: 2-3 weeks
- **Phase 4**: 1 week

**Total Estimated Time**: 6-9 weeks

## Prioritized Task List

### Phase 1: Foundation (Weeks 1-2)
1. **Update Convex schema** - Add jobpostings and resumes tables
2. **Create migration functions** - Build data transfer utilities
3. **Set up testing environment** - Prepare for validation
4. **Create backup scripts** - Ensure data safety

### Phase 2: Data Migration (Weeks 3-5)
5. **Migrate KFC data** - Transfer all KFC points and employee data
6. **Migrate job postings** - Transfer job posting data with embeddings
7. **Migrate resumes** - Transfer resume data with embeddings
8. **Validate data integrity** - Ensure all data transferred correctly

### Phase 3: Component Updates (Weeks 6-8)
9. **Update KfcPointsManager** - Replace MongoDB with Convex
10. **Update KfcNomination** - Replace MongoDB with Convex
11. **Update KfcManagementPage** - Replace MongoDB with Convex
12. **Update DataManagementPage** - Use new Convex functions
13. **Update VectorSearchPage** - Use Convex vector search
14. **Test all components** - Validate functionality

### Phase 4: Cleanup (Week 9)
15. **Remove MongoDB dependencies** - Clean up old code
16. **Optimize performance** - Tune queries and indexes
17. **Update documentation** - Reflect new architecture
18. **Deploy to production** - Complete migration

### Dependencies
- Tasks 1-4 must be completed before Phase 2
- Tasks 5-8 must be completed before Phase 3
- Tasks 9-14 must be completed before Phase 4
- All tasks must be tested before moving to next phase 