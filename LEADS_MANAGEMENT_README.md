# Leads Management Component

A comprehensive React component for managing procurement opportunity leads with full CRUD functionality.

## Overview

The Leads Management system provides a complete interface for viewing, creating, editing, and deleting procurement opportunity leads. It includes advanced filtering, search capabilities, and detailed lead information display.

## Components

### 1. LeadsManagement (`src/components/LeadsManagement.tsx`)

The main component that provides:
- **Lead List View**: Displays all leads with search and filtering capabilities
- **Lead Details Panel**: Shows detailed information about selected leads
- **CRUD Operations**: Create, read, update, and delete leads
- **Bulk Actions**: Toggle active status, mark as checked, delete multiple leads
- **Statistics Dashboard**: Shows lead counts and breakdowns by category

#### Features:
- **Search**: Full-text search across opportunity titles, summaries, and issuing bodies
- **Filtering**: Filter by opportunity type, status, region, level, verification status, and active status
- **Real-time Updates**: Uses Convex for real-time data synchronization
- **Responsive Design**: Works on desktop and mobile devices
- **Status Management**: Toggle active/inactive status and mark leads as checked

### 2. LeadForm (`src/components/LeadForm.tsx`)

A comprehensive form component for creating and editing leads with:
- **Form Validation**: Client-side validation with error messages
- **Dynamic Contact Management**: Add/remove multiple contacts per lead
- **Date Handling**: Proper date input fields for key dates
- **URL Validation**: Validates source URLs and contact URLs
- **Email Validation**: Validates contact email addresses

#### Form Fields:
- **Basic Information**: Opportunity title, type, contract ID, status
- **Issuing Body**: Name and level of the issuing organization
- **Location**: City, county, and region information
- **Financial**: Estimated value in USD
- **Key Dates**: Published date, bid deadline, projected start date
- **Source**: Document name and URL
- **Contacts**: Multiple contacts with name, title, email, phone, and URL
- **Additional**: Summary, verification status, category, subcategory

### 3. LeadsManagementPage (`src/pages/LeadsManagementPage.tsx`)

A page wrapper that provides the proper layout and styling for the leads management interface.

## Database Schema

The leads are stored in the `leads` table with the following key fields:

```typescript
interface Lead {
  _id: Id<"leads">;
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
    publishedDate?: string;
    bidDeadline?: string;
    projectedStartDate?: string;
  };
  source: {
    documentName: string;
    url: string;
  };
  contacts: Array<{
    name?: string;
    title: string;
    email?: string;
    phone?: string;
    url?: string;
  }>;
  summary: string;
  verificationStatus?: string;
  category?: string;
  subcategory?: string;
  isActive?: boolean;
  lastChecked?: number;
  createdAt: number;
  updatedAt: number;
}
```

## API Endpoints

### Mutations
- `createLead`: Create a new lead
- `updateLead`: Update an existing lead
- `deleteLead`: Delete a lead
- `bulkCreateLeads`: Create multiple leads from JSON data
- `markLeadAsChecked`: Update last checked timestamp
- `toggleLeadActive`: Toggle active status

### Queries
- `getAllLeads`: Get all leads
- `getLeadById`: Get a specific lead by ID
- `getLeadsByLevel`: Filter by issuing body level
- `getLeadsByCategory`: Filter by category
- `getLeadsByRegion`: Filter by region
- `getActiveLeads`: Get only active leads
- `getLeadsByOpportunityType`: Filter by opportunity type
- `getLeadsByStatus`: Filter by status
- `getLeadsByVerificationStatus`: Filter by verification status
- `searchLeads`: Full-text search
- `getLeadsByFilters`: Advanced filtering
- `getLeadsStats`: Get statistics

### Actions
- `importLeadsFromJson`: Import leads from JSON data
- `importTexasLeadsFromJson`: Import Texas leads from JSON
- `exportLeads`: Export leads to JSON/CSV
- `bulkUpdateLeads`: Update multiple leads
- `bulkDeleteLeads`: Delete multiple leads
- `bulkToggleActiveStatus`: Toggle active status for multiple leads
- `clearAllLeads`: Clear all leads (for testing)
- `getLeadsAnalytics`: Get detailed analytics

## Usage

### Basic Usage

```tsx
import { LeadsManagement } from './components/LeadsManagement';

function MyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LeadsManagement />
      </div>
    </div>
  );
}
```

### With Custom Styling

```tsx
<LeadsManagement className="custom-leads-management" />
```

## Navigation

The leads management page is accessible at `/leads-management` and is included in the main navigation menu.

## Features

### Search and Filtering
- **Text Search**: Search across opportunity titles, summaries, and issuing body names
- **Multi-Filter**: Filter by opportunity type, status, region, level, verification status, and active status
- **Real-time Results**: Filters update results in real-time
- **Clear Filters**: Easy way to reset all filters

### Lead Management
- **View Details**: Click on any lead to view detailed information
- **Edit Leads**: Click the edit button to modify lead information
- **Delete Leads**: Remove leads with confirmation
- **Bulk Operations**: Select multiple leads for bulk actions
- **Status Management**: Toggle active status and mark as checked

### Data Import/Export
- **JSON Import**: Import leads from JSON files
- **CSV Export**: Export leads to CSV format
- **Bulk Operations**: Perform operations on multiple leads

### Statistics
- **Total Counts**: See total leads, active leads, and breakdowns by type
- **Category Breakdown**: View distribution by opportunity type
- **Regional Analysis**: See leads by geographic region

## Styling

The component uses Tailwind CSS for styling and is fully responsive. It follows the existing design patterns in the application.

## Dependencies

- React 18+
- Convex for real-time database
- Lucide React for icons
- Tailwind CSS for styling
- React Router for navigation

## Future Enhancements

- **Semantic Search**: Vector-based search using embeddings
- **Advanced Analytics**: More detailed reporting and analytics
- **Bulk Import**: CSV import functionality
- **Email Notifications**: Notify users of new leads
- **Lead Scoring**: Automatic lead scoring based on criteria
- **Integration**: Connect with external procurement systems
