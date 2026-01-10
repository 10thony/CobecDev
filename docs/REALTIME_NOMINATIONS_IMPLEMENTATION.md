# Real-Time Nominations Implementation

## Overview

This document describes the implementation of real-time nominations functionality using Convex instead of MongoDB actions. The system now provides instant updates across all connected users when nominations are created, approved, declined, or deleted.

## Architecture Changes

### Before (Legacy System)
- Used external actions for data operations
- Required manual refresh after operations
- No real-time updates
- Users had to manually reload data to see changes

### After (Convex Real-Time)
- Uses Convex mutations and queries
- Automatic real-time updates via `useQuery` hooks
- Instant synchronization across all connected users
- No manual refresh required

## Key Components

### 1. Convex Schema (`convex/schema.ts`)
Added new tables for nominations system:
- `nominations` - Stores nomination data with indexes for efficient querying
- `employees` - Stores employee information
- `kfcpoints` - Stores KFC points and events
- `cobecadmins` - Stores admin user information

### 2. Convex Functions (`convex/nominations.ts`)
Convex mutations and queries:

**Mutations:**
- `create` - Create new nomination
- `approve` - Approve nomination and update KFC points
- `decline` - Decline nomination
- `remove` - Delete nomination
- `createEmployee` - Add new employee

**Queries (Real-Time):**
- `list` - Get all nominations (sorted by creation date)
- `listPending` - Get only pending nominations
- `listByEmployee` - Get nominations for specific employee
- `listEmployees` - Get all employees
- `listKfcPoints` - Get all KFC points (sorted by score)
- `getKfcPointsByEmployee` - Get KFC points for specific employee

### 3. React Hooks (`src/lib/useNominations.ts`)
Updated to use Convex for real-time functionality:

**`useNominations()`** - Provides mutation functions:
- `createNomination`
- `approveNomination`
- `declineNomination`
- `deleteNomination`

**`useNominationsData()`** - Provides real-time queries:
- `nominations` - All nominations (updates automatically)
- `pendingNominations` - Only pending nominations
- `employees` - All employees
- `kfcPoints` - All KFC points

**`useNominationsByEmployee(employeeName)`** - Employee-specific data:
- `nominations` - Nominations for specific employee
- `kfcPoints` - KFC points for specific employee

### 4. React Component (`src/components/KfcNomination.tsx`)
Updated to use real-time hooks:
- Removed manual data fetching
- Removed `useEffect` for loading data
- Uses `useQuery` for automatic real-time updates
- Simplified error handling

## Real-Time Features

### 1. Instant Updates
When any user creates, approves, declines, or deletes a nomination:
- All connected users see the change immediately
- No page refresh required
- No manual data fetching needed

### 2. Automatic KFC Points Updates
When a nomination is approved:
- KFC points are automatically updated
- New events are added to the employee's record
- All users see the updated points immediately

### 3. Real-Time Filtering
- Pending nominations list updates automatically
- Employee-specific views update in real-time
- KFC points leaderboard updates instantly

## Migration Process

### 1. Data Migration
Use the migration script to move existing data:
```bash
node scripts/migrate-nominations-to-convex.js
```

### 2. Testing
Verify real-time functionality:
```bash
node scripts/test-realtime-nominations.js
```

## Benefits

### 1. User Experience
- **Instant Feedback**: Users see changes immediately
- **No Manual Refresh**: Data updates automatically
- **Collaborative**: Multiple users can work simultaneously
- **Real-Time Collaboration**: Perfect for team environments

### 2. Performance
- **Efficient Queries**: Indexed queries for fast performance
- **Optimistic Updates**: UI updates immediately, then syncs
- **Reduced Server Load**: No polling required

### 3. Scalability
- **Built-in Scaling**: Convex handles scaling automatically
- **Real-Time Subscriptions**: Only updates when data changes
- **Efficient Caching**: Smart caching reduces database calls

## Usage Examples

### Creating a Nomination
```typescript
const { createNomination } = useNominations();

const handleSubmit = async () => {
  const result = await createNomination(
    'John Doe',
    'Jane Smith',
    'Team',
    'Great teamwork on the project!'
  );
  
  if (result.success) {
    // Form will reset automatically
    // All users will see the new nomination immediately
  }
};
```

### Real-Time Data Display
```typescript
const { nominations, employees, kfcPoints } = useNominationsData();

// These automatically update when data changes
return (
  <div>
    <h2>Nominations ({nominations.length})</h2>
    {nominations.map(nomination => (
      <NominationCard key={nomination._id} nomination={nomination} />
    ))}
  </div>
);
```

### Employee-Specific View
```typescript
const { nominations, kfcPoints } = useNominationsByEmployee('Jane Smith');

// Shows only Jane's nominations and points
// Updates automatically when Jane gets new nominations
```

## Configuration

### Environment Variables
```bash
# Convex deployment URL
CONVEX_URL=https://your-deployment.convex.cloud

```

## Troubleshooting

### Common Issues

1. **Data not updating**: Check that Convex queries are using `useQuery` instead of `useAction`
2. **Connection errors**: Ensure Convex URL is correct
3. **Type errors**: Regenerate Convex types with `npx convex dev`

### Debugging
- Check browser console for Convex connection status
- Use Convex dashboard to monitor queries and mutations
- Verify schema changes are deployed

## Future Enhancements

1. **Real-Time Notifications**: Push notifications for new nominations
2. **Live Typing Indicators**: Show when users are creating nominations
3. **Conflict Resolution**: Handle simultaneous edits
4. **Offline Support**: Queue changes when offline
5. **Real-Time Analytics**: Live dashboard updates

## Conclusion

The real-time nominations system provides a much better user experience with instant updates across all connected users. Convex queries and mutations enable true real-time collaboration while maintaining all existing functionality. 