const puppeteer = require('puppeteer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Class to represent a job listing
class JobListing {
  constructor(
    job_title,
    location,
    salary,
    open_date,
    close_date,
    job_link,
    job_type,
    details // object with extra fields from job detail page
  ) {
    this['Job Title'] = job_title;
    this['Location'] = location;
    this['Salary'] = salary;
    this['Open Date'] = open_date;
    this['Close Date'] = close_date;
    this['Job Link'] = job_link;
    this['Job Type'] = job_type;
    // Merge in all detail fields
    if (details) {
      for (const [k, v] of Object.entries(details)) {
        this[k] = v;
      }
    }
  }
}

// Scrape job listings from the current page, with debug info
async function parseJobResultsFromPage(page, pageNum) {
  // Get both the job data and the HTML for debugging
  const { results, debugHTML } = await page.evaluate(() => {
    function safeText(el, selector) {
      const found = el.querySelector(selector);
      return found ? found.textContent.trim() : 'N/A';
    }
    function getJobLink(jobDiv) {
      // Try all <a> tags in the jobDiv
      const allLinks = Array.from(jobDiv.querySelectorAll('a'));
      for (const aTag of allLinks) {
        const href = aTag.getAttribute('href');
        if (!href) continue;
        // Heuristic: skip help/about links, only keep links that look like job detail pages
        if (
          href.match(/\/job\/\d+/) ||
          href.match(/\/GetJob\/ViewDetails\/\d+/) ||
          href.match(/usajobs\.gov\/Job\/ViewDetails\//)
        ) {
          if (href.startsWith('http')) return href;
          return window.location.origin + href;
        }
      }
      // Fallback: first <a> with href
      if (allLinks.length > 0) {
        const href = allLinks[0].getAttribute('href');
        if (href.startsWith('http')) return href;
        return window.location.origin + href;
      }
      return 'N/A';
    }

    const results = [];
    const debugHTML = [];
    const jobDivs = document.querySelectorAll(
      '#usajobs-search-results .usajobs-search-result--core'
    );
    jobDivs.forEach((jobDiv) => {
      debugHTML.push(jobDiv.innerHTML); // For debugging

      const h2 = jobDiv.querySelector('h2');
      const footer = jobDiv.querySelector(
        '.usajobs-search-result--core__footer'
      );
      const details = jobDiv.querySelector(
        '.usajobs-search-result--core__details'
      );

      const job_title = h2 ? safeText(h2, 'a') : 'N/A';
      const location = safeText(
        jobDiv,
        '.usajobs-search-result--core__location'
      );
      const salary = safeText(
        jobDiv,
        '.usajobs-search-result--core__item'
      );
      const open_date = footer
        ? safeText(
            footer,
            '.usajobs-search-result--core__closing-date'
          )
        : 'N/A';
      const close_date = open_date;
      const job_link = getJobLink(jobDiv);
      const job_type = details
        ? safeText(
            details,
            '.usajobs-search-result--core__appt-type'
          )
        : 'N/A';

      results.push({
        job_title,
        location,
        salary,
        open_date,
        close_date,
        job_link,
        job_type,
      });
    });
    return { results, debugHTML };
  });

  // Write debug HTML to a file for inspection
  const debugFile = path.join(
    __dirname,
    `usajobs_debug_page${pageNum}.html`
  );
  fs.writeFileSync(
    debugFile,
    debugHTML.map((html, i) => `<!-- Job ${i + 1} -->\n${html}\n\n`).join(''),
    'utf8'
  );
  console.log(`Saved debug HTML for page ${pageNum} to ${debugFile}`);

  // Log the extracted job listings for this page
  console.log(`Extracted job listings on page ${pageNum}:`);
  results.forEach((job, idx) => {
    console.log(
      `  [${idx + 1}] Title: ${job.job_title} | Link: ${job.job_link}`
    );
  });

  return results;
}

// Scrape extra details from the job detail page
async function scrapeJobDetail(page, jobLink) {
    try {
      await page.goto(jobLink, { waitUntil: 'networkidle2' });
      await page.waitForSelector('main', { timeout: 10000 });
  
      return await page.evaluate(() => {
        // Map of field names to their corresponding div IDs
        const sections = {
          'Job Summary': 'summary',
          'Duties': 'duties',
          'Requirements': 'requirements',
          'Qualifications': 'qualifications',
          'Education': 'education',
          'How To Apply': 'how-to-apply',
          'Additional Information': 'additional-information',
        };
  
        const result = {};
  
        for (const [field, id] of Object.entries(sections)) {
          const sectionDiv = document.getElementById(id);
          if (sectionDiv) {
            // Remove the heading (h2) if present
            const clone = sectionDiv.cloneNode(true);
            const heading = clone.querySelector('h2');
            if (heading) heading.remove();
            // Get all text content, trimmed
            const text = clone.textContent.replace(/\s+\n/g, '\n').replace(/\n+/g, '\n').trim();
            result[field] = text || 'N/A';
          } else {
            result[field] = 'N/A';
          }
        }
  
        return result;
      });
    } catch (err) {
      console.error(`Error scraping job detail at ${jobLink}:`, err.message);
      return {};
    }
  }
// Check if there is a next page and click it
async function goToNextPage(page) {
  await page.waitForSelector('#paginator', { timeout: 10000 });

  const nextButtonInfo = await page.evaluate(() => {
    const nextLi = document.querySelector(
      '.usajobs-search-pagination__next-page-container'
    );
    if (!nextLi) return { exists: false, disabled: true };
    const nextA = nextLi.querySelector('.usajobs-search-pagination__next-page');
    if (!nextA) return { exists: false, disabled: true };
    const liClass = nextLi.className;
    const disabled = liClass.includes('is-disabled');
    return { exists: true, disabled };
  });

  if (!nextButtonInfo.exists || nextButtonInfo.disabled) {
    return false;
  }

  const currentPageNum = await page.evaluate(() => {
    const active = document.querySelector(
      '.usajobs-search-pagination__page.is-active span'
    );
    return active ? active.textContent.trim() : null;
  });

  await page.evaluate(() => {
    document
      .querySelector('.usajobs-search-pagination__next-page')
      .click();
  });

  await page.waitForFunction(
    (prevPageNum) => {
      const active = document.querySelector(
        '.usajobs-search-pagination__page.is-active span'
      );
      return active && active.textContent.trim() !== prevPageNum;
    },
    {},
    currentPageNum
  );

  await page.waitForSelector('#usajobs-search-results', { timeout: 10000 });
  await new Promise((resolve) => setTimeout(resolve, 500));
  return true;
}

// Scrape all pages and job details
async function scrapeAllPages(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#usajobs-search-results', { timeout: 10000 });

  let allJobListings = [];
  let pageNum = 1;

  while (true) {
    console.log(`Scraping page ${pageNum}...`);
    const jobListings = await parseJobResultsFromPage(page, pageNum);

    // For each job, open a new tab and scrape details
    for (let i = 0; i < jobListings.length; i++) {
      const job = jobListings[i];
      if (job.job_link && job.job_link !== 'N/A') {
        // Use a new page for each job detail to avoid losing the paginator state
        const detailPage = await browser.newPage();
        const details = await scrapeJobDetail(detailPage, job.job_link);
        await detailPage.close();
        allJobListings.push(
          new JobListing(
            job.job_title,
            job.location,
            job.salary,
            job.open_date,
            job.close_date,
            job.job_link,
            job.job_type,
            details
          )
        );
        console.log(`  Scraped details for: ${job.job_title}`);
      } else {
        allJobListings.push(
          new JobListing(
            job.job_title,
            job.location,
            job.salary,
            job.open_date,
            job.close_date,
            job.job_link,
            job.job_type,
            {}
          )
        );
      }
    }

    // Try to go to the next page
    const hasNext = await goToNextPage(page);
    if (!hasNext) break;
    pageNum += 1;
  }

  await browser.close();
  return allJobListings;
}

// Export to Excel
function exportToExcel(
  jobListings,
  filename = 'C:\\datafolder\\usajobs_data.xlsx'
) {
  const data = jobListings.map((job) => ({ ...job }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jobs');
  XLSX.writeFile(workbook, filename);
  console.log(`Job data has been exported to ${filename}`);
}

// Main execution
(async () => {
  const url = 'https://www.usajobs.gov/search/results/?l=&k=faa&p=1';
  try {
    const jobListings = await scrapeAllPages(url);
    if (jobListings.length > 0) {
      exportToExcel(jobListings);
    } else {
      console.log('No job listings found.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();