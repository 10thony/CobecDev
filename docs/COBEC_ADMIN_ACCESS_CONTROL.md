# Cobec Admin Access Control System

## Overview

The KFC Management page now implements role-based access control using the `cobecAdmins` table in Convex. Users who are in this table have full access to all KFC management features, while other users can only access the nominations functionality.

## How It Works

### 1. User Authentication Check
- When a user logs in and navigates to the Home page, the system automatically checks if their Clerk user ID exists in the `cobecadmins` collection
- This check is performed using the Convex function `api.cobecAdmins.checkIfUserIsCobecAdmin`
- The result is stored in localStorage for quick access across the application

### 2. KFC Management Page Access Control
- **Cobec Admins**: Have access to all three tabs:
  - Points Manager (manage KFC points and rewards)
  - Nominations (handle employee nominations)
  - Database (database management tools)
- **Standard Users**: Can only access:
  - Nominations (submit and manage employee nominations)

### 3. Visual Indicators
- Cobec admins see their status displayed as a green "Cobec Admin" badge on the Home page
- Standard users see a "Standard User" badge
- On the KFC Management page, non-admin users see a "Limited Access" indicator

## Database Schema

The `cobecadmins` collection has the following structure:

```typescript
{
  _id: ObjectId,
  clerkUserId: string,    // Clerk user ID (required)
  name: string,           // Admin name (optional)
  email: string,          // Admin email (optional)
  role: string,           // Admin role (optional, defaults to "admin")
  createdAt: number,      // Timestamp when admin was added
  updatedAt: number       // Timestamp when admin was last updated
}
```

## Convex Functions

### Queries
- `checkIfUserIsCobecAdmin`: Returns boolean indicating if current user is a cobec admin
- `getCurrentUserCobecAdmin`: Returns the current user's admin information or null
- `getAllCobecAdmins`: Returns all cobec admins (admin only)

### Mutations
- `addCobecAdmin`: Adds a new cobec admin (admin only)
- `removeCobecAdmin`: Removes a cobec admin (admin only)

## Implementation Details

### Frontend Components
1. **HomePage**: Checks admin status and displays user role badge
2. **KfcManagementPage**: Conditionally shows tabs based on admin status
3. **cobecAdminsService**: Client-side service for admin operations (currently simulated)

### Backend Functions
1. **cobecAdmins.ts**: Convex functions for admin operations
2. **schema.ts**: Database schema definition for cobecadmins table

## Security Features

1. **Authentication Required**: All admin checks require valid Clerk authentication
2. **Server-Side Validation**: Admin status is verified on the server, not just client-side
3. **Role-Based Access**: Different functionality based on admin status
4. **Audit Trail**: All admin operations are logged with timestamps

## Usage Instructions

### For Cobec Admins
1. Log in to the application
2. Navigate to the Home page to see your "Cobec Admin" status
3. Access the KFC Management page to see all available tabs
4. Use all features including Points Manager and Database tools

### For Standard Users
1. Log in to the application
2. Navigate to the Home page to see your "Standard User" status
3. Access the KFC Management page (only Nominations tab will be available)
4. Submit and manage employee nominations

## Adding New Admins

To add a new cobec admin, you can:

1. **Use the Convex mutation** (if you're already an admin):
   ```typescript
   await mutation(api.cobecAdmins.addCobecAdmin, {
     clerkUserId: "user_clerk_id_here",
     name: "Admin Name",
     email: "admin@example.com",
     role: "admin"
   });
   ```

2. **Add via Convex dashboard** (for initial setup):
   Navigate to the Convex dashboard and add an admin record to the `cobecAdmins` table:
     clerkUserId: "user_clerk_id_here",
     name: "Admin Name",
     email: "admin@example.com",
     role: "admin",
     createdAt: new Date(),
     updatedAt: new Date()
   });
   ```

## Troubleshooting

### Common Issues

1. **User not showing as admin**: Check if the Clerk user ID is correctly added to the `cobecAdmins` table in Convex
2. **Access denied errors**: Ensure the user is properly authenticated with Clerk
3. **Database connection issues**: Verify Convex connection and table exists

### Debug Steps

1. Check browser console for any error messages
2. Verify the user's Clerk ID in the Clerk dashboard
3. Confirm the user exists in the cobecadmins collection
4. Check Convex function logs for any backend errors

## Future Enhancements

1. **Admin Management UI**: Add a web interface for managing cobec admins
2. **Role Granularity**: Implement different admin roles with specific permissions
3. **Audit Logging**: Add detailed logging of admin actions
4. **Bulk Operations**: Support for bulk admin management operations 