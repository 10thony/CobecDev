# Procurement Link Verifier Component - System Card

## Overview

The Procurement Link Verifier is a comprehensive React component that provides a human-in-the-loop verification workflow for government procurement URLs. It serves as a critical quality control gate between AI-generated procurement links and their publication in the Government Link Hub. The component enables administrators to import, review, approve, deny, and manage procurement links through an intuitive interface with real-time database synchronization via Convex.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Frontend (React 19 / TypeScript)                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              ProcurementLinkVerifier Component                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Import Panel │  │ Manual Entry │  │ Link Grid    │          │   │
│  │  │ (JSON Upload)│  │ Form         │  │ (Cards)      │          │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │   │
│  │         │                 │                 │                    │   │
│  │         └─────────────────┼─────────────────┘                    │   │
│  │                           │                                       │   │
│  │                    Convex React Hooks                            │   │
│  │              (useQuery, useMutation)                              │   │
│  └───────────────────────────┼───────────────────────────────────────┘   │
└───────────────────────────────┼───────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Convex Backend (Serverless Functions)                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    procurementUrls.ts                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │   Queries    │  │  Mutations   │  │ Internal     │          │   │
│  │  │              │  │              │  │ Mutations    │          │   │
│  │  │ - list       │  │ - approve    │  │ - addPending │          │   │
│  │  │ - getPending │  │ - deny       │  │              │          │   │
│  │  │ - getApproved│  │ - update     │  │              │          │   │
│  │  │ - getStats   │  │ - remove     │  │              │          │   │
│  │  │ - search...  │  │ - import...  │  │              │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────────────────────┼───────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Convex Database (Real-time)                                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    procurementUrls Table                          │   │
│  │                                                                   │   │
│  │  Fields:                                                          │   │
│  │  - state: string                                                  │   │
│  │  - capital: string                                                │   │
│  │  - officialWebsite: string                                        │   │
│  │  - procurementLink: string                                        │   │
│  │  - status: "pending" | "approved" | "denied"                     │   │
│  │  - verifiedBy: string? (Clerk user ID)                           │   │
│  │  - verifiedAt: number? (timestamp)                                │   │
│  │  - denialReason: string?                                         │   │
│  │  - importedAt: number (timestamp)                                │   │
│  │  - sourceFile: string?                                            │   │
│  │  - requiresRegistration: boolean?                                 │   │
│  │                                                                   │   │
│  │  Indexes:                                                         │   │
│  │  - by_state: ["state"]                                           │   │
│  │  - by_status: ["status"]                                         │   │
│  │  - by_state_status: ["state", "status"]                         │   │
│  │  - by_imported: ["importedAt"]                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
```

### Integration Points

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│ ProcurementChat  │────▶│ ProcurementLinkVerifier│────▶│ GovernmentLinkHub│
│ Component        │     │ Component              │     │ / USAMap         │
│                  │     │                        │     │                  │
│ - AI generates   │     │ - Human verification   │     │ - Displays       │
│   JSON links     │     │ - Approve/Deny         │     │   approved links │
│ - Export to      │     │ - Edit URLs            │     │ - Interactive    │
│   verifier       │     │ - Manual entry         │     │   map pins       │
└──────────────────┘     └──────────────────────┘     └──────────────────┘
```

## Core Component Details

### Component Location
- **File:** `src/components/ProcurementLinkVerifier.tsx`
- **Type:** React Functional Component
- **Framework:** React 19 with TypeScript
- **UI Library:** Tron UI Components (custom design system)

### Component Props

```typescript
interface ProcurementLinkVerifierProps {
  className?: string;  // Optional CSS class for styling
}
```

### State Management

The component uses React hooks for local state management and Convex hooks for server state:

#### Local State (useState)
- `isProcessing`: Boolean flag for file upload processing
- `importResult`: Object containing import statistics (`{ imported, skipped, duplicates }`)
- `error`: String for error messages
- `dragOver`: Boolean for drag-and-drop visual feedback
- `statusFilter`: Filter type (`'all' | 'pending' | 'approved' | 'denied'`)
- `editingId`: Currently editing link ID (null when not editing)
- `correctedLink`: Temporary value for link editing
- `requiresRegistration`: Record mapping link IDs to registration requirement booleans
- `showManualForm`: Boolean to toggle manual entry form visibility
- `manualFormData`: Form state object with fields:
  - `state`: Selected state name
  - `capital`: Capital city name (auto-filled from state)
  - `officialWebsite`: Official website URL
  - `procurementLink`: Procurement/bidding URL
  - `requiresRegistration`: Boolean checkbox state
- `manualFormError`: Error message for manual form submission
- `manualFormSuccess`: Success flag for manual form submission
- `isSubmittingManual`: Loading state for manual form submission

#### Server State (Convex Queries)
- `allUrls`: All procurement URLs from `api.procurementUrls.list`
- `stats`: Statistics object from `api.procurementUrls.getStats` containing:
  - `total`: Total number of links
  - `pending`: Count of pending links
  - `approved`: Count of approved links
  - `denied`: Count of denied links

#### Server Mutations (Convex Mutations)
- `importFromJson`: Import links from JSON file
- `approve`: Approve a single link
- `deny`: Deny a single link
- `resetToPending`: Reset link status to pending
- `remove`: Delete a link
- `approveAll`: Bulk approve all pending links
- `clearAll`: Delete all links (with confirmation)
- `updateLink`: Update link fields (URL, registration requirement)
- `addManual`: Add manually entered link (auto-approved)

## Data Flow

### 1. Import Flow (JSON File Upload)

```
User Action: Drag & Drop or Click to Upload JSON File
    │
    ▼
handleFileSelect()
    │
    ├─► Validate file type (.json only)
    ├─► Validate file size (< 4MB)
    ├─► Read file as text
    ├─► Parse JSON
    │   │
    │   ├─► Handle Array format: [{state, capital, ...}]
    │   ├─► Handle Wrapped format: {us_state_capitals_procurement: [...]}
    │   └─► Handle Alternative format: {links: [...]}
    │
    ├─► Validate each link has required fields:
    │   - state
    │   - capital
    │   - official_website
    │   - procurement_link
    │
    ▼
importFromJson({ links, sourceFile })
    │
    ▼
Backend: procurementUrls.importFromJson()
    │
    ├─► For each link:
    │   ├─► Check if state already exists (by_state index)
    │   ├─► If exists: skip, add to duplicates array
    │   └─► If new: insert with status="pending"
    │
    ▼
Return: { imported, skipped, duplicates }
    │
    ▼
Update UI:
    ├─► Display import result message
    ├─► Set statusFilter to 'pending'
    └─► Refresh link list via reactive query
```

### 2. Manual Entry Flow

```
User Action: Click "Add New Procurement Link" → Fill Form → Submit
    │
    ▼
handleManualSubmit()
    │
    ├─► Validate required fields
    ├─► Validate URLs (new URL() constructor)
    │
    ▼
addManual({ state, capital, officialWebsite, procurementLink, requiresRegistration })
    │
    ▼
Backend: procurementUrls.addManual()
    │
    ├─► Check if state already exists
    ├─► If exists: Update existing record to "approved"
    └─► If new: Insert with status="approved"
    │
    ▼
Return: Link ID
    │
    ▼
Update UI:
    ├─► Show success message
    ├─► Reset form
    ├─► Set statusFilter to 'approved'
    └─► Refresh link list
```

### 3. Approval Flow

```
User Action: Click "Approve" button on a link card
    │
    ▼
handleApprove(id)
    │
    ├─► If link is being edited:
    │   ├─► Check if correctedLink differs from original
    │   └─► If different: updateLink() first
    │
    ▼
approve({ id, requiresRegistration })
    │
    ▼
Backend: procurementUrls.approve()
    │
    ├─► Get current user identity (Clerk)
    ├─► Patch link:
    │   ├─► status = "approved"
    │   ├─► verifiedBy = user.subject
    │   ├─► verifiedAt = Date.now()
    │   └─► requiresRegistration = value (if provided)
    │
    ▼
Reactive Query Update
    │
    ▼
UI Updates:
    ├─► Link card shows "Approved" badge
    ├─► Link becomes available in Government Link Hub
    └─► Stats update automatically
```

### 4. Denial Flow

```
User Action: Click "Deny" button on a link card
    │
    ▼
handleDeny(id)
    │
    ▼
deny({ id })
    │
    ▼
Backend: procurementUrls.deny()
    │
    ├─► Get current user identity
    ├─► Patch link:
    │   ├─► status = "denied"
    │   ├─► verifiedBy = user.subject
    │   ├─► verifiedAt = Date.now()
    │   └─► denialReason = undefined (can be extended)
    │
    ▼
Reactive Query Update
    │
    ▼
UI Updates:
    ├─► Link card shows "Denied" badge
    ├─► Link removed from pending queue
    └─► Stats update automatically
```

### 5. Link Editing Flow

```
User Action: Click Edit icon next to procurement link
    │
    ▼
handleStartEdit(id, currentLink)
    │
    ├─► Set editingId = id
    └─► Set correctedLink = currentLink
    │
    ▼
UI: Show inline edit input
    │
    ▼
User Action: Modify URL → Click Save
    │
    ▼
handleSaveCorrectedLink(id)
    │
    ├─► Validate: correctedLink.trim() !== ""
    │
    ▼
updateLink({ id, procurementLink: correctedLink.trim() })
    │
    ▼
Backend: procurementUrls.update()
    │
    ├─► Patch link with new procurementLink value
    │
    ▼
Reactive Query Update
    │
    ▼
UI Updates:
    ├─► Exit edit mode
    ├─► Display updated link
    └─► Link card shows new URL
```

## Database Schema

### Table: `procurementUrls`

```typescript
{
  _id: Id<"procurementUrls">,              // Convex document ID
  _creationTime: number,                   // Auto-generated timestamp
  
  // Required Fields
  state: string,                           // Full state name: "Alabama", "Texas"
  capital: string,                         // Capital city name: "Montgomery", "Austin"
  officialWebsite: string,                // Official government website URL
  procurementLink: string,                 // Direct procurement/bidding page URL
  
  // Status Management
  status: "pending" | "approved" | "denied",  // Verification status
  
  // Verification Metadata
  verifiedBy?: string,                     // Clerk user ID who verified
  verifiedAt?: number,                    // Timestamp of verification
  denialReason?: string,                   // Optional reason for denial
  
  // Import Metadata
  importedAt: number,                      // Timestamp when imported
  sourceFile?: string,                    // Source identifier (filename or "manual-entry" or "chat-export-{sessionId}")
  
  // Additional Metadata
  requiresRegistration?: boolean,         // Whether registration is required to view bids
}
```

### Indexes

1. **`by_state`**: Index on `["state"]`
   - Used for: Finding links by state, duplicate detection during import
   - Query: `ctx.db.query("procurementUrls").withIndex("by_state", (q) => q.eq("state", stateName))`

2. **`by_status`**: Index on `["status"]`
   - Used for: Filtering by status, getting pending/approved/denied links
   - Query: `ctx.db.query("procurementUrls").withIndex("by_status", (q) => q.eq("status", "pending"))`

3. **`by_state_status`**: Index on `["state", "status"]`
   - Used for: Finding approved links for a specific state (used by USAMap)
   - Query: `ctx.db.query("procurementUrls").withIndex("by_state_status", (q) => q.eq("state", state).eq("status", "approved"))`

4. **`by_imported`**: Index on `["importedAt"]`
   - Used for: Sorting by import date, batch operations

## Backend Functions (Convex)

### Queries

#### `procurementUrls.list`
**Purpose:** Get all procurement URLs with optional status filter

**Args:**
```typescript
{
  status?: "pending" | "approved" | "denied"
}
```

**Returns:**
```typescript
Array<{
  _id: Id<"procurementUrls">,
  _creationTime: number,
  state: string,
  capital: string,
  officialWebsite: string,
  procurementLink: string,
  status: "pending" | "approved" | "denied",
  verifiedBy?: string,
  verifiedAt?: number,
  denialReason?: string,
  importedAt: number,
  sourceFile?: string,
  requiresRegistration?: boolean,
}>
```

**Usage:** Primary query used by the component to fetch all links. If status filter is provided, uses `by_status` index for efficient querying.

---

#### `procurementUrls.getPending`
**Purpose:** Get all pending URLs for review

**Args:** `{}`

**Returns:** Same as `list` but filtered to pending status only

**Usage:** Used for focused review workflows

---

#### `procurementUrls.getApproved`
**Purpose:** Get all approved URLs (available for map display)

**Args:** `{}`

**Returns:** Same as `list` but filtered to approved status only

**Usage:** Used by USAMap component to display available procurement links

---

#### `procurementUrls.getApprovedByState`
**Purpose:** Get approved URLs for a specific state

**Args:**
```typescript
{
  state: string
}
```

**Returns:** Same as `list` but filtered to approved status and specific state

**Usage:** Used when creating map pins for a specific state

---

#### `procurementUrls.getStats`
**Purpose:** Get aggregate statistics about procurement URLs

**Args:** `{}`

**Returns:**
```typescript
{
  total: number,
  pending: number,
  approved: number,
  denied: number,
}
```

**Usage:** Displayed in stat cards at the top of the component

---

#### `procurementUrls.searchByStateCity`
**Purpose:** Search procurement URLs by state and optionally by city

**Args:**
```typescript
{
  state: string,
  city?: string,
  status?: "pending" | "approved" | "denied"
}
```

**Returns:** Array of matching procurement URLs

**Usage:** Used by procurement agent to find verified URLs before generating new ones

### Mutations

#### `procurementUrls.importFromJson`
**Purpose:** Import procurement URLs from JSON data

**Args:**
```typescript
{
  links: Array<{
    state: string,
    capital: string,
    official_website: string,
    procurement_link: string,
  }>,
  sourceFile?: string,
}
```

**Returns:**
```typescript
{
  imported: number,
  skipped: number,
  duplicates: string[],  // Array of state names that were skipped
}
```

**Logic:**
1. For each link in the array:
   - Check if a link with the same state already exists (using `by_state` index)
   - If exists: increment `skipped`, add state to `duplicates` array, continue
   - If new: insert with `status="pending"`, increment `imported`
2. Return summary statistics

**Duplicate Detection:** Based on state name only. If a state already has a link (in any status), new imports for that state are skipped.

**Usage:** Called when user uploads a JSON file or when exporting from ProcurementChat component

---

#### `procurementUrls.approve`
**Purpose:** Approve a procurement URL

**Args:**
```typescript
{
  id: Id<"procurementUrls">,
  requiresRegistration?: boolean,
}
```

**Returns:** `null`

**Logic:**
1. Get current user identity from Clerk authentication
2. Patch the document:
   - `status = "approved"`
   - `verifiedBy = identity?.subject`
   - `verifiedAt = Date.now()`
   - `requiresRegistration = args.requiresRegistration` (if provided)

**Usage:** Called when user clicks "Approve" button on a link card

---

#### `procurementUrls.deny`
**Purpose:** Deny a procurement URL

**Args:**
```typescript
{
  id: Id<"procurementUrls">,
  reason?: string,
}
```

**Returns:** `null`

**Logic:**
1. Get current user identity
2. Patch the document:
   - `status = "denied"`
   - `verifiedBy = identity?.subject`
   - `verifiedAt = Date.now()`
   - `denialReason = args.reason`

**Usage:** Called when user clicks "Deny" button on a link card

---

#### `procurementUrls.resetToPending`
**Purpose:** Reset a URL back to pending status

**Args:**
```typescript
{
  id: Id<"procurementUrls">,
}
```

**Returns:** `null`

**Logic:**
1. Patch the document:
   - `status = "pending"`
   - `verifiedBy = undefined`
   - `verifiedAt = undefined`
   - `denialReason = undefined`

**Usage:** Called when user clicks "Reset" button on an approved/denied link

---

#### `procurementUrls.remove`
**Purpose:** Delete a procurement URL

**Args:**
```typescript
{
  id: Id<"procurementUrls">,
}
```

**Returns:** `null`

**Logic:**
1. Delete the document from the database

**Usage:** Called when user clicks delete/trash icon on a link card

---

#### `procurementUrls.update`
**Purpose:** Update a procurement URL's details

**Args:**
```typescript
{
  id: Id<"procurementUrls">,
  officialWebsite?: string,
  procurementLink?: string,
  requiresRegistration?: boolean,
}
```

**Returns:** `null`

**Logic:**
1. Filter out undefined values from args
2. If any updates remain, patch the document with those fields

**Usage:** 
- Called when user edits and saves a corrected link URL
- Called when user toggles registration requirement checkbox

---

#### `procurementUrls.addManual`
**Purpose:** Manually add a procurement URL with automatic approval

**Args:**
```typescript
{
  state: string,
  capital: string,
  officialWebsite: string,
  procurementLink: string,
  requiresRegistration?: boolean,
}
```

**Returns:** `Id<"procurementUrls">`

**Logic:**
1. Get current user identity
2. Check if a link with the same state already exists
3. If exists:
   - Update existing record:
     - Update all fields (capital, officialWebsite, procurementLink)
     - Set `status = "approved"`
     - Set `verifiedBy` and `verifiedAt`
     - Set `requiresRegistration` if provided
   - Return existing ID
4. If new:
   - Insert new document with:
     - All provided fields
     - `status = "approved"`
     - `verifiedBy = identity?.subject`
     - `verifiedAt = Date.now()`
     - `importedAt = Date.now()`
     - `sourceFile = "manual-entry"`
     - `requiresRegistration` if provided
   - Return new ID

**Usage:** Called when user submits the manual entry form

---

#### `procurementUrls.approveAll`
**Purpose:** Bulk approve all pending URLs

**Args:** `{}`

**Returns:** `number` (count of approved links)

**Logic:**
1. Get current user identity
2. Query all pending links using `by_status` index
3. For each pending link:
   - Patch to `status = "approved"`
   - Set `verifiedBy` and `verifiedAt`
4. Return count of approved links

**Usage:** Called when user clicks "Approve All Pending" button

---

#### `procurementUrls.clearAll`
**Purpose:** Delete all procurement URLs (use with caution)

**Args:**
```typescript
{
  confirm: boolean,
}
```

**Returns:** `number` (count of deleted links)

**Logic:**
1. If `confirm !== true`, return 0
2. Query all links
3. Delete each link
4. Return count of deleted links

**Usage:** Called when user clicks "Clear All" button (with confirmation dialog)

---

#### `procurementUrls.importFromChatResponse`
**Purpose:** Import procurement links from AI chat response

**Args:**
```typescript
{
  links: Array<{
    state: string,
    capital: string,
    official_website: string,
    procurement_link: string,
    entity_type?: string,
    link_type?: string,
    confidence_score?: number,
  }>,
  sessionId?: Id<"procurementChatSessions">,
}
```

**Returns:**
```typescript
{
  imported: number,
  skipped: number,
  duplicates: string[],  // Array of "State - Capital (URL)" strings
}
```

**Logic:**
1. For each link:
   - Normalize procurement link URL (trim, lowercase, remove trailing slash)
   - Check if exact URL already exists (by comparing normalized URLs)
   - If exists: increment `skipped`, add to `duplicates`, continue
   - If new: insert with `status="pending"`, increment `imported`
2. Return summary statistics

**Duplicate Detection:** Based on exact URL match (normalized). This allows multiple links for the same state if they have different URLs (e.g., state-level and city-level links).

**Usage:** Called when user exports links from ProcurementChat component to verifier

### Internal Mutations

#### `procurementUrls.addPendingUrl`
**Purpose:** Internal mutation to add a pending URL (used by agent)

**Args:**
```typescript
{
  state: string,
  capital: string,
  officialWebsite: string,
  procurementLink: string,
}
```

**Returns:** `Id<"procurementUrls">`

**Logic:**
1. Insert new document with:
   - All provided fields
   - `status = "pending"`
   - `importedAt = Date.now()`
   - No verification metadata

**Usage:** Called internally by procurement agent when suggesting new URLs

## UI Components and Features

### 1. Statistics Cards

**Component:** `TronStatCard`

**Display:**
- Total Links (cyan)
- Pending (orange)
- Approved (cyan)
- Denied (orange)

**Data Source:** `api.procurementUrls.getStats` query

**Update Frequency:** Real-time via Convex reactive queries

---

### 2. Import Section

**Component:** `TronPanel` with drag-and-drop area

**Features:**
- Drag and drop JSON file support
- Click to browse file dialog
- File validation:
  - Must be `.json` file
  - Maximum size: 4MB
- JSON format detection:
  - Direct array: `[{state, capital, ...}]`
  - Wrapped object: `{us_state_capitals_procurement: [...]}`
  - Alternative wrapper: `{links: [...]}`
- Field validation:
  - Each link must have: `state`, `capital`, `official_website`, `procurement_link`
- Import result display:
  - Success message with imported/skipped counts
  - Error messages for validation failures

**File Input Handling:**
```typescript
const handleFileSelect = async (files: FileList | null) => {
  // 1. Validate file type and size
  // 2. Read file as text
  // 3. Parse JSON
  // 4. Detect format and extract links array
  // 5. Validate required fields
  // 6. Call importFromJson mutation
  // 7. Display results
}
```

---

### 3. Manual Entry Form

**Component:** Collapsible form within `TronPanel`

**Fields:**
1. **State Dropdown:**
   - All 50 US states + District of Columbia
   - Auto-fills capital city on selection
   - Required field

2. **Capital Input:**
   - Text input (auto-filled from state selection)
   - Can be manually edited
   - Required field

3. **Official Website URL:**
   - URL input with validation
   - Must be valid URL format
   - Required field

4. **Procurement Link URL:**
   - URL input with validation
   - Must be valid URL format
   - Required field
   - Help text: "This is the direct link to the procurement/bidding page"

5. **Registration Requirement Checkbox:**
   - Boolean checkbox
   - Label: "Requires registration to view bids"
   - Optional field

**Validation:**
- All fields required (except registration checkbox)
- URLs validated using `new URL()` constructor
- Error messages displayed inline

**Submission:**
- Calls `addManual` mutation
- Links are automatically approved (status="approved")
- Form resets on success
- Success message displayed for 3 seconds
- Filter switches to "approved" to show new link

---

### 4. Filter and Bulk Actions

**Component:** `TronPanel` with filter buttons and action buttons

**Filter Options:**
- All (shows count)
- Pending (shows count)
- Approved (shows count)
- Denied (shows count)

**Bulk Actions:**
1. **Approve All Pending:**
   - Button only visible when `stats.pending > 0`
   - Confirmation dialog: "Are you sure you want to approve all pending URLs?"
   - Calls `approveAll` mutation
   - Updates all pending links to approved

2. **Clear All:**
   - Button only visible when `stats.total > 0`
   - Confirmation dialog: "Are you sure you want to delete ALL procurement URLs? This cannot be undone."
   - Calls `clearAll({ confirm: true })` mutation
   - Deletes all links from database

---

### 5. Link Cards Grid

**Layout:** Responsive grid (1 column mobile, 2 tablet, 3 desktop, 4 xl)

**Card Structure:**

#### Header Section
- State name with map pin icon
- Capital city name with building icon
- Status badge (Pending/Approved/Denied)
- Registration required badge (if applicable)

#### Links Section
- **Official Website:**
  - External link icon
  - Opens in new tab
  - Hover effect with underline

- **Procurement Link:**
  - File icon
  - External link icon
  - Opens in new tab
  - Edit button (pencil icon) - only when not in edit mode

#### Edit Mode
- Inline URL input field
- Save button (checkmark icon) - disabled if input empty
- Cancel button (X icon)
- Help text: "This link will be used in the Government Link Hub"

#### Registration Requirement Section
- For approved links: Toggle checkbox with current state
- For pending links: Checkbox that sets state for approval action
- Label: "Requires registration to view bids"
- Visual indicator: Yes (warning color) / No (success color)

#### Actions Section
- **Pending Links:**
  - Deny button (orange, outline)
  - Approve button (cyan, primary)

- **Approved/Denied Links:**
  - Reset button (cyan, outline) - resets to pending
  - Delete button (orange, outline, icon only)

**Card States:**
- Default: Border with cyan glow on hover
- Editing: Highlighted border, edit input visible
- Approved: Success badge, registration toggle available
- Denied: Error badge
- Pending: Warning badge, approval actions available

---

### 6. Empty State

**Component:** `TronPanel` with centered content

**Display Conditions:**
- No links match current filter
- Shows appropriate message based on filter:
  - All: "No Procurement Links - Import a JSON file..."
  - Specific status: "No {status} Links - Try a different filter..."

**Visual:**
- Globe icon (large, gray)
- Heading text
- Descriptive message

## JSON Import Format Support

The component supports three JSON formats for maximum flexibility:

### Format 1: Direct Array
```json
[
  {
    "state": "Alabama",
    "capital": "Montgomery",
    "official_website": "https://www.montgomeryal.gov/",
    "procurement_link": "https://www.montgomeryal.gov/business/partner-with-the-city/procurement-purchasing"
  },
  {
    "state": "Alaska",
    "capital": "Juneau",
    "official_website": "https://www.juneau.org/",
    "procurement_link": "https://www.juneau.org/finance/purchasing"
  }
]
```

### Format 2: Wrapped Object (Primary Format)
```json
{
  "us_state_capitals_procurement": [
    {
      "state": "Texas",
      "capital": "Austin",
      "official_website": "https://www.austintexas.gov/",
      "procurement_link": "https://www.austintexas.gov/department/purchasing"
    }
  ]
}
```

### Format 3: Alternative Wrapper
```json
{
  "links": [
    {
      "state": "California",
      "capital": "Sacramento",
      "official_website": "https://www.cityofsacramento.org/",
      "procurement_link": "https://www.cityofsacramento.org/Finance/Purchasing"
    }
  ]
}
```

**Detection Logic:**
```typescript
if (Array.isArray(jsonData)) {
  linksArray = jsonData;
} else if (jsonData.us_state_capitals_procurement && Array.isArray(jsonData.us_state_capitals_procurement)) {
  linksArray = jsonData.us_state_capitals_procurement;
} else if (jsonData.links && Array.isArray(jsonData.links)) {
  linksArray = jsonData.links;
} else {
  throw new Error('Invalid JSON format...');
}
```

## Integration with Other Components

### 1. ProcurementChat Component

**Connection:** Direct mutation call

**Flow:**
1. User requests procurement links via chat
2. AI generates structured JSON response
3. User clicks "Export to Verifier" button
4. `ProcurementChat` calls `api.procurementUrls.importFromChatResponse`
5. Links imported with `status="pending"` and `sourceFile="chat-export-{sessionId}"`
6. Optional callback to switch to verifier tab

**Mutation:** `procurementUrls.importFromChatResponse`

**Key Difference:** Uses URL-based duplicate detection (allows multiple links per state if URLs differ)

---

### 2. USAMap Component

**Connection:** Query-based (read-only)

**Flow:**
1. `USAMap` queries `api.procurementUrls.getApprovedByState` for each state
2. Displays pin markers on states with approved links
3. When state is clicked, shows approved procurement links in link panel

**Query:** `procurementUrls.getApprovedByState({ state: stateName })`

**Data Flow:** One-way (verifier → map). Approved links automatically appear in map.

---

### 3. Government Link Hub Page

**Connection:** Indirect via USAMap

**Flow:**
1. Public users view Government Link Hub
2. Map displays states with approved procurement links
3. Users can click states to view procurement links
4. Links are read-only for public users

**Access Control:** 
- Verifier: Admin-only (requires authentication)
- Map/Public View: No authentication required

## User Workflows

### Workflow 1: Import and Verify JSON File

1. **Import:**
   - User drags JSON file onto import area
   - System validates and imports links
   - All links start with `status="pending"`

2. **Review:**
   - User sees pending links in grid
   - Can click links to open in new tabs
   - Can edit URLs if incorrect

3. **Verify:**
   - User clicks "Approve" for valid links
   - User clicks "Deny" for invalid links
   - Can set registration requirement during approval

4. **Result:**
   - Approved links become available in Government Link Hub
   - Denied links are archived
   - Stats update in real-time

---

### Workflow 2: Manual Entry

1. **Open Form:**
   - User clicks "Add New Procurement Link"
   - Manual entry form expands

2. **Fill Form:**
   - Select state (auto-fills capital)
   - Enter official website URL
   - Enter procurement link URL
   - Optionally check registration requirement

3. **Submit:**
   - Form validates URLs
   - Link is created with `status="approved"`
   - Link immediately available in map

4. **Result:**
   - Link appears in approved filter
   - Available in Government Link Hub immediately

---

### Workflow 3: Edit and Correct Link

1. **Start Edit:**
   - User clicks edit icon next to procurement link
   - Inline input field appears

2. **Modify:**
   - User corrects URL in input field
   - Can save or cancel

3. **Save:**
   - If link is pending: Save updates URL, can approve after
   - If link is approved: Save updates URL immediately

4. **Result:**
   - Updated URL is saved to database
   - Link card shows new URL

---

### Workflow 4: Bulk Operations

1. **Bulk Approve:**
   - User clicks "Approve All Pending"
   - Confirmation dialog appears
   - All pending links are approved at once

2. **Clear All:**
   - User clicks "Clear All"
   - Strong confirmation dialog appears
   - All links are deleted (irreversible)

---

### Workflow 5: Status Management

1. **Reset to Pending:**
   - User clicks "Reset" on approved/denied link
   - Link returns to pending status
   - Verification metadata cleared

2. **Remove Link:**
   - User clicks delete icon
   - Link is permanently deleted
   - No confirmation (consider adding)

## Error Handling

### Import Errors

**File Type Error:**
- Message: "Please select a JSON file"
- Display: Error panel with alert icon

**File Size Error:**
- Message: "File size must be less than 4MB"
- Display: Error panel with alert icon

**JSON Parse Error:**
- Message: "Invalid JSON format. Please check your file syntax."
- Display: Error panel with alert icon

**Format Error:**
- Message: "Invalid JSON format. Expected an array or an object with 'us_state_capitals_procurement' or 'links' array."
- Display: Error panel with alert icon

**Empty Array Error:**
- Message: "No procurement links found in the uploaded file"
- Display: Error panel with alert icon

**Field Validation Error:**
- Message: "Invalid link format. Each link must have: state, capital, official_website, procurement_link"
- Display: Error panel with alert icon

### Manual Form Errors

**Required Field Error:**
- Message: "All fields are required"
- Display: Inline error below form

**URL Validation Error:**
- Message: "Please enter valid URLs (including https://)"
- Display: Inline error below form

**Submission Error:**
- Message: Error message from backend or "Failed to add link"
- Display: Inline error below form

### Mutation Errors

**General Pattern:**
- Errors caught in try-catch blocks
- Logged to console: `console.error('Error [action]:', err)`
- UI may show generic error or silent failure (consider improving)

**Recommendations:**
- Add toast notifications for mutation errors
- Show inline error messages on cards
- Provide retry mechanisms for failed operations

## Performance Considerations

### Query Optimization

1. **Indexed Queries:**
   - All queries use appropriate indexes
   - `by_status` index for filtering
   - `by_state` index for state lookups
   - `by_state_status` composite index for map queries

2. **Reactive Updates:**
   - Convex queries automatically re-run when data changes
   - No manual refresh needed
   - Real-time synchronization across clients

3. **Query Filtering:**
   - Frontend filters `allUrls` array client-side
   - Could be optimized to filter server-side with status parameter

### Rendering Optimization

1. **Grid Layout:**
   - Responsive grid adapts to screen size
   - Cards are virtualized implicitly (browser handles)

2. **State Management:**
   - Local state for UI interactions (editing, forms)
   - Server state for data (queries)
   - Minimal re-renders due to React hooks

### Import Performance

1. **Batch Processing:**
   - Import processes links sequentially
   - Could be optimized with batch inserts (Convex limitation)

2. **Duplicate Detection:**
   - Uses indexed queries for efficient lookups
   - State-based detection: O(1) lookup per link
   - URL-based detection: O(n) scan (could be optimized with index)

## Security Considerations

### Authentication

**Current Implementation:**
- Mutations check user identity via `ctx.auth.getUserIdentity()`
- `verifiedBy` field stores Clerk user ID
- No explicit role checking (all authenticated users can verify)

**Recommendations:**
- Add admin role check for verification actions
- Restrict import/approval to authorized users only
- Add audit logging for all verification actions

### Input Validation

**Frontend:**
- File type validation (.json only)
- File size validation (4MB limit)
- URL format validation (new URL() constructor)
- Required field validation

**Backend:**
- Convex validators ensure type safety
- No SQL injection risk (Convex is NoSQL)
- URL validation could be enhanced (check for .gov domains)

### Data Integrity

**Duplicate Prevention:**
- State-based: Prevents multiple links per state (import)
- URL-based: Prevents exact URL duplicates (chat export)

**Status Transitions:**
- Only mutations can change status
- No direct database access from frontend
- Verification metadata tracked automatically

## Future Enhancements

### Potential Improvements

1. **Enhanced Duplicate Detection:**
   - Add index on `procurementLink` for faster URL lookups
   - Implement fuzzy matching for similar URLs
   - Detect and merge duplicate states with different URLs

2. **URL Validation:**
   - Background job to validate URLs (HEAD requests)
   - Flag broken links for review
   - Automatic status change for 404s

3. **Bulk Edit:**
   - Select multiple links for bulk operations
   - Bulk status changes
   - Bulk delete with confirmation

4. **Search and Filter:**
   - Search by state name
   - Filter by source file
   - Filter by registration requirement
   - Sort by import date, verification date

5. **Export Functionality:**
   - Export approved links as JSON
   - Export as CSV for spreadsheet tools
   - Export filtered results

6. **Audit Trail:**
   - Track all status changes
   - Show verification history
   - Display who verified and when

7. **Notifications:**
   - Alert admins when new links need review
   - Email notifications for bulk imports
   - Dashboard for pending link count

8. **Link Preview:**
   - Fetch page title and description
   - Screenshot generation
   - Link health monitoring

9. **Advanced Editing:**
   - Edit all fields (not just URL)
   - Batch URL corrections
   - Undo/redo functionality

10. **Analytics:**
    - Track approval/denial rates
    - Monitor import sources
    - Analyze verification time

## Testing Considerations

### Unit Tests

**Component Tests:**
- File upload validation
- JSON parsing and format detection
- Form validation logic
- State management (editing, filtering)

**Backend Tests:**
- Query functions with various filters
- Mutation functions with edge cases
- Duplicate detection logic
- Status transition validation

### Integration Tests

**End-to-End Flows:**
- Import JSON → Verify → Approve → Appear in map
- Manual entry → Auto-approve → Available immediately
- Edit link → Save → Update reflected
- Bulk approve → All links approved

### Edge Cases

1. **Empty imports**
2. **Malformed JSON**
3. **Missing required fields**
4. **Invalid URLs**
5. **Concurrent edits**
6. **Large file imports**
7. **Special characters in state names**
8. **Very long URLs**

## Dependencies

### Frontend Dependencies

- `react`: ^19.0.0 (React 19)
- `convex/react`: Convex React hooks
- `lucide-react`: Icon library
- Custom Tron UI components:
  - `TronPanel`
  - `TronButton`
  - `TronStatCard`

### Backend Dependencies

- `convex`: Convex backend framework
- `convex/values`: Convex validators

### External Services

- **Convex Database:** Real-time database and backend
- **Clerk:** Authentication service (for user identity)

## Code Examples

### Example: Import JSON File

```typescript
// User drags file onto component
const handleFileSelect = async (files: FileList | null) => {
  const file = files[0];
  
  // Validate
  if (!file.name.endsWith('.json')) {
    setError('Please select a JSON file');
    return;
  }
  
  // Read and parse
  const fileText = await file.text();
  const jsonData = JSON.parse(fileText);
  
  // Detect format
  let linksArray = [];
  if (Array.isArray(jsonData)) {
    linksArray = jsonData;
  } else if (jsonData.us_state_capitals_procurement) {
    linksArray = jsonData.us_state_capitals_procurement;
  }
  
  // Import
  const result = await importFromJson({
    links: linksArray,
    sourceFile: file.name,
  });
  
  // Display results
  setImportResult(result);
};
```

### Example: Approve Link with Registration

```typescript
const handleApprove = async (id: Id<"procurementUrls">) => {
  // Save any edits first
  if (editingId === id && correctedLink.trim()) {
    await updateLink({ id, procurementLink: correctedLink.trim() });
  }
  
  // Approve with registration requirement
  await approve({ 
    id, 
    requiresRegistration: requiresRegistration[id] ?? undefined 
  });
  
  // Clear editing state
  setEditingId(null);
  setCorrectedLink('');
};
```

### Example: Query Approved Links for State

```typescript
// In USAMap component
const approvedLinks = useQuery(api.procurementUrls.getApprovedByState, {
  state: selectedState,
});

// Links are automatically filtered to approved status
// and specific state via indexed query
```

## Summary

The Procurement Link Verifier component is a critical quality control system that ensures only verified, accurate procurement links reach the public Government Link Hub. It provides:

- **Flexible Import:** Supports multiple JSON formats and manual entry
- **Human Verification:** Approval/denial workflow with user tracking
- **Link Management:** Edit, update, and remove links
- **Real-time Sync:** Automatic updates via Convex reactive queries
- **Bulk Operations:** Approve all or clear all functionality
- **Status Tracking:** Pending, approved, and denied states
- **Registration Flags:** Track which links require registration

The component integrates seamlessly with the ProcurementChat component (for AI-generated links) and the USAMap component (for displaying approved links), creating a complete pipeline from link discovery to public availability.












