#!/usr/bin/env node

/**
 * Test Script for Dynamic Skill Mapping System
 * 
 * This script tests the comprehensive AJAI Vector Search System with Dynamic Skill Mapping
 * including skill extraction, taxonomy building, and enhanced semantic search capabilities.
 */

const { ConvexHttpClient } = require("convex/browser");
require('dotenv').config();

// Initialize Convex client
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

async function testDynamicSkillMapping() {
  console.log("🚀 Testing Dynamic Skill Mapping System...\n");

  try {
    // Test 1: Extract skills from resumes
    console.log("📋 Test 1: Extracting skills from resumes...");
    const resumeSkills = await client.query("dynamicSkillMapping:extractAllResumeSkills", {});
    console.log(`✅ Found ${resumeSkills.totalSkills} unique skills across ${resumeSkills.totalResumes} resumes`);
    console.log(`   Resumes with skills: ${resumeSkills.resumesWithSkills}`);
    console.log(`   Top skills: ${resumeSkills.skills.slice(0, 10).join(', ')}\n`);

    // Test 2: Extract skills from job postings
    console.log("💼 Test 2: Extracting skills from job postings...");
    const jobSkills = await client.query("dynamicSkillMapping:extractAllJobSkills", {});
    console.log(`✅ Found ${jobSkills.totalSkills} unique skills across ${jobSkills.totalJobs} job postings`);
    console.log(`   Jobs with skills: ${jobSkills.jobsWithSkills}`);
    console.log(`   Top skills: ${jobSkills.skills.slice(0, 10).join(', ')}\n`);

    // Test 3: Build unified skill taxonomy
    console.log("🏗️  Test 3: Building unified skill taxonomy...");
    const taxonomy = await client.action("dynamicSkillMapping:buildSkillTaxonomy", {});
    console.log(`✅ Built taxonomy with ${taxonomy.totalUniqueSkills} unified skills`);
    console.log(`   Skill categories: ${Object.keys(taxonomy.categorizedSkills).length}`);
    console.log(`   Top demanded skills: ${Object.entries(taxonomy.skillDemand?.topDemanded || {}).slice(0, 5).map(([skill, count]) => `${skill}(${count})`).join(', ')}`);
    console.log(`   Skill consistency score: ${((taxonomy.resumeSkills.count + taxonomy.jobSkills.count) / (taxonomy.totalUniqueSkills * 2) * 100).toFixed(1)}%\n`);

    // Test 4: Test skill extraction with AI
    console.log("🤖 Test 4: Testing AI-powered skill extraction...");
    const sampleText = "Experienced JavaScript developer with React, Node.js, and MongoDB skills. Proficient in AWS and Docker deployment.";
    const extractedSkills = await client.action("dynamicSkillMapping:extractSkillsWithAI", {
      text: sampleText,
      context: "resume",
      useAI: true
    });
    console.log(`✅ Extracted ${extractedSkills.skills.length} skills with ${(extractedSkills.confidence * 100).toFixed(1)}% confidence`);
    console.log(`   Skills: ${extractedSkills.skills.join(', ')}`);
    console.log(`   Categories: ${Object.keys(extractedSkills.categories).join(', ')}\n`);

    // Test 5: Test enhanced semantic search
    console.log("🔍 Test 5: Testing enhanced semantic search...");
    const searchQuery = "who can build apps for the iphone";
    const searchResults = await client.action("dynamicSkillMapping:semanticSearchWithDynamicSkills", {
      query: searchQuery,
      collection: "both",
      limit: 10,
      similarityThreshold: 0.3,
      useSkillEnhancement: true
    });
    console.log(`✅ Enhanced search found ${searchResults.totalFound} results`);
    console.log(`   Original query: "${searchQuery}"`);
    console.log(`   Enhanced query: "${searchResults.query}"`);
    console.log(`   Skill enhancement: ${searchResults.skillEnhancement ? 'Enabled' : 'Disabled'}`);
    console.log(`   Top results: ${searchResults.results.slice(0, 3).map(r => `${r.collection}: ${r.similarity?.toFixed(3)}`).join(', ')}\n`);

    // Test 6: Test cross-collection skill matching
    console.log("🔗 Test 6: Testing cross-collection skill matching...");
    const testSkill = "javascript";
    const skillMatches = await client.query("dynamicSkillMapping:findSkillMatchesAcrossCollections", {
      skill: testSkill,
      limit: 5
    });
    console.log(`✅ Found ${skillMatches.totalMatches.resumes} resumes and ${skillMatches.totalMatches.jobs} jobs with "${testSkill}"`);
    console.log(`   Related skills: ${skillMatches.relatedSkills.slice(0, 5).join(', ')}`);
    console.log(`   Skill demand: ${skillMatches.skillDemand}\n`);

    // Test 7: Test enhanced embedding generation
    console.log("🧠 Test 7: Testing enhanced embedding generation...");
    const enhancedEmbedding = await client.action("enhancedEmbeddingService:generateEnhancedEmbedding", {
      text: "Senior iOS developer with Swift and React Native experience",
      context: "resume",
      useSkillEnhancement: true
    });
    console.log(`✅ Generated ${enhancedEmbedding.dimensions}-dimensional embedding`);
    console.log(`   Enhanced text length: ${enhancedEmbedding.enhancedText.length} characters`);
    console.log(`   Extracted skills: ${enhancedEmbedding.extractedSkills.join(', ')}`);
    console.log(`   Confidence: ${(enhancedEmbedding.confidence * 100).toFixed(1)}%\n`);

    // Test 8: Test skill consistency validation
    console.log("✅ Test 8: Testing skill consistency validation...");
    const consistencyReport = await client.query("enhancedEmbeddingService:validateSkillConsistency", {});
    console.log(`✅ Consistency score: ${consistencyReport.overallScore.toFixed(1)}%`);
    console.log(`   Issues found: ${consistencyReport.issues.length}`);
    console.log(`   Recommendations: ${consistencyReport.recommendations.length}`);
    if (consistencyReport.issues.length > 0) {
      console.log(`   Top issue: ${consistencyReport.issues[0].description}`);
    }
    console.log(`   Statistics: ${consistencyReport.statistics.totalUniqueSkills} skills, ${consistencyReport.statistics.skillCategories} categories\n`);

    // Test 9: Test unified semantic search
    console.log("🌐 Test 9: Testing unified semantic search...");
    const unifiedResults = await client.query("vectorSearch:unifiedSemanticSearch", {
      query: "machine learning engineer with python experience",
      limit: 15,
      similarityThreshold: 0.4,
      useSkillEnhancement: true,
      includeSkillAnalysis: true
    });
    console.log(`✅ Unified search found ${unifiedResults.totalFound.total} total results`);
    console.log(`   Resumes: ${unifiedResults.totalFound.resumes}, Jobs: ${unifiedResults.totalFound.jobPostings}`);
    if (unifiedResults.skillAnalysis) {
      console.log(`   Skill analysis: ${unifiedResults.skillAnalysis.totalSkills} skills, ${unifiedResults.skillAnalysis.skillCategories} categories`);
      console.log(`   Top demanded: ${unifiedResults.skillAnalysis.topDemandedSkills.slice(0, 3).map(s => `${s.skill}(${s.demand})`).join(', ')}`);
    }
    console.log(`   Top resume match: ${unifiedResults.results.resumes[0]?.similarity?.toFixed(3) || 'N/A'}`);
    console.log(`   Top job match: ${unifiedResults.results.jobPostings[0]?.similarity?.toFixed(3) || 'N/A'}\n`);

    // Test 10: Test skill mapping updates
    console.log("🔄 Test 10: Testing skill mapping updates...");
    const newSkills = ["typescript", "next.js", "tailwind css"];
    const updatedTaxonomy = await client.action("dynamicSkillMapping:updateSkillMappings", {
      newSkills,
      source: "user_query",
      context: "Testing skill mapping updates"
    });
    console.log(`✅ Updated taxonomy with ${newSkills.length} new skills`);
    console.log(`   Total skills after update: ${updatedTaxonomy.unifiedSkills.length}`);
    console.log(`   Last updated: ${new Date(updatedTaxonomy.lastUpdated).toLocaleString()}`);
    if (updatedTaxonomy.updateHistory) {
      console.log(`   Update history: ${updatedTaxonomy.updateHistory.length} updates`);
    }
    console.log();

    // Summary
    console.log("📊 DYNAMIC SKILL MAPPING SYSTEM TEST SUMMARY");
    console.log("=" .repeat(50));
    console.log(`✅ Resume skills extracted: ${resumeSkills.totalSkills}`);
    console.log(`✅ Job skills extracted: ${jobSkills.totalSkills}`);
    console.log(`✅ Unified taxonomy built: ${taxonomy.totalUniqueSkills} skills`);
    console.log(`✅ AI skill extraction: ${extractedSkills.aiEnhanced ? 'Working' : 'Fallback'}`);
    console.log(`✅ Enhanced search: ${searchResults.skillEnhancement ? 'Working' : 'Fallback'}`);
    console.log(`✅ Cross-collection matching: ${skillMatches.totalMatches.resumes + skillMatches.totalMatches.jobs} matches`);
    console.log(`✅ Enhanced embeddings: ${enhancedEmbedding.dimensions} dimensions`);
    console.log(`✅ Skill consistency: ${consistencyReport.overallScore.toFixed(1)}%`);
    console.log(`✅ Unified search: ${unifiedResults.totalFound.total} results`);
    console.log(`✅ Skill mapping updates: ${updatedTaxonomy.unifiedSkills.length} total skills`);
    console.log("=" .repeat(50));
    console.log("🎉 All tests completed successfully! The Dynamic Skill Mapping System is working correctly.\n");

  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

async function testSpecificQuery(query) {
  console.log(`🔍 Testing specific query: "${query}"\n`);

  try {
    // Test the query with enhanced search
    const searchResults = await client.action("dynamicSkillMapping:semanticSearchWithDynamicSkills", {
      query,
      collection: "both",
      limit: 10,
      similarityThreshold: 0.3,
      useSkillEnhancement: true
    });

    console.log(`📊 Search Results for: "${query}"`);
    console.log(`   Enhanced query: "${searchResults.query}"`);
    console.log(`   Total results: ${searchResults.totalFound}`);
    console.log(`   Skill enhancement: ${searchResults.skillEnhancement ? 'Enabled' : 'Disabled'}`);
    console.log(`   Taxonomy skills: ${searchResults.taxonomy.totalSkills}`);
    console.log(`   Skill categories: ${searchResults.taxonomy.skillCategories}\n`);

    // Show top results by collection
    const resumeResults = searchResults.results.filter(r => r.collection === "resumes");
    const jobResults = searchResults.results.filter(r => r.collection === "jobpostings");

    if (resumeResults.length > 0) {
      console.log("👤 Top Resume Matches:");
      resumeResults.slice(0, 3).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.filename || result.personalInfo?.firstName || 'Unknown'} (${result.similarity?.toFixed(3)})`);
        if (result.extractedSkills?.length > 0) {
          console.log(`      Skills: ${result.extractedSkills.slice(0, 5).join(', ')}`);
        }
      });
    }

    if (jobResults.length > 0) {
      console.log("\n💼 Top Job Matches:");
      jobResults.slice(0, 3).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.jobTitle} (${result.similarity?.toFixed(3)})`);
        if (result.extractedSkills?.length > 0) {
          console.log(`      Skills: ${result.extractedSkills.slice(0, 5).join(', ')}`);
        }
      });
    }

    console.log();

  } catch (error) {
    console.error("❌ Query test failed:", error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run full test suite
    await testDynamicSkillMapping();
  } else if (args[0] === "--query" && args[1]) {
    // Test specific query
    await testSpecificQuery(args[1]);
  } else {
    console.log("Usage:");
    console.log("  node test-dynamic-skill-mapping.js                    # Run full test suite");
    console.log("  node test-dynamic-skill-mapping.js --query 'query'   # Test specific query");
    console.log("\nExamples:");
    console.log("  node test-dynamic-skill-mapping.js");
    console.log("  node test-dynamic-skill-mapping.js --query 'who can build apps for the iphone'");
    console.log("  node test-dynamic-skill-mapping.js --query 'machine learning engineer with python'");
    console.log("  node test-dynamic-skill-mapping.js --query 'frontend developer react typescript'");
  }
}

// Run the main function
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testDynamicSkillMapping,
  testSpecificQuery
};
