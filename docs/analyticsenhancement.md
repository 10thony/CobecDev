

## Summary of the Enhancement Plan

### 📊 Key Features

The analytics dashboard will display a grid with all the requested metrics:

| Column | Description |
|--------|-------------|
| **User ID** | Clerk ID of the requester |
| **Chat Sent** | The user's prompt/message |
| **Response** | The AI assistant's response (expandable) |
| **Model** | e.g., `gpt-4o-mini` |
| **Provider** | e.g., `openai` |
| **Request Cost** | Cost of input tokens |
| **Response Cost** | Cost of output tokens |
| **Request Tokens** | Number of tokens in the prompt |
| **Response Tokens** | Number of tokens in the completion |

### 🏗️ Architecture

**New Components:**
1. **`procurementChatAnalytics` table** - Stores all usage data
2. **`convex/procurementChatAnalytics.ts`** - Backend queries and mutations
3. **`ProcurementChatAnalytics.tsx`** - Admin-only grid component

**Modified Components:**
1. **`procurementChat.ts`** - Records analytics after each AI request
2. **`AdminPanelPage.tsx`** - Adds new "AI Chat Analytics" tab

### 📈 Additional Features Included

- **Summary Cards**: Total requests, total cost, total tokens, unique users
- **Date Range Filtering**: 7d, 30d, 90d, All Time
- **Expandable Rows**: Full prompt/response details, latency, error messages
- **Error Tracking**: Separate display for failed requests
- **Cost Calculations**: Based on current OpenAI pricing

### ⏱️ Estimated Implementation Time

| Phase | Effort |
|-------|--------|
| Schema Enhancement | 30 min |
| Backend Implementation | 2-3 hours |
| Frontend Implementation | 3-4 hours |
| Testing & Refinement | 1-2 hours |
| **Total** | **6-9 hours** |

### 🔐 Security

- Admin-only access via existing `AdminPanelPage` access controls
- Uses existing `userRoles` and `cobecadmins` checks

Would you like me to start implementing any of the phases from this plan?