# Enhanced Nomination System

## Overview

The enhanced nomination system provides a complete workflow for submitting, reviewing, and approving KFC nominations using MongoDB cluster integration. The system includes a pending approval workflow where nominations are reviewed by Cobec admins before affecting KFC points.

## Key Features

### 1. MongoDB Cluster Integration
- All nomination data is stored in the MongoDB cluster (`workdemos` database)
- Uses Convex actions for server-side operations
- Automatic collection creation and indexing

### 2. Pending Approval Workflow
- Nominations are created with "pending" status by default
- Only approved nominations affect KFC points
- Declined nominations remain in the collection for audit purposes

### 3. Admin Review Interface
- Detailed nomination view modal
- Approve/decline actions for pending nominations
- Status tracking (pending, approved, declined)

### 4. Enhanced UI
- Status badges for nomination types and approval status
- Responsive design with dark mode support
- Loading states and error handling

## System Architecture

### Database Collections

#### `nominations` Collection
```javascript
{
  _id: ObjectId,
  nominatedBy: string,           // Name of person submitting nomination
  nominatedEmployee: string,     // Name of nominated employee
  nominationType: "Team" | "Individual" | "Growth",
  description: string,           // Detailed description of nomination
  pointsAwarded: number,         // Points based on nomination type
  status: "pending" | "approved" | "declined",
  approvedBy?: string,           // Admin who processed the nomination
  approvedAt?: Date,             // When the nomination was processed
  createdAt: Date,
  updatedAt: Date
}
```

#### Indexes
- `status: 1` - For filtering pending nominations
- `createdAt: -1` - For sorting by creation date
- `nominatedEmployee: 1` - For quick employee lookups
- `{ status: 1, createdAt: -1 }` - Compound index for status-based sorting

### Points System
- **Team**: 10 points
- **Individual**: 20 points
- **Growth**: 30 points

## Components

### 1. KfcNomination Component (`src/components/KfcNomination.tsx`)
Main component for the nomination interface with:
- Nomination submission form
- Nominations list with status indicators
- Nomination details modal
- Admin approval/decline actions

### 2. Nomination Service (`src/lib/nominationService.ts`)
Utility service providing:
- Points calculation
- Status badge styling
- Nomination type styling

### 3. Nomination Hooks (`src/lib/useNominations.ts`)
Custom hooks for:
- `useNominations()` - CRUD operations
- `useNominationsData()` - Data fetching

### 4. Convex Functions (`convex/nominations.ts`)
Server-side functions:
- `createNomination` - Create new nomination
- `getAllNominations` - Fetch all nominations
- `getPendingNominations` - Fetch pending nominations only
- `approveNomination` - Approve and apply KFC points
- `declineNomination` - Decline nomination
- `deleteNomination` - Delete nomination

## Workflow

### 1. Nomination Submission
1. User fills out nomination form
2. System creates nomination with "pending" status
3. Nomination is stored in MongoDB cluster
4. No KFC points are awarded yet

### 2. Admin Review
1. Admin views pending nominations list
2. Admin clicks "View Details" to see full nomination
3. Admin can approve or decline the nomination

### 3. Approval Process
1. Admin clicks "Approve"
2. System updates nomination status to "approved"
3. System automatically updates KFC points for the nominated employee
4. KFC entry is created if it doesn't exist

### 4. Decline Process
1. Admin clicks "Decline"
2. System updates nomination status to "declined"
3. No KFC points are awarded
4. Nomination remains in collection for audit

## Setup Instructions

### 1. Database Setup
Run the setup script to create the nominations collection:
```bash
node scripts/setup-nominations.js
```

### 2. Environment Variables
Ensure your `.env.local` file contains:
```
MONGODB_USERNAME=your_username
MONGODB_PASSWORD=your_password
MONGODB_CLUSTER=your_cluster_url
```

### 3. Convex Deployment
Deploy the Convex functions:
```bash
npx convex deploy
```

## Usage

### For Regular Users
1. Navigate to the KFC Nominations page
2. Click "New Nomination"
3. Fill out the nomination form
4. Submit the nomination
5. Nomination will appear in the list with "pending" status

### For Admins
1. View the nominations list
2. Click "View Details" on any pending nomination
3. Review the nomination details
4. Click "Approve" to award points or "Decline" to reject
5. The nomination status will update accordingly

## Status Indicators

### Nomination Types
- **Team** (Blue badge) - 10 points
- **Individual** (Purple badge) - 20 points
- **Growth** (Green badge) - 30 points

### Approval Status
- **Pending** (Yellow badge) - Awaiting admin review
- **Approved** (Green badge) - Points awarded
- **Declined** (Red badge) - Rejected by admin

## Error Handling

The system includes comprehensive error handling:
- Form validation for required fields
- Network error handling for MongoDB operations
- Loading states for all async operations
- User-friendly error messages
- Retry functionality for failed operations

## Security Considerations

- All database operations go through Convex actions
- No direct client-side MongoDB access
- Input validation and sanitization
- Audit trail for all nomination changes

## Future Enhancements

1. **Email Notifications** - Notify admins of new nominations
2. **Bulk Operations** - Approve/decline multiple nominations
3. **Advanced Filtering** - Filter by date, employee, status
4. **Export Functionality** - Export nomination reports
5. **Integration with Auth** - Use actual user authentication for admin actions 