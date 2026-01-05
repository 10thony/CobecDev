#!/usr/bin/env python3
"""
San Antonio Bidding & Contract Opportunities Scraper

Standalone Python script to scrape the San Antonio procurement table.
Can be run independently or integrated into other systems.

Usage:
    python san_antonio_scraper.py [--max-pages N] [--output FILE]
"""

import argparse
import json
import time
from datetime import datetime
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("Warning: selenium not installed. Install with: pip install selenium")

try:
    import requests
    from bs4 import BeautifulSoup
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("Warning: requests/beautifulsoup4 not installed. Install with: pip install requests beautifulsoup4")


class SanAntonioScraper:
    """Scraper for San Antonio bidding and contract opportunities"""
    
    def __init__(self, url: str = "https://webapp1.sanantonio.gov/BidContractOpps/Default.aspx"):
        self.url = url
        self.base_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        self.opportunities: List[Dict] = []
    
    def scrape_with_selenium(self, max_pages: int = 10) -> List[Dict]:
        """Scrape using Selenium (handles JavaScript-rendered content)"""
        if not SELENIUM_AVAILABLE:
            raise ImportError("selenium is required for this method")
        
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')  # Run in background
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        
        driver = webdriver.Chrome(options=options)
        
        try:
            driver.get(self.url)
            time.sleep(3)  # Wait for page load
            
            page = 1
            while page <= max_pages:
                print(f"Scraping page {page}...")
                
                # Find the table
                try:
                    table = WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.TAG_NAME, "table"))
                    )
                except TimeoutException:
                    print("Table not found, stopping.")
                    break
                
                # Extract opportunities from current page
                opportunities = self._extract_table_data_selenium(driver)
                self.opportunities.extend(opportunities)
                print(f"Found {len(opportunities)} opportunities on page {page}")
                
                # Try to go to next page
                if not self._go_to_next_page_selenium(driver):
                    print("No more pages found.")
                    break
                
                page += 1
                time.sleep(2)  # Wait for next page to load
            
            return self.opportunities
            
        finally:
            driver.quit()
    
    def _extract_table_data_selenium(self, driver) -> List[Dict]:
        """Extract data from table using Selenium"""
        opportunities = []
        
        try:
            # Find the table (GridView)
            table = driver.find_element(By.CSS_SELECTOR, 
                'table[id*="gvBidContractOpps"], table.GridView, table')
            
            # Get all rows (skip header)
            rows = table.find_elements(By.TAG_NAME, "tr")
            
            for row in rows:
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) < 6:
                    continue  # Skip header and pagination rows
                
                try:
                    # Column 0: Description (with link)
                    description_cell = cells[0]
                    description_link = description_cell.find_elements(By.TAG_NAME, "a")
                    description = description_cell.text.strip()
                    
                    detail_url = None
                    if description_link:
                        href = description_link[0].get_attribute("href")
                        if href:
                            detail_url = href if href.startswith("http") else urljoin(self.base_url, href)
                    
                    # Extract bid number from description
                    bid_number = "UNKNOWN"
                    if description:
                        import re
                        match = re.match(r'^(\d+)', description)
                        if match:
                            bid_number = match.group(1)
                    
                    # Column 1: Type
                    opp_type = cells[1].text.strip() if len(cells) > 1 else ""
                    
                    # Column 2: Department
                    department = cells[2].text.strip() if len(cells) > 2 else ""
                    
                    # Column 3: Release Date
                    release_date = cells[3].text.strip() if len(cells) > 3 else ""
                    
                    # Column 4: Blackout Start Date
                    blackout_start = cells[4].text.strip() if len(cells) > 4 else ""
                    
                    # Column 5: Solicitation Deadline
                    deadline = cells[5].text.strip() if len(cells) > 5 else ""
                    
                    if description:
                        opportunities.append({
                            "bidNumber": bid_number,
                            "description": description,
                            "detailUrl": detail_url,
                            "type": opp_type,
                            "department": department,
                            "releaseDate": release_date,
                            "blackoutStartDate": blackout_start,
                            "solicitationDeadline": deadline,
                        })
                
                except Exception as e:
                    print(f"Error parsing row: {e}")
                    continue
        
        except Exception as e:
            print(f"Error extracting table data: {e}")
        
        return opportunities
    
    def _go_to_next_page_selenium(self, driver) -> bool:
        """Navigate to next page using Selenium"""
        try:
            # Look for "Next" link or page number links
            # ASP.NET GridView pagination
            next_links = driver.find_elements(By.XPATH, 
                "//a[contains(@href, 'Page$') and (contains(text(), 'Next') or contains(text(), '>') or string-length(text()) < 3)]")
            
            if not next_links:
                # Try finding by page number (e.g., "2", "3")
                page_links = driver.find_elements(By.XPATH, 
                    "//a[contains(@href, 'Page$') and string(number(text())) = text()]")
                # Find next page number
                current_page = 1
                for link in page_links:
                    try:
                        page_num = int(link.text.strip())
                        if page_num > current_page:
                            link.click()
                            return True
                    except ValueError:
                        continue
                return False
            
            # Click the first "Next" link found
            next_links[0].click()
            return True
            
        except Exception as e:
            print(f"Error navigating to next page: {e}")
            return False
    
    def scrape_with_requests(self, max_pages: int = 10) -> List[Dict]:
        """Scrape using requests + BeautifulSoup (faster, but may not work if JS is required)"""
        if not REQUESTS_AVAILABLE:
            raise ImportError("requests and beautifulsoup4 are required for this method")
        
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        page = 1
        while page <= max_pages:
            print(f"Scraping page {page}...")
            
            try:
                response = session.get(self.url)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find table
                table = soup.find('table', id=lambda x: x and 'gvBidContractOpps' in x) or \
                        soup.find('table', class_=lambda x: x and 'GridView' in str(x)) or \
                        soup.find('table')
                
                if not table:
                    print("Table not found, stopping.")
                    break
                
                # Extract opportunities
                opportunities = self._extract_table_data_soup(table)
                self.opportunities.extend(opportunities)
                print(f"Found {len(opportunities)} opportunities on page {page}")
                
                # Try to find next page link
                next_link = self._find_next_page_link_soup(soup)
                if not next_link:
                    print("No more pages found.")
                    break
                
                # Update URL for next page
                self.url = urljoin(self.base_url, next_link)
                page += 1
                time.sleep(1)  # Be polite
                
            except Exception as e:
                print(f"Error on page {page}: {e}")
                break
        
        return self.opportunities
    
    def _extract_table_data_soup(self, table) -> List[Dict]:
        """Extract data from table using BeautifulSoup"""
        opportunities = []
        
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 6:
                continue
            
            # Skip header row
            if cells[0].name == 'th' or 'Description' in cells[0].get_text():
                continue
            
            try:
                # Column 0: Description
                desc_cell = cells[0]
                desc_link = desc_cell.find('a')
                description = desc_cell.get_text(strip=True)
                
                detail_url = None
                if desc_link and desc_link.get('href'):
                    href = desc_link['href']
                    detail_url = href if href.startswith('http') else urljoin(self.base_url, href)
                
                # Extract bid number
                import re
                bid_number = "UNKNOWN"
                match = re.match(r'^(\d+)', description)
                if match:
                    bid_number = match.group(1)
                
                # Other columns
                opp_type = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                department = cells[2].get_text(strip=True) if len(cells) > 2 else ""
                release_date = cells[3].get_text(strip=True) if len(cells) > 3 else ""
                blackout_start = cells[4].get_text(strip=True) if len(cells) > 4 else ""
                deadline = cells[5].get_text(strip=True) if len(cells) > 5 else ""
                
                if description:
                    opportunities.append({
                        "bidNumber": bid_number,
                        "description": description,
                        "detailUrl": detail_url,
                        "type": opp_type,
                        "department": department,
                        "releaseDate": release_date,
                        "blackoutStartDate": blackout_start,
                        "solicitationDeadline": deadline,
                    })
            
            except Exception as e:
                print(f"Error parsing row: {e}")
                continue
        
        return opportunities
    
    def _find_next_page_link_soup(self, soup) -> Optional[str]:
        """Find next page link in BeautifulSoup"""
        # Look for pagination links
        next_link = soup.find('a', href=lambda x: x and 'Page$' in x and 
                              (x.endswith('Next') or 'Next' in str(x)))
        
        if next_link:
            return next_link.get('href')
        
        # Try page numbers
        page_links = soup.find_all('a', href=lambda x: x and 'Page$' in x)
        for link in page_links:
            try:
                page_num = int(link.get_text(strip=True))
                if page_num > 1:  # Assuming we're on page 1
                    return link.get('href')
            except ValueError:
                continue
        
        return None


def main():
    parser = argparse.ArgumentParser(
        description='Scrape San Antonio bidding and contract opportunities'
    )
    parser.add_argument(
        '--url',
        default='https://webapp1.sanantonio.gov/BidContractOpps/Default.aspx',
        help='URL to scrape'
    )
    parser.add_argument(
        '--max-pages',
        type=int,
        default=10,
        help='Maximum number of pages to scrape'
    )
    parser.add_argument(
        '--output',
        default='san_antonio_opportunities.json',
        help='Output JSON file'
    )
    parser.add_argument(
        '--method',
        choices=['selenium', 'requests'],
        default='selenium' if SELENIUM_AVAILABLE else 'requests',
        help='Scraping method to use'
    )
    
    args = parser.parse_args()
    
    scraper = SanAntonioScraper(args.url)
    
    print(f"Starting scrape of {args.url}")
    print(f"Method: {args.method}")
    print(f"Max pages: {args.max_pages}")
    
    start_time = time.time()
    
    try:
        if args.method == 'selenium':
            opportunities = scraper.scrape_with_selenium(args.max_pages)
        else:
            opportunities = scraper.scrape_with_requests(args.max_pages)
        
        duration = time.time() - start_time
        
        # Save results
        output_data = {
            "scrapeDate": datetime.now().isoformat(),
            "url": args.url,
            "totalOpportunities": len(opportunities),
            "duration": duration,
            "opportunities": opportunities,
        }
        
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"\nScraping complete!")
        print(f"Found {len(opportunities)} opportunities")
        print(f"Duration: {duration:.2f} seconds")
        print(f"Results saved to: {args.output}")
        
    except Exception as e:
        print(f"Error during scraping: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())



