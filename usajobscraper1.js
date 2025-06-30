const https = require('https');
const fs = require('fs');
const path = require('path');

// Helper to fetch HTML
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', (err) => reject(err));
  });
}

// Helper to extract text between tags
function extractBetween(str, start, end) {
  const s = str.indexOf(start);
  if (s === -1) return null;
  const e = str.indexOf(end, s + start.length);
  if (e === -1) return null;
  return str.substring(s + start.length, e).trim();
}

// Parse job listings from HTML (very basic, brittle to HTML changes)
function parseJobListings(html) {
  const results = [];
  const containerStart = html.indexOf('id="usajobs-search-results"');
  if (containerStart === -1) return results;

  // Get the container's HTML
  const containerHtml = html.slice(containerStart);

  // Split by job listing divs
  const jobDivs = containerHtml.split(
    'class="usajobs-search-result--core"'
  );
  jobDivs.shift(); // Remove the first chunk (not a job)

  for (const div of jobDivs) {
    // Job Title
    const jobTitle = extractBetween(div, '<h2', '</h2>') || 'N/A';
    // Location
    const location = extractBetween(
      div,
      'usajobs-search-result--core__location">',
      '</span>'
    ) || 'N/A';
    // Salary
    const salary = extractBetween(
      div,
      'usajobs-search-result--core__item">',
      '</span>'
    ) || 'N/A';
    // Open/Close Date (not always present)
    const openDate = extractBetween(
      div,
      'usajobs-search-result--core__closing-date">',
      '</span>'
    ) || 'N/A';
    const closeDate = openDate; // As in your script
    // Job Link
    let jobLink = extractBetween(div, '<a href="', '"');
    if (jobLink && !jobLink.startsWith('http')) {
      jobLink = 'https://www.usajobs.gov' + jobLink;
    }
    jobLink = jobLink || 'N/A';
    // Job Type
    const jobType = extractBetween(
      div,
      'usajobs-search-result--core__appt-type">',
      '</span>'
    ) || 'N/A';

    results.push({
      'Job Title': jobTitle.replace(/<[^>]+>/g, '').trim(),
      Location: location,
      Salary: salary,
      'Open Date': openDate,
      'Close Date': closeDate,
      'Job Link': jobLink,
      'Job Type': jobType,
    });
  }
  return results;
}

// Export to CSV
function exportToCSV(jobListings, filename) {
  const headers = Object.keys(jobListings[0]);
  const lines = [
    headers.join(','),
    ...jobListings.map((job) =>
      headers
        .map((h) =>
          `"${String(job[h]).replace(/"/g, '""').replace(/\n/g, ' ')}"`
        )
        .join(',')
    ),
  ];
  fs.writeFileSync(filename, lines.join('\n'), 'utf8');
  console.log(`Job data has been exported to ${filename}`);
}

// Main
(async function main() {
  const url =
    'https://www.usajobs.gov/search/results/?l=&k=faa&p=1';
  try {
    const html = await fetchHTML(url);
    const jobListings = parseJobListings(html);
    if (jobListings.length > 0) {
      const outPath = path.join(
        'C:\\datafolder',
        'usajobs_data.csv'
      );
      exportToCSV(jobListings, outPath);
    } else {
      console.log('No job listings found.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();