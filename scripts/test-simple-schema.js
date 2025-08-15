#!/usr/bin/env node
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'http://localhost:8000';
const convex = new ConvexHttpClient(CONVEX_URL);

async function testSimpleSchema() {
  console.log('Testing simplified schema validation...');
  
  try {
    // Test resumes schema with minimal metadata
    console.log('\n1. Testing resumes schema...');
    const resumeData = {
      filename: 'test-resume.docx',
      originalText: 'This is a test resume...',
      personalInfo: {
        firstName: 'John',
        middleName: 'A',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        yearsOfExperience: 5
      },
      professionalSummary: 'Experienced software engineer...',
      education: ['Bachelor\'s in Computer Science'],
      experience: [{
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco',
        duration: '2020-2025',
        responsibilities: ['Developed web applications', 'Led team projects']
      }],
      skills: ['JavaScript', 'React', 'Node.js'],
      certifications: 'AWS Certified Developer',
      professionalMemberships: 'ACM',
      securityClearance: 'None',
      searchableText: 'Experienced software engineer...',
      extractedSkills: ['JavaScript', 'React', 'Node.js'],
      embedding: [0.1, 0.2, 0.3],
      metadata: {
        filePath: '/path/to/resume.docx',
        fileName: 'test-resume.docx',
        importedAt: Date.now(),
        parsedAt: Date.now(),
        embeddingModel: 'gemini-embedding-001',
        processedAt: { date: new Date().toISOString() }
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const resumeResult = await convex.mutation(api.resumes.insert, resumeData);
    console.log('✅ Resume created successfully:', resumeResult);

    console.log('\n🎉 Schema validation test passed!');
    console.log('Your simplified schema is working correctly.');

  } catch (error) {
    console.error('❌ Schema validation test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testSimpleSchema();
