import { query } from "./_generated/server";

/**
 * Get statistics about semantic embedding coverage
 * This is a separate file without "use node" so it can be a true query
 */
export const getSemanticEmbeddingStats = query({
  args: {},
  handler: async (ctx): Promise<any> => {
    try {
      // Get job postings stats
      const jobPostings = await ctx.db.query("jobpostings").take(100);
      const jobsWithEmbeddings = jobPostings.filter((j: any) => 
        j.embedding && j.embedding.length > 0
      );
      const recentJobEmbeddings = jobsWithEmbeddings.filter((j: any) => {
        const daysSince = (Date.now() - (j.embeddingGeneratedAt || 0)) / (1000 * 60 * 60 * 24);
        return daysSince < 7;
      });

      // Get resumes stats
      const resumes = await ctx.db.query("resumes").take(100);
      const resumesWithEmbeddings = resumes.filter((r: any) => 
        r.embedding && r.embedding.length > 0
      );
      const recentResumeEmbeddings = resumesWithEmbeddings.filter((r: any) => {
        const daysSince = (Date.now() - (r.embeddingGeneratedAt || 0)) / (1000 * 60 * 60 * 24);
        return daysSince < 7;
      });

      // Get semantic questions stats
      const allQuestions = await ctx.db.query("semanticQuestions").collect();
      const activeQuestions = allQuestions.filter(q => q.isActive);
      const totalUsage = allQuestions.reduce((sum, q) => sum + q.usageCount, 0);
      const questionsWithEffectiveness = allQuestions.filter(q => q.effectiveness !== undefined);
      const averageEffectiveness = questionsWithEffectiveness.length > 0
        ? questionsWithEffectiveness.reduce((sum, q) => sum + (q.effectiveness || 0), 0) / questionsWithEffectiveness.length
        : 0;

      return {
        jobPostings: {
          total: jobPostings.length,
          withEmbeddings: jobsWithEmbeddings.length,
          withRecentEmbeddings: recentJobEmbeddings.length,
          coverage: ((jobsWithEmbeddings.length / jobPostings.length) * 100).toFixed(2) + "%"
        },
        resumes: {
          total: resumes.length,
          withEmbeddings: resumesWithEmbeddings.length,
          withRecentEmbeddings: recentResumeEmbeddings.length,
          coverage: ((resumesWithEmbeddings.length / resumes.length) * 100).toFixed(2) + "%"
        },
        semanticQuestions: {
          total: allQuestions.length,
          active: activeQuestions.length,
          totalUsage: totalUsage,
          averageEffectiveness: (averageEffectiveness * 100).toFixed(2) + "%"
        },
        overall: {
          totalDocuments: jobPostings.length + resumes.length,
          totalWithEmbeddings: jobsWithEmbeddings.length + resumesWithEmbeddings.length,
          overallCoverage: (((jobsWithEmbeddings.length + resumesWithEmbeddings.length) / 
                            (jobPostings.length + resumes.length)) * 100).toFixed(2) + "%"
        }
      };
    } catch (error) {
      console.error("Error getting semantic embedding stats:", error);
      throw error;
    }
  },
});

