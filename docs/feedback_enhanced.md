# Feedback Component System Card v2.0 — "Nebula Feedback"

## Overview
The revamped Feedback Component transforms static feedback collection into a dynamic, interactive visualization system. Feedback entries are represented as **floating "nodes"** that cluster together when duplicate/similar, grow in size based on submission frequency, and shift in color intensity to reflect popularity. The layout uses a **force-directed physics simulation** that creates organic, living arrangements users can interact with.

---

## Core Concept: Feedback Nebula

Instead of a boring scrollable list, feedback appears as **floating orbs/nodes** in a contained canvas area. Each unique piece of feedback is a node. When the same (or very similar) feedback is submitted again:
1. The existing node **pulses** and **grows** in size
2. Its **color intensifies** (from dim cyan → bright cyan → white-hot)
3. A **ripple animation** emanates outward
4. A **count badge** increments

Nodes gently drift and repel each other, creating a living "nebula" of feedback.

---

## Architecture

### Component Location
```
src/components/
├── FeedbackNebula/
│   ├── FeedbackNebula.tsx        # Main container + canvas
│   ├── FeedbackNode.tsx          # Individual feedback orb
│   ├── FeedbackInput.tsx         # Submission form (redesigned)
│   ├── FeedbackDetail.tsx        # Expanded view modal/drawer
│   ├── usePhysicsSimulation.ts   # Force-directed layout hook
│   ├── useFeedbackClustering.ts  # Duplicate detection + grouping
│   └── types.ts                  # TypeScript interfaces
```

### New Database Schema
```typescript
feedback: defineTable({
  text: v.string(),
  normalizedText: v.string(),        // Lowercase, trimmed, for clustering
  submittedBy: v.optional(v.string()),
  createdAt: v.number(),
  clusterId: v.optional(v.id("feedbackClusters")), // Links to cluster
  sentiment: v.optional(v.string()), // "positive" | "neutral" | "negative" | "suggestion"
  tags: v.optional(v.array(v.string())),
})
  .index("by_creation", ["createdAt"])
  .index("by_cluster", ["clusterId"])
  .index("by_normalized", ["normalizedText"])

feedbackClusters: defineTable({
  canonicalText: v.string(),         // Representative text for the cluster
  normalizedKey: v.string(),         // Normalized string for matching
  count: v.number(),                 // Total submissions
  uniqueUsers: v.number(),           // Distinct users who submitted
  firstSubmittedAt: v.number(),
  lastSubmittedAt: v.number(),
  heat: v.number(),                  // Calculated "hotness" score
  position: v.optional(v.object({    // Persisted position (optional)
    x: v.number(),
    y: v.number(),
  })),
})
  .index("by_count", ["count"])
  .index("by_heat", ["heat"])
  .index("by_normalized_key", ["normalizedKey"])
```

---

## Visual Design System

### Node Sizing (Based on Submission Count)
| Count | Size | Label |
|-------|------|-------|
| 1 | 48px | Whisper |
| 2-3 | 64px | Murmur |
| 4-7 | 80px | Voice |
| 8-15 | 100px | Shout |
| 16+ | 128px | Roar |

### Color Intensity Scale
```typescript
const getNodeColor = (count: number, maxCount: number) => {
  const intensity = Math.min(count / maxCount, 1);
  return {
    // Base: dim tron cyan → Peak: white with cyan glow
    background: `rgba(0, 255, 255, ${0.15 + intensity * 0.6})`,
    border: `rgba(0, 255, 255, ${0.3 + intensity * 0.7})`,
    glow: `0 0 ${10 + intensity * 30}px rgba(0, 255, 255, ${0.3 + intensity * 0.5})`,
    text: intensity > 0.7 ? '#ffffff' : '#00ffff',
  };
};
```

### Sentiment Color Accents
While maintaining the tron-cyan base, sentiment adds a subtle accent ring:
- **Positive**: Inner ring of `#10b981` (emerald)
- **Negative**: Inner ring of `#ef4444` (red)
- **Suggestion**: Inner ring of `#f59e0b` (amber)
- **Neutral**: No accent ring

---

## Physics Simulation

### Force-Directed Layout
Using a lightweight physics engine (custom hook or `d3-force`):

```typescript
interface PhysicsConfig {
  repulsionStrength: number;    // Nodes push away from each other
  centerGravity: number;        // Gentle pull toward center
  boundaryPadding: number;      // Keep nodes within container
  velocityDecay: number;        // Friction/damping
  collisionRadius: (node) => number; // Based on node size
}

const defaultConfig: PhysicsConfig = {
  repulsionStrength: 150,
  centerGravity: 0.02,
  boundaryPadding: 20,
  velocityDecay: 0.85,
  collisionRadius: (node) => node.size / 2 + 10,
};
```

### User Interactions with Physics
| Action | Effect |
|--------|--------|
| **Drag node** | Node follows cursor, others repel, snaps back gently on release |
| **Click empty space** | Gentle "explosion" pushes nearby nodes outward |
| **Scroll/pinch** | Zoom in/out of the nebula |
| **Shake gesture** | Randomizes positions with bounce animation |
| **Hover node** | Node "floats up" (z-index + scale bump), others dim slightly |

---

## Duplicate Detection & Clustering

### Normalization Pipeline
```typescript
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')      // Remove punctuation
    .replace(/\s+/g, ' ')          // Collapse whitespace
    .split(' ')
    .filter(word => !STOP_WORDS.has(word))
    .sort()
    .join(' ');
};
```

### Similarity Matching
For near-duplicates (not exact matches), use Levenshtein distance or Jaccard similarity:

```typescript
const isSimilar = (a: string, b: string): boolean => {
  const similarity = jaccardSimilarity(a, b);
  return similarity > 0.75; // 75% similar words = same cluster
};
```

### Cluster Merge Animation
When a duplicate is detected:
1. New submission appears at input location as small orb
2. Orb **flies toward** existing cluster node (bezier curve path)
3. On impact: **pulse animation** + **size increase** + **count increment**
4. Subtle **particle burst** effect

---

## Component Specifications

### FeedbackNebula.tsx (Main Container)
```typescript
interface FeedbackNebulaProps {
  maxHeight?: number;           // Default: 500px
  showInput?: boolean;          // Default: true
  viewMode?: 'nebula' | 'list' | 'timeline'; // Toggle views
  filterSentiment?: string[];
  searchQuery?: string;
}
```

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [View Toggle: ◉ Nebula ○ List ○ Timeline]   [🔍 Search]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│         ●            ◯                                  │
│              ◉                    ●                     │
│     ○                    ◉                              │
│                  ●                      ○               │
│          ◯                   ●                          │
│                      ◉              ◯                   │
│     ●                                     ●             │
│              ○                 ◉                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [💡 Quick tags: Fun | Stylish | Bug | Feature | Other] │
│  ┌───────────────────────────────────────┐  [Submit ▶] │
│  │ Share your feedback...                │              │
│  └───────────────────────────────────────┘   142/500   │
└─────────────────────────────────────────────────────────┘
```

### FeedbackNode.tsx
```typescript
interface FeedbackNodeProps {
  cluster: FeedbackCluster;
  position: { x: number; y: number };
  isHovered: boolean;
  isSelected: boolean;
  onDragStart: () => void;
  onDragEnd: (position: { x: number; y: number }) => void;
  onClick: () => void;
}
```

**Visual states:**
- **Default**: Floating gently with subtle bob animation
- **Hovered**: Scale 1.1, brighter glow, shows preview tooltip
- **Selected**: Scale 1.15, pulsing ring, detail panel opens
- **Dragging**: Slight transparency, no bob animation
- **New (just submitted)**: Entrance animation (scale from 0 + fade in)

### FeedbackDetail.tsx (Expanded View)
When a node is clicked, a slide-out drawer or modal shows:
- Full feedback text
- Submission history (all individual submissions in cluster)
- Timeline of when each was submitted
- User breakdown (X authenticated, Y anonymous)
- **"Me too" button** — Quick way to +1 without typing
- **Admin actions** (if authenticated as admin): Mark resolved, delete, merge clusters

---

## New UX Features

### 1. Quick Reaction System
Instead of typing "make it fun" again, users see existing nodes and can:
- **Click "Me too ✋"** — Increments count, adds user to cluster
- **Click "Related 🔗"** — Links their new feedback to existing cluster
- Reduces duplicate submissions, increases signal quality

### 2. Heat Decay
Nodes "cool down" over time if not re-submitted:
```typescript
const calculateHeat = (cluster: FeedbackCluster): number => {
  const recencyFactor = Math.exp(
    -(Date.now() - cluster.lastSubmittedAt) / (7 * 24 * 60 * 60 * 1000) // 7-day half-life
  );
  return cluster.count * recencyFactor;
};
```
- Hot (recent + high count): Bright, large, positioned centrally
- Cold (old + low count): Dim, smaller, drifts to edges

### 3. Sentiment Auto-Detection
Simple client-side sentiment analysis on submit:
```typescript
const detectSentiment = (text: string): Sentiment => {
  const lower = text.toLowerCase();
  if (/love|great|awesome|amazing|thanks|good|helpful/.test(lower)) return 'positive';
  if (/bug|broken|doesn't work|error|crash|issue|problem/.test(lower)) return 'negative';
  if (/add|could|should|would be nice|feature|suggestion/.test(lower)) return 'suggestion';
  return 'neutral';
};
```

### 4. Quick Tag Chips
Pre-defined tags users can click to add context:
- `🎨 Design` `⚡ Performance` `🐛 Bug` `💡 Feature` `❓ Question` `🎉 Praise`
- Tags affect node shape/icon slightly (pill shape for bugs, star for praise, etc.)

### 5. View Mode Toggle

#### Nebula View (Default)
Physics-based floating nodes as described above.

#### List View (Classic)
For users who prefer traditional layout — but enhanced:
- Grouped by cluster with expandable accordions
- Count badges and heat indicators still visible
- Sort by: Hottest | Newest | Most Submissions

#### Timeline View
Horizontal scrolling timeline showing when feedback was submitted:
- Clusters positioned along timeline at first submission
- Vertical stacking for multiple submissions on same day
- Great for seeing patterns ("lots of complaints after last deploy")

### 6. Search & Filter
- **Search**: Highlights matching nodes, dims others
- **Filter by sentiment**: Toggle chips to show/hide sentiments
- **Filter by tag**: Same as above
- **Filter by recency**: Slider for "Last 7 days" / "Last 30 days" / "All time"

### 7. Sound Design (Optional, Toggle)
Subtle audio feedback:
- Soft "pop" when new feedback appears
- Gentle "whoosh" when dragging nodes
- Rising tone when "Me too" is clicked
- Muted by default, toggle in corner

### 8. Admin Dashboard Overlay
For authenticated admins, additional layer:
- See user IDs (not just "Anonymous")
- Bulk actions (select multiple → mark resolved)
- Export to CSV
- Pin important feedback (stays centered, doesn't drift)
- Add admin notes to clusters

---

## Animation Specifications

### Node Entrance
```css
@keyframes nodeEntrance {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
```

### Cluster Merge
```css
@keyframes clusterMerge {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); filter: brightness(1.5); }
  100% { transform: scale(1.05); filter: brightness(1); }
}
```

### Idle Float
```css
@keyframes idleFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
```

### Ripple on Increment
```css
@keyframes ripple {
  0% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.7); }
  100% { box-shadow: 0 0 0 20px rgba(0, 255, 255, 0); }
}
```

---

## Technical Implementation Notes

### Performance Optimization
- **Canvas vs DOM**: For 50+ nodes, consider rendering to `<canvas>` instead of DOM elements
- **RAF throttling**: Physics simulation runs at 60fps max, throttle to 30fps on low-power devices
- **Virtualization**: In list view, only render visible items
- **Debounced clustering**: Re-cluster calculation debounced to 500ms after last submission

### Accessibility
- **Keyboard navigation**: Tab through nodes, Enter to select, Escape to deselect
- **Screen reader**: Nodes announce as "Feedback: [text], submitted [count] times"
- **Reduced motion**: Respect `prefers-reduced-motion`, disable physics, use static grid
- **High contrast mode**: Increase border contrast, add text labels to all nodes

### Mobile Adaptations
- Touch-friendly drag with 44px minimum hit targets
- Pinch-to-zoom on nebula
- Swipe between view modes
- Bottom sheet for detail view instead of side drawer

---

## Dependencies

### New Frontend Dependencies
```json
{
  "framer-motion": "^10.x",      // Animations
  "d3-force": "^3.x",            // Physics simulation (or custom)
  "@floating-ui/react": "^0.x",  // Tooltips/popovers
  "fuse.js": "^7.x",             // Fuzzy search for clustering
  "use-sound": "^4.x"            // Optional sound effects
}
```

---

## Migration Path

### Phase 1: Backend Updates
1. Add new schema fields (`normalizedText`, `clusterId`, etc.)
2. Create `feedbackClusters` table
3. Write migration to cluster existing feedback
4. Update `submitFeedback` mutation to handle clustering

### Phase 2: Core Nebula Component
1. Build physics simulation hook
2. Create `FeedbackNode` component with all visual states
3. Implement drag interactions
4. Connect to Convex real-time queries

### Phase 3: Enhanced Input
1. Redesign input with quick tags
2. Add "Me too" functionality
3. Implement sentiment detection

### Phase 4: Polish
1. Add view mode toggle (List, Timeline)
2. Implement search/filter
3. Add admin features
4. Accessibility audit
5. Performance optimization

---

## Summary of UX Wins

| Before | After |
|--------|-------|
| Boring vertical list | Living, breathing nebula |
| Duplicates clutter the feed | Duplicates strengthen existing nodes |
| No visual priority | Size + color = instant importance signal |
| Static, non-interactive | Drag, click, explore |
| Text-only | Sentiment colors + tag icons |
| No way to "agree" with feedback | "Me too" one-click support |
| Single view | Nebula / List / Timeline toggles |
| No search | Fuzzy search + filters |
| Anonymous blob | Heat decay shows what's trending NOW |

This should give your coworkers a feedback experience that's actually *fun* to use and surfaces the most important signals at a glance. Let me know if you want me to start on any specific component implementation!