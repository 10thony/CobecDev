# Semantic Questions - Quick Start Guide

## What Was Created

I've built a complete Semantic Questions system to improve embeddings for job postings and resumes. Here's what's included:

### 1. Database Schema (`convex/schema.ts`)
- New `semanticQuestions` table with comprehensive fields
- Indexes for efficient querying by category, weight, effectiveness, etc.

### 2. Convex Functions (`convex/semanticQuestions.ts`)
Complete CRUD operations:
- `list()` - Get all questions
- `listActive()` - Get active questions only
- `listByCategory()` - Filter by category
- `insert()` - Create new question
- `update()` - Modify existing question
- `remove()` - Delete question
- `toggleActive()` - Enable/disable question
- `incrementUsage()` - Track usage
- `updateEffectiveness()` - Track quality
- `getStats()` - Dashboard statistics

### 3. Seeding Script (`convex/seedSemanticQuestions.ts`)
Pre-built with **35+ semantic questions**:
- 15 Job Posting questions
- 15 Resume questions
- 5 General matching questions

Categories covered:
- Technical skills & expertise
- Experience & background
- Education & certifications
- Responsibilities & duties
- Soft skills & competencies
- Work environment
- Leadership & collaboration
- Specialized skills

### 4. Questions Grid Component (`src/components/QuestionsGrid.tsx`)
Full-featured UI with:
- ✅ Search bar (searches question text, descriptions, tags)
- ✅ Category filter buttons
- ✅ Sortable columns (question, category, weight, usage, effectiveness, status)
- ✅ Statistics dashboard (total, active, usage, avg effectiveness)
- ✅ Details modal with full question information
- ✅ Toggle active/inactive status
- ✅ Delete questions
- ✅ Visual weight indicators (progress bars)
- ✅ Effectiveness color coding (green/yellow/red)
- ✅ Tag display
- ✅ Dark mode support

### 5. Questions Page (`src/pages/QuestionsPage.tsx`)
Wrapper page for the grid component

### 6. Navigation
- Added route in `src/App.tsx`
- Added sidebar link in `src/components/Layout.tsx` with HelpCircle icon

### 7. Documentation
- `docs/SEMANTIC_QUESTIONS_SYSTEM.md` - Complete system documentation
- `docs/SEMANTIC_QUESTIONS_QUICK_START.md` - This quick start guide

## How to Use

### Step 1: Seed the Database

Run this command to populate the database with 35+ default questions:

```bash
npx convex run seedSemanticQuestions:seed --no-push
```

### Step 2: View Questions

1. Open the application
2. Click "Questions" in the sidebar (HelpCircle icon)
3. You'll see all seeded questions with stats

### Step 3: Explore the UI

**Filter by Category:**
- Click category buttons at the top (All, Job Posting, Resume, General)

**Search Questions:**
- Type in the search bar to filter by text, description, or tags
- Real-time filtering as you type

**Sort Columns:**
- Click any column header to sort
- Click again to reverse sort
- Click third time to clear sorting

**View Details:**
- Click the eye icon on any question
- See full description, example answers, tags, and statistics

**Toggle Status:**
- Click the status icon (green checkmark or gray X)
- Active questions are used for embedding generation
- Inactive questions are kept for reference

**Delete Questions:**
- Click the trash icon
- Confirm deletion in popup

## Question Categories Explained

### Job Posting Questions

These questions extract information FROM job postings to create better embeddings:

**Technical Skills** (Weight 10)
- "What are the core technical skills and technologies required for this position?"
- Extracts: Python, React, AWS, Docker, PostgreSQL, etc.

**Experience** (Weight 9)
- "How many years of relevant professional experience are required?"
- Extracts: 5+ years in software development, 3+ years with cloud platforms

**Responsibilities** (Weight 9)
- "What are the primary day-to-day responsibilities and tasks?"
- Extracts: Design APIs, conduct code reviews, mentor developers

### Resume Questions

These questions extract information FROM resumes to create better embeddings:

**Technical Skills** (Weight 10)
- "What technical skills and technologies does this candidate have experience with?"
- Extracts: JavaScript, TypeScript, React, Node.js, AWS, Docker

**Experience** (Weight 9)
- "What is the candidate's total years of professional experience?"
- Extracts: 8 years total, 5 years as senior engineer

**Achievements** (Weight 9)
- "What are the candidate's key achievements and quantifiable results?"
- Extracts: Reduced latency by 60%, saved $200K annually

### General Questions

These questions help with matching and analysis:

**Qualification Level** (Weight 8)
- "What role levels and titles is this candidate qualified for?"
- Determines: Senior Engineer, Staff Engineer, Technical Lead

**Strengths** (Weight 9)
- "What are the key strengths and differentiators?"
- Identifies: Deep expertise in distributed systems, proven leadership

## Statistics Dashboard

The top of the Questions page shows:

- **Total Questions**: Count of all questions (should be 35+ after seeding)
- **Active**: How many are currently enabled
- **Total Usage**: Sum of all usage counts
- **Avg Effectiveness**: Mean effectiveness score (0-100%)

## Question Weights

Questions have weights from 1-10:
- **10**: Critical information (core technical skills, years of experience)
- **9**: Very important (responsibilities, achievements)
- **8**: Important (leadership, project types)
- **7**: Helpful (certifications, methodologies)
- **6**: Nice to have (team structure, ongoing learning)
- **5**: Supplementary (additional context)

Higher weights = more important for matching

## Effectiveness Scoring

Questions track effectiveness (0-100%):
- **70-100%** (Green): High quality matches
- **40-70%** (Yellow): Medium quality matches
- **0-40%** (Red): Low quality matches

This helps identify which questions produce better results.

## Next Steps

### For Immediate Use

1. ✅ Seed the database with default questions
2. ✅ Review questions in the UI
3. ✅ Adjust active/inactive status based on your needs
4. ✅ Use questions in your embedding generation logic

### For Integration

To use questions in embedding generation:

```typescript
// Get active questions for job postings
const questions = await ctx.runQuery(api.semanticQuestions.listByCategory, {
  category: "job_posting"
});

// Filter active only
const activeQuestions = questions.filter(q => q.isActive);

// Sort by weight (highest first)
activeQuestions.sort((a, b) => b.weight - a.weight);

// Use questions to enhance embedding text
for (const job of jobPostings) {
  const qaText = activeQuestions.map(q => {
    const answer = extractAnswer(job, q.question);
    return `Q: ${q.question}\nA: ${answer}`;
  }).join('\n\n');
  
  const enrichedText = `${job.originalText}\n\n${qaText}`;
  const embedding = await generateEmbedding(enrichedText);
  
  // Track usage
  await ctx.runMutation(api.semanticQuestions.incrementUsage, {
    id: q._id
  });
}
```

### For Customization

1. **Add New Questions**: Use the UI or mutations to add domain-specific questions
2. **Adjust Weights**: Update weights based on your matching priorities
3. **Track Effectiveness**: Update effectiveness scores after running searches
4. **Iterate**: Continuously improve questions based on results

## Example Questions in Action

### For a Software Engineer Job Posting:

**Q**: "What are the core technical skills and technologies required?"
**A**: Python, Django, PostgreSQL, AWS, Docker, Kubernetes, React

**Q**: "How many years of relevant professional experience are required?"
**A**: 5+ years in backend development, 3+ years with cloud infrastructure

**Q**: "What security clearance level is required?"
**A**: Secret clearance required

### For a Candidate's Resume:

**Q**: "What technical skills and technologies does this candidate have experience with?"
**A**: Python, Django, Flask, PostgreSQL, AWS, Docker, Kubernetes, React, TypeScript

**Q**: "What is the candidate's total years of professional experience?"
**A**: 7 years total, 4 years as senior backend engineer

**Q**: "What are the candidate's key achievements and quantifiable results?"
**A**: Reduced API latency by 65%, migrated monolith to microservices serving 2M users, mentored 8 junior developers

## Benefits

### Better Embeddings
- More structured and comprehensive
- Captures nuanced information
- Weighted by importance

### Better Matching
- Job postings match candidates more accurately
- Semantic search finds better results
- Reduces false positives/negatives

### Better Insights
- Track which questions are most useful
- Identify gaps in information extraction
- Continuously improve matching quality

## Troubleshooting

**Questions not showing after seeding?**
- Check Convex dashboard to verify data was inserted
- Refresh the page
- Check browser console for errors

**Can't see the Questions page?**
- Make sure you're signed in
- Check that route was added to App.tsx
- Verify Layout.tsx has the navigation link

**Questions have no effectiveness scores?**
- This is normal for new questions
- Effectiveness is calculated after using questions in searches
- Will be populated as you use the system

## Files Created/Modified

### New Files:
- `convex/semanticQuestions.ts` - CRUD operations
- `convex/seedSemanticQuestions.ts` - Seeding script with 35+ questions
- `src/components/QuestionsGrid.tsx` - Full-featured grid UI
- `src/pages/QuestionsPage.tsx` - Page wrapper
- `docs/SEMANTIC_QUESTIONS_SYSTEM.md` - Complete documentation
- `docs/SEMANTIC_QUESTIONS_QUICK_START.md` - This guide

### Modified Files:
- `convex/schema.ts` - Added `semanticQuestions` table
- `src/App.tsx` - Added `/questions` route
- `src/components/Layout.tsx` - Added navigation link

## Summary

You now have a complete semantic questions system that will dramatically improve your embedding quality. The 35+ pre-built questions cover all important aspects of job postings and resumes, and the UI makes it easy to manage and monitor them.

**Ready to use!** Just seed the database and start exploring. 🚀

---

**Quick Commands:**

```bash
# Seed questions
npx convex run seedSemanticQuestions:seed --no-push

# Clear all questions (testing only)
npx convex run seedSemanticQuestions:clearAll --no-push

# Start dev server
npm run dev
```

