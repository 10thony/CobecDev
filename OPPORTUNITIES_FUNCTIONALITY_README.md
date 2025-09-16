# Texas Procurement Opportunities Database System

This document describes the opportunities database system created for storing and managing Texas procurement opportunity data.

## Overview

The opportunities system provides a comprehensive solution for managing detailed procurement opportunity data from various Texas government sources. It includes a Convex database schema, mutations, queries, and actions for full CRUD operations, plus a React frontend example.

## Database Schema

### Opportunities Table

The `opportunities` table stores detailed information about procurement opportunities with the following fields:

**Core Fields:**
- `opportunityType` (string): Type of opportunity (Public Sector, Private Sector, etc.)
- `opportunityTitle` (string): Title of the opportunity
- `contractID` (optional string): Contract ID if available
- `issuingBody` (object): Information about the issuing organization
  - `name` (string): Name of the issuing organization
  - `level` (string): Government level (State, Regional, City, County, etc.)
- `location` (object): Geographic information
  - `city` (optional string): City name
  - `county` (optional string): County name
  - `region` (string): Geographic region (Dallas–Fort Worth, Houston, Austin, etc.)
- `status` (string): Current status (Budgeted for FY2026, In Planning Phase, Open for Bidding, etc.)
- `estimatedValueUSD` (optional number): Estimated value in USD
- `keyDates` (object): Important dates
  - `publishedDate` (string): Date when opportunity was published
  - `bidDeadline` (optional string): Bid deadline if available
  - `projectedStartDate` (optional string): Projected start date
- `source` (object): Source information
  - `documentName` (string): Name of the source document
  - `url` (string): URL to the source
- `summary` (string): Detailed summary of the opportunity

**Enhanced Fields:**
- `category` (optional string): Opportunity category (Transportation, Aviation, Infrastructure, etc.)
- `subcategory` (optional string): More specific category (Highway, Airport, Digital Infrastructure, etc.)
- `isActive` (optional boolean): Whether the opportunity is currently active
- `lastChecked` (optional number): Timestamp of last data check

**Search & Embedding Fields:**
- `searchableText` (optional string): Aggregated searchable content
- `embedding` (optional array of numbers): Vector embedding for semantic search
- `embeddingModel` (optional string): Model used for embedding
- `embeddingGeneratedAt` (optional number): When embedding was generated

**Metadata:**
- `metadata` (optional object): Import metadata including source file, import date, etc.
- `createdAt` (number): When opportunity was created
- `updatedAt` (number): When opportunity was last updated

### Indexes

The table includes several indexes for efficient querying:
- `by_opportunity_type`: Filter by opportunity type
- `by_issuing_level`: Filter by issuing body level
- `by_region`: Filter by region
- `by_status`: Filter by status
- `by_category`: Filter by category
- `by_active`: Filter by active status
- `by_creation`: Sort by creation date
- `by_metadata_import`: Filter by import date
- `by_embedding`: Vector similarity search
- `by_embedding_model`: Filter by embedding model
- `by_estimated_value`: Sort by estimated value

## API Reference

### Mutations

#### `createOpportunity`
Creates a new opportunity entry.

**Parameters:**
```typescript
{
  opportunityType: string;
  opportunityTitle: string;
  contractID?: string;
  issuingBody: {
    name: string;
    level: string;
  };
  location: {
    city?: string;
    county?: string;
    region: string;
  };
  status: string;
  estimatedValueUSD?: number;
  keyDates: {
    publishedDate: string;
    bidDeadline?: string;
    projectedStartDate?: string;
  };
  source: {
    documentName: string;
    url: string;
  };
  summary: string;
  category?: string;
  subcategory?: string;
  isActive?: boolean;
  searchableText?: string;
}
```

#### `updateOpportunity`
Updates an existing opportunity.

**Parameters:**
```typescript
{
  id: Id<"opportunities">;
  // ... same fields as createOpportunity, all optional
}
```

#### `deleteOpportunity`
Deletes an opportunity.

**Parameters:**
```typescript
{
  id: Id<"opportunities">;
}
```

#### `bulkCreateOpportunities`
Creates multiple opportunities from an array of data with automatic categorization.

**Parameters:**
```typescript
{
  opportunities: Array<{
    opportunityType: string;
    opportunityTitle: string;
    contractID?: string;
    issuingBody: { name: string; level: string; };
    location: { city?: string; county?: string; region: string; };
    status: string;
    estimatedValueUSD?: number;
    keyDates: { publishedDate: string; bidDeadline?: string; projectedStartDate?: string; };
    source: { documentName: string; url: string; };
    summary: string;
  }>;
  sourceFile?: string;
}
```

#### `markOpportunityAsChecked`
Updates the lastChecked timestamp for an opportunity.

**Parameters:**
```typescript
{
  id: Id<"opportunities">;
}
```

#### `toggleOpportunityActive`
Toggles the active status of an opportunity.

**Parameters:**
```typescript
{
  id: Id<"opportunities">;
}
```

### Queries

#### `getAllOpportunities`
Retrieves all opportunities, ordered by creation date (newest first).

#### `getOpportunitiesByType`
Retrieves opportunities filtered by opportunity type.

**Parameters:**
```typescript
{
  opportunityType: string;
}
```

#### `getOpportunitiesByIssuingLevel`
Retrieves opportunities filtered by issuing body level.

**Parameters:**
```typescript
{
  level: string;
}
```

#### `getOpportunitiesByRegion`
Retrieves opportunities filtered by region.

**Parameters:**
```typescript
{
  region: string;
}
```

#### `getOpportunitiesByStatus`
Retrieves opportunities filtered by status.

**Parameters:**
```typescript
{
  status: string;
}
```

#### `getOpportunitiesByCategory`
Retrieves opportunities filtered by category.

**Parameters:**
```typescript
{
  category: string;
}
```

#### `getActiveOpportunities`
Retrieves only active opportunities.

#### `getOpportunitiesByValueRange`
Retrieves opportunities within a specified value range.

**Parameters:**
```typescript
{
  minValue?: number;
  maxValue?: number;
}
```

#### `searchOpportunities`
Searches opportunities by title, summary, or searchable text.

**Parameters:**
```typescript
{
  searchTerm: string;
}
```

#### `getOpportunityById`
Retrieves a specific opportunity by ID.

**Parameters:**
```typescript
{
  id: Id<"opportunities">;
}
```

#### `getOpportunitiesByFilters`
Retrieves opportunities with multiple filter options.

**Parameters:**
```typescript
{
  opportunityType?: string;
  issuingLevel?: string;
  region?: string;
  status?: string;
  category?: string;
  isActive?: boolean;
  minValue?: number;
  maxValue?: number;
}
```

#### `getOpportunitiesStats`
Retrieves statistics about the opportunities collection.

**Returns:**
```typescript
{
  total: number;
  active: number;
  inactive: number;
  withValue: number;
  totalValue: number;
  averageValue: number;
  byOpportunityType: Record<string, number>;
  byIssuingLevel: Record<string, number>;
  byRegion: Record<string, number>;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}
```

### Actions

#### `importOpportunitiesFromJson`
Imports opportunities from JSON data with automatic categorization and region detection.

**Parameters:**
```typescript
{
  opportunitiesData: Array<{
    opportunityType: string;
    opportunityTitle: string;
    contractID?: string;
    issuingBody: { name: string; level: string; };
    location: { city?: string; county?: string; region: string; };
    status: string;
    estimatedValueUSD?: number;
    keyDates: { publishedDate: string; bidDeadline?: string; projectedStartDate?: string; };
    source: { documentName: string; url: string; };
    summary: string;
  }>;
  sourceFile?: string;
}
```

#### `clearAllOpportunities`
Removes all opportunities from the database (useful for testing).

#### `updateOpportunityEmbeddings`
Updates vector embeddings for opportunities (placeholder for future semantic search).

#### `exportOpportunities`
Exports opportunities data in JSON or CSV format.

**Parameters:**
```typescript
{
  filters?: {
    opportunityType?: string;
    issuingLevel?: string;
    region?: string;
    status?: string;
    category?: string;
    isActive?: boolean;
    minValue?: number;
    maxValue?: number;
  };
  format?: "json" | "csv";
}
```

#### `syncOpportunitiesFromExternalSource`
Placeholder for future external API integration.

#### `getOpportunitiesAnalytics`
Retrieves detailed analytics about opportunities.

**Parameters:**
```typescript
{
  timeRange?: {
    startDate: number;
    endDate: number;
  };
}
```

#### `getOpportunitiesByValueRange`
Gets opportunities by value range with detailed breakdown.

**Parameters:**
```typescript
{
  minValue: number;
  maxValue: number;
  includeBreakdown?: boolean;
}
```

#### `searchOpportunitiesAdvanced`
Advanced search with multiple filters and limits.

**Parameters:**
```typescript
{
  searchTerm: string;
  filters?: {
    opportunityType?: string;
    issuingLevel?: string;
    region?: string;
    status?: string;
    category?: string;
    minValue?: number;
    maxValue?: number;
  };
  limit?: number;
}
```

## Usage Examples

### Importing Data from JSON

```typescript
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

const importOpportunities = useAction(api.opportunitiesActions.importOpportunitiesFromJson);

// Import from texasLeadsTierOne.json
const handleImport = async () => {
  const response = await fetch('/json/texasLeadsTierOne.json');
  const data = await response.json();
  const opportunitiesData = data.opportunities || data; // Handle both formats
  
  const result = await importOpportunities({
    opportunitiesData,
    sourceFile: 'texasLeadsTierOne.json'
  });
  
  console.log(`Imported ${result.importedCount} opportunities`);
};
```

### Querying Opportunities

```typescript
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

// Get all opportunities
const allOpportunities = useQuery(api.opportunities.getAllOpportunities, {});

// Get state-level opportunities
const stateOpportunities = useQuery(api.opportunities.getOpportunitiesByIssuingLevel, { 
  level: "State" 
});

// Search for opportunities containing "Dallas"
const searchResults = useQuery(api.opportunities.searchOpportunities, { 
  searchTerm: "Dallas" 
});

// Get filtered opportunities
const filteredOpportunities = useQuery(api.opportunities.getOpportunitiesByFilters, {
  opportunityType: "Public Sector",
  issuingLevel: "City",
  region: "Dallas–Fort Worth",
  isActive: true,
  minValue: 1000000,
  maxValue: 100000000
});
```

### Creating a New Opportunity

```typescript
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

const createOpportunity = useMutation(api.opportunities.createOpportunity);

const handleCreateOpportunity = async () => {
  await createOpportunity({
    opportunityType: "Public Sector",
    opportunityTitle: "New Highway Construction Project",
    contractID: "HWY-2025-001",
    issuingBody: {
      name: "Texas Department of Transportation",
      level: "State"
    },
    location: {
      city: "Austin",
      county: "Travis County",
      region: "Austin"
    },
    status: "In Planning Phase",
    estimatedValueUSD: 50000000,
    keyDates: {
      publishedDate: "2025-01-15",
      bidDeadline: "2025-03-15",
      projectedStartDate: "2025-06-01"
    },
    source: {
      documentName: "TxDOT Project Announcement",
      url: "https://example.com/project"
    },
    summary: "Major highway construction project in Austin area"
  });
};
```

## Frontend Integration

A complete React component example is provided in `opportunities-frontend-example.tsx`. This component demonstrates:

- Displaying opportunities in a responsive table
- Advanced search and filtering functionality
- Statistics dashboard with value calculations
- Import/export capabilities
- CRUD operations
- Form handling for new opportunities
- Currency formatting
- Status and category badges

## Testing

A comprehensive test script is provided in `test-opportunities-functionality.js` that demonstrates all the functionality:

```bash
node test-opportunities-functionality.js
```

## Data Migration

To migrate existing data from the `texasLeadsTierOne.json` file:

1. Use the `importOpportunitiesFromJson` action
2. The system will automatically:
   - Categorize opportunities based on title and summary content
   - Detect regions from location data
   - Generate searchable text
   - Set appropriate metadata
   - Handle nested object structures

## Automatic Categorization

The system automatically categorizes opportunities based on content analysis:

- **Transportation**: Highway, road, interstate, transit projects
- **Aviation**: Airport, aviation infrastructure projects
- **Digital Infrastructure**: Smart city, kiosk, ITS projects
- **Infrastructure**: Sewer, drainage, utility projects
- **Construction**: General construction projects

## Future Enhancements

- **Semantic Search**: Vector embeddings for advanced search capabilities
- **External API Integration**: Sync with external procurement APIs
- **Automated Monitoring**: Check for updates and changes
- **Advanced Analytics**: Machine learning insights and predictions
- **Lead Scoring**: Rate opportunities based on relevance and value
- **Notification System**: Alert users about new opportunities matching their criteria

## File Structure

```
convex/
├── schema.ts                    # Database schema with opportunities table
├── opportunities.ts             # Mutations and queries for opportunities
└── opportunitiesActions.ts      # Actions for bulk operations

Frontend/
├── opportunities-frontend-example.tsx  # React component example
└── test-opportunities-functionality.js # Test script

Data/
└── json/texasLeadsTierOne.json  # Sample data file
```

This system provides a robust foundation for managing detailed procurement opportunity data with advanced filtering, search, and analytics capabilities.
