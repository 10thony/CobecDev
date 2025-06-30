const { getAllJobPostings, searchJobPostings } = require('./mongodb_jobpostings');

async function testJobPostings() {
  try {
    console.log('=== Testing Job Postings Database ===\n');
    
    // Test 1: Get all job postings
    console.log('1. Retrieving all job postings...');
    const allJobs = await getAllJobPostings();
    console.log(`✓ Retrieved ${allJobs.length} job postings\n`);
    
    // Test 2: Display sample job postings
    console.log('2. Sample Job Postings:');
    allJobs.slice(0, 3).forEach((job, index) => {
      console.log(`\nJob ${index + 1}:`);
      console.log(`  Title: ${job.jobTitle}`);
      console.log(`  Location: ${job.location}`);
      console.log(`  Salary: ${job.salary}`);
      console.log(`  Job Type: ${job.jobType}`);
      console.log(`  Department: ${job.department}`);
      console.log(`  Open Date: ${job.openDate}`);
      console.log(`  Close Date: ${job.closeDate}`);
    });
    
    // Test 3: Search by location
    console.log('\n3. Searching for jobs in Washington...');
    const washingtonJobs = await searchJobPostings({ location: 'Washington' });
    console.log(`✓ Found ${washingtonJobs.length} jobs in Washington`);
    if (washingtonJobs.length > 0) {
      console.log('Sample Washington job:');
      console.log(`  Title: ${washingtonJobs[0].jobTitle}`);
      console.log(`  Location: ${washingtonJobs[0].location}`);
    }
    
    // Test 4: Search by job title
    console.log('\n4. Searching for Aviation Safety Inspector jobs...');
    const aviationJobs = await searchJobPostings({ jobTitle: 'Aviation Safety Inspector' });
    console.log(`✓ Found ${aviationJobs.length} Aviation Safety Inspector jobs`);
    
    // Test 5: Search by job type
    console.log('\n5. Searching for Direct Hire jobs...');
    const directHireJobs = await searchJobPostings({ jobType: 'Direct Hire' });
    console.log(`✓ Found ${directHireJobs.length} Direct Hire jobs`);
    
    // Test 6: Search by department
    console.log('\n6. Searching for FAA jobs...');
    const faaJobs = await searchJobPostings({ department: 'FAA' });
    console.log(`✓ Found ${faaJobs.length} FAA jobs`);
    
    // Test 7: Complex search (multiple criteria)
    console.log('\n7. Complex search: Aviation jobs in Washington...');
    const complexSearch = await searchJobPostings({ 
      jobTitle: 'Aviation',
      location: 'Washington'
    });
    console.log(`✓ Found ${complexSearch.length} Aviation jobs in Washington`);
    
    // Test 8: Statistics
    console.log('\n8. Database Statistics:');
    const uniqueLocations = [...new Set(allJobs.map(job => job.location))];
    const uniqueJobTypes = [...new Set(allJobs.map(job => job.jobType))];
    const uniqueDepartments = [...new Set(allJobs.map(job => job.department))];
    
    console.log(`  Total jobs: ${allJobs.length}`);
    console.log(`  Unique locations: ${uniqueLocations.length}`);
    console.log(`  Unique job types: ${uniqueJobTypes.length}`);
    console.log(`  Unique departments: ${uniqueDepartments.length}`);
    
    console.log('\n=== Test Completed Successfully ===');
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  }
}

// Run the test
testJobPostings().catch(console.error); 