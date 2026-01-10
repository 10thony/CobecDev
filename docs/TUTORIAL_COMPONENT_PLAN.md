# Tutorial Component Plan

## Overview
A first-time user onboarding tutorial component that appears once when a user first accesses the application. The tutorial will guide users through the main features of Cobecium in an interactive, user-friendly manner.

## Objectives
1. **One-time display**: Show tutorial only on first visit
2. **Interactive guidance**: Step-by-step walkthrough with highlights and tooltips
3. **Feature coverage**: Cover all major application features
4. **User-friendly**: Non-intrusive, skippable, and visually appealing
5. **Responsive**: Works on desktop and mobile devices

---

## Technical Architecture

### 1. Component Structure

```
TutorialComponent (Main Container)
├── TutorialOverlay (Backdrop with spotlight effect)
├── TutorialStep (Individual step component)
│   ├── StepIndicator (Progress dots)
│   ├── StepContent (Title, description, visual guide)
│   ├── StepActions (Next, Previous, Skip buttons)
│   └── HighlightBox (Highlights specific UI elements)
└── TutorialProgress (Progress bar)
```

### 2. State Management

**Storage Options:**
- **Tutorial Steps**: Stored in Convex database (`tutorialSteps` table)
- **Completion Status**: Convex database (`tutorialCompletions` table) for cross-device sync
- **Local Cache**: localStorage for quick access and offline capability

**State Variables:**
- `currentStep`: number (0-indexed)
- `isVisible`: boolean
- `isCompleted`: boolean (from Convex query)
- `tutorialSteps`: array of step configurations (loaded from Convex)
- `userType`: 'authenticated' | 'unauthenticated' (determines which steps to show)

### 3. Integration Points

**Location**: `src/components/TutorialComponent.tsx`

**Integration in App.tsx:**
```typescript
// In AuthenticatedApp or UnauthenticatedApp
const { userId, isSignedIn } = useAuth();
const userRole = useQuery(api.userRoles.getCurrentUserRole);
const isCobecAdmin = useQuery(api.cobecAdmins.checkIfUserIsCobecAdmin);
const isAdmin = userRole === "admin" || isCobecAdmin === true;

// Get tutorial steps for current user type
const tutorialSteps = useQuery(api.tutorialSteps.getStepsForUser, {
  isAuthenticated: isSignedIn ?? false,
  isAdmin: isAdmin ?? false,
});

// Check if tutorial is completed
const tutorialCompleted = useQuery(api.tutorialCompletions.checkCompletion, {
  userId: userId || 'anonymous',
});

// Show tutorial if not completed and steps are available
const shouldShowTutorial = !tutorialCompleted && tutorialSteps && tutorialSteps.length > 0;

return (
  <Layout>
    {shouldShowTutorial && (
      <TutorialComponent
        userId={userId}
        isAuthenticated={isSignedIn ?? false}
        isAdmin={isAdmin ?? false}
        steps={tutorialSteps}
      />
    )}
    <Routes>...</Routes>
  </Layout>
);
```

**Convex Functions:**
- `tutorialSteps.getStepsForUser` - Get filtered steps based on user type
- `tutorialSteps.getAllSteps` - Admin: Get all steps
- `tutorialSteps.createStep` - Admin: Create new step
- `tutorialSteps.updateStep` - Admin: Update step
- `tutorialSteps.deleteStep` - Admin: Delete step
- `tutorialSteps.reorderSteps` - Admin: Reorder steps
- `tutorialSteps.seedDefaultSteps` - Admin: Seed default steps
- `tutorialCompletions.checkCompletion` - Check if user completed tutorial
- `tutorialCompletions.markComplete` - Mark tutorial as completed
- `tutorialCompletions.resetCompletion` - Admin: Reset completion for testing

---

## Tutorial Steps (Dynamic from Convex DB)

### Step Configuration Schema

Each tutorial step is stored in Convex with the following structure:

```typescript
{
  _id: Id<"tutorialSteps">,
  stepOrder: number, // Display order
  title: string,
  description: string,
  targetSelector?: string, // CSS selector for element to highlight
  targetRoute?: string, // Route to navigate to
  position: 'top' | 'bottom' | 'left' | 'right' | 'center',
  highlightType: 'element' | 'area' | 'none',
  userTypes: ('authenticated' | 'unauthenticated')[], // Which user types see this step
  isActive: boolean, // Admin can enable/disable steps
  requiresAuth: boolean, // Step only shown to authenticated users
  requiresAdmin: boolean, // Step only shown to admin users
  createdAt: number,
  updatedAt: number,
}
```

### Default Step Examples

**For Unauthenticated Users:**
1. Welcome & Overview - Public features introduction
2. Procurement Links - Main public feature
3. Sign In Prompt - Encourage authentication
4. Completion

**For Authenticated Users:**
1. Welcome & Overview - Full platform introduction
2. Navigation Sidebar - How to navigate
3. Procurement Links - Main hub with all tabs
4. HR Overview & Search - Job-resume matching
5. Leads Management - Lead tracking
6. KFC Management - Employee recognition
7. Data Management - Data tools
8. Admin Panel (if admin) - Admin tools
9. Completion

**Dynamic Filtering:**
- Steps are filtered based on `userTypes` array
- Steps with `requiresAuth: true` only show for authenticated users
- Steps with `requiresAdmin: true` only show for admin users
- Steps with `isActive: false` are hidden from all users
- Steps are sorted by `stepOrder` before display

---

## Convex Functions

### Seeding Default Steps

**Initial Setup Function:**
```typescript
// convex/tutorialSteps.ts
export const seedDefaultSteps = mutation({
  args: {},
  handler: async (ctx) => {
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) throw new Error("Unauthorized");
    
    // Check if steps already exist
    const existingSteps = await ctx.db.query("tutorialSteps").collect();
    if (existingSteps.length > 0) {
      throw new Error("Steps already exist. Delete existing steps first.");
    }
    
    const defaultSteps = [
      // Unauthenticated user steps
      {
        stepOrder: 1,
        title: "Welcome to Cobecium",
        description: "Your all-in-one platform for procurement, HR management, and AI-powered tools",
        position: "center" as const,
        highlightType: "none" as const,
        userTypes: ["unauthenticated", "authenticated"] as const,
        isActive: true,
        requiresAuth: false,
        requiresAdmin: false,
      },
      {
        stepOrder: 2,
        title: "Procurement Links",
        description: "Start here: Explore procurement opportunities and government contracts",
        targetRoute: "/",
        position: "bottom" as const,
        highlightType: "area" as const,
        userTypes: ["unauthenticated", "authenticated"] as const,
        isActive: true,
        requiresAuth: false,
        requiresAdmin: false,
      },
      {
        stepOrder: 3,
        title: "Sign In for Full Access",
        description: "Create an account to access advanced features like AI chat, lead management, and more",
        targetSelector: "[data-tutorial='sign-in']",
        position: "top" as const,
        highlightType: "element" as const,
        userTypes: ["unauthenticated"] as const,
        isActive: true,
        requiresAuth: false,
        requiresAdmin: false,
      },
      // Authenticated user steps
      {
        stepOrder: 4,
        title: "Navigation Sidebar",
        description: "Use the sidebar to navigate between different sections of the platform",
        targetSelector: "[data-tutorial='sidebar']",
        position: "right" as const,
        highlightType: "element" as const,
        userTypes: ["authenticated"] as const,
        isActive: true,
        requiresAuth: true,
        requiresAdmin: false,
      },
      {
        stepOrder: 5,
        title: "HR Overview & Search",
        description: "Manage job postings and resumes with AI-powered matching",
        targetRoute: "/hr-overview",
        position: "bottom" as const,
        highlightType: "area" as const,
        userTypes: ["authenticated"] as const,
        isActive: true,
        requiresAuth: true,
        requiresAdmin: false,
      },
      {
        stepOrder: 6,
        title: "Leads Management",
        description: "Track and manage procurement leads efficiently",
        targetRoute: "/leads-management",
        position: "bottom" as const,
        highlightType: "area" as const,
        userTypes: ["authenticated"] as const,
        isActive: true,
        requiresAuth: true,
        requiresAdmin: false,
      },
      {
        stepOrder: 7,
        title: "KFC Management",
        description: "Employee recognition and nomination system",
        targetRoute: "/kfc-management",
        position: "bottom" as const,
        highlightType: "area" as const,
        userTypes: ["authenticated"] as const,
        isActive: true,
        requiresAuth: true,
        requiresAdmin: false,
      },
      {
        stepOrder: 8,
        title: "Admin Panel",
        description: "Configure AI models, manage users, and system settings",
        targetRoute: "/admin-panel",
        position: "bottom" as const,
        highlightType: "area" as const,
        userTypes: ["authenticated"] as const,
        isActive: true,
        requiresAuth: true,
        requiresAdmin: true,
      },
      {
        stepOrder: 9,
        title: "You're All Set!",
        description: "Start exploring Cobecium. Use the sidebar to navigate and check the help widget for assistance",
        position: "center" as const,
        highlightType: "none" as const,
        userTypes: ["unauthenticated", "authenticated"] as const,
        isActive: true,
        requiresAuth: false,
        requiresAdmin: false,
      },
    ];
    
    const now = Date.now();
    for (const step of defaultSteps) {
      await ctx.db.insert("tutorialSteps", {
        ...step,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    return { message: "Default steps seeded successfully" };
  },
});
```

### Tutorial Steps Functions (`convex/tutorialSteps.ts`)

**Queries:**
```typescript
// Get steps filtered for current user
export const getStepsForUser = query({
  args: {
    isAuthenticated: v.boolean(),
    isAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userType = args.isAuthenticated ? 'authenticated' : 'unauthenticated';
    const isAdmin = args.isAdmin ?? false;
    
    // Get all active steps
    let steps = await ctx.db
      .query("tutorialSteps")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    
    // Filter steps based on user context
    steps = steps.filter(step => {
      // Must include current user type
      if (!step.userTypes.includes(userType)) {
        return false;
      }
      
      // If step requires auth, user must be authenticated
      if (step.requiresAuth && !args.isAuthenticated) {
        return false;
      }
      
      // If step requires admin, user must be admin
      if (step.requiresAdmin && !isAdmin) {
        return false;
      }
      
      return true;
    });
    
    // Sort by stepOrder
    return steps.sort((a, b) => a.stepOrder - b.stepOrder);
  },
});

// Get all steps (admin only)
export const getAllSteps = query({
  args: {},
  handler: async (ctx) => {
    // Check admin status
    const userId = await getCurrentUserId(ctx);
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) throw new Error("Unauthorized");
    
    return await ctx.db
      .query("tutorialSteps")
      .withIndex("by_order")
      .collect();
  },
});
```

**Mutations:**
```typescript
// Create new step (admin only)
export const createStep = mutation({
  args: {
    stepOrder: v.number(),
    title: v.string(),
    description: v.string(),
    targetSelector: v.optional(v.string()),
    targetRoute: v.optional(v.string()),
    position: v.union(v.literal("top"), v.literal("bottom"), v.literal("left"), v.literal("right"), v.literal("center")),
    highlightType: v.union(v.literal("element"), v.literal("area"), v.literal("none")),
    userTypes: v.array(v.union(v.literal("authenticated"), v.literal("unauthenticated"))),
    isActive: v.boolean(),
    requiresAuth: v.boolean(),
    requiresAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check admin status
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) throw new Error("Unauthorized");
    
    return await ctx.db.insert("tutorialSteps", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update step (admin only)
export const updateStep = mutation({
  args: {
    id: v.id("tutorialSteps"),
    stepOrder: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    targetSelector: v.optional(v.string()),
    targetRoute: v.optional(v.string()),
    position: v.optional(v.union(v.literal("top"), v.literal("bottom"), v.literal("left"), v.literal("right"), v.literal("center"))),
    highlightType: v.optional(v.union(v.literal("element"), v.literal("area"), v.literal("none"))),
    userTypes: v.optional(v.array(v.union(v.literal("authenticated"), v.literal("unauthenticated")))),
    isActive: v.optional(v.boolean()),
    requiresAuth: v.optional(v.boolean()),
    requiresAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check admin status
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) throw new Error("Unauthorized");
    
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete step (admin only)
export const deleteStep = mutation({
  args: { id: v.id("tutorialSteps") },
  handler: async (ctx, args) => {
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) throw new Error("Unauthorized");
    
    await ctx.db.delete(args.id);
  },
});

// Reorder steps (admin only)
export const reorderSteps = mutation({
  args: {
    stepIds: v.array(v.object({
      id: v.id("tutorialSteps"),
      stepOrder: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) throw new Error("Unauthorized");
    
    for (const { id, stepOrder } of args.stepIds) {
      await ctx.db.patch(id, {
        stepOrder,
        updatedAt: Date.now(),
      });
    }
  },
});
```

### Tutorial Completions Functions (`convex/tutorialCompletions.ts`)

**Queries:**
```typescript
// Check if user has completed tutorial
export const checkCompletion = query({
  args: {
    userId: v.string(), // Clerk user ID or "anonymous"
  },
  handler: async (ctx, args) => {
    const completion = await ctx.db
      .query("tutorialCompletions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    return completion !== null;
  },
});

// Get completion details
export const getCompletion = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tutorialCompletions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});
```

**Mutations:**
```typescript
// Mark tutorial as completed
export const markComplete = mutation({
  args: {
    userId: v.string(),
    completedSteps: v.array(v.id("tutorialSteps")),
  },
  handler: async (ctx, args) => {
    // Check if already completed
    const existing = await ctx.db
      .query("tutorialCompletions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (existing) {
      // Update existing completion
      await ctx.db.patch(existing._id, {
        completedAt: Date.now(),
        completedSteps: args.completedSteps,
      });
    } else {
      // Create new completion
      await ctx.db.insert("tutorialCompletions", {
        userId: args.userId,
        completedAt: Date.now(),
        completedSteps: args.completedSteps,
      });
    }
  },
});

// Reset completion (admin only, for testing)
export const resetCompletion = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) throw new Error("Unauthorized");
    
    const completion = await ctx.db
      .query("tutorialCompletions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (completion) {
      await ctx.db.delete(completion._id);
    }
  },
});
```

---

## Visual Design

### Theme Integration
- **Colors**: Use existing Tron theme (dark background, cyan accents)
- **Typography**: Match application font styles
- **Animations**: Smooth transitions using framer-motion (already in dependencies)

### Spotlight Effect
- Dark overlay (80% opacity) covering entire screen
- Bright spotlight on highlighted element
- Smooth transitions between steps

### Component Styling
```css
- Overlay: bg-black/80 backdrop-blur-sm
- Spotlight: radial-gradient with transparent center
- Card: bg-tron-bg-panel border-tron-cyan/30
- Buttons: bg-tron-cyan text-tron-bg-deep hover:bg-tron-cyan-dim
- Progress: bg-tron-cyan/20 with active bg-tron-cyan
```

---

## Implementation Details

### 1. Convex Schema

**Add to `convex/schema.ts`:**
```typescript
tutorialSteps: defineTable({
  stepOrder: v.number(),
  title: v.string(),
  description: v.string(),
  targetSelector: v.optional(v.string()),
  targetRoute: v.optional(v.string()),
  position: v.union(
    v.literal("top"),
    v.literal("bottom"),
    v.literal("left"),
    v.literal("right"),
    v.literal("center")
  ),
  highlightType: v.union(
    v.literal("element"),
    v.literal("area"),
    v.literal("none")
  ),
  userTypes: v.array(v.union(v.literal("authenticated"), v.literal("unauthenticated"))),
  isActive: v.boolean(),
  requiresAuth: v.boolean(),
  requiresAdmin: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_order", ["stepOrder"])
  .index("by_active", ["isActive"]),

tutorialCompletions: defineTable({
  userId: v.string(), // Clerk user ID or "anonymous" for unauthenticated
  completedAt: v.number(),
  completedSteps: v.array(v.id("tutorialSteps")), // Track which steps were completed
})
  .index("by_user", ["userId"]),
```

### 2. Component Props
```typescript
interface TutorialComponentProps {
  userId?: string; // Clerk user ID (undefined for unauthenticated)
  isAuthenticated: boolean;
  isAdmin?: boolean;
  onComplete?: () => void; // Callback when tutorial completes
  skipEnabled?: boolean; // Allow skipping tutorial
}
```

### 3. Step Configuration Type (Frontend)
```typescript
interface TutorialStep {
  _id: Id<"tutorialSteps">;
  stepOrder: number;
  title: string;
  description: string;
  targetSelector?: string;
  targetRoute?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlightType: 'element' | 'area' | 'none';
  userTypes: ('authenticated' | 'unauthenticated')[];
  isActive: boolean;
  requiresAuth: boolean;
  requiresAdmin: boolean;
}
```

### 4. Key Functions

**Get filtered steps for user:**
```typescript
// Convex query: tutorialSteps.getStepsForUser
// Filters steps based on:
// - isActive === true
// - userTypes includes current user type
// - requiresAuth matches authentication status
// - requiresAdmin matches admin status
// - Sorted by stepOrder
```

**Check if tutorial should show:**
```typescript
// Convex query: tutorialCompletions.checkCompletion
const shouldShowTutorial = (userId: string | undefined): boolean => {
  // Check Convex first
  const completion = useQuery(api.tutorialCompletions.checkCompletion, {
    userId: userId || 'anonymous'
  });
  
  // Fallback to localStorage for offline
  if (completion === undefined) {
    const key = `cobecium_tutorial_completed_${userId || 'anonymous'}`;
    return !localStorage.getItem(key);
  }
  
  return !completion;
};
```

**Mark tutorial as completed:**
```typescript
// Convex mutation: tutorialCompletions.markComplete
const completeTutorial = async (userId: string | undefined, completedSteps: Id<"tutorialSteps">[]) => {
  // Mark in Convex
  await markCompleteMutation({
    userId: userId || 'anonymous',
    completedSteps
  });
  
  // Also cache in localStorage
  const key = `cobecium_tutorial_completed_${userId || 'anonymous'}`;
  localStorage.setItem(key, 'true');
};
```

**Navigate to step target:**
```typescript
const navigateToStep = (step: TutorialStep): void => {
  if (step.targetRoute) {
    navigate(step.targetRoute);
    // Wait for navigation to complete before showing highlight
    setTimeout(() => {
      if (step.targetSelector) {
        highlightElement(step.targetSelector);
      }
    }, 300);
  }
};
```

---

## User Experience Flow

1. **User visits application (first time)**
   - Component checks authentication status
   - Queries Convex for steps filtered by user type (authenticated/unauthenticated)
   - Queries Convex for completion status
   - If not completed and steps available, tutorial overlay appears
   - First step is shown

2. **User progresses through steps**
   - Click "Next" to advance
   - Click "Previous" to go back
   - Click "Skip" to dismiss (optional)
   - Progress indicator shows current position
   - Only steps relevant to user type are shown

3. **Navigation during tutorial**
   - If step requires navigation, automatically navigate
   - Wait for navigation to complete before showing highlight
   - Smooth transitions between steps
   - Steps are dynamically filtered based on available routes/components

4. **Tutorial completion**
   - Mark as completed in Convex database
   - Cache completion in localStorage for offline access
   - Hide tutorial overlay
   - Optionally show completion animation
   - Call onComplete callback if provided

5. **Subsequent visits**
   - Check Convex for completion status
   - Fallback to localStorage if Convex unavailable
   - If completed, don't show tutorial
   - Admin can reset tutorial completion for testing

6. **Dynamic step availability**
   - Steps adapt to user's authentication status
   - Steps adapt to user's admin status
   - Steps adapt to available features (based on component visibility)
   - Admin can enable/disable steps in real-time

---

## Accessibility

- **Keyboard navigation**: Arrow keys to navigate steps, Escape to skip
- **Screen reader support**: ARIA labels, descriptions
- **Focus management**: Focus trap within tutorial modal
- **High contrast**: Ensure sufficient contrast for all text

---

## Responsive Design

### Desktop (> 1024px)
- Full overlay with spotlight effect
- Tutorial card positioned relative to highlighted element
- Side-by-side layout for content and actions

### Tablet (768px - 1024px)
- Similar to desktop but adjusted spacing
- Slightly smaller tutorial card

### Mobile (< 768px)
- Full-screen tutorial modal
- Stacked layout for content
- Larger touch targets for buttons
- Simplified spotlight effect

---

## Admin Panel Management

### Tutorial Management Interface

**Location**: `src/pages/AdminPanelPage.tsx` - New "Tutorial" tab

**Features:**
1. **Step List View**
   - Display all tutorial steps in order
   - Show step details: title, description, target, user types
   - Visual indicators for active/inactive steps
   - Drag-and-drop reordering
   - Quick toggle for active/inactive

2. **Step Editor**
   - Create new tutorial step
   - Edit existing step
   - Form fields:
     - Title (required)
     - Description (required)
     - Step Order (number)
     - Target Route (optional)
     - Target Selector (optional)
     - Position (dropdown)
     - Highlight Type (dropdown)
     - User Types (checkboxes: authenticated, unauthenticated)
     - Requires Auth (checkbox)
     - Requires Admin (checkbox)
     - Is Active (checkbox)

3. **Step Preview**
   - Preview how step will appear
   - Test highlighting on current page
   - Validate selectors and routes

4. **Bulk Operations**
   - Activate/Deactivate multiple steps
   - Delete multiple steps
   - Duplicate steps
   - Reset to default steps

5. **Analytics Dashboard**
   - Completion rate by user type
   - Step drop-off points
   - Average completion time
   - Most skipped steps

### Admin Panel Integration

**Add to AdminPanelPage tabs:**
```typescript
const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'hr-dashboard' | 'tutorial'>('users');
```

**Tutorial Management Component Structure:**
```typescript
// src/components/admin/TutorialManager.tsx
export function TutorialManager() {
  const allSteps = useQuery(api.tutorialSteps.getAllSteps);
  const createStep = useMutation(api.tutorialSteps.createStep);
  const updateStep = useMutation(api.tutorialSteps.updateStep);
  const deleteStep = useMutation(api.tutorialSteps.deleteStep);
  const reorderSteps = useMutation(api.tutorialSteps.reorderSteps);
  
  // State for editing
  const [editingStep, setEditingStep] = useState<Id<"tutorialSteps"> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-tron-white">Tutorial Steps</h2>
        <button onClick={() => setIsCreating(true)}>
          Create New Step
        </button>
      </div>
      
      {/* Step List with Drag-and-Drop */}
      <TutorialStepList 
        steps={allSteps}
        onReorder={handleReorder}
        onEdit={setEditingStep}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
      />
      
      {/* Step Editor Modal */}
      {(editingStep || isCreating) && (
        <TutorialStepEditor
          step={editingStep ? allSteps?.find(s => s._id === editingStep) : undefined}
          onSave={handleSave}
          onCancel={() => { setEditingStep(null); setIsCreating(false); }}
        />
      )}
    </div>
  );
}
```

**Features:**
- Uses Convex mutations for CRUD operations
- Real-time updates via Convex queries
- Follows existing admin panel patterns (similar to HR Dashboard Components management)
- Drag-and-drop reordering using `@dnd-kit` or similar library
- Form validation
- Preview functionality

## Future Enhancements

1. **Contextual help**: Show mini-tutorials for specific features on demand
2. **Progress saving**: Save progress if user closes tutorial mid-way
3. **Video tutorials**: Embed video walkthroughs for complex features
4. **Multi-language support**: Support for different languages
5. **A/B Testing**: Test different tutorial flows
6. **Step templates**: Pre-built step templates for common patterns
7. **Conditional logic**: Steps that show based on user actions or data

---

## Testing Considerations

1. **First-time user flow**: Verify tutorial appears on first login
2. **Returning user flow**: Verify tutorial doesn't appear on subsequent logins
3. **Navigation**: Test automatic navigation to different routes
4. **Responsive**: Test on various screen sizes
5. **Accessibility**: Test with screen readers and keyboard navigation
6. **Edge cases**: Multiple tabs, localStorage disabled, etc.

---

## Dependencies

**Existing (already in package.json):**
- `react` - Component framework
- `react-router-dom` - Navigation
- `framer-motion` - Animations
- `@clerk/clerk-react` - User authentication
- `lucide-react` - Icons

**No additional dependencies required**

---

## File Structure

```
src/
├── components/
│   ├── TutorialComponent.tsx (Main component)
│   ├── TutorialOverlay.tsx (Backdrop and spotlight)
│   ├── TutorialStep.tsx (Individual step)
│   ├── TutorialProgress.tsx (Progress indicator)
│   ├── TutorialHighlight.tsx (Element highlighting)
│   └── admin/
│       └── TutorialManager.tsx (Admin panel management)
├── hooks/
│   └── useTutorial.ts (Tutorial logic and state)
└── convex/
    ├── tutorialSteps.ts (Convex functions for steps)
    └── tutorialCompletions.ts (Convex functions for completions)
```

---

## Implementation Phases

### Phase 1: Database Schema & Convex Functions
- [ ] Add `tutorialSteps` table to Convex schema
- [ ] Add `tutorialCompletions` table to Convex schema
- [ ] Create Convex queries: `getStepsForUser`, `checkCompletion`
- [ ] Create Convex mutations: `markComplete`, `createStep`, `updateStep`, `deleteStep`, `reorderSteps`
- [ ] Seed default tutorial steps for authenticated and unauthenticated users

### Phase 2: Core Component (MVP)
- [ ] Create TutorialComponent with basic overlay
- [ ] Implement step navigation (next/previous)
- [ ] Integrate Convex queries for dynamic steps
- [ ] Filter steps based on user type (authenticated/unauthenticated)
- [ ] Add Convex completion tracking
- [ ] Basic styling with Tron theme

### Phase 3: Interactive Features
- [ ] Element highlighting with spotlight effect
- [ ] Automatic navigation to target routes
- [ ] Progress indicator
- [ ] Skip functionality
- [ ] Dynamic step filtering based on admin status

### Phase 4: Admin Panel Management
- [ ] Create TutorialManager component in admin panel
- [ ] Implement step list view with drag-and-drop reordering
- [ ] Create step editor (create/edit forms)
- [ ] Add step preview functionality
- [ ] Implement bulk operations
- [ ] Add analytics dashboard

### Phase 5: Polish
- [ ] Smooth animations
- [ ] Responsive design
- [ ] Accessibility improvements
- [ ] Error handling
- [ ] Loading states
- [ ] Offline fallback to localStorage

### Phase 6: Integration & Testing
- [ ] Integrate into App.tsx
- [ ] Test with authenticated users
- [ ] Test with unauthenticated users
- [ ] Test admin management features
- [ ] Performance optimization
- [ ] Documentation

---

## Success Metrics

- **Completion rate**: % of users who complete tutorial
- **Time to completion**: Average time to complete tutorial
- **Skip rate**: % of users who skip tutorial
- **Feature discovery**: % of users who access features shown in tutorial

---

## Notes

- Tutorial should be non-blocking (user can still interact with app if needed)
- Consider showing a "Replay Tutorial" option in user settings
- Tutorial steps should be concise (30-60 seconds per step)
- Use visual cues (arrows, highlights) to guide attention
- Keep text minimal and action-oriented
- **Dynamic Steps**: Steps are loaded from Convex and filtered based on user type
- **Admin Control**: Admins can manage all steps via Admin Panel without code changes
- **User Type Awareness**: Tutorial adapts to show only relevant steps for authenticated vs unauthenticated users
- **Real-time Updates**: Changes to steps in admin panel reflect immediately for new users
- **Cross-device Sync**: Completion status stored in Convex for consistency across devices
