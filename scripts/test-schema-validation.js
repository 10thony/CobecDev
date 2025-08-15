#!/usr/bin/env node
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'http://localhost:8000';
const convex = new ConvexHttpClient(CONVEX_URL);

async function testSchemaValidation() {
  console.log('Testing schema validation with sample data...');
  
  try {
    // Test jobpostings schema
    console.log('\n1. Testing jobpostings schema...');
    const jobpostingData = {
      jobTitle: 'Software Engineer',
      location: 'Remote',
      salary: '$100k-$150k',
      openDate: '2025-01-01',
      closeDate: '2025-12-31',
      jobLink: 'https://example.com/job',
      jobType: 'Full-time',
      jobSummary: 'We are looking for a software engineer...',
      duties: 'Develop software applications...',
      requirements: '5+ years experience...',
      qualifications: 'Bachelor\'s degree...',
      education: ['Computer Science'],
      howToApply: 'Send resume to...',
      additionalInformation: 'Great benefits package...',
      department: 'Engineering',
      seriesGrade: 'GS-13',
      travelRequired: 'No',
      workSchedule: '40 hours/week',
      securityClearance: 'None required',
      experienceRequired: '5+ years',
      educationRequired: 'Bachelor\'s',
      applicationDeadline: '2025-12-31',
      contactInfo: 'hr@example.com',
      searchableText: 'Software engineer position...',
      extractedSkills: ['JavaScript', 'React', 'Node.js'],
      embedding: [0.1, 0.2, 0.3],
      metadata: {
        originalIndex: 0,
        importedAt: Date.now(),
        sourceFile: 'test.json',
        dataType: 'jobposting',
        embeddingModel: 'gemini-embedding-001',
        parsedAt: Date.now(),
        processedAt: { date: new Date().toISOString() },
        sourceCollection: 'jobpostings',
        migrationVersion: '1.0'
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const jobpostingResult = await convex.mutation(api.jobPostings.insert, jobpostingData);
    console.log('✅ Jobposting created successfully:', jobpostingResult);

    // Test resumes schema
    console.log('\n2. Testing resumes schema...');
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
        dataType: 'resume',
        embeddingModel: 'gemini-embedding-001',
        processedAt: { date: new Date().toISOString() },
        sourceCollection: 'resumes',
        migrationVersion: '1.0'
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const resumeResult = await convex.mutation(api.resumes.insert, resumeData);
    console.log('✅ Resume created successfully:', resumeResult);

    console.log('\n🎉 All schema validation tests passed!');
    console.log('Your schema now supports all the migration data fields.');

  } catch (error) {
    console.error('❌ Schema validation test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testSchemaValidation();
