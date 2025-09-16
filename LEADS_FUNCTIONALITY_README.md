# Texas Leads Database System

This document describes the leads database system created for storing and managing Texas procurement opportunity leads data.

## Overview

The leads system provides a comprehensive solution for managing procurement opportunity data from various Texas government sources. It includes a Convex database schema, mutations, queries, and actions for full CRUD operations, plus a React frontend example.

## Database Schema

### Leads Table

The `leads` table stores information about procurement opportunity sources with the following fields:

**Core Fields:**
- `name` (string): Lead name/title
- `url` (string): Lead URL
- `level` (string): Government level (State, Regional, City, County, etc.)
- `updateFrequency` (string): How often the data is updated
- `keywordDateFilteringAvailable` (boolean): Whether keyword/date filtering is available

**Enhanced Fields:**
- `description` (optional string): Lead description
- `category` (optional string): Lead category (Procurement, Transportation, CIP, etc.)
- `region` (optional string): Geographic region (DFW, Houston, Austin, etc.)
- `isActive` (optional boolean): Whether the lead is currently active
- `lastChecked` (optional number): Timestamp of last data check

**Search & Embedding Fields:**
- `searchableText` (optional string): Aggregated searchable content
- `embedding` (optional array of numbers): Vector embedding for semantic search
- `embeddingModel` (optional string): Model used for embedding
- `embeddingGeneratedAt` (optional number): When embedding was generated

**Metadata:**
- `metadata` (optional object): Import metadata including source file, import date, etc.
- `createdAt` (number): When lead was created
- `updatedAt` (number): When lead was last updated

### Indexes

The table includes several indexes for efficient querying:
- `by_level`: Filter by government level
- `by_category`: Filter by category
- `by_region`: Filter by region
- `by_active`: Filter by active status
- `by_creation`: Sort by creation date
- `by_metadata_import`: Filter by import date
- `by_embedding`: Vector similarity search
- `by_embedding_model`: Filter by embedding model

## API Reference

### Mutations

#### `createLead`
Creates a new lead entry.

**Parameters:**
```typescript
{
  name: string;
  url: string;
  level: string;
  updateFrequency: string;
  keywordDateFilteringAvailable: boolean;
  description?: string;
  category?: string;
  region?: string;
  isActive?: boolean;
  searchableText?: string;
}
```

#### `updateLead`
Updates an existing lead.

**Parameters:**
```typescript
{
  id: Id<"leads">;
  // ... same fields as createLead, all optional
}
```

#### `deleteLead`
Deletes a lead.

**Parameters:**
```typescript
{
  id: Id<"leads">;
}
```

#### `bulkCreateLeads`
Creates multiple leads from an array of data.

**Parameters:**
```typescript
{
  leads: Array<{
    name: string;
    url: string;
    level: string;
    updateFrequency: string;
    keywordDateFilteringAvailable: boolean;
    description?: string;
    category?: string;
    region?: string;
  }>;
  sourceFile?: string;
}
```

#### `markLeadAsChecked`
Updates the lastChecked timestamp for a lead.

**Parameters:**
```typescript
{
  id: Id<"leads">;
}
```

#### `toggleLeadActive`
Toggles the active status of a lead.

**Parameters:**
```typescript
{
  id: Id<"leads">;
}
```

### Queries

#### `getAllLeads`
Retrieves all leads, ordered by creation date (newest first).

#### `getLeadsByLevel`
Retrieves leads filtered by government level.

**Parameters:**
```typescript
{
  level: string;
}
```

#### `getLeadsByCategory`
Retrieves leads filtered by category.

**Parameters:**
```typescript
{
  category: string;
}
```

#### `getLeadsByRegion`
Retrieves leads filtered by region.

**Parameters:**
```typescript
{
  region: string;
}
```

#### `getActiveLeads`
Retrieves only active leads.

#### `getLeadsWithFiltering`
Retrieves leads that have keyword/date filtering available.

#### `searchLeads`
Searches leads by name, description, or searchable text.

**Parameters:**
```typescript
{
  searchTerm: string;
}
```

#### `getLeadById`
Retrieves a specific lead by ID.

**Parameters:**
```typescript
{
  id: Id<"leads">;
}
```

#### `getLeadsByFilters`
Retrieves leads with multiple filter options.

**Parameters:**
```typescript
{
  level?: string;
  category?: string;
  region?: string;
  isActive?: boolean;
  hasFiltering?: boolean;
}
```

#### `getLeadsStats`
Retrieves statistics about the leads collection.

**Returns:**
```typescript
{
  total: number;
  active: number;
  inactive: number;
  withFiltering: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  byRegion: Record<string, number>;
}
```

### Actions

#### `importLeadsFromJson`
Imports leads from JSON data with automatic categorization and region detection.

**Parameters:**
```typescript
{
  leadsData: Array<{
    name: string;
    url: string;
    level: string;
    updateFrequency: string;
    keywordDateFilteringAvailable: boolean;
  }>;
  sourceFile?: string;
}
```

#### `clearAllLeads`
Removes all leads from the database (useful for testing).

#### `updateLeadEmbeddings`
Updates vector embeddings for leads (placeholder for future semantic search).

#### `exportLeads`
Exports leads data in JSON or CSV format.

**Parameters:**
```typescript
{
  filters?: {
    level?: string;
    category?: string;
    region?: string;
    isActive?: boolean;
  };
  format?: "json" | "csv";
}
```

#### `syncLeadsFromExternalSource`
Placeholder for future external API integration.

#### `getLeadsAnalytics`
Retrieves detailed analytics about leads.

**Parameters:**
```typescript
{
  timeRange?: {
    startDate: number;
    endDate: number;
  };
}
```

## Usage Examples

### Importing Data from JSON

```typescript
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

const importLeads = useAction(api.leadsActions.importLeadsFromJson);

// Import from texasLeadsTierOne.json
const handleImport = async () => {
  const response = await fetch('/json/texasLeadsTierOne.json');
  const leadsData = await response.json();
  
  const result = await importLeads({
    leadsData,
    sourceFile: 'texasLeadsTierOne.json'
  });
  
  console.log(`Imported ${result.importedCount} leads`);
};
```

### Querying Leads

```typescript
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

// Get all leads
const allLeads = useQuery(api.leads.getAllLeads, {});

// Get state-level leads
const stateLeads = useQuery(api.leads.getLeadsByLevel, { level: "State" });

// Search for leads containing "Dallas"
const searchResults = useQuery(api.leads.searchLeads, { searchTerm: "Dallas" });

// Get filtered leads
const filteredLeads = useQuery(api.leads.getLeadsByFilters, {
  level: "City",
  category: "Procurement",
  isActive: true
});
```

### Creating a New Lead

```typescript
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

const createLead = useMutation(api.leads.createLead);

const handleCreateLead = async () => {
  await createLead({
    name: "New Procurement Source",
    url: "https://example.com/procurement",
    level: "City",
    updateFrequency: "weekly",
    keywordDateFilteringAvailable: true,
    category: "Procurement",
    region: "Austin",
    description: "Example procurement source"
  });
};
```

## Frontend Integration

A complete React component example is provided in `leads-frontend-example.tsx`. This component demonstrates:

- Displaying leads in a responsive table
- Search and filtering functionality
- Statistics dashboard
- Import/export capabilities
- CRUD operations
- Form handling for new leads

## Testing

A test script is provided in `test-leads-functionality.js` that demonstrates all the functionality:

```bash
node test-leads-functionality.js
```

## Data Migration

To migrate existing data from the `texasLeadsTierOne.json` file:

1. Use the `importLeadsFromJson` action
2. The system will automatically:
   - Categorize leads based on name content
   - Detect regions from lead names
   - Generate searchable text
   - Set appropriate metadata

## Future Enhancements

- **Semantic Search**: Vector embeddings for advanced search capabilities
- **External API Integration**: Sync with external procurement APIs
- **Automated Monitoring**: Check for updates and changes
- **Analytics Dashboard**: Advanced reporting and insights
- **Lead Scoring**: Rate leads based on relevance and activity

## File Structure

```
convex/
├── schema.ts              # Database schema with leads table
├── leads.ts               # Mutations and queries for leads
└── leadsActions.ts        # Actions for bulk operations

Frontend/
├── leads-frontend-example.tsx  # React component example
└── test-leads-functionality.js # Test script

Data/
└── json/texasLeadsTierOne.json # Sample data file
```

This system provides a solid foundation for managing procurement opportunity leads with room for future enhancements and integrations.
