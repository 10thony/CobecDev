// Test script for resume update functionality
// This script tests the updateResumeWithDocument action

const { ConvexHttpClient } = require("convex/browser");
const fs = require("fs");
const path = require("path");

// Initialize Convex client
const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://your-deployment.convex.cloud");

async function testResumeUpdate() {
  try {
    console.log("Testing resume update functionality...");
    
    // First, let's get a list of resumes to test with
    console.log("Fetching existing resumes...");
    const resumes = await client.action("api:vectorSearch:getAllResumes");
    console.log(`Found ${resumes.length} resumes`);
    
    if (resumes.length === 0) {
      console.log("No resumes found. Please import some resumes first.");
      return;
    }
    
    // Use the first resume for testing
    const testResume = resumes[0];
    console.log(`Testing with resume: ${testResume.processedMetadata?.name || testResume.filename}`);
    
    // Check if we have a test document
    const testDocPath = path.join(__dirname, "test_resume.docx");
    if (!fs.existsSync(testDocPath)) {
      console.log("No test document found. Please create a test_resume.docx file.");
      console.log("You can create a simple .docx file with some resume content for testing.");
      return;
    }
    
    // Read and encode the test document
    const fileBuffer = fs.readFileSync(testDocPath);
    const base64Data = fileBuffer.toString("base64");
    
    console.log("Updating resume with test document...");
    
    // Call the update action
    const result = await client.action("api:vectorSearch:updateResumeWithDocument", {
      resumeId: testResume._id,
      fileName: "test_resume.docx",
      fileData: base64Data
    });
    
    if (result.success) {
      console.log("✅ Resume update successful!");
      console.log("Message:", result.message);
      console.log("Updated resume ID:", result.updatedResume._id);
      console.log("New filename:", result.updatedResume.filename);
      console.log("Has embedding:", !!result.updatedResume.embedding);
      console.log("Searchable text length:", result.updatedResume.searchableText?.length || 0);
    } else {
      console.log("❌ Resume update failed!");
      console.log("Error:", result.message);
    }
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testResumeUpdate(); 