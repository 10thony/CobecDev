# VECTOR SEARCH IDEATION & REQUIREMENTS TRACKING

## 1. User Requirements (from discussion & diagram)
- User submits a vector search query (e.g., "who are the best people suited to work with lots of data").
- System returns:
  - Job postings relevant to the query.
  - Resumes relevant to the query.
  - Job postings and resumes are also cross-matched: only show jobs that have relevant resumes, and resumes that have relevant jobs.
  - Results are ordered by relevance.
  - If multiple resumes fit a job (or vice versa), highlight them with a unique color (up to 10, hardcoded is fine).
  - Max 10 jobs and 10 resumes in the response.

## 2. Open Questions / Decisions
- **Embedding strategy:** Should we generate embeddings dynamically for every query, or precompute and store them for jobs/resumes?
- **Strictness:** We will use strict cross-matching (only show jobs with matching resumes and vice versa).
- **UI/UX:** Display jobs and resumes in order of relevance, highlight cross-matches with unique colors.

## 3. Embedding Strategy Recommendations
- **Jobs/Resumes:**
  - Precompute and store embeddings for all job postings and resumes (as is currently done in mongoSearch.ts).
  - For each user query, generate a dynamic embedding.
- **Query:**
  - Always generate a dynamic embedding for the user's query at search time.
- **Why:**
  - Precomputing for static data (jobs/resumes) is efficient and avoids repeated API calls.
  - Dynamic query embedding ensures semantic search is always up-to-date with the user's intent.

## 4. High-Level Solution Outline
1. **Generate embedding for user query.**
2. **Vector search jobs and resumes separately** using the query embedding (top 10 each).
3. **Cross-match:**
   - For each job, find resumes (from the top 10) that are highly relevant to that job (using cosine similarity between job and resume embeddings).
   - For each resume, find jobs (from the top 10) that are highly relevant to that resume.
   - Only keep jobs and resumes that have at least one cross-match.
4. **Assign unique colors** to each cross-matched group (up to 10).
5. **Return results**: jobs and resumes, ordered by relevance, with color highlights for cross-matches.

## 5. UI/UX Notes
- Display jobs and resumes in two lists or a combined list, ordered by relevance.
- Use up to 10 unique colors to highlight cross-matched groups (e.g., all resumes matching a job get the same color as that job).
- Show the number of matches for each job/resume.
- Optionally, allow clicking a job to see its matching resumes (and vice versa).

---

**Next Steps:**
- Implement the backend logic for strict cross-matching vector search.
- Update the frontend to display results as described above. 