# Semantic Questions System for Enhanced Embeddings

## Overview

The Semantic Questions System is designed to improve the quality and relevance of vector embeddings for job postings and resumes. By using structured, thoughtful questions, we can generate more meaningful embeddings that better capture the nuances of job requirements and candidate qualifications.

## Purpose

Traditional embeddings often fail to capture important contextual information because they rely solely on the raw text. The Semantic Questions approach addresses this by:

1. **Structured Extraction**: Asking specific questions forces the AI to extract and organize information systematically
2. **Context Enhancement**: Questions provide context about what information is important
3. **Consistency**: Using the same questions across all documents ensures comparable embeddings
4. **Comprehensiveness**: Multiple questions ensure all relevant aspects are captured
5. **Weight-Based Importance**: Different questions can be weighted based on their relevance

## Database Schema

The `semanticQuestions` table stores questions with the following structure:

```typescript
{
  question: string;              // The semantic question
  category: string;              // "job_posting", "resume", "opportunity", "lead", "general"
  subCategory?: string;          // More specific categorization
  description: string;           // What this question helps capture
  weight: number;                // Importance weight (1-10)
  isActive: boolean;             // Whether currently in use
  usageCount: number;            // How many times used
  effectiveness?: number;        // Effectiveness score (0-1)
  exampleAnswer?: string;        // Example of a good answer
  tags: string[];                // Tags for filtering
  createdBy?: string;            // Creator's user ID
  createdAt: number;             // Creation timestamp
  updatedAt: number;             // Last update timestamp
}
```

## Question Categories

### Job Posting Questions

**Technical Skills & Expertise**
- Core technical skills and technologies required
- Level of expertise needed in each domain
- Software development methodologies and practices

**Experience & Background**
- Years of relevant professional experience
- Specific industry domains or sectors
- Types of projects or initiatives

**Education & Certifications**
- Educational background and degrees
- Professional certifications required or preferred

**Responsibilities & Duties**
- Primary day-to-day responsibilities
- Leadership or mentorship responsibilities
- Strategic or architectural decisions

**Soft Skills & Competencies**
- Communication and collaboration skills
- Problem-solving and analytical capabilities

**Work Environment & Culture**
- Work arrangement (remote, hybrid, on-site)
- Team structure and reporting relationships
- Security clearance requirements

### Resume Questions

**Technical Expertise & Skills**
- Technical skills and technologies experienced with
- Depth of expertise in each technical area
- Development methodologies and best practices used

**Professional Experience**
- Total years of professional experience
- Industries or domains worked in
- Types of projects delivered
- Key achievements and quantifiable results

**Leadership & Collaboration**
- Leadership roles and responsibilities
- Mentoring and coaching experience
- Cross-functional team collaboration

**Education & Certifications**
- Degrees and educational credentials
- Professional certifications earned
- Ongoing learning and professional development

**Specialized Skills**
- Security clearances held
- Unique or specialized skills

### General Matching Questions

- Role levels and titles candidate is qualified for
- Key strengths and differentiators
- Potential gaps or areas for growth

## How to Use

### 1. Viewing Questions

Navigate to the Questions page in the application:
- Click "Questions" in the sidebar navigation
- View all semantic questions with their details
- Filter by category (Job Posting, Resume, General)
- Search questions by text, description, or tags
- Sort by weight, usage, effectiveness, or any field

### 2. Managing Questions

**Activating/Deactivating Questions**
- Click the status icon to toggle active/inactive
- Only active questions are used in embedding generation
- Deactivate questions that aren't providing value

**Viewing Details**
- Click the eye icon to see full question details
- View description, example answers, and stats
- Check usage count and effectiveness scores

**Deleting Questions**
- Click the trash icon to delete a question
- Confirm deletion in the popup
- Use with caution - this action cannot be undone

### 3. Seeding Initial Questions

To populate the database with the default set of semantic questions:

```bash
npx convex run seedSemanticQuestions:seed --no-push
```

This will insert 35+ carefully crafted questions covering:
- 15 job posting questions
- 15 resume questions  
- 5 general matching questions

### 4. Clearing All Questions (Testing Only)

To reset the questions table:

```bash
npx convex run seedSemanticQuestions:clearAll --no-push
```

⚠️ **Warning**: This deletes ALL semantic questions. Use only for testing.

## Question Design Principles

### Good Questions Are:

1. **Specific**: Target a particular aspect of the document
   - ✅ "What are the core technical skills and technologies required?"
   - ❌ "Tell me about the job"

2. **Extractive**: Can be answered from the document content
   - ✅ "What security clearance level is required?"
   - ❌ "Is this a good job?"

3. **Structured**: Produce consistent, comparable answers
   - ✅ "How many years of experience are required?"
   - ❌ "What's the vibe?"

4. **Comprehensive**: Cover all relevant aspects
   - Use multiple questions to capture different dimensions
   - Balance depth and breadth

5. **Weighted Appropriately**: More important aspects get higher weights
   - Technical skills: weight 9-10
   - Nice-to-have soft skills: weight 5-6

### Question Categories

- **Technical Skills**: Programming, tools, technologies, expertise levels
- **Experience**: Years, industries, project types, achievements
- **Education**: Degrees, certifications, ongoing learning
- **Responsibilities**: Day-to-day duties, leadership, decision-making
- **Soft Skills**: Communication, problem-solving, collaboration
- **Environment**: Location, team structure, clearances

## Integration with Embedding Generation

### Current Integration Status

The semantic questions are stored and managed in the database. To use them for embedding generation:

1. Query active questions for the appropriate category
2. For each document, use the questions to extract structured information
3. Combine question-answer pairs with original text
4. Generate embeddings from the enriched content
5. Track usage and effectiveness metrics

### Example Workflow

```typescript
// 1. Get active questions for job postings
const questions = await ctx.db
  .query("semanticQuestions")
  .withIndex("by_category", q => q.eq("category", "job_posting"))
  .filter(q => q.eq(q.field("isActive"), true))
  .collect();

// 2. Sort by weight (highest first)
questions.sort((a, b) => b.weight - a.weight);

// 3. For each job posting
for (const job of jobPostings) {
  // 4. Create enhanced text with Q&A pairs
  const qaText = questions.map(q => {
    const answer = extractAnswer(job, q.question);
    return `Q: ${q.question}\nA: ${answer}`;
  }).join('\n\n');
  
  // 5. Combine with original text
  const enrichedText = `${job.originalText}\n\n${qaText}`;
  
  // 6. Generate embedding
  const embedding = await generateEmbedding(enrichedText);
  
  // 7. Update usage count
  await ctx.db.patch(q._id, {
    usageCount: q.usageCount + 1
  });
}
```

## Effectiveness Tracking

The system tracks question effectiveness to help identify which questions produce better matching results:

### Metrics

- **Usage Count**: How often each question is used
- **Effectiveness Score**: 0-1 score based on search result quality
  - 0.7-1.0: High effectiveness (green)
  - 0.4-0.7: Medium effectiveness (yellow)
  - 0.0-0.4: Low effectiveness (red)

### Updating Effectiveness

When search results are evaluated:

```typescript
// After a successful match
await ctx.db.patch(questionId, {
  effectiveness: 0.85, // High quality match
  updatedAt: Date.now()
});
```

Questions with low effectiveness should be reviewed and potentially:
- Reworded for clarity
- Made more specific
- Combined with other questions
- Deactivated or removed

## Statistics Dashboard

The Questions page includes a statistics dashboard showing:

- **Total Questions**: Count of all questions in system
- **Active Questions**: Currently enabled questions
- **Total Usage**: Cumulative usage across all questions
- **Average Effectiveness**: Mean effectiveness score

Use these metrics to monitor system health and question quality.

## Best Practices

### For Administrators

1. **Start with the Seed**: Use the provided seed questions as a foundation
2. **Monitor Effectiveness**: Regularly review effectiveness scores
3. **Iterate**: Add, modify, or remove questions based on results
4. **Balance Coverage**: Ensure all important aspects are covered
5. **Weight Appropriately**: Assign higher weights to critical questions
6. **Keep Active**: Deactivate questions that aren't helping

### For Adding New Questions

1. Identify a gap in current question coverage
2. Write a specific, extractive question
3. Choose appropriate category and subcategory
4. Assign reasonable weight (5-10)
5. Add relevant tags for discoverability
6. Include example answer for clarity
7. Start with isActive=true
8. Monitor usage and effectiveness

### For Question Maintenance

- Review questions quarterly
- Update effectiveness scores after embedding regeneration
- Archive outdated questions (set isActive=false)
- Add new questions as job market evolves
- Reweight questions based on matching results

## Future Enhancements

Planned improvements to the semantic questions system:

1. **AI-Powered Question Generation**: Automatically suggest new questions based on documents
2. **A/B Testing**: Compare effectiveness of different question sets
3. **Dynamic Weighting**: Adjust weights based on search patterns
4. **Question Clustering**: Group related questions for better organization
5. **Answer Validation**: Ensure extracted answers meet quality standards
6. **Multi-Language Support**: Translate questions for international use
7. **Role-Specific Questions**: Tailor questions to specific job categories
8. **Effectiveness Auto-Calculation**: Automatically compute effectiveness from search logs

## Troubleshooting

### Questions Not Appearing

- Check that questions are marked as `isActive: true`
- Verify category matches your use case
- Ensure database has been seeded

### Low Effectiveness Scores

- Review question wording for clarity
- Check if question is too broad or too narrow
- Verify answers are being extracted correctly
- Consider combining with related questions

### High Usage but Low Effectiveness

- Question may be extracting wrong information
- Reword question for better specificity
- Check example answers for guidance
- May need to split into multiple questions

## API Reference

### Queries

- `semanticQuestions.list`: Get all questions
- `semanticQuestions.listActive`: Get only active questions
- `semanticQuestions.listByCategory`: Get questions for specific category
- `semanticQuestions.get`: Get single question by ID
- `semanticQuestions.getStats`: Get system statistics

### Mutations

- `semanticQuestions.insert`: Create new question
- `semanticQuestions.update`: Update existing question
- `semanticQuestions.remove`: Delete question
- `semanticQuestions.toggleActive`: Toggle active status
- `semanticQuestions.incrementUsage`: Increment usage count
- `semanticQuestions.updateEffectiveness`: Update effectiveness score
- `semanticQuestions.bulkInsert`: Insert multiple questions

### Internal Mutations

- `seedSemanticQuestions.seed`: Populate database with default questions
- `seedSemanticQuestions.clearAll`: Delete all questions (testing only)

## Related Documentation

- [Job Postings and Resumes Grids](./JOB_POSTINGS_AND_RESUMES_GRIDS.md)
- [Semantic Search Implementation](./SEMANTIC_SEARCH_IMPLEMENTATION.md)
- [Vector Embedding Migration Guide](./VECTOR_EMBEDDING_MIGRATION_GUIDE.md)
- [Enhanced Embedding Service](./EMBEDDING_REGENERATION_AGENT_README.md)

## Support

For questions or issues with the semantic questions system:

1. Check this documentation
2. Review existing questions in the system
3. Test with seed questions first
4. Monitor effectiveness metrics
5. Iterate based on results

---

**Last Updated**: 2025-01-09
**Version**: 1.0.0

