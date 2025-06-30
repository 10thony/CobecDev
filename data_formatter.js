const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Function to clean and format text content
function cleanAndFormatText(text) {
  if (!text || text === 'N/A') return 'N/A';
  
  // Trim whitespace
  let cleaned = text.trim();
  
  // Replace multiple spaces with single space
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Replace common abbreviations and formatting issues
  cleaned = cleaned.replace(/\bU\.S\./g, 'U.S.');
  cleaned = cleaned.replace(/\bU\.S\.A\./g, 'USA');
  cleaned = cleaned.replace(/\bvs\./g, 'vs.');
  cleaned = cleaned.replace(/\betc\./g, 'etc.');
  cleaned = cleaned.replace(/\bi\.e\./g, 'i.e.');
  cleaned = cleaned.replace(/\be\.g\./g, 'e.g.');
  
  // Add line breaks for better readability in certain contexts
  // Split on common sentence endings followed by capital letters
  cleaned = cleaned.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');
  
  // Split on bullet points or numbered lists
  cleaned = cleaned.replace(/(\n\s*[-•*]\s+)/g, '\n• ');
  cleaned = cleaned.replace(/(\n\s*\d+\.\s+)/g, '\n$1');
  
  // Clean up multiple line breaks
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned;
}

// Function to extract and categorize information from job details
function extractJobDetails(details) {
  const extracted = {};
  
  // Extract key information from Job Summary
  if (details['Job Summary'] && details['Job Summary'] !== 'N/A') {
    const summary = details['Job Summary'];
    
    // Extract department/agency
    const deptMatch = summary.match(/(?:Department|Agency|Organization):\s*([^\n]+)/i);
    if (deptMatch) extracted['Department'] = cleanAndFormatText(deptMatch[1]);
    
    // Extract series/grade
    const seriesMatch = summary.match(/(?:Series|Grade):\s*([^\n]+)/i);
    if (seriesMatch) extracted['Series/Grade'] = cleanAndFormatText(seriesMatch[1]);
    
    // Extract travel percentage
    const travelMatch = summary.match(/(?:Travel|Travel Required):\s*([^\n]+)/i);
    if (travelMatch) extracted['Travel Required'] = cleanAndFormatText(travelMatch[1]);
    
    // Extract work schedule
    const scheduleMatch = summary.match(/(?:Work Schedule|Schedule):\s*([^\n]+)/i);
    if (scheduleMatch) extracted['Work Schedule'] = cleanAndFormatText(scheduleMatch[1]);
    
    // Extract security clearance
    const clearanceMatch = summary.match(/(?:Security Clearance|Clearance):\s*([^\n]+)/i);
    if (clearanceMatch) extracted['Security Clearance'] = cleanAndFormatText(clearanceMatch[1]);
  }
  
  // Extract key requirements from Requirements section
  if (details['Requirements'] && details['Requirements'] !== 'N/A') {
    const requirements = details['Requirements'];
    
    // Extract experience requirements
    const expMatch = requirements.match(/(?:Experience|Years of Experience):\s*([^\n]+)/i);
    if (expMatch) extracted['Experience Required'] = cleanAndFormatText(expMatch[1]);
    
    // Extract education requirements
    const eduMatch = requirements.match(/(?:Education|Degree):\s*([^\n]+)/i);
    if (eduMatch) extracted['Education Required'] = cleanAndFormatText(eduMatch[1]);
  }
  
  // Extract application instructions from How To Apply
  if (details['How To Apply'] && details['How To Apply'] !== 'N/A') {
    const howToApply = details['How To Apply'];
    
    // Extract application deadline
    const deadlineMatch = howToApply.match(/(?:Deadline|Closing Date|Due Date):\s*([^\n]+)/i);
    if (deadlineMatch) extracted['Application Deadline'] = cleanAndFormatText(deadlineMatch[1]);
    
    // Extract contact information
    const contactMatch = howToApply.match(/(?:Contact|Phone|Email):\s*([^\n]+)/i);
    if (contactMatch) extracted['Contact Info'] = cleanAndFormatText(contactMatch[1]);
  }
  
  return extracted;
}

// Function to format all job data
function formatJobData(jobListings) {
  return jobListings.map(job => {
    const formattedJob = {
      'Job Title': cleanAndFormatText(job['Job Title']),
      'Location': cleanAndFormatText(job['Location']),
      'Salary': cleanAndFormatText(job['Salary']),
      'Open Date': cleanAndFormatText(job['Open Date']),
      'Close Date': cleanAndFormatText(job['Close Date']),
      'Job Link': job['Job Link'],
      'Job Type': cleanAndFormatText(job['Job Type'])
    };
    
    // Extract and format detailed information
    const extractedDetails = extractJobDetails(job);
    
    // Add extracted details to formatted job
    Object.assign(formattedJob, extractedDetails);
    
    // Format the main detail sections
    if (job['Job Summary']) {
      formattedJob['Job Summary'] = cleanAndFormatText(job['Job Summary']);
    }
    
    if (job['Duties']) {
      formattedJob['Duties'] = cleanAndFormatText(job['Duties']);
    }
    
    if (job['Requirements']) {
      formattedJob['Requirements'] = cleanAndFormatText(job['Requirements']);
    }
    
    if (job['Qualifications']) {
      formattedJob['Qualifications'] = cleanAndFormatText(job['Qualifications']);
    }
    
    if (job['Education']) {
      formattedJob['Education'] = cleanAndFormatText(job['Education']);
    }
    
    if (job['How To Apply']) {
      formattedJob['How To Apply'] = cleanAndFormatText(job['How To Apply']);
    }
    
    if (job['Additional Information']) {
      formattedJob['Additional Information'] = cleanAndFormatText(job['Additional Information']);
    }
    
    return formattedJob;
  });
}

// Main function to process the Excel file
function processExcelFile(inputFile = 'usajobs_data.xlsx', outputFile = 'usajobs_data_formatted.xlsx') {
  try {
    console.log(`Reading Excel file: ${inputFile}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(inputFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jobListings = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${jobListings.length} job listings to format`);
    
    // Format the data
    const formattedJobListings = formatJobData(jobListings);
    
    // Create new workbook with formatted data
    const formattedWorksheet = XLSX.utils.json_to_sheet(formattedJobListings);
    const formattedWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(formattedWorkbook, formattedWorksheet, 'Formatted Jobs');
    
    // Write to new Excel file
    XLSX.writeFile(formattedWorkbook, outputFile);
    
    console.log(`Formatted data saved to: ${outputFile}`);
    console.log(`Processed ${formattedJobListings.length} job listings`);
    
    // Log some statistics
    const sampleJob = formattedJobListings[0];
    if (sampleJob) {
      console.log('\nSample formatted job fields:');
      Object.keys(sampleJob).forEach(key => {
        const value = sampleJob[key];
        const preview = typeof value === 'string' && value.length > 100 
          ? value.substring(0, 100) + '...' 
          : value;
        console.log(`  ${key}: ${preview}`);
      });
    }
    
  } catch (error) {
    console.error('Error processing Excel file:', error);
  }
}

// Export functions for potential reuse
module.exports = {
  cleanAndFormatText,
  extractJobDetails,
  formatJobData,
  processExcelFile
};

// Run the formatter if this file is executed directly
if (require.main === module) {
  processExcelFile();
} 