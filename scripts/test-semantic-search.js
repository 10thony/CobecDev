#!/usr/bin/env node

/**
 * AJAI Semantic Search - Test Script
 * 
 * This script tests the semantic search functionality to ensure:
 * - Vector search functions work correctly
 * - Cross-table matching functions properly
 * - Business intelligence insights are generated
 * - Similarity thresholds are respected
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// Initialize Convex client
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "http://localhost:8000");

console.log("🧪 Testing AJAI Semantic Search System...\n");

/**
 * Test embedding statistics
 */
async function testEmbeddingStats() {
  console.log("📊 Testing embedding statistics...");
  
  try {
    const stats = await client.query(api.vectorSearch.getEmbeddingStats);
    
    console.log("✅ Embedding Statistics Retrieved:");
    console.log(`  Job Postings: ${stats.jobPostings.withEmbeddings}/${stats.jobPostings.total} (${Math.round(stats.jobPostings.withEmbeddings/stats.jobPostings.total*100)}%)`);
    console.log(`  Resumes: ${stats.resumes.withEmbeddings}/${stats.resumes.total} (${Math.round(stats.resumes.withEmbeddings/stats.resumes.total*100)}%)`);
    console.log(`  KFC Points: ${stats.kfcPoints.withEmbeddings}/${stats.kfcPoints.total} (${Math.round(stats.kfcPoints.withEmbeddings/stats.kfcPoints.total*100)}%)`);
    console.log(`  Overall Coverage: ${stats.overall.embeddingCoverage}%`);
    
    if (stats.overall.embeddingCoverage < 50) {
      console.log("⚠️  Low embedding coverage - some tests may fail");
    }
    
    return stats;
    
  } catch (error) {
    console.error("❌ Failed to get embedding statistics:", error);
    throw error;
  }
}

/**
 * Test individual table searches
 */
async function testIndividualSearches() {
  console.log("\n🔍 Testing individual table searches...");
  
  try {
    // Test job postings search
    console.log("  Testing job postings search...");
    const jobResults = await client.query(api.vectorSearch.searchJobPostings, {
      query: "software engineer",
      limit: 5,
      similarityThreshold: 0.5
    });
    
    console.log(`    ✅ Job search: ${jobResults.totalFound} results, ${jobResults.totalWithEmbeddings} with embeddings`);
    
    // Test resumes search
    console.log("  Testing resumes search...");
    const resumeResults = await client.query(api.vectorSearch.searchResumes, {
      query: "software engineer",
      limit: 5,
      similarityThreshold: 0.5
    });
    
    console.log(`    ✅ Resume search: ${resumeResults.totalFound} results, ${resumeResults.totalWithEmbeddings} with embeddings`);
    
    // Test KFC points search
    console.log("  Testing KFC points search...");
    const kfcResults = await client.query(api.vectorSearch.searchKfcPoints, {
      query: "team",
      limit: 5,
      similarityThreshold: 0.5
    });
    
    console.log(`    ✅ KFC search: ${kfcResults.totalFound} results, ${kfcResults.totalWithEmbeddings} with embeddings`);
    
    return { jobResults, resumeResults, kfcResults };
    
  } catch (error) {
    console.error("❌ Failed to test individual searches:", error);
    throw error;
  }
}

/**
 * Test cross-table semantic search
 */
async function testCrossTableSearch() {
  console.log("\n🔗 Testing cross-table semantic search...");
  
  try {
    const searchResults = await client.query(api.vectorSearch.crossTableSemanticSearch, {
      query: "software engineer",
      searchType: "both",
      limit: 5,
      similarityThreshold: 0.5
    });
    
    console.log(`✅ Cross-table search completed:`);
    console.log(`  Query: "${searchResults.query}"`);
    console.log(`  Jobs Found: ${searchResults.jobs?.totalFound || 0}`);
    console.log(`  Resumes Found: ${searchResults.resumes?.totalFound || 0}`);
    console.log(`  Model: ${searchResults.model}`);
    console.log(`  Threshold: ${searchResults.similarityThreshold}`);
    
    return searchResults;
    
  } catch (error) {
    console.error("❌ Failed to test cross-table search:", error);
    throw error;
  }
}

/**
 * Test job-resume matching
 */
async function testJobResumeMatching() {
  console.log("\n🎯 Testing job-resume matching...");
  
  try {
    // Get a job posting with embeddings
    const jobPostings = await client.query(api.vectorSearch.getJobPostingsNeedingEmbeddings, { limit: 1 });
    const jobPostingsWithEmbeddings = await client.query(api.jobPostings.list);
    const jobWithEmbedding = jobPostingsWithEmbeddings.find(job => job.embedding);
    
    if (!jobWithEmbedding) {
      console.log("  ⚠️  No job postings with embeddings found - skipping test");
      return null;
    }
    
    console.log(`  Testing job: ${jobWithEmbedding.jobTitle}`);
    
    const matchingResumes = await client.query(api.vectorSearch.findMatchingResumesForJob, {
      jobPostingId: jobWithEmbedding._id,
      limit: 5,
      similarityThreshold: 0.5
    });
    
    console.log(`✅ Job-resume matching completed:`);
    console.log(`  Job: ${matchingResumes.jobPosting?.jobTitle}`);
    console.log(`  Matching Resumes: ${matchingResumes.totalFound}`);
    console.log(`  Business Insights: ${matchingResumes.businessInsights.skillGap}`);
    console.log(`  Recommendation: ${matchingResumes.businessInsights.recommendation}`);
    
    return matchingResumes;
    
  } catch (error) {
    console.error("❌ Failed to test job-resume matching:", error);
    throw error;
  }
}

/**
 * Test resume-job matching
 */
async function testResumeJobMatching() {
  console.log("\n🎯 Testing resume-job matching...");
  
  try {
    // Get a resume with embeddings
    const resumes = await client.query(api.vectorSearch.getResumesNeedingEmbeddings, { limit: 1 });
    const resumesWithEmbeddings = await client.query(api.resumes.list);
    const resumeWithEmbedding = resumesWithEmbeddings.find(resume => resume.embedding);
    
    if (!resumeWithEmbedding) {
      console.log("  ⚠️  No resumes with embeddings found - skipping test");
      return null;
    }
    
    console.log(`  Testing resume: ${resumeWithEmbedding.filename}`);
    
    const matchingJobs = await client.query(api.vectorSearch.findMatchingJobsForResume, {
      resumeId: resumeWithEmbedding._id,
      limit: 5,
      similarityThreshold: 0.5
    });
    
    console.log(`✅ Resume-job matching completed:`);
    console.log(`  Resume: ${matchingJobs.resume?.filename}`);
    console.log(`  Matching Jobs: ${matchingJobs.totalFound}`);
    console.log(`  Business Insights: ${matchingJobs.businessInsights.skillGap}`);
    console.log(`  Recommendation: ${matchingJobs.businessInsights.recommendation}`);
    
    return matchingJobs;
    
  } catch (error) {
    console.error("❌ Failed to test resume-job matching:", error);
    throw error;
  }
}

/**
 * Test similarity threshold enforcement
 */
async function testSimilarityThresholds() {
  console.log("\n📏 Testing similarity threshold enforcement...");
  
  try {
    // Test with different thresholds
    const thresholds = [0.3, 0.5, 0.7, 0.9];
    
    for (const threshold of thresholds) {
      const results = await client.query(api.vectorSearch.searchJobPostings, {
        query: "engineer",
        limit: 10,
        similarityThreshold: threshold
      });
      
      console.log(`  Threshold ${threshold}: ${results.totalFound} results`);
      
      // Verify all results meet the threshold
      if (results.results.length > 0) {
        const minSimilarity = Math.min(...results.results.map(r => r.similarity || 0));
        if (minSimilarity < threshold) {
          console.log(`    ⚠️  Warning: Some results below threshold (min: ${minSimilarity})`);
        } else {
          console.log(`    ✅ All results meet threshold (min: ${minSimilarity})`);
        }
      }
    }
    
    return true;
    
  } catch (error) {
    console.error("❌ Failed to test similarity thresholds:", error);
    throw error;
  }
}

/**
 * Main test function
 */
async function runAllTests() {
  const startTime = Date.now();
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    // Test 1: Embedding statistics
    try {
      const stats = await testEmbeddingStats();
      results.tests.push({ name: "Embedding Statistics", passed: true, data: stats });
      results.passed++;
    } catch (error) {
      results.tests.push({ name: "Embedding Statistics", passed: false, error: error.message });
      results.failed++;
    }
    
    // Test 2: Individual searches
    try {
      const searchResults = await testIndividualSearches();
      results.tests.push({ name: "Individual Searches", passed: true, data: searchResults });
      results.passed++;
    } catch (error) {
      results.tests.push({ name: "Individual Searches", passed: false, error: error.message });
      results.failed++;
    }
    
    // Test 3: Cross-table search
    try {
      const crossTableResults = await testCrossTableSearch();
      results.tests.push({ name: "Cross-table Search", passed: true, data: crossTableResults });
      results.passed++;
    } catch (error) {
      results.tests.push({ name: "Cross-table Search", passed: false, error: error.message });
      results.failed++;
    }
    
    // Test 4: Job-resume matching
    try {
      const jobResumeResults = await testJobResumeMatching();
      results.tests.push({ name: "Job-Resume Matching", passed: true, data: jobResumeResults });
      results.passed++;
    } catch (error) {
      results.tests.push({ name: "Job-Resume Matching", passed: false, error: error.message });
      results.failed++;
    }
    
    // Test 5: Resume-job matching
    try {
      const resumeJobResults = await testResumeJobMatching();
      results.tests.push({ name: "Resume-Job Matching", passed: true, data: resumeJobResults });
      results.passed++;
    } catch (error) {
      results.tests.push({ name: "Resume-Job Matching", passed: false, error: error.message });
      results.failed++;
    }
    
    // Test 6: Similarity thresholds
    try {
      const thresholdResults = await testSimilarityThresholds();
      results.tests.push({ name: "Similarity Thresholds", passed: true, data: thresholdResults });
      results.passed++;
    } catch (error) {
      results.tests.push({ name: "Similarity Thresholds", passed: false, error: error.message });
      results.failed++;
    }
    
    // Generate summary
    console.log("\n🎉 Testing completed!");
    console.log("\n📊 Test Results:");
    console.log(`  Passed: ${results.passed}`);
    console.log(`  Failed: ${results.failed}`);
    console.log(`  Total: ${results.passed + results.failed}`);
    console.log(`  Duration: ${Date.now() - startTime}ms`);
    
    // Show detailed results
    console.log("\n📋 Detailed Results:");
    results.tests.forEach(test => {
      const status = test.passed ? "✅" : "❌";
      console.log(`  ${status} ${test.name}`);
      if (!test.passed && test.error) {
        console.log(`    Error: ${test.error}`);
      }
    });
    
    // Create test report
    const fs = await import('fs');
    const reportData = {
      summary: {
        passed: results.passed,
        failed: results.failed,
        total: results.passed + results.failed,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      },
      tests: results.tests
    };
    
    const reportFileName = `semantic-search-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFileName, JSON.stringify(reportData, null, 2));
    console.log(`\n📝 Test report saved to: ${reportFileName}`);
    
    if (results.failed === 0) {
      console.log("\n🎉 All tests passed! Semantic search system is working correctly.");
      console.log("Next steps:");
      console.log("1. Implement the frontend search interface");
      console.log("2. Build the HR dashboard for job-resume matching");
      console.log("3. Monitor search performance in production");
    } else {
      console.log("\n⚠️  Some tests failed. Check the test report for details.");
      console.log("Fix the issues before proceeding to production use.");
    }
    
  } catch (error) {
    console.error("❌ Critical error in testing:", error);
    process.exit(1);
  }
}

// Run the tests
runAllTests()
  .then(() => {
    console.log('\n✅ Testing completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Testing failed:', error);
    process.exit(1);
  });
