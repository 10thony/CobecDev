# Clerk Authentication Setup Guide

## Environment Variables Required

Create a `.env` file in your project root with the following variables:

```env
# Convex
VITE_CONVEX_URL=your_convex_url_here

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# AI API Keys (for backend)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
HF_API_KEY=your_huggingface_api_key_here
```

## Clerk Setup Steps

1. **Create a Clerk Account**: Go to [clerk.com](https://clerk.com) and create an account

2. **Create a New Application**: 
   - Create a new application in your Clerk dashboard
   - Choose "Next.js" as your framework (works well with Vite/React)

3. **Get Your Publishable Key**:
   - In your Clerk dashboard, go to "API Keys"
   - Copy your "Publishable Key" (starts with `pk_test_` or `pk_live_`)
   - Add it to your `.env` file as `VITE_CLERK_PUBLISHABLE_KEY`

4. **Configure Authentication Methods**:
   - In your Clerk dashboard, go to "User & Authentication" > "Email, Phone, Username"
   - Enable the authentication methods you want (email/password, OAuth providers, etc.)

5. **Set Up Your Domain**:
   - Go to "Paths" in your Clerk dashboard
   - Add your development domain (e.g., `http://localhost:5173`)
   - Add your production domain when ready

## Key Changes Made

### Backend (Convex)
- **Schema**: Updated to use string user IDs instead of Convex IDs
- **Auth Helper**: Created `getCurrentUserId()` function that works with Clerk
- **User Roles**: Updated to work with Clerk user IDs
- **Chats & Messages**: All user associations now use Clerk user IDs

### Frontend (React)
- **Main Entry**: Updated to use `ClerkProvider` and `ConvexProviderWithClerk`
- **Authentication**: Replaced Convex auth with Clerk's `useAuth` hook
- **Sign In/Out**: Updated to use Clerk's `SignIn` and `SignOutButton` components

## How User Data is Referenced

### In Convex Functions
```typescript
// Get the current user's Clerk ID
const userId = await getCurrentUserId(ctx);

// Use it in queries
const chats = await ctx.db
  .query("chats")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .collect();
```

### In React Components
```typescript
// Check authentication status
const { isSignedIn, isLoaded } = useAuth();

// Get user information
const user = useQuery(api.auth.getCurrentUser);
```

## User Role Management

The system maintains user roles in the `userRoles` table using Clerk user IDs:

```typescript
// Check if user is admin
const isAdmin = useQuery(api.auth.isAdmin);

// Assign admin role (admin only)
await mutation(api.auth.assignUserRole, {
  userId: "clerk_user_id_here",
  role: "admin"
});
```

## Security Notes

- All user data is now associated with Clerk user IDs (strings)
- Authentication is handled entirely by Clerk
- Convex functions use `getCurrentUserId()` to ensure users can only access their own data
- Admin functions check user roles before allowing access 