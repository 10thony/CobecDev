import XLSX from 'xlsx';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// MongoDB credentials from environment variables
const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'workdemos';
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

let uri;
if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  uri = `mongodb://${MONGODB_USERNAME}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
} else {
  uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}

const client = new MongoClient(uri, {
  connectTimeoutMS: 10000,
  socketTimeoutMS: 10000,
  maxPoolSize: 1,
  minPoolSize: 0,
  maxIdleTimeMS: 30000,
  // No SSL/TLS needed for local MongoDB
  // No serverApi version needed for local MongoDB
});

// Function to read and parse Excel file
async function readExcelFile(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jobListings = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${jobListings.length} job listings in Excel file`);
    
    // Transform the data for MongoDB insertion
    const transformedJobs = jobListings.map((job, index) => {
      return {
        jobTitle: job['Job Title'] || 'N/A',
        location: job['Location'] || 'N/A',
        salary: job['Salary'] || 'N/A',
        openDate: job['Open Date'] || 'N/A',
        closeDate: job['Close Date'] || 'N/A',
        jobLink: job['Job Link'] || 'N/A',
        jobType: job['Job Type'] || 'N/A',
        jobSummary: job['Job Summary'] || 'N/A',
        duties: job['Duties'] || 'N/A',
        requirements: job['Requirements'] || 'N/A',
        qualifications: job['Qualifications'] || 'N/A',
        education: job['Education'] || 'N/A',
        howToApply: job['How To Apply'] || 'N/A',
        additionalInformation: job['Additional Information'] || 'N/A',
        department: job['Department'] || 'N/A',
        seriesGrade: job['Series/Grade'] || 'N/A',
        travelRequired: job['Travel Required'] || 'N/A',
        workSchedule: job['Work Schedule'] || 'N/A',
        securityClearance: job['Security Clearance'] || 'N/A',
        experienceRequired: job['Experience Required'] || 'N/A',
        educationRequired: job['Education Required'] || 'N/A',
        applicationDeadline: job['Application Deadline'] || 'N/A',
        contactInfo: job['Contact Info'] || 'N/A',
        _metadata: {
          originalIndex: index,
          importedAt: new Date(),
          sourceFile: filePath,
          dataType: 'job_posting'
        }
      };
    });
    
    return transformedJobs;
  } catch (error) {
    console.error('Error reading Excel file:', error.message);
    throw error;
  }
}

// Function to insert job data into MongoDB
async function insertJobData(collection, jobData, index) {
  try {
    const result = await collection.insertOne(jobData);
    console.log(`✓ Inserted job ${index + 1}: ${jobData.jobTitle} with ID: ${result.insertedId}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to insert job ${index + 1}: ${jobData.jobTitle}`, error.message);
    return false;
  }
}

// Function to get all job postings from the database
async function getAllJobPostings() {
  let client;
  
  try {
    console.log('Connecting to MongoDB to retrieve all job postings...');
    client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      // No SSL/TLS needed for local MongoDB
      // No serverApi version needed for local MongoDB
    });
    
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    // Use the same database but different collection
    const db = client.db('workdemos');
    const collection = db.collection('jobpostings');
    
    console.log('Retrieving all job postings...');
    const documents = await collection.find({}).toArray();
    
    console.log(`✓ Retrieved ${documents.length} job postings from database`);
    return documents;
    
  } catch (error) {
    console.error('Error retrieving job postings:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Function to search job postings by criteria
async function searchJobPostings(searchCriteria) {
  let client;
  
  try {
    console.log('Connecting to MongoDB to search job postings...');
    client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      // No SSL/TLS needed for local MongoDB
      // No serverApi version needed for local MongoDB
    });
    
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('workdemos');
    const collection = db.collection('jobpostings');
    
    // Build search query
    const query = {};
    
    if (searchCriteria.jobTitle) {
      query.jobTitle = { $regex: searchCriteria.jobTitle, $options: 'i' };
    }
    
    if (searchCriteria.location) {
      query.location = { $regex: searchCriteria.location, $options: 'i' };
    }
    
    if (searchCriteria.jobType) {
      query.jobType = { $regex: searchCriteria.jobType, $options: 'i' };
    }
    
    if (searchCriteria.department) {
      query.department = { $regex: searchCriteria.department, $options: 'i' };
    }
    
    console.log('Searching job postings with criteria:', searchCriteria);
    const documents = await collection.find(query).toArray();
    
    console.log(`✓ Found ${documents.length} matching job postings`);
    return documents;
    
  } catch (error) {
    console.error('Error searching job postings:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Example usage function
async function exampleUsage() {
  try {
    const allJobs = await getAllJobPostings();
    console.log('\n--- Retrieved Job Postings ---');
    console.log(`Total job postings: ${allJobs.length}`);
    
    // Display first few job postings as example
    allJobs.slice(0, 3).forEach((job, index) => {
      console.log(`\nJob Posting ${index + 1}:`);
      console.log(`  Title: ${job.jobTitle}`);
      console.log(`  Location: ${job.location}`);
      console.log(`  Salary: ${job.salary}`);
      console.log(`  Job Type: ${job.jobType}`);
      console.log(`  Department: ${job.department}`);
      console.log(`  Open Date: ${job.openDate}`);
      console.log(`  Close Date: ${job.closeDate}`);
      console.log(`  Imported: ${job._metadata?.importedAt || 'Unknown'}`);
    });
    
    // Example search
    console.log('\n--- Example Search ---');
    const searchResults = await searchJobPostings({ location: 'Washington' });
    console.log(`Found ${searchResults.length} jobs in Washington`);
    
    return allJobs;
  } catch (error) {
    console.error('Error in example usage:', error.message);
  }
}

// Main function to import Excel data to MongoDB
async function main() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      // No SSL/TLS needed for local MongoDB
      // No serverApi version needed for local MongoDB
    });
    
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    // Use the same database but create a new collection for job postings
    const db = client.db('workdemos');
    const collection = db.collection('jobpostings');
    
    // Check if collection already has data
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log(`Collection 'jobpostings' already contains ${existingCount} documents`);
      console.log('Do you want to clear the collection and re-import? (y/n)');
      // For now, we'll proceed with import (you can modify this behavior)
    }
    
    console.log('Reading Excel file...');
    const excelFilePath = 'usajobs_data_formatted.xlsx';
    const jobListings = await readExcelFile(excelFilePath);
    
    if (jobListings.length === 0) {
      console.log('No job listings found in Excel file');
      return;
    }
    
    console.log(`Processing ${jobListings.length} job listings...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < jobListings.length; i++) {
      const jobData = jobListings[i];
      const success = await insertJobData(collection, jobData, i);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Add a small delay to avoid overwhelming the database
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n--- Import Summary ---');
    console.log(`Total job listings processed: ${jobListings.length}`);
    console.log(`Successfully inserted: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    // Display some statistics
    const totalInCollection = await collection.countDocuments();
    console.log(`Total documents in 'jobpostings' collection: ${totalInCollection}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Export functions for potential reuse
export {
  readExcelFile,
  insertJobData,
  getAllJobPostings,
  searchJobPostings,
  exampleUsage
};

// Run the script if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] === new URL(import.meta.url).pathname ||
                     process.argv[1].endsWith('mongodb_jobpostings.js');

if (isMainModule) {
  console.log('Starting MongoDB job postings import...');
  main().catch(console.error);
} 